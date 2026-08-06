import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Flyer(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "flyers"

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pages.id"), nullable=False, index=True
    )
    template_name: Mapped[str] = mapped_column(String(50), nullable=False)
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    headline: Mapped[str | None] = mapped_column(String(200), nullable=True)
    subheadline: Mapped[str | None] = mapped_column(String(300), nullable=True)
    cta_text: Mapped[str] = mapped_column(String(100), default="Read More", server_default="Read More")
    status: Mapped[str] = mapped_column(String(20), default="generated", server_default="generated")

    page: Mapped["Page"] = relationship(back_populates="flyers")
    schedules: Mapped[list["Schedule"]] = relationship(back_populates="flyer")
