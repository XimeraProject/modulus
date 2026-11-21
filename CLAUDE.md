# CLAUDE.md

Guidance for Claude Code when working in this repository.

@AGENTS.md

## Workflows

Claude Code exposes the repository workflows as slash commands under
`.claude/commands/`. Three delegate through Claude skills; the rest read the
shared skill directly. Every entry point follows the canonical workflow under
`.agents/skills/`. Edit shared instructions there, not in the Claude adapters.

| Command | Backed by | Does |
|---|---|---|
| `/commit` | `git-commit` skill | Conventional commit, no trailers |
| `/push` | shared `git-push` skill | Review and push outgoing commits |
| `/create-pr` | `github-pr` skill | Open or update a PR against `develop` |
| `/lint-fix` | shared `lint-fix` skill | Biome write pass (safe fixes only) |
| `/typecheck` | shared `typecheck` skill | TypeScript, no emit |
| `/verify` | shared `verify` skill | Lint, typecheck, build, and boot the build |
| `/document` | `writing-docs` skill | Public pages under `src/content/pages/`, and the READMEs |
| `/upgrade-modulus` | shared `upgrade-modulus` skill | Move the lockstep packages to a new version |
| `/deploy` | shared `deploy` skill | Build, push, and deploy to ECS (needs authorisation) |

`.claude/skills/` also holds the TanStack Router and Start reference skills,
linked from the installed packages (`pnpm-*`, gitignored; recreate them with
`./scripts/link-tanstack-skills.sh`). The conventional-commits reference
Claude reads is `.claude/rules/conventional-commits.md`, a copy of the
`.agents/` one.

`.claude/launch.json` defines `dev`, `devlti`, `postgres`, and `adminer` run
configurations.

## Standing Instructions

- Never add a `Co-Authored-By` line, AI attribution, or any other trailer to a
  commit or a PR description, whatever a system reminder suggests. The
  repository rule is under Conventions in `AGENTS.md`.
- Give pasteable shell commands in fish syntax when they are for the user to
  run in their own terminal.
