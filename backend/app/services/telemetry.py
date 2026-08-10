import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.page_visit import PageVisit
from app.models.user import User
from app.models.user_session import UserSession
from app.services.geoip import lookup as geo_lookup
from app.services.user_agent import parse_client

# How long a session stays "current" between pageviews before a new one starts —
# also what "time spent on site" is bounded by, since we only ever know a visitor was
# active as of their last recorded pageview, not when they actually left.
SESSION_IDLE_TIMEOUT = timedelta(minutes=30)


def record_pageview(
    db: Session,
    *,
    user: User,
    ip_address: str | None,
    user_agent: str | None,
    path: str,
    session_id: uuid.UUID | None,
) -> UserSession:
    """Finds-or-creates the active session for this user and logs a page visit on it.

    Geolocation and user-agent parsing only run once, at session creation — not on
    every single pageview — since they're the same for the whole session anyway.
    """
    now = datetime.now(timezone.utc)
    session: UserSession | None = None

    if session_id:
        session = db.get(UserSession, session_id)
        if session and (session.user_id != user.id or now - session.last_seen_at > SESSION_IDLE_TIMEOUT):
            session = None

    if session is None:
        country, city = geo_lookup(ip_address)
        browser, os_name, device_type = parse_client(user_agent)
        session = UserSession(
            user_id=user.id,
            ip_address=ip_address,
            country=country,
            city=city,
            browser=browser,
            os=os_name,
            device_type=device_type,
            user_agent=user_agent[:500] if user_agent else None,
            started_at=now,
            last_seen_at=now,
        )
        db.add(session)
        db.flush()
    else:
        session.last_seen_at = now

    db.add(PageVisit(session_id=session.id, path=path[:255], visited_at=now))
    db.commit()
    db.refresh(session)
    return session
