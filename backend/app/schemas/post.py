import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    page_id: uuid.UUID
    platform: str = Field(min_length=1, max_length=20)
    title: str | None = Field(default=None, max_length=300)
    body: str
    hashtags: list[str] = Field(default_factory=list)
    tracked_url: str | None = Field(default=None, max_length=2048)


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    body: str | None = None
    hashtags: list[str] | None = None
    tracked_url: str | None = Field(default=None, max_length=2048)


class PostOut(BaseModel):
    id: uuid.UUID
    page_id: uuid.UUID
    platform: str
    content_type: str
    title: str | None
    body: str | None
    hashtags: list[str] | None
    tracked_url: str | None
    status: str
    published_url: str | None
    published_at: datetime | None
    platform_post_id: str | None
    engagement_score: float
    variant_group_id: uuid.UUID | None
    variant_label: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PostListResponse(BaseModel):
    items: list[PostOut]
    total: int
    page: int
    limit: int


class GeneratePostRequest(BaseModel):
    platform: str = "twitter"
    tone: str | None = None


class GenerateVariantsRequest(BaseModel):
    platform: str = "twitter"
    variant_count: int = Field(default=2, ge=2, le=3)


class VariantEntry(BaseModel):
    post: PostOut
    total_clicks: int


class GenerateVariantsResponse(BaseModel):
    variant_group_id: uuid.UUID
    variants: list[VariantEntry]
