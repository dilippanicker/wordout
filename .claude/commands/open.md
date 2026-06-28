---
name: open
description: Session open ritual — context check, handoff summary, objective setting
---

1. Run `/context` — if fill is >60%, run `/compact` before anything else
2. Remind the user: "💡 Type /model haiku now for cost savings. Continuing in 10 seconds..."
3. Read last 20 lines of `.claude/session-handoff.md` — summarise in exactly 3 bullets
4. State the current model
5. If the user has not stated a session objective, ask: "What's the goal for this session?"

Do not start any work until step 5 is resolved.
