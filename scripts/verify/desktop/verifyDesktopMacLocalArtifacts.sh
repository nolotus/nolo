#!/usr/bin/env bash
set -Eeuo pipefail

ARTIFACT_DIR="${1:-packages/desktop/artifacts}"
VERIFY_MODE="${VERIFY_MODE:-codesign-only}"
VERIFY_REQUIRE_DMG="${VERIFY_REQUIRE_DMG:-1}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[verify-local-mac-artifacts] This script requires macOS"
  exit 1
fi

if [[ ! -d "$ARTIFACT_DIR" ]]; then
  echo "[verify-local-mac-artifacts] artifact dir not found: $ARTIFACT_DIR"
  exit 1
fi

shopt -s nullglob
TARBALLS=("$ARTIFACT_DIR"/*.app.tar.zst)
DMGS=("$ARTIFACT_DIR"/*.dmg)

if [[ ${#TARBALLS[@]} -eq 0 ]]; then
  echo "[verify-local-mac-artifacts] no standalone .app.tar.zst artifacts found in $ARTIFACT_DIR"
  exit 1
fi

if [[ "$VERIFY_REQUIRE_DMG" = "1" && ${#DMGS[@]} -eq 0 ]]; then
  echo "[verify-local-mac-artifacts] no .dmg artifacts found in $ARTIFACT_DIR"
  exit 1
fi

WORK_DIR="$(mktemp -d /tmp/nolo-local-mac-artifacts.XXXXXX)"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

for tarball in "${TARBALLS[@]}"; do
  echo "[verify-local-mac-artifacts] verify $(basename "$tarball")"

  if ! tar --zstd -tf "$tarball" | grep -q 'Contents/_CodeSignature/CodeResources$'; then
    echo "[verify-local-mac-artifacts] missing CodeResources inside $(basename "$tarball")"
    exit 1
  fi

  if ! tar --zstd -tf "$tarball" | grep -q 'Contents/Resources/AppIcon.icns$'; then
    echo "[verify-local-mac-artifacts] missing AppIcon.icns inside $(basename "$tarball")"
    exit 1
  fi

  EXTRACT_DIR="$WORK_DIR/$(basename "$tarball" .tar.zst)"
  mkdir -p "$EXTRACT_DIR"
  tar --zstd -xf "$tarball" -C "$EXTRACT_DIR"

  APP_PATH="$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 -type d -name '*.app' | head -n 1)"
  if [[ -z "$APP_PATH" ]]; then
    echo "[verify-local-mac-artifacts] no .app bundle found after extracting $(basename "$tarball")"
    exit 1
  fi

  if [[ ! -x "$APP_PATH/Contents/MacOS/launcher" ]]; then
    echo "[verify-local-mac-artifacts] extracted app is missing executable launcher: $APP_PATH"
    exit 1
  fi

  if [[ ! -f "$APP_PATH/Contents/Resources/main.js" ]]; then
    echo "[verify-local-mac-artifacts] extracted app is missing flat Resources/main.js: $APP_PATH"
    exit 1
  fi

  if find "$APP_PATH/Contents/Resources" -maxdepth 1 -name '*.tar.zst' | grep -q .; then
    echo "[verify-local-mac-artifacts] extracted app still contains a wrapper self-extraction tarball: $APP_PATH"
    exit 1
  fi

  VERIFY_MODE="$VERIFY_MODE" bash ./scripts/verify/desktop/verifyMacAppBundle.sh "$APP_PATH"
done

for dmg in "${DMGS[@]}"; do
  echo "[verify-local-mac-artifacts] verify $(basename "$dmg")"
  VERIFY_MODE="$VERIFY_MODE" bash ./scripts/verify/desktop/verifyMacDmgArtifact.sh "$dmg"

  MOUNT_DIR="$WORK_DIR/mount-$(basename "$dmg" .dmg)"
  COPY_DIR="$WORK_DIR/copy-$(basename "$dmg" .dmg)"
  mkdir -p "$MOUNT_DIR" "$COPY_DIR"

  hdiutil attach "$dmg" -mountpoint "$MOUNT_DIR" -nobrowse -quiet
  APP_PATH="$(find "$MOUNT_DIR" -mindepth 1 -maxdepth 1 -type d -name '*.app' | head -n 1)"
  if [[ -z "$APP_PATH" ]]; then
    echo "[verify-local-mac-artifacts] no .app bundle found inside $(basename "$dmg")"
    hdiutil detach "$MOUNT_DIR" -force >/dev/null 2>&1 || true
    exit 1
  fi

  COPIED_APP="$COPY_DIR/$(basename "$APP_PATH")"
  ditto "$APP_PATH" "$COPIED_APP"
  hdiutil detach "$MOUNT_DIR" -force >/dev/null 2>&1 || true

  VERIFY_MODE="$VERIFY_MODE" bash ./scripts/verify/desktop/verifyMacAppBundle.sh "$COPIED_APP"
done

echo "[verify-local-mac-artifacts] ok"
