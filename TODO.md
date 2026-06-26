# Wordout — Master TODO
**Updated: 2026-06-26**
**Current version: v1.0.4 (committed, build not yet triggered)**

---

## 🔴 IMMEDIATE — Build & Test v1.1.0

- [ ] Confirm version bump: v1.1.0 (versionCode 6) — pending user confirmation
- [ ] Push and trigger GitHub Actions build
- [ ] Test on device:
  - Daily mode: tap 📅, play a game, check countdown overlay, share
  - Practice mode: tap ∞, verify game works
  - ‹/› arrows cycle modes with abandon guard
  - ↺ new game button works with abandon guard
  - ⚙ opens settings
  - 📊 opens StatsModal with correct stats
  - BottomStrip: State 1 (playing), State 2 (board solved flash), State 3 (game over)
  - Multi-board State 2 flash on board solve
  - Daily overlay: stays visible, shows countdown, Share doesn't dismiss

## 🔴 IMMEDIATE — Build & Test v1.0.4

- [ ] Push to remote and trigger GitHub Actions build (Actions tab → Run workflow)
- [ ] Test on S24 Ultra:
  - Win animation: wave slower (80ms stagger), overlay fades in AFTER wave completes
  - Lose animation: shake → 400ms pause → ✗ overlay fades in smoothly
  - No black flash during tile flip on web or Android
  - Full-screen end-game overlay appears after per-board overlays settle
  - All v1.0.3 features not regressed (duplicate guess rejection, Settings labels)

## 🔴 IMMEDIATE — Play Store Submission

- [ ] Feature graphic (1024×500px) — design in claude.ai
- [ ] Screenshots on S24 Ultra (min 2, recommend 6):
  - Fresh empty board (Wordout mode)
  - Mid-game with green/yellow tiles
  - Multi-board mode (4-out) mid-game
  - End-of-game overlay (win)
  - Settings screen
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

## ✅ v1.1 — Completed 2026-06-26

- ✅ Header redesign: left [🇺🇸/🇬🇧 💪/🐣 ↺] | center [‹ mode ›] | right [🌙 ⚙ ?]
- ✅ Tab bar hidden; mode cycling and new game moved to header
- ✅ BottomStrip: 3 states (playing/board-solved/game-over) + 📊 stats icon
- ✅ StatsModal: Daily|Practice tabs, distribution chart, reset stats
- ✅ Stats removed from Settings screen
- ✅ Daily Word mode with countdown overlay
- ✅ Emoji convention: 🔥 daily streak, ⚡ practice streak, 🏆 personal best

---

## 🟢 v1.2 — Nice to Have

- [ ] Daily word mode (deterministic word from date seed)
- [ ] Haptic feedback on correct/wrong guess
- [ ] Animate board indicator state transitions
- [ ] Sequential ✓ flash across boards before end-game overlay (multi-board all-won)
- [ ] GitHub Actions → Play Store auto-publish pipeline
- [ ] Version number shown in Settings (bottom, muted text)
- [ ] Word feedback link in help modal (GitHub issues)
- [ ] End-game overlay delay dynamic based on guess count (currently fixed at 4200ms win / 3200ms lose — feels long on 1-guess wins)

---

## ✅ Completed

- ✅ Core game: single board Wordout mode
- ✅ Multi-board modes: 2-out, 3-out, 4-out, 6-out, 8-out
- ✅ Board progress indicators (▶ ○ ① ✓)
- ✅ Settings: language, hard mode, dark theme, colour blind
- ✅ Stats per mode with guess distribution
- ✅ Share emoji grid
- ✅ Help modal rewrite (RAISE/CLOUT/FROST, rendered indicators, Onglipo Labs)
- ✅ App icon: parchment bg, RAISE/CLOUT easter egg
- ✅ splash/adaptive-icon background #FFF8EE
- ✅ GitHub Actions build pipeline
- ✅ ‹ N › mode switcher in bottom tab bar
- ✅ Abandon guard (New Game, mode switch, language switch)
- ✅ Privacy policy at GitHub Pages
- ✅ Play Store listing text (name, short desc, full desc)
- ✅ Google Play Console account + identity verified
- ✅ Package com.dilippanicker.wordout registered
- ✅ 2026-06-25 v1.0.1: Remove green border from solved boards
- ✅ 2026-06-25 v1.0.1: Win overlay (dim + ✓ + wave animation)
- ✅ 2026-06-25 v1.0.1: Lose overlay (shake + red flash + dim + ✗ + answer word)
- ✅ 2026-06-25 v1.0.1: End-of-game full screen overlay
- ✅ 2026-06-25 v1.0.2: Fix "Quadout" → "4-out" in Settings
- ✅ 2026-06-25 v1.0.2: Add INBOX, ADMIN, DEBUG to EN-US and EN-GB wordlists
- ✅ 2026-06-25 Version bumping protocol added to CLAUDE.md
- ✅ 2026-06-26 v1.0.3: Reject duplicate guesses ("Already guessed" toast + shake)
- ✅ 2026-06-26 v1.0.3: Production AAB built alongside APK in GitHub Actions
- ✅ 2026-06-26 v1.0.3: Versioned GitHub Releases (tag from app.json, notes from CHANGELOG.md)
- ✅ 2026-06-26 v1.0.4: Tile flip slowed (300ms → 400ms), stagger 150ms → 180ms
- ✅ 2026-06-26 v1.0.4: Win wave stagger 50ms → 80ms, overlay delay dynamic based on guess count
- ✅ 2026-06-26 v1.0.4: Extrapolation.CLAMP on FlipTile — fixes web black flash
- ✅ 2026-06-26 v1.0.4: Lose/end-game overlay timing improved

---

*Update at end of every CC session via /close*
