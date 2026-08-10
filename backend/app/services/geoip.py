from pathlib import Path

import geoip2.database
from geoip2.errors import AddressNotFoundError
from sqlalchemy.orm import Session

from app.config import get_settings

settings = get_settings()

_cached_reader: "geoip2.database.Reader | None" = None
_cached_path: str | None = None


def reset_cache() -> None:
    """Called after an admin uploads or removes the GeoIP database, so the next
    lookup picks up the change instead of serving a stale/closed reader."""
    global _cached_reader, _cached_path
    if _cached_reader is not None:
        _cached_reader.close()
    _cached_reader = None
    _cached_path = None


def _resolve_path(db: Session) -> Path | None:
    from app.services import geoip_config

    row = geoip_config.get_row(db)
    if row:
        path = geoip_config.ensure_local_copy(row)
        if path:
            return path
    if settings.geoip_db_path:
        path = Path(settings.geoip_db_path)
        if path.exists():
            return path
    return None


def _get_reader(db: Session) -> "geoip2.database.Reader | None":
    global _cached_reader, _cached_path
    path = _resolve_path(db)
    if path is None:
        return None
    if str(path) != _cached_path:
        if _cached_reader is not None:
            _cached_reader.close()
        _cached_reader = geoip2.database.Reader(str(path))
        _cached_path = str(path)
    return _cached_reader


def lookup(db: Session, ip: str | None) -> tuple[str | None, str | None]:
    """Returns (country, city) for an IP, or (None, None) if unknown/unresolvable.

    Never raises. Needs a GeoLite2-City database either uploaded via Admin >
    Integrations or pointed at by GEOIP_DB_PATH — location just stays blank until
    one of those is configured.
    """
    if not ip:
        return None, None
    reader = _get_reader(db)
    if reader is None:
        return None, None
    try:
        result = reader.city(ip)
    except (AddressNotFoundError, ValueError, OSError):
        return None, None
    return result.country.name, result.city.name
