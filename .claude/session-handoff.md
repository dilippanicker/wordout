# Session Handoff — 2026-11-17 (session 44: n-out wrong-row-count fix, v1.9.2 released and live on Play)

## What this session did
- **Bug (user screenshot):** 2-out Extreme showed 7 rows (should be 5). Sequence: finished all daily boards, then pressed 2-out.
- **Root cause:** entering 1-out/Daily calls `setDifficulty()` without touching `quordleStore`, so `settingsStore.difficulty` drifted from the idle n-out board. `switchBoardCount` keyed its snapshot by the settings value: it saved the Easy board under the Extreme key and restored it. Fix (45c3273): `quordleStore.difficulty` field (also in snapshots); `switchBoardCount`/`switchDifficulty`/`switchLanguage` key by the store's own difficulty + boardCount. Regression test in `__tests__/store-invariants.test.ts` fails on the old code.
- **dc3ddf9:** `resyncQuordleToSettings()` rebuilds the store when settingsStore hydrates (store is built at module load, before hydration). Real gap, not the screenshot's cause.
- **v1.9.2 (versionCode 44)** bumped in app.json, CHANGELOG, CLAUDE.md, TODO.md.

## Verification
- Repro test written first (Extreme + 7 rows), then fix; new test fails with the old store, passes with the new. `tsc` clean, jest 82/82. NOT device-verified; no build run.

## Current state
- Version 1.9.2 (versionCode 44) everywhere. Pushed (8781c0d); build run 43830386480 green (37m, CI action bumps verified); GitHub Release v1.9.2 has apk + aab; local `releases/` refreshed and byte-matching.
- User-reported 2026-11-17: v1.9.2 submitted, approved and live on Google Play.

## Exact next step
1. Device check: all daily done -> 2-out at Extreme shows 5 rows (not verified on a device yet).
2. Still open from session 43: Reddit rules / dev.to draft, `reviewLastOutcome` device check, CLAUDE.md ~310 lines vs ~200 budget (needs user OK before extracting).

## Gotchas
- Never key quordle snapshots by `settingsStore.difficulty`; it drifts whenever 1-out/Daily is entered.
- `submitGuess` still reads hard mode from settings difficulty (harmless while boards stay consistent).
- Model check at /open: settings says opusplan; active model not confirmed (`/status` not run).
