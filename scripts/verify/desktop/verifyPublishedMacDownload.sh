#!/usr/bin/env bash
set -Eeuo pipefail

URL="${1:-}"
EXPECTED_BASENAME="${2:-Nolo Desktop.app}"
VERIFY_MODE="${VERIFY_MODE:-strict}"

if [[ -z "$URL" ]]; then
  echo "usage: scripts/verify/desktop/verifyPublishedMacDownload.sh <public-mac-url> [expected-app-name]"
  exit 1
fi

case "$URL" in
  *.dmg)
    VERIFY_MODE="$VERIFY_MODE" bash ./scripts/verify/desktop/verifyPublishedMacArtifact.sh \
      "$URL" \
      "$EXPECTED_BASENAME"
    ;;
  *.app.tar.zst)
    if [[ "$(uname -s)" != "Darwin" ]]; then
      echo "[verify-mac-download] This script requires macOS"
      exit 1
    fi

    WORK_DIR="$(mktemp -d /tmp/nolo-mac-download.XXXXXX)"
    cleanup() {
      rm -rf "$WORK_DIR"
    }
    trap cleanup EXIT

    ARTIFACT_DIR="$WORK_DIR/artifacts"
    mkdir -p "$ARTIFACT_DIR"
    ARCHIVE_PATH="$ARTIFACT_DIR/$(basename "$URL")"

    echo "[verify-mac-download] download $URL"
    curl -fL "$URL" -o "$ARCHIVE_PATH"

    VERIFY_MODE="$VERIFY_MODE" VERIFY_REQUIRE_DMG=0 \
      bash ./scripts/verify/desktop/verifyDesktopMacLocalArtifacts.sh "$ARTIFACT_DIR"
    ;;
  *)
    echo "[verify-mac-download] unsupported macOS artifact URL: $URL"
    exit 1
    ;;
esac
