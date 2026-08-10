import logging

from celery_worker import celery_app
from sqlalchemy import select

from app.database import SessionLocal
from app.models.support_message import SupportMessage
from app.models.user import User
from app.services import support_config
from app.services.email import EmailSendError, is_configured, send_support_alert_email

logger = logging.getLogger(__name__)


@celery_app.task(name="check_unanswered_support_message")
def check_unanswered_support_message(message_id: str) -> None:
    """Fired once, UNANSWERED_THRESHOLD_SECONDS after a user's support message is
    created (see services/support.py's send_user_message). If no admin has replied
    in that thread since, email whoever's configured in Admin > Integrations.
    """
    db = SessionLocal()
    try:
        message = db.get(SupportMessage, message_id)
        if message is None:
            return

        already_answered = db.execute(
            select(SupportMessage.id).where(
                SupportMessage.user_id == message.user_id,
                SupportMessage.sender_role == "admin",
                SupportMessage.created_at > message.created_at,
            ).limit(1)
        ).first()
        if already_answered:
            return

        notification_email = support_config.get_notification_email(db)
        if not notification_email or not is_configured(db):
            return

        user = db.get(User, message.user_id)
        if user is None:
            return

        try:
            send_support_alert_email(db, notification_email, user.email, message.body, message.created_at)
        except EmailSendError as exc:
            logger.warning("Failed to send support alert email: %s", exc)
    finally:
        db.close()
