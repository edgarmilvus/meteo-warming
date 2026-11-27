#!/usr/bin/env python3
"""Draws the app icons: the warming stripes, 14 bands, blue to red.

Run from app/:  python3 scripts/make-icons.py
"""

from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

# Blue -> neutral -> red, the same ramp the charts use.
STOPS = [
    (0.0, (47, 107, 147)),
    (0.35, (150, 182, 204)),
    (0.5, (238, 236, 230)),
    (0.68, (222, 160, 140)),
    (1.0, (165, 58, 41)),
]


def ramp(t):
    for i in range(1, len(STOPS)):
        t0, c0 = STOPS[i - 1]
        t1, c1 = STOPS[i]
        if t <= t1:
            k = (t - t0) / (t1 - t0)
            return tuple(round(c0[j] + (c1[j] - c0[j]) * k) for j in range(3))
    return STOPS[-1][1]


def stripes(size, bands=14, pad=0, radius=0):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    inner = size - pad * 2
    w = inner / bands
    for i in range(bands):
        # Slight irregularity so it reads as a record, not a gradient.
        t = i / (bands - 1)
        t = min(1.0, max(0.0, t + (0.06 if i % 3 == 1 else -0.04 if i % 4 == 2 else 0)))
        x0 = pad + i * w
        d.rectangle([x0, pad, x0 + w + 0.6, pad + inner], fill=ramp(t))
    if radius:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius, fill=255)
        img.putalpha(mask)
    return img


def opaque(img, size, bg=(246, 245, 242, 255)):
    flat = Image.new("RGBA", (size, size), bg)
    flat.alpha_composite(img)
    return flat.convert("RGB")


# Standard icons: full bleed, the OS applies its own mask.
for size in (192, 512):
    stripes(size).save(OUT / f"icon-{size}.png")

# Maskable: keep the stripes inside the safe circle (80% of the canvas).
maskable = Image.new("RGBA", (512, 512), (246, 245, 242, 255))
maskable.alpha_composite(stripes(410, bands=12), (51, 51))
maskable.convert("RGB").save(OUT / "icon-maskable-512.png")

# iOS adds no mask and dislikes transparency: bake the corners and the paper.
opaque(stripes(180, radius=40), 180).save(OUT / "apple-touch-icon.png")

# Browser tab.
stripes(64, bands=10, radius=12).save(OUT / "favicon.png")

print("icons written to", OUT)
