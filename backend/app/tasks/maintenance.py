from datetime import datetime, timedelta, timezone

from celery_worker import celery_app
from sqlalchemy import select

from app.database import SessionLocal
from app.models.platform_account import PlatformAccount
from app.services.connectors import get_connector
from app.services.connectors.base import ConnectorAuthError, ConnectorNotConfigured

REFRESH_WINDOW = timedelta(hours=24)


@celery_app.task(name="refresh_expiring_tokens")
def refresh_expiring_tokens():
    """Proactively refreshes platform tokens expiring within REFRESH_WINDOW so
    scheduled publishes don't hit a cold refresh. Purely a backstop — each
    connector's ensure_fresh_token() already refreshes reactively at publish time.
    """
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) + REFRESH_WINDOW
        accounts = db.execute(
            select(PlatformAccount).where(
                PlatformAccount.is_active.is_(True),
                PlatformAccount.refresh_token.isnot(None),
                PlatformAccount.token_expires_at.isnot(None),
                PlatformAccount.token_expires_at <= cutoff,
            )
        ).scalars().all()
        for account in accounts:
            try:
                connector = get_connector(account.platform)
                connector.ensure_fresh_token(db, account)
                db.commit()
            except (ConnectorAuthError, ConnectorNotConfigured):
                db.rollback()
                continue
    finally:
        db.close()
