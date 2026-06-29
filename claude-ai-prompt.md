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
  - Cannot switch models programmatically — reminds user to run /model haiku at session start

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
- When writing CC prompts: no markdown formatting, plain text only
- Never ask me to cut/paste from multiple places to build a CC prompt — write the full prompt directly

## Planning Chat ↔ CC Workflow
1. **Ideate here** — bounce ideas, check viability, UX decisions, spec writing
2. **Claude.ai generates** — scaffolding files (CLAUDE.md, TODO.md, CHANGELOG.md, .claude/commands/)
3. **I create the repo** — drop files in, CC reads them
4. **Claude.ai writes** — kickoff CC prompt
5. **I paste into CC** — CC implements
6. **CC closes session** — updates session-handoff.md, TODO.md, CHANGELOG.md, commits and pushes via /close
7. **I paste CC summary here** — you stay in sync, plan next session
8. **After CC commits** — trigger GitHub Actions build manually from Actions tab

**IMPORTANT: CC always commits at end of session via /close. Never commit manually before CC closes. Build triggers only after CC has committed.**

**This chat = product owner. CC = developer.**
When CC deviates from spec, bring it here before accepting.

## CC Session Files (every project has these)
```
.claude/
  commands/
    open.md      — session start ritual (model switch reminder, handoff read, objective)
    close.md     — session end ritual (update handoff, TODO, CHANGELOG, commit, push, report cost)
    review.md    — pre-commit review checklist
  session-handoff.md  — auto-updated by /close

CLAUDE.md        — project context, tech stack, decisions, model selection rules
TODO.md          — master task list, tiered by priority
CHANGELOG.md     — version history, updated each session
```

## CC Model Selection (cost optimization)
- CC cannot switch models programmatically — it reminds user to run /model haiku at session start
- User switches manually when CC recommends
- Use Sonnet for: complex logic, animations, hard bugs, architecture, store changes
- Use Haiku for: simple edits, config, file changes, cleanup, docs
- CC announces recommended switches: "Switching to Sonnet recommended — animation logic is complex"

## Build & Deploy (Wordout)
- **Primary build: GitHub Actions** — trigger manually from Actions tab: `gh workflow run "Build APK"`
- Do NOT use local EAS builds — Java/Gradle environment issues on LG Gram
- Build takes ~45 min, produces APK + AAB, creates GitHub Release automatically
- Quick install on device: `wget -O ~/Downloads/wordout.apk https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk && adb install -r ~/Downloads/wordout.apk`
- Web testing: `npx expo start --web` (no --clear unless stale cache suspected)
- Always web test first, then device test, then build for Play Store

---

## Active Projects

### Wordout
- Free open-source Android word puzzle game (Wordle/Quordle-style)
- Repo: https://github.com/dilippanicker/wordout
- Package: com.dilippanicker.wordout
- Tech: Expo SDK 56, React Native, TypeScript, Zustand, EAS Build

**Play Store status:**
- Publisher: Onglipo, identity verified
- Internal + closed testing live, 12/12 testers opted in ✅
- Production access: ~July 10 2026
- Last uploaded to Play Store: versionCode 4 (v1.0.3)
- Next upload: v1.2.8 (versionCode 16) AAB — ready to upload to closed testing

**Current version: v1.2.8 (versionCode 16)**

**Screen zones (naming convention — use these names everywhere):**
- **Header** — top bar: 🇬🇧 🐣 ↺ | ◄ Wordout ► | ☽ ⚙ ?
- **Ribbon** — 📅 🎮 icons + board indicators + contextual status (next word countdown etc)
- **Board** — tile grid
- **Keyboard** — on-screen keyboard
- **Footer** — ⏳ tries left / new game button / 📊 stats

**Modes:** Wordout(1), 2-out(2), 3-out(3), 4-out(4), 6-out(6), 8-out(8)
**Tile colours:** green #5BA75A, yellow #C9A227, dark #3a3a3a
**Icon:** parchment (#FFF8EE) bg, RAISE/CLOUT tiles hinting FROST (easter egg)
**Feature graphic:** 1024×500, dark bg, RAISE/CLOUT tiles left, selling points right

**Emoji convention (strict — do not mix):**
- 🐣 easy mode
- 💪 hard mode
- 💀 extreme mode
- 🔥 daily streak only (consecutive days solving daily word)
- ⚡ practice streak (consecutive practice wins, resets on loss)
- 🏆 personal best only
- 📅 daily mode
- 🎮 practice mode (replaced ∞ in v1.2.3)

**What's built and working (v1.2.8):**
- Daily Word mode — one word per day, always Easy difficulty
- Daily is always Easy — toast shown on change attempt: "Daily is always Easy · Try changing difficulty in Practice"
- Practice mode — unlimited, random words, all board counts, any difficulty
- Startup: opens daily Wordout if not yet completed today, else last played mode
- Ribbon: 📅 Today's · Easy (daily active) | Practice · Easy 🎮 (practice active)
- Daily completed Ribbon shows: 📅 Next word in HH:MM:SS
- Header: 🇬🇧 🐣 ↺ | ◄ Wordout ► | ☽ ⚙ ?
- Solid triangle arrows in header (CSS border-trick, no SVG library)
- Footer playing: "⏳ N tries left · ? for help" (? for help in green #5BA75A)
- Footer game over (practice): green ↺ New Game button + 📊
- Footer game over (daily): 📊 only (countdown in Ribbon)
- Footer solved board (n-out mid-game): "Board N solved in M ✓"
- Stats modal: "STATISTICS · Wordout" / "STATISTICS · 4-out" etc.
- End-of-game celebration overlay: 5s auto-dismiss with green countdown "Closing in 5…4…3…2…1…"
- Win overlay: "Solved in X/N tries 🐣"
- Animations: tile fill (every guess), wave (once per board on first solve), celebration overlay (once per game)
- No re-animation on board revisit — waveShown/celebrationShown flags persisted in stores
- Hard mode n-out: per-board constraint enforcement (guess accepted if any unsolved board accepts it)
- Games never cleared without explicit ↺ New Game
- Practice board resets on difficulty change
- Difficulty locked on completed game (practice or daily)
- Extreme mode 💀: maxGuesses = max(3, (5+boardCount)-2)
- Board indicators: ▶ square (active), ✓ filled square (active+solved), ○ circle (unsolved), ✓ filled circle (solved non-active)
- ? help icon on every screen and modal
- Help text in constants/helpContent.ts (edit there, not HelpModal.tsx)
- Duplicate guess rejection with toast
- No auto-clear after invalid word shake
- Tap tile to clear from that position rightward — v1.3

**v1.3.0 planned:**
- Haptic feedback
- Tap tile to clear rightward, cursor lands there
- Animated board indicator transitions
- Maestro smoke tests (critical path automated tests)

**v1.3.1 planned:**
- GitHub Actions → Play Store auto-publish pipeline

**v1.4.0 planned (major architectural release):**
- Per-difficulty daily games (Easy/Hard/Extreme same word, independent states)
- Per-difficulty stats breakdown

**Design decisions (locked):**
- App name: Wordout (not WordOut, not WORDOUT)
- Mode names: Wordout, 2-out, 3-out, 4-out, 6-out, 8-out (Quadout deprecated)
- Daily = single board (Wordout only) until v1.4
- Daily = always Easy until v1.4
- ? help icon top right on every screen/modal — rule
- Games never cleared without explicit user request
- Win/loss animations fire only once per game
- Word count pills removed from Settings footer
- No difficulty emoji in footer text
- "Better luck next time" shows only on full game loss, not single board loss
- Hard mode n-out: per-board constraint, not global

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
- CC prompts: plain text, no markdown, complete and self-contained

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
   - .claude/commands/open.md (model switch reminder + handoff read)
   - .claude/commands/close.md (update handoff/TODO/CHANGELOG/commit/push/cost)
   - .claude/commands/review.md (project-specific checklist)
   - .claude/session-handoff.md (initial state)
3. Write kickoff CC prompt with Haiku-safe vs Sonnet task labels
4. You: mkdir ~/repos/<project>, drop files in, paste prompt to CC
