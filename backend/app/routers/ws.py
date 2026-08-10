import asyncio

from fastapi import APIRouter, WebSocket
from redis import asyncio as aioredis

from app.config import get_settings
from app.database import SessionLocal
from app.models.user import User
from app.services.events import SUPPORT_ADMIN_CHANNEL, channel_name
from app.services.support import PRESENCE_KEY_TTL_SECONDS, presence_key
from app.utils.security import InvalidTokenError, decode_token

router = APIRouter(tags=["websocket"])
settings = get_settings()


def _get_user_role(user_id) -> str | None:
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        return user.role if user else None
    finally:
        db.close()


@router.websocket("/ws")
async def websocket_events(websocket: WebSocket, token: str = ""):
    # Native browser WebSockets can't send custom Authorization headers, so the access
    # token travels as a query param instead (?token=...) and is validated the same way.
    try:
        user_id = decode_token(token, expected_type="access")
    except InvalidTokenError:
        await websocket.close(code=4401)
        return

    await websocket.accept()

    role = _get_user_role(user_id)

    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis.pubsub()
    channels = [channel_name(user_id)]
    if role == "admin":
        # Any admin browsing anywhere should see every user's support message live —
        # there's no single "the admin" account to target a personal channel at.
        channels.append(SUPPORT_ADMIN_CHANNEL)
    await pubsub.subscribe(*channels)

    # Presence for the support-chat email fallback: while this key exists, the user
    # is considered online and an admin reply is delivered over the socket instead
    # of falling back to email. The TTL is a self-healing safety net in case the
    # `finally` block below never runs (e.g. a hard process kill) — a background
    # loop keeps refreshing it well before expiry for the life of the connection,
    # since `pubsub.listen()` only wakes up when a message arrives and could
    # otherwise sit idle past the TTL on a quiet connection.
    await redis.set(presence_key(user_id), "1", ex=PRESENCE_KEY_TTL_SECONDS)

    async def _refresh_presence():
        while True:
            await asyncio.sleep(PRESENCE_KEY_TTL_SECONDS / 3)
            await redis.expire(presence_key(user_id), PRESENCE_KEY_TTL_SECONDS)

    refresh_task = asyncio.create_task(_refresh_presence())

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            await websocket.send_text(message["data"])
    except Exception:
        pass
    finally:
        refresh_task.cancel()
        await redis.delete(presence_key(user_id))
        await pubsub.unsubscribe(*channels)
        await pubsub.close()
        await redis.close()
