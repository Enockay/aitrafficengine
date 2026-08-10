from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog
from app.models.page_visit import PageVisit
from app.models.site import Site
from app.models.user import User
from app.models.user_session import UserSession

TRAFFIC_WINDOW_DAYS = 30
BREAKDOWN_TOP_N = 5
RECENT_CRAWLS_LIMIT = 15


def _bucket_top_n(rows: list[tuple[str | None, int]], top_n: int) -> list[dict]:
    """Groups (label, count) rows into the top N plus an 'Other' bucket. A null label
    (e.g. GeoIP unresolved) becomes its own explicit 'Unknown' bucket rather than being
    silently dropped or merged into 'Other'."""
    named = [(label or "Unknown", count) for label, count in rows]
    named.sort(key=lambda r: r[1], reverse=True)
    top = named[:top_n]
    rest_total = sum(count for _, count in named[top_n:])
    result = [{"label": label, "count": count} for label, count in top]
    if rest_total > 0:
        result.append({"label": "Other", "count": rest_total})
    return result


def get_traffic_summary(db: Session) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=TRAFFIC_WINDOW_DAYS)
    series_since = date.today() - timedelta(days=TRAFFIC_WINDOW_DAYS - 1)

    total_sessions = db.execute(
        select(func.count(UserSession.id)).where(UserSession.started_at >= since)
    ).scalar_one()
    total_pageviews = db.execute(
        select(func.count(PageVisit.id)).where(PageVisit.visited_at >= since)
    ).scalar_one()
    unique_visitors = db.execute(
        select(func.count(func.distinct(UserSession.user_id))).where(UserSession.started_at >= since)
    ).scalar_one()
    total_crawls = db.execute(
        select(func.count(ActivityLog.id)).where(ActivityLog.action == "crawl", ActivityLog.created_at >= since)
    ).scalar_one()

    session_day_rows = db.execute(
        select(func.date(UserSession.started_at), func.count(UserSession.id))
        .where(UserSession.started_at >= since)
        .group_by(func.date(UserSession.started_at))
    ).all()
    pageview_day_rows = db.execute(
        select(func.date(PageVisit.visited_at), func.count(PageVisit.id))
        .where(PageVisit.visited_at >= since)
        .group_by(func.date(PageVisit.visited_at))
    ).all()
    sessions_by_date = dict(session_day_rows)
    pageviews_by_date = dict(pageview_day_rows)
    sessions_by_day = [
        {
            "date": d.isoformat(),
            "sessions": sessions_by_date.get(d, 0),
            "pageviews": pageviews_by_date.get(d, 0),
        }
        for d in (series_since + timedelta(days=i) for i in range(TRAFFIC_WINDOW_DAYS))
    ]

    country_rows = db.execute(
        select(UserSession.country, func.count(UserSession.id))
        .where(UserSession.started_at >= since)
        .group_by(UserSession.country)
    ).all()
    browser_rows = db.execute(
        select(UserSession.browser, func.count(UserSession.id))
        .where(UserSession.started_at >= since)
        .group_by(UserSession.browser)
    ).all()
    device_rows = db.execute(
        select(UserSession.device_type, func.count(UserSession.id))
        .where(UserSession.started_at >= since)
        .group_by(UserSession.device_type)
    ).all()

    # Crawl events aren't in UserSession/PageVisit at all — they're the AI Traffic
    # Engine's own crawler hitting a *customer's* site, logged separately via the
    # existing activity log (action="crawl") rather than the visitor-session tracker,
    # which only covers humans logged into this app.
    crawl_rows = db.execute(
        select(ActivityLog, Site, User)
        .join(Site, Site.id == ActivityLog.entity_id)
        .outerjoin(User, User.id == ActivityLog.user_id)
        .where(ActivityLog.action == "crawl", ActivityLog.entity_type == "site")
        .order_by(ActivityLog.created_at.desc())
        .limit(RECENT_CRAWLS_LIMIT)
    ).all()
    recent_crawls = [
        {
            "id": log.id,
            "site_name": site.name,
            "site_domain": site.domain,
            "crawled": (log.details or {}).get("crawled", 0),
            "discovered": (log.details or {}).get("discovered", 0),
            "failed": (log.details or {}).get("failed", 0),
            "triggered_by": user.email if user else None,
            "created_at": log.created_at,
        }
        for log, site, user in crawl_rows
    ]

    return {
        "total_sessions": total_sessions,
        "total_pageviews": total_pageviews,
        "unique_visitors": unique_visitors,
        "total_crawls": total_crawls,
        "sessions_by_day": sessions_by_day,
        "top_countries": _bucket_top_n(country_rows, BREAKDOWN_TOP_N),
        "top_browsers": _bucket_top_n(browser_rows, BREAKDOWN_TOP_N),
        "top_devices": _bucket_top_n(device_rows, BREAKDOWN_TOP_N),
        "recent_crawls": recent_crawls,
    }


def list_traffic_sessions(db: Session, *, page: int, limit: int, search: str | None) -> dict:
    page_count_subq = (
        select(func.count(PageVisit.id)).where(PageVisit.session_id == UserSession.id).scalar_subquery()
    )
    query = (
        select(UserSession, User.email, page_count_subq.label("page_count"))
        .join(User, User.id == UserSession.user_id)
    )
    if search:
        query = query.where(User.email.ilike(f"%{search}%"))

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(UserSession.started_at.desc()).offset((page - 1) * limit).limit(limit)
    ).all()

    items = [
        {
            "id": session.id,
            "user_email": email,
            "ip_address": session.ip_address,
            "country": session.country,
            "city": session.city,
            "browser": session.browser,
            "os": session.os,
            "device_type": session.device_type,
            "started_at": session.started_at,
            "last_seen_at": session.last_seen_at,
            "duration_seconds": int((session.last_seen_at - session.started_at).total_seconds()),
            "page_count": page_count,
        }
        for session, email, page_count in rows
    ]
    return {"items": items, "total": total, "page": page, "limit": limit}
