from app.services.connectors.base import PlatformConnector
from app.services.connectors.linkedin import LinkedInConnector
from app.services.connectors.reddit import RedditConnector
from app.services.connectors.twitter import TwitterConnector

_CONNECTORS: dict[str, PlatformConnector] = {
    "twitter": TwitterConnector(),
    "linkedin": LinkedInConnector(),
    "reddit": RedditConnector(),
}


def get_connector(platform: str) -> PlatformConnector:
    connector = _CONNECTORS.get(platform)
    if not connector:
        raise ValueError(f"Unsupported platform: {platform}")
    return connector


def supported_platforms() -> list[str]:
    return list(_CONNECTORS.keys())
