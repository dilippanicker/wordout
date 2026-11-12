# Session Handoff — 2026-11-12 (store screenshots, CI Node 24, store listing updates; no app change, v1.9.1)

## What this session did
- **New 9:16 store screenshots (commit c13f5ad):** `scripts/make-store-screenshots.py` builds `store-assets/screenshots/` (8 PNGs, 1080x1920, 24-bit RGB, + contact-sheet.png) from the gitignored `store-assets/raw/` Samsung frames: crop 100 px top / 135 px bottom, scale to 1920 tall, extend each row's edge pixels to the canvas. A plain 1080x1920 crop was tried first and cut the header/footer — don't. Old `phone-screen-*.jpg` (21 files) deleted after confirming nothing referenced them. `store-assets/store-shot-list.md` lists the 8 shots + raw filenames + rerun command. README.md NOT changed.
- **Doc fix (commit b0473a1):** CLAUDE.md Distribution now describes `store-assets/screenshots/`, says `store-assets/amazon/` holds only icons, and records Amazon's end of Appstore updates for Android phones (2025-08-20).
- **CI (commit 4a33505):** all `runs-on` pinned to `ubuntu-26.04` (the image the last good Build APK used); checkout@v7, setup-node@v7, cache@v6, setup-java@v6, upload-artifact@v7, peaceiris/actions-gh-pages@v4 (all node24). `android-actions/setup-android` deliberately left at v3. Also quoted `"$GITHUB_OUTPUT"` (SC2086). Details in REGRESSION_TRAPS.md "CI: runner pin and action versions".
- **Store listings updated by browser automation:** itch.io — 8 new screenshots, old 6 deleted, saved, public order verified 01-08. Google Play — old 7 phone screenshots replaced by the 8, AI declaration "Don't label assets", saved, and **submitted for review** (Publishing overview showed "Changes in review"; quick checks were still running). Amazon — READ ONLY, nothing changed.
- REGRESSION_TRAPS.md got three new sections: CI runner/actions, Store listing screenshots (Play/itch.io quirks), Amazon Appstore listing.

## Verification
- Test + Deploy Web runs on 4a33505 both green (incl. itch.io HTML5 job); jobs logged `Image: ubuntu-26.04` and started within ~20 s (label works). Pages `/`, `/privacy.html`, `/play/` (and its JS bundle) all 200.
- actionlint (Docker) exits 0 apart from its unknown-label false positive for ubuntu-26.04.
- Screenshot script output byte-identical to the previously reviewed files; contact sheets viewed.
- NOT verified: `build-apk.yml` was never run after the bumps (cache@v6, setup-java@v6, upload-artifact@v7, release steps untested); whether Play's quick checks passed / Google approved; Node 20 warning for setup-android@v3 still expected.

## Current state
- Version 1.9.1 (versionCode 43) in app.json, CHANGELOG.md, CLAUDE.md, this file — no drift. No app code changed this session, so no CHANGELOG entry and no release.
- Everything committed and pushed (c13f5ad, b0473a1, 4a33505); close commit is local until pushed on request.

## Exact next step / open items
1. Watch Google Play's review of the phone-screenshots change (typically up to 7 days).
2. **Amazon needs a decision:** an "Incomplete" upcoming-version draft exists with AAB version code 37 (Fire TV 90/100, Automotive 2/2); live is version code 36 (12 of 40 Fire tablets, 0 Fire TV). Submitting the draft to change screenshots would ALSO ship vc 37 and those targets. Do not click Next/Delete/Submit there without a deliberate decision.
3. Next real release (`/release`) is the first test of the CI bumps in build-apk.yml; consider setup-android@v4 only then.
4. Still open: v1.9.1 Play production review; read `reviewLastOutcome` on a device after 5+ wins; CLAUDE.md ~308 lines vs ~200 budget (needs user OK before cutting).

## Gotchas
- `store-assets/raw/` is gitignored — rebuilding screenshots needs the originals locally.
- Play editor holds max 8 phone screenshots: remove old before adding; multi-attach scrambles order; reorder by dragging a tile onto the one it should precede. itch.io caps at 12 screenshots.
- Closing a Chrome tab can end the whole tab-group session; keep one tab open or recreate the group.
- actionlint false positive on `ubuntu-26.04` — lint with `-ignore 'label "ubuntu-26.04" is unknown'`.
- Model check at /open could not confirm opusplan; /status not run.
