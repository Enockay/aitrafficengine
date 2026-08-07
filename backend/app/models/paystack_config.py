from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.utils.encrypted_type import EncryptedString


class PaystackConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Deployment-wide Paystack API credentials, admin-editable at runtime.

    Singleton — there is only ever one row, enforced at the service layer
    (services/paystack_config.py), same convention as PlatformCredential per-platform.
    """

    __tablename__ = "paystack_config"

    secret_key: Mapped[str] = mapped_column(EncryptedString, nullable=False)
    public_key: Mapped[str] = mapped_column(String(255), nullable=False)
