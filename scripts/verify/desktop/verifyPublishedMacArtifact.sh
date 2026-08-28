#!/usr/bin/env bash
set -Eeuo pipefail

URL="${1:-}"
EXPECTED_BASENAME="${2:-Nolo Desktop.app}"
VERIFY_MODE="${VERIFY_MODE:-strict}"

if [[ -z "$URL" ]]; then
  echo "usage: scripts/verifyPublishedMacArtifact.sh <public-dmg-url> [expected-app-name]"
  exit 1
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[verify-mac-artifact] This script requires macOS"
  exit 1
fi

WORK_DIR="$(mktemp -d /tmp/nolo-mac-verify.XXXXXX)"
DMG_PATH="$WORK_DIR/artifact.dmg"
MOUNT_DIR="$WORK_DIR/mount"
APP_COPY_DIR="$WORK_DIR/app-copy"
mkdir -p "$MOUNT_DIR" "$APP_COPY_DIR"

cleanup() {
  hdiutil detach "$MOUNT_DIR" -force >/dev/null 2>&1 || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

echo "[verify-mac-artifact] download $URL"
curl -fL "$URL" -o "$DMG_PATH"

VERIFY_MODE="$VERIFY_MODE" bash ./scripts/verify/desktop/verifyMacDmgArtifact.sh "$DMG_PATH"

echo "[verify-mac-artifact] mount dmg"
hdiutil attach "$DMG_PATH" -mountpoint "$MOUNT_DIR" -nobrowse -quiet

APP_PATH="$MOUNT_DIR/$EXPECTED_BASENAME"
if [[ ! -d "$APP_PATH" ]]; then
  echo "[verify-mac-artifact] expected app not found: $APP_PATH"
  ls -la "$MOUNT_DIR"
  exit 1
fi

COPIED_APP="$APP_COPY_DIR/$EXPECTED_BASENAME"
echo "[verify-mac-artifact] copy app out of dmg"
ditto "$APP_PATH" "$COPIED_APP"

VERIFY_MODE="$VERIFY_MODE" bash ./scripts/verify/desktop/verifyMacAppBundle.sh "$COPIED_APP"
