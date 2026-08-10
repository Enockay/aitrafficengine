from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class SupportConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Where to email admins when a user's support message goes unanswered.
    Singleton — same convention as PaystackConfig/BrevoConfig.
    """

    __tablename__ = "support_config"

    notification_email: Mapped[str] = mapped_column(String(255), nullable=False)
