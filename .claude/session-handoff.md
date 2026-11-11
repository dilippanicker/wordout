# Session Handoff — 2026-11-11 (v1.9.0: in-app review prompt)

## What this session did

- Ran `/open` (clean, v1.8.1 everywhere). Then implemented in-app review prompting, user-approved plan (any full win triggers it, not just daily):
  - `expo-store-review` installed (`npx expo install`, ~56.0.4). **Native module → needs a fresh GitHub Actions build.**
  - `settingsStore`: `firstLaunchDate`, `totalWins`, `reviewPromptCount`, `lastReviewPromptDate` (+ `setFirstLaunchDate`, `incrementTotalWins`, `recordReviewPrompt`). No migration.
  - `incrementTotalWins()` called on win in `gameStore`, `quordleStore` (all boards solved only) and `dailyStore` (which doesn't use `statsStore.recordResult`).
  - `utils/reviewPrompt.ts`: pure `isReviewEligible()` + `maybeRequestReview()` (isAvailableAsync → requestReview → record; try/catch, silent).
  - `app/(tabs)/index.tsx`: `firstLaunchDate` set in the mount effect; `dismissEndGame()` fires `maybeRequestReview` 1500ms later when `activeGameStatus === 'won'`; tutorial gate via `showTutorialRef`.
  - `app/(tabs)/settings.tsx`: Android-only "Rate Wordout ↗" footer link to the Play listing.
  - `__tests__/review-prompt.test.ts` (12 tests). Commit `3a3e0aa`.
- Bumped to **v1.9.0 (versionCode 42)** (minor: new feature + native module) in app.json, CHANGELOG.md, CLAUDE.md "Current version". CLAUDE.md gained a "Review Prompt" section and settingsStore field note.

## Verification

- `tsc --noEmit` clean; jest 71/71 pass (12 new).
- Web dev server: loads, no console errors, `firstLaunchDate` written on mount, Settings shows GitHub link but no Rate row.
- NOT verified: the actual Play review dialog (needs a Play-installed build; Play's quota can also suppress it). Sideloaded APKs (itch.io/GitHub) get `isAvailableAsync() === false` and silently skip. Win-triggered firing path (dismissEndGame → timer) is not exercised by any test or live run.

## Current state

- Version **v1.9.0 (versionCode 42)** across app.json, CHANGELOG.md, CLAUDE.md, this file.
- Commits pushed to origin/main at user's request (see TODO session 40). **No build triggered yet** — v1.9.0 APK/AAB does not exist until `/release` / `build-apk.yml` runs.
- CLAUDE.md is ~308 lines (soft budget ~200). Extraction candidates: itch.io bullets under Distribution, Play Store history bullets → REGRESSION_TRAPS.md. Proposed to the user at /open; not done.

## Exact next step / open items

1. Run `/release` to build v1.9.0 (version already bumped/confirmed — release skill should not re-bump). After build: `gh release download` to refresh `releases/wordout-latest.*`; upload AAB to Play closed testing.
2. Device-test on a Play-installed build: after ≥5 wins and ≥3 days, a full win should show the review sheet ~1.5s after the overlay closes. Also check Rate Wordout row opens the Play listing.
3. Still open from before: device-verify streak badge and dead-end toast; delete stale `wordout-latest.apk` on itch.io; Play production-access rejection unresolved.
4. Optional: trim CLAUDE.md (see above).

## Gotchas

- Any new win path must call `settingsStore.incrementTotalWins()` or it silently stops counting toward the review gate.
- First-launch date for existing users is set on first launch after updating, so everyone waits 3 days.
- Model check at `/open` could not confirm opusplan; `/status` not run.
