# Changelog

All notable changes to Wordout are documented here.

## [Unreleased]

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
