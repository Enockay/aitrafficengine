import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.middleware.auth import require_role
from app.models.activity_log import ActivityLog
from app.models.page import Page
from app.models.payment import Payment
from app.models.platform_account import PlatformAccount
from app.models.post import Post
from app.models.schedule import Schedule
from app.models.site import Site
from app.models.subscription import Subscription
from app.models.user import User
from app.models.user_session import UserSession
from app.schemas.admin import (
    AdminActivityLogListResponse,
    AdminActivityLogOut,
    AdminPaymentListResponse,
    AdminPaymentOut,
    AdminScheduleListResponse,
    AdminScheduleOut,
    AdminSessionOut,
    AdminSessionPageVisit,
    AdminSiteListResponse,
    AdminSiteOut,
    AdminStatsOut,
    AdminTrafficSessionListResponse,
    AdminTrafficSummaryOut,
    AdminUserDetailOut,
    AdminUserListResponse,
    AdminUserOut,
    AdminPlanIn,
    AdminPlanOut,
    AdminPlanUpdateIn,
    AdminSupportConversationOut,
    AdminTransactionListResponse,
    AdminTransactionOut,
    BrevoConfigIn,
    BrevoConfigStatusOut,
    GeoipConfigStatusOut,
    PaystackConfigIn,
    PaystackConfigStatusOut,
    RevenueMonthPoint,
    RevenueSummaryOut,
    SupportConfigIn,
    SupportConfigStatusOut,
    UpdateUserPlanRequest,
    UpdateUserRoleRequest,
    UpdateUserStatusRequest,
)
from app.schemas.support import SupportMessageIn, SupportMessageOut
from app.services import brevo_config, geoip_config, paystack, paystack_config, support_config
from app.services.paystack import PaystackError, PaystackNotConfigured
from app.services.activity_log import log_activity
from app.services.admin_stats import get_admin_summary
from app.services.admin_traffic import get_traffic_summary, list_traffic_sessions
from app.services.plans import PlanError, create_plan, delete_plan, get_plan, list_plans, update_plan
from app.services.site_stats import to_site_out
from app.services.support import list_admin_inbox, list_thread, send_admin_reply

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_ROLES = ("admin", "user")


def _get_target_user(db: Session, user_id: uuid.UUID) -> User:
    user = db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _guard_not_self(current_user: User, target_id: uuid.UUID, action: str) -> None:
    if target_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"You can't {action}.")


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=AdminStatsOut)
def get_stats(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return AdminStatsOut(**get_admin_summary(db))


# ---------------------------------------------------------------------------
# Traffic
# ---------------------------------------------------------------------------


@router.get("/traffic/summary", response_model=AdminTrafficSummaryOut)
def get_traffic_summary_endpoint(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return AdminTrafficSummaryOut(**get_traffic_summary(db))


@router.get("/traffic/sessions", response_model=AdminTrafficSessionListResponse)
def list_traffic_sessions_endpoint(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return AdminTrafficSessionListResponse(**list_traffic_sessions(db, page=page, limit=limit, search=search))


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    plan_code: str | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = (
        select(User, Subscription)
        .outerjoin(Subscription, Subscription.user_id == User.id)
        .where(User.deleted_at.is_(None))
    )
    if search:
        like = f"%{search}%"
        query = query.where((User.email.ilike(like)) | (User.full_name.ilike(like)))
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))
    if plan_code:
        query = query.where(Subscription.plan_code == plan_code)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    ).all()

    items = []
    for user, subscription in rows:
        sites_count = db.execute(
            select(func.count(Site.id)).where(Site.user_id == user.id, Site.deleted_at.is_(None))
        ).scalar_one()
        posts_count = db.execute(
            select(func.count(Post.id))
            .join(Page, Post.page_id == Page.id)
            .join(Site, Page.site_id == Site.id)
            .where(Site.user_id == user.id, Post.deleted_at.is_(None))
        ).scalar_one()
        items.append(
            AdminUserOut(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                is_active=user.is_active,
                company_name=user.company_name,
                plan_code=subscription.plan_code if subscription else None,
                subscription_status=subscription.status if subscription else None,
                sites_count=sites_count,
                posts_count=posts_count,
                created_at=user.created_at,
            )
        )
    return AdminUserListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/users/{user_id}", response_model=AdminUserDetailOut)
def get_user_detail(
    user_id: uuid.UUID,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user = _get_target_user(db, user_id)
    subscription = user.subscription

    sites_count = db.execute(
        select(func.count(Site.id)).where(Site.user_id == user.id, Site.deleted_at.is_(None))
    ).scalar_one()
    posts_count = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == user.id, Post.deleted_at.is_(None))
    ).scalar_one()
    recent_activity = db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(20)
    ).scalars().all()

    recent_sessions = db.execute(
        select(UserSession)
        .where(UserSession.user_id == user.id)
        .options(selectinload(UserSession.page_visits))
        .order_by(UserSession.started_at.desc())
        .limit(20)
    ).scalars().all()
    sessions_out = [
        AdminSessionOut(
            id=s.id,
            ip_address=s.ip_address,
            country=s.country,
            city=s.city,
            browser=s.browser,
            os=s.os,
            device_type=s.device_type,
            started_at=s.started_at,
            last_seen_at=s.last_seen_at,
            duration_seconds=int((s.last_seen_at - s.started_at).total_seconds()),
            pages=[AdminSessionPageVisit(path=v.path, visited_at=v.visited_at) for v in s.page_visits],
        )
        for s in recent_sessions
    ]

    return AdminUserDetailOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        company_name=user.company_name,
        plan_code=subscription.plan_code if subscription else None,
        subscription_status=subscription.status if subscription else None,
        sites_count=sites_count,
        posts_count=posts_count,
        created_at=user.created_at,
        trial_ends_at=subscription.trial_ends_at if subscription else None,
        current_period_end=subscription.current_period_end if subscription else None,
        recent_activity=recent_activity,
        recent_sessions=sessions_out,
    )


@router.patch("/users/{user_id}/status", response_model=AdminUserOut)
def update_user_status(
    user_id: uuid.UUID,
    payload: UpdateUserStatusRequest,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    _guard_not_self(current_user, user_id, "suspend or reactivate your own account")
    user = _get_target_user(db, user_id)
    user.is_active = payload.is_active
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="admin_set_user_status",
        entity_type="user",
        entity_id=user.id,
        details={"is_active": payload.is_active},
        request=request,
    )
    return _to_admin_user_out(db, user)


@router.patch("/users/{user_id}/role", response_model=AdminUserOut)
def update_user_role(
    user_id: uuid.UUID,
    payload: UpdateUserRoleRequest,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role: {payload.role}")
    _guard_not_self(current_user, user_id, "change your own role")
    user = _get_target_user(db, user_id)
    user.role = payload.role
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="admin_set_user_role",
        entity_type="user",
        entity_id=user.id,
        details={"role": payload.role},
        request=request,
    )
    return _to_admin_user_out(db, user)


@router.patch("/users/{user_id}/plan", response_model=AdminUserOut)
def override_user_plan(
    user_id: uuid.UUID,
    payload: UpdateUserPlanRequest,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if get_plan(db, payload.plan_code) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown plan: {payload.plan_code}")
    user = _get_target_user(db, user_id)
    subscription = user.subscription
    if not subscription:
        subscription = Subscription(user_id=user.id)
        db.add(subscription)

    subscription.plan_code = payload.plan_code
    subscription.status = payload.status
    subscription.current_period_end = payload.current_period_end
    subscription.cancel_at_period_end = False
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="admin_override_user_plan",
        entity_type="user",
        entity_id=user.id,
        details={"plan_code": payload.plan_code, "status": payload.status},
        request=request,
    )
    return _to_admin_user_out(db, user)


@router.delete("/users/{user_id}", response_model=AdminUserOut)
def soft_delete_user(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    _guard_not_self(current_user, user_id, "delete your own account")
    user = _get_target_user(db, user_id)
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="admin_delete_user",
        entity_type="user",
        entity_id=user.id,
        request=request,
    )
    return _to_admin_user_out(db, user)


def _to_admin_user_out(db: Session, user: User) -> AdminUserOut:
    subscription = user.subscription
    sites_count = db.execute(
        select(func.count(Site.id)).where(Site.user_id == user.id, Site.deleted_at.is_(None))
    ).scalar_one()
    posts_count = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == user.id, Post.deleted_at.is_(None))
    ).scalar_one()
    return AdminUserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        company_name=user.company_name,
        plan_code=subscription.plan_code if subscription else None,
        subscription_status=subscription.status if subscription else None,
        sites_count=sites_count,
        posts_count=posts_count,
        created_at=user.created_at,
    )


# ---------------------------------------------------------------------------
# Sites
# ---------------------------------------------------------------------------


@router.get("/sites", response_model=AdminSiteListResponse)
def list_all_sites(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    user_id: uuid.UUID | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = select(Site, User).join(User, Site.user_id == User.id).where(Site.deleted_at.is_(None))
    if search:
        like = f"%{search}%"
        query = query.where((Site.name.ilike(like)) | (Site.domain.ilike(like)))
    if status_filter == "active":
        query = query.where(Site.is_active.is_(True))
    elif status_filter == "inactive":
        query = query.where(Site.is_active.is_(False))
    if user_id:
        query = query.where(Site.user_id == user_id)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(Site.created_at.desc()).offset((page - 1) * limit).limit(limit)
    ).all()

    items = []
    for site, owner in rows:
        stats = to_site_out(db, site)
        items.append(
            AdminSiteOut(
                id=site.id,
                name=site.name,
                domain=site.domain,
                owner_email=owner.email,
                is_active=site.is_active,
                pages_count=stats.pages_count,
                posts_count=stats.posts_count,
                total_clicks=stats.total_clicks,
                last_crawled_at=stats.last_crawled_at,
                created_at=site.created_at,
            )
        )
    return AdminSiteListResponse(items=items, total=total, page=page, limit=limit)


# ---------------------------------------------------------------------------
# Schedules
# ---------------------------------------------------------------------------


@router.get("/schedules", response_model=AdminScheduleListResponse)
def list_all_schedules(
    status_filter: str | None = Query(default=None, alias="status"),
    user_id: uuid.UUID | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = (
        select(Schedule, Post, User)
        .join(Post, Schedule.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .join(User, Site.user_id == User.id)
    )
    if status_filter:
        query = query.where(Schedule.status == status_filter)
    if user_id:
        query = query.where(Site.user_id == user_id)

    rows = db.execute(query.order_by(Schedule.scheduled_at.desc())).all()
    items = [
        AdminScheduleOut(
            id=schedule.id,
            post_id=post.id,
            post_title=post.title,
            platform=post.platform,
            owner_email=owner.email,
            scheduled_at=schedule.scheduled_at,
            status=schedule.status,
            retry_count=schedule.retry_count,
            last_error=schedule.last_error,
            published_at=schedule.published_at,
        )
        for schedule, post, owner in rows
    ]
    return AdminScheduleListResponse(items=items, total=len(items))


# ---------------------------------------------------------------------------
# Billing / revenue
# ---------------------------------------------------------------------------


@router.get("/payments", response_model=AdminPaymentListResponse)
def list_payments(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    user_id: uuid.UUID | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = select(Payment, User).join(User, Payment.user_id == User.id)
    if user_id:
        query = query.where(Payment.user_id == user_id)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(Payment.paid_at.desc()).offset((page - 1) * limit).limit(limit)
    ).all()
    items = [
        AdminPaymentOut(
            id=payment.id,
            user_id=payment.user_id,
            user_email=owner.email,
            plan_code=payment.plan_code,
            amount=payment.amount,
            currency=payment.currency,
            channel=payment.channel,
            paystack_reference=payment.paystack_reference,
            paid_at=payment.paid_at,
        )
        for payment, owner in rows
    ]
    return AdminPaymentListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/revenue/summary", response_model=RevenueSummaryOut)
def get_revenue_summary(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    summary = get_admin_summary(db)

    month_expr = func.to_char(Payment.paid_at, "YYYY-MM")
    monthly_rows = db.execute(
        select(month_expr, Payment.currency, func.sum(Payment.amount))
        .group_by(month_expr, Payment.currency)
        .order_by(month_expr)
    ).all()

    return RevenueSummaryOut(
        total_revenue_by_currency=summary["total_revenue_by_currency"],
        mrr_estimate_usd=summary["mrr_estimate_usd"],
        monthly_series=[
            RevenueMonthPoint(month=month, amount=float(amount), currency=currency)
            for month, currency, amount in monthly_rows
        ],
    )


@router.get("/transactions", response_model=AdminTransactionListResponse)
def list_paystack_transactions(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Every Paystack transaction attempt — success, failed, or abandoned — fetched
    live from Paystack itself rather than our local Payment table, since we only
    persist successful charges there.
    """
    try:
        result = paystack.list_transactions(db, page=page, per_page=per_page, status_filter=status_filter)
    except PaystackNotConfigured as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except PaystackError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    def _plan_code(tx: dict) -> str | None:
        # Paystack's own top-level `plan` field only gets populated once a
        # transaction actually creates/renews a Paystack-native subscription —
        # which never happens for our one-off amount+plan checkout (see
        # services/paystack.py), and never for failed/abandoned attempts either
        # way. The plan we actually charged for lives in the metadata we set
        # ourselves at initialize time (see billing.py's `subscribe`), which
        # Paystack echoes back verbatim regardless of how the transaction ended.
        metadata = tx.get("metadata") or {}
        if isinstance(metadata, dict) and metadata.get("plan_code"):
            return metadata["plan_code"]
        plan = tx.get("plan")
        if isinstance(plan, dict):
            return plan.get("plan_code")
        return plan or None

    items = [
        AdminTransactionOut(
            id=tx["id"],
            reference=tx.get("reference", ""),
            status=tx.get("status", "unknown"),
            amount=(tx.get("amount") or 0) / 100,
            currency=tx.get("currency", "NGN"),
            channel=tx.get("channel"),
            customer_email=(tx.get("customer") or {}).get("email"),
            plan_code=_plan_code(tx),
            gateway_response=tx.get("gateway_response"),
            paid_at=tx.get("paid_at"),
            created_at=tx.get("created_at"),
        )
        for tx in result["data"]
    ]
    total = result["meta"].get("total", len(items))
    return AdminTransactionListResponse(items=items, total=total, page=page, per_page=per_page)


# ---------------------------------------------------------------------------
# Activity logs (global)
# ---------------------------------------------------------------------------


@router.get("/activity-logs", response_model=AdminActivityLogListResponse)
def list_all_activity_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    user_id: uuid.UUID | None = None,
    action: str | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = select(ActivityLog, User).outerjoin(User, ActivityLog.user_id == User.id)
    if user_id:
        query = query.where(ActivityLog.user_id == user_id)
    if action:
        query = query.where(ActivityLog.action == action)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(ActivityLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
    ).all()
    items = [
        AdminActivityLogOut(
            id=log.id,
            user_id=log.user_id,
            user_email=owner.email if owner else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            created_at=log.created_at,
        )
        for log, owner in rows
    ]
    return AdminActivityLogListResponse(items=items, total=total, page=page, limit=limit)


# ---------------------------------------------------------------------------
# Integrations config
# ---------------------------------------------------------------------------


@router.get("/config/paystack", response_model=PaystackConfigStatusOut)
def get_paystack_config(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return PaystackConfigStatusOut(**paystack_config.get_status(db))


@router.put("/config/paystack", response_model=PaystackConfigStatusOut)
def set_paystack_config(
    payload: PaystackConfigIn,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    paystack_config.upsert(db, payload.secret_key, payload.public_key)
    log_activity(
        db, user_id=current_user.id, action="admin_set_paystack_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return PaystackConfigStatusOut(**paystack_config.get_status(db))


@router.delete("/config/paystack", response_model=PaystackConfigStatusOut)
def delete_paystack_config(
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    paystack_config.delete(db)
    log_activity(
        db, user_id=current_user.id, action="admin_delete_paystack_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return PaystackConfigStatusOut(**paystack_config.get_status(db))


def _plan_to_out(plan) -> AdminPlanOut:
    return AdminPlanOut(
        code=plan.code,
        name=plan.name,
        price_usd=plan.price_usd,
        max_sites=plan.max_sites,
        max_posts_per_month=plan.max_posts_per_month,
        max_flyers_per_month=plan.max_flyers_per_month,
        schedule_horizon_days=plan.schedule_horizon_days,
        paystack_plan_code=plan.paystack_plan_code,
    )


@router.get("/plans", response_model=list[AdminPlanOut])
def get_plans(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return [_plan_to_out(plan) for plan in list_plans(db)]


@router.post("/plans", response_model=AdminPlanOut, status_code=status.HTTP_201_CREATED)
def add_plan(
    payload: AdminPlanIn,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    try:
        plan = create_plan(db, **payload.model_dump())
    except PlanError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    log_activity(
        db, user_id=current_user.id, action="admin_create_plan", entity_type="plan",
        entity_id=current_user.id, details={"code": plan.code}, request=request,
    )
    return _plan_to_out(plan)


@router.put("/plans/{code}", response_model=AdminPlanOut)
def edit_plan(
    code: str,
    payload: AdminPlanUpdateIn,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    try:
        plan = update_plan(db, code, **payload.model_dump())
    except PlanError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    log_activity(
        db, user_id=current_user.id, action="admin_update_plan", entity_type="plan",
        entity_id=current_user.id, details={"code": code}, request=request,
    )
    return _plan_to_out(plan)


@router.delete("/plans/{code}", status_code=status.HTTP_204_NO_CONTENT)
def remove_plan(
    code: str,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    try:
        delete_plan(db, code)
    except PlanError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    log_activity(
        db, user_id=current_user.id, action="admin_delete_plan", entity_type="plan",
        entity_id=current_user.id, details={"code": code}, request=request,
    )


@router.get("/config/brevo", response_model=BrevoConfigStatusOut)
def get_brevo_config(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return BrevoConfigStatusOut(**brevo_config.get_status(db))


@router.put("/config/brevo", response_model=BrevoConfigStatusOut)
def set_brevo_config(
    payload: BrevoConfigIn,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    brevo_config.upsert(db, payload.api_key, payload.sender_email, payload.sender_name)
    log_activity(
        db, user_id=current_user.id, action="admin_set_brevo_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return BrevoConfigStatusOut(**brevo_config.get_status(db))


@router.delete("/config/brevo", response_model=BrevoConfigStatusOut)
def delete_brevo_config(
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    brevo_config.delete(db)
    log_activity(
        db, user_id=current_user.id, action="admin_delete_brevo_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return BrevoConfigStatusOut(**brevo_config.get_status(db))


MAX_GEOIP_UPLOAD_READ_BYTES = geoip_config.MAX_UPLOAD_BYTES + 1  # one byte past the allowed size


@router.get("/config/geoip", response_model=GeoipConfigStatusOut)
def get_geoip_config(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return GeoipConfigStatusOut(**geoip_config.get_status(db))


@router.put("/config/geoip", response_model=GeoipConfigStatusOut)
async def set_geoip_config(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    data = await file.read(MAX_GEOIP_UPLOAD_READ_BYTES)
    if len(data) >= MAX_GEOIP_UPLOAD_READ_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File is too large.")

    try:
        geoip_config.upload(db, data, file.filename or "GeoLite2-City.mmdb")
    except geoip_config.GeoipConfigError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    log_activity(
        db, user_id=current_user.id, action="admin_set_geoip_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return GeoipConfigStatusOut(**geoip_config.get_status(db))


@router.delete("/config/geoip", response_model=GeoipConfigStatusOut)
def delete_geoip_config(
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    geoip_config.delete(db)
    log_activity(
        db, user_id=current_user.id, action="admin_delete_geoip_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return GeoipConfigStatusOut(**geoip_config.get_status(db))


# ---------------------------------------------------------------------------
# Support inbox
# ---------------------------------------------------------------------------


@router.get("/support/conversations", response_model=list[AdminSupportConversationOut])
def get_support_conversations(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return [AdminSupportConversationOut(**row) for row in list_admin_inbox(db)]


@router.get("/support/conversations/{user_id}/messages", response_model=list[SupportMessageOut])
def get_support_thread(
    user_id: uuid.UUID,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return list_thread(db, user_id)


@router.post("/support/conversations/{user_id}/messages", response_model=SupportMessageOut)
def reply_to_support_thread(
    user_id: uuid.UUID,
    payload: SupportMessageIn,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return send_admin_reply(db, current_user, user_id, payload.body)


@router.get("/config/support", response_model=SupportConfigStatusOut)
def get_support_config(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return SupportConfigStatusOut(**support_config.get_status(db))


@router.put("/config/support", response_model=SupportConfigStatusOut)
def set_support_config(
    payload: SupportConfigIn,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    support_config.upsert(db, payload.notification_email)
    log_activity(
        db, user_id=current_user.id, action="admin_set_support_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return SupportConfigStatusOut(**support_config.get_status(db))


@router.delete("/config/support", response_model=SupportConfigStatusOut)
def delete_support_config(
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    support_config.delete(db)
    log_activity(
        db, user_id=current_user.id, action="admin_delete_support_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return SupportConfigStatusOut(**support_config.get_status(db))
