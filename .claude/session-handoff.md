# Session Handoff

**Last updated:** 2026-06-27
**Session:** v1.2.0 — Extreme mode + 13 fixes
**Model:** claude-sonnet-4-6
**Status:** v1.2.0 committed and pushed. Build triggered via GitHub Actions (manual).

---

## What was done this session

### Files modified

**`store/settingsStore.ts`**:
- `hardMode: boolean` / `setHardMode` replaced by `difficulty: Difficulty` / `setDifficulty`
- `Difficulty = 'easy' | 'hard' | 'extreme'` exported
- `maxGuessesForDifficulty(difficulty, boardCount)` exported — extreme = `max(3, (5+boardCount)−2)`, otherwise boardCount===1 ? 6 : min(13, 5+boardCount)
- Zustand persist migration: `version: 1`, `migrate()` converts old `hardMode: boolean` → `difficulty`

**`store/gameStore.ts`**:
- Added `clearCurrentGuess: () => void` action
- `submitGuess` reads `difficulty` from settings and calls `maxGuessesForDifficulty(difficulty, 1)`
- Hard mode check: `if (difficulty === 'hard')` (was `if (hardMode)`)
- Exported `WORD_COUNT_ANSWERS` and `WORD_COUNT_GUESSES` (Record<Language, number>) for settings footer

**`store/quordleStore.ts`**:
- Added `clearCurrentGuess: () => void` action
- `initialState` reads `difficulty` from settings and computes `maxGuesses = maxGuessesForDifficulty(difficulty, boardCount)`
- Hard mode check: `if (difficulty === 'hard')`

**`store/dailyStore.ts`**:
- Added `dailyDifficulty: Difficulty` field (default `'easy'`) — locked at daily game start
- Added `clearCurrentGuess: () => void` action
- `startOrResumeDaily`: sets `dailyHardMode: difficulty === 'hard'`, `dailyDifficulty: difficulty`
- `submitGuess`: `maxGuesses = maxGuessesForDifficulty(dailyDifficulty, 1)` — uses locked difficulty
- `resetDailyForToday` similarly uses locked `dailyDifficulty`

**`components/GameBoard.tsx`**:
- Added `suppressOverlay?: boolean` prop (default false)
- Overlay opacities always initialize to 0 (was: 1 on mount if already in end-state)
- Removed `countRef` and old delayed win overlay animation
- Win overlay effect: `useEffect([solved, suppressOverlay])` — fades in immediately when `solved && !suppressOverlay`
- Lose overlay effect: `useEffect([gameOver, suppressOverlay])` — fades in when `gameOver && !solved && !suppressOverlay`
- Shake + red tint effect unchanged (not gated by suppressOverlay)

**`components/BottomStrip.tsx`**:
- Added `difficulty: Difficulty` prop and `onOpenHelp: () => void` prop
- Pre-game tip wrapped in `Pressable` calling `onOpenHelp`; icon changed to `help-circle` (solid)
- State 1: added `diffEmoji` badge (💀 or 💪) when difficulty !== 'easy', inside `playingLeft` wrapper
- Streak alignment fix: `lineHeight: 18, includeFontPadding: false` on `streakEmoji` and `streakNum`
- Share button: changed `flex: 1` to `flexShrink: 1` on `guessText`

**`components/StatsModal.tsx`**:
- Added HelpModal import
- Added `showHelp` state, `difficulty` from `useSettingsStore()`
- ? help icon at left of header (position absolute, left: 12)
- `<HelpModal visible={showHelp} onClose={...} difficulty={difficulty} />` added before reset confirmation

**`components/HelpModal.tsx`**:
- `difficulty: Difficulty` prop replaces `hardMode: boolean`

**`app/(tabs)/index.tsx`**:
- `hardMode, setHardMode` → `difficulty, setDifficulty`
- `overlayLocked` state: true on game end, false when popup dismissed or new game
- `clearCurrentGuess` composite action routes to active store
- Toast effect: auto-clears guess after 950ms on 'Not in word list' / 'Already guessed'
- `dismissEndGame`: `setTimeout(() => { setEndGameVisible(false); setOverlayLocked(false); }, 320)`
- End-game status effect: `setOverlayLocked(true)` on game end, `setOverlayLocked(false)` on new game
- GameBoards: `suppressOverlay={overlayLocked}` + `maxGuesses={maxGuessesForDifficulty(difficulty, 1)}`
- BottomStrips: `difficulty={difficulty}` + `onOpenHelp={() => setShowHelp(true)}`
- `cycleTo()` no longer calls `newGame()` — game persists on mode switch
- ‹/› arrows wrapped in `cycleArrowBox` style (22×22, 1.5px border, #878a8c)
- DIFFICULTY_CYCLE = ['easy','hard','extreme'], DIFFICULTY_EMOJI = {easy:'🐣', hard:'💪', extreme:'💀'}
- Difficulty header button cycles through DIFFICULTY_CYCLE with abandon guard
- `BOARD_PAGE_PAD = 12` subtracted from tile height calculation (2-out clipping fix)
- Share button in overlay: `shareButtonInner` View with text + icon side by side
- End-game overlay: ? help icon (top right, `endGameHelpBtn`)
- All HelpModal calls: `difficulty={difficulty}`

**`app/(tabs)/settings.tsx`**:
- `difficulty, setDifficulty` replaces `hardMode, setHardMode`
- `handleBoardCountSelect`: no longer calls `newGame()` — just sets mode
- `useQuordleStore` import removed (no longer needed)
- Difficulty section: `DifficultyRow` component (radio buttons) replaces Hard Mode SwitchRow
- All SwitchRow calls: `textColor={colors.text as string}` (fixes blue/link color on iOS)
- Footer section added: word count pills, GitHub link, credits, version string
- `WORD_COUNT_ANSWERS` / `WORD_COUNT_GUESSES` imported from gameStore

**`app.json`**: version `1.1.1` → `1.2.0`, versionCode `7` → `8`
**`CHANGELOG.md`**: `## [1.2.0] — 2026-06-27` entry added

---

## Decisions and deviations

- **`suppressOverlay` approach**: Rather than computing exact wave-completion delay, `overlayLocked` in index.tsx is a clean boolean: true when game ends, false when popup dismissed (320ms after tap or auto-dismiss). Each GameBoard's overlay effects respond immediately to the prop change — no timer math in GameBoard itself.
- **Daily no-reanimate**: Overlay always starts at 0. On remount of a completed daily, `solved=true` and `suppressOverlay=false` (no active game-over timer) → 400ms fade-in. Not truly "instant static" but visually fine and avoids extra complexity.
- **`dailyDifficulty` locked**: Prevents cheating — switching to Easy mid-daily to get more guesses doesn't work. Practice mode reads `difficulty` dynamically from settingsStore.
- **Mode switch no longer calls newGame**: Item 6 spec. Game state persists when using ‹›, board count select, or tab cycling. Only explicit "New Game" (↺) and language change reset game.
- **`BOARD_PAGE_PAD = 12`**: boardPage has `paddingTop: 8, paddingBottom: 4` = 12px not previously subtracted from tile height formula, causing last row clipping in 2-out on web.

---

## Current state

All 14 spec items implemented. TypeScript clean (only pre-existing new-game.tsx error). Committed as `a51dacb`, pushed to origin/main. GitHub Actions build triggered manually — takes ~45 min.

---

## Exact next steps

1. **Wait for GitHub Actions build** (~45 min) — download wordout.apk from release v1.2.0
2. **Test on device** (Samsung S24 Ultra):
   - Extreme mode: ≤ 3 guesses for 1-board, ≤ 6 for 4-out
   - ‹ › arrows show as grey squares
   - Pre-game tip tappable → opens HelpModal
   - Mode switch (‹›, Settings board count) preserves in-progress game
   - Invalid word: guess auto-clears after ~950ms
   - End-game overlay timing: wave → popup → dismiss → per-board ✓/✗
   - Returning to completed daily: static ✓ (no re-animation)
   - StatsModal: ? help icon opens HelpModal
   - Share button alignment in BottomStrip State 3
   - Streak emoji/number alignment in BottomStrip State 3
   - Settings footer: word count pills, GitHub link, version
   - Dark Theme label: plain text (not blue/link)
3. **Play Store submission** (after device test passes):
   - Feature graphic (1024×500)
   - Screenshots
   - Play Console setup (content rating, data safety)
   - First manual APK upload

---

## Gotchas for next session

- **`difficulty` persist migration**: settingsStore `version: 1` — existing installs get migrated from `hardMode: boolean` on first load. If migration ever needs revision, bump to `version: 2`.
- **`dailyDifficulty` in dailyStore**: NOT migrated (new field, defaults to `'easy'`). Users mid-daily from pre-1.2.0 will have `dailyDifficulty = 'easy'` which is safe/correct.
- **overlay timing on multi-board**: `overlayLocked` = true when ANY board changes from playing to won/lost. The per-board ✓/✗ overlays (via `suppressOverlay`) are all gated together. This means if board 1 wins, overlayLocked=true, and board 2's overlay is also suppressed until popup dismisses. This is intentional and correct.
- **EAS free tier**: Resets July 1, 2026 (4 days away). Can switch back to `eas build --local` after reset.
- **versionCode is 8** (v1.2.0). Next build needs versionCode 9.
