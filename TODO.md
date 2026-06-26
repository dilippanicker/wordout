# Wordout — Master TODO
**Updated: 2026-06-27**
**Current version: v1.2.0 (committed, pushed, build triggered)**

---

## 🔴 IMMEDIATE — Test & Play Store

- [ ] Wait for GitHub Actions build (~45 min) — v1.2.0 APK at releases/latest
- [ ] Test on device (Samsung S24 Ultra):
  - Extreme mode: ≤ 3 guesses for 1-board; ≤ 6 for 4-out; reduced for other counts
  - ‹ › arrows styled as grey squares
  - Pre-game tip tappable → opens HelpModal
  - Mode switch (‹›, Settings board count) preserves in-progress game
  - Invalid word: guess auto-clears after ~950ms
  - End-game overlay timing: wave → popup → dismiss → per-board ✓/✗
  - Returning to completed daily: static ✓ (no re-animation)
  - StatsModal: ? help icon opens HelpModal
  - Share button alignment in BottomStrip State 3
  - Streak emoji/number alignment in BottomStrip State 3
  - Settings footer: word count pills, GitHub link, version
  - Dark Theme label: plain text (not blue/link)
- [ ] Feature graphic (1024×500px) — design in claude.ai
- [ ] Screenshots on S24 Ultra (min 2, recommend 6):
  - Fresh empty board (Wordout mode, showing pre-game tip)
  - Mid-game with green/yellow tiles
  - Multi-board mode (4-out) mid-game
  - End-of-game overlay (win)
  - Settings screen (showing new footer + difficulty radio)
  - Help modal
- [ ] Complete Play Console setup:
  - Content rating questionnaire
  - Data safety (no data collected — all local)
  - Target audience (everyone)
- [ ] Upload AAB to internal testing track (`releases/latest/download/wordout.aab`)
- [ ] Promote to production
- [ ] Set up Google Play service account for automation (after first manual upload)
- [ ] Add GOOGLE_PLAY_SERVICE_ACCOUNT_JSON secret to GitHub
- [ ] Update GitHub Actions workflow to auto-upload to internal track

---

## ✅ v1.2.0 — Completed 2026-06-27

- ✅ Extreme mode (💀): `max(3, (5+boardCount)−2)` guesses; shown in BottomStrip State 1
- ✅ `difficulty: 'easy'|'hard'|'extreme'` replaces `hardMode: boolean` (Zustand persist migration)
- ✅ Settings DIFFICULTY section: DifficultyRow radio buttons (🐣 Easy / 💪 Hard / 💀 Extreme)
- ✅ Settings footer: word count pills, GitHub link, credits, version string
- ✅ ? help icon in StatsModal header
- ✅ ? help icon in end-of-game overlay
- ✅ ‹ › mode arrows wrapped in grey squares (#878a8c)
- ✅ Pre-game tip tappable → opens HelpModal
- ✅ `clearCurrentGuess` action in all three game stores
- ✅ Auto-clear currentGuess 950ms after invalid-word shake
- ✅ Overlay timing: wave → popup → dismiss → per-board ✓/✗ (`overlayLocked` + `suppressOverlay`)
- ✅ Daily revisit: static ✓ overlay, no re-animation
- ✅ Mode switch (‹›, board count select) preserves game — no longer calls newGame()
- ✅ Share button icon vertical alignment fix (BottomStrip + overlay)
- ✅ Streak emoji/number vertical alignment fix (BottomStrip State 3)
- ✅ 2-out board last row clipping fix on web (BOARD_PAGE_PAD = 12)
- ✅ Settings "Dark Theme" label: explicit textColor prop (was blue/link on iOS)
- ✅ `WORD_COUNT_ANSWERS` / `WORD_COUNT_GUESSES` exported from gameStore

## ✅ v1.1.1 — Completed 2026-06-26

- ✅ Hard mode toggle mid-game: abandon confirm + new game starts immediately
- ✅ Share button: share-social-outline icon (BottomStrip + end-game overlay)
- ✅ Settings screen: ? help icon in header opens HelpModal
- ✅ HelpModal: 💪/🐣 as separate rows; sun icon for light theme; absent tile dark in dark mode
- ✅ Mode indicator (📅/∞): green tint background when active
- ✅ Version string on web: omits build number
- ✅ Bottom strip: paddingBottom = insets.bottom (fixes Android nav bar overlap)
- ✅ Startup logic: opens Daily if not yet completed today; otherwise restores last-played mode
- ✅ Pre-game tip in bottom strip: "📅 Daily · ∞ Practice · ? Help" before first guess

## ✅ v1.1.0 — Completed 2026-06-26

- ✅ Header redesign: left [🇺🇸/🇬🇧 💪/🐣 ↺] | center [‹ mode ›] | right [🌙 ⚙ ?]
- ✅ Tab bar hidden; mode cycling and new game moved to header
- ✅ BottomStrip: 3 states (playing/board-solved/game-over) + 📊 stats icon
- ✅ StatsModal: Daily|Practice tabs, distribution chart, reset stats
- ✅ Stats removed from Settings screen
- ✅ Daily Word mode with countdown overlay
- ✅ Emoji convention: 🔥 daily streak, ⚡ practice streak, 🏆 personal best

---

## 🟢 v1.3 — Nice to Have

- [ ] Haptic feedback on correct/wrong guess
- [ ] Animate board indicator state transitions
- [ ] Sequential ✓ flash across boards before end-game overlay (multi-board all-won)
- [ ] GitHub Actions → Play Store auto-publish pipeline
- [ ] End-game overlay delay dynamic based on guess count (currently fixed — feels long on 1-guess wins)

---

## ✅ Completed

- ✅ Core game: single board Wordout mode
- ✅ Multi-board modes: 2-out, 3-out, 4-out, 6-out, 8-out
- ✅ Board progress indicators (▶ ○ ① ✓)
- ✅ Settings: language, difficulty (easy/hard/extreme), dark theme, colour blind
- ✅ Stats per mode with guess distribution
- ✅ Share emoji grid
- ✅ Help modal rewrite (RAISE/CLOUT/FROST, rendered indicators, Onglipo Labs)
- ✅ App icon: parchment bg, RAISE/CLOUT easter egg
- ✅ splash/adaptive-icon background #FFF8EE
- ✅ GitHub Actions build pipeline
- ✅ Abandon guard (New Game, mode switch, language switch)
- ✅ Privacy policy at GitHub Pages
- ✅ Play Store listing text (name, short desc, full desc)
- ✅ Google Play Console account + identity verified
- ✅ Package com.dilippanicker.wordout registered
- ✅ 2026-06-25 v1.0.1: Remove green border from solved boards
- ✅ 2026-06-25 v1.0.1: Win/lose overlays + end-of-game full screen overlay
- ✅ 2026-06-25 v1.0.2: Fix "Quadout" → "4-out" in Settings + wordlist additions
- ✅ 2026-06-26 v1.0.3: Reject duplicate guesses; versioned GitHub Releases
- ✅ 2026-06-26 v1.0.4: Tile flip timing, wave animation, FlipTile CLAMP fix
- ✅ 2026-06-26 v1.1.0: Daily mode, BottomStrip, StatsModal, header redesign
- ✅ 2026-06-26 v1.1.1: Bug fix round 1+2, startup logic, safe area, pre-game tip
- ✅ 2026-06-27 v1.2.0: Extreme mode, overlay timing, game-persist, 11 additional fixes

---

*Update at end of every CC session via /close*
