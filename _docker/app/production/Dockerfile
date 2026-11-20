# OSU Modulus application image: nginx (port 8000) in front of the TanStack
# Start / Nitro server (127.0.0.1:3000), both run by supervisord. One image
# serves every deployment mode; DEPLOYMENT_MODE and JOB_QUEUE_ENABLED are read
# from the ECS task definition at runtime.
#
# Build context: the repository root (see _docker/build-prod.sh). Production
# targets linux/arm64 for the Graviton ECS container instances.

# Node LTS on Debian Slim (glibc). Tracks the active LTS line (currently 26.x).
FROM node:lts-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# A system nginx user/group; both processes run as it.
RUN groupadd --system nginx && useradd --system --gid nginx --no-create-home --shell /usr/sbin/nologin nginx

# nginx, supervisord, and netcat (start-nginx.sh waits for Node with it).
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install the pnpm version pinned by packageManager in package.json.
RUN --mount=type=bind,source=package.json,target=/tmp/package.json \
    npm install --global --allow-scripts=pnpm "pnpm@$(node -p "require('/tmp/package.json').packageManager.split('@')[1].split('+')[0]")"

WORKDIR /app

# ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# deps: every dependency, for the build
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# production-deps: runtime dependencies only. The Nitro bundle keeps React,
# pg, pino, argon2, bcrypt and the Google clients external, and the `modulus`
# command (core) runs from here for `db upgrade` tasks.
FROM base AS production-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

# ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# build
FROM base AS build

# A local `vite build` peaks near 2 GB resident; 3 GB of heap leaves headroom.
ENV NODE_OPTIONS="--max-old-space-size=3072"

COPY --from=deps /app/node_modules /app/node_modules
COPY . .

# The client bundle inlines the public VITE_* values from the committed .env;
# .env.local is excluded by .dockerignore and never enters the image. Docs
# markdown under src/content is bundled into .output.
RUN pnpm run build

# ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# final
FROM base

ARG VERSION=dev

LABEL org.opencontainers.image.title="osu-modulus" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.description="Modulus LTI tool, OSU installation."

ENV NODE_ENV=production
# Nitro's graceful close: in-flight HTTP gets 25 s after SIGTERM, inside the
# app's job drain (SHUTDOWN_DRAIN_SECONDS, 70 s) and supervisord's stopwaitsecs
# (80 s). The ECS container stopTimeout must outlast stopwaitsecs.
ENV SERVER_SHUTDOWN_TIMEOUT=25

RUN set -eux; \
  mkdir -p /var/run/nginx-cache; \
  chown -R nginx:nginx /app /run /var/lib/nginx /var/log/nginx /var/run/nginx-cache

COPY _docker/app/nginx/ /etc/nginx/
COPY _docker/app/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

USER nginx
WORKDIR /app

COPY --from=production-deps --chown=nginx:nginx /app/node_modules /app/node_modules
COPY --from=build --chown=nginx:nginx /app/.output /app/.output
COPY --from=build --chown=nginx:nginx /app/email-templates /app/email-templates
COPY --from=build --chown=nginx:nginx /app/package.json /app/package.json

COPY --chown=nginx:nginx _docker/app/start-nginx.sh /app/start-nginx.sh
COPY --chown=nginx:nginx _docker/app/start-node.sh /app/start-node.sh

EXPOSE 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
