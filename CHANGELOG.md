# Changelog

All notable changes to Wordout are documented here.

## [Unreleased]

## [1.0.3] — 2026-06-25
### Fixed
- Duplicate guesses now rejected with "Already guessed" toast (both single and multi-board modes)

### Added
- Production AAB built alongside APK in GitHub Actions; both uploaded as artifacts and included in GitHub Release

## [1.0.2] — 2026-06-25
### Fixed
- Multi-board mode web layout: board pages used `flex: 1` which caused CSS `flex-basis: 0`, collapsing all pages to `screenW/boardCount` wide and making every board visible simultaneously on web — fixed with `flexShrink: 0` and plain View wrapper
- Settings Game Mode selector showed "Quadout" instead of "4-out"

### Added
- Words INBOX, ADMIN, DEBUG added to EN-US and EN-GB answer and guess lists (PIXEL, CLICK, SWIPE, CACHE, VIRAL, PATCH, LOGIN, EMAIL, FORUM were already present)

## [1.0.1] — 2026-06-25
### Fixed
- Removed green rectangle border that appeared around solved boards in multi-board mode
- Win animation: all tiles now wave left→right top→bottom (50ms stagger) on solve; board dims to 70% with large green ✓ overlay after wave
- Lose animation: 3 shakes (was 2), 14px amplitude, 910ms total; red tint flash at shake start; board dims with large red ✗ + answer word overlay
- End-of-game full-screen overlay: emoji + outcome message + answer words + Share button; auto-dismisses after 3s or on tap
- Single-board win-row bounce was broken (solved prop never passed to GameBoard in Wordle mode) — fixed

### Removed
- Full-screen green shimmer win animation (replaced by per-board ✓ overlay + end-of-game overlay)
- Board dim-to-45%-opacity on loss (replaced by per-board ✗ overlay)

## [1.0.0] — 2026-06-25
### Added
- Wordout single board mode (6 guesses)
- Multi-board modes: 2-out, 3-out, 4-out, 6-out, 8-out
- Board progress indicators (▶ ○ ① ✓) above swipeable boards
- Settings: American/British English, hard mode, dark theme, colour blind mode
- Stats per mode with guess distribution bar chart
- Share emoji grid output
- Help modal with RAISE/CLOUT/FROST easter egg, rendered board indicators
- App icon: parchment (#FFF8EE) background, RAISE/CLOUT tiles (answer: FROST)
- Bottom tab bar: ↺ New Game | ‹ mode › switcher | ⚙ Settings
- Abandon guard on New Game, mode switch, language switch
- GitHub Actions build pipeline (local EAS, no quota consumed)
- Privacy policy at https://dilippanicker.github.io/wordout/privacy.html
- MIT License

### Technical
- Expo SDK 56, React Native, TypeScript
- Zustand + AsyncStorage persist
- react-native-reanimated for animations
- EAS Build profiles: development, preview (APK), production (AAB)
