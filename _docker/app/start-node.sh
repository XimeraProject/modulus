#!/bin/sh

# Starts the Nitro server (TanStack Start). supervisord runs this and forwards
# TERM to Node, which drains background jobs and in-flight requests before
# exiting.

echo "\n==> Starting Node.js...."

set -ex

# --max-old-space-size: size it to the task's memory. 704 suits a 1 GB task;
# raise NODE_MAX_OLD_SPACE_SIZE in the task definition for larger tasks.
cd /app
NODE_ENV=production \
PORT=3000 \
HOST=127.0.0.1 \
exec node --max-old-space-size="${NODE_MAX_OLD_SPACE_SIZE:-704}" .output/server/index.mjs
