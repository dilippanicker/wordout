# Session Handoff — 2026-07-08/09 (Session 23: v1.5.8 shipped — daily-word fix + HelpModal wiring)

## What this session did

Fixed the daily-word collision/reachability bug that session 21 found and queued: `getDailyAnswers`'s old `& 0x7FF` bit-masked derivation collided ~8 days/decade across difficulties and capped reachable indices at 2047 (1023 for extreme). Replaced with `dailyIndices(dayNum, n)` — a mulberry32 PRNG seeded per UTC day, sampled with reject-duplicate for 3 distinct indices across the full `[0, n)` range. New tests prove distinctness + full-range reachability over 10,000 simulated days, both languages. No cutover-date logic needed (reasoning now recorded in CLAUDE.md's Daily Gate Architecture section) — a day's answer is computed once and persisted, so in-progress days are unaffected by the algorithm swap.

Also wired the already-written `DAILY_PROGRESSION` text into `HelpModal.tsx` as a new "DAILY MODE" section (was sitting unused since v1.4.0) — resolved the last entry in CLAUDE.md's Known Issues, which is now empty and removed.

Shipped as **v1.5.8 (versionCode 30)**: bump confirmed at the gate, CHANGELOG updated, pushed, `/release` triggered CI (test gate green, build ~40 min), GitHub Release published with both artifacts, local `releases/` copies refreshed. Device spot-check by Dilip: no issues.

`/smoke` was run properly this time (previous close's `.claude/smoke-status.json` was 3 commits stale) — automated checks + 8/10 manual web items verified directly (had to exclude an always-mounted `opacity:0` end-game overlay from DOM queries to get clean reads — testing-methodology issue, not a product bug). Items 4 and 10 (wave timing, share text) are device-only and were explicitly marked `skipped` by user decision rather than left silently unrecorded.

Also had an extended side conversation about a future multi-game ad-monetized web portfolio (domain naming, hit two real trademark/brand collisions — `gullygames.org` and `desiboard.games` — both verified via web search before any registration happened) — concluded with a firm decision that **Wordout itself stays ad-free**; monetization would live on a separate future brand. Recorded in project memory (`wordout-ads-scope-decision.md`) and now also in CLAUDE.md's locked decisions.

## Current state

- **v1.5.8 (versionCode 30)** released on GitHub and device-verified; `releases/latest` points at it. Play Store still has **v1.5.6/vc28** on closed testing — v1.5.7 was never uploaded, so v1.5.8 supersedes both v1.5.7 and v1.5.6 for that purpose.
- Play Store release notes were drafted this session (see chat) covering the 1.5.6→1.5.8 user-facing delta: daily-word collision fix + new Help screen Daily Mode section. v1.5.7's changes were entirely internal (test suites, CI, refactor) — no user-facing notes needed for it.
- `.claude/smoke-status.json` records a pass for commit `0c17bce` (the v1.5.8 bump commit) with items 4/10 explicitly `skipped`.
- Decision capture done: "no cutover needed" reasoning added to Daily Gate Architecture; "Wordout stays ad-free" added as a locked decision; advisor-settings-key note softened from "confirmed broken" to "unconfirmed, worth re-testing" based on this session's observations.

## Exact next step

**Play Store upload** is the main loose end — v1.5.8 (AAB in `releases/wordout-latest.aab`) needs manual upload to closed testing whenever store work is next prioritized. Otherwise normal feature work resumes; candidates from TODO.md: two stale nice-to-have TODO entries still need pruning (already-shipped haptics item, and an "animate board indicators" item that contradicts a locked CLAUDE.md decision — flagged but not cleaned up this session), Android 15 edge-to-edge API migration, tablet support.

If the web-games-portfolio idea resumes, don't re-litigate the Wordout-stays-ad-free decision — see CLAUDE.md's Monetization line and `wordout-ads-scope-decision.md`. Domain naming was mid-search when the conversation paused (ruled out gullygames.org, desiboard.games; onglipo.games/onglipo.fun and a few India-wide-not-regional-slang candidates like deshiboard.games were still live options).

## Gotchas

- **AsyncStorage web fallback uses `localStorage`, not IndexedDB** — `localStorage.clear()` does reset it. Confusion this session came from a different source: an always-mounted end-game overlay renders with `opacity:0` but still occupies real DOM layout/bounding-rect space, so naive `getBoundingClientRect()`-based DOM queries in browser-preview testing pick up its (correct, real) answer-word text and can be misread as "stale/already-solved" game state. Filter by walking up the ancestor chain checking `getComputedStyle(el).opacity !== '0'` to get clean reads.
- `preview_screenshot` was unreliable this session (repeated 30s timeouts) even when the page was fully responsive to `preview_eval`/`preview_snapshot` — prefer DOM/computed-style inspection over screenshots when screenshots start timing out, don't assume the page is frozen.
- `/release`, `/smoke`, and `/close` all carry `disable-model-invocation: true` — confirmed again this session that even an explicit user "yes" to "should I run X" doesn't let the assistant invoke them via the Skill tool; the user must type the slash command themselves each time.
- The Model Selection section's advisor-settings-key note is now marked "unconfirmed" rather than "does NOT work" — if a future session wants to actually settle this, the clean test is comparing `advisor()` behavior with `advisorModel` present vs. removed from `~/.claude/settings.json`, not just observing that it seems to work.
