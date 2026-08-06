from datetime import timedelta

from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "ai_traffic_engine",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.distribution", "app.tasks.maintenance", "app.tasks.trends"],
)

celery_app.conf.task_routes = {}
celery_app.conf.timezone = "UTC"
celery_app.conf.beat_schedule = {
    "refresh-expiring-platform-tokens": {
        "task": "refresh_expiring_tokens",
        # Once daily, off-peak, clear of the analytics.metric_date midnight boundary.
        "schedule": crontab(hour=3, minute=30),
    },
    "fetch-trending-topics": {
        "task": "fetch_trending_topics_task",
        "schedule": timedelta(hours=2.4),  # 10x/day
    },
}
