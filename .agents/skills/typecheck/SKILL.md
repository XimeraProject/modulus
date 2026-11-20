---
name: typecheck
description: Use when asked to typecheck, check TypeScript, or verify type safety in this repository.
---

Run from the repository root:

```
pnpm typecheck
```

This runs `tsc --noEmit` over the application, including the generated
`src/routeTree.gen.ts`. If route files were added, moved, or removed, run
`pnpm build` (or `pnpm dev`) first so the route tree is regenerated.

Report any type errors found, grouped by file.
