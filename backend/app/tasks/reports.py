import logging
from datetime import datetime, timedelta, timezone

from celery_worker import celery_app
from sqlalchemy import or_, select

from app.database import SessionLocal
from app.models.user import User
from app.services.email import EmailSendError, is_configured, send_report_email
from app.services.report_generator import generate_user_report_pdf

REPORT_INTERVAL = timedelta(days=5)
logger = logging.getLogger(__name__)


@celery_app.task(name="send_due_user_reports")
def send_due_user_reports():
    """Sends every user their recurring report exactly REPORT_INTERVAL after their
    last one (per-user rolling, not a fixed calendar day). Runs hourly via beat; the
    `created_at <= cutoff` fallback for never-reported users prevents a brand-new
    signup from getting a report on the very next tick after registering.
    """
    db = SessionLocal()
    try:
        if not is_configured(db):
            return

        now = datetime.now(timezone.utc)
        cutoff = now - REPORT_INTERVAL
        due_users = db.execute(
            select(User).where(
                User.deleted_at.is_(None),
                User.is_active.is_(True),
                or_(
                    User.last_report_sent_at.is_(None) & (User.created_at <= cutoff),
                    User.last_report_sent_at <= cutoff,
                ),
            )
        ).scalars().all()

        for user in due_users:
            since = user.last_report_sent_at or user.created_at
            try:
                pdf_bytes = generate_user_report_pdf(db, user, since, now)
                send_report_email(db, user, pdf_bytes, since.date(), now.date())
                user.last_report_sent_at = now
                db.commit()
            except EmailSendError as exc:
                db.rollback()
                logger.warning("Failed to send report to user %s: %s", user.id, exc)
    finally:
        db.close()
