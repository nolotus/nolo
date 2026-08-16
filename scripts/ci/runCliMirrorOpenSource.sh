#!/usr/bin/env bash
set -Eeuo pipefail

BUN_BIN="${NOLO_BUN_BIN:-bun}"
NODE_BIN="${NOLO_NODE_BIN:-node}"
GIT_BIN="${NOLO_GIT_BIN:-git}"
OUT_DIR="${NOLO_CLI_MIRROR_OUT_DIR:-.tmp/nolo-cli-mirror}"
MIRROR_REPO="${NOLO_CLI_MIRROR_REPO:-https://github.com/nolotus/nolo-cli.git}"
PRESERVE_DIR="$(mktemp -d)"
WORK_DIR="$(mktemp -d)"

log() {
  printf '[nolo-cli-mirror-ci] %s\n' "$*" >&2
}

cleanup() {
  rm -rf "$PRESERVE_DIR" "$WORK_DIR"
}

trap cleanup EXIT

require_mirror_token() {
  if [[ -z "${CLI_MIRROR_GH_TOKEN:-${GH_TOKEN:-}}" ]]; then
    echo "CLI_MIRROR_GH_TOKEN or GH_TOKEN is required to push the open-source mirror." >&2
    return 1
  fi
}

resolve_cli_version() {
  "$NODE_BIN" -p "require('./packages/cli/package.json').version"
}

preserve_open_source_scaffold() {
  local repo_dir="$1"
  local path

  for path in README.md LICENSE CONTRIBUTING.md docs .github/workflows/test.yml; do
    if [[ -e "$repo_dir/$path" ]]; then
      mkdir -p "$PRESERVE_DIR/$(dirname "$path")"
      cp -a "$repo_dir/$path" "$PRESERVE_DIR/$path"
    fi
  done
}

restore_open_source_scaffold() {
  local repo_dir="$1"
  local path

  for path in README.md LICENSE CONTRIBUTING.md docs .github/workflows/test.yml; do
    if [[ -e "$PRESERVE_DIR/$path" ]]; then
      mkdir -p "$repo_dir/$(dirname "$path")"
      cp -a "$PRESERVE_DIR/$path" "$repo_dir/$path"
    fi
  done
}

main() {
  local version repo_dir token

  require_mirror_token
  version="$(resolve_cli_version)"
  token="${CLI_MIRROR_GH_TOKEN:-${GH_TOKEN}}"

  rm -rf "$OUT_DIR"
  "$BUN_BIN" ./scripts/release/prepareCliOpenSourceMirror.ts --out-dir "$OUT_DIR"

  "$GIT_BIN" clone --depth 1 "$MIRROR_REPO" "$WORK_DIR/repo"
  repo_dir="$WORK_DIR/repo"

  preserve_open_source_scaffold "$repo_dir"

  find "$repo_dir" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
  cp -a "$OUT_DIR/." "$repo_dir/"
  # Strip credential files that trigger GitHub secret scanning push protection
  # Path can vary (cli/oauth/ vs oauth/) depending on build artifact layout
  find "$repo_dir" -type f \( -name "oauthProviders.ts" -o -name "antigravity.ts" \) -delete
  rm -f "$repo_dir/README.md"
  restore_open_source_scaffold "$repo_dir"

  cd "$repo_dir"
  "$GIT_BIN" config user.email "s@nolotus.com"
  "$GIT_BIN" config user.name "nolotus"
  "$GIT_BIN" remote set-url origin "https://x-access-token:${token}@github.com/nolotus/nolo-cli.git"
  "$GIT_BIN" add -A

  if "$GIT_BIN" diff --staged --quiet; then
    log "Open-source mirror already up to date for v${version}."
    return 0
  fi

  "$GIT_BIN" commit -m "$(cat <<EOF
mirror: sync source tree for v${version}

Automated mirror from bun-nolo after npm publish. The public repo is a
read-only source mirror; npm releases are published only from bun-nolo.
EOF
)"
  "$GIT_BIN" tag -f "v${version}"
  "$GIT_BIN" push origin main
  "$GIT_BIN" push origin "refs/tags/v${version}" --force

  log "Mirrored nolo-cli source to nolotus/nolo-cli@v${version}"
}

main "$@"