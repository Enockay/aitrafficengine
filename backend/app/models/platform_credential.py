from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PlatformCredential(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Deployment-wide OAuth client credentials for a platform, editable from Settings.

    One row per platform (twitter/linkedin/reddit) — these are the app-level client
    id/secret registered with each platform, shared by every user of this deployment.
    Individual users' connected accounts are separate (see PlatformAccount).
    """

    __tablename__ = "platform_credentials"

    platform: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    client_id: Mapped[str] = mapped_column(String(255), nullable=False)
    client_secret: Mapped[str] = mapped_column(String(500), nullable=False)
