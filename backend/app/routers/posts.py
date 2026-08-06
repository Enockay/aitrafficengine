import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.analytics import Analytics
from app.models.page import Page
from app.models.platform_account import PlatformAccount
from app.models.post import Post
from app.models.site import Site
from app.models.user import User
from app.schemas.post import (
    GenerateVariantsResponse,
    PostCreate,
    PostListResponse,
    PostOut,
    PostUpdate,
    VariantEntry,
)
from app.schemas.schedule import ScheduleCreate, ScheduleOut
from app.services.activity_log import log_activity
from app.services.distribution import DistributionError, repair_local_redirect_link
from app.services.distribution import publish_now as run_publish_now
from app.services.distribution import schedule_post as run_schedule_post
from app.tasks.distribution import publish_scheduled_post

router = APIRouter(prefix="/posts", tags=["posts"])


class PublishRequest(BaseModel):
    platform_account_id: uuid.UUID


def _get_owned_platform_account(db: Session, account_id: uuid.UUID, user: User) -> PlatformAccount:
    account = db.execute(
        select(PlatformAccount).where(
            PlatformAccount.id == account_id, PlatformAccount.user_id == user.id
        )
    ).scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Platform account not found")
    return account


def _get_owned_post(db: Session, post_id: uuid.UUID, user: User) -> Post:
    post = db.execute(
        select(Post)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Post.id == post_id, Site.user_id == user.id, Post.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


def _get_owned_page(db: Session, page_id: uuid.UUID, user: User) -> Page:
    page = db.execute(
        select(Page)
        .join(Site, Page.site_id == Site.id)
        .where(Page.id == page_id, Site.user_id == user.id, Page.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


@router.get("", response_model=PostListResponse)
def list_posts(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    platform: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(Post)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None))
    )
    if platform:
        query = query.where(Post.platform == platform)
    if status_filter:
        query = query.where(Post.status == status_filter)
    if search:
        like = f"%{search}%"
        query = query.where((Post.title.ilike(like)) | (Post.body.ilike(like)))

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    posts = (
        db.execute(query.order_by(Post.created_at.desc()).offset((page - 1) * limit).limit(limit))
        .scalars()
        .all()
    )
    return PostListResponse(
        items=[PostOut.model_validate(p) for p in posts], total=total, page=page, limit=limit
    )


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: PostCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_page(db, payload.page_id, current_user)

    post = Post(
        page_id=payload.page_id,
        platform=payload.platform,
        title=payload.title,
        body=payload.body,
        hashtags=payload.hashtags,
        tracked_url=payload.tracked_url,
        status="draft",
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    log_activity(
        db, user_id=current_user.id, action="create", entity_type="post", entity_id=post.id, request=request
    )
    return PostOut.model_validate(post)


@router.get("/variants/{variant_group_id}", response_model=GenerateVariantsResponse)
def get_variant_group(
    variant_group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    clicks = func.coalesce(func.sum(Analytics.clicks), 0)
    rows = db.execute(
        select(Post, clicks)
        .select_from(Post)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .outerjoin(Analytics, Analytics.post_id == Post.id)
        .where(
            Post.variant_group_id == variant_group_id,
            Site.user_id == current_user.id,
            Post.deleted_at.is_(None),
        )
        .group_by(Post.id)
        .order_by(Post.variant_label.asc())
    ).all()

    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant group not found")

    return GenerateVariantsResponse(
        variant_group_id=variant_group_id,
        variants=[VariantEntry(post=PostOut.model_validate(post), total_clicks=total_clicks) for post, total_clicks in rows],
    )


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = _get_owned_post(db, post_id, current_user)
    return PostOut.model_validate(post)


@router.put("/{post_id}", response_model=PostOut)
def update_post(
    post_id: uuid.UUID,
    payload: PostUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = _get_owned_post(db, post_id, current_user)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(post, key, value)
    db.commit()
    db.refresh(post)
    log_activity(
        db, user_id=current_user.id, action="update", entity_type="post", entity_id=post.id, request=request
    )
    return PostOut.model_validate(post)


@router.post("/{post_id}/repair-link", response_model=PostOut)
def repair_post_link(
    post_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fixes a post whose body still carries a dev/local tracked link (see
    distribution.py — this happens when a post was generated while BACKEND_URL wasn't
    set to a public URL). Rewrites the link to use the server's current BACKEND_URL,
    leaving the rest of the AI-drafted text untouched.
    """
    post = _get_owned_post(db, post_id, current_user)
    changed = repair_local_redirect_link(post)
    if not changed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This post's tracked link is already correct."
        )
    db.commit()
    db.refresh(post)
    log_activity(
        db, user_id=current_user.id, action="repair_link", entity_type="post", entity_id=post.id, request=request
    )
    return PostOut.model_validate(post)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = _get_owned_post(db, post_id, current_user)
    post.deleted_at = datetime.now(timezone.utc)
    db.commit()
    log_activity(
        db, user_id=current_user.id, action="delete", entity_type="post", entity_id=post.id, request=request
    )


@router.post("/{post_id}/approve", response_model=PostOut)
def approve_post(
    post_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = _get_owned_post(db, post_id, current_user)
    if post.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=f"Post is '{post.status}', not 'draft'."
        )
    post.status = "approved"
    db.commit()
    db.refresh(post)
    log_activity(
        db, user_id=current_user.id, action="approve", entity_type="post", entity_id=post.id, request=request
    )
    return PostOut.model_validate(post)


@router.post("/{post_id}/schedule", response_model=ScheduleOut, status_code=status.HTTP_201_CREATED)
def schedule_post(
    post_id: uuid.UUID,
    payload: ScheduleCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = _get_owned_post(db, post_id, current_user)
    account = _get_owned_platform_account(db, payload.platform_account_id, current_user)

    try:
        schedule = run_schedule_post(db, post, account, payload.scheduled_at, payload.timezone)
    except DistributionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    publish_scheduled_post.apply_async(args=[str(schedule.id)], eta=schedule.scheduled_at)

    log_activity(
        db,
        user_id=current_user.id,
        action="schedule",
        entity_type="post",
        entity_id=post.id,
        details={"scheduled_at": payload.scheduled_at.isoformat(), "platform_account_id": str(account.id)},
        request=request,
    )

    return ScheduleOut(
        id=schedule.id,
        post_id=post.id,
        post_title=post.title,
        platform=post.platform,
        platform_account_id=account.id,
        platform_account_label=account.account_handle or account.account_name,
        scheduled_at=schedule.scheduled_at,
        timezone=schedule.timezone,
        status=schedule.status,
        retry_count=schedule.retry_count,
        last_error=schedule.last_error,
        published_at=schedule.published_at,
        created_at=schedule.created_at,
    )


@router.post("/{post_id}/publish", response_model=PostOut)
def publish_post(
    post_id: uuid.UUID,
    payload: PublishRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = _get_owned_post(db, post_id, current_user)
    account = _get_owned_platform_account(db, payload.platform_account_id, current_user)

    try:
        post = run_publish_now(db, post, account)
    except DistributionError as exc:
        log_activity(
            db,
            user_id=current_user.id,
            action="publish_failed",
            entity_type="post",
            entity_id=post.id,
            details={"error": str(exc)},
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    log_activity(
        db, user_id=current_user.id, action="publish", entity_type="post", entity_id=post.id, request=request
    )

    return PostOut.model_validate(post)
