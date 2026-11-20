#!/usr/bin/env bash
# Deploy a pushed image: register both task definitions for it, run the
# database upgrade, then roll the admin and frontend services.
#
#   ./_docker/aws/deploy.sh             # deploys app-<git sha>
#   VERSION=abc1234 ./_docker/aws/deploy.sh
set -euo pipefail
. "$(dirname "$0")/lib.sh"
cd "$AWS_DIR/../.."

VERSION="$(./_docker/version.sh)"
case "$VERSION" in *-dirty) echo "Refusing to deploy a -dirty build; commit first." >&2; exit 1 ;; esac
TAG="app-$VERSION"

aws ecr describe-images --repository-name "$ECR_REPOSITORY" --image-ids imageTag="$TAG" >/dev/null \
  || { echo "Image $TAG is not in ECR; run ./_docker/aws/push.sh first." >&2; exit 1; }

node "$AWS_DIR/render-task-definitions.mjs" "$TAG"
register() {
  aws ecs register-task-definition --cli-input-json "file://$AWS_DIR/.rendered/$1.json" \
    --query 'taskDefinition.taskDefinitionArn' --output text
}
ADMIN_TD="$(register admin)"
FRONTEND_TD="$(register frontend)"
echo "Registered $ADMIN_TD"
echo "Registered $FRONTEND_TD"

"$AWS_DIR/migrate.sh" "$ADMIN_TD"

aws ecs update-service --cluster "$ECS_CLUSTER" --service "$ECS_SERVICE_ADMIN" \
  --task-definition "$ADMIN_TD" --query 'service.serviceName' --output text
aws ecs update-service --cluster "$ECS_CLUSTER" --service "$ECS_SERVICE_FRONTEND" \
  --task-definition "$FRONTEND_TD" --query 'service.serviceName' --output text

echo "Waiting for both services to stabilise..."
aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE_ADMIN" "$ECS_SERVICE_FRONTEND"
echo "Deployed $TAG."
