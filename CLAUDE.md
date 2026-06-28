# Wordout — React Native (Expo)

## Stack
- Expo SDK ~56.0.12, React Native 0.85.3 (file-based routing via Expo Router)
- TypeScript ~6.0.3
- Zustand v5.0.14 with `persist` middleware (AsyncStorage)
- react-native-reanimated 4.3.1 for tile flip + shake animations
- react-native-safe-area-context, @expo/vector-icons (Ionicons)

## Commands
- `npx expo start` — web dev server (port 8081)
- `npx expo start --android`

## Word lists
- `assets/wordlists/answers_en_us/gb.json` — ~1,500 curated answers
- `assets/wordlists/guesses_en_us/gb.json` — ~9,000 valid guesses
- No plurals, no proper nouns, no 3rd-person verb forms
- Bundled JSON, not fetched at runtime

---

## Architecture

### Routing — `app/`
- `_layout.tsx` — root Stack + ThemeProvider (light/dark driven by `settingsStore.darkTheme`)
- `(tabs)/_layout.tsx` — 3-tab layout:
  - **New Game** (refresh icon) — action tab; `tabPress` prompts to abandon if game in progress, then calls `newGame()` on both stores, never navigates away
  - **Wordout / mode name** (grid/apps icon) — tapping while on this tab cycles through all board counts (1→2→3→4→6→8→1), starts a new game, and updates the label; coming from another tab just navigates back without cycling; `tabBarButton: NoFocusTabButton` on all three tabs to prevent focus stealing on web
  - **Settings** (gear icon) — badge dot when stats update
- `(tabs)/index.tsx` — game screen (renders Wordout or multi-board based on `gameMode`)
- `(tabs)/settings.tsx` — settings + stats; GAME MODE segmented control drives `boardCount` + `gameMode`
- `(tabs)/new-game.tsx` — dummy redirect to `/(tabs)/`

### Stores — `store/`

**`settingsStore.ts`** — persisted (`wordle-settings`, persist `version: 1`):
- `language: Language`, `difficulty: Difficulty`, `darkTheme`, `colorBlindMode`
- `Difficulty = 'easy' | 'hard' | 'extreme'` — exported type
- `maxGuessesForDifficulty(difficulty, boardCount)` — exported function: extreme = `max(3, (5+boardCount)−2)`, otherwise boardCount===1 ? 6 : min(13, 5+boardCount)
- Zustand persist migration: converts old `hardMode: boolean` → `difficulty` on first load after upgrade
- `gameMode: 'wordle' | 'quordle'`
- `boardCount: BoardCount` (1 | 2 | 3 | 4 | 6 | 8, default 4)
- `BOARD_COUNTS = [1,2,3,4,6,8]`, `BoardCount` type
- `boardCountName(n)` → `'Wordout' | '2-out' | '3-out' | '4-out' | '6-out' | '8-out'`

**`gameStore.ts`** — Wordout logic (guesses count via `maxGuessesForDifficulty`):
- Resets only on language change (subscription watches `language` only)
- `recordResult(won, guessCount, 'wordle')` — modeKey is always `'wordle'`
- `clearCurrentGuess: () => void` — no longer called automatically; user backspaces manually after invalid-word shake (E1, v1.2.2)
- `waveShown: boolean` — persists whether the win-wave animation has been shown; `setWaveShown(v)` — reset to false in `newGame()`; prevents re-animation on daily→practice→daily mode switch
- `WORD_COUNT_ANSWERS: Record<Language, number>` — exported (was used in settings footer, now unused there)
- `WORD_COUNT_GUESSES: Record<Language, number>` — exported (was used in settings footer, now unused there)

**`quordleStore.ts`** — multi-board logic:
- `boardCount: number`, `maxGuesses = maxGuessesForDifficulty(difficulty, boardCount)`, `answers: string[]`, `solvedBoards: boolean[]` — all dynamic
- `clearCurrentGuess: () => void`
- `waveDoneBoards: boolean[]` — per-board wave-shown flags; `setWaveDone(boardIndex)` sets one flag; reset to all-false in `newGame()` via `initialState()`
- `QuordleGuess.boardResults: LetterResult[][]` — one array per board (not a 4-tuple)
- `initialState(language, boardCount)` picked at game start via Fisher-Yates shuffle
- Subscription watches `language` only; `boardCount` changes handled explicitly in `settings.tsx`
- `recordResult(won, guessCount, String(boardCount))` — modeKey is board count as string

**`statsStore.ts`** — persisted (`wordle-stats`):
- `byMode: Record<string, BoardStats>` — keyed by `'wordle'` or `String(boardCount)`
- `BoardStats`: `totalGames`, `wins`, `currentStreak`, `maxStreak`, `guessCounts: Record<string, number>`
- `emptyBoardStats()` exported for default value
- `recordResult(won, guessCount, modeKey)`, `clearSettingsBadge`, `resetStats` (clears all modes)

**`dailyStore.ts`** — persisted (`wordout-daily`), NEW in v1.1:
- `DAILY_EPOCH = new Date('2026-01-01').getTime()` — Daily #1
- `getDailyIndex()` → `floor((Date.now() - DAILY_EPOCH) / 86400000)`
- `getDailyAnswer(language)` → `ANSWERS[language][dailyIndex % length]`
- `lastPlayedDate: string`, `dailyStatus: 'available'|'playing'|'completed'`
- `dailyGuesses: GuessResult[]`, `dailyAnswer: string`, `dailySolved: boolean`, `dailyHardMode: boolean`
- `dailyDifficulty: Difficulty` — locked at game start, prevents switching to Easy mid-daily for more guesses
- `activeWordleMode: 'daily'|'practice'` — controls single-board sub-mode
- `stats: BoardStats` — daily-specific stats (separate from practice stats in statsStore)
- `waveShown: boolean` — persists whether win-wave has been shown for today's daily; `setWaveShown(v)` — reset to false in `startOrResumeDaily()`, `resetDailyForToday()`, `checkAndReset()` (new day)
- `checkAndReset()` — resets to 'available' if lastPlayedDate !== today; call on focus
- `startOrResumeDaily()` — no-op if status !== 'available'; sets playing with today's word; locks `dailyDifficulty`
- `resetDailyForToday()` — restart same-day (same word) with current difficulty setting
- `resetDailyStats()` — clear daily stats only (called alongside statsStore.resetStats)
- `clearCurrentGuess: () => void`
- evaluateGuess + checkHardModeConstraints duplicated here (intentional — can't touch gameStore schema)

### Abandon guard — `utils/abandon.ts`
`isGameInProgress()` reads the active store imperatively (`getState()`) — no subscription needed. Checks `activeWordleMode` for single-board: daily → `dailyStatus === 'playing' && dailyGuesses.length > 0`; practice → `gameStore` check; multi-board → `quordleStore` check.  
`confirmAbandon(onConfirm)` shows `Alert.alert` on Android/iOS, `window.confirm` on web. Called before: ↺ New Game header button, ‹/› mode arrows, language flag toggle, **hard mode toggle (💪/🐣)**.

**Difficulty toggle mid-game**: after abandon confirmed, calls `setDifficulty()` AND calls `newGame()` on the active store (boardCount > 1 → quordleStore; else → gameStore). Does NOT reset dailyStore — daily mode uses `dailyDifficulty` locked at game start.

**Key subscription rule**: `gameStore` and `quordleStore` subscriptions call `newGame()` on `language` change only. Board count changes (`settings.tsx → handleBoardCountSelect`, `index.tsx → cycleTo`) call `quordleStore.newGame()` ONLY when `n !== quordleStore.boardCount` — completed boards persist on mode switch back to same count (B6, v1.2.5). Switching to Wordout (`n === 1`) does NOT call `gameStore.newGame()` — practice board persists.

### Components — `components/`

**`GameBoard.tsx`** — dual API:
- Wordle mode: `guesses?: GuessResult[]` (pre-merged word + results)
- Quordle mode: `words?: string[]` + `boardResults?: LetterResult[][]` (shared words, per-board colors passed separately)
- Common: `currentGuess`, `tileSize` (default 60), `shakeKey`, `maxGuesses` (default 6), `solved`, `gameOver`, `answer`, `label`
- `suppressOverlay?: boolean` (default false) — when true, win/lose overlay is hidden; set from parent's `overlayLocked` state
- `waveShown?: boolean` — store-level flag from parent (gameStore/dailyStore/quordleStore); synced to local `waveDone` state via `useEffect([waveShown])`; prevents re-animation when switching modes and returning to a solved board
- `onWaveDone?: () => void` — called after wave animation completes; parent persists flag to store
- `count` derived from `words.length ?? guesses.length` — drives animation tracking
- No border on board (removed in v1.0.1 — green solved border looked ugly)
- Win overlay: `rgba(0,0,0,0.3)` dim + 80px green ✓; fades in after wave animation completes (timestamp-based delay — see B7 below); opacities always initialise to 0
- Lose overlay: board shakes (3×, 14px, 910ms) + red tint flash (separate from overlay — not gated by suppressOverlay); dim + 80px red ✗ + `answer` word fades in after shake completes (timestamp-based delay)
- Wave animation fires on ALL tiles (left→right, top→bottom, 80ms stagger `WAVE_STAGGER`) when `solved && animatingRow === count - 1 && !waveDone`; `animatingRow` guard prevents replay on remount; `waveDone` syncs from `waveShown` prop on mount and prop change
- **Wordle mode must pass `solved={gameStatus === 'won'}`** — previously missing, was breaking win-row bounce

**Overlay timing pattern** (v1.2.2, updated v1.2.4): One suppression boolean in index.tsx:
- `overlayLocked` — true while end-game popup is visible (all boards suppressed together); false 320ms after popup dismissed
- `suppressOverlay={overlayLocked}` passed to all GameBoards
- Result: wave → popup → dismiss → per-board ✓/✗ overlay
- "Continue →" button removed in v1.2.2 (was `boardOverlayDismissed` state)
- **All modes auto-dismiss** after 3s via `useEffect([endGameVisible])` — separate effect fires when overlay becomes visible, starts 3000ms timer; cleanup cancels if dismissed manually first (post-test fix B4)
- **Overlay content (v1.2.5)**: Share button only (no ↺ New Game in overlay). After overlay dismisses, BottomStrip shows single-row `[? for help][📊][↺ New Game]` (practice/quordle) or `[? for help][📊][countdown]` (daily). Stats row removed from footer in v1.2.5.

**End-game overlay structure** (post-test fix for B5): Two-section layout inside `endGamePressable`:
1. `endGameHelpRow` — full-width `View` with `alignItems: 'flex-end'`; contains `?` help Pressable at right edge
2. `endGameContent` — `flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: insets.bottom + 24` (inline, dynamic — static 24 was insufficient on Android with nav bar); contains emoji, message, word, buttons
`endGamePressable` now uses `flexDirection: 'column'` only (no `justifyContent: 'center'` at top level).
The `?` button is NO LONGER `position: 'absolute'` — it's a normal flex child. This prevents Android rendering issues where absolute children of an absoluteFill Pressable sometimes don't render.

**B7 — per-board overlay timing via timestamps** (v1.2.2): `GameBoard` uses two refs to track when `solved`/`gameOver` first became true:
- `solvedTimestampRef = useRef(solved ? 0 : -1)` — 0 = already solved on mount (remount case), -1 = not yet solved
- `lostTimestampRef = useRef((gameOver && !solved) ? 0 : -1)`
- Two tracking effects update the refs when `solved`/`gameOver` change
- Win overlay effect: `elapsed = Date.now() - solvedTimestampRef.current`; if `elapsed < waveDuration`, delays overlay by `waveDuration - elapsed`; if `elapsed ≥ waveDuration` (popup dismiss / remount), shows immediately
- Lose overlay effect: same pattern with `shakeDuration = FLIP_DONE_MS + 7*130 + 300 ≈ 2380ms`
- `ts <= 0` (0 = remount) sets elapsed=Infinity → always immediate show

**`Tile.tsx`** — `margin: 2` around each tile (so each row = `tileSize + 4` px tall). Color blind: correct=🟧, present=🟦. Absent tile: `dark ? '#3a3a3c' : '#787c7e'` (dark-mode-aware since v1.1.1).

**`FlipTile.tsx`** — flip animation on guess submission, 180ms stagger per column. Each tile flips in 400ms (200ms front collapse + 200ms back reveal). `Extrapolation.CLAMP` on both `interpolate()` calls prevents back face extrapolating to −180° before flip starts (web black flash fix).

**`Keyboard.tsx`** — key height 60px, row gap 8px. Colors reflect best result per letter across all boards in multi-board mode.

**`HelpModal.tsx`** — sections: rules, EXAMPLES (3 tiles), MULTI-BOARD MODE, BOARD INDICATORS (5 rows with rendered indicator shapes), HARD MODE (conditional), ICONS. ICONS has three sub-sections: "Top bar" (flags, difficulty emojis, ↺, ◄ ►, theme, ⚙, ?), "Ribbon" (📅 🎮 mode icons), "Footer" (📊 🔥 ⚡ bottom bar icons). Arrays: `TOP_ICON_ROWS`, `RIBBON_ICON_ROWS`, `FOOTER_ICON_ROWS`. ◄ ► is in TOP_ICON_ROWS (Header) not Footer. MULTI-BOARD section text says "use ◄ ► in the header" (not "at the bottom").

**`BottomStrip.tsx`** — `minHeight: 50` + `paddingBottom: insets.bottom` (safe area), replaces tab bar visually:
- Props: `difficulty: Difficulty`, `onOpenHelp: () => void`, `onNewGame: () => void`, `countdown?: string`, `gameStats: GameStats` (required since v1.2.2), `activeBoardIndex?`, `activeBoardSolved?`, `activeBoardSolvedGuess?` (for B7 multi-board)
- `GameStats = { played: number; winPct: number; streak: number; streakEmoji: string }` — computed in index.tsx from active mode's stats (used only in overlay now; footer no longer shows stats row)
- State 0 pre-game (playing, 0 guesses): "? for help" in green (#5BA75A) + 📊
- State 1 playing (guesses > 0): "⏳ N tries left · ? for help"; 💀/💪 badge if difficulty !== 'easy'; + 📊
- State 2 active board solved (quordle only, game still playing): persistent "Board N solved in M ✓" + 📊 — shown whenever `isQuordle && activeBoardSolved && !isGameOver`
- State 3 game over: single row `[? for help] [spacer] [📊] [↺ New Game]` (practice/quordle) or `[? for help] [spacer] [📊] [Next word in HH:MM:SS]` (daily) — no stats row (stats in 📊 modal)
- 📊 opens StatsModal; `streakEmoji` is 🔥 for daily, ⚡ for practice
- Uses `useSafeAreaInsets` internally — no inset prop needed from parent
- `gameStats` prop is still required (used by parent for stats computation) but no longer rendered in footer

**`StatsModal.tsx`** — Modal, close on backdrop tap or × button:
- ? help icon at left of header (position absolute, left: 12) — opens HelpModal
- Header title: "STATISTICS · Wordout" / "STATISTICS · 4-out" etc. (`boardCountName(boardCount)` appended)
- Single-board: Daily|Practice tabs; multi-board: practice only
- Distribution chart; Reset Stats clears both statsStore AND dailyStore.stats

---

## Key implementation details

### Wordout tile sizing (dynamic)
Single-board layout has a 44px `WORD_DOTS_H` row (📅 🎮 indicator row + inline mode/difficulty label), so `WORD_DOTS_H = 44` IS subtracted. Multi-board still uses `DOTS_H = 36` (no label row).
```tsx
// totalH = screenH - insets.top - insets.bottom - HEADER_H - MSG_H - TAB_H
const wordleAvailH = totalH - KBD_H - WORD_DOTS_H;
const wordleTileSize = Math.max(44, Math.min(88,
  Math.min(Math.floor(wordleMeasuredH / 6) - 4, Math.floor((screenW - 16) / 5) - 4)
));
// wordleMeasuredH comes from onLayout on boardArea; falls back to wordleAvailH before first layout
```

### Multi-board tile sizing
```tsx
// Fixed heights consumed outside the board scroll area
const KBD_H = 210;                    // 3×60px rows + 2×8px rowGap + 6px paddingBottom
const HEADER_H = 50;                  // game header (measured on device)
const DOTS_H = 36;                    // board indicator row
const MSG_H = 36;                     // message / result area
const TAB_H = 50 + insets.bottom;     // BottomStrip content + bottom safe area (dynamic!)

const qAvailH = screenH - insets.top - insets.bottom - HEADER_H - DOTS_H - MSG_H - KBD_H - TAB_H;
const qTileSize = Math.max(20, Math.min(74,
  Math.min(
    Math.floor(qAvailH / maxGuesses) - 4,  // height-limited
    Math.floor(boardAreaW / 5) - 4,        // width-limited
  )
));
```
Each tile row is `tileSize + 4` px tall (2px margin each side from Tile style). `useWindowDimensions().height` returns full screen height — TAB_H must be subtracted explicitly because the tab bar is outside the SafeAreaView. Tiles shrink to 20px minimum on small screens or high board counts.

### Mode indicator row (single-board)
Row height `WORD_DOTS_H = 44`. Modes: 📅 (daily) and 🎮 (practice).

**Layout (v1.2.3, confirmed v1.2.5)**: Label is INLINE to the right of the active icon (flex row "pill"). Inactive icon is faded (opacity 0.45). Layout examples:
- Daily active, playing: `[📅 Today's · Easy]  [🎮]`
- Daily active, completed: `[📅 Next word in HH:MM:SS]  [🎮]` — countdown replaces difficulty label (B3, v1.2.5)
- Practice active: `[📅]  [🎮 Practice · Easy]`

**B4 (v1.2.5)**: Header difficulty emoji reflects active mode's locked difficulty. In single-board path, `renderHeader` receives `isDaily ? dailyStore.dailyDifficulty : difficulty` — not always `settingsStore.difficulty`.

Styles: `modeIconPill` (flexDirection: row, gap: 6), `modeIconSpacer` (flex: 1 spacer between the two pills), `modeIconSquare` (24×24, borderWidth 2), `modeIconEmoji` (fontSize 13, lineHeight 16 for 🎮), `modeLabel` (fontSize 11, color #5BA75A).

Label uses **conditional rendering** (not opacity: 0). This is safe because the label is inline — showing/hiding it only changes pill WIDTH, not row HEIGHT. No height-based layout recalculation on Android.

### Board progress indicators
Shown above the swipeable boards (hidden for single-board modes). Each indicator is a 30×30 hit target wrapping a 24×24 shape, 2px stroke.

| Shape | State |
|---|---|
| Green square + ▶ | Current board, not solved — always green (#5BA75A) |
| Green filled square + ✓ | Current board, solved (B9, v1.2.5) |
| Grey circle outline | Non-active board, no guesses or all-grey results |
| Green circle outline + green number | N correct-position letters found, no yellows |
| Yellow circle outline + theme fill + green number | Yellows also found; number if greens > 0 |
| Green filled circle + white ✓ | Non-active board, solved |

Active board always uses square shape. Solved status switches ▶ → ✓ (still square). Non-active solved boards always use circle.

`boardCorrectCount(qGuesses, boardIndex)` — counts unique column positions marked `'correct'` via a `Set` (range 0–5).  
`boardHasYellow(qGuesses, boardIndex)` — returns `true` if any result is `'present'`.

`squareColor` for active board indicator is always `'#5BA75A'` (was previously theme-dependent).

### Swipeable multi-board layout
- `ScrollView` with `pagingEnabled` + `horizontal`; each page `width: screenW`
- `useRef<ScrollView>` + `scrollTo(index)` for programmatic navigation from indicator taps
- `onMomentumScrollEnd` updates `activeBoard` state for indicator rendering
- `useEffect` resets scroll to x=0 when `quordleStore.guesses.length === 0` (new game)
- Board pages have explicit `backgroundColor: colors.background` to prevent adjacent-page bleed
- **`boardPage` style must use `flexShrink: 0`, NOT `flex: 1`** — `flex: 1` in CSS expands to `flex-basis: 0`, which overrides the explicit `width: screenW` inline style. In a scroll container this collapses all pages to `screenW / boardCount` each, making every board visible simultaneously and causing each guess to appear `boardCount` times. `flexShrink: 0` keeps the item at its explicit `width`.
- **`BoardPage` must be a plain `View`** — `Animated.View` with a nested style array `[style, animStyle]` where `style` is itself an array caused Reanimated to silently drop the inner layout styles on web. The original Android compositing layer theory was wrong — the original working code also used a plain `View`.

### Settings — handleBoardCountSelect
```ts
function handleBoardCountSelect(n: BoardCount) {
  if (n === 1) {
    setBoardCount(n);
    setGameMode('wordle');
  } else {
    const prevBc = useQuordleStore.getState().boardCount;
    setBoardCount(n);
    setGameMode('quordle');
    if (n !== prevBc) useQuordleStore.getState().newGame(); // only reset when bc changes (B6, v1.2.5)
  }
}
```
`newGame()` is only called when board count actually changes — preserves a completed multi-board game when re-selecting the same count. Navigation away on mode change was removed in v1.2.1 (B2 fix). Same logic applies in `cycleTo` in index.tsx.  
Mode segment active state: `(n === 1 && gameMode === 'wordle') || (n > 1 && gameMode === 'quordle' && boardCount === n)`
Mode segment label: `n === 1 ? 'Wordout' : \`${n}-out\`` — produces "Wordout / 2-out / 3-out / 4-out / 6-out / 8-out".

### Settings footer (v1.2.2)
GitHub link, `© 2026 Onglipo Labs · MIT License`, version string (`v1.2.2` on web, `v1.2.2 (build 10)` on Android).
Word count pills removed in v1.2.2 (E5). `WORD_COUNT_ANSWERS` / `WORD_COUNT_GUESSES` still exported from gameStore but no longer imported in settings.tsx.

### Settings safe area (v1.2.1)
`SafeAreaView edges={['top', 'bottom']}` — both edges required so the custom 44px header doesn't overlap the status bar/notch. The header sits inside the SafeAreaView (not positioned outside it).

### Difficulty lock for daily (v1.2.4)
Two places enforce the lock (lock applies ONLY to daily 1-out mode):
- **Settings screen**: `handleDifficultyChange()` in settings.tsx. Guard: `gameMode === 'wordle' && activeWordleMode === 'daily'`. If that AND `dailyStatus === 'completed' || (dailyStatus === 'playing' && dailyGuesses.length > 0)`, calls `showDiffLockToast()` (inline toast, 3s auto-dismiss). Multi-board and practice modes can freely change difficulty. Uses `useRef` + `setTimeout` — no `Alert.alert` (broken on RN Web).
- **Header difficulty icon**: `handleDifficultyToggle()` in index.tsx. Guard: `isDaily` (= `!isQuordle && activeWordleMode === 'daily'`). If locked (`dailyStatus === 'playing' || 'completed'`), shows `showSystemToast('Daily locked — next word in HH:MM:SS')`. Practice mode can always change difficulty freely.

### Header arrows (v1.2.1)
‹ › boxed chevrons replaced with CSS border-trick solid triangles:
- Left: `{ width:0, height:0, borderTopWidth:8, borderBottomWidth:8, borderRightWidth:12, borderTop/BottomColor:'transparent', borderRightColor:'#aaa' }`
- Right: mirror with `borderLeftWidth:12, borderLeftColor:'#aaa'`
- Pressable `hitSlop={10}` is essential — Views have 0 width/height
- No SVG library needed

### Per-mode stats display
`modeKey = gameMode === 'wordle' ? 'wordle' : String(boardCount)`  
`maxGuessesForMode = maxGuessesForDifficulty(difficulty, boardCount)`  
Distribution chart renders exactly `maxGuessesForMode` bars.

### Share format
- Wordout: `Wordout X/6(*)\n\n🟩🟨⬛...`
- Multi-board: `{boardCountName} X/{maxGuesses}\n\n1️⃣\n...\n\n2️⃣\n...`
- Color blind: 🟧/🟦 instead of 🟩/🟨
- End-game message: "Solved! 🎉" / "Game over" (share button reveals answers)
- Uses `navigator.clipboard.writeText()`

### Keyboard focus bug fix (web)
Three-layer approach:
1. Capture-phase keydown listener: `window.addEventListener('keydown', handler, { capture: true })` — intercepts before any focused element
2. `(document.activeElement as HTMLElement)?.blur()` on every game key
3. `tabIndex={-1}` + `onMouseDown: e => e.preventDefault()` on all `Pressable` buttons and tab bar (`NoFocusTabButton` wrapper) — prevents focus acquisition on click

### Header layout
Custom 44px header — 3-section flex row: `iconGroupLeft` (flex:1), `headerTitleWrapper` (flex:1, centered), `iconGroupRight` (flex:1). Title occupies middle third regardless of icon count.

### Startup mode logic (v1.1.1)
On app mount (`useEffect(fn, [])` in `index.tsx`):
1. `useDailyStore.getState().checkAndReset()` — ensures daily state is current for today
2. Read `lastPlayedDate` + `dailyStatus` from store
3. Compute today as `YYYY-MM-DD` string
4. If `lastPlayedDate !== today` OR `dailyStatus !== 'completed'` → switch to Wordout mode + daily active
5. Otherwise → keep whatever `settingsStore` has persisted (last-played boardCount/gameMode)

**First-ever launch**: `lastPlayedDate = ''`, so condition is true → opens Daily mode.

### Settings screen (v1.1.1)
- Has ? help icon (right side of header, `position: absolute, right: 12`) — uses `showHelp` state
- Version string: `Platform.OS === 'android'` check — shows `(build N)` on Android only, plain version on web

### Guess distribution bars
Use `flex: pct` + `flex: 100-pct` spacer (not `width: '%'`) — percentage widths are unreliable in RN flex containers.

### Stats reset confirmation
Uses `<Modal>` (not `Alert.alert` — broken on RN Web).

---

## App assets & build

### App icon
SVG: 5 tiles [W][O][R][D][✓] on dark `#121213` background, rounded square. Exported via `scripts/generate-icons.py` (cairosvg):
- `assets/icon.png` — 1024×1024
- `assets/adaptive-icon.png` — 1024×1024, transparent bg
- `assets/splash-icon.png` — 512×512
- `assets/favicon.png` — 48×48

### EAS build
`eas.json` has `development` (internal APK), `preview` (APK), `production` (AAB) profiles.  
`app.json`: `android.package: "com.dilippanicker.wordout"`, `android.versionCode: 11` (current — see version bumping protocol before building)  
Build commands: `eas build --local --profile preview --output wordout.apk` / `--profile production --output wordout.aab`

---

## Settings screen layout (360×800 fits without scroll)
- sectionHeader: marginTop 26, marginBottom 6
- statsRow: paddingVertical 18, statValue fontSize 22
- distContainer: paddingVertical 14, gap 8; distRow height 18; distBar height 16
- segment: paddingVertical 14; switchRow: paddingVertical 16
- ScrollView contentContainerStyle paddingBottom 12

---

## GitHub repo
- URL: https://github.com/dilippanicker/wordout
- README.md, LICENSE (MIT 2026 Dilip Panicker), `.github/ISSUE_TEMPLATE/` present
- Issue templates: `word-list-issue.md`, `bug-report.md`

---

## Known pre-existing TypeScript errors (not blocking)
- `new-game.tsx`: route path type mismatch on `<Redirect href>`

---

## Version 1.0 — Release Status

### What's in 1.0 (all committed, all built)
- Wordout (single board) and multi-board mode (2/3/4/6/8 boards)
- Middle tab cycles board counts (1→2→3→4→6→8→1); New Game tab resets
- Abandon-game confirmation guard (New Game, board cycle, language switch) — `utils/abandon.ts`
- Win: all tiles wave (left→right, top→bottom), then per-board dim overlay + ✓, then end-of-game full-screen overlay
- Lose: board shakes (3×, 14px) + red tint flash, then per-board dim overlay + ✗ + answer, then end-of-game overlay
- End-of-game overlay: emoji + message + answer words + Share button; auto-dismisses in 3s or on tap
- Square best-fit tiles: `min(tileFromWidth, tileFromHeight)`, margin gap = 4px
- Enter-on-right keyboard option; color blind mode; dark/light theme
- Stats per mode with guess distribution; share emoji grid
- American + British English word lists
- Privacy policy at GitHub Pages
- New icons: RAISE/CLOUT tile design, cream background `#FFF8EE`
- Splash/adaptive-icon background updated to `#FFF8EE` in app.json

### Version bumping — mandatory protocol

**Before every GitHub Actions build, follow this sequence exactly — no exceptions:**

1. Read `app.json` to get the current `version` string and `versionCode` integer.
2. Propose the bump with reasoning and wait for explicit user confirmation:
   > "Ready to build. Proposing v1.0.2 (versionCode 3) — patch: bug fix + word additions. Confirm?"
3. Only after the user confirms: update `app.json` (`version` and `versionCode`), then instruct the user to trigger the build.

**Rules:**
- `versionCode` always increments by exactly +1 from the current value. Never skip, never reuse.
- Use semver: patch = bug fixes / minor content changes; minor = new user-visible features; major = breaking changes or full redesign.
- Never update `app.json` before receiving explicit confirmation.
- Never trigger or instruct triggering a build without a confirmed version bump.
- Update `CHANGELOG.md` with the new version entry as part of the same commit as `app.json`.

**Current version:** `1.2.5` (versionCode 13) — committed.  
Update after each confirmed bump so future sessions start from the right baseline.

### Build pipeline
**EAS:** Free tier exhausted (15/15 used). Resets July 1, 2026.  
**GitHub Actions (primary):** `.github/workflows/build-apk.yml` — triggered manually via Actions tab.
- Builds APK (`preview` profile) then AAB (`production` profile) sequentially
- Gradle cache enabled; JVM heap 4g, Metaspace 2g (fixes OOM on compile)
- Requires `EXPO_TOKEN` secret set in GitHub repo settings
- Build time: ~45 min total (APK + AAB); faster with warm Gradle cache
- APK uploaded as artifact `wordout-apk`, AAB as `wordout-aab` (14-day retention each)
- Creates a versioned GitHub Release (e.g. `v1.0.3`) with both files attached
  - Tag and title read from `app.json` version field
  - Release notes extracted from matching `## [VERSION]` section in `CHANGELOG.md`
  - Re-running the same version deletes and recreates the release cleanly
- Permanent download links:
  - `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk`
  - `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.aab`

**Current version:** `1.2.5` (versionCode 13) — committed. Build APK via GitHub Actions next session.

### Play Store setup
- App created in Google Play Console under publisher "Onglipo"
- Package: `com.dilippanicker.wordout`
- Store listing text drafted (see README for short/full description)
- Feature graphic (1024×500) still needed
- Screenshots still needed (Pixel 7 / 1080×2400, min 2)
- API access / service account not yet set up (do after first manual upload)

### Before Play Store submission
- [ ] Test APK on physical device (all board counts, win/lose, abandon guard, cycling tab)
- [ ] Create feature graphic (1024×500 banner)
- [ ] Take store listing screenshots (Pixel 7 size, 1-board and 4-board at minimum)
- [ ] Complete Play Console setup: content rating, data safety, target audience
- [ ] First manual APK upload via Play Console web UI (required before automation)
- [ ] Set up GitHub Actions → Play Store automation (service account JSON)

### Nice-to-have (post-1.2)
- Animate board indicator state transitions
- Haptic feedback on correct/wrong guess
- End-game overlay delay dynamic based on guess count
- HelpModal: update HARD MODE section to mention Extreme mode constraints

---

## Model Selection — Cost Optimization

**Start every session on Haiku** — `/model haiku` is run automatically by `/open`.

Models self-escalate and de-escalate as needed — no user intervention required:

### Escalate UP when:
| Situation | Switch to |
|-----------|-----------|
| Simple edits, config, renaming, file reading | Stay on Haiku |
| Boilerplate, repetitive code | Stay on Haiku |
| Complex logic, hard bug — not making progress after 2 attempts | Sonnet |
| Architecture decision, major refactor | Sonnet |
| Animation / reanimated logic | Sonnet |
| Cross-file reasoning, store schema changes | Sonnet |
| Sonnet also failing after 2 attempts | Opus |
| Genuinely novel problem requiring deep reasoning | Opus |

### De-escalate DOWN when:
- Complex bug fixed → back to Haiku for cleanup, testing, review, close ritual
- Never stay on Sonnet/Opus for file reading, grep, or simple edits

### Cost awareness:
- Haiku ≈ 20× cheaper than Sonnet per token
- Sonnet ≈ 5× cheaper than Opus per token
- Always `/compact` at 50%+ context before escalating models
- Never start a new session for a tiny change — batch related work

### Self-regulation rule:
When escalating, announce it: "Switching to Sonnet — animation logic is complex."
When de-escalating, announce it: "Switching back to Haiku — cleanup work now."
