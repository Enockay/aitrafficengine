"""Generates public/og-image.png — the 1200x630 social-share card for every page.

Colors are hardcoded from frontend/src/index.css's dark palette (--bg-primary,
--accent-red, --text-primary etc). If that palette changes, regenerate this image to
match rather than letting it drift — there's no automated link between the two.

Run with the backend venv (has Pillow already):
  ../backend/.venv/bin/python generate_og_image.py
"""

import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630

BG_PRIMARY = (10, 10, 11)
BG_SECONDARY = (19, 19, 22)
TEXT_PRIMARY = (242, 242, 240)
TEXT_SECONDARY = (154, 154, 158)
TEXT_MUTED = (99, 99, 102)
ACCENT_RED = (229, 72, 77)
BORDER = (35, 35, 38)

FONT_DIR = "/System/Library/Fonts/Supplemental"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)


def draw_glow(img: Image.Image) -> Image.Image:
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy, r = W // 2, -40, 480
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*ACCENT_RED, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(110))
    return Image.alpha_composite(img, glow)


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius, **kwargs):
    draw.rounded_rectangle(box, radius=radius, **kwargs)


def draw_logo_mark(img: Image.Image, x: int, y: int, size: int) -> None:
    mark = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    md = ImageDraw.Draw(mark)
    # Gradient-ish red square (top-left brighter, bottom-right darker) approximating
    # the app's `bg-gradient-to-br from-accent-red to-accent-red/70` mark.
    for i in range(size):
        t = i / size
        r = int(ACCENT_RED[0] * (1 - t * 0.25))
        g = int(ACCENT_RED[1] * (1 - t * 0.25))
        b = int(ACCENT_RED[2] * (1 - t * 0.25))
        md.line([(0, i), (size, i)], fill=(r, g, b, 255))
    rounded_mask = Image.new("L", (size, size), 0)
    rmd = ImageDraw.Draw(rounded_mask)
    rmd.rounded_rectangle([0, 0, size, size], radius=int(size * 0.28), fill=255)
    mark.putalpha(rounded_mask)

    # Bolt glyph, white, centered.
    bolt_w, bolt_h = size * 0.34, size * 0.52
    ox, oy = size / 2 - bolt_w / 2, size / 2 - bolt_h / 2
    bolt = [
        (ox + bolt_w * 0.62, oy),
        (ox + bolt_w * 0.08, oy + bolt_h * 0.58),
        (ox + bolt_w * 0.42, oy + bolt_h * 0.58),
        (ox + bolt_w * 0.32, oy + bolt_h),
        (ox + bolt_w * 0.92, oy + bolt_h * 0.38),
        (ox + bolt_w * 0.56, oy + bolt_h * 0.38),
    ]
    md.polygon(bolt, fill=(255, 255, 255, 255))

    img.paste(mark, (x, y), mark)


def draw_platform_chip(draw, x, y, d, label, fg):
    draw.ellipse([x, y, x + d, y + d], fill=BG_SECONDARY, outline=BORDER, width=2)
    f = font("Arial Bold.ttf", int(d * 0.36))
    bbox = draw.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((x + d / 2 - tw / 2, y + d / 2 - th / 2 - bbox[1]), label, font=f, fill=fg)


def main():
    img = Image.new("RGBA", (W, H), (*BG_PRIMARY, 255))
    img = draw_glow(img)
    draw = ImageDraw.Draw(img)

    margin = 88

    # Logo mark + wordmark
    mark_size = 60
    draw_logo_mark(img, margin, 84, mark_size)
    draw = ImageDraw.Draw(img)
    wordmark_font = font("Arial Bold.ttf", 30)
    draw.text((margin + mark_size + 18, 84 + mark_size / 2 - 30), "AI Traffic Engine", font=wordmark_font, fill=TEXT_PRIMARY, anchor="lm")

    # Headline
    headline_font = font("Arial Bold.ttf", 68)
    accent_font = headline_font
    y = 230
    draw.text((margin, y), "Put your website's traffic", font=headline_font, fill=TEXT_PRIMARY)
    draw.text((margin, y + 82), "on ", font=headline_font, fill=TEXT_PRIMARY)
    bbox = draw.textbbox((margin, y + 82), "on ", font=headline_font)
    draw.text((bbox[2], y + 82), "autopilot.", font=accent_font, fill=ACCENT_RED)

    # Subtext
    sub_font = font("Arial.ttf", 26)
    draw.text((margin, y + 172), "AI crawls your site, writes platform-native posts, and publishes on a", font=sub_font, fill=TEXT_SECONDARY)
    draw.text((margin, y + 172 + 36), "schedule — with every click tracked back to you. Zero ad spend.", font=sub_font, fill=TEXT_SECONDARY)

    # Platform chips row (matches Hero's platform strip)
    chip_d = 44
    chip_gap = 14
    chip_labels = [("X", (255, 255, 255)), ("in", (255, 255, 255)), ("r/", (255, 255, 255)), ("t", (255, 255, 255)), ("P", (255, 255, 255))]
    cx = margin
    cy = H - 108
    for label, fg in chip_labels:
        draw_platform_chip(draw, cx, cy, chip_d, label, fg)
        cx += chip_d + chip_gap

    caption_font = font("Arial.ttf", 20)
    draw.text((cx + 10, cy + chip_d / 2), "X / Twitter · LinkedIn · Reddit · Tumblr · Pinterest", font=caption_font, fill=TEXT_MUTED, anchor="lm")

    # Thin bottom border accent
    draw.rectangle([0, H - 6, W, H], fill=ACCENT_RED)

    out_path = os.path.join(os.path.dirname(__file__), "..", "public", "og-image.png")
    img.convert("RGB").save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
