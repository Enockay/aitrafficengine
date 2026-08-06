import uuid
from datetime import datetime

from pydantic import BaseModel


class TrendFetchLogOut(BaseModel):
    id: uuid.UUID
    requested_at: datetime
    woeid: int
    success: bool
    status_code: int | None
    error_detail: str | None
    raw_response: dict | None
    trend_count: int

    model_config = {"from_attributes": True}


class TrendFetchLogListResponse(BaseModel):
    items: list[TrendFetchLogOut]
    total: int
    page: int
    limit: int


class TrendOut(BaseModel):
    id: uuid.UUID
    name: str
    tweet_volume: int | None
    woeid: int
    fetched_at: datetime
    times_used: int

    model_config = {"from_attributes": True}


class TrendListResponse(BaseModel):
    items: list[TrendOut]
    total: int
    page: int
    limit: int
