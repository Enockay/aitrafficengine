from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.support_config import SupportConfig


def get_row(db: Session) -> SupportConfig | None:
    return db.execute(select(SupportConfig)).scalars().first()


def get_notification_email(db: Session) -> str | None:
    row = get_row(db)
    return row.notification_email if row else None


def upsert(db: Session, notification_email: str) -> SupportConfig:
    row = get_row(db)
    if row:
        row.notification_email = notification_email
    else:
        row = SupportConfig(notification_email=notification_email)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete(db: Session) -> None:
    row = get_row(db)
    if row:
        db.delete(row)
        db.commit()


def get_status(db: Session) -> dict:
    row = get_row(db)
    if row:
        return {"configured": True, "notification_email": row.notification_email, "updated_at": row.updated_at}
    return {"configured": False, "notification_email": None, "updated_at": None}
