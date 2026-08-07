from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PlatformSetting(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Admin-controlled on/off switch for a platform, independent of whether OAuth
    credentials are configured — lets an admin hide a platform from every tenant
    (e.g. mid-rollout, or after abuse) without touching its credentials.

    A missing row means enabled (opt-out model): this table only gets a row once an
    admin has actually flipped a platform off.
    """

    __tablename__ = "platform_settings"

    platform: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
