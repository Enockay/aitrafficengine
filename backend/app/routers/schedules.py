import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from celery_worker import celery_app

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.page import Page
from app.models.platform_account import PlatformAccount
from app.models.post import Post
from app.models.schedule import Schedule
from app.models.site import Site
from app.models.user import User
from app.schemas.schedule import ScheduleListResponse, ScheduleOut, ScheduleReschedule
from app.services.activity_log import log_activity
from app.services.distribution import DistributionError, cancel_schedule
from app.services.distribution import reschedule as run_reschedule
from app.tasks.distribution import publish_scheduled_post

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


def _get_owned_platform_account(db: Session, account_id: uuid.UUID, user: User) -> PlatformAccount:
    account = db.execute(
        select(PlatformAccount).where(
            PlatformAccount.id == account_id, PlatformAccount.user_id == user.id
        )
    ).scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Platform account not found")
    return account


def _to_out(schedule: Schedule, post: Post, account: PlatformAccount) -> ScheduleOut:
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
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None))
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
    old_task_id = schedule.celery_task_id
    try:
        cancel_schedule(db, schedule)
    except DistributionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if old_task_id:
        celery_app.control.revoke(old_task_id)
    log_activity(
        db,
        user_id=current_user.id,
        action="cancel",
        entity_type="schedule",
        entity_id=schedule_id,
        request=request,
    )


@router.patch("/{schedule_id}", response_model=ScheduleOut)
def reschedule_schedule(
    schedule_id: uuid.UUID,
    payload: ScheduleReschedule,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    schedule = _get_owned_schedule(db, schedule_id, current_user)
    account = (
        _get_owned_platform_account(db, payload.platform_account_id, current_user)
        if payload.platform_account_id
        else schedule.platform_account
    )

    old_task_id = schedule.celery_task_id
    try:
        schedule = run_reschedule(db, schedule, payload.scheduled_at, payload.timezone, account)
    except DistributionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    if old_task_id:
        celery_app.control.revoke(old_task_id)
    task = publish_scheduled_post.apply_async(args=[str(schedule.id)], eta=schedule.scheduled_at)
    schedule.celery_task_id = task.id
    db.commit()
    db.refresh(schedule)

    log_activity(
        db,
        user_id=current_user.id,
        action="reschedule",
        entity_type="schedule",
        entity_id=schedule.id,
        details={"scheduled_at": payload.scheduled_at.isoformat(), "platform_account_id": str(account.id)},
        request=request,
    )

    return _to_out(schedule, schedule.post, account)
