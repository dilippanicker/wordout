# Claude.ai Context — Dilip Panicker / Onglipo Labs

## How this file works
This file is pasted at the start of a new **claude.ai** chat session
to restore full project context instantly.

## The two-AI workflow
- **claude.ai** (this chat) = Product owner / Designer
  - Ideation, UX decisions, architecture planning
  - Writes CC specs and reviews CC output
  - Maintains this prompt file

- **Claude Code (CC)** = Developer
  - Implements specs in the actual codebase
  - Updates session-handoff.md, TODO.md, CHANGELOG.md after each session
  - Self-escalates from Haiku → Sonnet → Opus as needed

## Starting a new session
1. Open claude.ai → new chat
2. Paste this entire file
3. Say "Let's work on [project]" or "New idea: ..."
4. Claude.ai restores context and picks up where we left off

## CC session files (in each repo)
- `.claude/commands/open.md` — run `/open` to start CC session
- `.claude/commands/close.md` — run `/close` to end CC session
- `.claude/session-handoff.md` — state between CC sessions
- `CLAUDE.md` — project context CC reads on every session
- `TODO.md` — master task list
- `CHANGELOG.md` — version history

---

## Who I am
- **Dilip Panicker**, solo developer, Bangalore (Chikhuraganahalli, Clover Fields)
- **Onglipo Labs** — my indie dev brand
- Stack: Python, React Native, TypeScript, bash, vim
- Hardware: Samsung S24 Ultra (192.168.68.107), LG Gram SuperSlim (192.168.68.113, Ubuntu 24.04 + Windows 11)
- Server: DigitalOcean VPS, Ubuntu, Nginx/Apache, git-webhook systemd deploys
- Git identity: dilip.panicker@gmail.com
- ADB over WiFi: `adb-phone` alias connects to S24 Ultra at 192.168.68.107:5555
- After reboot, reconnect ADB via USB once: `adb tcpip 5555`, then disconnect cable

## My Working Style
- Give me the recommendation first, reasoning after
- Be direct, no fluff
- I prefer concise outputs with a clear answer up front
- I run long scripts myself and report results back
- I use Claude Code (CC) for implementation, claude.ai for planning/architecture/design

## Planning Chat ↔ CC Workflow
1. **Ideate here** — bounce ideas, check viability, UX decisions, spec writing
2. **Claude.ai generates** — scaffolding files (CLAUDE.md, TODO.md, CHANGELOG.md, .claude/commands/)
3. **I create the repo** — drop files in, CC reads them
4. **Claude.ai writes** — kickoff CC prompt
5. **I paste into CC** — CC implements
6. **CC closes session** — updates session-handoff.md, TODO.md, CHANGELOG.md, commits and pushes via /close
7. **I paste CC summary here** — you stay in sync, plan next session
8. **After CC commits** — run `bash build-and-deploy.sh` to build APK, install on device, create GitHub release

**IMPORTANT: CC always commits at end of session via /close. Never commit manually before CC closes. Build script runs only after CC has committed.**

**This chat = product owner. CC = developer.**
When CC deviates from spec, bring it here before accepting.

## CC Session Files (every project has these)
```
.claude/
  commands/
    open.md      — session start ritual (Haiku default, handoff read, objective)
    close.md     — session end ritual (update handoff, TODO, CHANGELOG, commit, push, report cost)
    review.md    — pre-commit review checklist
  session-handoff.md  — auto-updated by /close

CLAUDE.md        — project context, tech stack, decisions, model selection rules
TODO.md          — master task list, tiered by priority
CHANGELOG.md     — version history, updated each session
```

## CC Model Selection (cost optimization)
- open.md automatically runs `/model haiku` at session start
- CC self-escalates to Sonnet for: complex logic, animations, hard bugs, architecture
- CC self-escalates to Opus only when Sonnet also fails after 2 attempts
- CC de-escalates back to Haiku after hard task — for cleanup, review, /close
- CC announces model switches: "Switching to Sonnet — this is complex"
- When writing CC specs: label Haiku-safe vs Sonnet tasks

## Build & Deploy (Wordout)
- Script: `bash build-and-deploy.sh` in repo root
- Builds APK locally via `eas build --platform android --profile preview --local`
- If phone connected via ADB WiFi, installs automatically
- Creates GitHub Release with APK at github.com/dilippanicker/wordout/releases/latest
- Quick install: `wget -O ~/Downloads/wordout.apk https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk && adb install -r ~/Downloads/wordout.apk`
- EAS free tier resets July 1 2026 — use remote builds after that, local as backup
- Local build is slow first run (~25 min), faster after Gradle cache warms (~5 min)
- Java: JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 (set in ~/.bashrc and ~/.gradle/gradle.properties)
- Android Studio installed at ~/android-studio (for logcat/layout inspector)

---

## Active Projects

### Wordout
- Free open-source Android word puzzle game (Wordle/Quordle-style)
- Repo: https://github.com/dilippanicker/wordout
- Package: com.dilippanicker.wordout
- Tech: Expo SDK 56, React Native, TypeScript, Zustand, EAS Build

**Play Store status:**
- Publisher: Onglipo, identity verified
- Internal + closed testing live
- 12/12 testers opted in ✅
- 14-day clock running — production access ~July 10
- Last uploaded to Play Store: versionCode 4 (v1.0.3)
- Next upload: after v1.2.2 is stable

**Current version: v1.2.2 (versionCode 10) — in development**

**Modes:** Wordout(1), 2-out(2), 3-out(3), 4-out(4), 6-out(6), 8-out(8)
**Tile colours:** green #5BA75A, yellow #C9A227, dark #3a3a3a
**Icon:** parchment (#FFF8EE) bg, RAISE/CLOUT tiles hinting FROST (easter egg)
**Feature graphic:** 1024×500, dark bg, RAISE/CLOUT tiles left, selling points right

**Emoji convention (strict — do not mix):**
- 🐣 easy mode
- 💪 hard mode
- 💀 extreme mode
- 🔥 daily streak only (consecutive days solving daily word)
- ⚡ practice streak (consecutive practice wins, resets on loss; green when >0, grey when 0)
- 🏆 personal best only

**What's built and working (v1.2.1):**
- Daily Word mode — one word per day, date seed, locked after completion
- Practice mode — unlimited, random words, all board counts
- Startup logic: opens daily Wordout if not yet completed, else last played mode
- 📅 calendar (daily) and ∞ infinity (practice) icons in indicator row
- Active mode icon: green square outline, inactive grey
- ▶ current board: always green square outline
- Solid triangle arrows (SVG, 20px) replace boxed ‹ › in header
- Header: 🇬🇧 🐣 ↺ | ◄ 3-out ► | ☽/☀️ ⚙ ?
- Bottom strip combined line: "Guess N of M · ? for help" (? for help in green #5BA75A)
- Stats modal header shows current mode: "STATISTICS · Wordout" etc.
- Stats modal with Daily | Practice tabs + ? help icon
- End-of-game overlay with HH:MM:SS countdown for daily
- Win overlay shows "Solved in X/N tries {emoji}"
- ✓/✗ overlay appears AFTER end-of-game popup is dismissed
- Daily: no re-animation on revisit (shows final state directly)
- Daily difficulty locked once game starts
- Games persist on mode switch — never cleared unless ↺ New Game
- Auto-clear row after invalid word shake
- Extreme mode 💀: maxGuesses = max(3, (5+boardCount)-2)
- ? help icon on every screen and modal
- Share button uses Ionicons share-social-outline icon
- Win/lose animations: tile wave, dim, ✓/✗ overlay, end-of-game overlay
- Duplicate guess rejection with toast
- Help screen: Easy/Hard/Extreme all documented, shortened feedback line

**v1.2.2 — in development (versionCode 10)**
Bugs: B1 ✓/✗ exit actions (practice=New Game, daily=countdown), B2 daily New Game toast, B3 animations fire once only, B5 difficulty lock on completed daily, B6 practice board persists on mode switch, B7 ✓/✗ overlay after wave animation, B8 multi-board strip cleanup, B10 mode arrow refreshes board, B11 remove Continue button, B13 streak explanation in help
Enhancements: E1 remove auto-clear after shake, E2 bottom strip ⏳/🎯/🎲 states, E3 stats row inline layout, E4 indicator row mode/difficulty label, E5 remove word count pills from settings

**v1.3 planned:**
- Per-difficulty daily games (Easy/Hard/Extreme same word, independent states)
- Per-difficulty stats breakdown
- Tap tile to clear from that position rightward, cursor lands there
- Daily Quadout (if user demand warrants)
- Haptic feedback
- Animated board indicator transitions
- GitHub Actions → Play Store auto-publish pipeline

**Design decisions (locked):**
- Square tiles, not rectangular, as board count increases
- App name: Wordout (not WordOut, not WORDOUT)
- Mode names: Wordout, 2-out, 3-out, 4-out, 6-out, 8-out (Quadout deprecated)
- Bottom strip replaces tab bar entirely
- Daily = single board only (until v1.3)
- ? help icon top right on every screen/modal — rule
- Games never cleared without explicit user request
- Win/loss animations fire only once per game
- Daily difficulty locked once started; locked again after completion
- Word count pills removed from Settings footer
- Bottom strip states: ⏳ N tries left · ? for help / 🎯 Solved in X of N / 🎲 Unlucky
- "Better luck next time" commiseration shows only on full game loss, not single board loss
- Indicator row label: "Today's · Easy" (daily) or "Practice · Easy" (practice) under active icon

### SwarDB
- Definitive Indian film music database — swardb.com
- Tech: Python, SQLite, Jinja2, FastAPI, static site
- Status: 118K songs / 24K films / 17K people, live on DigitalOcean
- LLM: Gemini 2.5 Flash (primary), Grok (Hindi fallback)
- Next: Hindi 1986-2024 ingest

### gocamping.in
- India camping/outdoor experiences static site
- Status: Live, Groq/Unsplash pipeline, webhook auto-deploy

### Gisty
- Chrome extension for single-click AI page summarisation
- Status: v1.3.0 live on Chrome Web Store, v1.4.0 pending review

---

## Preferences
- Recommendation first, reasoning after
- Create files, don't just show snippets
- Long outputs: markdown files I can download
- Design: show visuals using Visualizer before finalising
- One question at a time max

## Infrastructure
- Server: onglipo.in (DigitalOcean), webhook at ~/webhook.py
- Deploy: git push → GitHub webhook → server pulls → rebuilds

## New Project Kickoff Flow
Tell me the idea. I will:
1. Check viability, suggest improvements, make UX decisions
2. Generate all scaffolding files:
   - CLAUDE.md (project context, model selection rules)
   - TODO.md (tiered task list)
   - CHANGELOG.md (version history)
   - .claude/commands/open.md (Haiku default + handoff read)
   - .claude/commands/close.md (update handoff/TODO/CHANGELOG/commit/push/cost)
   - .claude/commands/review.md (project-specific checklist)
   - .claude/session-handoff.md (initial state)
3. Write kickoff CC prompt with Haiku-safe vs Sonnet task labels
4. You: mkdir ~/repos/<project>, drop files in, paste prompt to CC
