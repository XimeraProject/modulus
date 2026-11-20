#!/usr/bin/env bash
# docker compose for running the production image locally (see
# _docker/app/production/docker-compose.yml). Run from the repository root.
#
#   ./_docker/exec-prod.sh up
#   DEPLOYMENT_MODE=admin ./_docker/exec-prod.sh up
set -euo pipefail
cd "$(dirname "$0")/.."
export VERSION="${VERSION:-latest}"
exec docker compose --project-directory . --file ./_docker/app/production/docker-compose.yml --project-name osu-modulus-app "$@"
