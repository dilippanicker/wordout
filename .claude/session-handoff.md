# Session Handoff — 2026-11-11 (v1.9.1: review-prompt once-per-win fix + diagnostics; Google Play badge)

## What this session did
- **CLAUDE.md trim (partial):** Play Store + Distribution sections condensed to rules + pointers; full original text archived verbatim in REGRESSION_TRAPS.md ("Play Store (full)", "Distribution (full)"). ~40.3 KB -> ~34.5 KB but still ~306 lines (long lines), so the ~200-line budget is NOT met.
- **v1.9.0 confirmed released:** user ran the build manually (run 42957046846 green; GitHub Release v1.9.0 has apk+aab) and uploaded the AAB to the Play internal track. Refreshed gitignored `releases/wordout-latest.apk` to v1.9.0 (byte-identical to the release asset).
- **Google Play badge (commit 03115d3):** official English badge, unmodified from Google's badge zip, at `docs/img/google-play-badge.png`; on README (first, beside "Play in browser", raw GitHub URL) and landing page (replaced the commented-out button). **README.md changed (user-facing).** Google Play is now LIVE (production access granted); CLAUDE.md Play Store/Distribution updated with the listing URL.
- **Deploy gap fixed:** nothing previously deployed `docs/` to the Pages root (it was hand-seeded onto gh-pages). `deploy-web.yml` now has a step publishing `docs/` to the branch root with `keep_files: true` (same job, runs after the /play/ deploy; same gh-pages-deploy concurrency group). Verified live: `/`, `/privacy.html`, `/play/`, `/img/google-play-badge.png`, `/wordout-feature-graphic.png` all 200; badge renders 202x60 beside the 186x46 "Play in browser" button (desktop width only; phone layout not checked).
- **Review-prompt analysis (read-only):** documented the gates/early-exit paths; found a double-dismiss window (tap in ~4.68-5.0 s lets the 5 s auto-dismiss also fire dismissEndGame -> two requests).
- **v1.9.1 (versionCode 43), commit 9c69916 + bump:** `scheduleReviewAfterWin` / `REVIEW_DELAY_MS` in `utils/reviewPrompt.ts` (takes a per-win `{current:boolean}` flag; component holds `reviewScheduledRef`, reset when status goes back to 'playing'); `reviewBlockedBy()` names the failing gate; `maybeRequestReview` records `reviewLastOutcome` (`blocked:<gate>` | `unavailable` | `error:<msg>` | `requested`) + `reviewLastOutcomeDate` in settingsStore (persisted, no migration); hidden Settings diagnostics panel (long-press version line 600 ms; tap to close) shows totalWins, firstLaunchDate, reviewPromptCount, lastReviewPromptDate, reviewLastOutcome(+Date), deviceNow. Local only, no network/logging.
- Auto-memory: updated wordout-playstore-production-access and wordout-play-upload-automation-gated (production now live; automation gate lifted, not set up).

## Verification
- `tsc --noEmit` clean; jest 79/79 (8 new: gate names, 3 timing cases, double-dismiss, flag reset, loss, outcome strings).
- Web dev server: Settings long-press panel opened (long-press SIMULATED with dispatched mouse events held 800 ms) and closed with a real click; review values showed defaults, as expected on web.
- NOT verified: panel on a real device; the Play review dialog itself; component's own tap-vs-effect timer wiring (the 3 timing tests call the scheduler at different offsets, not the component).

## Current state
- Version 1.9.1 (versionCode 43) in app.json, CHANGELOG.md, CLAUDE.md, this file. **v1.9.1 is BUILT and RELEASED**: user dispatched Build APK run 42979764248 (commit 336e7a6; test/build/deploy-web all green, finished 2026-11-11 ~08:06 UTC); GitHub Release v1.9.1 (Latest) has wordout.apk (98,590,824 B) + wordout.aab (69,762,443 B). Local `releases/wordout-latest.{apk,aab}` refreshed to v1.9.1 (byte-identical to the release). (`./make.sh watch` once failed with a client-side `api.github.com` timeout fetching annotations — a transient network error, not a build failure.) Play internal-track upload of the v1.9.1 AAB: user doing it manually; release note drafted (fixed double review request; new hidden diagnostics panel; ask testers to win 5+ games over a few days then report `reviewLastOutcome`).
- Commit 9c69916 was local-only until this close; pushed with the close commit at the user's request.

## Exact next step / open items
1. Confirm the v1.9.1 AAB is on the Play internal track (user uploads manually). Do NOT run /release again for 1.9.1.
2. On a Play-installed v1.9.1: win >= 5 games, then long-press the version line in Settings to read reviewLastOutcome. `requested` with no card = Play suppressed it; `blocked:first-launch` = clock was moved before first launch; `blocked:wins` = fewer than 5 counted wins; no outcome at all = overlay never dismissed (new game / mode switch within ~11 s of the win).
3. Still open: device-verify streak badge and dead-end toast; delete stale `wordout-latest.apk` on itch.io; CLAUDE.md still ~306 lines (candidates: long Stores/Daily Gate lines ~101/109/110, Keyboard line ~292, Key Design Decisions rationale) — needs user OK before cutting.
4. Web dev server's Settings version line showed "v1.8.1" while app.json said 1.9.0 — likely stale Expo config cache; not investigated.

## Gotchas
- Any new win path must call `settingsStore.incrementTotalWins()`.
- Review request fires only if the end-game overlay appears (4.2 s after a win) AND is dismissed (tap or 5 s); new game / mode switch before that skips it. firstLaunchDate is set on first v1.9.x launch, so a clock moved forward BEFORE first launch defeats the 3-day gate.
- Pages root is now deployed from `docs/` by deploy-web.yml; edit `docs/`, push, it goes live. Landing/badge assets must stay unmodified official Google files.
- Model check at /open could not confirm opusplan; /status not run.
