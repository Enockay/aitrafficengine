import httpx

from app.config import get_settings

settings = get_settings()

STABILITY_URL = "https://api.stability.ai/v2beta/stable-image/generate/core"

NEGATIVE_PROMPT = "text, words, letters, watermark, logo, signature, low quality, blurry"


class ImageGenerationError(Exception):
    pass


class ImageGenerationNotConfigured(ImageGenerationError):
    pass


def is_configured() -> bool:
    return bool(settings.stability_api_key)


def generate_background_bytes(prompt: str, aspect_ratio: str = "16:9") -> bytes:
    """Generates a background image via Stability AI's Stable Image Core endpoint.

    Raises ImageGenerationNotConfigured if no API key is set, or ImageGenerationError
    on any API failure (bad request, content filtered, network error, etc).
    """
    if not settings.stability_api_key:
        raise ImageGenerationNotConfigured(
            "AI image generation isn't configured yet. Set STABILITY_API_KEY."
        )

    full_prompt = f"{prompt} High quality, detailed, suitable as a background image."

    try:
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                STABILITY_URL,
                headers={
                    "Authorization": f"Bearer {settings.stability_api_key}",
                    "Accept": "image/*",
                },
                files={"none": ""},
                data={
                    "prompt": full_prompt,
                    "negative_prompt": NEGATIVE_PROMPT,
                    "aspect_ratio": aspect_ratio,
                    "output_format": "png",
                },
            )
    except httpx.HTTPError as exc:
        raise ImageGenerationError(f"Stability AI request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise ImageGenerationError(f"Stability AI generation failed ({resp.status_code}): {resp.text}")

    finish_reason = resp.headers.get("finish-reason")
    if finish_reason and finish_reason != "SUCCESS":
        raise ImageGenerationError(f"Stability AI declined the request: {finish_reason}")

    return resp.content
