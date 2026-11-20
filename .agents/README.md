# Agent Configuration

This directory contains the canonical repository workflows for every agent.
Agents discover skills under `.agents/skills/`; Claude commands and skills
read the same files through their entry points under `.claude/`.

## Entry Points

| Claude entry point | Shared source |
|---|---|
| `CLAUDE.md` | `AGENTS.md` |
| `.claude/rules/conventional-commits.md` | `.agents/rules/conventional-commits.md` |
| `.claude/skills/git-commit/` and `/commit` | `.agents/skills/git-commit/` |
| `.claude/skills/github-pr/` and `/create-pr` | `.agents/skills/github-pr/` |
| `.claude/skills/writing-docs/` and `/document` | `.agents/skills/writing-docs/` |
| `/push` | `.agents/skills/git-push/` |
| `/lint-fix` | `.agents/skills/lint-fix/` |
| `/typecheck` | `.agents/skills/typecheck/` |
| `/verify` | `.agents/skills/verify/` |
| `/upgrade-modulus` | `.agents/skills/upgrade-modulus/` |
| `/deploy` | `.agents/skills/deploy/` |

Claude's `.claude/launch.json` has no `.agents` equivalent; its run commands
are documented in `AGENTS.md`. Claude permission allowlists in
`.claude/settings*.json` are also not portable: each agent runtime enforces its
own sandbox and approval policy.

`CLAUDE.md` imports `AGENTS.md` with `@AGENTS.md`, so shared repository rules
live only in `AGENTS.md`; `CLAUDE.md` holds Claude-specific details alone. When
a workflow changes, update its body only in `.agents/skills/`. Change a Claude
adapter only when its command arguments, runtime metadata, or target path
changes. Keep the conventional-commits rule copies synchronised; the Claude
copy is loaded by Claude's rules mechanism.

## TanStack Reference Skills

TanStack Router and Start ship agent skills inside their npm packages. They are
linked into `.agents/skills/` and `.claude/skills/` as `pnpm-*` symlinks, which
are gitignored because they point into `node_modules`. Recreate them after
`pnpm install` changes the TanStack versions:

```sh
./scripts/link-tanstack-skills.sh
```
