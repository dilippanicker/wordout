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
- `waveShown: boolean` — persists win-wave shown flag; reset in `newGame()`
- `clearCurrentGuess()` — not auto-called; user backspaces manually after shake

**`quordleStore.ts`** — multi-board logic:
- `waveDoneBoards: boolean[]` — per-board wave flags
- `snapshots: Record<number, QuordleSnapshot>` — in-memory per-board-count state (NOT persisted)
- `switchBoardCount(n)` — saves current state to snapshot, restores n if previously visited
- `newGame()` — clears snapshot for current bc, starts fresh

**`dailyStore.ts`** — persisted (`wordout-daily`):
- `DAILY_EPOCH = new Date('2026-01-01').getTime()`
- `dailyStatus: 'available'|'playing'|'completed'`
- `dailyDifficulty: Difficulty` — always 'easy'; daily is Easy-only until v1.4
- `activeWordleMode: 'daily'|'practice'`
- `waveShown: boolean` — persists win-wave shown flag for today's daily
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

### Difficulty lock rules
- Daily: always Easy; toast on change attempt: "Daily is always Easy · Try changing difficulty in Practice"
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

**Current version:** `1.2.7` (versionCode 15)

---

## Play Store
- Publisher: Onglipo, package: `com.dilippanicker.wordout`
- Internal + closed testing live, 12/12 testers opted in
- Production access: ~July 10 2026
- Last uploaded: versionCode 4 (v1.0.3) — upload v1.2.7 AAB next
- See `docs/playstore.md` for setup checklist

---

## Model Selection

Start every session on Haiku — `/model haiku` runs automatically in `/open`.

| Situation | Model |
|-----------|-------|
| Simple edits, config, file reading, cleanup | Haiku |
| Complex logic, hard bugs, animations, store changes | Sonnet |
| Sonnet failing after 2 attempts | Opus |

Always announce switches: "Switching to Sonnet — animation logic is complex."
De-escalate after hard task: "Switching back to Haiku — cleanup now."

Cost awareness: Haiku ≈ 20× cheaper than Sonnet. `/compact` at 50%+ context.

---

## Known Issues
- `new-game.tsx`: route path type mismatch on `<Redirect href>` (non-blocking)
