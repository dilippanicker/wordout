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

## Screen Zone Naming Convention
- **Header** — top bar: 🇬🇧 🐣 ↺ | ◄ Wordout ► | ☽ ⚙ ?
- **Ribbon** — 📅 🎮 icons + board indicators + contextual status (next word countdown etc)
- **Board** — tile grid
- **Keyboard** — on-screen keyboard
- **Footer** — ⏳ tries left / new game button / 📊 stats

---

## Architecture

### Routing — `app/`
- `_layout.tsx` — root Stack + ThemeProvider (light/dark driven by `settingsStore.darkTheme`)
- `(tabs)/_layout.tsx` — 3-tab layout:
  - **New Game** (refresh icon) — action tab; `tabPress` prompts to abandon if game in progress, then calls `newGame()` on both stores
  - **Wordout / mode name** (grid/apps icon) — cycles board counts (1→2→3→4→6→8→1) on tap while active
  - **Settings** (gear icon)
- `(tabs)/index.tsx` — game screen
- `(tabs)/settings.tsx` — settings + stats
- `(tabs)/new-game.tsx` — dummy redirect to `/(tabs)/`

### Stores — `store/`

**`settingsStore.ts`** — persisted (`wordle-settings`):
- `language`, `difficulty: 'easy'|'hard'|'extreme'`, `darkTheme`, `colorBlindMode`
- `gameMode: 'wordle'|'quordle'`, `boardCount: 1|2|3|4|6|8`
- `maxGuessesForDifficulty(difficulty, boardCount)` — extreme = `max(3,(5+boardCount)−2)`, else boardCount===1 ? 6 : min(13,5+boardCount)
- `boardCountName(n)` → `'Wordout'|'2-out'|'3-out'|'4-out'|'6-out'|'8-out'`

**`gameStore.ts`** — practice 1-out logic:
- `waveShown: boolean` — wave-shown flag; reset in `newGame()`
- `celebrationShown: boolean` — celebration popup shown flag; reset in `newGame()`
- `clearCurrentGuess()` — not auto-called; user backspaces manually after shake

**`quordleStore.ts`** — multi-board logic:
- `waveDoneBoards: boolean[]` — per-board wave flags
- `celebrationShown: boolean` — end-game popup shown flag; saved/restored in snapshots
- `snapshots: Record<number, QuordleSnapshot>` — in-memory per-board-count state (NOT persisted)
- `switchBoardCount(n)` — saves current state to snapshot (incl. celebrationShown), restores n if previously visited
- `newGame()` — clears snapshot for current bc, starts fresh

**`dailyStore.ts`** — persisted (`wordout-daily`):
- `DAILY_EPOCH = new Date('2026-01-01').getTime()`
- `dailyStatus: 'available'|'playing'|'completed'`
- `dailyDifficulty: Difficulty` — always 'easy'; daily is Easy-only until v1.4
- `activeWordleMode: 'daily'|'practice'`
- `waveShown: boolean` — persists win-wave shown flag for today's daily
- `celebrationShown: boolean` — persists end-game popup shown flag for today's daily
- `checkAndReset()` — resets to 'available' if new day; call on app focus

**`statsStore.ts`** — persisted (`wordle-stats`):
- `byMode: Record<string, BoardStats>` — keyed by `'wordle'` or `String(boardCount)`

### Key Design Decisions (locked)

**Daily mode:**
- Always Easy difficulty — informational toast shown on change attempt
- One game per day, same word for everyone
- Difficulty locked — daily is Easy-only until v1.4 per-difficulty daily games

**Practice mode:**
- Unlimited games, freely change difficulty (resets board on change)
- Board state persists on mode switch — only ↺ New Game clears

**Never clear rule:**
- Games never auto-cleared without explicit user action (↺ New Game)
- Confirmed abandon guard on: New Game, mode arrows, language change, difficulty change mid-game

**Ribbon label layout:**
- Daily active: `[📅 Today's · Easy ····· 🎮]` — icon before text
- Daily completed: `[📅 Next word in HH:MM:SS ····· 🎮]`
- Practice active: `[📅 ····· Practice · Easy 🎮]` — text before icon

**Board indicators:**
- Green square + ▶ — current board, not solved
- Green filled square + ✓ — current board, solved
- Grey circle — non-active, no guesses
- Green circle + number — correct position letters found
- Yellow circle + number — yellows also found
- Green filled circle + ✓ — non-active, solved

**Footer layout:**
- Playing: `[⏳ N tries left · ? for help] [📊]`
- Game over (practice): `[? for help] [↺ New Game (green)] [📊]`
- Game over (daily): `[? for help] [📊]` (countdown in Ribbon, not Footer)

**Emoji convention (strict):**
- 🐣 easy, 💪 hard, 💀 extreme
- 🔥 daily streak, ⚡ practice streak, 🏆 personal best
- 📅 daily mode, 🎮 practice mode

**App name:** Wordout (not WordOut, not WORDOUT)
**Mode names:** Wordout, 2-out, 3-out, 4-out, 6-out, 8-out

### Animation sequence (locked design)

**Four animation types:**
1. **Fill (flip):** tiles reveal colours on guess submit. Always fires on every new guess. Never suppress.
2. **Wave:** solved-board tiles bounce. Fires ONCE on first solve via `waveShown`/`waveDoneBoards` flags.
3. **Celebration overlay:** full-screen "Solved!" / "Better luck next time" popup. Fires ONCE via `celebrationShown` flag.
4. **Final state:** `✓`/`✗` dim overlay on board. Always visible on completed boards, no animation.

**Key implementation details:**
- `GameBoard` receives `key={isDaily ? 'daily' : 'practice'}` (single-board) or `key={\`${boardCount}-${i}\`}` (quordle) — forces remount on mode/bc switch so `prevCount` ref initialises fresh (prevents spurious fill animation on revisit).
- `celebrationShown` is checked in `index.tsx` before firing the end-game popup. Set immediately on first fire, stored in all three game stores.
- `boardCount` is in the mode-reset `useEffect` deps — syncs `prevGameStatusRef` on bc-switch so returning to a completed bc-game doesn't re-trigger the popup.
- Wave skip path in `GameBoard`: on remount with `waveShown=true`, `isRevisit=true` → `setWaveDoneLocal(true)` immediately → no bounce → ✓ overlay shows via `elapsed=Infinity` path.
- `onWaveDone` fires at TRUE wave end — `BounceTile` last tile (`row=count-1, col=COLS-1`) uses `runOnJS` in the `withSpring` completion callback. `stableHandleWaveDone` is a `useCallback([], [])` stable reference that reads `onWaveDone` via `onWaveDoneRef` to avoid stale closure; guards with `waveSentRef` to prevent double-call. Do NOT call `onWaveDone` at wave start — that causes ✓ overlay to appear before the wave finishes on large boards.
- FlipTile is gated on `row === animatingRow && !waveDoneLocal` — the `!waveDoneLocal` guard is critical. When `waveDoneLocal` flips true, both the BounceTile wrapper condition and the FlipTile condition become false in the same render, collapsing to a static Tile. Without this guard, React sees a BounceTile→FlipTile type change and remounts FlipTile fresh (progress=0), replaying the fill animation after the overlay dismisses.

**Hard mode constraint semantics (n-out):**
- Each board independently enforces only its own revealed hints (`checkHardModeConstraints` uses per-board history via `g.boardResults[b]`)
- A guess is **accepted** if at least one unsolved board's constraints are satisfied
- A guess is **rejected** only when ALL unsolved boards reject it (toast shows first board's violation)
- A board with no revealed letters trivially accepts (no constraints) — normal in early turns
- Single-board (`gameStore`) hard mode is unchanged: that board's constraints always apply

### Difficulty lock rules
- Daily: always Easy; toast on change attempt: "Daily is always Easy"
- Practice in-progress: confirm abandon before changing
- Practice completed: locked until New Game; toast: "Game complete — start a new game to change difficulty"

### Startup logic
On app mount:
1. `checkAndReset()` — ensure daily state is current
2. If daily not yet completed today → open Daily Wordout
3. Otherwise → restore last played mode

### Abandon guard — `utils/abandon.ts`
`isGameInProgress()` reads stores imperatively. Checks guesses submitted, not just game state existence.
`confirmAbandon(onConfirm)` — `Alert.alert` on Android/iOS, `window.confirm` on web.

### Help content
Text strings extracted to `constants/helpContent.ts` — edit there without touching `HelpModal.tsx`.

---

## Build Pipeline

**GitHub Actions (primary):** `.github/workflows/build-apk.yml` — trigger manually from Actions tab.
- Builds APK (`preview`) then AAB (`production`) sequentially
- Creates versioned GitHub Release with both files
- Build time: ~45 min; faster with warm Gradle cache
- Requires `EXPO_TOKEN` secret in repo settings

**Download links:**
- `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk`
- `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.aab`

**Do NOT use local EAS builds** — Java/Gradle environment issues. GitHub Actions is the only supported build path.

---

## Version Bumping Protocol

Before every build, follow exactly:

1. Read `app.json` for current `version` and `versionCode`
2. Propose bump with reasoning, wait for confirmation:
   > "Ready to build. Proposing v1.2.8 (versionCode 16) — patch: bug fixes. Confirm?"
3. Only after confirmation: update `app.json`, update `CHANGELOG.md`, commit and push

**Rules:**
- `versionCode` always +1 from current. Never skip, never reuse.
- Semver: patch = bug fixes; minor = new features; major = breaking changes
- Never update `app.json` before user confirms
- Never trigger build without confirmed version bump

**Current version:** `1.3.0` (versionCode 18)

---

## Play Store
- Publisher: Onglipo, package: `com.dilippanicker.wordout`
- Internal + closed testing live, 12/12 testers opted in
- Production access: ~July 10 2026
- Last uploaded: versionCode 4 (v1.0.3) — upload v1.2.7 AAB next
- See `docs/playstore.md` for setup checklist

---

## Model Selection

CC uses Haiku as executor with Opus as advisor. Set up once at session start:

```
claude config set model claude-haiku-4-5-20251001

claude config set advisorModel claude-opus-4-8
```

CC cannot switch models programmatically. The advisor setup means Opus is consulted automatically at key moments (before writing, before committing to an approach, when stuck, before declaring done). No manual model switching needed.

Cost awareness: Haiku as executor keeps costs low; Opus advisor only engages when needed. Run `/compact` at 50%+ context.

---

## Known Issues
- `new-game.tsx`: route path type mismatch on `<Redirect href>` (non-blocking)
