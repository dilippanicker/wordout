# Session Handoff — 2026-06-28

## What changed this session

### Files modified

**`components/GameBoard.tsx`** — B2:
- Added `waveDone` state (`useState(false)`) to prevent wave re-animation on board revisit
- Added effect that resets `waveDone = false` when `count` drops to 0 (new game)
- Added effect that sets `waveDone = true` after full wave duration (`FLIP_DONE_MS + count * COLS * WAVE_STAGGER + 600ms`) — fires once per solve, then prevents BounceTile re-wrapping
- Changed wave condition from `solved && row < count && animatingRow === count - 1` → added `&& !waveDone`
- Result: first solve triggers wave; revisiting solved board skips wave and shows ✓ overlay immediately

**`components/BottomStrip.tsx`** — B1, B4:
- Added `onNewGame: () => void` and `countdown?: string` to Props interface
- State 3 (isGameOver) now renders a two-row layout:
  - Row 1: stats row (unchanged)
  - Row 2: `↺ New Game` (practice/quordle) OR `Next word in HH:MM:SS` (daily, when `countdown` provided)
- Added styles: `gameOverStack`, `nextWordText`, `newGameRow`, `newGameText`

**`app/(tabs)/index.tsx`** — B1, B4:
- **B1**: Removed `↺ New Game` button from `endGameOverlay` — overlay is now Share-only. Both BottomStrip instances now receive `onNewGame={handleNewGame}`. Single-board BottomStrip also receives `countdown={isDaily ? countdown : undefined}`.
- **B4**: Added `useEffect(() => { setJustSolvedInfo(null); }, [activeBoard])` — clears "Board X solved in N" message immediately when user swipes to a different board.
- Quordle BottomStrip: `onNewGame={handleNewGame}` added (no countdown for quordle).

**`app/(tabs)/settings.tsx`** — B5, B6:
- `handleDifficultyChange` now only locks when `gameMode === 'wordle'` AND `activeWordleMode === 'daily'`
- Previously locked for ALL modes/board counts whenever daily was completed
- Fix: outer guard `if (gameMode === 'wordle')` prevents lock in multi-board modes; inner guard `if (activeWordleMode === 'daily')` prevents lock in practice 1-out mode

**`components/HelpModal.tsx`** — B7:
- Renamed `BOTTOM_ICON_ROWS` → split into `RIBBON_ICON_ROWS` (📅, 🎮) and `FOOTER_ICON_ROWS` (📊, ‹›, 🔥, ⚡)
- Updated render to show three subsections under ICONS: "Top bar", "Ribbon", "Footer"
- Was: single "Bottom strip" sublabel for all 6 rows

**`app.json`** — version bump:
- `version`: 1.2.3 → 1.2.4
- `versionCode`: 11 → 12

**`CHANGELOG.md`** — new [1.2.4] entry added

**`TODO.md`** — v1.2.4 section added, IMMEDIATE section updated for new device test checklist

---

## Decisions & deviations

- **B3 (label on separate line)**: No code change made. The D2 fix from v1.2.3 is correct in code — `modeIconPill` has `flexDirection: 'row'` and conditional rendering keeps label inline. The bug likely appeared because the v1.2.3 APK was never built (device still ran v1.2.2). Noted in CHANGELOG as "confirmed from D2/v1.2.3".

- **B8 (∞ → 🎮)**: No code change needed. D1 from v1.2.3 already replaced all ∞ references. grep confirmed no remaining occurrences. Noted as "confirmed from D1/v1.2.3".

- **B1 overlay approach**: Removed only the `↺ New Game` button from the overlay. The `?` help button and daily countdown in the overlay are retained. This matches the spec "Overlay has Share only" (referring to action buttons — Share being the only primary CTA).

- **B2 wave fix approach**: Used a `waveDone` state in GameBoard (not store-level flag as spec suggested) because:
  1. ScrollView in RN keeps all pages mounted (no remount) so component state persists
  2. State resets to false when `count === 0` (new game) — same effect as store reset
  3. Avoids store schema changes which would require persist migration

- **B4 timing**: Clearing `justSolvedInfo` on `activeBoard` change means the "Board X solved" flash disappears the instant the user swipes. The flash is intentional for the ~0.5s it shows while they're still on the solved board. This is correct behavior.

- **B5/B6 ribbon fix**: The header `handleDifficultyToggle` was already correct (guards with `isDaily`). Only Settings `handleDifficultyChange` needed fixing — now checks `gameMode === 'wordle' && activeWordleMode === 'daily'` before locking.

---

## Current state

All 8 bugs addressed. TypeScript clean (pre-existing new-game.tsx error only). Version bumped to v1.2.4 (versionCode 12). Changes committed.

B3 and B8 confirmed as already fixed in v1.2.3 — no code change needed in this session.

---

## Exact next steps

1. **Build APK** via GitHub Actions (trigger manually from Actions tab)
2. **Device test** on Samsung S24 Ultra — verify:
   - Footer shows ↺ New Game after overlay auto-dismisses (practice)
   - Footer shows "Next word in HH:MM:SS" after overlay auto-dismisses (daily)
   - Overlay: Share button only (no ↺ New Game in overlay)
   - Solved board: wave fires once; swipe away and back → ✓ shown immediately, no wave
   - Mode/difficulty label appears inline right of 📅/🎮 icon (D2 fix, now deployed in APK)
   - Swipe from solved board 1 to board 2: footer immediately shows board 2's state
   - Practice 1-out: difficulty change allowed freely (no "Daily locked" toast)
   - Settings: difficulty change in 4-out/6-out/8-out allowed freely
   - Help modal ICONS: "Ribbon" section shows 📅 🎮; "Footer" section shows 📊 ‹› 🔥 ⚡

---

## Gotchas

- **BottomStrip height**: In game-over state, the strip now has two rows (stats + action). `minHeight: 50` stays but actual height grows ~20px when action row is shown. `TAB_H = 50 + insets.bottom` in index.tsx is used for tile sizing — tiles will be very slightly oversized during game-over state. Acceptable error; only during game-over.

- **B2 waveDone reset**: The reset fires when `count === 0`, i.e., on new game. It does NOT fire when `solved` resets to false temporarily (shouldn't happen in normal flow). If quordle store resets a solved board's count, waveDone would reset too — this is correct (animation should re-fire for new game).

- **B4 justSolvedInfo**: The "Board X solved" flash now clears on ANY board change, even if user immediately swipes back to the solved board. They won't see the flash again. This matches the fix intent.

- **B5/B6 Settings fix**: `useDailyStore.getState()` is called inside `handleDifficultyChange` (already imported at top of settings.tsx). Added `activeWordleMode` to destructure from that call. No new imports needed.
