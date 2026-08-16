#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT_DIR"

LEGACY_BASE="${1:-${LEGACY_BASE:-}}"
ARTIFACT_DIR="${2:-${ARTIFACT_DIR:-packages/desktop/artifacts}}"
CHANNEL="${3:-${CHANNEL:-stable}}"

exec bun ./scripts/verify/desktop/verifyLegacyDesktopDownloadAlias.ts \
  "$LEGACY_BASE" \
  "$ARTIFACT_DIR" \
  "$CHANNEL"
