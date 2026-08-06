from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.analytics import Analytics
from app.models.page import Page
from app.models.post import Post
from app.models.site import Site
from app.models.user import User
from app.schemas.analytics import AnalyticsSummary, DailyClicks, PlatformClicks, TopPost
from app.services.analytics_export import generate_csv, generate_pdf

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since = date.today() - timedelta(days=days - 1)

    total_clicks = db.execute(
        select(func.coalesce(func.sum(Analytics.clicks), 0))
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id)
    ).scalar_one()

    clicks_last_7_days = db.execute(
        select(func.coalesce(func.sum(Analytics.clicks), 0))
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Analytics.metric_date >= date.today() - timedelta(days=6))
    ).scalar_one()

    total_sites = db.execute(
        select(func.count(Site.id)).where(Site.user_id == current_user.id, Site.deleted_at.is_(None))
    ).scalar_one()
    total_pages = db.execute(
        select(func.count(Page.id))
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Page.deleted_at.is_(None))
    ).scalar_one()
    total_posts = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None))
    ).scalar_one()
    published_posts = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None), Post.status == "published")
    ).scalar_one()

    daily_rows = db.execute(
        select(Analytics.metric_date, func.coalesce(func.sum(Analytics.clicks), 0))
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Analytics.metric_date >= since)
        .group_by(Analytics.metric_date)
    ).all()
    clicks_by_day_map = {d: int(c) for d, c in daily_rows}
    clicks_by_day = [
        DailyClicks(date=day, clicks=clicks_by_day_map.get(day, 0))
        for day in (since + timedelta(days=i) for i in range(days))
    ]

    platform_rows = db.execute(
        select(Analytics.platform, func.coalesce(func.sum(Analytics.clicks), 0))
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id)
        .group_by(Analytics.platform)
    ).all()
    clicks_by_platform = [PlatformClicks(platform=p, clicks=int(c)) for p, c in platform_rows]

    top_posts_rows = db.execute(
        select(
            Post.id,
            Post.title,
            Post.platform,
            Post.status,
            func.coalesce(func.sum(Analytics.clicks), 0),
            Page.title,
            Site.name,
        )
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .outerjoin(Analytics, Analytics.post_id == Post.id)
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None))
        .group_by(Post.id, Page.title, Site.name)
        .order_by(func.coalesce(func.sum(Analytics.clicks), 0).desc())
        .limit(10)
    ).all()
    top_posts = [
        TopPost(
            id=post_id,
            title=title,
            platform=platform,
            status=post_status,
            clicks=int(clicks),
            page_title=page_title,
            site_name=site_name,
        )
        for post_id, title, platform, post_status, clicks, page_title, site_name in top_posts_rows
    ]

    return AnalyticsSummary(
        total_clicks=int(total_clicks),
        clicks_last_7_days=int(clicks_last_7_days),
        total_sites=total_sites,
        total_pages=total_pages,
        total_posts=total_posts,
        published_posts=published_posts,
        clicks_by_day=clicks_by_day,
        clicks_by_platform=clicks_by_platform,
        top_posts=top_posts,
    )


@router.get("/export")
def export_analytics(
    format: str = Query(default="csv", pattern="^(csv|pdf)$"),
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    until = date.today()
    since = until - timedelta(days=days - 1)

    rows = db.execute(
        select(
            Post.id,
            Post.title,
            Post.platform,
            Post.status,
            Post.created_at,
            func.coalesce(func.sum(Analytics.clicks), 0),
        )
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .outerjoin(
            Analytics,
            and_(
                Analytics.post_id == Post.id,
                Analytics.metric_date >= since,
                Analytics.metric_date <= until,
            ),
        )
        .where(Site.user_id == current_user.id, Post.deleted_at.is_(None))
        .group_by(Post.id)
        .order_by(func.coalesce(func.sum(Analytics.clicks), 0).desc())
    ).all()

    total_clicks = sum(int(row[5]) for row in rows)

    if format == "pdf":
        content = generate_pdf(rows, since, until, total_clicks)
        media_type = "application/pdf"
        filename = f"analytics_{since}_{until}.pdf"
    else:
        content = generate_csv(rows)
        media_type = "text/csv"
        filename = f"analytics_{since}_{until}.csv"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
