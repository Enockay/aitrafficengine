from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.paystack_config import PaystackConfig

settings = get_settings()


def get_row(db: Session) -> PaystackConfig | None:
    return db.execute(select(PaystackConfig)).scalars().first()


def get_keys(db: Session) -> tuple[str, str] | None:
    """Returns (secret_key, public_key), preferring the DB-stored override, falling
    back to the .env-configured settings so existing deployments keep working without
    needing the admin UI.
    """
    row = get_row(db)
    if row:
        return row.secret_key, row.public_key
    if settings.paystack_secret_key and settings.paystack_public_key:
        return settings.paystack_secret_key, settings.paystack_public_key
    return None


def upsert(db: Session, secret_key: str, public_key: str) -> PaystackConfig:
    row = get_row(db)
    if row:
        row.secret_key = secret_key
        row.public_key = public_key
    else:
        row = PaystackConfig(secret_key=secret_key, public_key=public_key)
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
    # Fixed-width mask (not proportional to key length) — long secret keys mirrored
    # at full length overflowed the admin card's display.
    return f"{'*' * 8}{key[-4:]}"


def get_status(db: Session) -> dict:
    row = get_row(db)
    if row:
        return {
            "configured": True,
            "source": "database",
            "secret_key_preview": mask_key(row.secret_key),
            "public_key": row.public_key,
            "updated_at": row.updated_at,
        }
    if settings.paystack_secret_key and settings.paystack_public_key:
        return {
            "configured": True,
            "source": "environment",
            "secret_key_preview": mask_key(settings.paystack_secret_key),
            "public_key": settings.paystack_public_key,
            "updated_at": None,
        }
    return {"configured": False, "source": "none", "secret_key_preview": None, "public_key": None, "updated_at": None}
