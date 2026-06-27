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
- Hardware: Samsung S24 Ultra (mobile testing), LG Gram SuperSlim (Ubuntu 24.04 + Windows 11)
- Server: DigitalOcean VPS, Ubuntu, Nginx/Apache, git-webhook systemd deploys
- Git identity: dilip.panicker@gmail.com
- ADB installed on Ubuntu — use `adb install -r ~/Downloads/wordout.apk` for device installs

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
6. **CC closes session** — updates session-handoff.md, TODO.md, CHANGELOG.md
7. **I paste CC summary here** — you stay in sync, plan next session

**This chat = product owner. CC = developer.**
When CC deviates from spec, bring it here before accepting.

## CC Session Files (every project has these)
```
.claude/
  commands/
    open.md      — session start ritual (Haiku default, handoff read, objective)
    close.md     — session end ritual (update handoff, TODO, CHANGELOG, report cost)
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

---

## Active Projects

### Wordout
- Free open-source Android word puzzle game (Wordle/Quordle-style)
- Repo: https://github.com/dilippanicker/wordout
- Package: com.dilippanicker.wordout
- Tech: Expo SDK 56, React Native, TypeScript, Zustand, EAS Build
- Build: GitHub Actions → local EAS → APK + AAB
- EAS free tier resets July 1 2026
- Quick install: `wget -O ~/Downloads/wordout.apk https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk && adb install -r ~/Downloads/wordout.apk`

**Play Store status:**
- Publisher: Onglipo, identity verified
- Internal + closed testing live
- 12/12 testers opted in ✅
- 14-day clock running — production access ~July 10
- Last uploaded to Play Store: versionCode 4 (v1.0.3)
- Next upload: versionCode 8 (v1.2.0) after device testing

**Current version: v1.2.0 (versionCode 8) — building**

**Modes:** Wordout(1), 2-out(2), 3-out(3), 4-out(4), 6-out(6), 8-out(8)
**Tile colours:** green #5BA75A, yellow #C9A227, dark #3a3a3a
**Icon:** parchment (#FFF8EE) bg, RAISE/CLOUT tiles hinting FROST (easter egg)
**Feature graphic:** 1024×500, dark bg, RAISE/CLOUT tiles left, selling points right

**Emoji convention (strict — do not mix):**
- 🐣 easy mode
- 💪 hard mode
- 💀 extreme mode
- 🔥 daily streak only
- ⚡ practice streak (green when >0, grey when 0)
- 🏆 personal best only

**What's built and working (v1.2.0):**
- Daily Word mode — one word per day, date seed, locked after completion
- Practice mode — unlimited, random words, all board counts
- Startup logic: opens daily Wordout if not yet completed, else last played mode
- 📅 calendar (daily) and ∞ infinity (practice) icons in indicator row
- Active mode icon: green square outline, inactive grey
- ▶ current board: always green square outline
- ‹ › mode arrows wrapped in grey squares in header
- Header: 🇬🇧 🐣 ↺ | [‹] 3-out [›] | ☽/☀️ ⚙ ?
- Bottom strip 3 states + 📊 stats icon right-aligned
- Strip State 1: "Guess N of M 🐣/💪/💀" (difficulty icon shown)
- Strip tip text before first guess: "Tap ? for help and game modes" (? tappable)
- Stats modal with Daily | Practice tabs + ? help icon
- Stats moved out of Settings entirely
- End-of-game overlay with HH:MM:SS countdown for daily + ? help icon
- ✓/✗ overlay appears AFTER end-of-game popup is dismissed
- Daily: no re-animation on revisit (shows final state directly)
- Games persist on mode switch — never cleared unless ↺ New Game
- Auto-clear row after invalid word shake (no backspace needed)
- Extreme mode 💀: maxGuesses = max(3, (5+boardCount)-2)
- Settings footer: word count pills (1,547 answers / 9,043 guesses) + GitHub links
- ? help icon on every screen and modal
- Share button uses Ionicons share-social-outline icon
- Win/lose animations: tile wave, dim, ✓/✗ overlay, end-of-game overlay
- Duplicate guess rejection with toast

**v1.2.1 — pending device test results**
- To be determined after testing v1.2.0 on S24 Ultra

**v1.3 planned:**
- Daily Quadout (if user demand warrants)
- Haptic feedback
- Animated board indicator transitions
- GitHub Actions → Play Store auto-publish pipeline

**Design decisions (locked):**
- Square tiles, not rectangular, as board count increases
- App name: Wordout (not WordOut, not WORDOUT)
- Mode names: Wordout, 2-out, 3-out, 4-out, 6-out, 8-out (Quadout deprecated)
- Bottom strip replaces tab bar entirely
- Daily = single board only for now
- ? help icon top right on every screen/modal — rule
- Games never cleared without explicit user request

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
- Status: Submitted to Chrome Web Store, pending review

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
   - .claude/commands/close.md (update handoff/TODO/CHANGELOG/cost)
   - .claude/commands/review.md (project-specific checklist)
   - .claude/session-handoff.md (initial state)
3. Write kickoff CC prompt with Haiku-safe vs Sonnet task labels
4. You: mkdir ~/repos/<project>, drop files in, paste prompt to CC
