#!/usr/bin/env bash
# docker compose wrapper for the OSU local database; run from any directory.
#   ./postgres/postgres.sh up -d
#   ./postgres/postgres.sh --profile adminer up -d   # Adminer on http://localhost:9001
cd "$(dirname "$0")"
mkdir -p data
exec docker compose --project-directory . --file ./docker-compose.yml --project-name osu-modulus-postgres "$@"
