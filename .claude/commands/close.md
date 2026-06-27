---
name: close
description: Session close ritual — update handoff, TODO, CHANGELOG and report cost
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

5. **Report `/cost`** for this session

Confirm with: "Session closed. Handoff written. Safe to /exit."
