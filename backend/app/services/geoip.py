from functools import lru_cache
from pathlib import Path

import geoip2.database
from geoip2.errors import AddressNotFoundError

from app.config import get_settings

settings = get_settings()


@lru_cache(maxsize=1)
def _reader() -> "geoip2.database.Reader | None":
    if not settings.geoip_db_path:
        return None
    path = Path(settings.geoip_db_path)
    if not path.exists():
        return None
    return geoip2.database.Reader(str(path))


def lookup(ip: str | None) -> tuple[str | None, str | None]:
    """Returns (country, city) for an IP, or (None, None) if unknown/unresolvable.

    Never raises. GEOIP_DB_PATH isn't set by default (no free-to-redistribute MaxMind
    database ships with this repo — see config.py) so this is a no-op until an operator
    points it at a real GeoLite2-City.mmdb file; location just stays blank until then.
    """
    if not ip:
        return None, None
    reader = _reader()
    if reader is None:
        return None, None
    try:
        result = reader.city(ip)
    except (AddressNotFoundError, ValueError, OSError):
        return None, None
    return result.country.name, result.city.name
