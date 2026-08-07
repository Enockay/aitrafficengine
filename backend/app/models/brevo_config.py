from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.utils.encrypted_type import EncryptedString


class BrevoConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Deployment-wide Brevo (transactional email) credentials, admin-editable at
    runtime. Singleton — see PaystackConfig for the same convention.
    """

    __tablename__ = "brevo_config"

    api_key: Mapped[str] = mapped_column(EncryptedString, nullable=False)
    sender_email: Mapped[str] = mapped_column(String(255), nullable=False)
    sender_name: Mapped[str] = mapped_column(String(255), nullable=False)
