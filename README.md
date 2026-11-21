# Modulus at OSU

The Ohio State University installation of [Modulus](https://modulus-learning.org/),
the LTI 1.3 tool that connects Canvas (Carmen) to Ximera activities. Instrumented
activity pages report progress to Modulus, which passes scores back to Canvas
over LTI Assignment and Grade Services.

This repository is a [TanStack Start](https://tanstack.com/start) application
built from the published Modulus packages. It owns this installation's
configuration, public pages and their content, branding, and deployment; the
product itself (admin and learner UI, LTI, agent endpoints, data access) comes
from the packages.

| Package | Role here |
| --- | --- |
| `@modulus-learning/core` | Business logic, data access, and the `modulus` command (database, admins, keys). |
| `@modulus-learning/host-tanstack-start` | Route factories, server functions, UI, entry helpers, Vite preset, styles. |
| `@modulus-learning/lms-canvas` | The Canvas adapter, passed to core in `src/server.ts`. |

The Modulus packages release in lockstep: keep every `@modulus-learning/*`
dependency on the same version.

## Requirements

- Node `^22.18.0 || ^24.11.0 || >=26.0.0` and pnpm 12 (pinned by `packageManager`).
- Docker, for the local PostgreSQL 18 database.

## Local Development

```sh
pnpm install
cp .env.example .env.local          # then fill in the secrets
pnpm db:up                          # PostgreSQL 18 on 5432, database osu_modulus_dev
pnpm exec modulus db init --env-file .env.local
pnpm exec modulus admin create --env-file .env.local --email you@example.org --given-name You
pnpm dev                            # http://localhost:3000
```

`pnpm exec modulus keys generate` prints a fresh set of JWT, LTI, and session
keys for `.env.local`. Keep production keys stable once Canvas is registered:
the LMS holds the LTI key ID and public key.

The database runs from `postgres/docker-compose.yml`. `./postgres/postgres.sh
--profile adminer up -d` adds Adminer on http://localhost:9001. Data lives in
`postgres/data/` (gitignored).

### Testing LTI Launches Locally

Canvas will not launch against plain HTTP. `pnpm devlti` serves HTTPS on
`modulus.infonomic.local`; it needs `certs/local.key` and `certs/local.crt`
(gitignored) and a matching `/etc/hosts` entry.

## Configuration

| File | Holds | Committed |
| --- | --- | --- |
| `.env` | Public `VITE_*` values, inlined into the client bundle at build time. | Yes; never put a secret here. |
| `.env.local` | Secrets and local overrides. | No. |
| `.env.example` | The template for `.env.local`. | Yes. |

The server reads its configuration at runtime and fails at boot, naming the
setting, when one is missing.

### Deployment Modes

One build serves three modes, selected by `DEPLOYMENT_MODE`:

| Mode | Serves | Background jobs |
| --- | --- | --- |
| `all-in-one` | Learner, LTI, and admin surfaces. | Per `JOB_QUEUE_ENABLED`. |
| `frontend` | Learner and LTI surfaces; admin returns 404. | Never (`JOB_QUEUE_ENABLED=false` is required). |
| `admin` | Admin surface; learner and LTI return 404. | Yes. Run one instance. |

```sh
pnpm build
pnpm start              # mode from .env.local
pnpm start:frontend
pnpm start:admin
```

Every mode answers `GET /routes/elb-status` with its mode and whether jobs run.

## Project Layout

| Path | What it is |
| --- | --- |
| `src/server.ts`, `src/start.ts`, `src/router.tsx` | Entry files; each is one call into the host package. |
| `src/routes/` | One file per route, each calling a packaged factory. Keep the paths under `src/routes/routes/` fixed: Canvas registrations and activity pages call those URLs. |
| `src/routes/$lng/_public/` | This installation's public pages (home, about, accessibility, and the legal pages). |
| `src/modules/` | The markdown pages registry and renderer (`pages/`). |
| `src/ui/` | Site-wide page furniture and chrome: the hero, branding, and site footer under `src/ui/components/`. |
| `src/ui/styles/` | The stylesheet entry, `global.css`: the package CSS, the OSU public theme, overrides, the single Tailwind entry, and OSU component CSS. OSU rules are layered and scoped to public pages, so the dashboard and admin keep the Modulus defaults. |
| `tests/css/` | The CSS layer guard. |
| `src/content/pages/` | Root-level pages (`/about`, `/accessibility`, `/privacy-policy`, `/terms-of-use`, `/cookies`). The filename is the path; front matter needs a `title`. |
| `public/` | Favicons, fonts, and static assets. |
| `email-templates/` | Transactional email templates. |
| `postgres/` | The local database. |
| `_docker/` | The production image and the AWS ECS deploy scripts. |

Routes are localised under `$lng`: English URLs have no prefix and Spanish
URLs start with `/es`. The locale set comes from the host package.

## Deployment

Production runs on AWS ECS (EC2 launch type, Graviton) as two services from
one image: `frontend` for learners and LTI, `admin` for administration and the
background jobs. See [`_docker/README.md`](_docker/README.md) for the image,
running it locally, and the build, push, migrate, and deploy scripts.

## Upgrading Modulus

1. Change every `@modulus-learning/*` dependency to the new version, together,
   and run `pnpm install`.
2. Read the release notes for breaking changes and migrations, and copy any new
   route files from the reference installation.
3. Build and test locally against `pnpm exec modulus db upgrade --env-file .env.local`.
4. Deploy. The deploy script runs `modulus db upgrade` before the new image
   serves traffic.

If a release fixes a dependency workaround listed in `AGENTS.md`, remove it as
part of the upgrade.

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` / `pnpm devlti` | Development server on port 3000 (HTTP / HTTPS). |
| `pnpm build` | Production build into `.output/`. |
| `pnpm start`, `start:frontend`, `start:admin` | Serve the build with `.env` and `.env.local`. |
| `pnpm typecheck` | TypeScript, no emit. |
| `pnpm lint` / `pnpm lint:check` | Biome with safe fixes / read-only. |
| `pnpm test:css` / `pnpm test:css-build` | The CSS layer guard, on the source stylesheets / on the built CSS after `pnpm build`. |
| `pnpm db:up` / `pnpm db:down` | Start or stop the local database. |
| `pnpm exec modulus <command>` | The Modulus CLI: `db`, `admin create`, `keys generate`. |

## Privacy

Activities receive an opaque user ID, a display name, the activity context, and
normalised scores; no learner PII crosses into them. Never commit learner or
instructor data, LTI client or deployment IDs, keys, tokens, or AWS account
details.
