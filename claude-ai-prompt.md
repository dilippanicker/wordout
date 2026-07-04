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
  - Updates session-handoff.md, TODO.md, CHANGELOG.md, README.md, docs/playstore.md, CLAUDE.md after each session via /close
  - Cannot switch models programmatically

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
- **Onglipo Labs** — my indie dev brand ("Ohm Shanti Ω Ω Ω" — pun on electrical unit Ohm, Om Shanti mantra, and wife Shanti's name)
- Stack: Python, React Native, TypeScript, bash, vim
- Hardware: Samsung S24 Ultra (192.168.68.107), LG Gram SuperSlim (192.168.68.113, Ubuntu 24.04 + Windows 11)
- Server: DigitalOcean VPS, Ubuntu, Nginx/Apache, git-webhook systemd deploys
- Git identity: dilip.panicker@gmail.com
- ADB over WiFi: connects to S24 Ultra at 192.168.68.107:5555
- After reboot, reconnect ADB via USB once: `adb tcpip 5555`, then disconnect cable
- tmux alias: `tcc='tmux new-session -A -s cc'`; tmux copy: Ctrl+B [ → Space to begin selection → navigate → y to yank → Ctrl+B ] to paste; ~/.tmux.conf sets mode-keys vi, history-limit 10000, explicit bind for copy-mode-vi y to copy-selection-and-cancel

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
6. **CC closes session** — updates handoff, TODO, CHANGELOG, CLAUDE.md, README, playstore.md, commits and pushes via /close
7. **I paste CC summary here** — you update claude-ai-prompt.md, plan next session
8. **After CC commits** — trigger GitHub Actions build manually: `./wordout.sh build`

**IMPORTANT: CC always commits at end of session via /close. Never commit manually before CC closes. Build triggers only after CC has committed.**

**This chat = product owner. CC = developer.**
When CC deviates from spec, bring it here before accepting.

## CC Session Files (every project has these)
```
.claude/
  commands/
    open.md      — session start ritual (model reminder, advisor setup, handoff read, objective)
    close.md     — session end ritual (update handoff, TODO, CHANGELOG, CLAUDE.md, README, playstore.md, commit, push, report cost)
    review.md    — pre-commit review checklist
  session-handoff.md  — auto-updated by /close

CLAUDE.md        — project context, tech stack, decisions, model selection rules
TODO.md          — master task list, tiered by priority
CHANGELOG.md     — version history, updated each session
```

## CC Model Selection (cost optimization)
- CC cannot switch models programmatically — user switches manually via /model picker
- Advisor setup: run /advisor and select Opus 4.8 — this is the ONLY correct way (claude config set advisorModel does NOT work)
- Current recommended setup: Sonnet 5 as executor + Opus 4.8 as advisor
- Use Sonnet 5 for: complex logic, animations, hard bugs, architecture, store changes
- Use Haiku for: simple edits, config, file changes, cleanup, docs
- Advisor (Opus 4.8) engages automatically at key moments — no manual trigger needed

## Build & Deploy (Wordout)
- **Primary build: GitHub Actions** — `./wordout.sh build` or `gh workflow run "Build APK"`
- Do NOT use local EAS builds — Java/Gradle environment issues on LG Gram
- Build takes ~45 min, produces APK + AAB, creates GitHub Release automatically
- Install on device: `./wordout.sh install` (downloads APK + AAB to releases/, installs APK)
- Push already-downloaded APK: `./wordout.sh push`
- Web testing: `./wordout.sh web` (cache cleared) or `./wordout.sh web-dirty`
- Always web test first, then device test, then build for Play Store
- wordout.sh lives in ~/repos/wordout/ — commands: build, status, logs, watch, install, push, fetch-aab, web, web-dirty, dev-android, adb-connect, build-install

---

## Active Projects

### Wordout
- Free open-source Android word puzzle game (Wordle/Quordle-style)
- Repo: https://github.com/dilippanicker/wordout
- Package: com.dilippanicker.wordout
- Tech: Expo SDK 56, React Native, TypeScript, Zustand, EAS Build
- Tagline: "Your daily word fix · Free"

**Play Store status:**
- Publisher: Onglipo Labs, identity verified
- Closed testing live (Alpha), v1.4.1 (versionCode 20) active
- Production access: ~July 10 2026
- 12 testers opted in, notifications sent for v1.4.1

**Current version: v1.5.1 (versionCode 22)**

**Screen zones (naming convention — use these names everywhere):**
- **Header** — top bar: 🇬🇧 🐣 ↺ | ◄ Wordout ► | ☽ ⚙ ?
- **Ribbon** — 📅 🎮 icons + board indicators + contextual status (next word countdown etc)
- **Board** — tile grid
- **Keyboard** — on-screen keyboard
- **Footer** — ⏳ tries left / new game button / 📊 stats
- **Toast** — floating message above Keyboard, auto-dismisses

**Modes:** Wordout(1), 2-out(2), 3-out(3), 4-out(4), 6-out(6), 8-out(8)
**Tile colours:** green #5BA75A, yellow #C9A227, dark #3a3a3a
**Icon:** parchment (#FFF8EE) bg, RAISE/CLOUT tiles hinting FROST (easter egg)
**Feature graphic:** 1024×500 SVG/PNG, dark bg, STOMP solve board left (PASTE/SPORT/STOOL/NYMPH/STO😊P), selling points right. Tagline: "Your daily word fix · Free" in yellow italic.

**Emoji convention (strict — do not mix):**
- 🐣 easy mode
- 💪 hard mode
- 💀 extreme mode
- 🔥 daily streak (per difficulty — 🐣🔥 🔥💪 💪🔥 etc)
- ⚡ practice streak (consecutive practice wins, resets on loss)
- 🏆 personal best only
- 📅 daily mode
- 🎮 practice mode

**What's built and working (v1.5.1):**

*Core game:*
- Daily Word mode — three independent daily games per day: Easy 🐣 / Hard 💪 / Extreme 💀
- Same word for all difficulties, different words per difficulty (Knuth hash seed from UTC midnight timestamp)
- Daily gate: Win Easy to unlock Hard today; Win Hard to unlock Extreme today
- Lose Easy → Hard locked today; toast "Easy 🐣 lost, can't play Hard 💪"
- Lose Hard → Extreme locked today; toast "Hard 💪 lost, can't play Extreme 💀"
- Difficulty cycle: taps through accessible difficulties only (1 to m rule), always ascending Easy→Hard→Extreme→Easy, silently skips locked
- Dead-end toast when only one accessible difficulty and it was lost
- Peek animation after win: difficulty emoji peeks at next level (scale 1.7, 1000ms) then snaps back
- Play Now button: "💪 Unlocked! Play Now" / "💀 Unlocked! Play Now" in footer after win
- Startup funnel: Easy not played → open Easy; Easy won + Hard not played → open Hard; Hard won + Extreme not played → open Extreme; else restore last played
- Practice mode — unlimited, random words, all board counts, any difficulty, snapshot-based switching
- Practice difficulty switching: snapshots board state, no abandon confirm needed
- Per-difficulty streaks: 🐣🔥N / 💪🔥N / 💀🔥N
- Stats modal: Daily tab shows Easy/Hard/Extreme sub-tabs independently; isQuordle check uses gameMode === 'quordle' only (not boardCount)
- Empty state in stats: "Play your first Easy for stats" etc. when totalGames === 0
- Stats modal defaults to current active game's mode and difficulty on open (imperative getState() read to avoid rehydration race)
- Haptic feedback: Medium (correct guess), Warning (wrong guess/hard mode violation), Success (win)
- Tap tile to clear rightward — cursor lands at tapped position
- Touch overlay to dismiss celebration early (cancels 5s timer)
- Celebration overlay: "Closing in 5…4…3…2…1…" auto-dismiss

*Tutorial:*
- First-launch animated tutorial overlay (TutorialOverlay.tsx)
- Shows RAISE → CLOUT → FROST demo sequence, auto-plays, skippable by tapping backdrop
- Legend box fades in after RAISE row: 🟩 right position / 🟨 wrong position / ⬛ not in word
- "Don't show again" checkbox + "Got it!" button
- tutorialSeen: boolean in settingsStore (default false)
- Help modal top button: "▶ Watch how to play" — resets tutorialSeen and replays tutorial

*UI/UX:*
- Settings footer: © 2026 Onglipo Labs. *Ohm Shanti* Ω Ω Ω · MIT License (Ω in #B85C00)
- Header difficulty emoji in daily mode switches between accessible difficulties
- Ribbon: "📅 Today's · Easy 🐣" / completed: "📅 Next word in HH:MM:SS 🐣"
- Stats title: "STATISTICS · Wordout" (single board) / "STATISTICS · 4-out" (multi-board)
- Hard mode n-out: per-board constraint enforcement

*Word lists (v1.5.0):*
- Rebuilt from NYT Wordle source (nyt_answers.txt + nyt_guesses.txt) + SOWPODS for UK guesses
- US: 2,315 answers / 10,484 guesses
- UK: 2,314 answers / 8,554 guesses (FIBER→FIBRE, METER→METRE, PRIZE→PRISE)
- 174 words removed (17 blocklist + 157 proper nouns)
- Regeneration script: `python3 wordlist/regenerate.py`
- Known issue: CECIL is a proper noun that slipped in — scheduled for cleanup

**Design decisions (locked):**
- App name: Wordout (not WordOut, not WORDOUT)
- Mode names: Wordout, 2-out, 3-out, 4-out, 6-out, 8-out
- Daily = single board (Wordout only)
- ? help icon top right on every screen/modal — rule
- Games never cleared without explicit user request
- Win/loss animations fire only once per game
- No difficulty emoji in footer text
- "Better luck next time" shows only on full game loss, not single board loss
- Hard mode n-out: per-board constraint, not global
- Quordle difficulty snapshot deferred to post-user-feedback
- Multiboard difficulty stats deferred to post-user-feedback (do not implement without explicit request)
- Web deployment planned but not yet done (npx expo export --platform web → onglipo.in/wordout)
- Auto-publish to Play Store deferred until after first production release (API access unlocks then)

**Roadmap:**
- v1.5.x: Bug fixes, wordlist cleanup (CECIL etc)
- v1.6.0: First-time onboarding tutorial ✅ (done in v1.5.1)
- Future: Playwright tests (compute daily word from seed independently — no hardcoding), web deployment, auto-publish pipeline, large screen/tablet support

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
- Status: v1.4.0 pending Chrome Web Store review

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
   - .claude/commands/close.md (update handoff/TODO/CHANGELOG/README/playstore.md/commit/push/cost)
   - .claude/commands/review.md (project-specific checklist)
   - .claude/session-handoff.md (initial state)
3. Write kickoff CC prompt with Haiku-safe vs Sonnet task labels
4. You: mkdir ~/repos/<project>, drop files in, paste prompt to CC
