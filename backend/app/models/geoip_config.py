from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class GeoipConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Tracks the admin-uploaded MaxMind GeoLite2-City database, admin-editable at
    runtime. Singleton — see PaystackConfig for the same convention.

    The .mmdb binary itself lives in S3 (too large for a DB column); this row just
    points at it so any backend instance can fetch and cache it locally.
    """

    __tablename__ = "geoip_config"

    s3_key: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
