#!/usr/bin/env bash
# Link the agent skills that TanStack Router and Start ship inside their npm
# packages into .agents/skills and .claude/skills (gitignored `pnpm-*` links).
# Re-run after `pnpm install` changes the TanStack versions.
set -euo pipefail
cd "$(dirname "$0")/.."
for dir in .agents/skills .claude/skills; do
  find "$dir" -maxdepth 1 -name 'pnpm-@tanstack+*' -delete
  for pkg in react-router react-start; do
    target="$(cd "node_modules/@tanstack/$pkg" && pwd -P)/skills/$pkg"
    ln -s "../../${target#"$PWD/"}" "$dir/pnpm-@tanstack+$pkg-$pkg"
  done
done
echo "Linked TanStack skills into .agents/skills and .claude/skills."
