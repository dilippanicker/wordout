# Session Handoff — 2026-07-04 (Session 15)

## What Happened This Session

Implemented a first-launch animated tutorial overlay end-to-end (design proposal → confirmation → implementation → browser verification → version bump → release).

**Note:** `/close` was invoked a second time immediately after the first close, with zero code changes in between (`git status` clean, no new commits). This re-run confirmed the working tree was already clean and pushed — nothing below changed as a result. Treat this handoff as still describing Session 15's work.

---

## Files Modified

### `components/TutorialOverlay.tsx` (new)
- Full-screen overlay, same `rgba(0,0,0,0.75)` backdrop convention as the existing end-game overlay
- Scripted, non-interactive demo game: types and flips RAISE → CLOUT → FROST with a fixed, tunable timeline (all timing constants at top of file)
- Legend box (🟩/🟨/⬛) fades in after the RAISE row flips
- Small scale-pulse "win flash" on the FROST row once fully green
- Ends with a "Don't show again" checkbox + green "Got it!" button
- Tapping the backdrop at any point calls `skip()`, which cancels the in-flight sequence (via a `cancelledRef` checked after every `await`) and jumps straight to the end state
- Row rendering reuses `GameBoard.tsx`'s exact idiom: submitted rows render `Tile`/`FlipTile` with a real `TileStatus`, so colours are pulled from the same source of truth as the live game (dark theme + colour-blind mode included) — no hardcoded hex values
- Card background/text use `useTheme()` from `expo-router`, matching `HelpModal.tsx`'s theming pattern

### `store/settingsStore.ts`
- Added `tutorialSeen: boolean` (default `false`, persisted) + `setTutorialSeen(seen)`
- No migration needed — new field, safe default for existing persisted blobs, version stays 1

### `components/HelpModal.tsx`
- Added optional `onWatchTutorial?: () => void` prop
- New "▶ Watch how to play" button rendered at the very top of the modal (only when `onWatchTutorial` is provided) — label text lives in `constants/helpContent.ts` (`WATCH_TUTORIAL_LABEL`) per existing convention
- Tapping it: closes the help modal → `useSettingsStore.getState().setTutorialSeen(false)` → calls `onWatchTutorial()`

### `components/StatsModal.tsx`
- Added optional `onWatchTutorial?: () => void` prop, threaded straight through to its nested `HelpModal` (StatsModal has its own "?" → HelpModal path)

### `app/(tabs)/index.tsx`
- New `showTutorial` state; mount-only effect checks `useSettingsStore.getState().tutorialSeen` (imperative snapshot, same pattern the daily-funnel mount effect already uses) and opens the tutorial if `false`
- New `handleWatchTutorial()` — closes StatsModal (if open) and opens the tutorial; passed as `onWatchTutorial` to both `HelpModal` and `StatsModal` in both the quordle and single-board render branches
- `{showTutorial && <TutorialOverlay onClose={...} />}` rendered alongside `{endGameOverlay}` in both branches

### `constants/helpContent.ts`
- Added `WATCH_TUTORIAL_LABEL = '▶ Watch how to play'`

### `app.json`
- Version bump: `1.5.0` → `1.5.1`, `versionCode` 21 → 22

### `CHANGELOG.md`
- Added `[1.5.1]` entry documenting the tutorial overlay feature

---

## Decisions Made (and deviations from the original spec)

- **Tile colours**: spec listed raw hex values (`#5BA75A`/`#C9A227`/`#3a3a3a`). Reused the existing `Tile` component's `status` prop instead — guarantees exact parity with real game colours, dark theme, and colour-blind mode, avoiding a second source of truth. **Confirmed with user via AskUserQuestion before implementing.**
- **Hydration guard for `tutorialSeen`**: read via synchronous `getState()` on mount, same as the existing daily-funnel effect, rather than adding a `persist.onFinishHydration` guard. This matches the app's already-accepted trade-off (see `_layout.tsx`'s comment about `darkTheme` flashing pre-hydration). Theoretical risk: on a very slow AsyncStorage rehydrate, a returning user could see the tutorial trigger for one frame. **Confirmed with user before implementing.**
- **HelpModal/StatsModal `onWatchTutorial` made optional**: `HelpModal` is also rendered from `app/(tabs)/settings.tsx`, a separate tab route with no access to `index.tsx`'s `showTutorial` state. Rather than build cross-tab plumbing (out of scope, not requested), `onWatchTutorial` is optional and the button simply doesn't render when absent. It IS threaded through `StatsModal` since that's a direct child of `index.tsx` and cheap to wire.
- **State machine implementation**: not a formal reducer — the tutorial script is strictly linear (loop over 3 fixed rows, no branches), so it's one cancellable `async runSequence()` with a `wait(ms)` helper and a `cancelledRef` checked after every `await`. Simpler than a reducer for this shape and consistent with how `GameBoard.tsx` already drives its flip/wave timing off fixed durations rather than a formal state graph.

---

## Current State

- v1.5.1 (versionCode 22) — committed (`831d230`) and pushed to `main`
- Verified end-to-end via headless Playwright against the running `npx expo start --web` dev server (Playwright was installed to `/tmp/pw-verify` for this session only — **not** added to the project's `package.json`; it's not a project dependency)
- All flows confirmed working: full animation sequence with correct tile colours, legend fade-in, win flash, backdrop-skip, checkbox persistence across reload, and the Help modal's "Watch how to play" re-trigger (including closing the help modal and replaying from the start)
- No console/page errors observed in any test run
- `npx tsc --noEmit` clean except the pre-existing, known `new-game.tsx` route-type error (non-blocking, documented in `CLAUDE.md`)
- GitHub Actions build has **not** been triggered for v1.5.1 yet — this is the next step if a build is wanted

---

## Exact Next Steps

1. **Trigger GitHub Actions build** for v1.5.1 (versionCode 22) if a device/Play Store build is wanted — manual trigger from Actions tab per `CLAUDE.md`'s build pipeline section
2. **Device regression test** of the new tutorial overlay on a real Android device (Playwright verification was web-only) — check flip animation smoothness and layout on a real screen size, especially smaller phones
3. Everything else carried over from prior handoffs remains outstanding — see `TODO.md` IMMEDIATE section (Play Console setup, screenshots, feature graphic, device regression checklist for v1.5.0's daily-mode flows)

---

## Known Issues / Gotchas

- **`boardCount` defaults to `4`** in `settingsStore` — never use `boardCount > 1` to detect multi-board mode, use `gameMode === 'quordle'`
- **CECIL** in GB answers list — proper noun, pre-existing
- **`new-game.tsx` TS error** — pre-existing route type mismatch, non-blocking
- **`DAILY_PROGRESSION`** — exported from `helpContent.ts`, not yet wired into HelpModal
- **Android 15 edge-to-edge API** — Play Console warning on release 20, tracked in TODO
- **Tablet / large screen** — orientation lock flagged by Play Console on release 20, tracked in TODO
- **`tutorialSeen` hydration** — read imperatively on mount without waiting for AsyncStorage rehydration (see Decisions above); theoretical one-frame flash risk on slow devices, accepted trade-off
- **`onWatchTutorial` not wired in `app/(tabs)/settings.tsx`** — its `HelpModal` instance has no path back to `index.tsx`'s tutorial state, so "Watch how to play" doesn't appear there (button is hidden when the prop is omitted, by design)
