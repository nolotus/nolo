#!/usr/bin/env bash
set -Eeuo pipefail

DMG_PATH="${1:-}"
VERIFY_MODE="${VERIFY_MODE:-strict}"

if [[ -z "$DMG_PATH" ]]; then
  echo "usage: scripts/verifyMacDmgArtifact.sh <dmg-path>"
  exit 1
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[verify-mac-dmg] This script requires macOS"
  exit 1
fi

if [[ ! -f "$DMG_PATH" ]]; then
  echo "[verify-mac-dmg] dmg not found: $DMG_PATH"
  exit 1
fi

echo "[verify-mac-dmg] codesign verify: $DMG_PATH"
codesign --verify --verbose=2 "$DMG_PATH"

if [[ "$VERIFY_MODE" = "codesign-only" ]]; then
  echo "[verify-mac-dmg] skipping Gatekeeper and stapler checks in codesign-only mode"
  echo "[verify-mac-dmg] ok"
  exit 0
fi

echo "[verify-mac-dmg] spctl assess: $DMG_PATH"
if ! SPCTL_OUTPUT="$(
  spctl -a -vv --type open --context context:primary-signature "$DMG_PATH" 2>&1
)"; then
  echo "$SPCTL_OUTPUT"
  echo "[verify-mac-dmg] Gatekeeper rejected dmg"
  exit 1
fi
echo "$SPCTL_OUTPUT"

echo "[verify-mac-dmg] stapler validate: $DMG_PATH"
xcrun stapler validate -v "$DMG_PATH"

echo "[verify-mac-dmg] ok"
