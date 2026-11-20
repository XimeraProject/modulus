#!/usr/bin/env bash
# Image version: $VERSION if set, else the short git sha (with -dirty when the
# working tree has uncommitted changes).
if [ -n "${VERSION:-}" ]; then
  echo "$VERSION"
else
  sha="$(git rev-parse --short HEAD)"
  git diff-index --quiet HEAD -- || sha="${sha}-dirty"
  echo "$sha"
fi
