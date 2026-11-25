#!/usr/bin/env bash
# Deploy a pushed image: register both task definitions for it, run the
# database upgrade, then roll the admin and app services.
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
APP_TD="$(register app)"
echo "Registered $ADMIN_TD"
echo "Registered $APP_TD"

"$AWS_DIR/migrate.sh" "$ADMIN_TD"

# Create a service on the first deploy, update it afterwards. The
# osu-modulus stack (osu-modulus.yaml) owns the cluster and target
# groups; the services and their task definitions belong to this script.
#   deploy_service <service> <task-def> <target-group-arn> <min%> <max%>
deploy_service() {
  local status
  status="$(aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$1" \
    --query 'services[0].status' --output text)"
  if [ "$status" = "ACTIVE" ]; then
    aws ecs update-service --cluster "$ECS_CLUSTER" --service "$1" \
      --task-definition "$2" --query 'service.serviceName' --output text
    return
  fi
  if [ -n "${ECS_CAPACITY_PROVIDER:-}" ]; then
    local placement=(--capacity-provider-strategy "capacityProvider=$ECS_CAPACITY_PROVIDER,weight=1")
  else
    local placement=(--launch-type EC2)
  fi
  aws ecs create-service --cluster "$ECS_CLUSTER" --service-name "$1" \
    --task-definition "$2" --desired-count 1 "${placement[@]}" \
    --load-balancers "targetGroupArn=$3,containerName=app,containerPort=8000" \
    --health-check-grace-period-seconds 60 \
    --deployment-configuration "minimumHealthyPercent=$4,maximumPercent=$5,deploymentCircuitBreaker={enable=true,rollback=true}" \
    --placement-strategy type=spread,field=instanceId \
    --query 'service.serviceName' --output text
}

# Admin runs exactly one task: stop the old job runner before starting the
# new one, so two never overlap. The app rolls with no downtime.
deploy_service "$ECS_SERVICE_ADMIN" "$ADMIN_TD" "$TARGET_GROUP_ADMIN_ARN" 0 100
deploy_service "$ECS_SERVICE_APP" "$APP_TD" "$TARGET_GROUP_APP_ARN" 100 200

echo "Waiting for both services to stabilise..."
aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE_ADMIN" "$ECS_SERVICE_APP"
echo "Deployed $TAG."
