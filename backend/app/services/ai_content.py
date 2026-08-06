import json

import anthropic

from app.config import get_settings
from app.models.page import Page

settings = get_settings()

TWEET_CHAR_LIMIT = 280
LINKEDIN_CHAR_LIMIT = 3000
REDDIT_TITLE_CHAR_LIMIT = 300
DEFAULT_TONE = "informative and engaging"

MIN_TWEETS = 3
MAX_TWEETS = 8

# Fixed creative angles used for A/B variant generation — each produces genuinely
# different Claude output for the same page, rather than near-duplicate drafts.
VARIANT_TONE_PRESETS = [
    "informative and engaging",
    "bold and provocative",
    "curious and question-driven",
]

TWITTER_SCHEMA = {
    "type": "object",
    "properties": {
        "tweets": {
            "type": "array",
            "items": {"type": "string"},
        },
        "hashtags": {
            "type": "array",
            "items": {"type": "string"},
        },
        "used_trend": {
            "type": ["string", "null"],
            "description": "Exact name of the trend candidate referenced in the thread, or null if none fit.",
        },
    },
    "required": ["tweets", "hashtags", "used_trend"],
    "additionalProperties": False,
}

LINKEDIN_SCHEMA = {
    "type": "object",
    "properties": {
        "body": {"type": "string"},
        "hashtags": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["body", "hashtags"],
    "additionalProperties": False,
}

REDDIT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "body": {"type": "string"},
    },
    "required": ["title", "body"],
    "additionalProperties": False,
}


class ContentGenerationError(Exception):
    pass


def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.anthropic_api_key or None)


def _build_twitter_prompt(page: Page, tone: str, trend_candidates: list[str] | None = None) -> str:
    key_points = "\n".join(f"- {p}" for p in (page.key_points or [])[:8])
    trend_block = ""
    if trend_candidates:
        trend_list = "\n".join(f"- {t}" for t in trend_candidates)
        trend_block = f"""

Currently trending on X (for context only — do not force one in):
{trend_list}
If, and only if, one of these is genuinely relevant to this content, you may naturally
work it into the thread. If none of them fit, ignore this list entirely — a forced or
unrelated trend reference is worse than no trend reference. Set "used_trend" to the
exact trend name you referenced, or null if you didn't use any."""
    return f"""Write a Twitter/X thread promoting the page below. Include the tracked URL naturally in the first tweet.

Page title: {page.title or "Untitled"}
Summary: {page.summary or "No summary available."}
Key points:
{key_points or "(none extracted)"}
Tracked URL: {page.url}

Requirements:
- 3 to 8 tweets in the thread, each strictly under 280 characters (URLs count as 23 characters toward the limit)
- Tone: {tone}
- The first tweet must be a strong hook and must include the tracked URL
- No generic marketing fluff — write like a real person sharing something useful
- Do not number the tweets (no "1/", "2/" etc.) — the platform shows thread position automatically
- Suggest 2 to 4 relevant hashtags, without the # symbol{trend_block}
"""


def generate_twitter_post(page: Page, tone: str = DEFAULT_TONE, trend_candidates: list[str] | None = None) -> dict:
    """Generate a Twitter/X thread for a page using Claude. Raises ContentGenerationError on failure."""
    client = _client()
    prompt = _build_twitter_prompt(page, tone, trend_candidates)

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=2048,
            thinking={"type": "disabled"},
            output_config={
                "effort": "low",
                "format": {"type": "json_schema", "schema": TWITTER_SCHEMA},
            },
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise ContentGenerationError(f"Claude API error: {exc}") from exc

    if response.stop_reason == "refusal":
        raise ContentGenerationError("Content generation was declined by the model's safety filters.")

    text_block = next((b for b in response.content if b.type == "text"), None)
    if not text_block:
        raise ContentGenerationError("No content returned by the model.")

    try:
        data = json.loads(text_block.text)
    except json.JSONDecodeError as exc:
        raise ContentGenerationError("Model returned invalid JSON.") from exc

    tweets = [t.strip() for t in data.get("tweets", []) if t.strip()]
    if not (MIN_TWEETS <= len(tweets) <= MAX_TWEETS):
        raise ContentGenerationError(
            f"Model returned {len(tweets)} tweet(s); expected between {MIN_TWEETS} and {MAX_TWEETS}."
        )

    oversized = [t for t in tweets if len(t) > TWEET_CHAR_LIMIT]
    if oversized:
        raise ContentGenerationError(
            f"{len(oversized)} generated tweet(s) exceed the {TWEET_CHAR_LIMIT} character limit."
        )

    hashtags = [h.lstrip("#").strip() for h in data.get("hashtags", []) if h.strip()]

    # Only trust used_trend if it's actually one of the candidates we offered — guards
    # against the model naming something that wasn't in the list we sent.
    used_trend = data.get("used_trend")
    if used_trend not in (trend_candidates or []):
        used_trend = None

    return {"tweets": tweets, "hashtags": hashtags, "used_trend": used_trend}


def _build_linkedin_prompt(page: Page, tone: str) -> str:
    key_points = "\n".join(f"- {p}" for p in (page.key_points or [])[:8])
    return f"""Write a LinkedIn post promoting the page below. Include the tracked URL naturally, usually near the end.

Page title: {page.title or "Untitled"}
Summary: {page.summary or "No summary available."}
Key points:
{key_points or "(none extracted)"}
Tracked URL: {page.url}

Requirements:
- 100-250 words
- Tone: {tone}, but always professional and appropriate for LinkedIn's audience
- Open with a strong hook (a question, a bold claim, or a surprising fact) — the first line is what shows before "see more"
- Use short paragraphs and line breaks for mobile readability, not one dense block
- No generic marketing fluff — write like a real professional sharing something useful
- Suggest 3 to 5 relevant hashtags, without the # symbol, using CamelCase for multi-word tags (e.g. "ContentMarketing")
"""


def generate_linkedin_post(page: Page, tone: str = DEFAULT_TONE) -> dict:
    """Generate a LinkedIn post for a page using Claude. Raises ContentGenerationError on failure."""
    client = _client()
    prompt = _build_linkedin_prompt(page, tone)

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            thinking={"type": "disabled"},
            output_config={
                "effort": "low",
                "format": {"type": "json_schema", "schema": LINKEDIN_SCHEMA},
            },
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise ContentGenerationError(f"Claude API error: {exc}") from exc

    if response.stop_reason == "refusal":
        raise ContentGenerationError("Content generation was declined by the model's safety filters.")

    text_block = next((b for b in response.content if b.type == "text"), None)
    if not text_block:
        raise ContentGenerationError("No content returned by the model.")

    try:
        data = json.loads(text_block.text)
    except json.JSONDecodeError as exc:
        raise ContentGenerationError("Model returned invalid JSON.") from exc

    body = (data.get("body") or "").strip()
    if not body:
        raise ContentGenerationError("Model returned an empty post.")
    if len(body) > LINKEDIN_CHAR_LIMIT:
        raise ContentGenerationError(
            f"Generated post is {len(body)} characters; LinkedIn's limit is {LINKEDIN_CHAR_LIMIT}."
        )

    hashtags = [h.lstrip("#").strip() for h in data.get("hashtags", []) if h.strip()]

    return {"body": body, "hashtags": hashtags}


def _build_reddit_prompt(page: Page, tone: str) -> str:
    key_points = "\n".join(f"- {p}" for p in (page.key_points or [])[:8])
    return f"""Write a Reddit self-post (title + body) sharing the page below with a relevant community in mind. \
Include the tracked URL naturally within the body text.

Page title: {page.title or "Untitled"}
Summary: {page.summary or "No summary available."}
Key points:
{key_points or "(none extracted)"}
Tracked URL: {page.url}

Requirements:
- Title: specific and genuinely interesting, sounds like a real Redditor wrote it, not clickbait, under 300 characters
- Body: conversational and first-person — explain why you're sharing this and what's actually useful about it
- Tone: {tone}, filtered through Reddit's culture — Reddit strongly penalizes anything that reads like an ad
- Do not use marketing language ("check out", "amazing", "game-changing", "revolutionary")
- No hashtags — Reddit doesn't use them
"""


def generate_reddit_post(page: Page, tone: str = DEFAULT_TONE) -> dict:
    """Generate a Reddit self-post for a page using Claude. Raises ContentGenerationError on failure."""
    client = _client()
    prompt = _build_reddit_prompt(page, tone)

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            thinking={"type": "disabled"},
            output_config={
                "effort": "low",
                "format": {"type": "json_schema", "schema": REDDIT_SCHEMA},
            },
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise ContentGenerationError(f"Claude API error: {exc}") from exc

    if response.stop_reason == "refusal":
        raise ContentGenerationError("Content generation was declined by the model's safety filters.")

    text_block = next((b for b in response.content if b.type == "text"), None)
    if not text_block:
        raise ContentGenerationError("No content returned by the model.")

    try:
        data = json.loads(text_block.text)
    except json.JSONDecodeError as exc:
        raise ContentGenerationError("Model returned invalid JSON.") from exc

    title = (data.get("title") or "").strip()
    body = (data.get("body") or "").strip()
    if not title or not body:
        raise ContentGenerationError("Model returned an incomplete post.")
    if len(title) > REDDIT_TITLE_CHAR_LIMIT:
        raise ContentGenerationError(
            f"Generated title is {len(title)} characters; Reddit's limit is {REDDIT_TITLE_CHAR_LIMIT}."
        )

    return {"title": title, "body": body}


def generate_post(
    page: Page,
    platform: str = "twitter",
    tone: str = DEFAULT_TONE,
    trend_candidates: list[str] | None = None,
) -> dict:
    if platform == "twitter":
        return generate_twitter_post(page, tone, trend_candidates)
    if platform == "linkedin":
        return generate_linkedin_post(page, tone)
    if platform == "reddit":
        return generate_reddit_post(page, tone)
    raise ContentGenerationError(f"Post generation for platform '{platform}' is not implemented yet.")
