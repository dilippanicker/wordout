# Session Handoff — 2026-07-06 (Session 20)

## What Happened This Session

Started by backfilling documentation for two version bumps (v1.5.5, v1.5.6) that had shipped without a corresponding TODO/handoff update, then triggered and confirmed the pending GitHub Actions build. The rest of the session was a CLAUDE.md redundancy/staleness cleanup pass, done in small user-directed steps.

1. **Pushed pending commit** — `d6e0646` (skills migration), 1 commit ahead of `origin/main` from the previous session.
2. **Triggered GitHub Actions build** for v1.5.6 (versionCode 28) — run `28749535782`. **Confirmed successful** (47m11s): GitHub Release `v1.5.6` published with `wordout.aab` and `wordout.apk` attached.
3. **CLAUDE.md dedupe/staleness pass** (committed separately as `a072c5b`, ~336→302 lines):
   - Fixed stale facts: Play Store "next upload" version, a wrong word-list file path in Known Issues, Model Selection section (was pinned to Haiku/Opus 4.8, rewritten as a pattern — current-gen mid-tier executor + Opus-class advisor — with the pinned models kept only as a non-binding example)
   - Deduplicated: daily-gate mechanics now live only in "Daily Gate Architecture"; "Key Design Decisions → Daily mode" reduced to one line per decision; "Startup logic (v1.4.0)" section deleted (mechanics already in Daily Gate Architecture); `boardCount > 1` anti-pattern rule kept once (settingsStore section), StatsModal now just points to it
   - Deleted the fully-shipped "v1.3.0 Features" section, preserving its two still-relevant facts as single bullets (Board indicators legend; Stores section)
   - Left untouched per instruction: Animation sequence, Keyboard Behaviour, Share Behaviour, TutorialOverlay, Version Bumping Protocol, Session lifecycle, Known Issues (besides the path fix)
4. **Known Issues cleanup** (this commit): removed the `CECIL` line after verifying via `grep` that it's actually gone from `assets/wordlists/answers_en_gb.json` (fixed by the word list rebuild, not previously noticed); reworded the `DAILY_PROGRESSION` line after confirming its content is exactly the daily-gate explanation text — now reads "unused; candidate HelpModal section explaining daily difficulty progression", with a low-priority TODO item added for wiring it into `HelpModal.tsx`.
5. **Deleted `docs/playstore.md`** (this commit) — it had drifted stale repeatedly (still showed "v1.2.7 ready to upload" / "last uploaded v1.0.3" as of session 19) because Play Store state changes faster than a separate doc gets updated. Replaced with a short "current reality" snippet directly in CLAUDE.md's "Play Store" section (v1.5.6/vc28 live on closed testing, 12/12 testers, ~July 10 2026 production access — tracked manually, not in docs). The `/close` Session lifecycle bullet that referenced `docs/playstore.md` was fully removed (not reworded to point elsewhere) per explicit follow-up instruction.

No new feature/bugfix code was written this session — entirely docs + one build trigger. The v1.5.5/v1.5.6 *code* changes were made in an earlier, undocumented session (commits `4647a2e`, `eda4ace`, `8f99c7a`, `0073190`, `65b788c`, `cce4405`).

---

## Files Modified

### `CLAUDE.md`
- Two commits: `a072c5b` (dedupe pass, see above) and this session's close commit (Known Issues CECIL/DAILY_PROGRESSION, Play Store section rewrite, `docs/playstore.md` reference removed from `/close` steps).

### `TODO.md`
- Session 20 section expanded with all of the above; build-trigger item updated from "in progress" to confirmed-successful with release details; `docs/playstore.md`-staleness follow-up item resolved (file deleted, not fixed-in-place); added a low-priority "wire DAILY_PROGRESSION into HelpModal" backlog item.

### `.claude/session-handoff.md`
- This file.

### `docs/playstore.md`
- Deleted.

---

## Decisions Made

- **Play Store status is now tracked only as a short snippet in CLAUDE.md, not a separate doc** — the separate doc consistently went stale faster than anyone remembered to update it; a single short snippet co-located with the rest of the project's living documentation is easier to keep current.
- **The `/close` Session lifecycle bullet referencing `docs/playstore.md` was deleted outright, not replaced** — first pass reworded it to point at CLAUDE.md's Play Store section instead, but a direct follow-up instruction asked for outright removal since the file (and thus the need for a `/close`-time reminder about it) no longer exists.
- **CLAUDE.md dedupe stopped at 302 lines, not the ~250 target** — the specified reduction items (dedup daily-gate docs, delete v1.3.0 Features, shorten Model Selection) only accounted for ~34 net lines; the bulk of the remaining file is content explicitly marked "do not touch" (animation internals, Keyboard/Share Behaviour, TutorialOverlay) because it encodes regression traps. Flagged to the user rather than trimming protected sections without approval.
- **No re-verification of v1.5.5/v1.5.6 runtime behavior this session** — only documented; device/browser verification remains outstanding.

---

## Current State

- Working tree: `CLAUDE.md`, `TODO.md`, `.claude/session-handoff.md` modified and `docs/playstore.md` deleted, all committed as part of this `/close` (see commit below). `main` is ahead of `origin/main` by this close commit plus the earlier `a072c5b` dedupe commit — not pushed (push policy: commit always, push only when explicitly asked).
- GitHub Release `v1.5.6` (versionCode 28) is live with both APK and AAB — this is the current buildable state.
- CHANGELOG.md needed no changes this session (no user-facing/version changes, pure docs + build-trigger).

---

## Exact Next Steps

1. **Device regression test** of the Enter/Backspace swap toggle and ⏎ label on a real Android device — still outstanding from the v1.5.5/v1.5.6 code session; never verified in a live browser or on-device.
2. **(Low priority, post-1.5.6-upload)** Wire `DAILY_PROGRESSION` (`constants/helpContent.ts`) into `HelpModal.tsx` — text confirmed accurate, just needs a UI section.
3. No Play Store upload has actually happened for v1.5.6 yet — CLAUDE.md's Play Store section states current *testing-track* reality per explicit user instruction, but production upload/promotion is still a manual step outside this repo.

---

## Known Issues / Gotchas

- Remaining known issues: `boardCount` defaults to 4 (never use `boardCount > 1` to detect multi-board mode), `tutorialSeen` hydration race, `onWatchTutorial` not wired in `settings.tsx`. `CECIL` and the old `DAILY_PROGRESSION` wording are resolved as of this session.
- **Process gap from a prior session:** `/close` was skipped for whatever session produced the v1.5.5/v1.5.6 commits, leaving TODO.md/session-handoff.md two versions behind CHANGELOG.md until this session's backfill. Worth spot-checking at the start of future sessions that CHANGELOG, TODO, and handoff all agree on the current version.
- Scratch Playwright driver at `/tmp/pw-driver` (outside repo) remains the ad-hoc browser-verification pattern for this app when needed — still no committed project skill for it.
