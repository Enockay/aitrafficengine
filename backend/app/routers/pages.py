import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.page import Page
from app.models.post import Post
from app.models.site import Site
from app.models.user import User
from app.schemas.page import (
    PageCreate,
    PageListResponse,
    PageOut,
    PagePostListResponse,
    PagePostSummary,
)
from app.schemas.post import (
    GeneratePostRequest,
    GenerateVariantsRequest,
    GenerateVariantsResponse,
    PostOut,
    VariantEntry,
)
from app.services.activity_log import log_activity
from app.services.ai_content import (
    VARIANT_TONE_PRESETS,
    ContentGenerationError,
    generate_post as run_generate_post,
)
from app.services.crawler import CrawlError, apply_crawl_result, crawl_page as run_crawl
from app.services.distribution import compute_content_hash
from app.services.quotas import QuotaExceededError, check_can_create_post
from app.services.trends import get_available_trends, record_trend_used

router = APIRouter(prefix="/pages", tags=["pages"])
settings = get_settings()


def _get_owned_page(db: Session, page_id: uuid.UUID, user: User) -> Page:
    page = db.execute(
        select(Page)
        .join(Site, Page.site_id == Site.id)
        .where(Page.id == page_id, Site.user_id == user.id, Page.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


def _get_owned_site(db: Session, site_id: uuid.UUID, user: User) -> Site:
    site = db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == user.id, Site.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return site


def _build_post_from_generation(db: Session, page: Page, platform: str, result: dict) -> Post:
    """Parses a generate_post() result into a persisted Post row for the given platform.

    Shared by the single-post and A/B-variant generation endpoints so the per-platform
    field mapping and tracked-URL redirect substitution stay in one place.
    """
    if platform == "twitter":
        tweets = result["tweets"]
        content_type = "thread" if len(tweets) > 1 else "single"
        title = tweets[0][:300]
        body = "\n\n---\n\n".join(tweets)
        hashtags = result["hashtags"]
    elif platform == "linkedin":
        content_type = "single"
        body = result["body"]
        title = body.splitlines()[0][:300]
        hashtags = result["hashtags"]
    elif platform == "reddit":
        content_type = "single"
        title = result["title"][:300]
        body = result["body"]
        hashtags = []
    elif platform == "tumblr":
        content_type = "single"
        title = result["title"][:300]
        body = result["body"]
        hashtags = result["tags"]
    elif platform == "pinterest":
        content_type = "single"
        title = result["title"][:300]
        body = result["description"]
        hashtags = []
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported platform: {platform}")

    post = Post(
        page_id=page.id,
        platform=platform,
        content_type=content_type,
        title=title,
        body=body,
        hashtags=hashtags,
        tracked_url=page.url,
        status="draft",
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # Route the link embedded in the post's own text through our redirect endpoint so
    # clicks get logged as first-party Analytics data — tracked_url stays the real
    # destination the redirect ultimately forwards to.
    redirect_url = f"{settings.backend_url}/r/{post.id}"
    post.body = post.body.replace(page.url, redirect_url)
    post.content_hash = compute_content_hash(post.body)
    db.commit()
    db.refresh(post)
    return post


def _to_page_out(db: Session, page: Page) -> PageOut:
    posts_count = db.execute(
        select(func.count(Post.id)).where(Post.page_id == page.id, Post.deleted_at.is_(None))
    ).scalar_one()
    return PageOut(
        id=page.id,
        site_id=page.site_id,
        url=page.url,
        title=page.title,
        meta_description=page.meta_description,
        summary=page.summary,
        content_text=page.content_text,
        hero_image_url=page.hero_image_url,
        key_points=page.key_points,
        keywords=page.keywords,
        status=page.status,
        last_crawled_at=page.last_crawled_at,
        created_at=page.created_at,
        updated_at=page.updated_at,
        posts_count=posts_count,
    )


@router.get("", response_model=PageListResponse)
def list_pages(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    site_id: uuid.UUID | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(Page)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == current_user.id, Page.deleted_at.is_(None))
    )
    if site_id:
        query = query.where(Page.site_id == site_id)
    if status_filter:
        query = query.where(Page.status == status_filter)
    if search:
        like = f"%{search}%"
        query = query.where((Page.title.ilike(like)) | (Page.url.ilike(like)))

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    pages = (
        db.execute(query.order_by(Page.created_at.desc()).offset((page - 1) * limit).limit(limit))
        .scalars()
        .all()
    )
    return PageListResponse(items=[_to_page_out(db, p) for p in pages], total=total, page=page, limit=limit)


@router.post("", response_model=PageOut, status_code=status.HTTP_201_CREATED)
def create_page(
    payload: PageCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_site(db, payload.site_id, current_user)

    page = Page(site_id=payload.site_id, url=payload.url, status="pending")
    db.add(page)
    db.commit()
    db.refresh(page)

    try:
        extracted = run_crawl(payload.url)
    except CrawlError:
        page.status = "failed"
        db.commit()
        db.refresh(page)
        log_activity(
            db, user_id=current_user.id, action="create", entity_type="page", entity_id=page.id, request=request
        )
        return _to_page_out(db, page)

    apply_crawl_result(page, extracted)
    db.commit()
    db.refresh(page)
    log_activity(
        db, user_id=current_user.id, action="create", entity_type="page", entity_id=page.id, request=request
    )
    return _to_page_out(db, page)


@router.get("/{page_id}", response_model=PageOut)
def get_page(page_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    page = _get_owned_page(db, page_id, current_user)
    return _to_page_out(db, page)


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(
    page_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page = _get_owned_page(db, page_id, current_user)
    page.deleted_at = datetime.now(timezone.utc)
    db.commit()
    log_activity(
        db, user_id=current_user.id, action="delete", entity_type="page", entity_id=page.id, request=request
    )


@router.post("/{page_id}/generate", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def generate_posts_for_page(
    page_id: uuid.UUID,
    request: Request,
    payload: GeneratePostRequest = GeneratePostRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page = _get_owned_page(db, page_id, current_user)
    try:
        check_can_create_post(db, current_user)
    except QuotaExceededError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    kwargs = {"platform": payload.platform}
    if payload.tone:
        kwargs["tone"] = payload.tone
    trend_candidates: list[str] = []
    if payload.platform == "twitter":
        trend_candidates = [t.name for t in get_available_trends(db)]
        kwargs["trend_candidates"] = trend_candidates
    try:
        result = run_generate_post(page, **kwargs)
    except ContentGenerationError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    if result.get("used_trend"):
        record_trend_used(db, result["used_trend"])

    post = _build_post_from_generation(db, page, payload.platform, result)

    log_activity(
        db,
        user_id=current_user.id,
        action="generate",
        entity_type="post",
        entity_id=post.id,
        details={"platform": payload.platform, "page_id": str(page.id)},
        request=request,
    )

    return PostOut.model_validate(post)


@router.post(
    "/{page_id}/generate-variants", response_model=GenerateVariantsResponse, status_code=status.HTTP_201_CREATED
)
def generate_variants_for_page(
    page_id: uuid.UUID,
    request: Request,
    payload: GenerateVariantsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page = _get_owned_page(db, page_id, current_user)
    try:
        check_can_create_post(db, current_user)
    except QuotaExceededError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    trend_candidates: list[str] = []
    if payload.platform == "twitter":
        trend_candidates = [t.name for t in get_available_trends(db)]

    variant_group_id = uuid.uuid4()
    labels = ["A", "B", "C"][: payload.variant_count]
    posts: list[Post] = []
    for label, tone in zip(labels, VARIANT_TONE_PRESETS[: payload.variant_count]):
        try:
            result = run_generate_post(
                page, platform=payload.platform, tone=tone, trend_candidates=trend_candidates
            )
        except ContentGenerationError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

        if result.get("used_trend"):
            record_trend_used(db, result["used_trend"])

        post = _build_post_from_generation(db, page, payload.platform, result)
        post.variant_group_id = variant_group_id
        post.variant_label = label
        db.commit()
        db.refresh(post)
        posts.append(post)

        log_activity(
            db,
            user_id=current_user.id,
            action="generate",
            entity_type="post",
            entity_id=post.id,
            details={
                "platform": payload.platform,
                "page_id": str(page.id),
                "variant_group_id": str(variant_group_id),
                "variant_label": label,
            },
            request=request,
        )

    return GenerateVariantsResponse(
        variant_group_id=variant_group_id,
        variants=[VariantEntry(post=PostOut.model_validate(p), total_clicks=0) for p in posts],
    )


@router.get("/{page_id}/posts", response_model=PagePostListResponse)
def list_page_posts(
    page_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    _get_owned_page(db, page_id, current_user)
    posts = (
        db.execute(
            select(Post).where(Post.page_id == page_id, Post.deleted_at.is_(None)).order_by(Post.created_at.desc())
        )
        .scalars()
        .all()
    )
    return PagePostListResponse(items=[PagePostSummary.model_validate(p) for p in posts])
