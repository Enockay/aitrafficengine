import uuid
from datetime import date, datetime

from pydantic import BaseModel


class MetricCard(BaseModel):
    value: int
    delta_pct: float | None
    sparkline: list[int]


class TrafficDay(BaseModel):
    date: date
    twitter: int
    linkedin: int
    reddit: int


class DashboardTopPost(BaseModel):
    id: uuid.UUID
    title: str | None
    platform: str
    status: str
    clicks: int


class PlatformHealth(BaseModel):
    platform: str
    connected: bool
    account_handle: str | None
    last_publish_at: datetime | None
    rate_limit_remaining: int | None
    rate_limit_reset_at: datetime | None


class ActivityEvent(BaseModel):
    type: str
    description: str
    timestamp: datetime


class DashboardOverview(BaseModel):
    total_posts: MetricCard
    total_clicks: MetricCard
    active_schedules: MetricCard
    connected_platforms: MetricCard
    traffic_by_day: list[TrafficDay]
    top_posts: list[DashboardTopPost]
    platform_health: list[PlatformHealth]
    recent_activity: list[ActivityEvent]
