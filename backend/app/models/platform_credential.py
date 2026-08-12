from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PlatformCredential(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Deployment-wide OAuth client credentials for a platform, editable from Settings.

    One row per platform (twitter/linkedin/reddit) — these are the app-level client
    id/secret registered with each platform, shared by every user of this deployment.
    Individual users' connected accounts are separate (see PlatformAccount).

    client_id/client_secret are nullable so a row can exist purely to override
    `scopes` for a platform whose id/secret still come from env vars (see
    services/platform_credentials.py's env fallback) — the two concerns are edited
    independently in the admin UI.
    """

    __tablename__ = "platform_credentials"

    platform: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    client_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_secret: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Space/comma-separated OAuth scope override, in whatever form the admin typed it —
    # parsed by services/platform_credentials.parse_scopes() at read time. Null/empty
    # means "use the connector's built-in default list".
    scopes: Mapped[str | None] = mapped_column(Text, nullable=True)
