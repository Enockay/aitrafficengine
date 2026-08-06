import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("uq_users_email_active", "email", unique=True, postgresql_where=text("deleted_at IS NULL")),
        Index("ix_users_referral_code", "referral_code", unique=True),
        Index("ix_users_email_verification_token", "email_verification_token", unique=True),
        Index("ix_users_password_reset_token", "password_reset_token", unique=True),
    )

    email: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", server_default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_country_code: Mapped[str | None] = mapped_column(String(8), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", server_default="UTC")

    referral_code: Mapped[str] = mapped_column(String(12), nullable=False)
    referred_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    # Python-level default=False so every real registration starts unverified, but the
    # column's server_default is "true" — that's intentional, not a typo: it means the
    # migration that adds this column doesn't retroactively lock out already-existing
    # users. New rows always pass is_email_verified explicitly in register_user().
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="true")
    email_verification_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    email_verification_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    password_reset_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    password_reset_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    sites: Mapped[list["Site"]] = relationship(back_populates="user")
    platform_accounts: Mapped[list["PlatformAccount"]] = relationship(back_populates="user")
    activity_logs: Mapped[list["ActivityLog"]] = relationship(back_populates="user")
