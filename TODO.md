# Wordout — Master TODO
**Updated: 2026-06-26**
**Current version: v1.1.1 (code done, NOT yet committed/pushed)**

---

## 🔴 IMMEDIATE — Commit & Build v1.1.1

- [ ] Commit all changes: `git commit -m "fix: v1.1.1 — bug fixes, startup mode, safe area, pre-game tip"`
- [ ] Push to remote: `git push origin main`
- [ ] Trigger GitHub Actions build (Actions tab → Run workflow)
- [ ] Test on device (Samsung S24 Ultra):
  - First launch: opens Daily mode automatically
  - Complete daily, kill app, relaunch: opens last-played mode
  - Hard mode toggle mid-game: abandon confirm → game resets
  - Bottom strip: pre-game tip before first guess
  - Bottom strip: not overlapping Android nav bar
  - Settings ? icon: opens HelpModal
  - Share icon in bottom strip (share-social-outline)
  - Share icon in end-game overlay
  - Mode indicator (📅/∞): green tint on active
  - Dark mode: absent tiles are dark (#3a3a3c)

## 🔴 IMMEDIATE — Play Store Submission

- [ ] Feature graphic (1024×500px) — design in claude.ai
- [ ] Screenshots on S24 Ultra (min 2, recommend 6):
  - Fresh empty board (Wordout mode, showing pre-game tip)
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

## 🟢 v1.2 — Nice to Have

- [ ] Haptic feedback on correct/wrong guess
- [ ] Animate board indicator state transitions
- [ ] Sequential ✓ flash across boards before end-game overlay (multi-board all-won)
- [ ] GitHub Actions → Play Store auto-publish pipeline
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

---

*Update at end of every CC session via /close*
