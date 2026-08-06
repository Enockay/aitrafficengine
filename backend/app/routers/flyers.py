import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.flyer import Flyer
from app.models.page import Page
from app.models.site import Site
from app.models.user import User
from app.schemas.flyer import (
    FlyerListResponse,
    FlyerOut,
    GenerateFlyerRequest,
    GeneratePromptRequest,
    GeneratePromptResponse,
)
from app.services.activity_log import log_activity
from app.services.flyer_generator import (
    FlyerGenerationError,
    delete_flyer_file,
    generate_flyer_image,
    save_flyer_image,
)
from app.services.flyer_prompt import PromptGenerationError, generate_image_prompt
from app.services.image_generation import (
    ImageGenerationError,
    ImageGenerationNotConfigured,
    generate_background_bytes,
)
from app.services.quotas import QuotaExceededError, check_can_generate_flyer
from app.services.s3_storage import generate_presigned_url

router = APIRouter(prefix="/flyers", tags=["flyers"])
settings = get_settings()


def _get_owned_page(db: Session, page_id: uuid.UUID, user: User) -> Page:
    page = db.execute(
        select(Page)
        .join(Site, Page.site_id == Site.id)
        .where(Page.id == page_id, Site.user_id == user.id, Page.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


def _get_owned_flyer(db: Session, flyer_id: uuid.UUID, user: User) -> Flyer:
    flyer = db.execute(
        select(Flyer)
        .join(Page, Flyer.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Flyer.id == flyer_id, Site.user_id == user.id, Flyer.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not flyer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flyer not found")
    return flyer


def _to_out(flyer: Flyer) -> FlyerOut:
    if flyer.image_path.startswith("s3:"):
        image_url = generate_presigned_url(flyer.image_path.removeprefix("s3:"))
    else:
        image_url = f"{settings.backend_url}/media/{flyer.image_path}"
    return FlyerOut(
        id=flyer.id,
        page_id=flyer.page_id,
        template_name=flyer.template_name,
        image_url=image_url,
        headline=flyer.headline,
        subheadline=flyer.subheadline,
        cta_text=flyer.cta_text,
        status=flyer.status,
        created_at=flyer.created_at,
    )


@router.get("", response_model=FlyerListResponse)
def list_flyers(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    page_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(Flyer)
        .join(Page, Flyer.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Flyer.deleted_at.is_(None))
    )
    if page_id:
        query = query.where(Flyer.page_id == page_id)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    flyers = (
        db.execute(query.order_by(Flyer.created_at.desc()).offset((page - 1) * limit).limit(limit))
        .scalars()
        .all()
    )
    return FlyerListResponse(items=[_to_out(f) for f in flyers], total=total, page=page, limit=limit)


@router.post("/generate-prompt", response_model=GeneratePromptResponse)
def generate_prompt(
    payload: GeneratePromptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page = _get_owned_page(db, payload.page_id, current_user)
    site = db.get(Site, page.site_id)
    try:
        image_prompt = generate_image_prompt(page, site.name if site else None)
    except PromptGenerationError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    return GeneratePromptResponse(image_prompt=image_prompt)


@router.post("/generate", response_model=FlyerOut, status_code=status.HTTP_201_CREATED)
def generate_flyer(
    payload: GenerateFlyerRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page = _get_owned_page(db, payload.page_id, current_user)
    try:
        check_can_generate_flyer(db, current_user)
    except QuotaExceededError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    site = db.get(Site, page.site_id)

    headline = payload.headline or page.title or "Check this out"
    subheadline = payload.subheadline or (page.summary[:180] if page.summary else None)
    site_name = site.name if site else None

    image_prompt = payload.image_prompt
    if not image_prompt:
        try:
            image_prompt = generate_image_prompt(page, site_name)
        except PromptGenerationError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    try:
        background_bytes = generate_background_bytes(image_prompt)
    except ImageGenerationNotConfigured as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except ImageGenerationError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    try:
        image = generate_flyer_image(
            headline=headline,
            subheadline=subheadline,
            cta_text=payload.cta_text,
            site_name=site_name,
            background_bytes=background_bytes,
        )
        image_path = save_flyer_image(image)
    except FlyerGenerationError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    flyer = Flyer(
        page_id=page.id,
        template_name=payload.template_name,
        image_path=image_path,
        headline=headline,
        subheadline=subheadline,
        cta_text=payload.cta_text,
        status="generated",
    )
    db.add(flyer)
    db.commit()
    db.refresh(flyer)
    log_activity(
        db, user_id=current_user.id, action="generate", entity_type="flyer", entity_id=flyer.id, request=request
    )
    return _to_out(flyer)


@router.get("/{flyer_id}", response_model=FlyerOut)
def get_flyer(flyer_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    flyer = _get_owned_flyer(db, flyer_id, current_user)
    return _to_out(flyer)


@router.delete("/{flyer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flyer(
    flyer_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    flyer = _get_owned_flyer(db, flyer_id, current_user)
    delete_flyer_file(flyer.image_path)
    flyer.deleted_at = datetime.now(timezone.utc)
    db.commit()
    log_activity(
        db, user_id=current_user.id, action="delete", entity_type="flyer", entity_id=flyer.id, request=request
    )
