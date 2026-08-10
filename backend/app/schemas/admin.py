import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class AdminUserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    company_name: str | None
    plan_code: str | None
    subscription_status: str | None
    sites_count: int
    posts_count: int
    created_at: datetime


class AdminUserListResponse(BaseModel):
    items: list[AdminUserOut]
    total: int
    page: int
    limit: int


class AdminActivityEntry(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    action: str
    entity_type: str
    entity_id: uuid.UUID
    details: dict | None
    created_at: datetime


class AdminSessionPageVisit(BaseModel):
    path: str
    visited_at: datetime


class AdminSessionOut(BaseModel):
    id: uuid.UUID
    ip_address: str | None
    country: str | None
    city: str | None
    browser: str | None
    os: str | None
    device_type: str | None
    started_at: datetime
    last_seen_at: datetime
    duration_seconds: int
    pages: list[AdminSessionPageVisit]


class AdminUserDetailOut(AdminUserOut):
    trial_ends_at: datetime | None
    current_period_end: datetime | None
    recent_activity: list[AdminActivityEntry]
    recent_sessions: list[AdminSessionOut]


class UpdateUserStatusRequest(BaseModel):
    is_active: bool


class UpdateUserRoleRequest(BaseModel):
    role: str


class UpdateUserPlanRequest(BaseModel):
    plan_code: str
    status: str = "active"
    current_period_end: datetime | None = None


class AdminSiteOut(BaseModel):
    id: uuid.UUID
    name: str
    domain: str
    owner_email: str
    is_active: bool
    pages_count: int
    posts_count: int
    total_clicks: int
    last_crawled_at: datetime | None
    created_at: datetime


class AdminSiteListResponse(BaseModel):
    items: list[AdminSiteOut]
    total: int
    page: int
    limit: int


class AdminScheduleOut(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    post_title: str | None
    platform: str
    owner_email: str
    scheduled_at: datetime
    status: str
    retry_count: int
    last_error: str | None
    published_at: datetime | None


class AdminScheduleListResponse(BaseModel):
    items: list[AdminScheduleOut]
    total: int


class AdminPaymentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    plan_code: str | None
    amount: Decimal
    currency: str
    channel: str | None
    paystack_reference: str
    paid_at: datetime


class AdminPaymentListResponse(BaseModel):
    items: list[AdminPaymentOut]
    total: int
    page: int
    limit: int


class RevenueMonthPoint(BaseModel):
    month: str
    amount: float
    currency: str


class RevenueSummaryOut(BaseModel):
    total_revenue_by_currency: dict[str, float]
    mrr_estimate_usd: float
    monthly_series: list[RevenueMonthPoint]


class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    users_by_plan: dict[str, int]
    mrr_estimate_usd: float
    total_revenue_by_currency: dict[str, float]
    total_sites: int
    total_posts: int
    pending_schedules_count: int
    recent_signups: list[dict]


class AdminActivityLogOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    user_email: str | None
    action: str
    entity_type: str
    entity_id: uuid.UUID
    details: dict | None
    created_at: datetime


class AdminActivityLogListResponse(BaseModel):
    items: list[AdminActivityLogOut]
    total: int
    page: int
    limit: int


class TrafficDayPoint(BaseModel):
    date: str
    sessions: int
    pageviews: int


class TrafficBreakdownEntry(BaseModel):
    label: str
    count: int


class TrafficCrawlEvent(BaseModel):
    id: uuid.UUID
    site_name: str
    site_domain: str
    crawled: int
    discovered: int
    failed: int
    triggered_by: str | None
    created_at: datetime


class AdminTrafficSummaryOut(BaseModel):
    total_sessions: int
    total_pageviews: int
    unique_visitors: int
    total_crawls: int
    sessions_by_day: list[TrafficDayPoint]
    top_countries: list[TrafficBreakdownEntry]
    top_browsers: list[TrafficBreakdownEntry]
    top_devices: list[TrafficBreakdownEntry]
    recent_crawls: list[TrafficCrawlEvent]


class AdminTrafficSessionOut(BaseModel):
    id: uuid.UUID
    user_email: str
    ip_address: str | None
    country: str | None
    city: str | None
    browser: str | None
    os: str | None
    device_type: str | None
    started_at: datetime
    last_seen_at: datetime
    duration_seconds: int
    page_count: int


class AdminTrafficSessionListResponse(BaseModel):
    items: list[AdminTrafficSessionOut]
    total: int
    page: int
    limit: int


class PaystackConfigStatusOut(BaseModel):
    configured: bool
    source: str
    secret_key_preview: str | None
    public_key: str | None
    updated_at: datetime | None


class PaystackConfigIn(BaseModel):
    secret_key: str
    public_key: str


class BrevoConfigStatusOut(BaseModel):
    configured: bool
    source: str
    api_key_preview: str | None
    sender_email: str | None
    sender_name: str | None
    updated_at: datetime | None


class BrevoConfigIn(BaseModel):
    api_key: str
    sender_email: str
    sender_name: str


class GeoipConfigStatusOut(BaseModel):
    configured: bool
    source: str
    filename: str | None
    size_bytes: int | None
    updated_at: datetime | None


class AdminPlanOut(BaseModel):
    code: str
    name: str
    price_usd: int
    max_sites: int
    max_posts_per_month: int
    max_flyers_per_month: int
    schedule_horizon_days: int
    paystack_plan_code: str


class AdminPlanIn(BaseModel):
    code: str
    name: str
    price_usd: int
    max_sites: int
    max_posts_per_month: int
    max_flyers_per_month: int
    schedule_horizon_days: int
    paystack_plan_code: str


class AdminPlanUpdateIn(BaseModel):
    name: str
    price_usd: int
    max_sites: int
    max_posts_per_month: int
    max_flyers_per_month: int
    schedule_horizon_days: int
    paystack_plan_code: str


class AdminTransactionOut(BaseModel):
    id: int
    reference: str
    status: str
    amount: float
    currency: str
    channel: str | None
    customer_email: str | None
    plan_code: str | None
    gateway_response: str | None
    paid_at: str | None
    created_at: str | None


class AdminTransactionListResponse(BaseModel):
    items: list[AdminTransactionOut]
    total: int
    page: int
    per_page: int


class AdminSupportConversationOut(BaseModel):
    user_id: uuid.UUID
    user_email: str
    user_name: str
    last_message: str
    last_message_at: datetime
    last_sender_role: str


class SupportConfigStatusOut(BaseModel):
    configured: bool
    notification_email: str | None
    updated_at: datetime | None


class SupportConfigIn(BaseModel):
    notification_email: str
