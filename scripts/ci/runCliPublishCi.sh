#!/usr/bin/env bash
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

test_cli_package() {
  run_bun_tests \
    packages/cli/installablePack.test.ts \
    packages/cli/publishPackage.source.test.ts \
    packages/cli/buildPublish.source.test.ts \
    packages/cli/buildPublish.runtime.test.ts \
    packages/cli/buildPublishDependencies.test.ts \
    packages/cli/client/agentRun.test.ts \
    packages/cli/agentRunCommand.test.ts \
    packages/cli/client/localRuntimeAdapter.test.ts \
    packages/cli/machineWsRunDispatch.test.ts \
    packages/cli/agentRuntimeCommands.test.ts \
    packages/cli/localRuntimeAuthority.test.ts \
    packages/cli/localRuntimeDb.test.ts \
    packages/cli/agentPullCommand.test.ts \
    packages/cli/localRuntimeBrokerBoundary.source.test.ts \
    packages/cli/cliEnvHelpers.test.ts
}

verify_cli_broker_contracts() {
  run_bun_tests \
    packages/cli/localRuntimeBrokerBoundary.source.test.ts \
    packages/cli/localRuntimeAuthority.test.ts \
    packages/cli/localRuntimeDb.test.ts \
    packages/cli/agentRuntimeCommands.test.ts \
    packages/database-engine/cliAuthorityBrokerClient.test.ts \
    packages/database-engine/cliAuthorityBrokerServer.test.ts \
    packages/cli/agentPullCommand.test.ts \
    packages/cli/client/localRuntimeAdapter.test.ts \
    packages/database-engine/db.source.test.ts \
    packages/database-engine/legacyServerDb.test.ts \
    scripts/verify/verifyCliLocalBrokerConcurrency.source.test.ts
}

verify_cli_broker_concurrency() {
  "$BUN_BIN" run verify:cli-local-broker
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
  # npm may accept a publish and keep the new version in processing for a few
  # minutes. Keep the default window long enough for the registry metadata and
  # dist-tag to become visible instead of marking a successful upload failed.
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
    # 版本已发布过时有两种情况，以前一律「重新打一遍 dist-tag 然后 return 0」，
    # 把它们混为一谈：
    #
    #   a) 该 dist-tag 已经指向这个版本 → 本次推送**什么都没产出**。
    #      以前 job 全绿、npm 上毫无变化、没人知道。实测代价（2026-07-27）：
    #      dist-tags 停在 2026-07-21 的 0.1.57 整整六天，期间每次推送都
    #      "发布成功"。沉默地什么都不做，是这条流水线最贵的失败模式。
    #      → 现在以非零退出，提示去 bump 版本。
    #
    #   b) 该 dist-tag 指向别的版本 → 这是把已验证版本提升到该渠道
    #      （典型：alpha 先发 0.1.58，main 再把 latest 指过来）。合法，照做。
    local current_tag_version
    current_tag_version="$(
      "$NPM_BIN" view "nolo-cli@${DIST_TAG}" version \
        --registry https://registry.npmjs.org/ 2>/dev/null || true
    )"
    if [[ "$current_tag_version" == "$version" ]]; then
      printf '[nolo-cli-publish-ci] nolo-cli@%s 已发布且 dist-tag %s 已指向它，本次推送不产出新版本。\n' \
        "$version" "$DIST_TAG" >&2
      printf '[nolo-cli-publish-ci] 要发版请先 bump packages/cli/package.json 与 packages/app/constants/cliDownloads.ts。\n' >&2
      # 这里**不**失败。
      #
      # 上一版让 latest 渠道非零退出，理由是「推 main 就是要发版」。实测后收回：
      # main 推送大量是服务端修复、CI 修复，与 CLI 发布无关，让它们全红只会在
      # 几天内把这个红训练成没人看的背景噪音——正是本轮一直在修的那种失败模式。
      #
      # 真正的问题（6 天没人发现没发过版）也不该由这个阶段来解：它无法区分
      # 「CLI 改了但忘了 bump」和「本次根本没动 CLI」。前者才值得报错，需要拿
      # 打包产物或 diff 范围去判，属于单独的改动。这里只负责把状态说清楚。
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

run_bun_tests() {
  # 必须显式检查每一条的退出码，不能依赖 set -e。
  #
  # timed_phase 用 `set +e` 包住阶段函数以便捕获退出码，而 set -e 是动态作用域——
  # 它在被调用函数内部同样失效。于是这个循环不会在第一条失败时中断，函数返回的是
  # **最后一条命令**的退出码，中间的失败全被吞掉。
  #
  # 实测代价（2026-07-27）：verify_cli_broker_contracts 的清单里有 5 个文件在
  # e93081722 拆 database-engine 时就搬走了，`bun test <不存在的路径>` 每条都
  # exit 1，而该阶段在 CI 上始终报 status=0——因为清单最后一个文件存在且通过。
  local test_file status=0
  for test_file in "$@"; do
    log "bun test ${test_file}"
    "$BUN_BIN" test "$test_file" || status=$?
  done
  return "$status"
}

main() {
  require_dist_tag
  timed_phase "validate-npm-token" validate_npm_token
  timed_phase "validate-cli-version-alignment" validate_cli_version_alignment
  timed_phase "install-dependencies" install_dependencies
  timed_phase "test-cli-package" test_cli_package
  timed_phase "verify-cli-broker-contracts" verify_cli_broker_contracts
  timed_phase "verify-cli-broker-concurrency" verify_cli_broker_concurrency
  timed_phase "prepare-staged-package" prepare_staged_package
  timed_phase "pack-staged-package" pack_staged_package
  timed_phase "smoke-install-staged-package" smoke_install_staged_package
  timed_phase "publish-or-update-dist-tag" publish_or_update_dist_tag
  timed_phase "verify-published-dist-tag" verify_published_dist_tag
  log "Published nolo-cli@$(resolve_cli_version) with tag $DIST_TAG"
}

main "$@"
