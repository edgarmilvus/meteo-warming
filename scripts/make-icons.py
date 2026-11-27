#!/usr/bin/env python3
"""Draws every icon the app ships with, from one source: the warming stripes.

Writes:
  assets/icon.png              1024, full bleed  (iOS AppIcon, Android legacy)
  assets/icon-background.png   1024, full bleed  (Android adaptive background)
  assets/icon-foreground.png   1024, transparent (Android adaptive foreground)
  assets/splash.png            2732, the mark small on paper
  public/icons/*               the PWA icons

@capacitor/assets turns the first four into every density for both platforms;
`scripts/android-adaptive-icons.mjs` then writes the adaptive-icon XML without
the safe-zone inset, so the stripes reach the edge of the mask.

Run from app/:  python3 scripts/make-icons.py
"""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
PWA = ROOT / "public" / "icons"
PAPER = (246, 245, 242, 255)

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


def opaque(img, size, bg=PAPER):
    flat = Image.new("RGBA", (size, size), bg)
    flat.alpha_composite(img)
    return flat.convert("RGB")


ASSETS.mkdir(exist_ok=True)
PWA.mkdir(parents=True, exist_ok=True)

# Full bleed, opaque: iOS, the legacy Android launcher, and the adaptive layer.
opaque(stripes(1024, bands=12), 1024).save(ASSETS / "icon.png")
opaque(stripes(1024, bands=12), 1024).save(ASSETS / "icon-background.png")

# No foreground art: the stripes are the background, and any launcher mask
# simply crops them, which is the point.
Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)).save(ASSETS / "icon-foreground.png")

# Splash: the same mark, small, on paper.
splash = Image.new("RGBA", (2732, 2732), PAPER)
mark = int(2732 * 0.28)
splash.alpha_composite(stripes(mark, bands=12, radius=int(mark * 0.12)), ((2732 - mark) // 2,) * 2)
splash.convert("RGB").save(ASSETS / "splash.png")

# PWA icons.
for size in (192, 512):
    stripes(size).save(PWA / f"icon-{size}.png")

maskable = Image.new("RGBA", (512, 512), PAPER)
maskable.alpha_composite(stripes(410, bands=12), (51, 51))
maskable.convert("RGB").save(PWA / "icon-maskable-512.png")

opaque(stripes(180, radius=40), 180).save(PWA / "apple-touch-icon.png")
stripes(64, bands=10, radius=12).save(PWA / "favicon.png")

print("written to", ASSETS, "and", PWA)
