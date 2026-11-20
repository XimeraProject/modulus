# AGENTS.md

The shared repository guide for every coding agent. `CLAUDE.md` imports this
file, so Claude Code and agents that read `AGENTS.md` see the same facts. Put
repository rules here; keep only Claude-specific details in `CLAUDE.md`.

## What This Is

The Ohio State University installation of Modulus, an **LTI 1.3 tool** that
connects Canvas ("Carmen") to Ximera, OSU's open interactive-textbook platform.
Ximera activity pages instrumented with the Modulus agent report normalized
progress here, and Modulus passes scores to Canvas over LTI Assignment and
Grade Services (AGS).

This repository is a TanStack Start application built from the **published**
Modulus packages. It owns configuration, public pages, docs content, branding,
and deployment. The product itself — admin and learner UI, LTI and agent
endpoints, data access — comes from the packages, whose source lives in
[Modulus-Learning/app.modulus-learning.org](https://github.com/Modulus-Learning/app.modulus-learning.org).
A bug in packaged behaviour is fixed there and arrives here with an upgrade;
do not patch around it locally without saying so.

A hard constraint runs through the design: **no learner PII crosses the
boundary into activities.** Activities receive an opaque user UUID, a display
name, the activity context, and normalized scores — never an email,
institutional student ID, or LMS gradebook data.

## Repo Map

A single pnpm package (not a monorepo). Node 26 locally, pnpm 12 (pinned by
`packageManager`), TypeScript 7.

| Path | What it is |
|---|---|
| `src/server.ts`, `src/start.ts`, `src/router.tsx`, `src/client.tsx` | Entry files; each is one call into `@modulus-learning/host-tanstack-start`. |
| `src/routes/` | One file per route, each calling a packaged route factory, plus literal `createFileRoute` server routes under `src/routes/routes/`. |
| `src/routes/$lng/_public/` | This installation's public pages: home, about, docs. |
| `src/modules/` | Feature modules: the docs renderer (`docs/`) and the markdown pages registry (`pages/`). |
| `src/ui/` | Site-wide page furniture and chrome (`src/ui/components/`, `src/ui/styles/`, …): the home hero, branding, and the local site footer. |
| `src/ui/styles/` | The stylesheet entry: `global.css`, imported by `src/routes/__root.tsx`, composes the package CSS, the OSU public theme (`theme-public.css`), `overrides.css`, the single Tailwind entry (`tailwind.css`) and OSU component CSS (`app.css`). |
| `tests/css/` | The CSS layer guard (`node:test`), the repository's only tests. |
| `src/content/pages/` | Markdown for the root-level pages (`/about`, `/privacy-policy`, `/terms-of-use`, `/cookies`). |
| `src/content/docs/` | Installation docs, rendered at `/docs`. |
| `public/`, `email-templates/` | Static assets and transactional email templates. |
| `postgres/` | Local PostgreSQL 18 via docker compose. |
| `_docker/` | The production image (nginx + Node under supervisord) and the AWS ECS deploy scripts. `_docker/README.md` explains both. |

| Package | Used for |
|---|---|
| `@modulus-learning/core` | Business logic, data access, and the `modulus` command (`db`, `admin create`, `keys generate`). |
| `@modulus-learning/host-tanstack-start` | Route factories, gated server functions, UI, entry helpers, Vite preset, styles. |
| `@modulus-learning/lms-canvas` | The Canvas adapter, `canvasAdapter()`, passed to core in `src/server.ts`. |

## Running Locally

```sh
pnpm install
cp .env.example .env.local            # fill in secrets
pnpm db:up                            # PostgreSQL 18 on 5432, database osu_modulus_dev
pnpm exec modulus db init --env-file .env.local
pnpm exec modulus admin create --env-file .env.local --email <address> --given-name <name>
pnpm dev                              # http://localhost:3000
```

`.env` is committed and holds only public `VITE_*` values, which Vite inlines
into the client bundle. Everything secret goes in the gitignored `.env.local`;
never add a secret to `.env`. `pnpm start` serves the built `.output/` with
`.env` and then `.env.local` loaded.

For LTI work use `pnpm devlti`, which serves HTTPS on `modulus.infonomic.local`
— Canvas will not launch against plain HTTP. It needs `certs/local.key` and
`certs/local.crt` (gitignored) and an `/etc/hosts` entry.

## Commands

```sh
pnpm dev            pnpm build          pnpm typecheck
pnpm lint           pnpm lint:check     pnpm start[:frontend|:admin]
pnpm db:up          pnpm db:down        pnpm exec modulus <command>
pnpm test:css       pnpm test:css-build
```

`pnpm lint` runs Biome with `--write` (safe fixes only, never `--unsafe`), so it
**modifies files**; `pnpm lint:check` is read-only. The only tests are the CSS
layer guard: `pnpm test:css` checks the stylesheets under `src/`, and
`pnpm test:css-build` checks the built CSS after `pnpm build`. Verification is
lint, typecheck, the guard, build, and booting the build (the `verify` skill).

## Conventions

- **Conventional commits**, lowercase, past tense: `feat(docs): added …`. The
  full reference is `.agents/rules/conventional-commits.md`.
- **No commit trailers of any kind.** No `Co-Authored-By`, no AI attribution,
  no `Signed-off-by` — don't pass `-s`. The same applies to PR descriptions: no
  AI attribution footer.
- **`develop` is the integration branch; `main` is production.** Routine work
  is committed on `develop`, or on a local feature branch merged back into
  `develop`; `main` advances only when a tested `develop` is promoted for
  deployment. Feature branches are named `<type>/<short-slug>` (e.g.
  `feat/osu-branding`).
- **Pull requests are for review, not routine.** Open one on
  `XimeraProject/modulus` against `develop` only when asked — typically for
  another contributor's work or a change that needs OSU input. Do not turn a
  commit or merge request into a PR.
- **Deployment and production changes require explicit authorisation.** This
  includes pushing images to ECR, registering task definitions, running the
  database upgrade task, updating ECS services, and changing production data.
  Existing explicit authorisation in the conversation counts; do not ask again
  for the same agreed action. Otherwise prepare the concrete change and ask
  before executing it.
- **Biome** handles lint and format for JS/TS/JSON/CSS; Markdown is not
  formatted by it.
- **Licensing.** The Modulus packages are MPL-2.0. This repository has no
  licence file yet; ask before adding one.

## Things That Bite

- **The Modulus packages release in lockstep.** Keep every
  `@modulus-learning/*` dependency on one version and upgrade them together
  (the `upgrade-modulus` skill).
- **Route paths under `src/routes/routes/` are fixed.** Canvas registrations
  store the LTI URLs (`/routes/lti/login`, `/routes/lti/launch`,
  `/routes/lti/jwks`, …) and activity pages call `/routes/agent/*`. Moving one
  breaks every registration or agent that points at it.
- **Server routes keep a literal `createFileRoute`.** TanStack Start strips
  server handlers from the browser bundle only when they appear in the route
  file's own `createFileRoute` call. Page routes call packaged factories.
- **Every server function's first middleware is a gate.** Server functions run
  at opaque `/_serverFn/<id>` URLs that the path-based mode gate cannot
  classify, so each installation `createServerFn(...)` (for example
  `src/modules/docs/docs.ts`) starts with a gate middleware from
  `@modulus-learning/host-tanstack-start/lib/server-fn`. Start's compiler only
  recognises a literal `createServerFn(...).handler(...)`; keep server-only
  imports in `*.server.ts` modules loaded with a dynamic `import()`.
- **`DEPLOYMENT_MODE`** selects `all-in-one` (default), `frontend`, or `admin`.
  A `frontend` instance must never run background jobs — config validation
  rejects `DEPLOYMENT_MODE=frontend` with `JOB_QUEUE_ENABLED=true`. Run exactly
  one `admin` instance, so two job runners never overlap.
- **The health check is `/routes/elb-status`**, not `/elb-status`.
- **Production is AWS ECS on Graviton EC2 (arm64), not Fargate and not Fly.io.**
  Images must be `linux/arm64`; `_docker/aws/push.sh` refuses anything else.
- **Dependency workarounds are listed here.** When a packaged module imports a
  dependency it does not declare, the build fails with `failed to resolve
  import`; add the dependency to this application as a workaround, list it here
  with the version that needs it, and remove it once a release fixes it. At
  0.13.0 one is needed, in dev only: `vite.config.ts` pre-bundles the host
  package's client dependencies (`optimizeDeps.include`), because Start keeps
  the host package out of pre-bundling and pnpm does not hoist its
  dependencies, so CommonJS beneath them (`use-sync-external-store`,
  `classnames`) fails in the browser with "does not provide an export named …"
  (first seen as the admin area failing to load after sign-in). Upstream:
  Modulus-Learning/app.modulus-learning.org#16.
- **OSU CSS must never reach the packaged areas.** Brand tokens and restyles go
  in `@layer overrides`, OSU component CSS in `@layer components`, both inside
  `@scope (:root[data-theme-context="public"])`; inside a scope write `:scope`
  and `:scope.dark`, never `:root`, `html` or `.dark`. Nothing may reach the
  `protected` (dashboard, admin) or `integration` (LTI, agent) contexts, and no
  rule is unlayered or `!important`. `pnpm test:css` enforces all of it. A
  top-level `@theme` in `src/ui/styles/tailwind.css` may only add names, after
  the package import.
- **The locale set (`en`, `es`) is fixed by the host package.** English URLs
  have no prefix; Spanish ones start with `/es`.
- **Port 5432 is shared** with the Modulus monorepo's local database; stop one
  before starting the other.
- **This repository is public.** OSU, Canvas, Carmen, and Ximera are named
  openly and are not secrets. Never commit or publish learner or instructor
  PII, LTI client or deployment IDs, keys or tokens, AWS account IDs or ARNs,
  internal OSU hostnames, or unannounced institutional plans — in code, commit
  messages, PR text, or docs. AWS identifiers belong in the gitignored
  `_docker/aws/aws.env`.

## Where to Look

| Question | Read |
|---|---|
| How do I run and configure this installation? | `README.md` |
| How is the image built and deployed? | `_docker/README.md` |
| Which variables does each deployment mode need? | `_docker/aws/render-task-definitions.mjs`; upstream `packages/host-tanstack-start/src/config/fixtures/mode-env.ts` |
| How do the packages, LTI, agent, and privacy model work? | The upstream `docs/` in Modulus-Learning/app.modulus-learning.org |

## Agent Workflows

Reusable workflows live in `.agents/skills/`. Before performing one of these
tasks, read the matching `SKILL.md` completely and follow it:

| Task | Skill |
|---|---|
| Commit changes | `.agents/skills/git-commit/SKILL.md` |
| Push commits | `.agents/skills/git-push/SKILL.md` |
| Create or update a PR | `.agents/skills/github-pr/SKILL.md` |
| Apply lint fixes | `.agents/skills/lint-fix/SKILL.md` |
| Run type checking | `.agents/skills/typecheck/SKILL.md` |
| Verify a change (lint, types, build, boot) | `.agents/skills/verify/SKILL.md` |
| Write or revise installation docs | `.agents/skills/writing-docs/SKILL.md` |
| Upgrade the Modulus packages | `.agents/skills/upgrade-modulus/SKILL.md` |
| Deploy to AWS ECS | `.agents/skills/deploy/SKILL.md` |

These skills are the canonical workflow bodies for every agent. Claude Code's
entry points under `.claude/` delegate to them; `CLAUDE.md` maps the commands.
