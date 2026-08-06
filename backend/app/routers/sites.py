import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.analytics import Analytics
from app.models.page import Page
from app.models.post import Post
from app.models.site import Site
from app.models.user import User
from app.schemas.site import (
    PageListResponse,
    PageSummary,
    SiteCreate,
    SiteListResponse,
    SiteOut,
    SiteStats,
    SiteUpdate,
)
from app.services.activity_log import log_activity
from app.services.crawler import CrawlError, apply_crawl_result, crawl_page as run_crawl, discover_site_urls
from app.services.quotas import QuotaExceededError, check_can_add_site

router = APIRouter(prefix="/sites", tags=["sites"])


def _get_owned_site(db: Session, site_id: uuid.UUID, user: User) -> Site:
    site = db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == user.id, Site.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return site


def _to_site_out(db: Session, site: Site) -> SiteOut:
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

    return SiteOut(
        id=site.id,
        name=site.name,
        domain=site.domain,
        description=site.description,
        is_active=site.is_active,
        crawl_frequency=site.crawl_frequency,
        pages_count=pages_count,
        posts_count=posts_count,
        total_clicks=int(total_clicks),
        last_crawled_at=last_crawled_at,
        created_at=site.created_at,
        updated_at=site.updated_at,
    )


@router.get("", response_model=SiteListResponse)
def list_sites(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Site).where(Site.user_id == current_user.id, Site.deleted_at.is_(None))
    if status_filter == "active":
        query = query.where(Site.is_active.is_(True))
    elif status_filter == "inactive":
        query = query.where(Site.is_active.is_(False))
    if search:
        like = f"%{search}%"
        query = query.where((Site.name.ilike(like)) | (Site.domain.ilike(like)))

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    sites = (
        db.execute(query.order_by(Site.created_at.desc()).offset((page - 1) * limit).limit(limit))
        .scalars()
        .all()
    )

    return SiteListResponse(items=[_to_site_out(db, s) for s in sites], total=total, page=page, limit=limit)


@router.post("", response_model=SiteOut, status_code=status.HTTP_201_CREATED)
def create_site(
    payload: SiteCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        check_can_add_site(db, current_user)
    except QuotaExceededError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    existing = db.execute(
        select(Site).where(Site.domain == payload.domain, Site.deleted_at.is_(None))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A site with this domain already exists.")

    site = Site(user_id=current_user.id, **payload.model_dump())
    db.add(site)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A site with this domain already exists.")
    db.refresh(site)
    log_activity(
        db,
        user_id=current_user.id,
        action="create",
        entity_type="site",
        entity_id=site.id,
        details={"name": site.name, "domain": site.domain},
        request=request,
    )
    return _to_site_out(db, site)


@router.get("/{site_id}", response_model=SiteOut)
def get_site(site_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    site = _get_owned_site(db, site_id, current_user)
    return _to_site_out(db, site)


@router.put("/{site_id}", response_model=SiteOut)
def update_site(
    site_id: uuid.UUID,
    payload: SiteUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    site = _get_owned_site(db, site_id, current_user)
    updates = payload.model_dump(exclude_unset=True)
    if "domain" in updates and updates["domain"] != site.domain:
        existing = db.execute(
            select(Site).where(Site.domain == updates["domain"], Site.deleted_at.is_(None))
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="A site with this domain already exists."
            )
    for key, value in updates.items():
        setattr(site, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A site with this domain already exists.")
    db.refresh(site)
    log_activity(
        db,
        user_id=current_user.id,
        action="update",
        entity_type="site",
        entity_id=site.id,
        details=updates,
        request=request,
    )
    return _to_site_out(db, site)


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(
    site_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    site = _get_owned_site(db, site_id, current_user)
    site.deleted_at = datetime.now(timezone.utc)
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="delete",
        entity_type="site",
        entity_id=site.id,
        request=request,
    )


MAX_NEW_PAGES_PER_CRAWL = 20


@router.post("/{site_id}/crawl")
def crawl_site(
    site_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    site = _get_owned_site(db, site_id, current_user)
    existing_pages = (
        db.execute(select(Page).where(Page.site_id == site.id, Page.deleted_at.is_(None))).scalars().all()
    )

    crawled = 0
    failed = 0

    # Refresh pages already tracked for this site.
    for p in existing_pages:
        try:
            extracted = run_crawl(p.url)
        except CrawlError:
            p.status = "failed"
            failed += 1
            continue
        apply_crawl_result(p, extracted)
        crawled += 1

    # Discover new pages via sitemap.xml, falling back to homepage links.
    existing_urls = {p.url for p in existing_pages}
    discovered = 0
    candidate_urls = discover_site_urls(site.domain, limit=MAX_NEW_PAGES_PER_CRAWL)
    for url in candidate_urls:
        if url in existing_urls or discovered >= MAX_NEW_PAGES_PER_CRAWL:
            continue
        new_page = Page(site_id=site.id, url=url, status="pending")
        db.add(new_page)
        try:
            extracted = run_crawl(url)
        except CrawlError:
            new_page.status = "failed"
            failed += 1
            continue
        apply_crawl_result(new_page, extracted)
        crawled += 1
        discovered += 1
        existing_urls.add(url)

    db.commit()

    log_activity(
        db,
        user_id=current_user.id,
        action="crawl",
        entity_type="site",
        entity_id=site.id,
        details={"crawled": crawled, "discovered": discovered, "failed": failed},
        request=request,
    )

    if not existing_pages and not discovered:
        message = "No pages found to crawl. Add a page manually, or check that the site has a sitemap."
    else:
        message = f"Crawled {crawled} page(s) ({discovered} newly discovered), {failed} failed."
    return {"message": message, "crawled": crawled, "discovered": discovered, "failed": failed}


@router.get("/{site_id}/pages", response_model=PageListResponse)
def list_site_pages(
    site_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_site(db, site_id, current_user)
    query = select(Page).where(Page.site_id == site_id, Page.deleted_at.is_(None))
    if status_filter:
        query = query.where(Page.status == status_filter)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    pages = (
        db.execute(query.order_by(Page.created_at.desc()).offset((page - 1) * limit).limit(limit))
        .scalars()
        .all()
    )

    return PageListResponse(
        items=[PageSummary.model_validate(p) for p in pages], total=total, page=page, limit=limit
    )


@router.get("/{site_id}/stats", response_model=SiteStats)
def get_site_stats(
    site_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_site(db, site_id, current_user)

    analytics_query = (
        select(
            func.coalesce(func.sum(Analytics.clicks), 0),
            func.coalesce(func.sum(Analytics.impressions), 0),
            func.coalesce(func.avg(Analytics.engagement_rate), 0),
        )
        .join(Post, Analytics.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .where(Page.site_id == site_id)
    )
    if start_date:
        analytics_query = analytics_query.where(Analytics.metric_date >= start_date)
    if end_date:
        analytics_query = analytics_query.where(Analytics.metric_date <= end_date)

    total_clicks, total_impressions, engagement_rate = db.execute(analytics_query).one()

    total_pages = db.execute(
        select(func.count(Page.id)).where(Page.site_id == site_id, Page.deleted_at.is_(None))
    ).scalar_one()
    total_posts = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .where(Page.site_id == site_id, Post.deleted_at.is_(None))
    ).scalar_one()

    return SiteStats(
        total_pages=total_pages,
        total_posts=total_posts,
        total_clicks=int(total_clicks),
        total_impressions=int(total_impressions),
        engagement_rate=float(engagement_rate),
    )
