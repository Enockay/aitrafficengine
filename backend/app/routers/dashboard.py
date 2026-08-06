from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.analytics import Analytics
from app.models.flyer import Flyer
from app.models.page import Page
from app.models.platform_account import PlatformAccount
from app.models.post import Post
from app.models.schedule import Schedule
from app.models.site import Site
from app.models.user import User
from app.schemas.dashboard import (
    ActivityEvent,
    DashboardOverview,
    DashboardTopPost,
    MetricCard,
    PlatformHealth,
    TrafficDay,
)
from app.services.connectors import supported_platforms

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _delta_pct(current: int, previous: int) -> float | None:
    if previous == 0:
        return None if current == 0 else 100.0
    return round((current - previous) / previous * 100, 1)


def _daily_counts(rows: list[tuple[date, int]], since: date, days: int) -> list[int]:
    by_day = {d: c for d, c in rows}
    return [by_day.get(since + timedelta(days=i), 0) for i in range(days)]


@router.get("/overview", response_model=DashboardOverview)
def get_dashboard_overview(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today = now.date()
    week_start = today - timedelta(days=6)
    prev_week_start = today - timedelta(days=13)
    prev_week_end = today - timedelta(days=7)

    # ---- Total Posts ----
    total_posts = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None))
    ).scalar_one()
    posts_this_week = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None), Post.created_at >= week_start)
    ).scalar_one()
    posts_prev_week = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(
            Site.user_id == current_user.id,
            Post.deleted_at.is_(None),
            Post.created_at >= prev_week_start,
            Post.created_at < prev_week_end,
        )
    ).scalar_one()
    posts_daily_rows = db.execute(
        select(func.date(Post.created_at), func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None), Post.created_at >= week_start)
        .group_by(func.date(Post.created_at))
    ).all()

    # ---- Total Clicks ----
    total_clicks = db.execute(
        select(func.coalesce(func.sum(Analytics.clicks), 0))
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id)
    ).scalar_one()
    clicks_this_week = db.execute(
        select(func.coalesce(func.sum(Analytics.clicks), 0))
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Analytics.metric_date >= week_start)
    ).scalar_one()
    clicks_prev_week = db.execute(
        select(func.coalesce(func.sum(Analytics.clicks), 0))
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(
            Site.user_id == current_user.id,
            Analytics.metric_date >= prev_week_start,
            Analytics.metric_date < prev_week_end,
        )
    ).scalar_one()
    clicks_daily_rows = db.execute(
        select(Analytics.metric_date, func.coalesce(func.sum(Analytics.clicks), 0))
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Analytics.metric_date >= week_start)
        .group_by(Analytics.metric_date)
    ).all()

    # ---- Active Schedules ----
    active_schedules = db.execute(
        select(func.count(Schedule.id))
        .join(Post, Schedule.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Schedule.status == "pending")
    ).scalar_one()
    schedules_this_week = db.execute(
        select(func.count(Schedule.id))
        .join(Post, Schedule.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Schedule.created_at >= week_start)
    ).scalar_one()
    schedules_prev_week = db.execute(
        select(func.count(Schedule.id))
        .join(Post, Schedule.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(
            Site.user_id == current_user.id,
            Schedule.created_at >= prev_week_start,
            Schedule.created_at < prev_week_end,
        )
    ).scalar_one()
    schedules_daily_rows = db.execute(
        select(func.date(Schedule.created_at), func.count(Schedule.id))
        .join(Post, Schedule.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Schedule.created_at >= week_start)
        .group_by(func.date(Schedule.created_at))
    ).all()

    # ---- Connected Platforms ----
    connected_platforms = db.execute(
        select(func.count(func.distinct(PlatformAccount.platform))).where(
            PlatformAccount.user_id == current_user.id, PlatformAccount.is_active.is_(True)
        )
    ).scalar_one()
    accounts_this_week = db.execute(
        select(func.count(PlatformAccount.id)).where(
            PlatformAccount.user_id == current_user.id, PlatformAccount.created_at >= week_start
        )
    ).scalar_one()
    accounts_prev_week = db.execute(
        select(func.count(PlatformAccount.id)).where(
            PlatformAccount.user_id == current_user.id,
            PlatformAccount.created_at >= prev_week_start,
            PlatformAccount.created_at < prev_week_end,
        )
    ).scalar_one()
    accounts_daily_rows = db.execute(
        select(func.date(PlatformAccount.created_at), func.count(PlatformAccount.id))
        .where(PlatformAccount.user_id == current_user.id, PlatformAccount.created_at >= week_start)
        .group_by(func.date(PlatformAccount.created_at))
    ).all()

    # ---- Traffic by day (30 days, by platform) ----
    traffic_since = today - timedelta(days=29)
    traffic_rows = db.execute(
        select(Analytics.metric_date, Analytics.platform, func.coalesce(func.sum(Analytics.clicks), 0))
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Analytics.metric_date >= traffic_since)
        .group_by(Analytics.metric_date, Analytics.platform)
    ).all()
    traffic_map: dict[date, dict[str, int]] = {}
    for metric_date, platform, clicks in traffic_rows:
        traffic_map.setdefault(metric_date, {})[platform] = int(clicks)
    traffic_by_day = [
        TrafficDay(
            date=d,
            twitter=traffic_map.get(d, {}).get("twitter", 0),
            linkedin=traffic_map.get(d, {}).get("linkedin", 0),
            reddit=traffic_map.get(d, {}).get("reddit", 0),
        )
        for d in (traffic_since + timedelta(days=i) for i in range(30))
    ]

    # ---- Top 5 posts ----
    top_posts_rows = db.execute(
        select(
            Post.id,
            Post.title,
            Post.platform,
            Post.status,
            func.coalesce(func.sum(Analytics.clicks), 0),
        )
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .outerjoin(Analytics, Analytics.post_id == Post.id)
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None))
        .group_by(Post.id)
        .order_by(func.coalesce(func.sum(Analytics.clicks), 0).desc())
        .limit(5)
    ).all()
    top_posts = [
        DashboardTopPost(id=pid, title=title, platform=platform, status=pstatus, clicks=int(clicks))
        for pid, title, platform, pstatus, clicks in top_posts_rows
    ]

    # ---- Platform health ----
    platform_health = []
    for platform in supported_platforms():
        account = db.execute(
            select(PlatformAccount)
            .where(
                PlatformAccount.user_id == current_user.id,
                PlatformAccount.platform == platform,
                PlatformAccount.is_active.is_(True),
            )
            .order_by(PlatformAccount.created_at.desc())
        ).scalars().first()
        last_publish_at = db.execute(
            select(func.max(Post.published_at))
            .join(Page, Post.page_id == Page.id)
            .join(Site, Page.site_id == Site.id)
            .where(Site.user_id == current_user.id, Post.platform == platform)
        ).scalar_one()
        platform_health.append(
            PlatformHealth(
                platform=platform,
                connected=account is not None,
                account_handle=account.account_handle if account else None,
                last_publish_at=last_publish_at,
                rate_limit_remaining=account.rate_limit_remaining if account else None,
                rate_limit_reset_at=account.rate_limit_reset_at if account else None,
            )
        )

    # ---- Recent activity (last 10 events across posts/schedules/sites/flyers) ----
    events: list[ActivityEvent] = []

    recent_posts = db.execute(
        select(Post.title, Post.platform, Post.status, Post.created_at)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None))
        .order_by(Post.created_at.desc())
        .limit(5)
    ).all()
    for title, platform, pstatus, created_at in recent_posts:
        events.append(
            ActivityEvent(
                type="post",
                description=f"Generated a {platform} post: {(title or 'Untitled')[:60]}",
                timestamp=created_at,
            )
        )

    recent_sites = db.execute(
        select(Site.name, Site.created_at)
        .where(Site.user_id == current_user.id, Site.deleted_at.is_(None))
        .order_by(Site.created_at.desc())
        .limit(5)
    ).all()
    for name, created_at in recent_sites:
        events.append(ActivityEvent(type="site", description=f"Added site: {name}", timestamp=created_at))

    recent_flyers = db.execute(
        select(Flyer.headline, Flyer.created_at)
        .join(Page, Flyer.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Flyer.deleted_at.is_(None))
        .order_by(Flyer.created_at.desc())
        .limit(5)
    ).all()
    for headline, created_at in recent_flyers:
        events.append(
            ActivityEvent(
                type="flyer", description=f"Generated flyer: {(headline or 'Untitled')[:60]}", timestamp=created_at
            )
        )

    recent_schedules = db.execute(
        select(Schedule.status, Schedule.scheduled_at, Schedule.created_at, Post.platform)
        .join(Post, Schedule.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id)
        .order_by(Schedule.created_at.desc())
        .limit(5)
    ).all()
    for sched_status, scheduled_at, created_at, platform in recent_schedules:
        events.append(
            ActivityEvent(
                type="schedule",
                description=f"Scheduled a {platform} post for {scheduled_at.strftime('%b %d, %H:%M UTC')}",
                timestamp=created_at,
            )
        )

    events.sort(key=lambda e: e.timestamp, reverse=True)
    recent_activity = events[:10]

    return DashboardOverview(
        total_posts=MetricCard(
            value=total_posts,
            delta_pct=_delta_pct(posts_this_week, posts_prev_week),
            sparkline=_daily_counts(posts_daily_rows, week_start, 7),
        ),
        total_clicks=MetricCard(
            value=int(total_clicks),
            delta_pct=_delta_pct(int(clicks_this_week), int(clicks_prev_week)),
            sparkline=_daily_counts(clicks_daily_rows, week_start, 7),
        ),
        active_schedules=MetricCard(
            value=active_schedules,
            delta_pct=_delta_pct(schedules_this_week, schedules_prev_week),
            sparkline=_daily_counts(schedules_daily_rows, week_start, 7),
        ),
        connected_platforms=MetricCard(
            value=connected_platforms,
            delta_pct=_delta_pct(accounts_this_week, accounts_prev_week),
            sparkline=_daily_counts(accounts_daily_rows, week_start, 7),
        ),
        traffic_by_day=traffic_by_day,
        top_posts=top_posts,
        platform_health=platform_health,
        recent_activity=recent_activity,
    )
