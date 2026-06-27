# Session Handoff

**Last updated:** 2026-06-27
**Session:** close.md updated (mandatory commit/push step added), tooling changes committed
**Model:** claude-sonnet-4-6
**Status:** v1.2.2 (versionCode 10) committed. All docs updated. Ready to build.

---

## What was done this session

### Code changes
None — session resumed from compaction, user updated close.md and ran /close.

### Files modified (committed in this session's close commit)

**`.claude/commands/close.md`**:
- Added step 5: mandatory `git add -A && git commit && git push` before reporting cost
- Updated description to include "commit, push"
- Never close a session with uncommitted changes

**`build-and-deploy.sh`**:
- Changed APK output from `~/Downloads` directly to `$REPO_DIR/builds/` subdirectory
- APK files now stored in `builds/` (gitignored) instead of repo root
- All `adb install` and `gh release` commands updated to use new path

**`.gitignore`**:
- Added `builds/` to ignore the new APK output directory

**`claude-ai-prompt.md`**:
- Updated hardware: S24 Ultra IP (192.168.68.107), ADB over WiFi notes
- Updated workflow step 6: CC commits at close via /close
- Added step 8: `bash build-and-deploy.sh` after CC commits
- Added "Build & Deploy" section with build script details
- Updated project status: v1.2.2 versionCode 10 current
- Updated v1.2.2 bug/enhancement list (10 bugs + 5 enhancements)

**Deleted**: `build-1782560055578.apk`, `build-1782567072084.apk` (moved to builds/ subdir)

### Docs updated in this close
- `CHANGELOG.md`: added v1.2.2 section (9 bug fixes + 5 enhancements)
- `TODO.md`: updated header to v1.2.2, added v1.2.2 ✅ section, updated IMMEDIATE
- `CLAUDE.md`: updated version references from v1.2.1/versionCode 9 → v1.2.2/versionCode 10

---

## What v1.2.2 contains (committed in prior session as `1bce942`)

### Fixed
- B1: End-game exit — practice "New Game", daily countdown
- B2: Daily New Game toast correct
- B3: Animations fire once only per game
- B5: Difficulty locked after daily completed (not just while playing)
- B6: Practice board persists on mode switch
- B7: ✓/✗ overlay appears after wave animation
- B8: Multi-board strip state cleanup
- B10: Mode arrows refresh active board
- B13: Streak explanation in HelpModal

### Changed
- E1: Removed auto-clear after invalid-word shake
- E2: Bottom strip ⏳/🎯/🎲 states
- E3: Stats row inline layout
- E4: Indicator row mode/difficulty label ("Today's · Easy" / "Practice · Easy")
- E5: Word count pills removed from Settings

---

## Current state

All changes committed and pushed. v1.2.2 (versionCode 10) is the current version on main.

---

## Exact next steps

1. **Build APK**: `bash build-and-deploy.sh` — builds locally via EAS (EAS free tier resets July 1, 2026), installs on device if connected via ADB WiFi, creates GitHub Release
2. **Device test on Samsung S24 Ultra** — verify all v1.2.2 changes (see TODO.md)
3. **Play Store submission** after device test passes (feature graphic + screenshots still needed)

---

## Gotchas for next session

- **ADB over WiFi**: `adb-phone` alias connects to S24 Ultra at 192.168.68.107:5555. After reboot, reconnect via USB once: `adb tcpip 5555`, then disconnect cable.
- **EAS free tier**: Resets July 1, 2026 (a few days away). `eas build --local` is the build method. build-and-deploy.sh uses this.
- **versionCode is 10** (v1.2.2). Next build needs versionCode 11.
- **close.md now requires git commit/push** — never close with uncommitted changes.
- **builds/ directory** stores APK output now (gitignored). APK files no longer in repo root.
