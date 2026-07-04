---
name: close
description: Session close ritual — update handoff, TODO, CHANGELOG, commit, push, report cost
---

Run all steps in order. Do not skip any step even if there were no code changes.

1. **Update `.claude/session-handoff.md`** (overwrite, do not append):
   - Every file modified and what changed
   - Decisions made and why (include any deviations from the spec given)
   - Current state of in-progress work
   - Exact next step to resume
   - Any bugs or gotchas discovered

2. **Update `TODO.md`**:
   - Mark completed items ✅ with today's date
   - Add any new items discovered this session
   - Re-prioritise if anything changed

3. **Update `CLAUDE.md`** if anything changed:
   - New components added (name, purpose, location)
   - Changed behaviour or defaults
   - Fixed bugs that affect how things work
   - New patterns or decisions future Claude sessions should know
   - Remove outdated information

4. **Update `CHANGELOG.md`**:
   - Add entry under current version (or [Unreleased])
   - Format: `- [Added/Changed/Fixed/Removed] description`

5. **Update `README.md`** if new features were added, word lists changed, or user-facing behaviour changed:
   - Keep it accurate for new contributors and users

6. **Update `docs/playstore.md`** if release status, version, or store assets changed

7. **Commit and push all changes** (mandatory — never close with uncommitted changes):
   ```
   git add -A
   git commit -m "chore: session close — <brief description of what changed>"
   git push origin main
   ```
   The commit message should describe the session's changes in a few words, e.g.:
   - `chore: session close — update handoff and TODO for v1.2.1`
   - `chore: session close — update CLAUDE.md and close command`

8. **Report `/cost`** for this session

Confirm with: "Session closed. Handoff written. Safe to /exit."
