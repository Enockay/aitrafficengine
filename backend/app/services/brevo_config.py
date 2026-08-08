from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.brevo_config import BrevoConfig

settings = get_settings()


def get_row(db: Session) -> BrevoConfig | None:
    return db.execute(select(BrevoConfig)).scalars().first()


def get_config(db: Session) -> tuple[str, str, str] | None:
    """Returns (api_key, sender_email, sender_name), preferring the DB-stored
    override, falling back to .env-configured settings.
    """
    row = get_row(db)
    if row:
        return row.api_key, row.sender_email, row.sender_name
    if settings.brevo_api_key:
        return settings.brevo_api_key, settings.brevo_sender_email, settings.brevo_sender_name
    return None


def upsert(db: Session, api_key: str, sender_email: str, sender_name: str) -> BrevoConfig:
    row = get_row(db)
    if row:
        row.api_key = api_key
        row.sender_email = sender_email
        row.sender_name = sender_name
    else:
        row = BrevoConfig(api_key=api_key, sender_email=sender_email, sender_name=sender_name)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete(db: Session) -> None:
    row = get_row(db)
    if row:
        db.delete(row)
        db.commit()


def mask_key(key: str) -> str:
    if len(key) <= 4:
        return "*" * len(key)
    # Fixed-width mask (not proportional to key length) — Brevo keys run ~80 chars,
    # and mirroring the full length here overflowed the admin card's display.
    return f"{'*' * 8}{key[-4:]}"


def get_status(db: Session) -> dict:
    row = get_row(db)
    if row:
        return {
            "configured": True,
            "source": "database",
            "api_key_preview": mask_key(row.api_key),
            "sender_email": row.sender_email,
            "sender_name": row.sender_name,
            "updated_at": row.updated_at,
        }
    if settings.brevo_api_key:
        return {
            "configured": True,
            "source": "environment",
            "api_key_preview": mask_key(settings.brevo_api_key),
            "sender_email": settings.brevo_sender_email,
            "sender_name": settings.brevo_sender_name,
            "updated_at": None,
        }
    return {
        "configured": False,
        "source": "none",
        "api_key_preview": None,
        "sender_email": None,
        "sender_name": None,
        "updated_at": None,
    }
