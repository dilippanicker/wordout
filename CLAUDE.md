# Wordout / Quadout — React Native (Expo)

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
  - **Wordout/Quadout** (grid/apps icon) — toggles mode only when already on this tab; navigating here from Settings returns to current game without resetting
  - **Settings** (settings icon) — badge dot when stats update
- `(tabs)/index.tsx` — game screen (renders Wordout or Quadout based on `gameMode`)
- `(tabs)/settings.tsx` — settings + stats
- `(tabs)/new-game.tsx` — dummy redirect to `/(tabs)/`

### Stores — `store/`
- **`settingsStore.ts`** — persisted (`wordle-settings`): `language`, `hardMode`, `darkTheme`, `colorBlindMode`, `gameMode: 'wordle' | 'quordle'`
- **`gameStore.ts`** — Wordout logic (6 guesses, single board). Resets on language change only (NOT on mode change). Hard mode validates via `checkHardModeConstraints`.
- **`quordleStore.ts`** — Quadout logic (4 boards, 9 guesses). Same reset rule. `QuordleGuess` stores `boardResults: [LetterResult[], LetterResult[], LetterResult[], LetterResult[]]`. Hard mode checks each unsolved board independently.
- **`statsStore.ts`** — persisted (`wordle-stats`): `totalGames`, `wins`, `currentStreak`, `maxStreak`, `guessCounts` (1–6), `settingsBadge`. Has `recordResult`, `clearSettingsBadge`, `resetStats`.

**Note**: AsyncStorage keys (`wordle-settings`, `wordle-stats`) and internal `GameMode` values (`'wordle' | 'quordle'`) are kept as-is to preserve existing user data. Only UI-visible strings use the new names.

**Key subscription rule**: both `gameStore` and `quordleStore` subscribe to `settingsStore` changes and call `newGame()` only on `language` change — mode switching preserves in-progress games.

### Components — `components/`
- **`GameBoard.tsx`** — props: `guesses`, `currentGuess`, `tileSize` (default 60), `shakeKey`, `maxGuesses` (default 6, Quadout uses 9), `solved` (green border), `label` ("1"–"4"). Solved boards freeze: `toBoardGuesses` in index.tsx stops at the winning row.
- **`Tile.tsx`** — dynamic colors from `settingsStore` (two separate selectors to avoid re-render). Color blind: correct=🟧 orange, present=🟦 blue.
- **`FlipTile.tsx`** — flip animation on guess submission (stagger 150ms per col).
- **`Keyboard.tsx`** — key height 60px, row gap 8px. Colors reflect best result per letter across all boards in Quadout.
- **`HelpModal.tsx`** — sections: rules, EXAMPLES (3 tiles), QUADOUT info, HARD MODE (if on), ICONS (5 entries incl. New Game).

---

## Key implementation details

### Wordout tile sizing (dynamic)
```tsx
const insets = useSafeAreaInsets();
const { height: screenH, width: screenW } = useWindowDimensions();
const KBD_H = 210; // 3×60px keys + 3×8px gaps + 6px paddingBottom
const boardAreaH = screenH - insets.top - insets.bottom - 44 - 44 - KBD_H;
const wordleTileSize = Math.max(44, Math.min(74,
  Math.min(Math.floor(boardAreaH / 6) - 4, Math.floor((screenW - 16) / 5) - 4)
));
```

### Quadout tile size
Dynamic: `Math.max(26, Math.min(36, Math.floor((boardAreaH - 4) / 18)))`.
Divides total vertical space by 18 tile rows (2 grids × 9 rows). Yields 26px at the 800px minimum screen, up to 36px on large screens. `boardAreaH` is shared with the Wordout calculation.

### Quadout key statuses
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
- Wordout: `Wordout X/6(*)\n\n🟩🟨⬛...`
- Quadout: `Quadout X/9\n\n1️⃣\n...\n\n2️⃣\n...` (4 boards)
- Color blind: 🟧/🟦 instead of 🟩/🟨
- Uses `navigator.clipboard.writeText()` (expo-clipboard not installed)

### Header layout
Custom header (not React Navigation header) — 3-section flex row: `iconGroupLeft` (flex:1, icons left), `headerTitleWrapper` (flex:1, centered title), `iconGroupRight` (flex:1, icons right). Each section is `flex:1` so the title always occupies the middle third regardless of icon count. Height 44px, paddingHorizontal 12.

### Quadout minimum screen height
If `isQuordle && screenH < 800`, renders a fallback view instead of the game: heading "Quadout works best on larger screens (800px height minimum).", sub-text showing the device height, and a "Play Wordout instead" button that calls `setGameMode('wordle')`.

---

## Settings screen layout (360×800 fits without scroll)
- sectionHeader: marginTop 26, marginBottom 6
- statsRow: paddingVertical 18, statValue fontSize 22
- distContainer: paddingVertical 14, gap 8; distRow height 18; distBar height 16
- segment: paddingVertical 14; switchRow: paddingVertical 16
- ScrollView contentContainerStyle paddingBottom 12

## Known pre-existing TypeScript errors (not blocking)
- `settings.tsx`: `colors.*` typed as `ColorValue` not `string` in some sub-components
- `new-game.tsx`: route path type mismatch on `<Redirect href>`

## GitHub repo
- URL: https://github.com/dilippanicker/wordout
- Description, homepage, and topics set via `gh repo edit`
- README.md, LICENSE (MIT 2026 Dilip Panicker), `.github/ISSUE_TEMPLATE/` all present
- Issue templates: `word-list-issue.md`, `bug-report.md`

## Remaining Work (next session)

### Still to build
- App icon + splash screen
- Play Store listing prep (privacy policy page, screenshots)
- Consider: EAS build setup for generating APK

### Notes (verified working)
- Stats reset modal, dark theme toggle — both working correctly
- Quadout solved-board freeze logic verified correct in code
- Help modal has QUADOUT section + all 5 ICONS entries including New Game
- Board tile cap raised 68→74px: tiles grow on 390+ wide screens; 360px is width-limited at 64px (fundamental constraint)
- Settings vertical spacing increased: gap on 360×800 reduced from ~183px to ~40px
- Header title no longer clips on narrow screens (3-section flex row layout)
- Quadout blocked on small screens (<800px) with fallback + "Play Wordout instead" button; tile size dynamic (26–36px)
- App renamed Wordle→Wordout, Quordle→Quadout throughout UI; AsyncStorage keys unchanged

### Testing checklist before Play Store
- [ ] Hard mode validation correct
- [ ] Duplicate letter handling correct  
- [ ] Stats persist across app restarts
- [ ] Language switch starts new game
- [ ] Share emoji output correct format
- [ ] Both 412×915 (Pixel 7) and 360×800 layouts verified
