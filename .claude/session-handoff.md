# Session Handoff — 2026-07-03 (Session 14)

## What Happened This Session

Minimal work: added web deployment feature to Nice to Have section in TODO.md.

---

## Files Modified

### `TODO.md`
- Added new item under 🟢 Future — Nice to Have:
  - **Deploy Wordout as a web app** — npx expo export --platform web generates static dist/ folder, deploy to onglipo.in/wordout or wordout.onglipo.in. Consider adding PWA manifest so users can install from browser. Haptics and AsyncStorage already work on web.

---

## Decisions Made

- No changes to other documentation — TODO item is clear and actionable as-is

---

## Current State

- v1.4.1 (versionCode 20) shipped, all prior work complete
- Web deployment added to backlog (low priority, marked Nice to Have)
- No bugs or regressions reported
- Ready for next session

---

## Exact Next Steps

From prior handoff (Session 13):

1. **Upload v1.4.1 AAB to Play Console** internal testing track — most overdue item, testers on v1.0.3
2. **Run full device regression checklist** (from TODO.md IMMEDIATE section) — wave animations, popup timing, board persistence across mode switches
3. **Complete Play Console setup**: content rating, data safety, target audience
4. **CECIL wordlist cleanup** — remove proper noun from `assets/wordlists/answers_en_us/gb.json`
5. **Feature graphic** (1024×500px) — design in claude.ai
6. **Screenshots** on S24 Ultra (min 2, recommend 6)

---

## Known Issues / Gotchas

- **`boardCount` defaults to `4`** in `settingsStore` — never use `boardCount > 1` to detect multi-board mode, use `gameMode === 'quordle'`
- **CECIL** in GB answers list — proper noun, pre-existing
- **`new-game.tsx` TS error** — pre-existing route type mismatch, non-blocking
- **`DAILY_PROGRESSION`** — exported from `helpContent.ts`, not yet wired into HelpModal
- **Android 15 edge-to-edge API** — Play Console warning on release 20, tracked in TODO
- **Tablet / large screen** — orientation lock flagged by Play Console on release 20, tracked in TODO
