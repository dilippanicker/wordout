# Session Handoff

**Last updated:** 2026-06-26
**Session:** v1.0.3 — duplicate guess fix, AAB build, versioned releases
**Model:** claude-sonnet-4-6
**Status:** v1.0.3 build in progress (GitHub Actions run 28189682555). User will trigger next build manually after this close.

---

## What was done this session

### Duplicate guess fix (the only real bug)
**`store/gameStore.ts`**, **`store/quordleStore.ts`** — commit `e45911c`:
- Bug: submitting the same word multiple times was accepted (no dedup check).
- Fix: added `guesses.some(g => g.word === currentGuess)` check before accepting. Rejects with `toast: 'Already guessed'` and shake. Placed after word-list check, before hard-mode constraints.
- Applies to both single-board (gameStore) and multi-board (quordleStore).

### AAB added to build pipeline
**`.github/workflows/build-apk.yml`** — commit `93c7da3`:
- Added `eas build --profile production --local --output ./wordout.aab` step after APK.
- AAB uploaded as artifact `wordout-aab` (14-day retention).
- Both APK and AAB attached to GitHub Release.

### Versioned GitHub Releases
**`.github/workflows/build-apk.yml`** — commit `0883c71`:
- Replaced static `latest` tag with versioned tags (e.g. `v1.0.3`) read from `app.json`.
- Release notes extracted from matching `## [VERSION]` section in `CHANGELOG.md` using `awk`.
- Re-running the same version deletes and recreates the release cleanly.
- `releases/latest/download/wordout.apk` and `wordout.aab` still work (GitHub resolves `latest` to the most recent `--latest` release).
- **Note:** build 28189682555 was triggered before this commit — it will still publish as `latest` tag. The versioned release workflow takes effect from the NEXT build.

### Version bump
**`app.json`**: `version` → `"1.0.3"`, `versionCode` → `4` — commit `72f06c4`

### CSS red herring (documented)
Spent significant tokens investigating a supposed web layout bug (`flex:1` → `flex-basis:0` collapsing board pages). The real bug was the duplicate guess logic. The CSS changes (`flexShrink:0`, plain `View` for `BoardPage`) are harmless but fixed nothing observable. Noted in gotchas below.

---

## Commits this session (all pushed)

- `e45911c` — fix: reject duplicate guesses with 'Already guessed' toast
- `93c7da3` — ci: also build production AAB alongside preview APK
- `72f06c4` — bump version to 1.0.3 (versionCode 4)
- `728944f` — docs: correct duplicate bug attribution — game logic not CSS
- `4e8a526` — docs: note token waste on CSS red herring
- `0883c71` — ci: versioned GitHub Releases from app.json + CHANGELOG.md

---

## Current state

Build `28189682555` in progress (~45 min total for APK + AAB).
Version: `1.0.3` (versionCode 4) in `app.json`.
All commits pushed. Nothing staged or uncommitted.

---

## Exact next step

1. Wait for build `28189682555` to complete
2. Test on S24 Ultra:
   - Submit same word twice → rejected with "Already guessed" + shake
   - Multi-board mode: same test
   - Win/lose overlays, Settings labels, INBOX/ADMIN/DEBUG — all not regressed
3. User triggers next build manually (will use versioned release workflow for first time)
4. Play Store submission: upload AAB from `releases/latest/download/wordout.aab`

---

## Gotchas for next session

- **Do not chase CSS layout bugs in the horizontal ScrollView** — the only real multi-board bug this cycle was duplicate guess acceptance (game logic). CSS red herring cost many tokens.
- **`boardPage` uses `flexShrink: 0`** (not `flex: 1`) and `BoardPage` is a plain `View` — harmless changes, leave as-is.
- **Versioned releases**: build 28189682555 still publishes as `latest`. From the next build onward, releases are tagged `v1.0.3`, `v1.1.0` etc. with CHANGELOG notes.
- **EAS free tier** exhausted until July 1, 2026 — use GitHub Actions for all builds.
- **versionCode is 4**. Next build uses versionCode 4 (already set). Build after that needs versionCode 5.
- **Wordlist format**: always pretty-print (indent=2, one word per line, trailing newline).
