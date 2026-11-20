#!/usr/bin/env bash
# Tag the locally built image for ECR and push it.
#
#   ./_docker/aws/push.sh            # pushes app-<git sha>
set -euo pipefail
. "$(dirname "$0")/lib.sh"
cd "$AWS_DIR/../.."

VERSION="$(./_docker/version.sh)"
case "$VERSION" in *-dirty) echo "Refusing to push a -dirty build; commit first." >&2; exit 1 ;; esac
TAG="app-$VERSION"

# The container instances are Graviton (arm64).
ARCH="$(docker image inspect --format '{{.Architecture}}' "osu-modulus:$TAG")"
if [ "$ARCH" != "arm64" ]; then
  echo "osu-modulus:$TAG is $ARCH; the ECS instances are arm64. Rebuild with DOCKER_PLATFORM=linux/arm64." >&2
  exit 1
fi

aws ecr get-login-password | docker login --username AWS --password-stdin "$ECR_REGISTRY"
docker tag "osu-modulus:$TAG" "$ECR_REGISTRY/$ECR_REPOSITORY:$TAG"
docker push "$ECR_REGISTRY/$ECR_REPOSITORY:$TAG"
echo "Pushed $ECR_REGISTRY/$ECR_REPOSITORY:$TAG"
