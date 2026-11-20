---
name: deploy
description: Build, push, and deploy to AWS ECS. Requires explicit authorisation for each production step.
allowed-tools: Bash, Read, AskUserQuestion
---

Read `.agents/skills/deploy/SKILL.md` from the repository root in full and
follow it. Treat `$ARGUMENTS` as the user’s arguments to that workflow.
Use Claude Code’s available tools for the actions described there.
