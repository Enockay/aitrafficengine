import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.platform_credential import PlatformCredential

settings = get_settings()

# Falls back to these env vars if no DB-stored override exists for the platform, so
# existing .env-based deployments keep working without needing the Settings UI.
_ENV_FALLBACK = {
    "twitter": (settings.twitter_client_id, settings.twitter_client_secret),
    "linkedin": (settings.linkedin_client_id, settings.linkedin_client_secret),
    "reddit": (settings.reddit_client_id, settings.reddit_client_secret),
    "tumblr": (settings.tumblr_client_id, settings.tumblr_client_secret),
    "pinterest": (settings.pinterest_client_id, settings.pinterest_client_secret),
}


def get_row(db: Session, platform: str) -> PlatformCredential | None:
    return db.execute(
        select(PlatformCredential).where(PlatformCredential.platform == platform)
    ).scalar_one_or_none()


def get_credentials(db: Session, platform: str) -> tuple[str, str] | None:
    row = get_row(db, platform)
    if row and row.client_id and row.client_secret:
        return row.client_id, row.client_secret

    client_id, client_secret = _ENV_FALLBACK.get(platform, (None, None))
    if client_id and client_secret:
        return client_id, client_secret
    return None


def upsert_credentials(db: Session, platform: str, client_id: str, client_secret: str) -> PlatformCredential:
    row = get_row(db, platform)
    if row:
        row.client_id = client_id
        row.client_secret = client_secret
    else:
        row = PlatformCredential(platform=platform, client_id=client_id, client_secret=client_secret)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_credentials(db: Session, platform: str) -> None:
    row = get_row(db, platform)
    if not row:
        return
    if row.scopes:
        # A scopes override lives on this same row — drop just the id/secret instead
        # of the whole row, or "remove credentials" would silently wipe the override.
        row.client_id = None
        row.client_secret = None
    else:
        db.delete(row)
    db.commit()


def mask_client_id(client_id: str) -> str:
    if len(client_id) <= 4:
        return "*" * len(client_id)
    return f"{'*' * (len(client_id) - 4)}{client_id[-4:]}"


def get_status(db: Session, platform: str) -> dict:
    row = get_row(db, platform)
    if row and row.client_id and row.client_secret:
        return {
            "configured": True,
            "source": "database",
            "client_id_preview": mask_client_id(row.client_id),
            "updated_at": row.updated_at,
        }

    client_id, client_secret = _ENV_FALLBACK.get(platform, (None, None))
    if client_id and client_secret:
        return {
            "configured": True,
            "source": "environment",
            "client_id_preview": mask_client_id(client_id),
            "updated_at": None,
        }

    return {"configured": False, "source": "none", "client_id_preview": None, "updated_at": None}


def parse_scopes(value: str) -> list[str]:
    """Splits an admin-typed scope override on any mix of commas/whitespace, so it
    doesn't matter which delimiter convention they use — each connector re-joins the
    result with whatever separator that platform's OAuth API actually expects.
    """
    return [s for s in re.split(r"[,\s]+", value.strip()) if s]


def get_scopes_override(db: Session, platform: str) -> list[str] | None:
    row = get_row(db, platform)
    if row and row.scopes and row.scopes.strip():
        return parse_scopes(row.scopes)
    return None


def get_effective_scopes(db: Session, platform: str, default: list[str]) -> list[str]:
    return get_scopes_override(db, platform) or default


def upsert_scopes(db: Session, platform: str, scopes: str | None) -> PlatformCredential:
    normalized = scopes.strip() if scopes and scopes.strip() else None
    row = get_row(db, platform)
    if row:
        row.scopes = normalized
    else:
        row = PlatformCredential(platform=platform, scopes=normalized)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row
