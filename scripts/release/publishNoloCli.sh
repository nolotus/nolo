#!/usr/bin/env bash
set -Eeuo pipefail

CHANNEL="${1:-alpha}"
REPO="${NOLO_PUBLISH_REPO:-nolotus/nolo}"
WORKFLOW="${NOLO_PUBLISH_WORKFLOW:-cli-publish.yml}"
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
  # nolotus/nolo publishes both npm channels from its only release branch.
  # CHANNEL remains independent and is passed as the workflow's dist_tag.
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

validate_remote_version_alignment() {
  # 发布内容取决于公开仓 ${REPO}@main 当前快照，而非本地工作区；dispatch
  # 前必须断言远程 version 与本地一致，否则可能把与本地不一致的公开仓快照
  # 发上 npm。token：优先 SYNC_GH_TOKEN，回落 CLI_MIRROR_GH_TOKEN，再缺省
  # 允许匿名（contents API 匿名有速率限制，失败时报错说明并拒绝 dispatch）。
  local local_version remote_version token content
  local_version="$(resolve_cli_version)"

  token=""
  if [[ -n "${SYNC_GH_TOKEN:-}" ]]; then
    token="${SYNC_GH_TOKEN}"
  elif [[ -n "${CLI_MIRROR_GH_TOKEN:-}" ]]; then
    token="${CLI_MIRROR_GH_TOKEN}"
  fi

  local -a curl_args=(-sSL --retry 2)
  if [[ -n "$token" ]]; then
    curl_args+=(-H "Authorization: Bearer ${token}")
  fi

  # contents API 返回 base64 编码的 package.json（外层是 JSON），解码后取 version。
  # 失败时按 HTTP 状态区分诊断：401/403 提示 token 无效或权限不足（已设 token
  # 仍失败→检查 SYNC_GH_TOKEN/CLI_MIRROR_GH_TOKEN），403 且带 rate limit 头才
  # 提限流，其他网络错误如实报错。
  local http_code curl_err tmp_body tmp_headers tmp_err
  tmp_body="$(mktemp)"
  tmp_headers="$(mktemp)"
  tmp_err="$(mktemp)"
  http_code=""
  curl_err=""
  http_code="$(
    curl "${curl_args[@]}" \
      --write-out '%{http_code}' \
      --output "$tmp_body" \
      --dump-header "$tmp_headers" \
      "https://api.github.com/repos/${REPO}/contents/packages/cli/package.json?ref=main" \
      2>"$tmp_err" || true
  )"
  curl_err="$(cat "$tmp_err" 2>/dev/null || true)"
  content="$(cat "$tmp_body" 2>/dev/null || true)"

  if [[ "$http_code" != "200" ]]; then
    log "failed to fetch ${REPO}@main packages/cli/package.json (http ${http_code:-<no response>})"
    if [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
      if [[ "$http_code" == "403" ]] && grep -qi '^x-ratelimit-remaining: *0' "$tmp_headers" 2>/dev/null; then
        log "contents API rate-limited (http 403, rate limit exhausted); wait and retry, or set SYNC_GH_TOKEN / CLI_MIRROR_GH_TOKEN"
      elif [[ -n "$token" ]]; then
        log "token rejected (http ${http_code}): token invalid or lacks read access to ${REPO}; check SYNC_GH_TOKEN / CLI_MIRROR_GH_TOKEN"
      else
        log "http ${http_code} without a token: set SYNC_GH_TOKEN or CLI_MIRROR_GH_TOKEN and retry"
      fi
    elif [[ -z "$http_code" || "$http_code" == "000" ]]; then
      log "network error reaching api.github.com: ${curl_err:-no HTTP response received}"
    else
      log "unexpected HTTP status ${http_code} from contents API; inspect and retry"
    fi
    rm -f "$tmp_body" "$tmp_headers" "$tmp_err"
    return 1
  fi
  rm -f "$tmp_body" "$tmp_headers" "$tmp_err"

  if [[ -z "$content" ]]; then
    log "empty response from ${REPO}@main contents API (http 200)"
    return 1
  fi

  remote_version="$(
    printf '%s' "$content" \
      | "$NODE_BIN" -e '
const { readFileSync } = require("node:fs");
const j = JSON.parse(readFileSync(0, "utf8"));
if (!j.content) process.exit(2);
const pkg = JSON.parse(Buffer.from(j.content, "base64").toString("utf8"));
process.stdout.write(pkg.version || "");
' 2>/dev/null
  )" || true

  if [[ -z "$remote_version" ]]; then
    log "failed to decode cli version from ${REPO}@main contents API response"
    return 1
  fi

  if [[ "$remote_version" != "$local_version" ]]; then
    log "version alignment failed; refusing to dispatch"
    log "  public ${REPO}@main cli version: ${remote_version}"
    log "  local packages/cli/package.json version: ${local_version}"
    log "  align the public projection first (scripts/ci/syncNoloOpenSourceMirror.sh), then retry"
    return 1
  fi

  log "public ${REPO}@main cli version matches local: ${local_version}"
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
  max_attempts="${NOLO_CLI_PUBLISH_TAG_VERIFY_ATTEMPTS:-180}"
  delay_s="${NOLO_CLI_PUBLISH_TAG_VERIFY_DELAY_S:-5}"

  for attempt in $(seq 1 "$max_attempts"); do
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

main() {
  local ref version

  require_channel
  ref="$(resolve_ref)"
  version="$(resolve_cli_version)"

  log "channel=${CHANNEL} ref=${ref} version=${version}"
  validate_version_alignment
  validate_remote_version_alignment
  trigger_workflow "$ref"
  wait_for_run "$ref"
  verify_npm_dist_tag
  log "published nolo-cli@${version} (${CHANNEL})"
}

main "$@"
