---
name: review
description: Pre-commit review for Wordout React Native project
---

1. Run `git diff --staged` to see what is staged. If nothing staged, run `git diff HEAD`.
2. Run `git status` for overall context.
3. Review the diff against these Wordout-specific criteria:

**React Native / Expo**
- No hardcoded device-specific dimensions anywhere
- Tile sizing uses useWindowDimensions() + useSafeAreaInsets() only
- No new npm libraries added without noting in CLAUDE.md
- Animations use react-native-reanimated only (no Animated API mixing)
- No console.log left in production code
- No TypeScript errors introduced (pre-existing ones in new-game.tsx are ok)

**State management**
- All persistent state goes through Zustand stores
- AsyncStorage persist config not broken
- Store schema changes would break persisted user data — flag these as Must Fix
- dailyStore schema changes require persist version bump — flag these as Must Fix
- gameStore (single board), quordleStore (multi-board), settingsStore, statsStore all intact

**Word lists**
- assets/wordlists/ files not modified accidentally
- Answer words not accidentally exposed in UI or logs

**Game logic**
- Abandon guard still fires on New Game, mode switch, language switch
- Stats recording still calls recordResult() on win and lose
- Hard mode constraint still enforced if hardMode is true

**Git hygiene**
- No .env files staged
- No node_modules staged
- No large binary files (APK, AAB) staged
- releases/ directory not staged (APK/AAB files should never be committed)
- app.json versionCode incremented if this is a release build
- Commit message follows: `type: description` format
  (types: feat, fix, chore, docs, style, refactor)

4. Produce a structured review:
   - **Must fix** — blocks commit
   - **Should fix** — worth addressing before push
   - **Notes** — observations, no action needed

5. End with:
   > Ready to commit. Run `git commit` when satisfied.
   or:
   > Fix the items above, then re-run `/review`.
