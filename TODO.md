# Wordout — Master TODO
**Updated: 2026-06-25**
**Current version: v1.0.1 (code complete, not yet built)**

---

## 🔴 IMMEDIATE — v1.0.1 Build & Test

- ✅ 2026-06-25 Remove green rectangle border around solved boards in multi-board mode
- ✅ 2026-06-25 Win overlay: all tiles wave (left→right, top→bottom, ~50ms apart) then dim to 70% + big green ✓
- ✅ 2026-06-25 Lose overlay: shake (3×, 14px, ~900ms, red tint flash) then dim to 70% + big red ✗ + answer word
- ✅ 2026-06-25 End-of-game full screen overlay (all won 🎉 / partial 😅 / all lost 😢 + Share ↗, fades after 3s or on tap)
- [ ] Trigger GitHub Actions build for v1.0.1
- [ ] Test on S24 Ultra (win, lose, multi-board, navigate between boards, new game reset)

## 🔴 IMMEDIATE — Play Store Submission (v1.0)

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
- [ ] Upload AAB to internal testing track
- [ ] Promote to production
- [ ] Set up Google Play service account for automation (after first manual upload)
- [ ] Add GOOGLE_PLAY_SERVICE_ACCOUNT_JSON secret to GitHub
- [ ] Update GitHub Actions workflow to auto-upload to internal track

---

## 🟡 v1.1 — Header + Bottom Strip + Stats

### Header redesign
- [ ] Move ↺ New Game to top left cluster: 🇬🇧 🐣 ↺
- [ ] Replace static title with ‹ 3-out › mode switcher in centre
- [ ] Move ⚙ Settings to top right cluster: 🌙 ⚙ ?
- [ ] Remove entire bottom TabBar component

### Bottom strip (replaces tab bar)
- [ ] State 1 (in game): "Guess 4 of 6" / "Guess 4 of 9 · 1 solved · 3 remaining"
- [ ] State 2 (board solved flash): "Board 2 solved in 4 ✓  |  🏆 Best: 3" — until next guess
- [ ] State 3 (game over): "Played: 24  Won: 18  ⚡5  Share ↗"
- [ ] ⚡ green (#5BA75A) when streak > 0, grey (#888780) when 0
- [ ] 📊 icon right-aligned on strip in ALL states — opens stats modal on tap

### Stats modal
- [ ] Full stats for current mode (moved from Settings)
- [ ] Guess distribution bar chart
- [ ] Played / Won % / Current streak / Best streak
- [ ] Close on tap outside or × button
- [ ] Remove stats section from Settings screen entirely

### Emoji convention (enforce throughout)
- [ ] 🔥 hard mode only
- [ ] ⚡ streak (green when >0, grey when 0)
- [ ] 🏆 personal best only

---

## 🟢 v1.2 — Nice to Have

- [ ] Daily word mode (deterministic word from date seed)
- [ ] Haptic feedback on correct/wrong guess
- [ ] Animate board indicator state transitions
- [ ] Sequential ✓ flash across boards before end-game overlay (multi-board all-won)
- [ ] GitHub Actions → Play Store auto-publish pipeline
- [ ] Version number shown in Settings (bottom, muted text)
- [ ] Word feedback link in help modal (GitHub issues)

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

---

*Update at end of every CC session via /close*
