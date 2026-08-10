import hashlib
import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.page import Page
from app.models.platform_account import PlatformAccount
from app.models.post import Post
from app.models.schedule import Schedule
from app.models.site import Site
from app.services.activity_log import log_activity
from app.services.connectors import get_connector
from app.services.connectors.base import ConnectorAuthError, ConnectorNotConfigured, ConnectorPublishError
from app.services.quotas import QuotaExceededError, check_schedule_horizon

settings = get_settings()

SCHEDULABLE_STATUSES = ("approved", "scheduled")

# Catches the exact failure mode where a post's tracked link (baked into post.body at
# generation time in routers/pages.py) was built from a dev/local BACKEND_URL — dead
# for anyone who isn't on that machine. Checked against the post's actual text rather
# than the *current* settings.backend_url, so it still catches an already-generated
# post even if BACKEND_URL has since been fixed.
_LOCAL_REDIRECT_PATTERN = re.compile(r"https?://(localhost|127\.0\.0\.1)(:\d+)?/r/")


class DistributionError(Exception):
    pass


def _has_local_redirect_link(post: Post) -> bool:
    return bool(_LOCAL_REDIRECT_PATTERN.search(post.body or ""))


def repair_local_redirect_link(post: Post) -> bool:
    """Rewrites a post's body in place, swapping a dev/local tracked-link prefix for
    the current (presumably now-correct) settings.backend_url. Only touches the
    scheme/host/port portion — the /r/{post_id} path is left untouched. Returns
    whether anything actually changed, so callers can no-op cleanly.
    """
    if not _has_local_redirect_link(post):
        return False
    post.body = _LOCAL_REDIRECT_PATTERN.sub(f"{settings.backend_url}/r/", post.body)
    return True


def compute_content_hash(body: str | None) -> str | None:
    """Normalized (whitespace-collapsed, lowercased) SHA-256 of a post's body, used to
    catch a user accidentally re-scheduling/publishing the exact same text on the same
    platform. Deliberately cheap (exact-match hash, not embeddings) — near-duplicates
    with different hashtags/tracked_url are allowed through by design.
    """
    if not body or not body.strip():
        return None
    normalized = re.sub(r"\s+", " ", body.strip().lower())
    return hashlib.sha256(normalized.encode()).hexdigest()


def _find_duplicate_content(db: Session, post: Post) -> Post | None:
    if not post.content_hash:
        return None
    return db.execute(
        select(Post)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(
            Site.user_id == post.page.site.user_id,
            Post.platform == post.platform,
            Post.content_hash == post.content_hash,
            Post.id != post.id,
            Post.status.in_(("scheduled", "published")),
            Post.deleted_at.is_(None),
        )
    ).scalars().first()


def _check_not_duplicate(db: Session, post: Post) -> None:
    duplicate = _find_duplicate_content(db, post)
    if duplicate:
        raise DistributionError(
            f"This post's text duplicates another {post.platform} post you already have "
            f"{duplicate.status} (id={duplicate.id}). Edit the content or resolve the other post first."
        )


def schedule_post(
    db: Session,
    post: Post,
    platform_account: PlatformAccount,
    scheduled_at: datetime,
    tz: str = "UTC",
) -> Schedule:
    if post.status not in SCHEDULABLE_STATUSES:
        raise DistributionError(f"Post must be approved before scheduling (currently '{post.status}').")
    if scheduled_at <= datetime.now(timezone.utc):
        raise DistributionError("Scheduled time must be in the future.")
    try:
        check_schedule_horizon(db, post.page.site.user, scheduled_at)
    except QuotaExceededError as exc:
        raise DistributionError(str(exc)) from exc
    if _has_local_redirect_link(post):
        raise DistributionError(
            "This post's tracked link points at localhost — it was generated while BACKEND_URL "
            "wasn't set to a public URL, so the link would be dead for anyone outside this machine. "
            "Fix BACKEND_URL, regenerate the post, then try again."
        )
    _check_not_duplicate(db, post)

    schedule = Schedule(
        post_id=post.id,
        platform_account_id=platform_account.id,
        scheduled_at=scheduled_at,
        timezone=tz,
        status="pending",
    )
    db.add(schedule)
    post.status = "scheduled"
    db.commit()
    db.refresh(schedule)
    return schedule


def cancel_schedule(db: Session, schedule: Schedule) -> None:
    if schedule.status != "pending":
        raise DistributionError(f"Only pending schedules can be cancelled (currently '{schedule.status}').")
    post = schedule.post
    db.delete(schedule)
    if post.status == "scheduled":
        post.status = "approved"
    db.commit()


def publish_now(db: Session, post: Post, platform_account: PlatformAccount) -> Post:
    if post.status not in SCHEDULABLE_STATUSES:
        raise DistributionError(f"Post must be approved before publishing (currently '{post.status}').")
    if _has_local_redirect_link(post):
        raise DistributionError(
            "This post's tracked link points at localhost — it was generated while BACKEND_URL "
            "wasn't set to a public URL, so the link would be dead for anyone outside this machine. "
            "Fix BACKEND_URL, regenerate the post, then try again."
        )
    _check_not_duplicate(db, post)

    result = _publish(db, platform_account, post)

    post.status = "published"
    post.published_url = result.published_url
    post.platform_post_id = result.platform_post_id
    post.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(post)
    return post


def execute_scheduled(db: Session, schedule: Schedule) -> None:
    """Called by the Celery task at (or after) schedule.scheduled_at.

    On failure, records the attempt and re-raises WITHOUT marking the schedule/post
    as terminally failed — only the Celery task knows whether retries remain, so it
    decides between rescheduling and calling mark_schedule_failed().
    """
    post = schedule.post
    platform_account = schedule.platform_account
    user = post.page.site.user
    user_id = user.id

    if not user.is_active or user.deleted_at is not None:
        # Suspending/deleting an account must actually stop its queued posts from
        # going out — retrying wouldn't help here, so fail terminally instead of
        # raising into the Celery retry path.
        schedule.status = "failed"
        schedule.last_error = "Account suspended"
        post.status = "failed"
        db.commit()
        log_activity(
            db,
            user_id=user_id,
            action="publish_failed",
            entity_type="post",
            entity_id=post.id,
            details={"error": "Account suspended", "schedule_id": str(schedule.id)},
        )
        return

    if post.deleted_at is not None:
        # delete_post() clears pending schedules up front, but this guards any schedule
        # that predates that fix (or a race) from publishing content the user deleted.
        schedule.status = "failed"
        schedule.last_error = "Post was deleted"
        db.commit()
        log_activity(
            db,
            user_id=user_id,
            action="publish_failed",
            entity_type="post",
            entity_id=post.id,
            details={"error": "Post was deleted", "schedule_id": str(schedule.id)},
        )
        return

    try:
        result = _publish(db, platform_account, post)
    except DistributionError as exc:
        schedule.last_error = str(exc)
        schedule.retry_count += 1
        db.commit()
        log_activity(
            db,
            user_id=user_id,
            action="publish_attempt_failed",
            entity_type="post",
            entity_id=post.id,
            details={"error": str(exc), "schedule_id": str(schedule.id), "attempt": schedule.retry_count},
        )
        raise

    schedule.status = "published"
    schedule.published_at = datetime.now(timezone.utc)
    post.status = "published"
    post.published_url = result.published_url
    post.platform_post_id = result.platform_post_id
    post.published_at = schedule.published_at
    db.commit()
    log_activity(
        db,
        user_id=user_id,
        action="publish",
        entity_type="post",
        entity_id=post.id,
        details={"schedule_id": str(schedule.id)},
    )


def mark_schedule_failed(db: Session, schedule: Schedule) -> None:
    """Called by the Celery task once retries are exhausted — the terminal failure state."""
    post = schedule.post
    schedule.status = "failed"
    post.status = "failed"
    db.commit()
    log_activity(
        db,
        user_id=post.page.site.user_id,
        action="publish_failed",
        entity_type="post",
        entity_id=post.id,
        details={"error": schedule.last_error, "schedule_id": str(schedule.id)},
    )


def _publish(db: Session, platform_account: PlatformAccount, post: Post):
    connector = get_connector(post.platform)
    try:
        return connector.publish(db, platform_account, post)
    except ConnectorNotConfigured as exc:
        raise DistributionError(str(exc)) from exc
    except ConnectorAuthError as exc:
        raise DistributionError(f"Authentication with {post.platform} failed: {exc}") from exc
    except ConnectorPublishError as exc:
        raise DistributionError(f"Publishing failed: {exc}") from exc
