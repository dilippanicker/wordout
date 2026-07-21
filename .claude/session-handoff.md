# Session Handoff — 2026-07-21 (Session 24: Play Store production-access rejection investigated)

## What this session did

No code changes. The whole session was a Play Console investigation, walked through screenshots the user took live in the browser (`~/Pictures/Screenshots/`).

**Finding:** v1.5.8 (versionCode 30) is live on Closed testing - Alpha (released Jul 9, 100% rollout, 18,977 devices reached). The user applied for production access and was **rejected** on review (banner says "Reviewed Monday" — 2026-07-20): *"Run your closed test with at least 12 testers for 14 more days starting from the review date. 12 testers have currently been opted in for 1 day."*

This conflicts with the user's own understanding — they believed they'd had 12+ opted-in testers continuously since July 9 (~11-12 days by the review date), which is presumably why they applied. The discrepancy is **unexplained** — Play Console's UI doesn't expose historical opt-in duration anywhere, only the current snapshot on this rejection banner. Established during the session (clarifying three distinct, easily-conflated numbers):
- **19** — testers on the invite list ("Internal Testers for Wordout" email list, Testers tab)
- **12** — how many had actually opted in (accepted the join link) per Google's last check
- **8** — how many of those opted-in testers ever downloaded/installed

An earlier working theory (opted-in count dipped below 12 then recovered, resetting the clock) was floated but the user correctly pushed back — they hadn't contacted or changed any tester since the July 9 release, so there's no mechanism for churn on their end. That theory was retracted as unconfirmed speculation, not something Google's message actually states.

**New information from Google's own AI-assist panel** (shown in Play Console's "New support ticket" flow before you can create one): failed production applications are attributed to either (a) the 12-tester minimum not being maintained continuously, **or (b) "insufficient engagement from those testers during the period."** This fits the data better than the churn theory — 12 opted in but only 8 ever downloaded means several testers joined without ever using the app, which plausibly reads as low engagement to whatever Google's system measures.

**Clarified how Google can measure "engagement" despite the app having zero telemetry/analytics of its own** (consistent with the project's "no tracking" principle — that's about *not adding* third-party SDKs, this is store-level telemetry outside developer control): the Play Store client and Google Play Services report install/uninstall, app-open events, Android vitals (crash/ANR rate), and update-adoption automatically for every Play-installed app, with no app-side instrumentation required.

A support-ticket draft was written (not yet confirmed submitted) targeting the specific factual discrepancy — 12+ opted-in since July 9 per the user's records vs. "1 day" shown at review — asking Google to explain the reset rather than repeating generic guidance.

## Current state

- v1.5.8/vc30 live and stable on Closed testing - Alpha; this is unchanged and not in question.
- Production-access application was rejected once (2026-07-20 review). Google's own copy says the 14-day/12-tester requirement "cannot be waived or expedited" — there is no fast path.
- Root cause of the "1 day" figure vs. expected ~11-12 days remains **unconfirmed**. Two live hypotheses, not mutually exclusive: (1) insufficient tester engagement (opted-in but inactive), (2) some Play Console mechanism we don't understand yet (possibly tied to release/track edits — unconfirmed).
- Support ticket text was drafted in-conversation but the user had not confirmed sending it as of session end.

## Exact next step

1. **Decide whether to submit the drafted support ticket** (Play Console → Help → Contact us → Closed testing / Production access category). Ask specifically why the opt-in duration shows 1 day given no tester-list changes since July 9, and whether "opted in" requires ongoing activity beyond the initial join.
2. **Get existing opted-in testers to actually open/use the current build** — this directly targets the "insufficient engagement" hypothesis without touching release/track config (which risks triggering whatever the unknown reset mechanism is).
3. **Optionally ship a bug-fix release** once real tester-reported bugs are gathered (the "how to play" / Enter-key-default feedback the user mentioned was already implemented in past sessions — no new bug list exists yet, wasn't captured this session). Framed correctly to the user: a release won't shorten the mandatory 14 days, but gives testers a reason to reopen the app (targets engagement) and gives concrete material for the reapplication questionnaire, which Google's own guidance asks for ("highlighting specific bugs fixed and features added").
4. **Wait 14 clean days with opt-in count staying ≥12** before reapplying via Dashboard → "Apply for production." Build margin by getting more of the 19 invited testers to actually opt in (7 haven't).
5. Don't edit the tester list, countries/regions, or push a new release impulsively — every untouched variable right now is a suspect for whatever caused the "1 day" reset.

## Gotchas

- **Play Console's UI has no page showing opt-in history or duration** — only the Dashboard's eligibility banner shows a point-in-time snapshot ("N testers opted in for M days"), and only when there's an active rejection to review. The Testers tab (Closed testing - Alpha → Testers) shows list size (invited count) only, not opt-in count.
- **Three tester numbers are easy to conflate**: invited (list size) → opted-in (accepted join link) → downloaded (installed). Google's 14-day production-access clock counts opted-in, not the other two.
- **App-side "no tracking" does not mean Google can't see usage.** Play Store/Play Services collect install, open, vitals, and update-adoption telemetry for every Play-installed app regardless of app code — this is separate from (and doesn't conflict with) the project's explicit decision to avoid adding analytics/ad SDKs.
- Two screenshot mix-ups happened mid-session (a stale filename pointed at an unrelated ChatGPT/DevTools screenshot) — always confirm the screenshot filename matches what's actually being discussed before analyzing it.
