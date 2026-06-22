# Wordle / Quordle — React Native (Expo)

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
  - **New Game** (refresh icon) — action tab; `tabPress` calls `newGame()` on both stores, never navigates away
  - **Wordle/Quordle** (grid/apps icon) — toggles mode only when already on this tab; navigating here from Settings returns to current game without resetting
  - **Settings** (settings icon) — badge dot when stats update
- `(tabs)/index.tsx` — game screen (renders Wordle or Quordle based on `gameMode`)
- `(tabs)/settings.tsx` — settings + stats
- `(tabs)/new-game.tsx` — dummy redirect to `/(tabs)/`

### Stores — `store/`
- **`settingsStore.ts`** — persisted (`wordle-settings`): `language`, `hardMode`, `darkTheme`, `colorBlindMode`, `gameMode: 'wordle' | 'quordle'`
- **`gameStore.ts`** — Wordle logic (6 guesses, single board). Resets on language change only (NOT on mode change). Hard mode validates via `checkHardModeConstraints`.
- **`quordleStore.ts`** — Quordle logic (4 boards, 9 guesses). Same reset rule. `QuordleGuess` stores `boardResults: [LetterResult[], LetterResult[], LetterResult[], LetterResult[]]`. Hard mode checks each unsolved board independently.
- **`statsStore.ts`** — persisted (`wordle-stats`): `totalGames`, `wins`, `currentStreak`, `maxStreak`, `guessCounts` (1–6), `settingsBadge`. Has `recordResult`, `clearSettingsBadge`, `resetStats`.

**Key subscription rule**: both `gameStore` and `quordleStore` subscribe to `settingsStore` changes and call `newGame()` only on `language` change — mode switching preserves in-progress games.

### Components — `components/`
- **`GameBoard.tsx`** — props: `guesses`, `currentGuess`, `tileSize` (default 60), `shakeKey`, `maxGuesses` (default 6, Quordle uses 9), `solved` (green border), `label` ("1"–"4"). Solved boards freeze: `toBoardGuesses` in index.tsx stops at the winning row.
- **`Tile.tsx`** — dynamic colors from `settingsStore` (two separate selectors to avoid re-render). Color blind: correct=🟧 orange, present=🟦 blue.
- **`FlipTile.tsx`** — flip animation on guess submission (stagger 150ms per col).
- **`Keyboard.tsx`** — key height 60px, row gap 8px. Colors reflect best result per letter across all boards in Quordle.
- **`HelpModal.tsx`** — sections: rules, EXAMPLES (3 tiles), QUORDLE info, HARD MODE (if on), ICONS (5 entries incl. New Game).

---

## Key implementation details

### Wordle tile sizing (dynamic)
```tsx
const insets = useSafeAreaInsets();
const { height: screenH, width: screenW } = useWindowDimensions();
const KBD_H = 210; // 3×60px keys + 3×8px gaps + 6px paddingBottom
const boardAreaH = screenH - insets.top - insets.bottom - 44 - 44 - KBD_H;
const wordleTileSize = Math.max(44, Math.min(68,
  Math.min(Math.floor(boardAreaH / 6) - 4, Math.floor((screenW - 16) / 5) - 4)
));
```

### Quordle tile size
Fixed `QUORDLE_TILE_SIZE = 22` (22px fits 2×2 grid with 9 rows on 360px-wide screens).

### Quordle key statuses
Best result per letter across all 4 boards: `STATUS_PRIORITY = { correct:3, present:2, absent:1 }`.

### Solved board freeze
`toBoardGuesses(quordleGuesses, boardIndex)` iterates and breaks when it finds a row where all 5 results are `'correct'`. Subsequent guesses are invisible to that board's `GameBoard`.

### Guess distribution bars
Use `flex: pct` + `flex: 100-pct` spacer (not `width: '%'`) — percentage widths are unreliable in RN flex containers.

### Stats reset confirmation
Uses `<Modal>` (not `Alert.alert` — broken on RN Web). State: `const [confirmVisible, setConfirmVisible] = useState(false)`.

### Physical keyboard (web)
Capture-phase keydown listener: `window.addEventListener('keydown', handler, { capture: true })`. Tab focus blur on screen focus via `useFocusEffect`.

### Share format
- Wordle: `Wordle X/6(*)\n\n🟩🟨⬛...`
- Quordle: `Quordle X/9\n\n1️⃣\n...\n\n2️⃣\n...` (4 boards)
- Color blind: 🟧/🟦 instead of 🟩/🟨
- Uses `navigator.clipboard.writeText()` (expo-clipboard not installed)

### Header layout
Custom header (not React Navigation header) — two `StyleSheet.absoluteFill` layers: icon row (`space-between`) + title wrapper (`center`). `pointerEvents="none"` on title so icons remain tappable.

---

## Settings screen layout (360×800 fits without scroll)
- sectionHeader: marginTop 18, marginBottom 6
- statsRow: paddingVertical 10, statValue fontSize 22
- distContainer: paddingVertical 8, gap 4; distRow height 18; distBar height 16
- segment/switchRow: paddingVertical 11
- No explicit bottom spacer (SafeAreaView edges={['bottom']} handles it)

## Known pre-existing TypeScript errors (not blocking)
- `settings.tsx`: `colors.*` typed as `ColorValue` not `string` in some sub-components
- `new-game.tsx`: route path type mismatch on `<Redirect href>`

## Remaining Work (next session)

### Bugs to fix
- Stats reset confirmation modal not working (trash icon tappable but nothing happens)
- Dark theme toggle not applying to app (setting persists but UI doesn't change)
- Quordle: verify solved board freeze is working correctly

### Polish
- Board tiles still too small on 360×800 — gap above/below board
- Settings page has large empty space at bottom
- Help modal: verify Quordle section and New Game icon entry are present

### Still to build
- App icon + splash screen
- Play Store listing prep (privacy policy page, screenshots)
- Consider: EAS build setup for generating APK

### Testing checklist before Play Store
- [ ] Hard mode validation correct
- [ ] Duplicate letter handling correct  
- [ ] Stats persist across app restarts
- [ ] Language switch starts new game
- [ ] Share emoji output correct format
- [ ] Both 412×915 (Pixel 7) and 360×800 layouts verified
