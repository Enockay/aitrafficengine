import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.page import Page
from app.models.platform_account import PlatformAccount
from app.models.post import Post
from app.models.schedule import Schedule
from app.models.site import Site
from app.models.user import User
from app.schemas.schedule import ScheduleListResponse, ScheduleOut
from app.services.activity_log import log_activity
from app.services.distribution import DistributionError, cancel_schedule

router = APIRouter(prefix="/schedules", tags=["schedules"])


def _get_owned_schedule(db: Session, schedule_id: uuid.UUID, user: User) -> Schedule:
    schedule = db.execute(
        select(Schedule)
        .join(Post, Schedule.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Schedule.id == schedule_id, Site.user_id == user.id)
    ).scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    return schedule


@router.get("", response_model=ScheduleListResponse)
def list_schedules(
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(Schedule, Post, PlatformAccount)
        .join(Post, Schedule.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .join(PlatformAccount, Schedule.platform_account_id == PlatformAccount.id)
        .where(Site.user_id == current_user.id)
    )
    if status_filter:
        query = query.where(Schedule.status == status_filter)

    rows = db.execute(query.order_by(Schedule.scheduled_at.asc())).all()
    items = [
        ScheduleOut(
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
        for schedule, post, account in rows
    ]
    return ScheduleListResponse(items=items, total=len(items))


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    schedule = _get_owned_schedule(db, schedule_id, current_user)
    try:
        cancel_schedule(db, schedule)
    except DistributionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    log_activity(
        db,
        user_id=current_user.id,
        action="cancel",
        entity_type="schedule",
        entity_id=schedule_id,
        request=request,
    )
