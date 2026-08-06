import json
import uuid

from app.redis_client import get_redis


def channel_name(user_id: uuid.UUID) -> str:
    return f"events:user:{user_id}"


def publish_event(user_id: uuid.UUID, event_type: str, payload: dict) -> None:
    """Publishes a real-time event to a user's Redis pub/sub channel.

    Consumed by the /ws WebSocket endpoint and relayed to that user's connected
    browser tabs — the backing mechanism for real-time dashboard updates (§11.4).
    """
    redis = get_redis()
    redis.publish(channel_name(user_id), json.dumps({"type": event_type, "payload": payload}))
