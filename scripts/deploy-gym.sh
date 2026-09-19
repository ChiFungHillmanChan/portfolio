#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/portfolio/public/gym"
DESTINATION='s3://hillmanportfolio1/gym/'
AWS_OPTIONS=(--region eu-west-2 --only-show-errors)
WORKER_OPTIONS=(--config "$ROOT_DIR/infrastructure/cloudflare/gym/wrangler.jsonc")

case "${1:-}" in
  '') ;;
  --dry-run)
    AWS_OPTIONS+=(--dryrun)
    WORKER_OPTIONS+=(--dry-run --outdir "${TMPDIR:-/tmp}/gym-worker-dry-run")
    ;;
  *) echo 'Usage: bash scripts/deploy-gym.sh [--dry-run]' >&2; exit 2 ;;
esac

command -v aws >/dev/null
command -v wrangler >/dev/null
node "$ROOT_DIR/scripts/prepare-gym.mjs"
for file in index.html app.mjs data.mjs data.en.mjs i18n.mjs locale.mjs store.mjs styles.css sw.js manifest.webmanifest manifest.en.webmanifest; do
  if [ ! -s "$SOURCE_DIR/$file" ]; then
    echo "Missing required gym asset: $file" >&2
    exit 1
  fi
done

node --test "$ROOT_DIR/infrastructure/cloudflare/gym/worker.test.mjs"
node --test "$ROOT_DIR"/scripts/tests/gym-*.test.mjs
aws sts get-caller-identity --query Account --output text --region eu-west-2

# Scope every upload to gym/. Never sync/delete the shared bucket root.
# The CRA build also copies public/gym, preserving these assets during normal CI.
aws s3 cp "$SOURCE_DIR/" "$DESTINATION" --recursive \
  --exclude 'index.html' --exclude '*.test.*' --exclude '*.map' --exclude '.DS_Store' \
  --exclude '*.mjs' --exclude '*.js' --exclude '*.webmanifest' \
  --cache-control 'no-cache' "${AWS_OPTIONS[@]}"
aws s3 cp "$SOURCE_DIR/" "$DESTINATION" --recursive \
  --exclude '*' --include '*.mjs' --include '*.js' --exclude '*.test.*' \
  --content-type 'application/javascript; charset=utf-8' \
  --cache-control 'no-cache' "${AWS_OPTIONS[@]}"
aws s3 cp "$SOURCE_DIR/" "$DESTINATION" --recursive --exclude '*' --include '*.webmanifest' \
  --content-type 'application/manifest+json; charset=utf-8' \
  --cache-control 'no-cache' "${AWS_OPTIONS[@]}"
aws s3 cp "$SOURCE_DIR/index.html" "${DESTINATION}index.html" \
  --content-type 'text/html; charset=utf-8' \
  --cache-control 'no-cache' "${AWS_OPTIONS[@]}"

export WRANGLER_LOG_PATH="${WRANGLER_LOG_PATH:-${TMPDIR:-/tmp}/gym-wrangler.log}"
wrangler deploy "${WORKER_OPTIONS[@]}"
