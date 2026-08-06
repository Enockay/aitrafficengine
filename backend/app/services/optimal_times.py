import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.analytics import Analytics
from app.models.page import Page
from app.models.post import Post
from app.models.site import Site
from app.schemas.optimal_time import OptimalTimeSlot, OptimalTimesResponse

MIN_SAMPLE_SIZE = 3
MAX_SUGGESTIONS = 5

# weekday: 0=Sunday..6=Saturday (Postgres EXTRACT(dow), matches JS Date.getDay()).
# Generic platform best-practice defaults, used until a platform has enough publish
# history to derive real suggestions. Interpreted as browser-local time on the
# frontend — not matched to actual audience timezone, a known simplification.
FALLBACK_SLOTS: dict[str, list[tuple[int, int]]] = {
    "twitter": [(2, 9), (3, 12), (4, 9), (2, 15), (3, 8)],
    "linkedin": [(2, 10), (3, 9), (4, 10), (2, 8), (3, 12)],
    # Reddit's per-subreddit rate limits/rules are a publish-time concern handled by
    # the connector layer, not a timing-suggestion concern — no special-casing needed here.
    "reddit": [(1, 7), (5, 11), (6, 9), (1, 17), (3, 7)],
}


def _fallback_response(platform: str, sample_size: int) -> OptimalTimesResponse:
    return OptimalTimesResponse(
        platform=platform,
        slots=[
            OptimalTimeSlot(weekday=weekday, hour=hour, score=0, post_count=0, source="fallback")
            for weekday, hour in FALLBACK_SLOTS[platform]
        ],
        sample_size=sample_size,
    )


def get_optimal_times(db: Session, user_id: uuid.UUID, platform: str) -> OptimalTimesResponse:
    if platform not in FALLBACK_SLOTS:
        raise ValueError(f"Unsupported platform: {platform}")

    published_count = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(
            Site.user_id == user_id,
            Post.platform == platform,
            Post.status == "published",
            Post.published_at.isnot(None),
            Post.deleted_at.is_(None),
        )
    ).scalar_one()

    if published_count < MIN_SAMPLE_SIZE:
        return _fallback_response(platform, published_count)

    weekday = func.extract("dow", Post.published_at)
    hour = func.extract("hour", Post.published_at)
    clicks = func.coalesce(func.sum(Analytics.clicks), 0)

    rows = db.execute(
        select(weekday, hour, clicks, func.count(func.distinct(Post.id)))
        .select_from(Post)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .outerjoin(Analytics, Analytics.post_id == Post.id)
        .where(
            Site.user_id == user_id,
            Post.platform == platform,
            Post.status == "published",
            Post.published_at.isnot(None),
            Post.deleted_at.is_(None),
        )
        .group_by(weekday, hour)
    ).all()

    scored = [
        (int(w), int(h), (total_clicks / count) if count else 0.0, count)
        for w, h, total_clicks, count in rows
    ]
    scored.sort(key=lambda s: (-s[2], -s[3], s[0], s[1]))

    slots = [
        OptimalTimeSlot(weekday=w, hour=h, score=round(score, 2), post_count=count, source="data")
        for w, h, score, count in scored[:MAX_SUGGESTIONS]
    ]

    if len(slots) < MAX_SUGGESTIONS:
        used = {(s.weekday, s.hour) for s in slots}
        for weekday_fb, hour_fb in FALLBACK_SLOTS[platform]:
            if len(slots) >= MAX_SUGGESTIONS:
                break
            if (weekday_fb, hour_fb) in used:
                continue
            slots.append(
                OptimalTimeSlot(weekday=weekday_fb, hour=hour_fb, score=0, post_count=0, source="fallback")
            )

    return OptimalTimesResponse(platform=platform, slots=slots, sample_size=published_count)
