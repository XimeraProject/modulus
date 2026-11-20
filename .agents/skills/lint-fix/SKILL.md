---
name: lint-fix
description: Use when asked to lint, format, auto-fix lint issues, or run Biome across the project.
---

Run from the repository root:

```
pnpm lint
```

This runs `biome check --write --diagnostic-level=error`, which applies safe
lint and formatting fixes only (never `--unsafe`) and modifies files. Use
`pnpm lint:check` for a read-only check.

After running, summarise what was fixed. If errors remain that could not be
auto-fixed, list them by file.
