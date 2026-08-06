import uuid
from datetime import date

from pydantic import BaseModel


class DailyClicks(BaseModel):
    date: date
    clicks: int


class PlatformClicks(BaseModel):
    platform: str
    clicks: int


class TopPost(BaseModel):
    id: uuid.UUID
    title: str | None
    platform: str
    status: str
    clicks: int
    page_title: str | None
    site_name: str | None


class AnalyticsSummary(BaseModel):
    total_clicks: int
    clicks_last_7_days: int
    total_sites: int
    total_pages: int
    total_posts: int
    published_posts: int
    clicks_by_day: list[DailyClicks]
    clicks_by_platform: list[PlatformClicks]
    top_posts: list[TopPost]
