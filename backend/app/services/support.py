import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.support_message import SupportMessage
from app.models.user import User
from app.redis_client import get_redis
from app.services.email import EmailSendError, send_support_reply_email
from app.services.events import publish_event, publish_support_admin_event

logger = logging.getLogger(__name__)

# How long a user's message can sit unanswered before we alert the admin by email.
UNANSWERED_THRESHOLD_SECONDS = 300
PRESENCE_KEY_TTL_SECONDS = 300


def presence_key(user_id: uuid.UUID | str) -> str:
    return f"support:online:{user_id}"


def is_user_online(user_id: uuid.UUID) -> bool:
    return get_redis().exists(presence_key(user_id)) > 0


def list_thread(db: Session, user_id: uuid.UUID) -> list[SupportMessage]:
    return list(
        db.execute(
            select(SupportMessage).where(SupportMessage.user_id == user_id).order_by(SupportMessage.created_at)
        ).scalars()
    )


def list_admin_inbox(db: Session) -> list[dict]:
    """One row per user with an open thread, latest message first. Uses Postgres's
    DISTINCT ON to grab each user's most recent message without a separate
    conversation-aggregate table — see SupportMessage's docstring for why there
    isn't one.
    """
    stmt = (
        select(SupportMessage, User.email, User.full_name)
        .join(User, User.id == SupportMessage.user_id)
        .distinct(SupportMessage.user_id)
        .order_by(SupportMessage.user_id, SupportMessage.created_at.desc())
    )
    rows = db.execute(stmt).all()
    inbox = [
        {
            "user_id": message.user_id,
            "user_email": email,
            "user_name": full_name,
            "last_message": message.body,
            "last_message_at": message.created_at,
            "last_sender_role": message.sender_role,
        }
        for message, email, full_name in rows
    ]
    inbox.sort(key=lambda row: row["last_message_at"], reverse=True)
    return inbox


def send_user_message(db: Session, user: User, body: str) -> SupportMessage:
    message = SupportMessage(user_id=user.id, sender_id=user.id, sender_role="user", body=body)
    db.add(message)
    db.commit()
    db.refresh(message)

    publish_support_admin_event(
        "support_message",
        {
            "user_id": str(user.id),
            "user_email": user.email,
            "message_id": str(message.id),
            "body": body,
            "created_at": message.created_at.isoformat(),
        },
    )

    # Delayed import: app.tasks.support imports back from this module to re-run the
    # "still unanswered?" check, so importing it at module load time would cycle.
    from app.tasks.support import check_unanswered_support_message

    check_unanswered_support_message.apply_async(
        args=[str(message.id)], countdown=UNANSWERED_THRESHOLD_SECONDS
    )
    return message


def send_admin_reply(db: Session, admin: User, user_id: uuid.UUID, body: str) -> SupportMessage:
    message = SupportMessage(user_id=user_id, sender_id=admin.id, sender_role="admin", body=body)
    db.add(message)
    db.commit()
    db.refresh(message)

    publish_event(
        user_id,
        "support_message",
        {"user_id": str(user_id), "message_id": str(message.id), "body": body, "created_at": message.created_at.isoformat()},
    )

    if not is_user_online(user_id):
        target_user = db.get(User, user_id)
        if target_user:
            try:
                send_support_reply_email(db, target_user, body, message.created_at)
            except EmailSendError as exc:
                logger.warning("Failed to send support-reply email to user %s: %s", user_id, exc)

    return message
