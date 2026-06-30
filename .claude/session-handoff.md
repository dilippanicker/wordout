# Session Handoff — 2026-06-30 (Session 11)

## What Happened This Session

Device testing revealed three bugs in daily mode. All fixed. Also added StatsModal empty state.

---

## Files Modified

### `app/(tabs)/index.tsx`

**Bug 1 — startup funnel missing `solved` check (lines ~291–295):**
- Old: `games.easy.status === 'completed' && games.hard.status === 'available'`
- New: `games.easy.status === 'completed' && games.easy.solved && games.hard.status === 'available'`
- Same fix applied to the Hard → Extreme branch
- Root cause: `status === 'completed'` is true for both wins AND losses. The funnel was advancing to the next difficulty even when the previous one was lost (e.g. Easy won, Hard lost → funnel routed to Extreme on restart). This also triggered `startOrResumeDailyGame('extreme')` which transitioned Extreme to 'playing', making it appear in the accessible cycle list.

**Bug 2 — no feedback when tapping difficulty icon in dead-end state:**
- Added early-return with `showSystemToast` in `handleDifficultyToggle` when `accessible.length === 1` and the single entry is `completed` with `solved === false`
- Toast text: `"🐣 lost · can't play 💪"` or `"💪 lost · can't play 💀"`
- Only fires in the dead-end case (lost the only accessible difficulty). Silent cycling when multiple difficulties are accessible is unchanged.

### `components/StatsModal.tsx`

**Bug 3a — StatsModal tab click was mutating `activeWordleMode` store:**
- Removed `setActiveWordleMode` from store destructure
- Added local `modalModeTab` state, initialized from store, synced on `visible → true`
- Tab button `onPress` now calls `setModalModeTab` (local) instead of `setActiveWordleMode` (store)
- Root cause: clicking "Practice" in the stats modal was persisting `activeWordleMode = 'practice'` to AsyncStorage, so the next open always showed Practice tab

**Bug 3b — `dailyDiffTab` not syncing to active difficulty on open:**
- `useEffect` on `[visible]` reads `useDailyStore.getState()` imperatively (not from closure)
- Root cause: `useState` initial values and effect closures are captured at mount time, before Zustand's AsyncStorage rehydration completes. Imperative `getState()` bypasses this.

**Critical gotcha — `isQuordle` was `gameMode === 'quordle' || boardCount > 1`:**
- `boardCount` defaults to `4` in `settingsStore` initial state (not `1`)
- `boardCount > 1` was therefore always `true` for any user who never explicitly switched board counts
- `isQuordle = true` → `showingDaily = false` → Daily tab hidden → modal always showed Practice/4-out
- Fixed: `isQuordle = gameMode === 'quordle'` only. `gameMode` is the authoritative field.

**StatsModal header title:**
- Was: `STATISTICS · {boardCountName(boardCount)}` → always "STATISTICS · 4-out" for default users
- Now: `STATISTICS · {isQuordle ? boardCountName(boardCount) : 'Wordout'}`

**Empty state when `totalGames === 0`:**
- Daily sub-tab: `"Play your first Easy/Hard/Extreme for stats"` (uses `DIFF_LABEL[difficulty]`)
- Practice: `"Play your first Wordout/2-out/…/8-out for stats"` (uses `boardCountName(boardCount)`)
- Replaces StatGrid + DistChart when no games played yet

---

## Decisions Made

- **`isQuordle` uses `gameMode` only**: `boardCount > 1` removed entirely from StatsModal. `gameMode` is set to `'quordle'` by `cycleTo()` whenever `boardCount > 1`, so it's the authoritative source. Checking `boardCount` independently was redundant and broken by the `4` default.
- **Imperative `getState()` in useEffect**: Preferred over adding `activeWordleMode`/`activeDailyDifficulty` to deps array, which would re-sync tabs every time the store changes mid-session (e.g. switching modes while modal is open). Firing only on `visible` change is the correct intent.
- **Bug 2 toast only on dead-end**: Per spec — no toast when multiple difficulties are accessible (screen change is the feedback). Only fires when `accessible.length === 1` and that entry was lost.

---

## Current State

- All 5 fixes committed and pushed to `main` (commits `db60bbd` → `eb765a7`)
- v1.4.0 is the current version (versionCode 19) — no version bump needed for bug fixes (these will ship in a patch v1.4.1 or alongside next feature)
- v1.4.0 GitHub Actions build completed (run ID 28424810118) — APK/AAB available
- Device testing partially done: bugs found and fixed, but full regression checklist not yet completed

---

## Exact Next Steps

1. **Re-test on device** (Samsung S24 Ultra) with the fixes:
   - Win Easy, lose Hard, force-close, reopen → should land on Hard (not Extreme)
   - Lose Easy, tap difficulty emoji → should show "🐣 lost · can't play 💪" toast
   - Open Stats modal while on daily Hard → should show Daily tab / Hard sub-tab
   - Stats modal header → should show "STATISTICS · Wordout" (not "4-out")
   - Stats modal with no games played → empty state message shown
2. **Full regression checklist** from TODO.md (wave animations, popup timing, board persistence)
3. **Trigger new build** if device tests pass — patch release v1.4.1 or bundle with next feature
4. **Play Console upload** — upload AAB to internal testing track
5. **CECIL wordlist cleanup** — remove proper noun from `assets/wordlists/answers_en_us/gb.json`
6. **Wire DAILY_PROGRESSION** into HelpModal (low priority)

---

## Known Issues / Gotchas

- **`boardCount` defaults to `4`** in `settingsStore` initial state — any `isQuordle` check that uses `boardCount > 1` will be wrong for default users. Use `gameMode === 'quordle'` only.
- **CECIL in GB answers list** — proper noun, pre-existing issue
- **`new-game.tsx` TS error** — pre-existing route type mismatch, non-blocking
- **`DAILY_PROGRESSION` unused** — exported from `helpContent.ts`, not yet in HelpModal
