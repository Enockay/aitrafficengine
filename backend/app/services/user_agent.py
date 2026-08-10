from user_agents import parse as _parse_ua


def parse_client(user_agent: str | None) -> tuple[str | None, str | None, str | None]:
    """Returns (browser, os, device_type) parsed from a User-Agent string."""
    if not user_agent:
        return None, None, None

    ua = _parse_ua(user_agent)
    if ua.is_mobile:
        device_type = "mobile"
    elif ua.is_tablet:
        device_type = "tablet"
    elif ua.is_pc:
        device_type = "desktop"
    else:
        device_type = "other"

    return ua.browser.family or None, ua.os.family or None, device_type
