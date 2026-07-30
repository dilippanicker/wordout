# Session Handoff — 2026-07-30 (Session 31: Amazon Appstore asset prep, README word-list fix, itch.io/device cleanup confirmed)

## What this session did

**Amazon Appstore icon + screenshot assets generated.** Created `store-assets/amazon/` with `icon-512.png` and `icon-114.png` (resized from `assets/icon.png` via Pillow, RGBA/transparency preserved) and copied the 7 existing itch.io phone screenshots. First pass copied them at their native 1080x2160, but Amazon only accepts screenshots at a fixed set of exact dimensions (800x480 through 2560x1600, portrait or landscape) — 1080x2160 isn't one of them. User chose the letterbox approach (over center-crop or bottom-crop) to avoid losing any gameplay content: re-generated all 7 at 1080x1920 (closest matching width, from rotating 1920x1080) by scaling to fit (960x1920 content) and padding left/right with the app's `#1a1a1a` backdrop color (60px bars each side). Documented the dimension requirement and asset location in CLAUDE.md's Distribution section so it isn't rediscovered next time. No version bump — this was asset-only, no app code touched.

**README.md word-list counts fixed.** Was stale at "~1,500 answer words" / "~9,000 valid guess words" / "over 4 years of daily play", left over from before the word lists were finalized. Updated to match CLAUDE.md's actual current figures: "2,315 US / 2,314 UK answer words — over 6 years of daily play" and "10,484 US / 8,554 UK valid guess words".

**Two carried-over open items closed out by the user (no repo changes needed):** (1) the stale `wordout-latest.apk` duplicate on itch.io's Download page has been deleted manually. (2) Real-device testing of the swipe-to-cycle daily difficulty gesture (shipped in v1.7.0, previously only web-verified) — user confirmed it works correctly on device, all good.

## Current state

- Everything above is committed and pushed to origin/main (3 commits: `d59ba1b` icon/screenshot assets, `a13c0b8` screenshot dimension fix, `e04fde6` README fix, plus this close commit).
- `git status` clean.
- Doc sync clean: `app.json`, `CHANGELOG.md`, and CLAUDE.md's "Current version" line all still agree on **1.7.0 (versionCode 36)** — no version bump this session.
- CLAUDE.md is ~292 lines (within its ~300-line soft budget — no extraction needed).
- `store-assets/amazon/` now holds Amazon-ready icons and screenshots, but nothing has been submitted to the Amazon Appstore yet — that upload itself is still a manual, unstarted step.

## Exact next step

Only one carried-over item remains open, plus whatever Amazon submission work follows from this session's asset prep:

1. **Play Store production-access rejection still unresolved** — rejected 2026-07-20, support ticket pending Google's response (see `wordout-playstore-production-access` auto-memory and CLAUDE.md's Play Store section). No action needed this session beyond waiting for ticket resolution.
2. **Amazon Appstore submission itself** — assets are now prepared in `store-assets/amazon/` (icons + letterboxed screenshots), but the actual Amazon Appstore developer console listing/upload has not been started. Next session should pick this up if the user wants to proceed with Amazon distribution.

## Gotchas

- **Amazon Appstore screenshot dimensions are a fixed exact-match list, not a range** — 800x480, 1024x600, 1280x720, 1280x800, 1920x1080, 1920x1200, 2560x1600 (portrait or landscape rotations of each accepted too). Any other size is rejected outright. If regenerating `store-assets/amazon/` screenshots in the future, target must be one of these exact pairs — currently 1080x1920, letterboxed with `#1a1a1a` bars, not cropped.
- **`store-assets/amazon/` assets are derived, not source** — icons come from `assets/icon.png`, screenshots come from `store-assets/itchio/phone-screen-*.jpg`. Regenerate from those sources if either changes; don't hand-edit the Amazon copies directly.
