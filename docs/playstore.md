# Wordout — Play Store Setup

## Publisher Details
- Publisher: Onglipo
- Package: `com.dilippanicker.wordout`
- Identity verified ✅

## Current Status
- Internal testing: live ✅
- Closed testing: live ✅
- Testers: 12/12 opted in ✅
- 14-day clock: running — production access ~July 10 2026
- Last uploaded to Play Store: versionCode 4 (v1.0.3)
- Next upload: v1.2.7 (versionCode 15) AAB

## Upload Process
1. Download AAB from GitHub release:
   `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.aab`
2. Go to [Play Console](https://play.google.com/console)
3. Select Wordout → Testing → Internal testing
4. Create new release → upload AAB
5. Promote to closed testing after internal passes
6. Promote to production after July 10

## Store Listing

### Short description (80 chars max)
Free word puzzle game — daily challenge + unlimited practice, no ads

### Full description
Wordout is a free, open-source word puzzle game with no ads, no accounts, and no tracking.

**Daily Word** — one new 5-letter word every day, the same for everyone. See if you can solve it in 6 tries.

**Practice mode** — unlimited games whenever you want, at any difficulty level.

**Multi-board mode** — solve 2, 3, 4, 6, or 8 words at the same time. Every guess applies to all boards at once.

**Three difficulty levels:**
- 🐣 Easy — no constraints, just guess freely
- 💪 Hard — you must use every hint you've revealed
- 💀 Extreme — fewer guesses, more pressure

**Also includes:**
- American and British English word lists
- Color blind mode (high-contrast orange and blue)
- Dark and light theme
- Stats tracking with guess distribution
- Share your results as an emoji grid

The word list is carefully curated — no proper nouns, no plurals, no obscure words. Around 1,500 answer words and 9,000 valid guesses.

Wordout is completely free and open source (MIT licence). No ads, no in-app purchases, no accounts required.

## Assets Needed
- [ ] Feature graphic: 1024×500px — dark bg, RAISE/CLOUT tiles left, selling points right (design in `store-assets/wordout-feature-graphic.png`)
- [ ] Screenshots: minimum 2, Pixel 7 size (1080×2400) — 1-board and 4-board at minimum
  - Existing screenshots in `store-assets/` — review if current

## Play Console Setup Checklist
- [ ] Content rating — complete questionnaire
- [ ] Data safety — declare no data collected
- [ ] Target audience — 13+ (word puzzle, no sensitive content)
- [ ] App category — Word Games
- [ ] Contact email — set to dilip.panicker@gmail.com

## Automation (future)
- [ ] Create Google Play service account
- [ ] Download JSON key
- [ ] Add as `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret in GitHub repo
- [ ] Add Play Store publish step to `.github/workflows/build-apk.yml`
- [ ] Test automated upload on a patch release

## Version History
| versionCode | version | Notes |
|-------------|---------|-------|
| 4 | 1.0.3 | Last uploaded to Play Store |
| 15 | 1.2.7 | Current — ready to upload |
