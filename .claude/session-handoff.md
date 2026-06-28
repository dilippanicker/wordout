# Session Handoff — 2026-06-28

## What changed this session

### Files modified

**`components/BottomStrip.tsx`** — B1, B9:
- Removed `countdown` prop entirely (countdown no longer shown in footer)
- Game-over state: daily → `[? for help] [spacer] [📊]`; practice/quordle → `[? for help] [spacer] [↺ New Game (green)] [📊]`
- New Game button now styled: green `#5BA75A` background, white text, rounded corners (paddingHorizontal 14, paddingVertical 7, borderRadius 6), `marginRight 10` before the 📊 icon
- Removed `countdownText`, `newGameText`, old `newGameBtn` styles; added `newGameBtn` (green bg) and `newGameBtnText` (white)

**`components/HelpModal.tsx`** — B8, D2:
- Ribbon section: added descriptive paragraph before `RIBBON_ICON_ROWS`: "The Ribbon shows your current mode, difficulty, board indicators, and contextual status (such as the next word countdown when today's game is complete)."
- TOP_ICON_ROWS ◄ ► entry: updated text from "Cycle through board modes (1, 2, 3, 4, 6, 8 boards)" → "Cycle through board counts (Wordout, 2-out, 3-out, 4-out, 6-out, 8-out)"

**`components/GameBoard.tsx`** — B2:
- Replaced `const [waveDone, setWaveDone] = useState(waveShown ?? false)` + sync effect with:
  - `const [waveDoneLocal, setWaveDoneLocal] = useState(false)`
  - `const waveDone = (waveShown ?? false) || waveDoneLocal` — derived directly from prop (no render lag)
  - Reset effect: `useEffect(() => { if (!(waveShown ?? false)) setWaveDoneLocal(false); }, [waveShown])`
- Wave timer effect now calls `setWaveDoneLocal(true)` (was `setWaveDone(true)`)

**`store/quordleStore.ts`** — B3:
- Added `QuordleSnapshot` interface (all game fields except actions and snapshots)
- Added `snapshots: Record<number, QuordleSnapshot>` to `QuordleState` and initialized to `{}`
- Added `switchBoardCount(n: number)` action: saves current board state under current `boardCount` key, then either restores saved state for `n` or starts fresh
- `newGame()` now deletes the snapshot for the current board count (explicit reset)
- Language subscription: now calls `useQuordleStore.setState({ ...initialState(lang, bc), snapshots: {} })` instead of `newGame()` to clear all snapshots

**`app/(tabs)/index.tsx`** — B3, B4, B5, B6, B7, D1:
- **B3**: `cycleTo()` no longer reads `prevBc` or calls `newGame()` — now calls `switchBoardCount(n)` for quordle mode
- **B4+B5+B6**: `handleDifficultyToggle()` rewritten:
  - B6 fix: daily lock condition changed from `dailyStatus === 'playing' || dailyStatus === 'completed'` → `dailyStatus === 'completed' || (dailyStatus === 'playing' && dailyGuesses.length > 0)`
  - B5 fix: added `else if (activeGameStatus !== 'playing')` check → shows "Game complete — start a new game to change difficulty" toast
  - B4 fix: new `applyAndReset()` helper calls `setDifficulty(next)` AND `newGame()` on the active store; both in-progress (via confirmAbandon) and idle paths call it
- **B7**: Practice mode pill order swapped — label text rendered BEFORE the icon square (daily pill unchanged: icon then text)
- **D1**: Startup logic verified as already correct from v1.2.5 — no changes needed
- Removed `countdown={isDaily ? countdown : undefined}` from BottomStrip call

**`app/(tabs)/settings.tsx`** — B3, B4, B5, B6:
- **B3**: `handleBoardCountSelect()` now calls `switchBoardCount(n)` instead of conditionally calling `newGame()`
- Added imports: `useGameStore` from `@/store/gameStore`, `isGameInProgress` + `confirmAbandon` from `@/utils/abandon`
- **B4+B5+B6**: `handleDifficultyChange()` rewritten:
  - B6: Daily check uses `dailyGuesses.length > 0` guard (was already correct here, confirmed)
  - B5: Added checks for practice (`useGameStore.getState().gameStatus !== 'playing'`) and quordle (`useQuordleStore.getState().gameStatus !== 'playing'`) → show lock toast
  - B4: `applyAndReset()` helper calls `setDifficulty(d)` + `newGame()` for practice/quordle; also clears quordle snapshots for all bc via `useQuordleStore.setState({ snapshots: {} })` before `newGame()`
  - Added `confirmAbandon` flow via `isGameInProgress()` check
- `showDiffLockToast()` now accepts optional `msg?: string` parameter; defaults to "Daily locked — next word in HH:MM:SS"

**`app.json`** — version bump:
- `version`: 1.2.5 → 1.2.6
- `versionCode`: 13 → 14

**`CHANGELOG.md`** — new [1.2.6] entry added

---

## Decisions & deviations

- **B2 fix approach**: Instead of syncing `waveDone` state via a `useEffect` (which runs after the render, causing a one-render lag), `waveDone` is now computed inline as `(waveShown ?? false) || waveDoneLocal`. The `waveShown` prop is read directly during render, so there's no lag when switching back to a completed board — the wave guard is true immediately in the first render.

- **B3 snapshot approach**: Per-board-count state is saved in `quordleStore.snapshots` (in-memory only, not persisted). On every board count switch, the current state is snapshotted. Restoring a board count restores its exact game state (guesses, solved status, wave animation flags). `newGame()` (↺ New Game) clears the snapshot for the current bc. Language change clears all snapshots. Difficulty change in settings also clears all snapshots (they're invalid at a new difficulty).

- **B5 lock message**: Used "Game complete — start a new game to change difficulty" as the toast message for practice/quordle completed games (vs. daily's specific countdown message). This was not in the spec but is appropriate UX.

- **B4 + confirmAbandon in settings**: Added abandon confirmation when game is in progress before difficulty change. The spec just said "start a fresh board on difficulty change" but the abandon pattern is consistent with the rest of the app. If game is NOT in progress, still calls `newGame()` to reset to the new difficulty's initial state.

- **D1**: Already implemented correctly in v1.2.5. No changes made.

---

## Current state

All 9 bugs and 2 design updates implemented. TypeScript clean (pre-existing new-game.tsx error only). Version bumped to v1.2.6 (versionCode 14). Changes committed and pushed.

---

## Exact next steps

1. **Build APK** via GitHub Actions (trigger manually from Actions tab) for v1.2.6
2. **Device test** on Samsung S24 Ultra — verify:
   - Footer on completed daily: only [? for help] [📊], NO countdown, NO New Game
   - ↺ New Game button is green with white text (not plain text link)
   - Practice ribbon: "Practice · Easy 🎮" (text first, icon after)
   - Daily ribbon: "📅 Today's · Easy" (icon first — unchanged)
   - Wave animation does NOT re-fire when switching back to solved board
   - Switching 4-out → 2-out → 4-out: 4-out board persists (not cleared)
   - Switching 4-out → Wordout → 4-out: 4-out board persists
   - Difficulty change in practice mode: shows abandon confirm if in progress, resets board on confirm
   - Difficulty change when game is complete (any mode): shows lock toast, no change
   - Daily difficulty: changeable before first guess, locked after first guess submitted
   - Help screen Ribbon section: has description paragraph above icon rows
   - Help screen ◄ ► text: "Cycle through board counts (Wordout, 2-out, 3-out, 4-out, 6-out, 8-out)"

---

## Gotchas

- **B3 snapshots NOT persisted**: Snapshots live in-memory only. If the app restarts, all snapshots are gone. This is intentional (first iteration). The quordle store is not persisted generally.

- **B4 quordle difficulty change clears ALL snapshots**: When difficulty changes in quordle mode, `useQuordleStore.setState({ snapshots: {} })` clears all saved board counts before calling `newGame()`. This is correct — saved games at the old difficulty are invalid.

- **B5 lock interplay with B4**: B5 check runs BEFORE the `applyAndReset` path in both `handleDifficultyToggle` and `handleDifficultyChange`. So completed game → locked (toast) → return. No newGame() is called on a completed game.

- **B6 index.tsx vs settings.tsx**: The settings.tsx `handleDifficultyChange` already had the correct `dailyGuesses.length > 0` guard from v1.2.5. The bug was in `handleDifficultyToggle` in index.tsx (header emoji tap), which used `dailyStatus === 'playing'` without the guesses check.

- **B7 practice pill layout**: When practice is INACTIVE (isDaily=true), the pill only contains the icon (no text). When ACTIVE, text is shown BEFORE the icon. This is purely a flex row child order change — no layout height change since label is inline.

- **switchBoardCount called unconditionally**: Unlike the old `if (n !== prevBc) newGame()` pattern, `switchBoardCount(n)` is now called every time a quordle board count is selected. This is correct — even if `n === current bc`, it's idempotent (saves current state under its own key, then restores that same saved state).
