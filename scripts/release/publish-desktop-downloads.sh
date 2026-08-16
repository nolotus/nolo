#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
WIN_PATH="${WIN_PATH:-${2:-}}"
LINUX_PATH="${LINUX_PATH:-${3:-}}"
MAC_PATH="${MAC_PATH:-${4:-}}"
ARTIFACT_DIR="${ARTIFACT_DIR:-${5:-$ROOT_DIR/packages/desktop/artifacts}}"

cmd=(bun ./scripts/release/publishDesktopDownloads.ts --channel "$BRANCH" --artifact-dir "$ARTIFACT_DIR")
if [[ -n "$WIN_PATH" ]]; then cmd+=(--windows "$WIN_PATH" --platform windows); fi
if [[ -n "$LINUX_PATH" ]]; then cmd+=(--linux "$LINUX_PATH" --platform linux); fi
if [[ -n "$MAC_PATH" ]]; then cmd+=(--macos "$MAC_PATH" --platform macos); fi

exec "${cmd[@]}"
