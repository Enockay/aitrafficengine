import random

import anthropic

from app.config import get_settings
from app.models.page import Page

settings = get_settings()

# Randomized each call so repeated generations for the same page don't converge on the
# same visual — Claude's phrasing varies naturally too, but this forces structural variety.
STYLES = [
    "cinematic photography",
    "minimalist flat illustration",
    "abstract gradient art",
    "3D render",
    "watercolor painting",
    "retro poster art",
    "isometric illustration",
    "moody film photography",
    "bold geometric design",
    "soft studio photography",
]

MOODS = [
    "energetic and bold",
    "calm and professional",
    "warm and inviting",
    "futuristic and sleek",
    "playful and vibrant",
    "elegant and sophisticated",
    "confident and modern",
]


class PromptGenerationError(Exception):
    pass


def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.anthropic_api_key or None)


def generate_image_prompt(page: Page, site_name: str | None) -> str:
    style = random.choice(STYLES)
    mood = random.choice(MOODS)
    key_points = "\n".join(f"- {p}" for p in (page.key_points or [])[:5])

    prompt = f"""You are a creative director writing an image-generation prompt for a marketing flyer background.

Site: {site_name or "Unknown"}
Page title: {page.title or "Untitled"}
Summary: {page.summary or "No summary available."}
Key points:
{key_points or "(none)"}
Source URL: {page.url}

Write ONE vivid, specific prompt (2-3 sentences, under 400 characters) for an AI image generator to \
create a background image that visually represents this content's theme through metaphor or scene — \
not a literal screenshot or diagram of a webpage.

Visual style to use: {style}
Mood: {mood}

The image must contain NO text, words, letters, numbers, or logos — it's a background only; a headline \
will be overlaid on top of it separately afterward.

Respond with only the image prompt itself, nothing else — no preamble, no quotes."""

    try:
        response = _client().messages.create(
            model=settings.claude_model,
            max_tokens=300,
            thinking={"type": "disabled"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise PromptGenerationError(f"Claude API error: {exc}") from exc

    if response.stop_reason == "refusal":
        raise PromptGenerationError("Prompt generation was declined by the model's safety filters.")

    text_block = next((b for b in response.content if b.type == "text"), None)
    if not text_block or not text_block.text.strip():
        raise PromptGenerationError("No prompt returned by the model.")

    return text_block.text.strip()
