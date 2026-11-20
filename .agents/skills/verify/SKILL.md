---
name: verify
description: Use when asked to verify, check, or test a change in this repository, or before reporting a change as complete. Runs lint, typecheck, and the production build, then boots the build and checks the routes in the affected deployment modes. Accepts an optional mode (all-in-one, frontend, admin) or "quick" to skip the boot check.
---

# Verifying a change

This installation has no unit test suite. A change is verified by the checks
below, in order; stop at the first failure and report it.

## 1. Static checks

```sh
pnpm lint:check
pnpm typecheck
```

## 2. Production build

```sh
pnpm build
```

The build regenerates `src/routeTree.gen.ts`. The `[EVAL]` warning from
`gray-matter` is expected. A `failed to resolve import` error from a
`@modulus-learning/*` package usually means that package imports a dependency
it does not declare; add it to this application's `dependencies` as a
workaround, note it in `AGENTS.md` under Things That Bite, and report it as an
upstream bug.

If the argument was `quick`, stop here.

## 3. Boot the Build

Booting needs the local database (`pnpm db:up`) and a filled-in `.env.local`.
Check `pnpm exec modulus db status --env-file .env.local` first; if the schema
is behind, run `db upgrade` with the same flag.

Start the server in the background in each mode the change touches — all three
when unsure — wait for `/routes/elb-status`, check the routes, then stop it:

| Script | Mode | Expect |
|---|---|---|
| `pnpm start` | as `.env.local` (normally `all-in-one`) | public pages, admin, and LTI all served |
| `pnpm start:frontend` | `frontend` | `/`, `/es`, `/docs`, `/sign-in`, `/routes/lti/jwks` → 200; `/admin/sign-in` → 404 |
| `pnpm start:admin` | `admin` | `/admin/sign-in` → 200; `/` redirects; `/routes/lti/jwks` → 404 |

`/routes/elb-status` reports `{"status":"okay","mode":…,"jobs":…}`; confirm the
mode and that `jobs` is `false` for `frontend`. Also request any page the
change touched, and an unknown path (expect 404). Read the server log for
errors before stopping it.

Only one server can hold port 3000; stop each before starting the next.

## 4. The Image, When `_docker/` Changed

```sh
VERSION=local ./_docker/build-prod.sh
VERSION=local ./_docker/exec-prod.sh up -d
```

Repeat the route checks against `http://localhost:8000` (through nginx), then
`./_docker/exec-prod.sh down`.

## Report

List each check that ran with its real result. Never report a check that was
not run, and never describe a skipped check as passing.
