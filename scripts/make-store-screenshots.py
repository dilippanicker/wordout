#!/usr/bin/env python3
"""Rebuild store-assets/screenshots/ (1080x1920 store screenshots + contact sheet)
from the raw phone screenshots in store-assets/raw/.

Per image: crop 100 px off the top (status bar) and 135 px off the bottom
(navigation bar), scale to 1920 px tall keeping the aspect ratio, centre on a
1080x1920 canvas and fill the side margins by extending each row's own edge
pixels outward. Output is 24-bit RGB PNG (no alpha).

Usage:  python3 scripts/make-store-screenshots.py
Needs:  Pillow, numpy. store-assets/raw/ is gitignored and never modified.
To change the set, edit SHOTS (order = output order, filenames are the raw names).
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "store-assets" / "raw"
OUT = ROOT / "store-assets" / "screenshots"

# (output name, raw filename), in display order.
SHOTS = [
    ("01-daily-easy", "Screenshot_20261111_213944_Wordout.jpg"),
    ("02-four-out-extreme", "Screenshot_20261111_215451_Wordout.jpg"),
    ("03-daily-hard", "Screenshot_20261111_214150_Wordout.jpg"),
    ("04-four-out-hard", "Screenshot_20261111_215308_Wordout.jpg"),
    ("05-daily-extreme-done", "Screenshot_20261111_214305_Wordout.jpg"),
    ("06-four-out-dark", "Screenshot_20261111_215515_Wordout.jpg"),
    ("07-tutorial", "Screenshot_20261111_213836_Wordout.jpg"),
    ("08-stats", "Screenshot_20261112_063256_Wordout.jpg"),
]

RAW_SIZE = (1080, 2340)
TOP, BOTTOM = 100, 135  # status bar / navigation bar heights in the raw frames
CANVAS_W, CANVAS_H = 1080, 1920


def make_shot(raw_path: Path) -> Image.Image:
    im = Image.open(raw_path).convert("RGB")
    if im.size != RAW_SIZE:
        raise SystemExit(f"{raw_path.name}: expected {RAW_SIZE}, got {im.size}")
    cropped = im.crop((0, TOP, im.width, im.height - BOTTOM))
    new_w = round(cropped.width * CANVAS_H / cropped.height)
    scaled = np.asarray(cropped.resize((new_w, CANVAS_H), Image.LANCZOS))
    left = (CANVAS_W - new_w) // 2
    right = CANVAS_W - new_w - left
    canvas = np.concatenate(
        [
            np.repeat(scaled[:, :1, :], left, axis=1),
            scaled,
            np.repeat(scaled[:, -1:, :], right, axis=1),
        ],
        axis=1,
    )
    return Image.fromarray(canvas, "RGB")


def make_contact_sheet(names: list[str]) -> Image.Image:
    thumb_w, pad, label_h = 300, 24, 44
    thumb_h = round(thumb_w * CANVAS_H / CANVAS_W)
    font = ImageFont.load_default(size=22)
    sheet = Image.new(
        "RGB", (pad + len(names) * (thumb_w + pad), pad + thumb_h + label_h + pad), (40, 40, 40)
    )
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(names):
        x = pad + i * (thumb_w + pad)
        thumb = Image.open(OUT / f"{name}.png").resize((thumb_w, thumb_h), Image.LANCZOS)
        sheet.paste(thumb, (x, pad))
        draw.text((x, pad + thumb_h + 10), f"{name}.png", fill=(235, 235, 235), font=font)
    return sheet


def main() -> None:
    missing = [raw for _, raw in SHOTS if not (RAW / raw).exists()]
    if missing:
        raise SystemExit("Missing raw files in store-assets/raw/: " + ", ".join(missing))
    OUT.mkdir(parents=True, exist_ok=True)
    for name, raw in SHOTS:
        make_shot(RAW / raw).save(OUT / f"{name}.png", optimize=True)
    make_contact_sheet([n for n, _ in SHOTS]).save(OUT / "contact-sheet.png")
    print(f"Wrote {len(SHOTS)} screenshots + contact-sheet.png to {OUT}")


if __name__ == "__main__":
    main()
