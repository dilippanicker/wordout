#!/usr/bin/env python3
"""Generate PNG icon assets from icon.svg using cairosvg."""

import os
import cairosvg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG_PATH = os.path.join(ROOT, "assets", "icon.svg")

with open(SVG_PATH, "rb") as f:
    SVG_BYTES = f.read()

# Adaptive icon foreground: same design but transparent background
# (app.json supplies backgroundColor="#121213"; system applies its own mask)
ADAPTIVE_SVG = b"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect x="92" y="432" width="160" height="160" rx="12" fill="#6aaa64"/>
  <text x="172" y="512"
        font-family="'Liberation Sans','Noto Sans',sans-serif"
        font-weight="bold" font-size="88"
        fill="white" text-anchor="middle" dominant-baseline="central">W</text>
  <rect x="262" y="432" width="160" height="160" rx="12" fill="#c9b458"/>
  <text x="342" y="512"
        font-family="'Liberation Sans','Noto Sans',sans-serif"
        font-weight="bold" font-size="88"
        fill="white" text-anchor="middle" dominant-baseline="central">O</text>
  <rect x="432" y="432" width="160" height="160" rx="12" fill="#6aaa64"/>
  <text x="512" y="512"
        font-family="'Liberation Sans','Noto Sans',sans-serif"
        font-weight="bold" font-size="88"
        fill="white" text-anchor="middle" dominant-baseline="central">R</text>
  <rect x="602" y="432" width="160" height="160" rx="12" fill="#6aaa64"/>
  <text x="682" y="512"
        font-family="'Liberation Sans','Noto Sans',sans-serif"
        font-weight="bold" font-size="88"
        fill="white" text-anchor="middle" dominant-baseline="central">D</text>
  <rect x="772" y="432" width="160" height="160" rx="12" fill="#6aaa64"/>
  <path d="M804,510 L830,542 L900,468"
        stroke="white" stroke-width="17"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>"""

EXPORTS = [
    ("assets/icon.png",          SVG_BYTES,    1024, 1024),
    ("assets/adaptive-icon.png", ADAPTIVE_SVG, 1024, 1024),
    ("assets/splash-icon.png",   SVG_BYTES,     512,  512),
    ("assets/favicon.png",       SVG_BYTES,      48,   48),
]

for rel_path, svg, w, h in EXPORTS:
    out_path = os.path.join(ROOT, rel_path)
    cairosvg.svg2png(bytestring=svg, write_to=out_path, output_width=w, output_height=h)
    size = os.path.getsize(out_path)
    print(f"  {rel_path}  {w}×{h}  ({size:,} bytes)")

print("Done.")
