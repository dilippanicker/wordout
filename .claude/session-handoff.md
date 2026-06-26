# Session Handoff

**Last updated:** 2026-06-26
**Session:** v1.1.1 — Bug fixes (Round 1 + Round 2) + startup logic + safe area + pre-game tip
**Model:** claude-sonnet-4-6
**Status:** v1.1.1 committed? NO — changes applied, CHANGELOG + app.json updated, but NOT yet committed or pushed.

---

## What was done this session

### Round 1 fixes (completion of prior session's pending work)

**`app/(tabs)/index.tsx`**:
- Hide ▶ indicator in single-board modeIconRow: replaced `modeIconCenter` content with empty `<View style={styles.modeIconCenter} />`
- ∞ tap after completing daily → also calls `useGameStore.getState().newGame()` to start fresh practice
- Hard mode toggle mid-game: wrapped `setHardMode()` in `confirmAbandon` pattern (same as language toggle)
- Added `shareConfirmed={copyConfirmed}` to wordle BottomStrip (was missing from the single-board layout)
- Multi-board active ▶: `squareColor` changed from `darkTheme ? '#ffffff' : '#878a8c'` to always `'#5BA75A'`
- End-game overlay share button: replaced `<Text>Share ↗</Text>` with `<Ionicons name="share-social-outline" />`

**`components/HelpModal.tsx`**:
- ICONS section: TOP_ICON_ROWS updated to reflect new header icons (💪, ↺, ⚙ now each have their own row)
- ICONS section: BOTTOM_ICON_ROWS updated for new bottom strip (📅, ∞, 📊, ‹›)
- 🔥→💪 fix: changed `🐣 🔥` to `💪 🐣` (hard mode emoji consistency)
- Sub-label changed from "Bottom bar" → "Bottom strip"

### Round 2 fixes (this session's main work)

**`app/(tabs)/index.tsx`**:
- Hard mode toggle after abandon: now also calls `newGame()` on the active store (boardCount > 1 → quordleStore, else gameStore) so abandoned game is cleared
- Startup mode logic: `useEffect(fn, [])` on mount — calls `checkAndReset()`, then if daily NOT completed today, switches to Wordout mode + daily active; otherwise keeps persisted settingsStore mode
- `TAB_H` changed from constant `50` to `50 + insets.bottom` for accurate tile sizing with safe area
- modeIconRow: active icon now shows green tint `rgba(91,167,90,0.15)` background in addition to green border/icon color

**`components/BottomStrip.tsx`**:
- Share button: text "Share" + `share-outline` → `share-social-outline` icon only; "Copied ✓" text when confirmed
- Added `useSafeAreaInsets` — applies `paddingBottom: bottomInset` to strip container
- Strip style: `height: 50` → `minHeight: 50` so it expands to accommodate bottom inset
- Pre-game tip: when `gameStatus === 'playing' && currentGuessNum === 0`, shows "📅 Daily · ∞ Practice · ? Help" instead of guess counter; `tipText` style (fontSize 13, opacity 0.6)

**`components/HelpModal.tsx`**:
- 💪/🐣 split into two separate icon rows (were combined on one line)
- Added sun icon row: `<Ionicons name="sunny-outline" />` for light theme (alongside existing moon for dark)
- BOTTOM_ICON_ROWS: 📅 and ∞ now shown in green (#5BA75A) as "active state" examples
- Added `‹ ›` row back to BOTTOM_ICON_ROWS (cycle board modes)

**`components/Tile.tsx`**:
- Absent tile color now dark-mode-aware: `dark ? '#3a3a3c' : '#787c7e'` for both borderColor and backgroundColor

**`app/(tabs)/settings.tsx`**:
- Added `useState`, `Platform` imports; added `HelpModal` import
- Added `showHelp` state
- ? help icon added to header (right side, `position: 'absolute', right: 12`) — opens HelpModal
- Added `headerHelp` style
- Version string: `Platform.OS === 'android'` check — shows build number on Android, omits on web

**`app.json`**: version `1.1.0` → `1.1.1`, versionCode `6` → `7`

**`CHANGELOG.md`**: Added `## [1.1.1] — 2026-06-26` entry

---

## Decisions and deviations

- **Hard mode toggle newGame()**: Calls both conditional branches (boardCount > 1 → quordle, else gameStore). Does NOT reset dailyStore since hard mode lock in daily is intentional (dailyHardMode is set at game start, toggling the global setting doesn't restart the daily).
- **Startup mode logic**: Uses `useEffect(fn, [])` (runs once on mount after hydration). Reads state after `checkAndReset()` so date comparison is always correct. Race condition with AsyncStorage hydration is acceptable — worst case on hydration lag: app opens daily mode (correct for new day anyway).
- **Pre-game tip muted**: `opacity: 0.6` to distinguish from active game info; applies to ALL board counts per spec.
- **TAB_H = 50 + insets.bottom**: Keeps tile sizing correct when bottom strip grows to accommodate nav bar. `insets.bottom` is already subtracted from `totalH`, so this arithmetic is consistent.
- **HelpModal § 8 restriction**: Overridden by explicit user request in v1.1.1 bug fix spec. All icon/text changes in HelpModal are per spec.

---

## Current state

All code changes applied. `app.json` bumped to v1.1.1 (versionCode 7). `CHANGELOG.md` updated.

**NOT YET committed or pushed.** Need to commit and trigger GitHub Actions build.

---

## Exact next steps

1. `git add app.json CHANGELOG.md app/\(tabs\)/index.tsx app/\(tabs\)/settings.tsx components/BottomStrip.tsx components/HelpModal.tsx components/Tile.tsx`
2. `git commit -m "fix: v1.1.1 — bug fixes, startup mode, safe area, pre-game tip"`
3. `git push origin main`
4. Trigger GitHub Actions build (Actions tab → Run workflow)
5. Test on device:
   - First launch: should open Daily mode
   - After completing daily: should restore last-played mode on next launch
   - Bottom strip: pre-game tip shows before first guess
   - Bottom strip: not overlapping nav bar on Android
   - Hard mode toggle mid-game: shows abandon confirm, then starts fresh
   - Settings ? opens HelpModal
   - Share icon shows in bottom strip and end-game overlay

---

## Gotchas for next session

- **Startup mode logic** (`useEffect(fn, [])`) runs AFTER the component mounts. Zustand persist hydration from AsyncStorage is async — if hydration is slow, `lastPlayedDate` might be stale on first render. In practice this is fine (AsyncStorage resolves before useEffect in most cases).
- **TAB_H = 50 + insets.bottom**: This is now dynamic (not a constant). On web, `insets.bottom = 0` so behaviour is unchanged.
- **BottomStrip tip**: Shows only when `currentGuessNum === 0` AND `gameStatus === 'playing'`. Resets naturally on new game since guesses array is cleared. No AsyncStorage needed.
- **Hard mode in daily**: Toggling hard mode during daily still only shows confirm dialog, then toggles the global `hardMode` setting. `dailyHardMode` (stored at game start) is NOT changed — daily game continues with original hard mode. This is correct behaviour.
- **Pre-game tip for multi-board**: Shows "📅 Daily · ∞ Practice · ? Help" even in quordle mode. Per spec "Applies to all board counts". The 📅/∞ part is slightly misleading in multi-board context but acceptable.
- **versionCode is 7** (v1.1.1). Next build needs versionCode 8.
- **EAS free tier** exhausted until July 1, 2026 — use GitHub Actions
