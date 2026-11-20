---
name: verify
description: Verify a change: lint, typecheck, build, and boot the build in each deployment mode. Pass a mode or 'quick'.
allowed-tools: Bash, Read
argument-hint: [optional all-in-one|frontend|admin|quick]
---

Read `.agents/skills/verify/SKILL.md` from the repository root in full and
follow it. Treat `$ARGUMENTS` as the user’s arguments to that workflow.
Use Claude Code’s available tools for the actions described there.
