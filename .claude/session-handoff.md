# Session Handoff — 2026-07-06 (Session 21: workflow overhaul)

## What this session did

Diagnosed the project's workflow friction (three-source analysis → `reflection-notes.md`, 6 ranked items) and implemented items 1–5. No game-behavior changes shipped; the one code refactor (GameBoard) is behavior-identical and test-covered. Current version remains **v1.5.6 (versionCode 28)** — nothing was released.

## New workflow (generic skills global, project layer in this repo)

- **`/release`** (`~/.claude/skills/release/SKILL.md`) — bump/confirm/CHANGELOG/commit/push/`gh workflow run`/report. Reads this repo's Version Bumping Protocol + Build Pipeline sections. CHANGELOG heading `## [x.y.z]` is load-bearing (awk-extracted into GitHub Release notes).
- **`/smoke`** (`~/.claude/skills/smoke/SKILL.md`) — runs `.claude/smoke-checklist.md` (2 automated + 10 manual items), records to gitignored `.claude/smoke-status.json`; `/release` warns if missing/stale.
- **Drift guard** in global `/open`/`/close` — checks the `### Doc sync (drift check)` list in CLAUDE.md. Missing close = backfill from git log as first task, never a retroactive /close.
- **Tests**: `npm test` — 36 tests (store invariants + board sequencing). CI: `test.yml` on push/PR + fail-fast `test` job gating the build in `build-apk.yml`.

## Files changed (all committed this close, none pushed)

- New: `reflection-notes.md`, `components/boardSequencing.ts`, `__tests__/store-invariants.test.ts`, `__tests__/board-sequencing.test.ts`, `__mocks__/@react-native-async-storage/async-storage.js`, `.claude/smoke-checklist.md`, `.claude/launch.json`, `.github/workflows/test.yml`
- Modified: `components/GameBoard.tsx` (pure-function substitution only), `package.json` (jest deps/config/test script), `package-lock.json`, `.gitignore` (smoke-status.json), `.github/workflows/build-apk.yml` (test job + needs), `CLAUDE.md` (Commands, Doc sync, Build Pipeline notes, animation section pointer, daily-word Known Issue, /release pointer), `CHANGELOG.md` (Unreleased section), `TODO.md`
- Outside repo: `~/.claude/skills/{release,smoke}/SKILL.md` (new), `~/.claude/skills/{open,close}/SKILL.md` (drift check added), `~/repos/claude-workflow/HOWTO.md` (updated + committed there)

## Decisions made (and why)

- Generic-first: skills are global, discovering project specifics from CLAUDE.md — matches the /open//close migration pattern; swardb/gisty adopt by adding declarations (see HOWTO.md adoption checklist).
- `/release` smoke gate **warns, doesn't block** — user keeps override for trivial releases.
- Daily-word distinctness NOT asserted in tests — the derivation genuinely collides (8 days/decade) and masks off 267 answers; documented as Known Issue, fix task queued (needs cutover-date anchoring so an in-progress day doesn't change under players).
- Item 6 (build-wait: parallelize APK/AAB, local Java/Gradle repair) deferred by explicit decision.

## Exact next step

Open a fresh session (skills load at session start) and do the first real end-to-end run: `/open` (exercises drift check) → device smoke pass via `/smoke` (the `[device]` items consolidate all outstanding device-regression TODOs) → `/release` to ship this session's changes as the next version — that validates the entire pipeline including the new CI test gate (which has never run; first firing is on next push).

## Gotchas

- `.claude/smoke-status.json` currently records a pass for commit `89ec1e9` — stale the moment this close commits; `/release` will correctly warn. Run `/smoke` fresh.
- TypeScript 6 doesn't auto-inject `@types` globals — test files must `import { ... } from '@jest/globals'` (no `@types/jest` dep; don't add one).
- Expo web ignores `PORT` env and prompts interactively when 8081 is busy — `.claude/launch.json` pins `--port 8090` for the preview server.
- jest + jest-expo live in devDependencies deliberately (`npx expo install` had put them in dependencies).
- Today's daily easy word was ABACK (also one of the collision words for 2026-01-27 — coincidence, but a nice reminder the bug is real).
