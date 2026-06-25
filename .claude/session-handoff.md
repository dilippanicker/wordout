# Session Handoff

**Last updated:** 2026-06-25
**Session:** v1.0.2 — row duplication root cause found and fixed (plain View + flexShrink:0)
**Model:** claude-sonnet-4-6 → claude-haiku-4-5 (close ritual)
**Status:** v1.0.2 code complete, all 7 commits pushed to origin. Ready to trigger GitHub Actions build.

---

## What was done this session

### Row duplication bug — correct root cause identified and fixed
**`app/(tabs)/index.tsx`** — commit `5d27652`:

Previous session's fix (`23aafbf` — restore `BoardPage` as `Animated.View`) was **wrong**. The bug persisted on web after that fix.

**Real root cause (two-part):**

1. **`boardPage` style had `flex: 1`** — In CSS flexbox, `flex: 1` expands to `flex-grow: 1; flex-shrink: 1; flex-basis: 0`. The `flex-basis: 0` overrides the explicit `width: screenW` on each page. In a scroll container, this causes all N pages to divide the viewport equally (`screenW / N` each), making all boards visible simultaneously. Each submitted guess then appeared N times (once per board).

2. **`BoardPage` as `Animated.View` compounded the issue** — `Animated.View` received `style={[style, animStyle]}` where `style` was already a nested array `[styles.boardPage, { width: screenW, ... }]`. Reanimated on web may not flatten doubly-nested style arrays, silently discarding `flexShrink: 0` and `width: screenW`.

**Fix:**
- Changed `boardPage` from `flex: 1` to `flexShrink: 0` — pages no longer collapse; `width: screenW` is authoritative.
- Changed `BoardPage` back to a plain `<View>` — removes nested style array ambiguity. The `opacity: useSharedValue(1)` animation was a no-op anyway (value never changed).

**Why the Android compositing theory (previous session) was wrong:** The original working commit (`a615ede`) also used `<View>` for board pages with `flex: 1` on `boardPage`. The bug existed on web from the start but was only noticed later. `Animated.View` is not required for correct layout on Android.

---

## All commits this session (across both sessions, now all pushed)

- `23aafbf` — fix: restore Animated.View wrapper (WRONG — superseded by 5d27652)
- `5587946` — docs: add version bumping protocol to CLAUDE.md
- `b0137d1` — v1.0.2: fix Quadout label, add tech words, fix row duplication
- `a0a6c12` — fix: reformat wordlists to pretty-printed JSON
- `5b12f24` — bump version to 1.0.2 (versionCode 3)
- `f8c6e00` — chore: session close (previous session)
- `5d27652` — fix: use plain View for board pages — removes Animated.View style nesting bug (**this is the real fix**)

All pushed to origin (`8205bf0..5d27652`).

---

## Decisions made

1. **Plain `View` is correct for `BoardPage`** — The Android GPU compositing layer theory was debunked. Plain `View` with `flexShrink: 0` on the style works on both platforms. No `Animated.View` needed.

2. **`flex: 1` on `boardPage` was the root cause** — Not `Animated.View` vs `View`. The CSS `flex-basis: 0` expansion of `flex: 1` collapsed page widths in a scroll container.

3. **No version bump needed** — v1.0.2 (versionCode 3) covers all fixes. The additional fix commit is part of the same patch before any build was triggered.

---

## Current state

All code is committed and pushed. No uncommitted changes. No staged files.

Version: `1.0.2` (versionCode 3) in `app.json`.

---

## Exact next step

1. **Verify fix on web first**: `npx expo start --clear` → open localhost:8081 → switch to 4-out → guess RAISE → confirm it appears exactly ONCE per board (swipe between boards to verify)
2. **Trigger GitHub Actions build**: github.com/dilippanicker/wordout → Actions → "Build Android APK" → Run workflow
3. **Test on S24 Ultra**:
   - Multi-board: each guess row appears ONCE (swipe to confirm boards are separate pages)
   - Settings: Game Mode shows "Wordout / 2-out / 3-out / 4-out / 6-out / 8-out"
   - INBOX, ADMIN, DEBUG accepted as valid guesses
   - Win/lose overlays not regressed

---

## Gotchas for next session

- **`boardPage` must use `flexShrink: 0`, NOT `flex: 1`** — `flex: 1` causes `flex-basis: 0` in CSS, which overrides `width: screenW` and collapses all pages into viewport width.
- **`BoardPage` must be a plain `View`** — Do NOT change it to `Animated.View`. The nested style array `[style, animStyle]` where `style` is itself an array causes Reanimated to silently drop layout styles on web.
- **Wordlist format**: always pretty-print (indent=2, one word per line, trailing newline).
- **Settings label change scope**: the `n-out` label change affected ALL board counts (2,3,4,6,8). Verify on device.
- EAS free tier exhausted until July 1, 2026 — use GitHub Actions for all builds.
- `versionCode` is 3. Next build uses versionCode 3. Next RELEASE after that uses versionCode 4.
