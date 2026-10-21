#!/usr/bin/env bash
# scripts/ci/runCliPublishPublic.sh
#
# 公开仓（nolotus/nolo）CLI npm publish 流水线，由 .github/workflows/cli-publish.yml 调用。
# 与 bun-nolo 的 runCliPublishCi.sh 保持同一套发布语义（validate → prepare → pack →
# smoke install → publish/ promote → dist-tag verify），但**不含 private test 阶段**：
# 公开投影不携带 test suite（Public Projection Phase 1 边界），bun test 回归由
# bun-nolo private CI 在源仓完成后再投影发布。
set -Eeuo pipefail

BUN_BIN="${NOLO_BUN_BIN:-bun}"
NODE_BIN="${NOLO_NODE_BIN:-node}"
NPM_BIN="${NOLO_NPM_BIN:-npm}"
DIST_TAG="${NOLO_CLI_PUBLISH_DIST_TAG:-alpha}"
OUT_DIR="${NOLO_CLI_PUBLISH_OUT_DIR:-.tmp/nolo-cli-publish}"
NPM_PREFIX="${NOLO_CLI_PUBLISH_NPM_PREFIX:-${RUNNER_TEMP:-/tmp}/nolo-cli-prefix}"

log() {
  printf '[nolo-cli-publish-ci] %s\n' "$*" >&2
}

timed_phase() {
  local phase="$1"
  shift
  local started_ms finished_ms status
  started_ms="$("$BUN_BIN" -e 'process.stdout.write(String(Date.now()))')"
  log "phase=${phase} start"
  set +e
  "$@"
  status=$?
  set -e
  finished_ms="$("$BUN_BIN" -e 'process.stdout.write(String(Date.now()))')"
  printf '[nolo-ci-phase] phase=%s status=%s durationMs=%s startedMs=%s finishedMs=%s\n' \
    "$phase" "$status" "$((finished_ms - started_ms))" "$started_ms" "$finished_ms" >&2
  return "$status"
}

require_dist_tag() {
  case "$DIST_TAG" in
    alpha|latest) ;;
    *)
      printf 'Unsupported NOLO_CLI_PUBLISH_DIST_TAG: %s\n' "$DIST_TAG" >&2
      return 1
      ;;
  esac
}

install_dependencies() {
  "$BUN_BIN" install --frozen-lockfile
}

resolve_cli_version() {
  "$NODE_BIN" -p "require('./packages/cli/package.json').version"
}

prepare_staged_package() {
  rm -rf "$OUT_DIR"
  "$BUN_BIN" ./scripts/release/prepareCliPublishPackage.ts --out-dir "$OUT_DIR"
}

pack_staged_package() {
  (
    cd "$OUT_DIR"
    rm -f ./*.tgz
    "$NPM_BIN" pack
  )
}

smoke_install_staged_package() {
  local tarball
  tarball="$(find "$OUT_DIR" -maxdepth 1 -type f -name '*.tgz' | sort | tail -n 1)"
  if [[ -z "$tarball" ]]; then
    echo "No staged CLI tarball found after npm pack." >&2
    return 1
  fi

  rm -rf "$NPM_PREFIX"
  NPM_CONFIG_PREFIX="$NPM_PREFIX" "$NPM_BIN" install -g "$tarball"
  "$NPM_PREFIX/bin/nolo" --version
}

validate_npm_token() {
  if [[ -z "${NPM_TOKEN:-${NODE_AUTH_TOKEN:-}}" ]]; then
    echo "NPM_TOKEN or NODE_AUTH_TOKEN is required for CLI publish." >&2
    return 1
  fi

  NODE_AUTH_TOKEN="$(npm_auth_token)" \
    "$NPM_BIN" whoami --registry https://registry.npmjs.org/ >/dev/null
}

validate_cli_version_alignment() {
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

verify_published_dist_tag() {
  # npm dist-tag reads are eventually consistent right after publish/tag.
  # Retry with backoff so CI does not fail when the package is already
  # published but the tag view still returns the previous version briefly.
  local version published_tag attempt max_attempts delay_s
  version="$(resolve_cli_version)"
  max_attempts="${NOLO_CLI_PUBLISH_TAG_VERIFY_ATTEMPTS:-180}"
  delay_s="${NOLO_CLI_PUBLISH_TAG_VERIFY_DELAY_S:-5}"

  for attempt in $(seq 1 "$max_attempts"); do
    published_tag="$(
      NODE_AUTH_TOKEN="$(npm_auth_token)" \
        "$NPM_BIN" view "nolo-cli@${DIST_TAG}" version --registry https://registry.npmjs.org/ 2>/dev/null || true
    )"
    if [[ "$published_tag" == "$version" ]]; then
      log "verified nolo-cli@${DIST_TAG} -> ${published_tag} (attempt ${attempt}/${max_attempts})"
      return 0
    fi
    log "dist-tag lag: nolo-cli@${DIST_TAG} -> ${published_tag:-<empty>} (want ${version}); retry ${attempt}/${max_attempts} in ${delay_s}s"
    sleep "$delay_s"
  done

  echo "Expected nolo-cli@${DIST_TAG} to resolve to ${version}, got ${published_tag:-<empty>} after ${max_attempts} attempts." >&2
  return 1
}

npm_auth_token() {
  # Prefer the repository publish secret over setup-node's ambient auth value.
  printf '%s' "${NPM_TOKEN:-${NODE_AUTH_TOKEN:-}}"
}

publish_or_update_dist_tag() {
  local version published
  version="$(resolve_cli_version)"

  if "$NPM_BIN" view "nolo-cli@$version" version --registry https://registry.npmjs.org/ >/dev/null 2>&1; then
    published=1
  else
    published=0
  fi

  if [[ "$published" == "1" ]]; then
    # 版本已发布过时分两种情况：
    #   a) 该 dist-tag 已指向这个版本 → 本次推送没有产出新版本，直接 return 0
    #      （发版请先 bump packages/cli/package.json 与 cliDownloads.ts）。
    #   b) 该 dist-tag 指向别的版本 → 把已验证版本提升到该渠道（合法，照做）。
    local current_tag_version
    current_tag_version="$(
      "$NPM_BIN" view "nolo-cli@${DIST_TAG}" version \
        --registry https://registry.npmjs.org/ 2>/dev/null || true
    )"
    if [[ "$current_tag_version" == "$version" ]]; then
      log "nolo-cli@$version 已发布且 dist-tag $DIST_TAG 已指向它，本次推送不产出新版本。" >&2
      return 0
    fi
    log "promoting nolo-cli@$version to dist-tag $DIST_TAG (was ${current_tag_version:-<none>})."
    (
      cd "$OUT_DIR"
      NODE_AUTH_TOKEN="$(npm_auth_token)" \
        "$NPM_BIN" dist-tag add "nolo-cli@$version" "$DIST_TAG"
    )
    return
  fi

  (
    cd "$OUT_DIR"
    NODE_AUTH_TOKEN="$(npm_auth_token)" \
      "$NPM_BIN" publish --access public --tag "$DIST_TAG"
  )
}

main() {
  require_dist_tag
  timed_phase "validate-npm-token" validate_npm_token
  timed_phase "validate-cli-version-alignment" validate_cli_version_alignment
  timed_phase "install-dependencies" install_dependencies
  timed_phase "prepare-staged-package" prepare_staged_package
  timed_phase "pack-staged-package" pack_staged_package
  timed_phase "smoke-install-staged-package" smoke_install_staged_package
  timed_phase "publish-or-update-dist-tag" publish_or_update_dist_tag
  timed_phase "verify-published-dist-tag" verify_published_dist_tag
  log "Published nolo-cli@$(resolve_cli_version) with tag $DIST_TAG"
}

main "$@"
