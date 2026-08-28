#!/usr/bin/env bash
set -Eeuo pipefail

APP_PATH="${1:-}"
VERIFY_MODE="${VERIFY_MODE:-strict}"

if [[ -z "$APP_PATH" ]]; then
  echo "usage: scripts/verifyMacAppBundle.sh <app-path>"
  exit 1
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[verify-mac-app] This script requires macOS"
  exit 1
fi

if [[ ! -d "$APP_PATH" ]]; then
  echo "[verify-mac-app] app bundle not found: $APP_PATH"
  exit 1
fi

echo "[verify-mac-app] codesign verify: $APP_PATH"
codesign --verify --deep --strict "$APP_PATH"

if [[ "$VERIFY_MODE" = "codesign-only" ]]; then
  echo "[verify-mac-app] skipping Gatekeeper and stapler checks in codesign-only mode"
  echo "[verify-mac-app] xattr"
  xattr -l "$APP_PATH" || true
  echo "[verify-mac-app] ok"
  exit 0
fi

echo "[verify-mac-app] spctl assess: $APP_PATH"
if ! SPCTL_OUTPUT="$(spctl -a -vv --type exec "$APP_PATH" 2>&1)"; then
  echo "$SPCTL_OUTPUT"
  echo "[verify-mac-app] Gatekeeper rejected app"
  exit 1
fi
echo "$SPCTL_OUTPUT"

echo "[verify-mac-app] stapler validate: $APP_PATH"
xcrun stapler validate -v "$APP_PATH"

echo "[verify-mac-app] xattr"
xattr -l "$APP_PATH" || true

echo "[verify-mac-app] ok"
