import uuid
from datetime import datetime

from pydantic import BaseModel


class ScheduleCreate(BaseModel):
    platform_account_id: uuid.UUID
    scheduled_at: datetime
    timezone: str = "UTC"


class ScheduleReschedule(BaseModel):
    scheduled_at: datetime
    timezone: str = "UTC"
    platform_account_id: uuid.UUID | None = None


class ScheduleOut(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    post_title: str | None
    platform: str
    platform_account_id: uuid.UUID
    platform_account_label: str | None
    scheduled_at: datetime
    timezone: str
    status: str
    retry_count: int
    last_error: str | None
    published_at: datetime | None
    created_at: datetime


class ScheduleListResponse(BaseModel):
    items: list[ScheduleOut]
    total: int
