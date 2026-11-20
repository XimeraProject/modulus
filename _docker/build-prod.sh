#!/usr/bin/env bash
# Build the production image from the repository root.
#
#   ./_docker/build-prod.sh                 # native platform
#   DOCKER_PLATFORM=linux/arm64 ./_docker/build-prod.sh   # for ECS (Graviton)
#
# On Apple silicon the native platform is already linux/arm64.
#
# Extra arguments pass through to `docker build` (e.g. --no-cache).
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="$(./_docker/version.sh)"
PLATFORM="${DOCKER_PLATFORM:-linux/$(uname -m | sed 's/x86_64/amd64/')}"
echo "Building osu-modulus:app-$VERSION for $PLATFORM"

docker build \
  "$@" \
  --platform="$PLATFORM" \
  --file _docker/app/production/Dockerfile \
  --build-arg VERSION="$VERSION" \
  --tag "osu-modulus:app-$VERSION" \
  --tag osu-modulus:app-latest \
  .
