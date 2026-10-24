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
  # 注入优先（与 runCliPublishCi.sh 同语义）：否则 package.json 的旧版本会让
  # publish 判定「无新版本」而静默跳过，dist-tag 验证也会比对错误对象。
  if [[ -n "${NOLO_CLI_PUBLISH_VERSION:-}" ]]; then
    printf '%s\n' "$NOLO_CLI_PUBLISH_VERSION"
    return
  fi
  "$BUN_BIN" -p "require('./packages/cli/package.json').version"
}

prepare_staged_package() {
  rm -rf "$OUT_DIR"
  # 版本注入：优先用调用方给的 NOLO_CLI_PUBLISH_VERSION（公开仓 cli-publish.yml 传
  # inputs.version / metadata 声明的版本），未给时退回 packages/cli/package.json。
  #
  # 为什么需要它：main 停止为版本号产生提交之后，projection 里的 package.json
  # 不再是本次发布的版本（它停在 alpha 的版本线上），真正的发布版本只存在于 tag /
  # projection-release-metadata.json 里。没有这条注入，npm 会发出旧版本，而
  # cli-publish.yml 的健康检查（读 package.json）也会跟着失准。
  local version_args=()
  if [[ -n "${NOLO_CLI_PUBLISH_VERSION:-}" ]]; then
    log "injecting CLI publish version: ${NOLO_CLI_PUBLISH_VERSION} (from NOLO_CLI_PUBLISH_VERSION)"
    version_args=(--version "$NOLO_CLI_PUBLISH_VERSION")
  fi
  "$BUN_BIN" ./scripts/release/prepareCliPublishPackage.ts --out-dir "$OUT_DIR" ${version_args[@]+"${version_args[@]}"}
}

assert_no_builtin_dynamic_require() {
  # 事故：esbuild 把 CJS 依赖里的 require("<node 内建>") 改写成 __require("<内建>")，
  # 在纯 ESM 产物里 Node 一执行到那行就抛
  #   Dynamic require of "node:os" is not supported
  # 本路径没有 test 阶段（公开投影不带 test suite），所以这里只做产物级断言。
  # 当前产物命中数为 0 → 零容忍，不设豁免表；重新引入时按下面指引修。
  local js_count hits grep_status
  js_count="$(find "$OUT_DIR" -maxdepth 1 -type f -name '*.js' | wc -l)"
  if [[ "$js_count" -eq 0 ]]; then
    echo "No bundled .js artifacts found in $OUT_DIR; refusing to publish an unverified package." >&2
    return 1
  fi

  # 扫描失败 ≠ 零命中：grep 只接受 0(有命中) / 1(无命中)，其余退出码（路径、权限、
  # 参数错误…）一律阻断。否则一个坏掉的 grep 会让这道门静默全绿。
  hits="$(
    grep -roE --include='*.js' \
      '__require[0-9]*\(\s*["'"'"'](node:)?(fs|path|os|events|crypto|child_process|util|stream|buffer|url|http|https|net|zlib|tty|worker_threads|process|timers|dns|module|readline|v8|vm|assert|async_hooks|string_decoder|querystring|perf_hooks|cluster|dgram|tls|http2|constants|sys|trace_events|wasi)["'"'"']\s*\)' \
      "$OUT_DIR"
  )" && grep_status=0 || grep_status=$?
  case "$grep_status" in
    0) ;;                # 有命中 → 下面报错
    1) hits="" ;;        # 无命中 → 通过
    *)
      printf 'Dynamic-require gate could not scan %s (grep exit %s); refusing to publish an unverified package.\n' \
        "$OUT_DIR" "$grep_status" >&2
      return 1
      ;;
  esac
  if [[ -n "$hits" ]]; then
    printf 'Dynamic-require gate failed: bundled artifact calls require() on a Node builtin:\n' >&2
    printf '%s\n' "$hits" >&2
    printf 'Fix: add that package to PUBLISH_EXTERNAL in packages/cli/buildPublish.ts, then give it a version in the publish manifest (keptDeps + CLI_PUBLISH_DEPENDENCY_ALLOWLIST).\n' >&2
    return 1
  fi
  log "builtin dynamic-require gate: 0 hits across ${js_count} artifact file(s) in $OUT_DIR"
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

  # 只有 --version 不够：packages/cli/index.ts 对 -v/--version 提前 process.exit，
  # 永远不加载应用图，上面那行对 __require("<内建>") 这类崩溃完全看不见
  # （0.153.1 就是这么带 3 处 shim 发出去的）。这里无参数 + 非 TTY 跑一次：
  # 该路径先加载应用图、再打印帮助并 exit 0（index.ts 的 args.length === 0 分支），
  # 所以任何非零退出、被信号终止或超时都是真实缺陷，一律阻断（不吞环境噪声：
  # 真出问题会以 exit 70 / Dynamic require 的形式现形）。
  local load_out load_status reason
  load_out="$(timeout 60 "$NPM_PREFIX/bin/nolo" </dev/null 2>&1)" && load_status=0 || load_status=$?
  if printf '%s\n' "$load_out" | grep -q 'Dynamic require of'; then
    echo "staged CLI hit an esbuild builtin shim while loading its app graph:" >&2
    printf '%s\n' "$load_out" >&2
    return 1
  fi
  if [[ "$load_status" -ne 0 ]]; then
    case "$load_status" in
      124) reason="timed out after 60s (app graph load hung)" ;;
      70) reason="unhandled error in CLI main (exit 70)" ;;
      *) if [[ "$load_status" -gt 128 ]]; then
           reason="terminated by signal $((load_status - 128))"
         else
           reason="exit $load_status"
         fi ;;
    esac
    echo "staged CLI failed to load its app graph: ${reason}" >&2
    printf '%s\n' "$load_out" | tail -n 30 >&2
    return 1
  fi
  log "staged CLI loads its app graph (no-arg, non-TTY) and prints help"
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
  # 2026-10-19：守卫收敛到 scripts/release/validateCliVersionSource.ts。
  # 原先「用正则从 cliDownloads.ts 抠版本号并比对 package.json」这段逻辑在
  # 本文件、runCliPublishCi.sh、publishNoloCli.sh、applyCliVersion.ts 各有一份；
  # cliDownloads 改为构建期注入（__NOLO_CLI_VERSION__）后它们全部失配，
  # 把发布链直接打红。同一个错误不该逐份再犯三次。
  "$BUN_BIN" ./scripts/release/validateCliVersionSource.ts
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
  timed_phase "assert-no-builtin-dynamic-require" assert_no_builtin_dynamic_require
  timed_phase "pack-staged-package" pack_staged_package
  timed_phase "smoke-install-staged-package" smoke_install_staged_package
  timed_phase "publish-or-update-dist-tag" publish_or_update_dist_tag
  timed_phase "verify-published-dist-tag" verify_published_dist_tag
  log "Published nolo-cli@$(resolve_cli_version) with tag $DIST_TAG"
}

main "$@"
