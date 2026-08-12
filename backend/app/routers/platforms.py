import json
import uuid

from celery_worker import celery_app
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.platform_account import PlatformAccount
from app.models.schedule import Schedule
from app.models.user import User
from app.redis_client import get_redis
from app.schemas.platform_account import ConnectUrlOut, PlatformAccountOut, PlatformStatusOut
from app.schemas.platform_credential import PlatformCredentialIn, PlatformCredentialOut, PlatformEnabledIn
from app.services import platform_credentials, platform_settings
from app.services.activity_log import log_activity
from app.services.connectors import get_connector, supported_platforms
from app.services.connectors.base import ConnectorAuthError, ConnectorNotConfigured
from app.services.distribution import cancel_schedule

router = APIRouter(prefix="/platforms", tags=["platforms"])
settings = get_settings()

OAUTH_STATE_TTL_SECONDS = 600


def _callback_url(platform: str) -> str:
    return f"{settings.backend_url}{settings.api_v1_prefix}/platforms/{platform}/callback"


def _oauth_state_key(platform: str, state: str) -> str:
    return f"oauth:{platform}:{state}"


@router.get("", response_model=list[PlatformStatusOut])
def list_platforms(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.execute(
        select(PlatformAccount).where(PlatformAccount.user_id == current_user.id)
    ).scalars().all()
    by_platform: dict[str, list[PlatformAccount]] = {}
    for account in accounts:
        by_platform.setdefault(account.platform, []).append(account)

    result = []
    for platform in supported_platforms():
        # Admin-disabled platforms are left out entirely — not shown as "unavailable",
        # just absent, so a tenant has no way to tell it exists at all.
        if not platform_settings.is_enabled(db, platform):
            continue
        connector = get_connector(platform)
        result.append(
            PlatformStatusOut(
                platform=platform,
                configured=connector.is_configured(db),
                accounts=[PlatformAccountOut.model_validate(a) for a in by_platform.get(platform, [])],
            )
        )
    return result


@router.get("/{platform}/connect", response_model=ConnectUrlOut)
def connect_platform(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        connector = get_connector(platform)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported platform")
    if not platform_settings.is_enabled(db, platform):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported platform")

    try:
        auth_request = connector.build_authorize_request(db, _callback_url(platform))
    except ConnectorNotConfigured as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    redis = get_redis()
    redis.setex(
        _oauth_state_key(platform, auth_request.state),
        OAUTH_STATE_TTL_SECONDS,
        json.dumps({"user_id": str(current_user.id), "code_verifier": auth_request.code_verifier}),
    )
    return ConnectUrlOut(authorize_url=auth_request.authorize_url)


@router.get("/{platform}/callback")
def platform_callback(
    platform: str,
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    def redirect_with(status_param: str, message: str | None = None) -> RedirectResponse:
        url = f"{settings.frontend_url}/platforms?connected={platform}&status={status_param}"
        if message:
            url += f"&message={message}"
        return RedirectResponse(url)

    if error:
        return redirect_with("error", error)
    if not code or not state:
        return redirect_with("error", "missing_code")

    try:
        connector = get_connector(platform)
    except ValueError:
        return redirect_with("error", "unsupported_platform")

    redis = get_redis()
    raw = redis.get(_oauth_state_key(platform, state))
    if not raw:
        return redirect_with("error", "state_expired")
    redis.delete(_oauth_state_key(platform, state))
    stored = json.loads(raw)

    try:
        token = connector.exchange_code(db, code, stored["code_verifier"], _callback_url(platform))
    except (ConnectorNotConfigured, ConnectorAuthError):
        return redirect_with("error", "token_exchange_failed")

    user_id = uuid.UUID(stored["user_id"])
    account = db.execute(
        select(PlatformAccount).where(
            PlatformAccount.user_id == user_id, PlatformAccount.platform == platform
        )
    ).scalar_one_or_none()
    if not account:
        account = PlatformAccount(user_id=user_id, platform=platform)
        db.add(account)

    account.access_token = token.access_token
    account.refresh_token = token.refresh_token
    account.token_expires_at = token.expires_at
    account.account_handle = token.account_handle
    account.avatar_url = token.avatar_url
    account.account_name = token.account_name
    account.scopes = token.scopes
    account.is_active = True
    db.commit()

    log_activity(
        db,
        user_id=user_id,
        action="connect",
        entity_type="platform_account",
        entity_id=account.id,
        details={"platform": platform, "account_handle": account.account_handle},
        request=request,
    )

    return redirect_with("success")


@router.get("/{platform}/credentials", response_model=PlatformCredentialOut)
def get_platform_credentials(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if platform not in supported_platforms():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported platform")
    return PlatformCredentialOut(
        platform=platform,
        is_enabled=platform_settings.is_enabled(db, platform),
        **platform_credentials.get_status(db, platform),
    )


@router.put("/{platform}/credentials", response_model=PlatformCredentialOut)
def set_platform_credentials(
    platform: str,
    payload: PlatformCredentialIn,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if platform not in supported_platforms():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported platform")
    row = platform_credentials.upsert_credentials(db, platform, payload.client_id, payload.client_secret)
    log_activity(
        db,
        user_id=current_user.id,
        action="update",
        entity_type="platform_credentials",
        entity_id=row.id,
        details={"platform": platform},
        request=request,
    )
    return PlatformCredentialOut(
        platform=platform,
        is_enabled=platform_settings.is_enabled(db, platform),
        **platform_credentials.get_status(db, platform),
    )


@router.delete("/{platform}/credentials", response_model=PlatformCredentialOut)
def remove_platform_credentials(
    platform: str,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if platform not in supported_platforms():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported platform")
    existing = platform_credentials.get_row(db, platform)
    platform_credentials.delete_credentials(db, platform)
    if existing:
        log_activity(
            db,
            user_id=current_user.id,
            action="delete",
            entity_type="platform_credentials",
            entity_id=existing.id,
            details={"platform": platform},
            request=request,
        )
    return PlatformCredentialOut(
        platform=platform,
        is_enabled=platform_settings.is_enabled(db, platform),
        **platform_credentials.get_status(db, platform),
    )


@router.patch("/{platform}/enabled", response_model=PlatformCredentialOut)
def set_platform_enabled(
    platform: str,
    payload: PlatformEnabledIn,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if platform not in supported_platforms():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported platform")
    row = platform_settings.set_enabled(db, platform, payload.is_enabled)
    log_activity(
        db,
        user_id=current_user.id,
        action="admin_set_platform_enabled",
        entity_type="platform_settings",
        entity_id=row.id,
        details={"platform": platform, "is_enabled": payload.is_enabled},
        request=request,
    )
    return PlatformCredentialOut(
        platform=platform,
        is_enabled=payload.is_enabled,
        **platform_credentials.get_status(db, platform),
    )


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_platform(
    account_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.execute(
        select(PlatformAccount).where(
            PlatformAccount.id == account_id, PlatformAccount.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Platform account not found")
    platform = account.platform

    # schedules.platform_account_id is a NOT NULL FK with no cascade — any schedule
    # ever queued against this account (pending, published, or failed) would otherwise
    # block the delete outright. Pending ones go through cancel_schedule() so the
    # backing post correctly reverts to 'approved' (and its Celery ETA task is
    # revoked) instead of being left showing 'scheduled' forever with no schedule row
    # behind it. Published/failed rows are just queue history — the durable record of
    # what actually happened lives on Post (status/published_at/published_url), so
    # those are dropped outright.
    schedules = db.execute(select(Schedule).where(Schedule.platform_account_id == account.id)).scalars().all()
    for schedule in schedules:
        if schedule.status == "pending":
            task_id = schedule.celery_task_id
            cancel_schedule(db, schedule)
            if task_id:
                celery_app.control.revoke(task_id)
        else:
            db.delete(schedule)
    db.delete(account)
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="disconnect",
        entity_type="platform_account",
        entity_id=account_id,
        details={"platform": platform},
        request=request,
    )
