#!/usr/bin/env bash
# Verify a Linux desktop artifact produced by `bun run desktop:build:stable`
# (or `desktop:build:alpha` / `desktop:build:local`).
#
# Usage:
#   scripts/verify/desktop/verifyLinuxDesktopArtifact.sh [artifact-path ...]
#
# With no arguments, the script scans packages/desktop/artifacts/ for
# *.deb / *.tar.zst / *.AppImage and verifies every match (umbrella mode).
# With explicit paths, each path is verified in turn; a glob like
# `packages/desktop/artifacts/*-linux-x64-*.tar.zst` expands to multiple
# paths and is handled the same way.
#
# Modes (auto-detected from file extension):
#   .deb        — extract with `dpkg-deb -x`, assert DEBIAN/control + postinst/postrm,
#                 nolo-desktop.desktop, /usr/bin/nolo-desktop symlink,
#                 /opt/nolo-desktop/bin/launcher, hicolor icon.
#   .tar.zst    — extract with `tar --zstd`, assert bin/launcher exists.
#   .AppImage   — file-exists + size sanity (no FUSE mount in CI).
#
# This is the Linux analogue of `verifyMacDmgArtifact.sh`. It runs on Linux
# only; on other platforms it bails with a clear message.

set -Eeuo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "[verify-linux-desktop] This script requires Linux (uname=$(uname -s))"
  exit 1
fi

log() {
  printf '[verify-linux-desktop] %s\n' "$*"
}

fail() {
  echo "[verify-linux-desktop] FAIL: $*" >&2
  exit 1
}

require_tool() {
  local tool="$1"
  if ! command -v "$tool" >/dev/null 2>&1; then
    fail "required tool not on PATH: $tool"
  fi
}

# Find a file under a tree, with a 1-line error if missing.
require_file() {
  local tree="$1"
  local rel="$2"
  local full="$tree/$rel"
  if [[ ! -e "$full" ]]; then
    fail "expected path not present in artifact: $rel"
  fi
  printf '%s\n' "$full"
}

verify_one() {
  local ARTIFACT_PATH="$1"
  local WORK_DIR=""

  if [[ ! -f "$ARTIFACT_PATH" ]]; then
    fail "artifact not found: $ARTIFACT_PATH"
  fi

  # Per-call cleanup: verify_one runs in a loop (glob / umbrella modes), so a
  # persistent EXIT trap would leak every prior WORK_DIR. Re-arm on each call
  # and disarm on the success path; fail() exits, where the trap still fires.
  cleanup_workdir() {
    if [[ -n "$WORK_DIR" && -d "$WORK_DIR" ]]; then
      rm -rf "$WORK_DIR"
    fi
  }
  trap cleanup_workdir EXIT

  case "$ARTIFACT_PATH" in
  *.deb)
    require_tool dpkg-deb
    log "verifying Debian package: $ARTIFACT_PATH"
    WORK_DIR="$(mktemp -d -t nolo-verify-deb-XXXXXX)"
    local dpkg_x_err=""
    if ! dpkg_x_err="$(dpkg-deb -x "$ARTIFACT_PATH" "$WORK_DIR/root" 2>&1 >/dev/null)"; then
      fail "dpkg-deb -x failed: $dpkg_x_err"
    fi
    local dpkg_e_err=""
    if ! dpkg_e_err="$(dpkg-deb -e "$ARTIFACT_PATH" "$WORK_DIR/ctrl" 2>&1 >/dev/null)"; then
      fail "dpkg-deb -e failed: $dpkg_e_err"
    fi

    require_file "$WORK_DIR/ctrl" control >/dev/null
    log "DEBIAN/control present"

    if ! grep -q '^Package: nolo-desktop' "$WORK_DIR/ctrl/control"; then
      fail "DEBIAN/control does not declare Package: nolo-desktop"
    fi
    if ! grep -q '^Architecture:' "$WORK_DIR/ctrl/control"; then
      fail "DEBIAN/control does not declare Architecture"
    fi
    log "DEBIAN/control header ok"

    LAUNCHER_PATH="$(require_file "$WORK_DIR/root" "opt/nolo-desktop/bin/launcher")"
    if [[ ! -x "$LAUNCHER_PATH" ]]; then
      fail "launcher is not executable: $LAUNCHER_PATH"
    fi
    log "launcher is executable"

    DESKTOP_PATH="$(require_file "$WORK_DIR/root" "usr/share/applications/nolo-desktop.desktop")"
    if ! grep -q '^\[Desktop Entry\]' "$DESKTOP_PATH"; then
      fail "nolo-desktop.desktop missing [Desktop Entry] header"
    fi
    if ! grep -q '^Exec=' "$DESKTOP_PATH"; then
      fail "nolo-desktop.desktop missing Exec= key"
    fi
    if ! grep -q '^Icon=nolo-desktop' "$DESKTOP_PATH"; then
      fail "nolo-desktop.desktop missing Icon=nolo-desktop key"
    fi
    log ".desktop file well-formed"

    BIN_SYMLINK="$(require_file "$WORK_DIR/root" "usr/bin/nolo-desktop")"
    if [[ -L "$BIN_SYMLINK" ]]; then
      TARGET="$(readlink "$BIN_SYMLINK")"
      if [[ "$TARGET" != "/opt/nolo-desktop/bin/launcher" ]]; then
        fail "/usr/bin/nolo-desktop symlink target is '$TARGET', expected /opt/nolo-desktop/bin/launcher"
      fi
      log "/usr/bin/nolo-desktop -> $TARGET"
    else
      fail "/usr/bin/nolo-desktop should be a symlink"
    fi

    # Icon contract: post-package-linux.ts copies Resources/appIcon.png from
    # the tarball into the DEB when present, and the electrobun payload always
    # ships it. Asserting it here keeps packaging and verification in sync;
    # if the icon ever becomes optional upstream, relax this to a warning.
    ICON_PATH="$(require_file "$WORK_DIR/root" "usr/share/icons/hicolor/512x512/apps/nolo-desktop.png")"
    ICON_SIZE="$(stat -c '%s' "$ICON_PATH" 2>/dev/null || stat -f '%z' "$ICON_PATH" 2>/dev/null || echo 0)"
    if [[ "$ICON_SIZE" -lt 1024 ]]; then
      fail "icon is too small (${ICON_SIZE} bytes) — install path may be wrong"
    fi
    log "icon present (${ICON_SIZE} bytes)"

    # postinst / postrm sanity (do not execute them). post-package-linux.ts
    # emits postinst + postrm (no prerm); keep this aligned with the packager.
    if [[ -f "$WORK_DIR/ctrl/postinst" ]]; then
      if ! head -1 "$WORK_DIR/ctrl/postinst" | grep -q '^#!'; then
        fail "postinst has no shebang"
      fi
      log "postinst has shebang"
    else
      fail "DEBIAN postinst script missing"
    fi
    if [[ -f "$WORK_DIR/ctrl/postrm" ]]; then
      if ! head -1 "$WORK_DIR/ctrl/postrm" | grep -q '^#!'; then
        fail "postrm has no shebang"
      fi
      log "postrm has shebang"
    else
      fail "DEBIAN postrm script missing"
    fi

    log "ok — .deb artifact verified"
    trap - EXIT
    cleanup_workdir
    ;;

  *.tar.zst)
    require_tool tar
    log "verifying tarball: $ARTIFACT_PATH"
    WORK_DIR="$(mktemp -d -t nolo-verify-tar-XXXXXX)"
    local tar_err=""
    if ! tar_err="$(tar --zstd -xf "$ARTIFACT_PATH" -C "$WORK_DIR" 2>&1 >/dev/null)"; then
      fail "tar extract failed: $tar_err"
    fi

    # Electrobun may emit a top-level wrapper dir.
    ENTRIES=()
    while IFS= read -r -d '' entry; do
      ENTRIES+=("$entry")
    done < <(find "$WORK_DIR" -mindepth 1 -maxdepth 1 -print0)
    if [[ "${#ENTRIES[@]}" -eq 1 && -d "${ENTRIES[0]}" && -d "${ENTRIES[0]}/bin" ]]; then
      PAYLOAD_ROOT="${ENTRIES[0]}"
    else
      PAYLOAD_ROOT="$WORK_DIR"
    fi
    log "payload root: $PAYLOAD_ROOT"

    require_file "$PAYLOAD_ROOT" bin/launcher >/dev/null
    log "bin/launcher present"

    SIZE="$(stat -c '%s' "$ARTIFACT_PATH" 2>/dev/null || stat -f '%z' "$ARTIFACT_PATH" 2>/dev/null || echo 0)"
    log "tarball size: ${SIZE} bytes"
    if [[ "$SIZE" -lt 1000000 ]]; then
      fail "tarball suspiciously small (${SIZE} bytes) — extract may be incomplete"
    fi

    log "ok — tarball artifact verified"
    trap - EXIT
    cleanup_workdir
    ;;

  *.AppImage)
    log "verifying AppImage: $ARTIFACT_PATH"
    # The hard requirements are: file exists, file is executable, and the
    # payload is at least 1MB. AppImage magic-number detection (AI\x02)
    # is intentionally skipped here: legacy AppImages start with the ELF
    # magic, and CI does not have FUSE for full squashfs introspection.
    if [[ ! -x "$ARTIFACT_PATH" ]]; then
      fail "AppImage is not executable (chmod +x)"
    fi
    SIZE="$(stat -c '%s' "$ARTIFACT_PATH" 2>/dev/null || stat -f '%z' "$ARTIFACT_PATH" 2>/dev/null || echo 0)"
    if [[ "$SIZE" -lt 1000000 ]]; then
      fail "AppImage suspiciously small (${SIZE} bytes)"
    fi
    log "AppImage present and executable (${SIZE} bytes)"
    log "ok — AppImage artifact verified"
    trap - EXIT
    ;;

  *)
    fail "unsupported artifact extension (expected .deb, .tar.zst, or .AppImage): $ARTIFACT_PATH"
    ;;
  esac
}

# --- main ---
ARTIFACTS_DIR="packages/desktop/artifacts"
ARGS=("$@")

if [[ "${#ARGS[@]}" -eq 0 ]]; then
  if [[ ! -d "$ARTIFACTS_DIR" ]]; then
    fail "no artifacts directory found at $ARTIFACTS_DIR and no explicit paths given"
  fi
  mapfile -t ARGS < <(find "$ARTIFACTS_DIR" -maxdepth 1 -type f \( -name "*.deb" -o -name "*.tar.zst" -o -name "*.AppImage" \) | sort)
  if [[ "${#ARGS[@]}" -eq 0 ]]; then
    fail "no .deb / .tar.zst / .AppImage artifacts found in $ARTIFACTS_DIR"
  fi
  log "umbrella mode: verifying ${#ARGS[@]} artifact(s) from $ARTIFACTS_DIR"
fi

for artifact in "${ARGS[@]}"; do
  log "=== verifying: $artifact ==="
  verify_one "$artifact"
done

log "all artifacts verified ok"
