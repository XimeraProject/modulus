---
name: upgrade-modulus
description: Use when asked to upgrade, update, or bump the Modulus packages (@modulus-learning/*) to a new version, or to check whether a newer Modulus release is available. Accepts an optional target version.
---

# Upgrading the Modulus packages

The `@modulus-learning/*` packages release in lockstep: every package carries
the same version, and this installation uses one version for all of them.
The source and release notes live in
[Modulus-Learning/app.modulus-learning.org](https://github.com/Modulus-Learning/app.modulus-learning.org).

## Steps

1. **Find the versions.** Read the current version from `package.json`. If no
   target was given, use the latest published version:
   `npm view @modulus-learning/core version`. Stop if they are equal.
2. **Read the release notes** between the two versions (the upstream GitHub
   releases and each package's `CHANGELOG.md`, e.g.
   `npm view @modulus-learning/core@<version> repository` to locate them).
   List for the user: breaking changes, new or renamed route files, new or
   changed environment variables, new peer dependencies, and release scripts
   (database migrations).
3. **Branch.** Work on `chore/modulus-<version>` from `develop` unless the user
   says otherwise.
4. **Update every Modulus dependency together** — `core`,
   `host-tanstack-start`, and `lms-canvas` — to the exact target version, then
   `pnpm install`. Also align the TanStack, React, Vite, and Nitro pins with the
   reference installation (`apps/gradebook/package.json` upstream at the release
   tag) when they changed.
5. **Route files.** Compare `src/routes/` with the reference installation's
   `apps/gradebook/src/routes/` at the release tag. Add new factory route files
   and server routes with the same paths; never move anything under
   `src/routes/routes/`. Leave this installation's `$lng/_public/` pages alone.
6. **Environment.** Add new variables to `.env.example`, to
   `_docker/aws/render-task-definitions.mjs` (environment or secret, per mode),
   and tell the user which ones `.env.local` and the production secret need.
7. **Workarounds.** Check each dependency workaround listed under Things That
   Bite in `AGENTS.md`. Remove those the release fixes — the dependency from
   `package.json` and its entry from `AGENTS.md` — and confirm the build still
   resolves without it.
8. **Database.** Run `pnpm exec modulus db upgrade --env-file .env.local`
   against the local database, then `db status`.
9. **Verify** by following the `verify` skill, including the boot checks in all
   three modes.
10. **Commit** with the `git-commit` skill:
    `chore(deps): upgraded the modulus packages to <version>`. Merge to
    `develop` only when the user agrees.

Deploying the upgrade is a separate step (the `deploy` skill), and the deploy
runs `modulus db upgrade` against production before the new image serves
traffic.
