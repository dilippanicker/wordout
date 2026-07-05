# Changelog

All notable changes to Wordout are documented here.

## [1.5.4] — 2026-07-05
### Changed
- Share button hidden in practice mode (single-board and n-out) — share is only meaningful for daily games where everyone plays the same word

### Fixed
- N-out share header showed wrong max guesses on Extreme difficulty (e.g. "3-out 6/8" instead of "3-out 6/6") — now uses `maxGuessesForDifficulty` instead of a hardcoded formula
- N-out share header missing difficulty emoji — now shows e.g. "3-out 💀 6/6"

## [1.5.3] — 2026-07-05
### Added
- Enter key highlights with a green outline and green text once the current guess reaches 5 letters, in both single-board and n-out modes — reverts to normal on submit or when a letter is removed

## [1.5.2] — 2026-07-05
### Fixed
- Tutorial overlay layout instability — the card grew/reflowed mid-animation as the legend and "Got it!" button faded in; they now render statically from mount, so only tile colours/letters animate
- Tutorial overlay had no escape during the animation — "Got it!" now cancels the running sequence and closes immediately whenever it's tapped, including mid-animation
- N-out keyboard now shows only the active board's letter statuses instead of the union across all boards — matches single-board behaviour and updates when the active board is switched
- `new-game.tsx` route-type mismatch on `<Redirect href>` resolved

## [1.5.1] — 2026-07-04
### Added
- First-launch animated tutorial overlay (`TutorialOverlay.tsx`) — auto-plays a scripted RAISE/CLOUT/FROST demo game with tile flips, a colour legend, and a win flash, ending in a "Don't show again" checkbox + "Got it!" button
- `tutorialSeen` flag added to `settingsStore` (persisted, default `false`) — gates the tutorial to first launch unless opted out
- "▶ Watch how to play" button at the top of the Help modal — replays the tutorial on demand and resets `tutorialSeen`
- Tapping the tutorial's backdrop skips straight to the end state

## [1.5.0] — 2026-07-04
### Changed
- **Word lists rebuilt from NYT Wordle source** with comprehensive curation
  - Filtered from 2,315 NYT answers + 10,657 NYT guesses
  - Removed 17 offensive/blocklist words
  - Removed 157 proper nouns (verified against NLTK names corpus)
  - Removed -ED/-ING/-S forms where base exists in same list
- **UK English variants added**
  - UK answers (2,314) derived from US answers + SOWPODS guess list
  - UK spellings: FIBER→FIBRE, METER→METRE, PRIZE→PRISE
  - UK guess list from SOWPODS (8,554 5-letter words)
- **Word list regeneration tooling added** (wordlist/regenerate.py)

### Stats
- EN_US: 2,315 answers + 10,484 guesses (12,799 total)
- EN_GB: 2,314 answers + 8,554 guesses (10,868 total)

## [1.4.1] — 2026-07-02
### Added
- Stats modal empty state: "Play your first Easy/Hard/Extreme for stats" (daily) and "Play your first Wordout/N-out for stats" (practice) shown when no games played for that mode yet
- Settings footer: "© 2026 Onglipo Labs. *Ohm Shanti* Ω Ω Ω · MIT License"

### Fixed
- Startup funnel now checks `solved` (not just `status`) before advancing to next daily difficulty — prevented routing to Extreme after losing Hard on app restart
- Difficulty icon tap now shows descriptive toast ("Easy 🐣 lost, can't play Hard 💪") when stuck on a single lost daily difficulty
- Stats modal Daily tab now correctly shown when active game is daily (was always hidden due to `boardCount > 1` check; `boardCount` defaults to `4`)
- Stats modal header now shows "STATISTICS · Wordout" in single-board/daily mode
- Stats modal Daily/Practice tab no longer mutates `activeWordleMode` store — local state only, synced imperatively on open
- Stats modal difficulty sub-tab now opens to the active daily difficulty instead of always defaulting to Easy

## [1.4.0] — 2026-06-30
### Added
- Per-difficulty daily games: three independent games per day (Easy 🐣, Hard 💪, Extreme 💀), each with a different answer derived from a UTC-midnight seed
- Daily difficulty cycle: header emoji taps cycle through accessible difficulties only (no gate toasts); accessible list expands as difficulties are won
- "Unlocked! Play Now" button in footer after winning a daily difficulty (navigates directly to next unstarted game)
- Peek animation: header difficulty emoji briefly scales to next difficulty emoji after winning a daily game (🐣→💪 or 💪→💀)
- Per-difficulty daily streaks with missed-day detection
- Stats modal: 🐣/💪/💀 sub-tabs inside the Daily tab, each showing correct guess distribution and max guesses for that difficulty
- Startup funnel: on launch, routes to next unplayed daily difficulty rather than always restoring last played

### Changed
- Practice mode difficulty switching is now snapshot-based: switching difficulty saves current board state and restores it when switching back; no confirm dialog, no lock
- Celebration overlay now dismisses immediately on tap anywhere (TouchableOpacity); 5s auto-dismiss remains as fallback
- Daily ribbon label now includes difficulty emoji: "Today's · Hard 💪" / "Next word in HH:MM:SS 💪"

### Fixed
- Daily difficulty cycle no longer shows "Win Hard first" or "Win Easy first" toasts — gate is structural (accessible list boundary), not message-based

## [1.3.0] — 2026-06-29
### Added
- Haptic feedback: Warning notification on invalid word or hard mode violation (shake); Medium impact on correct guess (green tiles reveal); Success notification on win celebration
- Tap tile to clear rightward: tapping a filled tile in the current guess clears it and all tiles to the right; cursor lands at tapped position; works in single-board (Wordout), multi-board (Quordle), and daily modes
- Board indicator component extracted to `components/BoardIndicator.tsx` for cleaner indicator state display

## [1.2.9] — 2026-06-29
### Fixed
- Daily difficulty toast shortened to "Daily is always Easy" — previous message overflowed the footer on device

## [1.2.8] — 2026-06-29
### Added
- Celebration overlay shows "Closing in 5…4…3…2…1…" countdown (green, bold) while auto-dismiss timer runs; driven by `END_GAME_DISMISS_MS` constant — single source of truth for timer and display

### Changed
- Celebration overlay (win and lose) auto-dismiss timer extended from 3 seconds to 5 seconds
- Celebration overlay content layout: increased item gap (14→24) and added vertical padding — content now has natural breathing room across the full overlay height instead of being tightly clustered

### Fixed
- Last-row tiles no longer re-animate after celebration overlay auto-dismisses — `!waveDoneLocal` guard on `FlipTile` condition in `GameBoard` prevents type-change remount that was replaying the fill animation
- Hard mode in n-out (2-out to 8-out): each board now enforces only its own revealed hints independently; a guess is accepted if it satisfies at least one unsolved board's constraints (previously rejected if ANY board's constraint was violated, so board 1 revealing 'I' blocked all guesses without 'I' even for boards that didn't need it)
- `onWaveDone` now fires at true wave end — last tile's `withSpring` completion via Reanimated `runOnJS` — so ✓/✗ overlay cannot appear before the bounce wave finishes on any board size (previously fired at wave start, causing early overlay on large boards e.g. 8-out)
- Animation sequence overhaul — fill/wave/celebration/final-state now fire correctly in all modes:
  - Fill animation no longer re-fires when switching mode or board count back to a completed game (`GameBoard` keyed by mode/boardCount, forcing remount so `prevCount` ref initialises fresh)
  - Celebration popup no longer re-fires when switching board counts back to a completed game (`celebrationShown` flag in all stores; `boardCount` added to mode-reset effect deps)
  - Wave animation correctly skips on revisit in all cases
  - `celebrationShown` flag added to `gameStore`, `dailyStore` (persisted), and `quordleStore` (saved in bc-snapshots)

### Changed
- README and CLAUDE.md updated; `docs/playstore.md` added (Play Store setup checklist)

## [1.2.7] — 2026-06-28
### Changed
- B3: Help screen text content extracted to `constants/helpContent.ts` — edit text there without touching component code

### Fixed
- B1: Win-wave animation fires once per game only — `onWaveDone()` now called at wave START (not after timer) via `waveSentRef`; `waveShownRef` syncs prop into effect without triggering re-run; `isRevisit` guard skips animation on board revisit
- B2: Daily mode is always Easy — removed lock logic; difficulty icon shows 🐣 in daily; toast shown when user tries to change difficulty in daily: "Daily is always Easy · Try changing difficulty in Practice"


## [1.2.6] — 2026-06-28
### Changed
- B1: Footer on completed daily no longer shows countdown — Ribbon already shows it; footer shows only [? for help] [📊]
- B7: Practice mode label now shows text before icon: "Practice · Easy 🎮" (daily remains "📅 Today's · Easy")
- B8: Help screen Ribbon section now has a description paragraph explaining its purpose and content
- B9: ↺ New Game in footer is now a styled green button (matches Share); layout: [? for help] [spacer] [↺ New Game] [📊]
- D2: Help screen ◄ ► description updated to list all board count names (Wordout, 2-out … 8-out)

### Fixed
- B2: Wave animation re-triggering on board revisit — fixed race condition where `waveDone` state lagged one render behind the `waveShown` prop; now computed directly from prop
- B3: Multi-board state now persists across mode switches — board counts save/restore their game state via snapshots; only ↺ New Game explicitly clears
- B4: Practice board resets when difficulty changes (both header toggle and settings); quordle snapshots cleared on difficulty change
- B5: Difficulty locked after any game completes (not just daily) — shows toast, prevents change until new game started
- B6: Daily difficulty lock now allows changes before first guess is submitted; only locks after guesses.length > 0 or game completed

## [1.2.5] — 2026-06-28
### Changed
- B1: Footer game-over state redesigned — single row with [? for help] [📊] [↺ New Game / countdown]; stats row removed from footer (accessible via 📊)
- B3: Ribbon shows "Next word in HH:MM:SS" countdown inline with 📅 after daily completion (replaces "Today's · Easy")
- B7: Multi-board footer shows persistent "Board N solved in M ✓" for current solved board (not just a flash on solve)
- B9: Active board indicator uses green filled square with ✓ when solved (non-active solved boards use green filled circle)

### Fixed
- B2: Wave animation stored in game/daily/quordle stores — persists across mode switches, no re-animation on return to solved board
- B4: Header difficulty icon reflects active mode's locked difficulty (daily shows dailyDifficulty, practice shows settingsStore difficulty)
- B5: Help screen — ◄ ► arrows moved to Header section (were incorrectly in Footer); "at the bottom" text corrected to "in the header"
- B6: Switching modes no longer resets a completed multi-board game — newGame() only called when board count actually changes
- B8: Resolved by B1 — stats removed from footer; available via 📊 modal only

## [1.2.4] — 2026-06-28
### Changed
- B1: Overlay is now Share-only; ↺ New Game (practice/multi-board) and "Next word in HH:MM:SS" countdown (daily) moved to Footer
- B7: Help screen ICONS section split into three subsections: Top bar, Ribbon (📅 🎮), Footer (📊 ‹› 🔥 ⚡)

### Fixed
- B1: After overlay auto-dismisses, Footer shows ↺ New Game (practice) or countdown (daily) so users can act without reopening overlay
- B2: Solved board wave animation fires once only — revisiting a completed board via swipe now goes directly to ✓ state
- B3: Mode/difficulty label inline to right of active icon (already addressed in D2/v1.2.3 — confirmed)
- B4: Footer no longer shows "Board X solved in N" when switching to a different board — clears on swipe
- B5: Practice 1-out difficulty change no longer fires daily lock toast — lock only applies when activeWordleMode === 'daily'
- B6: Settings difficulty change no longer locks for multi-board or practice modes — fix matches ribbon logic
- B7: Help screen zone labels updated — Ribbon (📅 🎮 mode switchers) and Footer (stats bar) correctly named
- B8: ∞ → 🎮 throughout (already addressed in D1/v1.2.3 — confirmed)

## [1.2.3] — 2026-06-28
### Changed
- D1: Practice mode icon changed from ∞ to 🎮 throughout — indicator row and HelpModal bottom strip section
- D2: Mode/difficulty label now appears inline to the right of the active icon (not below it) — layout: `[📅 Today's · Easy]  [🎮]` or `[📅]  [🎮 Practice · Easy]`

### Fixed
- B1: "Today's · Easy" label on Android now stays under 📅 icon — `maxWidth: 80`, `marginTop: 2`, `numberOfLines={1}` prevent text overflow and misalignment
- B2: Board now refreshes when returning from Settings after mode change — `boardCount` added to scroll-reset deps + new clamp effect resets activeBoard when boardCount shrinks
- B3: Difficulty icon in header locked after daily completed or in-progress — guard changed from `!isQuordle` to `isDaily`; practice mode can still change difficulty freely
- B4: End-game overlay auto-dismisses after 3 seconds in all modes — decoupled to `useEffect([endGameVisible])` so cleanup from mode-change effects can't cancel the timer
- B5: Practice lose overlay ↺ New Game button — added `stopPropagation` + explicit `dismissEndGame()` to align with ? button behaviour; ensures button works on web and Android

---

## [1.2.2] — 2026-06-28
### Added
- Indicator row label: "Today's · Easy" (daily) or "Practice · Easy" (practice) under active mode icon
- Streak explanation (🔥/⚡) added to HelpModal icon section

### Changed
- Bottom strip state 1 (playing): "⏳ N tries left · ? for help" (replaces "Guess N of M")
- Bottom strip state 3 (game over): stats row "N played · M% win · ⚡/🔥 S" (replaces chip layout)
- Removed multi-board solved count from playing state (was "X solved · Y remaining")
- Word count pills removed from Settings footer
- Removed auto-clear of current guess after invalid-word shake (user backspaces manually)
- Removed "Continue →" button introduced in v1.2.1 (simplified flow)
- Difficulty lock in Settings: applies when daily is *completed* (not just while playing); shows inline toast instead of native Alert
- RV1: End-game overlay — removed `marginTop: -4` on solve-count text that caused overlap with answer word

### Fixed
- B1: End-game overlay — practice shows "↺ New Game" button; daily shows countdown to next word
- B2: Daily "New Game" tapped when daily completed now shows correct toast instead of resetting board
- B3: Win/lose animations fire only once per game — mode switch no longer re-triggers end-game popup
- B5: Difficulty locked after daily game *completed* (was only blocked while playing)
- B6: Practice game board persists correctly when switching to daily and back
- B7: ✓/✗ board overlay appears after wave/shake animation completes (timestamp-based delay)
- B8: Multi-board bottom strip no longer shows "X solved · Y remaining" during play
- B10: Mode arrows (‹ ›) now immediately start a game with the correct board count
- B13: Streak explanation added to HelpModal

---

## [1.2.1] — 2026-06-27
### Added
- Win overlay: "Solved in X/N tries 💪" line below the answer word (correct difficulty emoji shown)
- Continue button: after end-game popup dismisses, a green "Continue →" link hides the ✓/✗ board overlays
- Stats modal header now shows current mode: "STATISTICS · Wordout", "STATISTICS · 4-out" etc.
- Help screen: Extreme mode 💀 entry added to top bar icon list

### Changed
- Header ‹ › arrows replaced with solid filled triangles (grey #aaa, no box wrapper)
- Bottom strip: pre-game shows "? for help" in green; playing shows "Guess N of M · ? for help" (green ? for help)
- Help screen: board indicator square now matches actual colour (green #5BA75A)
- Help screen: statistics icon updated from bar-chart outline to 📊 emoji (matches actual strip)
- Help screen: arrow pair updated to solid triangles matching new header arrows
- Help screen: feedback prompt shortened to "Missing or wrong word?"

### Fixed
- B1: Settings screen safe area — top edge now accounts for status bar/notch
- B2: Settings mode change no longer navigates away; user stays on Settings screen
- B3: Difficulty change blocked while daily game is in progress (alert: "Daily game in progress — difficulty locked")
- B4: Header mode label now updates immediately when using ‹ › arrows

---

## [1.2.0] — 2026-06-27
### Added
- Extreme mode (💀): third difficulty level with reduced guesses — `max(3, (5+boardCount)−2)` — shown in BottomStrip State 1
- `difficulty: 'easy'|'hard'|'extreme'` replaces `hardMode: boolean` in settingsStore (migrated via Zustand persist `version: 1`)
- Settings footer: word count pills (answers + valid words), GitHub link, credits, version string
- ? help icon in StatsModal header opens HelpModal
- ? help icon in end-of-game overlay
- ‹ › mode arrows wrapped in grey squares matching board indicator style (#878a8c)
- Pre-game tip text is now tappable and opens HelpModal
- `clearCurrentGuess` action in all three game stores

### Changed
- Invalid-word shake: currentGuess auto-clears after 950ms (no stale text in input row)
- Overlay timing: wave → end-game popup → dismiss → per-board ✓/✗ overlay (was wave → overlay → popup)
- Daily completed board: returns to static ✓ overlay on revisit (no re-animation)
- Mode switching (‹ › and Settings board count select) preserves game state — no longer calls newGame()
- HelpModal: `hardMode: boolean` prop replaced by `difficulty: Difficulty`
- Settings "Dark Theme" label: text color passed explicitly (was incorrectly blue/link on iOS)

### Fixed
- Share button icon vertical alignment in BottomStrip State 3 and end-game overlay
- Streak emoji/number vertical alignment in BottomStrip State 3
- 2-out board last row clipped on web — subtracted 12px boardPage padding from tile height calculation

---

## [1.1.1] — 2026-06-26
### Fixed
- Hard mode toggle mid-game: after abandoning, now starts a new game immediately
- Share button in bottom strip and end-game overlay uses share-social-outline icon
- Settings screen: added ? help icon to header
- HelpModal icons section: 💪/🐣 split into separate rows; sun icon for light theme; bottom strip icons shown in green (active state); absent tile is dark (#3a3a3c) in dark mode
- Mode indicator icons (📅/∞) now show green tint background when active
- Version string on web omits build number (was showing "build ---")
- Bottom strip overlapping Android system nav bar — added bottom safe area inset
- Startup mode: app opens Daily mode if daily not yet completed today; otherwise restores last-played board mode

### Added
- Pre-game tip in bottom strip before first guess: "📅 Daily · ∞ Practice · ? Help"
- First-ever launch defaults to Daily Wordout

---

## [1.1.0] — 2026-06-26
### Added
- Daily Word mode: date-seeded word (epoch 2026-01-01), one word per day per language, persisted state, separate daily stats
- Daily mode end-of-game overlay: countdown "Next daily in HH:MM:SS" to midnight; does not auto-dismiss
- Daily share format: "Wordout Daily #N — solved in X/6" + emoji grid
- 📅/∞ mode icons in single-board indicator row to switch between Daily and Practice sub-modes
- BottomStrip replaces tab bar: shows guess count (playing), board-solved flash (multi-board), and compact stats + share (game over)
- StatsModal: opened via 📊 icon; Daily|Practice tabs for Wordout; guess distribution; reset stats (clears both practice and daily)

### Changed
- Header redesigned: left [🇺🇸/🇬🇧 💪/🐣 ↺], center [‹ mode ›], right [🌙 ⚙ ?]
- Mode cycling (‹›) and New Game (↺) moved from tab bar to header
- Tab bar hidden entirely; navigation structure preserved via Expo Router
- Hard mode icon changed 🔥 → 💪 to free 🔥 for daily streak emoji convention
- Stats section removed from Settings screen (moved to StatsModal)
- Emoji convention enforced in new UI: 🔥 daily streak, ⚡ practice streak, 🏆 personal best

## [1.0.4] — 2026-06-26
### Fixed
- Tile flip animation slowed down (300ms → 400ms per tile) and stagger increased (150ms → 180ms) for a more deliberate, satisfying feel
- Win wave stagger increased (50ms → 80ms per tile) so the wave completes before the ✓ overlay appears
- Win overlay now delays dynamically based on guess count — no longer appears while tiles are still bouncing
- Lose overlay delay increased slightly (190ms → 400ms settle after shake ends)
- End-of-game full-screen overlay delayed to give per-board ✓/✗ overlays time to settle (win: 1800ms → 4200ms, lose: 2500ms → 3200ms)
- Extrapolation.CLAMP added to FlipTile interpolations, fixing black flash on web caused by back face extrapolating to −180° before flip starts

## [1.0.3] — 2026-06-26
### Fixed
- Duplicate guesses now rejected with "Already guessed" toast (both single and multi-board modes)

### Added
- Production AAB built alongside APK in GitHub Actions; both uploaded as artifacts and attached to GitHub Release
- GitHub Releases now versioned by `app.json` version (e.g. `v1.0.3`) with release notes pulled from matching `CHANGELOG.md` section

## [1.0.2] — 2026-06-25
### Fixed
- Multi-board mode web layout: board pages used `flex: 1` which caused CSS `flex-basis: 0`, collapsing all pages to `screenW/boardCount` wide and making every board visible simultaneously on web — fixed with `flexShrink: 0` and plain View wrapper
- Settings Game Mode selector showed "Quadout" instead of "4-out"

### Added
- Words INBOX, ADMIN, DEBUG added to EN-US and EN-GB answer and guess lists (PIXEL, CLICK, SWIPE, CACHE, VIRAL, PATCH, LOGIN, EMAIL, FORUM were already present)

## [1.0.1] — 2026-06-25
### Fixed
- Removed green rectangle border that appeared around solved boards in multi-board mode
- Win animation: all tiles now wave left→right top→bottom (50ms stagger) on solve; board dims to 70% with large green ✓ overlay after wave
- Lose animation: 3 shakes (was 2), 14px amplitude, 910ms total; red tint flash at shake start; board dims with large red ✗ + answer word overlay
- End-of-game full-screen overlay: emoji + outcome message + answer words + Share button; auto-dismisses after 3s or on tap
- Single-board win-row bounce was broken (solved prop never passed to GameBoard in Wordle mode) — fixed

### Removed
- Full-screen green shimmer win animation (replaced by per-board ✓ overlay + end-of-game overlay)
- Board dim-to-45%-opacity on loss (replaced by per-board ✗ overlay)

## [1.0.0] — 2026-06-25
### Added
- Wordout single board mode (6 guesses)
- Multi-board modes: 2-out, 3-out, 4-out, 6-out, 8-out
- Board progress indicators (▶ ○ ① ✓) above swipeable boards
- Settings: American/British English, hard mode, dark theme, colour blind mode
- Stats per mode with guess distribution bar chart
- Share emoji grid output
- Help modal with RAISE/CLOUT/FROST easter egg, rendered board indicators
- App icon: parchment (#FFF8EE) background, RAISE/CLOUT tiles (answer: FROST)
- Bottom tab bar: ↺ New Game | ‹ mode › switcher | ⚙ Settings
- Abandon guard on New Game, mode switch, language switch
- GitHub Actions build pipeline (local EAS, no quota consumed)
- Privacy policy at https://dilippanicker.github.io/wordout/privacy.html
- MIT License

### Technical
- Expo SDK 56, React Native, TypeScript
- Zustand + AsyncStorage persist
- react-native-reanimated for animations
- EAS Build profiles: development, preview (APK), production (AAB)
