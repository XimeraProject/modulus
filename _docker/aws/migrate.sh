#!/usr/bin/env bash
# Apply unapplied release scripts with `modulus db upgrade`, as a one-off
# task from the admin task definition (same image, same secrets), and
# wait for it. Run it before the new image serves traffic: an enforcing build
# refuses to start against a database missing a release script it ships.
#
#   ./_docker/aws/migrate.sh [task-definition-arn]   # default: latest admin revision
set -euo pipefail
. "$(dirname "$0")/lib.sh"

TASK_DEF="${1:-$TASK_FAMILY_ADMIN}"
echo "Running db upgrade from $TASK_DEF"

if [ -n "${ECS_CAPACITY_PROVIDER:-}" ]; then
  PLACEMENT=(--capacity-provider-strategy "capacityProvider=$ECS_CAPACITY_PROVIDER")
else
  PLACEMENT=(--launch-type EC2)
fi

TASK_ARN="$(aws ecs run-task \
  --cluster "$ECS_CLUSTER" \
  "${PLACEMENT[@]}" \
  --task-definition "$TASK_DEF" \
  --overrides '{"containerOverrides":[{"name":"app","command":["node","/app/node_modules/@modulus-learning/core/dist/cli/index.js","db","upgrade"]}]}' \
  --query 'tasks[0].taskArn' --output text)"
echo "Task $TASK_ARN"

aws ecs wait tasks-stopped --cluster "$ECS_CLUSTER" --tasks "$TASK_ARN"
EXIT_CODE="$(aws ecs describe-tasks --cluster "$ECS_CLUSTER" --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' --output text)"
if [ "$EXIT_CODE" != "0" ]; then
  echo "db upgrade failed (exit $EXIT_CODE); see the /ecs/$TASK_FAMILY_ADMIN log group." >&2
  exit 1
fi
echo "db upgrade complete."
