import logging
from pathlib import Path
from tempfile import gettempdir

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.geoip_config import GeoipConfig
from app.services import s3_storage

logger = logging.getLogger(__name__)
settings = get_settings()

# Single well-known key — there's only ever one GeoIP database, same singleton
# convention as PaystackConfig/BrevoConfig.
S3_KEY = "geoip/GeoLite2-City.mmdb"
LOCAL_CACHE_PATH = Path(gettempdir()) / "aitrafficengine-geoip" / "GeoLite2-City.mmdb"
# GeoLite2-City.mmdb is normally 60-80MB; this is a generous ceiling against
# someone uploading the wrong file.
MAX_UPLOAD_BYTES = 250 * 1024 * 1024


class GeoipConfigError(Exception):
    pass


def get_row(db: Session) -> GeoipConfig | None:
    return db.execute(select(GeoipConfig)).scalars().first()


def upload(db: Session, file_bytes: bytes, filename: str) -> GeoipConfig:
    if not filename.lower().endswith(".mmdb"):
        raise GeoipConfigError("File must be a MaxMind .mmdb database (e.g. GeoLite2-City.mmdb).")
    if not file_bytes:
        raise GeoipConfigError("Uploaded file is empty.")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise GeoipConfigError("File is too large to be a valid GeoLite2-City database.")
    if not s3_storage.is_configured():
        raise GeoipConfigError("S3 isn't configured on this deployment — GeoIP storage requires it.")

    s3_storage.upload_geoip_db(file_bytes, S3_KEY)

    LOCAL_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOCAL_CACHE_PATH.write_bytes(file_bytes)

    row = get_row(db)
    if row:
        row.s3_key = S3_KEY
        row.original_filename = filename
        row.size_bytes = len(file_bytes)
    else:
        row = GeoipConfig(s3_key=S3_KEY, original_filename=filename, size_bytes=len(file_bytes))
        db.add(row)
    db.commit()
    db.refresh(row)

    from app.services import geoip

    geoip.reset_cache()
    return row


def delete(db: Session) -> None:
    row = get_row(db)
    if row:
        s3_storage.delete_geoip_db(row.s3_key)
        db.delete(row)
        db.commit()
    LOCAL_CACHE_PATH.unlink(missing_ok=True)

    from app.services import geoip

    geoip.reset_cache()


def ensure_local_copy(row: GeoipConfig) -> Path | None:
    """Downloads the DB from S3 into the local cache if it's not already there —
    needed on every fresh container start, since the cache dir doesn't survive
    redeploys/restarts even though the S3 object and DB row do.
    """
    if LOCAL_CACHE_PATH.exists():
        return LOCAL_CACHE_PATH
    try:
        data = s3_storage.download_geoip_db(row.s3_key)
    except s3_storage.S3UploadError:
        logger.warning("Could not download GeoIP database from S3", exc_info=True)
        return None
    LOCAL_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOCAL_CACHE_PATH.write_bytes(data)
    return LOCAL_CACHE_PATH


def get_status(db: Session) -> dict:
    row = get_row(db)
    if row:
        return {
            "configured": True,
            "source": "database",
            "filename": row.original_filename,
            "size_bytes": row.size_bytes,
            "updated_at": row.updated_at,
        }
    if settings.geoip_db_path:
        return {
            "configured": True,
            "source": "environment",
            "filename": Path(settings.geoip_db_path).name,
            "size_bytes": None,
            "updated_at": None,
        }
    return {"configured": False, "source": "none", "filename": None, "size_bytes": None, "updated_at": None}
