# Wordout — Play Store Shot List

## Specs
- Screenshots: 1080×2400px (Pixel 7), PNG
- Screencast: MP4, max 30 seconds, 1080×2400
- Device: Samsung S24 Ultra
- Capture tool: Android Studio Device Manager or `adb shell screencap -p /sdcard/shot.png && adb pull /sdcard/shot.png`

## Screenshots

### Shot 1 — Daily Word mid-game
**Goal:** Show the daily word feature and coloured tiles
**Setup:**
- Switch to Daily Wordout (1-out)
- Make 3-4 guesses so board has a mix of green, yellow, grey tiles
- Ribbon shows "Today's · Easy 📅"
- Footer shows "⏳ 3 tries left · ? for help"
- DO NOT solve — keep it mid-game tension

**Caption idea:** "A new word every day — same word for everyone"

---

### Shot 2 — Win celebration overlay
**Goal:** Show the win moment — the emotional payoff
**Setup:**
- Win a practice Wordout game
- Capture the celebration overlay while it's visible (5s window)
- Shows: 🎉 Solved!, word, "Solved in X/6 tries 🐣", Share button, green countdown
- Dark theme preferred

**Caption idea:** "That satisfying moment when it all clicks"

---

### Shot 3 — Multi-board (4-out)
**Goal:** Show the unique multi-board feature — the main differentiator
**Setup:**
- Switch to 4-out mode
- Make 3-4 guesses so all 4 boards have some coloured tiles
- Ribbon shows board indicators with mixed states (some solved, some in progress)
- Shows the grid layout with 4 simultaneous boards

**Caption idea:** "Solve 1 to 8 words at once — for the truly brave"

---

### Shot 4 — Hard or Extreme mode
**Goal:** Show difficulty options exist
**Setup:**
- Switch to Hard or Extreme mode (💪 or 💀 in ribbon)
- Mid-game on a practice board
- Footer shows "⏳ N tries left" with reduced guess count for Extreme
- Settings screen showing difficulty options is an alternative

**Caption idea:** "Easy, Hard, or Extreme — you choose the challenge"

---

### Shot 5 — Settings screen
**Goal:** Show the app is configurable and clean
**Setup:**
- Open Settings
- Show: Game Mode selector (Wordout selected), Word List (American English), Difficulty (Easy selected), Preferences
- Light theme for contrast
- No word count pills (removed in v1.2.3)

**Caption idea:** "Your puzzle, your rules"

---

### Shot 6 — Stats screen
**Goal:** Show progression and replay value
**Setup:**
- Open Stats modal
- Practice tab selected
- Show a healthy distribution — wins across 3/4/5/6 guess rows
- Shows: Played, Win%, Streak, Best stats at top
- Guess distribution bars filled meaningfully

**Caption idea:** "Track your streak and improve your game"

---

## Screencast (30 seconds)

**Goal:** Show animations and flow — what screenshots can't capture

**Script:**
1. (0-3s) App launches → opens Daily Wordout automatically
2. (3-8s) Type first guess RAISE → tile flip animation
3. (8-13s) Type second guess → more tiles colour up
4. (13-18s) Solve the word → wave animation → celebration overlay with countdown
5. (18-22s) Tap Share → share sheet appears briefly
6. (22-27s) Switch to 4-out via arrows → board transforms
7. (27-30s) Type one guess on 4-out → all 4 boards update simultaneously

**Tips:**
- Use dark theme — looks better on video
- Type slowly and deliberately — let animations complete
- Disable notifications before recording
- Use S24 Ultra built-in screen recorder: swipe down → Screen recorder

---

## Version History

| Version | Date | Changes to shots needed |
|---------|------|------------------------|
| v1.2.8 | Jun 2026 | Initial shot list — all 6 shots + screencast |
| v1.3.0 | TBD | Retake Shot 4 if haptics visible; retake Shot 3 if animated indicators look better |
| v1.4.0 | TBD | Add shot for per-difficulty daily games |
