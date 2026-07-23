# Regression Traps

Resolved-incident write-ups and historical reasoning for closed decisions, extracted from CLAUDE.md to keep that file within its ~300-line soft budget. CLAUDE.md links here with "see REGRESSION_TRAPS.md" wherever the current behavior depends on one of these. Read the linked CLAUDE.md section first for the active spec — this file is the "why", not the spec itself.

## Daily word selection collision (fixed v1.5.8)
Word indices were previously derived via a bit-masked/bit-shifted formula from the UTC-midnight seed (`Math.imul(dayMs, 2654435761)`), which collided roughly 8 days per decade and capped indices at 2047 — words beyond that index in the answer list could never be selected as a daily word. Fixed by switching to `dailyIndices(dayNum, n)`, a mulberry32 PRNG sampled with reject-duplicate across the full `[0, n)` range. No cutover-date gating was needed for the fix: `dailyAnswers` is computed once per day and persisted, so an in-progress day keeps its already-computed word (old or new algorithm) and only future days see the new derivation — same-day cross-version consistency was never a requirement here (no historical word display, share text never reveals the word).

## Daily day-boundary local-time bug (fixed)
`getTodayString()`/`getYesterdayString()` and the countdown (`msUntilMidnight()`) previously used local time. For any timezone ahead of UTC (e.g. IST +5:30), local midnight arrives before real UTC midnight, so `checkAndReset()` fired early during that gap and the freshly-reset game reused `getDailyAnswers()`'s still-previous-UTC-day word — the daily word appeared to repeat across two consecutive local days. Fixed by keying all date logic off UTC date components. Regression test: `__tests__/store-invariants.test.ts` "day boundary is UTC, not local" (sets `TZ=Asia/Kolkata`, fails against the pre-fix local-time implementation).

## Quordle fresh-board difficulty switch (fixed v1.5.9)
The fresh-board (no guesses yet) path in `handleDifficultyToggle()` skipped the `newGame()` call after `setDifficulty()`, so the board kept the old difficulty's row count until a manual New Game — because `quordleStore.maxGuesses` (and thus rendered row count) is only recomputed inside `newGame()`, not derived live like single-board's. Both the confirmAbandon path and the fresh-board path must call `useQuordleStore.getState().newGame()`.

## itch.io account name (fixed)
`butler push` commands targeted `dilippanicker/wordout` for several sessions before being caught — the actual itch.io account is `onglipo`, a different identity from the GitHub repo owner and Google Play package name. Any butler command must target `onglipo/wordout:<channel>`.

## broth.itch.ovh retired (fixed)
The butler download domain `broth.itch.ovh` used in earlier drafts is retired and no longer resolves — itch.io moved to `broth.itch.zone`. This wasn't a typo; itch.io actually decommissioned the old domain. A stale `.ovh` reference fails with `curl: (6) Could not resolve host`, which isn't obviously itch.io-related from the error alone.

## itch.io HTML5 routing (fixed)
Expo Router has no supported hash-based or dynamic-subpath routing (confirmed by reading the installed `expo-router` source and cross-checking upstream: [expo/expo#27163](https://github.com/expo/expo/issues/27163), [expo/router#165](https://github.com/expo/router/issues/165)), and itch.io assigns a new CDN path on every upload with no stable prefix to hardcode — so the router 404s before the app boots. Fixed without touching app code: `scripts/itchio-postprocess.py` injects a boot-time `<script>` into the exported `index.html` that pins an explicit `<base href>` to the real (unknown-until-runtime) CDN directory — so relative asset loads stay correctly anchored — and *then* normalizes `window.location` to `/` via `history.replaceState()` so Expo Router's initial route match succeeds. Order matters: doing the `replaceState()` first (the obvious first attempt) breaks asset loading instead, because it also moves `document.baseURI`, which relative references resolve against. Verified locally against a simulated nested CDN path (clean boot, correct asset loads, round-trip client-side navigation to Settings and back), then verified again live including actually playing a guess in the production embed.

## itch.io embed sizing (fixed)
The itch.io project embed was first set to 390×844 (default), then widened to 430×844 to "match the app's design width" — both were wrong. An iframe sized to *exactly* match the 430×932 web card leaves zero slack for the dark-backdrop framing to render, so the game filled the iframe edge-to-edge with no visible boundary against the surrounding page. Fixed by widening to 700×1050, which gives the card room to show its margins, plus enabling the "fullscreen button" option.

## Keyboard Enter key glyph (fixed v1.5.5→v1.5.6)
v1.5.5 changed the Enter key's functional value to the glyph `'⏎'` directly, which broke submit — the glyph got typed as a literal character instead of triggering submit. Fixed in v1.5.6 by keeping the internal value always `'ENTER'` and mapping to the display glyph only at render time (`Text` content), so `onKey`/`keyStatuses` lookups keyed on `'ENTER'` stay correct.

## Model Selection — advisorModel config key (unconfirmed)
`~/.claude/settings.json` currently has `"advisorModel": "opus"` set, and `advisor()` calls in the 2026-07-08 session returned substantive, independent-seeming analysis. This note may be stale — it wasn't rigorously re-tested (didn't compare behavior with the key removed) — so treat as unconfirmed rather than fixed. The only *known*-correct way to enable the advisor is via the `/advisor` command picker in the session.
