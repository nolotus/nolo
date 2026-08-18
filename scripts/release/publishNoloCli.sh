#!/usr/bin/env bash
set -Eeuo pipefail

CHANNEL="${1:-alpha}"
REPO="${NOLO_PUBLISH_REPO:-nolotus/bun-nolo}"
WORKFLOW="${NOLO_PUBLISH_WORKFLOW:-cli-npm-publish.yml}"
GH_BIN="${NOLO_GH_BIN:-gh}"
NODE_BIN="${NOLO_NODE_BIN:-node}"

usage() {
  cat >&2 <<EOF
Usage: $0 [alpha|latest]

Agent entrypoint for nolo-cli npm publish. Do not ask the user to run gh manually.
EOF
  exit 1
}

log() {
  printf '[publish-nolo-cli] %s\n' "$*" >&2
}

require_channel() {
  case "$CHANNEL" in
    alpha|latest) ;;
    *) usage ;;
  esac
}

resolve_ref() {
  if [[ "$CHANNEL" == "alpha" ]]; then
    printf 'alpha'
    return
  fi
  printf 'main'
}

resolve_cli_version() {
  "$NODE_BIN" -p "require('./packages/cli/package.json').version"
}

validate_version_alignment() {
  "$NODE_BIN" - <<'NODE'
const fs = require("node:fs");
const pkg = require("./packages/cli/package.json");
const source = fs.readFileSync("./packages/app/constants/cliDownloads.ts", "utf8");
const match = source.match(/NOLO_CLI_VERSION = "([^"]+)"/);
if (!match) {
  throw new Error("NOLO_CLI_VERSION is missing from packages/app/constants/cliDownloads.ts");
}
if (match[1] !== pkg.version) {
  throw new Error(
    `CLI version mismatch: packages/cli/package.json=${pkg.version} cliDownloads.ts=${match[1]}`
  );
}
NODE
}

validate_branch_sync() {
  local ref="$1"
  git fetch origin "$ref" >/dev/null 2>&1 || true
  if ! git merge-base --is-ancestor HEAD "origin/${ref}" 2>/dev/null; then
    log "warning: current HEAD is not contained in origin/${ref}; workflow will publish remote ${ref}."
  fi
}

trigger_workflow() {
  local ref="$1"
  "$GH_BIN" workflow run "$WORKFLOW" --ref "$ref" -f "dist_tag=${CHANNEL}" -R "$REPO"
}

wait_for_run() {
  local ref="$1"
  local run_id attempt

  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    sleep 3
    run_id="$(
      "$GH_BIN" run list \
        --workflow "$WORKFLOW" \
        --branch "$ref" \
        --limit 1 \
        --json databaseId \
        -R "$REPO" \
        | "$NODE_BIN" -pe 'const rows=JSON.parse(process.stdin.read()||"[]"); rows[0]?.databaseId ?? ""'
    )"
    if [[ -n "$run_id" ]]; then
      break
    fi
    log "waiting for workflow run to appear (attempt ${attempt}/10)"
  done

  if [[ -z "$run_id" ]]; then
    echo "Failed to resolve GitHub Actions run id for ${WORKFLOW} on ${ref}." >&2
    return 1
  fi

  log "watching workflow run ${run_id}"
  "$GH_BIN" run watch "$run_id" --exit-status -R "$REPO"
}

verify_npm_dist_tag() {
  # Same eventual-consistency race as CI: retry tag reads after publish.
  local version expected attempt max_attempts delay_s
  version="$(resolve_cli_version)"
  max_attempts="${NOLO_CLI_PUBLISH_TAG_VERIFY_ATTEMPTS:-12}"
  delay_s="${NOLO_CLI_PUBLISH_TAG_VERIFY_DELAY_S:-5}"

  for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if (( attempt > max_attempts )); then
      break
    fi
    expected="$(
      curl -fsSL "https://registry.npmjs.org/nolo-cli" 2>/dev/null \
        | "$NODE_BIN" -pe "JSON.parse(process.stdin.read()).['dist-tags']['${CHANNEL}']" 2>/dev/null || true
    )"
    if [[ "$expected" == "$version" ]]; then
      log "npm nolo-cli@${CHANNEL} -> ${expected} (attempt ${attempt})"
      return 0
    fi
    log "dist-tag lag: nolo-cli@${CHANNEL} -> ${expected:-<empty>} (want ${version}); retry ${attempt}/${max_attempts} in ${delay_s}s"
    sleep "$delay_s"
  done

  echo "Expected npm dist-tag ${CHANNEL}=${version}, got ${expected:-<empty>} after retries." >&2
  return 1
}

verify_open_source_mirror() {
  local version tag
  version="$(resolve_cli_version)"
  tag="$(
    "$GH_BIN" api "repos/nolotus/nolo-cli/contents/package.json" --jq .content \
      | base64 -d \
      | "$NODE_BIN" -pe "JSON.parse(process.stdin.read()).version"
  )"

  if [[ "$tag" != "$version" ]]; then
    echo "Expected nolotus/nolo-cli package.json version ${version}, got ${tag}." >&2
    return 1
  fi

  log "open-source mirror nolotus/nolo-cli@${version}"
}

main() {
  local ref version

  require_channel
  ref="$(resolve_ref)"
  version="$(resolve_cli_version)"

  log "channel=${CHANNEL} ref=${ref} version=${version}"
  validate_version_alignment
  validate_branch_sync "$ref"
  trigger_workflow "$ref"
  wait_for_run "$ref"
  verify_npm_dist_tag
  verify_open_source_mirror
  log "published nolo-cli@${version} (${CHANNEL})"
}

main "$@"