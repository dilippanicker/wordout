# Session Handoff

**Last updated:** 2026-06-25
**Session:** v1.0.3 — duplicate guess fix, AAB build, version bump
**Model:** claude-sonnet-4-6
**Status:** v1.0.3 build in progress (GitHub Actions run 28189682555).

---

## What was done this session

### Duplicate guess fix (game logic bug)
**`store/gameStore.ts`**, **`store/quordleStore.ts`** — commit `e45911c`:
- Bug: the game accepted the same word submitted multiple times (e.g. guessing RAISE five times in a row was allowed).
- Fix: added a duplicate check in `submitGuess` in both stores — if `currentGuess` already exists in `guesses`, reject with `toast: 'Already guessed'` and shake. Check is placed after the word-list check and before hard-mode constraints.

### Web layout improvement (separate issue, not the duplicate bug)
**`app/(tabs)/index.tsx`** — commit `5d27652`:
- `boardPage` changed from `flex: 1` to `flexShrink: 0` — on web, `flex:1` expands to `flex-basis:0` which overrides `width:screenW`, making all board pages visible simultaneously. This was a web-only layout issue; Android/Yoga was unaffected.
- `BoardPage` changed back to plain `View` — `Animated.View` with doubly-nested style arrays caused Reanimated to silently drop layout styles on web.
- **Note:** The "RAISE appearing multiple times" bug the user reported was the duplicate guess logic bug (above), NOT this CSS issue. The CSS fix is a correctness improvement for web layout but was not the user-visible bug.

### AAB build added
**`.github/workflows/build-apk.yml`** — commit `93c7da3`:
- Added `eas build --profile production` step after the APK step.
- AAB uploaded as artifact `wordout-aab` and included in GitHub Release.
- Permanent download link: `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.aab`

### Version bump
**`app.json`**: `version` → `"1.0.3"`, `versionCode` → `4`
**`CHANGELOG.md`**: v1.0.3 entry added

---

## Commits this session (all pushed)

- `5d27652` — fix: plain View for board pages, flexShrink:0 (web layout)
- `e45911c` — fix: reject duplicate guesses with 'Already guessed' toast
- `93c7da3` — ci: also build production AAB alongside preview APK
- `72f06c4` — bump version to 1.0.3 (versionCode 4)

---

## Current state

Build `28189682555` in progress — produces APK + AAB (~45 min).
Version: `1.0.3` (versionCode 4) in `app.json`.

---

## Exact next step

1. Wait for build `28189682555` to complete
2. Download APK from `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk`
3. Test on S24 Ultra:
   - Try guessing the same word twice — should be rejected with "Already guessed"
   - Multi-board: each guess row appears ONCE per board (swipe to confirm)
   - Settings: Game Mode shows "Wordout / 2-out / 3-out / 4-out / 6-out / 8-out"
   - Win/lose overlays not regressed
4. For Play Store: use the AAB from `releases/latest/download/wordout.aab`

---

## Gotchas for next session

- **Duplicate guess bug was game logic, not CSS** — the CSS `flexShrink:0` fix was a separate web layout improvement. Don't conflate the two.
- **`boardPage` must use `flexShrink: 0`, NOT `flex: 1`** — `flex:1` causes `flex-basis:0` in CSS, collapsing page widths on web.
- **`BoardPage` must be a plain `View`** — Animated.View with nested style arrays drops layout styles on web.
- **Wordlist format**: always pretty-print (indent=2, one word per line, trailing newline).
- EAS free tier exhausted until July 1, 2026 — use GitHub Actions for all builds.
- `versionCode` is now 4. Next build must use versionCode 5.
