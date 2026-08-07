from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.analytics import Analytics
from app.models.page import Page
from app.models.post import Post
from app.models.site import Site
from app.schemas.site import SiteOut


def to_site_out(db: Session, site: Site) -> SiteOut:
    """Shapes a Site row into its API representation, computing derived counts.

    Shared by the per-user sites router and the admin all-sites view, so the two
    stay in sync rather than drifting into two slightly different implementations.
    """
    pages_count = db.execute(
        select(func.count(Page.id)).where(Page.site_id == site.id, Page.deleted_at.is_(None))
    ).scalar_one()
    posts_count = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .where(Page.site_id == site.id, Post.deleted_at.is_(None))
    ).scalar_one()
    total_clicks = db.execute(
        select(func.coalesce(func.sum(Analytics.clicks), 0))
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .where(Page.site_id == site.id)
    ).scalar_one()
    last_crawled_at = db.execute(
        select(func.max(Page.last_crawled_at)).where(Page.site_id == site.id, Page.deleted_at.is_(None))
    ).scalar_one()
    # Represents the site with whatever og:image the crawler last pulled off its most
    # recently crawled page — same extraction as Page.hero_image_url (see crawler.py).
    image_url = db.execute(
        select(Page.hero_image_url)
        .where(Page.site_id == site.id, Page.deleted_at.is_(None), Page.hero_image_url.isnot(None))
        .order_by(Page.last_crawled_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    return SiteOut(
        id=site.id,
        name=site.name,
        domain=site.domain,
        description=site.description,
        is_active=site.is_active,
        crawl_frequency=site.crawl_frequency,
        image_url=image_url,
        pages_count=pages_count,
        posts_count=posts_count,
        total_clicks=int(total_clicks),
        last_crawled_at=last_crawled_at,
        created_at=site.created_at,
        updated_at=site.updated_at,
    )
