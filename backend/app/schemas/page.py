import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PageCreate(BaseModel):
    site_id: uuid.UUID
    url: str = Field(min_length=1, max_length=2048)


class PageOut(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    url: str
    title: str | None
    meta_description: str | None
    summary: str | None
    content_text: str | None
    hero_image_url: str | None
    key_points: list[str] | None
    keywords: list[str] | None
    status: str
    last_crawled_at: datetime | None
    created_at: datetime
    updated_at: datetime
    posts_count: int

    model_config = {"from_attributes": True}


class PageListResponse(BaseModel):
    items: list[PageOut]
    total: int
    page: int
    limit: int


class PagePostSummary(BaseModel):
    id: uuid.UUID
    platform: str
    status: str
    title: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PagePostListResponse(BaseModel):
    items: list[PagePostSummary]
