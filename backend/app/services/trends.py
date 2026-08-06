from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.platform_account import PlatformAccount
from app.models.trend import Trend, TrendFetchLog
from app.services.connectors.base import ConnectorAuthError, ConnectorNotConfigured
from app.services.connectors.twitter import TwitterConnector

TRENDS_URL = "https://api.twitter.com/2/trends/by/woeid/{woeid}"
DEFAULT_WOEID = 1  # worldwide

# A trend may be referenced in at most this many generated posts before it's excluded
# from future generation candidates — keeps trend-tagging from looking spammy/repetitive.
MAX_USES_PER_TREND = 2


def _log_failure(db: Session, woeid: int, status_code: int | None, error_detail: str) -> TrendFetchLog:
    log = TrendFetchLog(
        requested_at=datetime.now(timezone.utc),
        woeid=woeid,
        success=False,
        status_code=status_code,
        error_detail=error_detail,
        raw_response=None,
        trend_count=0,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def fetch_trending_topics(db: Session, woeid: int = DEFAULT_WOEID) -> TrendFetchLog:
    """Calls X's trends endpoint, upserts results into `trends`, and always writes one
    TrendFetchLog row (success or failure) — the single source of truth for both the
    scheduled Celery task and the manual admin "Fetch now" trigger.
    """
    account = db.execute(
        select(PlatformAccount).where(
            PlatformAccount.platform == "twitter", PlatformAccount.is_active.is_(True)
        )
    ).scalars().first()
    if not account:
        return _log_failure(db, woeid, None, "No connected X/Twitter account to authenticate the request with.")

    connector = TwitterConnector()
    try:
        access_token = connector.ensure_fresh_token(db, account)
    except (ConnectorAuthError, ConnectorNotConfigured) as exc:
        return _log_failure(db, woeid, None, str(exc))

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(
                TRENDS_URL.format(woeid=woeid), headers={"Authorization": f"Bearer {access_token}"}
            )
    except httpx.HTTPError as exc:
        return _log_failure(db, woeid, None, f"Request failed: {exc}")

    if resp.status_code >= 400:
        try:
            detail = resp.json().get("detail", resp.text)
        except ValueError:
            detail = resp.text
        return _log_failure(db, woeid, resp.status_code, detail)

    payload = resp.json()
    entries = payload.get("data", [])
    fetched_at = datetime.now(timezone.utc)

    for entry in entries:
        # X's v2 trends response uses trend_name/tweet_count; tolerate the older
        # v1.1-style name/tweet_volume keys too in case the shape ever varies.
        name = entry.get("trend_name") or entry.get("name")
        if not name:
            continue
        volume = entry.get("tweet_count", entry.get("tweet_volume"))

        existing = db.execute(select(Trend).where(Trend.name == name)).scalar_one_or_none()
        if existing:
            existing.tweet_volume = volume
            existing.fetched_at = fetched_at
            existing.woeid = woeid
        else:
            db.add(Trend(name=name, tweet_volume=volume, woeid=woeid, fetched_at=fetched_at))

    log = TrendFetchLog(
        requested_at=fetched_at,
        woeid=woeid,
        success=True,
        status_code=resp.status_code,
        error_detail=None,
        raw_response=payload,
        trend_count=len(entries),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_available_trends(db: Session, limit: int = 15) -> list[Trend]:
    return list(
        db.execute(
            select(Trend)
            .where(Trend.times_used < MAX_USES_PER_TREND)
            .order_by(Trend.fetched_at.desc())
            .limit(limit)
        ).scalars()
    )


def record_trend_used(db: Session, name: str) -> None:
    trend = db.execute(select(Trend).where(Trend.name == name)).scalar_one_or_none()
    if trend:
        trend.times_used += 1
        db.commit()
