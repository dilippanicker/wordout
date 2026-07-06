# Session Handoff — 2026-07-06 (Session 22: v1.5.7 shipped through the new pipeline)

## What this session did

First real end-to-end run of the session-21 workflow, and it all worked: `/open` (drift check clean, caught a stale README line) → `/smoke` (3 automated + 10 manual items ALL PASS — web items via browser automation, device items by Dilip on the v1.5.6 build) → `/release` shipped **v1.5.7 (versionCode 29)**: bump confirmed at the gate, `[Unreleased]` folded into `## [1.5.7] — 2026-07-06`, pushed, CI test gate green on both first firings (test.yml 35s; fail-fast job in build), build succeeded (~42 min), release notes correctly extracted into GitHub Release `v1.5.7` with both artifacts.

Also: global permission `defaultMode` switched bypassPermissions → `auto` (+ pruned `.claude/settings.local.json` to 13 reusable rules); workflow HOWTO modernized (plan-mode convention replaces the two-AI chat relay; decision-capture rule added to global /close; executor+advisor economics recorded as a deliberate cost choice — do NOT re-suggest dropping the advisor); README stale features fixed (reverted Enter-highlight line removed, swap-setting name corrected).

## Current state

- **v1.5.7 (versionCode 29)** released on GitHub; `releases/latest` points at it. Play Store still has v1.5.6/vc28 on closed testing — v1.5.7 upload is a manual step for whenever store work is next.
- Smoke status (`.claude/smoke-status.json`, gitignored) records the full pass at pre-release commit `fe10385` — stale after this close commit, as designed; run `/smoke` fresh before the next release.
- No game-design decisions were made this session (decision-capture check: workflow decisions landed in HOWTO/memory, release decision in CHANGELOG — nothing owed to CLAUDE.md's decisions sections).

## Exact next step

v1.5.7 device spot-check DONE (wave + revisit verified on S24 Ultra, 2026-07-06) — the session-21/22 workflow arc is fully closed. Normal feature work resumes. Candidates: daily-word collision fix (task chip queued; needs cutover-date anchoring), `DAILY_PROGRESSION` HelpModal wiring, or rolling the workflow skills to swardb/gisty (adoption checklist in `~/repos/claude-workflow/HOWTO.md`).

Note: next session is the first with the new model stack (`opusplan` + advisor + Haiku Explore agent) and auto permission mode — confirm the plan-mode Opus/Sonnet flip and accept the one-time auto-mode dialog.

## Gotchas

- **Advisor settings key may work now**: `~/.claude/settings.json` contains `"advisorModel": "opus"` and the settings schema documents the key — CLAUDE.md's "only the /advisor picker works" note is possibly stale. Verify before editing (verify-before-fixing rule), then update Model Selection.
- Next session starts in **auto permission mode** (first one shows a one-time opt-in dialog — accept it).
- `/release` and `/smoke` skills carry `disable-model-invocation: true` — only the user typing the command can fire them; that's deliberate, don't "fix" it.
- The mode-arrow quirk seen during smoke: from single-board "Wordout", header ► jumps to 6-out (cycle continues from the persisted `boardCount: 4` default rather than going 1→2). Long-standing behavior, not a regression — decide deliberately if it ever bothers users.
