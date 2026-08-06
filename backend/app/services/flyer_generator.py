import io
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from app.services import s3_storage

MEDIA_DIR = Path(__file__).resolve().parents[2] / "media"
FLYERS_DIR = MEDIA_DIR / "flyers"

WIDTH, HEIGHT = 1200, 630
BRAND_COLOR = (229, 72, 77)  # matches --accent-red
OVERLAY_COLOR = (10, 10, 14)


class FlyerGenerationError(Exception):
    pass


def _font(size: int) -> ImageFont.FreeTypeFont:
    # Pillow's bundled default font (>=10.1) renders as a clean sans-serif outline
    # font on every platform, so flyer generation doesn't depend on system fonts
    # being present in whatever environment (e.g. a slim Docker image) runs this.
    return ImageFont.load_default(size=size)


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _crop_to_cover(image_bytes: bytes) -> Image.Image | None:
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        return None

    src_ratio = img.width / img.height
    target_ratio = WIDTH / HEIGHT
    if src_ratio > target_ratio:
        new_height = HEIGHT
        new_width = int(HEIGHT * src_ratio)
    else:
        new_width = WIDTH
        new_height = int(WIDTH / src_ratio)
    img = img.resize((new_width, new_height))
    left = (new_width - WIDTH) // 2
    top = (new_height - HEIGHT) // 2
    return img.crop((left, top, left + WIDTH, top + HEIGHT))


def generate_flyer_image(
    headline: str,
    subheadline: str | None,
    cta_text: str,
    site_name: str | None,
    background_bytes: bytes | None = None,
) -> Image.Image:
    background = _crop_to_cover(background_bytes) if background_bytes else None
    if background is not None:
        canvas = background.filter(ImageFilter.GaussianBlur(1))
        overlay = Image.new("RGBA", canvas.size, (*OVERLAY_COLOR, 140))
        canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
    else:
        canvas = Image.new("RGB", (WIDTH, HEIGHT), BRAND_COLOR)

    draw = ImageDraw.Draw(canvas)
    margin = 64
    max_text_width = WIDTH - margin * 2

    if site_name:
        brand_font = _font(24)
        draw.text(
            (margin, margin), site_name.upper(), font=brand_font, fill=(255, 255, 255), stroke_width=1
        )

    headline_font = _font(56)
    headline_lines = _wrap_text(draw, headline, headline_font, max_text_width)[:4]
    subheadline_font = _font(28)
    subheadline_lines = (
        _wrap_text(draw, subheadline, subheadline_font, max_text_width)[:3] if subheadline else []
    )

    line_height = 68
    sub_line_height = 40
    block_height = len(headline_lines) * line_height + len(subheadline_lines) * sub_line_height + 80
    y = HEIGHT - margin - 70 - block_height

    for line in headline_lines:
        draw.text((margin, y), line, font=headline_font, fill=(255, 255, 255), stroke_width=1)
        y += line_height

    y += 12
    for line in subheadline_lines:
        draw.text((margin, y), line, font=subheadline_font, fill=(235, 235, 235))
        y += sub_line_height

    cta_font = _font(26)
    cta_bbox = draw.textbbox((0, 0), cta_text, font=cta_font)
    cta_w = cta_bbox[2] - cta_bbox[0] + 48
    cta_h = cta_bbox[3] - cta_bbox[1] + 32
    cta_x, cta_y = margin, HEIGHT - margin - cta_h
    draw.rounded_rectangle([cta_x, cta_y, cta_x + cta_w, cta_y + cta_h], radius=cta_h // 2, fill=(255, 255, 255))
    draw.text((cta_x + 24, cta_y + 16), cta_text, font=cta_font, fill=BRAND_COLOR, stroke_width=1)

    return canvas


def save_flyer_image(image: Image.Image) -> str:
    """Persists the flyer PNG and returns a path token.

    Stored as `s3:<key>` when S3 is configured, or a bare relative path (served via the
    local /media static mount) otherwise. Falls back to local disk if the S3 upload fails.
    """
    filename = f"{uuid.uuid4()}.png"
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    image_bytes = buffer.getvalue()

    if s3_storage.is_configured():
        try:
            key = s3_storage.upload_flyer_image(image_bytes, filename)
            return f"s3:{key}"
        except s3_storage.S3UploadError:
            pass  # transient S3 issue — fall through to local disk so generation still succeeds

    FLYERS_DIR.mkdir(parents=True, exist_ok=True)
    (FLYERS_DIR / filename).write_bytes(image_bytes)
    return f"flyers/{filename}"


def delete_flyer_file(image_path: str) -> None:
    if image_path.startswith("s3:"):
        s3_storage.delete_flyer_image(image_path.removeprefix("s3:"))
        return
    path = MEDIA_DIR / image_path
    if path.exists():
        path.unlink()
