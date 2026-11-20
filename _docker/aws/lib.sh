#!/usr/bin/env bash
# Shared setup for the AWS scripts: load aws.env and export the profile and
# region so every `aws` call targets the OSU account.
set -euo pipefail
AWS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -f "$AWS_DIR/aws.env" ]; then
  echo "Missing $AWS_DIR/aws.env; copy aws.env.example and fill it in." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
. "$AWS_DIR/aws.env"
set +a
export AWS_PROFILE AWS_REGION AWS_PAGER=""
ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# Refuse to run against an account other than the one in aws.env.
actual="$(aws sts get-caller-identity --query Account --output text)"
if [ "$actual" != "$AWS_ACCOUNT_ID" ]; then
  echo "AWS profile '$AWS_PROFILE' is account $actual, expected $AWS_ACCOUNT_ID. Aborting." >&2
  exit 1
fi
