# Session Handoff — 2026-06-30 (Session 9)

## What Was Built

v1.4.0 — per-difficulty daily games. This is the largest architecture change since the daily mode was introduced.

---

## Files Modified

### `store/dailyStore.ts` — complete rewrite
- New `DailyGameState` interface with `status`, `guesses`, `currentGuess`, `solved`, `waveShown`, `celebrationShown`, `lastWinDate`, `stats`
- Top-level state: `games: { easy, hard, extreme }` (replaces flat `dailyStatus`/`guesses`/etc.), `activeDailyDifficulty: Difficulty`, `dailyAnswers: { easy, hard, extreme }`
- `getDailyAnswers(language)` — UTC-midnight seed via `Math.imul(dayMs, 2654435761)`, bit-shifted to produce 6 indices; Easy=indices[0], Hard=indices[1], Extreme=indices[2]. Three different words every day.
- `startOrResumeDailyGame(difficulty)` — starts game for given difficulty only if status === 'available'; computes+stores all three answers at once; dev-mode console.log of all three words
- `submitGuess()` — uses `dailyAnswers[activeDailyDifficulty]` (not shared answer)
- Hard mode constraint enforcement: only when `activeDailyDifficulty === 'hard'`
- `checkAndReset()` — streak miss detection via `lastWinDate vs yesterday`; resets all three games; resets `activeDailyDifficulty` to 'easy'
- Persist `version: 2` with two-level migration: v0 (v1.3.0 flat → games+answers), v1 (interim v1.4.0 `dailyAnswer` → `dailyAnswers`)
- Actions: `setActiveDailyDifficulty`, `setWaveShown(diff, v)`, `setCelebrationShown(diff, v)`, `setCurrentGuess`, `resetDailyStats`

### `store/gameStore.ts`
- Added `PracticeSnapshot` interface and `snapshots: Record<string, PracticeSnapshot>` (in-memory, not persisted)
- Added `switchDifficulty(newDiff)` — snapshots current state under current difficulty key, restores existing snapshot or starts fresh game; mirrors quordleStore.switchBoardCount pattern
- `newGame()` now clears `snapshots: {}`
- Added `Difficulty` to settingsStore imports

### `utils/abandon.ts`
- `isGameInProgress()` now reads `games[activeDailyDifficulty]` from new daily store shape

### `components/BottomStrip.tsx`
- Added `playNowLabel?: string | null` and `onPlayNow?: () => void` props
- Game-over row for daily mode: renders green "💪 Unlocked! Play Now" / "💀 Unlocked! Play Now" button when next difficulty is unstarted and current was won

### `components/StatsModal.tsx`
- Daily tab now has per-difficulty sub-tabs (🐣 Easy / 💪 Hard / 💀 Extreme)
- `dailyDiffTab: Difficulty` useState controls which sub-tab is shown
- `DailyDiffSection` component renders StatGrid + DistChart for selected difficulty with correct maxGuesses per difficulty
- Replaced single `dailyStats` with `games: dailyGames` from store

### `app/(tabs)/index.tsx` — extensive changes
- **Startup funnel**: after `checkAndReset()`, routes to next unplayed daily difficulty (Easy available → Easy; Easy completed & Hard available → Hard; Hard completed & Extreme available → Extreme; else restore persisted)
- **Daily active diff**: `activeDailyDiff = dailyStore.activeDailyDifficulty`, `activeDailyGame = dailyStore.games[activeDailyDiff]` used throughout
- **Answer**: `isDaily ? dailyStore.dailyAnswers[activeDailyDiff] : wordleStore.answer`
- **Ribbon**: `Today's · Hard 💪` / `Next word in HH:MM:SS 💪` (per active difficulty)
- **GameBoard key**: `daily-${activeDailyDiff}` (forces remount on difficulty switch)
- **Celebration overlay**: changed outer `Pressable` → `TouchableOpacity activeOpacity={1}`; added `e.stopPropagation?.()` to Share button to prevent double-dismiss
- **Peek animation**: after daily win, header difficulty emoji scales 1→1.7 briefly showing next difficulty (🐣→💪 or 💪→💀), then back to 1; `peekScale` sharedValue + `peekDiffEmoji` state; wired into `renderHeader` via `diffPeekStyle`/`diffPeekEmoji` props; triggered from `dismissEndGame()` callback
- **Play Now label**: `${emoji} Unlocked! Play Now` (not just `${emoji} Play Now`)
- **Difficulty toggle (daily)**: accessible-list approach — builds list of reachable difficulties, cycles within it, NO toasts. List built by: include Easy always (prevWon=true seed); add Hard if Hard is playing/completed OR Easy was won; add Extreme if Extreme is playing/completed OR Hard was won. Wrap within list.
- **Difficulty toggle (practice/quordle)**: single-board practice uses `switchDifficulty(next)` + `setDifficulty(next)` — no lock, no confirm; quordle retains lock if game complete + confirmAbandon
- **B3 cleanup effect**: includes `dailyStore.activeDailyDifficulty` in deps
- **streakEmoji**: `${DIFFICULTY_EMOJI[activeDailyDiff]}🔥` for daily

### `app/(tabs)/settings.tsx`
- `handleDifficultyChange` for practice wordle: now calls `useGameStore.getState().switchDifficulty(d)` + `setDifficulty(d)` — no lock check, no toast, no confirm dialog
- Quordle in settings retains lock + confirmAbandon

---

## Decisions Made

**Per-difficulty word selection**: UTC-midnight seed via Math.imul (not getDailyIndex). Chosen because `getDailyIndex` gives same word for all three difficulties. Today's words (GB list): easy=RINSE, hard=CECIL (note: CECIL is a proper noun in the GB list — pre-existing word list issue, not caused by this change), extreme=EXIST.

**No "Win X first" toasts**: Final design removes them entirely. Gate logic is purely structural (accessible list boundary). Gate toasts only fired when the path to a difficulty was permanently closed (prerequisite lost) — but even that was removed in the final rewrite. The accessible list is the gate.

**TouchableOpacity for overlay**: Changed from Pressable because on web, child Views can swallow touches without bubbling to parent Pressable. TouchableOpacity is more reliable for full-screen tap targets.

**Practice difficulty lock removed**: Per spec — treat difficulty switch like board count switch. Snapshots capture completed games so switching back restores state. No confirm dialog.

**Persist version 2**: Necessary because we changed `dailyAnswer: string` → `dailyAnswers: { easy, hard, extreme }`. Two-level migration handles both v1.3.0 users (version 0) and any dev installs of interim v1.4.0 (version 1).

---

## Current State

- All v1.4.0 implementation committed (10 commits) and on main
- NOT yet pushed to remote
- NOT yet tested on web
- NO version bump yet (still at v1.3.0 / versionCode 18)

---

## Exact Next Steps

1. **Push to remote**: `git push origin main`
2. **Test on web** (`npx expo start`):
   - Daily mode loads correctly on cold start
   - Easy daily plays to completion (win + lose paths)
   - After Easy win: 💪 Unlocked! Play Now appears in footer
   - Tapping Play Now starts Hard daily
   - Header emoji peek animation fires after Easy win dismissal
   - Difficulty emoji cycling works: Easy→Hard (after win), Hard→Easy (wraps if Extreme locked)
   - Stats modal shows 🐣/💪/💀 sub-tabs with correct distributions
   - Streak displayed as `🐣🔥N` for daily
   - Practice difficulty cycling: no lock, snapshots preserve completed games
   - Celebration overlay: tap anywhere to dismiss
3. **Version bump**: propose v1.4.0 (versionCode 19)
4. **Update CHANGELOG** with v1.4.0 entry
5. **Commit + push** version bump
6. **Trigger GitHub Actions build**

---

## Commits This Session (10 total)

1. `0fb7968` — feat: v1.4.0 daily store — per-difficulty games with gate logic
2. `16e0dac` — feat: snapshot-based difficulty switching for practice mode
3. `7f9697a` — fix: update isGameInProgress for v1.4.0 daily store shape
4. `ff0733d` — feat: add Play Now button to footer for daily difficulty progression
5. `2195ebe` — feat: per-difficulty sub-tabs in daily stats modal
6. `f811a8f` — feat: snapshot-aware difficulty switching in settings
7. `888cf02` — feat: v1.4.0 game screen — per-difficulty daily, startup funnel, peek animation
8. `d24cdce` — fix: correct daily difficulty gate logic
9. `585ba5e` — fix: rewrite daily difficulty cycle with accessible-list logic

## Known Issues / Gotchas

- **CECIL in GB word list**: index 215 in answers_en_gb.json is "cecil" (proper noun). Pre-existing issue in word list, not introduced by v1.4.0. US list gives CEASE at the equivalent index.
- **`new-game.tsx` TS error**: pre-existing route type mismatch, non-blocking, documented in CLAUDE.md
- **Peek animation closure**: `dismissEndGame` captures `isDaily`/`activeDailyDiff`/`activeDailyGame` from the render at overlay-show time (not dismiss time). This is correct — we want to peek based on the game that was just completed. B3 cleanup effect prevents stale animation from firing after mode switch.
