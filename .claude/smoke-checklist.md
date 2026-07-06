# Wordout Smoke Checklist

Pre-release smoke test, run via the global `/smoke` skill. Items cover paths that have
regressed before (version in parens). Logic-level invariants (hard-mode constraints,
daily answer derivation) are covered by unit tests, not this list.

## Automated

- `npx tsc --noEmit`
- `npx jest --ci`
- `node -e "const c={'answers_en_us':2315,'answers_en_gb':2314,'guesses_en_us':10484,'guesses_en_gb':8554};for(const[f,n]of Object.entries(c)){const l=require('./assets/wordlists/'+f+'.json').length;if(l!==n)throw new Error(f+': '+l+' != '+n)};console.log('word lists OK')"`

## Manual

1. [web+device] Type a 5-letter word and submit with ⏎ — guess submits, tiles flip. No literal `⏎` character appears on the board. (v1.5.5 regression)
2. [web] Settings → "Swap ⏎ and ⌫ positions" — default OFF has ⏎ on the right; toggling ON moves ⏎ to the left. (v1.5.6 polarity fix)
3. [web+device] Solve or part-play a board, switch away (daily ↔ practice, or change board count), come back — state persists and NO fill/wave animation replays; ✓ overlay on solved boards shows without re-animating. (v1.2.2–v1.2.8 chain)
4. [device] Win a board — wave bounce plays once, celebration popup fires once, ✓ overlay appears only AFTER the wave finishes (check on 6-out or 8-out where the wave is long). (onWaveDone timing, v1.2.8)
5. [web+device] Daily: header difficulty emoji cycles only unlocked difficulties; after winning Easy, footer shows "💪 Unlocked! Play Now". (v1.2.2–v1.2.4 gate chain)
6. [web] n-out: switch boards by swipe AND by tapping an indicator dot — keyboard letter colours reflect the active board only, not a union. (v1.5.2)
7. [web] Stats modal (📊) opens on the correct Daily/Practice tab for the current mode and shows data. (v1.4.1 `boardCount > 1` bug)
8. [web] New Game / mode arrows / language change with a game in progress — abandon confirmation appears. (never-clear rule)
9. [web+device] Dark theme toggle — tiles, keyboard, and overlays all recolour correctly.
10. [device] Daily win → Share — text has correct mode name, difficulty emoji, and `X/maxGuesses`. (v1.5.4)
