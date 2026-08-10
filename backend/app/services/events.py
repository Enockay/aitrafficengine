import json
import uuid

from app.redis_client import get_redis

# Every admin's WS connection subscribes to this in addition to their own personal
# channel, so any user's support message reaches every admin currently browsing —
# there's no single "the admin" user id to target (see SupportMessage's docstring).
SUPPORT_ADMIN_CHANNEL = "events:support_admins"


def channel_name(user_id: uuid.UUID) -> str:
    return f"events:user:{user_id}"


def publish_event(user_id: uuid.UUID, event_type: str, payload: dict) -> None:
    """Publishes a real-time event to a user's Redis pub/sub channel.

    Consumed by the /ws WebSocket endpoint and relayed to that user's connected
    browser tabs — the backing mechanism for real-time dashboard updates (§11.4).
    """
    redis = get_redis()
    redis.publish(channel_name(user_id), json.dumps({"type": event_type, "payload": payload}))


def publish_support_admin_event(event_type: str, payload: dict) -> None:
    redis = get_redis()
    redis.publish(SUPPORT_ADMIN_CHANNEL, json.dumps({"type": event_type, "payload": payload}))
