from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import (
    activity_logs,
    admin,
    analytics,
    auth,
    billing,
    dashboard,
    flyers,
    optimal_times,
    pages,
    platforms,
    posts,
    redirect,
    schedules,
    sites,
    trends,
    ws,
)
from app.services.flyer_generator import MEDIA_DIR

settings = get_settings()

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(RateLimitMiddleware)
# Added last so it's the outermost middleware — its response headers must apply even to
# early responses (e.g. 429s) produced by RateLimitMiddleware, or the browser's CORS
# check would mask the real error behind a confusing "blocked by CORS policy" failure.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)
app.include_router(billing.router, prefix=settings.api_v1_prefix)
app.include_router(sites.router, prefix=settings.api_v1_prefix)
app.include_router(pages.router, prefix=settings.api_v1_prefix)
app.include_router(posts.router, prefix=settings.api_v1_prefix)
app.include_router(platforms.router, prefix=settings.api_v1_prefix)
app.include_router(schedules.router, prefix=settings.api_v1_prefix)
app.include_router(flyers.router, prefix=settings.api_v1_prefix)
app.include_router(analytics.router, prefix=settings.api_v1_prefix)
app.include_router(optimal_times.router, prefix=settings.api_v1_prefix)
app.include_router(dashboard.router, prefix=settings.api_v1_prefix)
app.include_router(activity_logs.router, prefix=settings.api_v1_prefix)
app.include_router(trends.router, prefix=settings.api_v1_prefix)
app.include_router(ws.router, prefix=settings.api_v1_prefix)
app.include_router(redirect.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name}


# Coolify's Traefik probes "/" by default to decide whether a container is healthy
# enough to register behind its domain — without this, every deploy 404s that probe
# and the container never enters the routing pool, surfacing as "no available server".
@app.get("/")
def root():
    return {"status": "ok", "app": settings.app_name}
