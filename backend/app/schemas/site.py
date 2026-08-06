import re
import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def normalize_domain(value: str) -> str:
    value = value.strip()
    value = re.sub(r"^https?://", "", value, flags=re.IGNORECASE)
    value = value.split("/")[0]
    return value.lower()


class SiteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    domain: str = Field(min_length=1, max_length=255)
    description: str | None = None
    crawl_frequency: str = "weekly"

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        return normalize_domain(v)


class SiteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    domain: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool | None = None
    crawl_frequency: str | None = None

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, v: str | None) -> str | None:
        return normalize_domain(v) if v else v


class SiteOut(BaseModel):
    id: uuid.UUID
    name: str
    domain: str
    description: str | None
    is_active: bool
    crawl_frequency: str
    pages_count: int
    posts_count: int
    total_clicks: int
    last_crawled_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SiteListResponse(BaseModel):
    items: list[SiteOut]
    total: int
    page: int
    limit: int


class SiteStats(BaseModel):
    total_pages: int
    total_posts: int
    total_clicks: int
    total_impressions: int
    engagement_rate: float


class PageSummary(BaseModel):
    id: uuid.UUID
    url: str
    title: str | None
    status: str
    last_crawled_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PageListResponse(BaseModel):
    items: list[PageSummary]
    total: int
    page: int
    limit: int
