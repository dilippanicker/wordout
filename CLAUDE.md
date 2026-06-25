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

**`settingsStore.ts`** — persisted (`wordle-settings`):
- `language: Language`, `hardMode`, `darkTheme`, `colorBlindMode`
- `gameMode: 'wordle' | 'quordle'`
- `boardCount: BoardCount` (1 | 2 | 3 | 4 | 6 | 8, default 4)
- `BOARD_COUNTS = [1,2,3,4,6,8]`, `BoardCount` type
- `boardCountName(n)` → `'Wordout' | '2-out' | '3-out' | '4-out' | '6-out' | '8-out'`

**`gameStore.ts`** — Wordout logic (6 guesses, single board):
- Resets only on language change (subscription watches `language` only)
- `recordResult(won, guessCount, 'wordle')` — modeKey is always `'wordle'`

**`quordleStore.ts`** — multi-board logic:
- `boardCount: number`, `maxGuesses = min(13, 5 + boardCount)`, `answers: string[]`, `solvedBoards: boolean[]` — all dynamic
- `QuordleGuess.boardResults: LetterResult[][]` — one array per board (not a 4-tuple)
- `initialState(language, boardCount)` picked at game start via Fisher-Yates shuffle
- Subscription watches `language` only; `boardCount` changes handled explicitly in `settings.tsx`
- `recordResult(won, guessCount, String(boardCount))` — modeKey is board count as string

**`statsStore.ts`** — persisted (`wordle-stats`):
- `byMode: Record<string, BoardStats>` — keyed by `'wordle'` or `String(boardCount)`
- `BoardStats`: `totalGames`, `wins`, `currentStreak`, `maxStreak`, `guessCounts: Record<string, number>`
- `emptyBoardStats()` exported for default value
- `recordResult(won, guessCount, modeKey)`, `clearSettingsBadge`, `resetStats` (clears all modes)

### Abandon guard — `utils/abandon.ts`
`isGameInProgress()` reads the active store imperatively (`getState()`) — no subscription needed. Returns true when `gameStatus === 'playing' && guesses.length > 0`.  
`confirmAbandon(onConfirm)` shows `Alert.alert` on Android/iOS, `window.confirm` on web. Called before: New Game tab, ‹ › mode arrows, language flag toggle.

**Key subscription rule**: `gameStore` and `quordleStore` subscriptions call `newGame()` on `language` change only. Board count changes are handled explicitly in `settings.tsx → handleBoardCountSelect`.

### Components — `components/`

**`GameBoard.tsx`** — dual API:
- Wordle mode: `guesses?: GuessResult[]` (pre-merged word + results)
- Quordle mode: `words?: string[]` + `boardResults?: LetterResult[][]` (shared words, per-board colors passed separately)
- Common: `currentGuess`, `tileSize` (default 60), `shakeKey`, `maxGuesses` (default 6), `solved`, `gameOver`, `answer`, `label`
- `count` derived from `words.length ?? guesses.length` — drives animation tracking
- No border on board (removed in v1.0.1 — green solved border looked ugly)
- Win overlay: `rgba(0,0,0,0.3)` dim + 80px green ✓, fades in 1500ms after `solved` transitions; persists on remount
- Lose overlay: board shakes (3×, 14px, 910ms), red tint flash, then dim + 80px red ✗ + `answer` word; fades in ~2050ms after `gameOver` transitions
- Wave animation fires on ALL tiles (left→right, top→bottom, 50ms stagger) when `solved && animatingRow === count - 1`; `animatingRow` guard prevents replay on remount
- Overlay opacities initialised to 1 on mount if board already in end-state (navigation remount safety)
- **Wordle mode must pass `solved={gameStatus === 'won'}`** — previously missing, was breaking win-row bounce

**`Tile.tsx`** — `margin: 2` around each tile (so each row = `tileSize + 4` px tall). Color blind: correct=🟧, present=🟦.

**`FlipTile.tsx`** — flip animation on guess submission, 150ms stagger per column.

**`Keyboard.tsx`** — key height 60px, row gap 8px. Colors reflect best result per letter across all boards in multi-board mode.

**`HelpModal.tsx`** — sections: rules, EXAMPLES (3 tiles), MULTI-BOARD MODE, BOARD INDICATORS (5 rows with rendered indicator shapes), HARD MODE (conditional), ICONS (5 entries).

---

## Key implementation details

### Wordout tile sizing (dynamic)
Single-board layout has no dot row, so DOTS_H is not subtracted.
```tsx
const wordleAvailH = screenH - insets.top - insets.bottom - HEADER_H - MSG_H - KBD_H - TAB_H;
const wordleTileSize = Math.max(44, Math.min(74,
  Math.min(Math.floor(wordleAvailH / 6) - 4, Math.floor((screenW - 16) / 5) - 4)
));
```

### Multi-board tile sizing
```tsx
// Fixed heights consumed outside the board scroll area
const KBD_H = 210;   // 3×60px rows + 2×8px rowGap + 6px paddingBottom
const HEADER_H = 50; // game header (measured on device)
const DOTS_H = 36;   // board indicator row
const MSG_H = 36;    // message / result area
const TAB_H = 50;    // tab bar (useWindowDimensions returns full screen height)

const qAvailH = screenH - insets.top - insets.bottom - HEADER_H - DOTS_H - MSG_H - KBD_H - TAB_H;
const qTileSize = Math.max(20, Math.min(74,
  Math.min(
    Math.floor(qAvailH / maxGuesses) - 4,  // height-limited
    Math.floor(boardAreaW / 5) - 4,        // width-limited
  )
));
```
Each tile row is `tileSize + 4` px tall (2px margin each side from Tile style). `useWindowDimensions().height` returns full screen height — TAB_H must be subtracted explicitly because the tab bar is outside the SafeAreaView. Tiles shrink to 20px minimum on small screens or high board counts.

### Board progress indicators
Shown above the swipeable boards (hidden for single-board modes). Each indicator is a 30×30 hit target wrapping a 24×24 shape, 2px stroke.

| Shape | State |
|---|---|
| Grey square + ▶ | Current board (not solved) |
| Grey circle outline | No guesses or all-grey results |
| Green circle outline + green number | N correct-position letters found, no yellows |
| Yellow circle outline + theme fill + green number | Yellows also found; number if greens > 0 |
| Green filled circle + white ✓ | Board solved |

Solved board always shows ✓ even when it is the active board.

`boardCorrectCount(qGuesses, boardIndex)` — counts unique column positions marked `'correct'` via a `Set` (range 0–5).  
`boardHasYellow(qGuesses, boardIndex)` — returns `true` if any result is `'present'`.

Dark mode: square stroke + play icon use `'#ffffff'`; yellow-circle fill uses `colors.background`.

### Swipeable multi-board layout
- `ScrollView` with `pagingEnabled` + `horizontal`; each page `width: screenW`
- `useRef<ScrollView>` + `scrollTo(index)` for programmatic navigation from indicator taps
- `onMomentumScrollEnd` updates `activeBoard` state for indicator rendering
- `useEffect` resets scroll to x=0 when `quordleStore.guesses.length === 0` (new game)
- Board pages have explicit `backgroundColor: colors.background` to prevent adjacent-page bleed

### Settings — handleBoardCountSelect
```ts
function handleBoardCountSelect(n: BoardCount) {
  setBoardCount(n);
  if (n === 1) { setGameMode('wordle'); useGameStore.getState().newGame(); }
  else         { setGameMode('quordle'); useQuordleStore.getState().newGame(); }
  router.navigate('/(tabs)/' as never);
}
```
Mode segment active state: `(n === 1 && gameMode === 'wordle') || (n > 1 && gameMode === 'quordle' && boardCount === n)`

### Per-mode stats display
`modeKey = gameMode === 'wordle' ? 'wordle' : String(boardCount)`  
`maxGuessesForMode = gameMode === 'wordle' ? 6 : min(13, 5 + boardCount)`  
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
`app.json`: `android.package: "com.dilippanicker.wordout"`, `android.versionCode: 1`  
Build command: `npx eas-cli build --platform android --profile preview --non-interactive`

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

### Build pipeline
**EAS:** Free tier exhausted (15/15 used). Resets July 1, 2026.  
**GitHub Actions (primary):** `.github/workflows/build-apk.yml` — triggered manually via Actions tab.
- Uses `eas build --local --profile preview` (no EAS quota consumed)
- Gradle cache enabled; JVM heap 4g, Metaspace 2g (fixes OOM on compile)
- Requires `EXPO_TOKEN` secret set in GitHub repo settings
- Build time: ~28 minutes first run, faster with warm cache
- APK uploaded as artifact `wordout-apk`, retained 14 days
- APK also published to GitHub Releases as `latest` tag — permanent public download link:
  `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk`

**Last successful build:** GitHub Actions run `28120107075`, commit `000243e`  
**APK:** Downloaded to `/home/dilip/Downloads/wordout.apk` (98 MB)  
**All commits are built** — nothing pending in code.

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

### Nice-to-have (post-1.0)
- Animate board indicator state transitions
- Daily word mode (deterministic word from date seed)
- Haptic feedback on correct/wrong guess

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
