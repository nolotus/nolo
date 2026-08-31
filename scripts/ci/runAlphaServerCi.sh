#!/usr/bin/env bash
set -Eeuo pipefail

COMMAND="${1:-}"
if [[ -n "$COMMAND" ]]; then
  shift || true
fi

REPO_DIR="${NOLO_ALPHA_REPO_DIR:-/root/bun-nolo}"
WORK_DIR="${NOLO_ALPHA_WORK_DIR:-$REPO_DIR}"
BUN_BIN="${NOLO_BUN_BIN:-/root/.bun/bin/bun}"
PM2_BIN="${NOLO_PM2_BIN:-/root/.bun/bin/pm2}"
PM2_HOME="${PM2_HOME:-/root/.pm2}"
HOME="${HOME:-/root}"
if [[ -n "${NOLO_BUILD_SHA:-}" ]]; then
  BUILD_SHA="$NOLO_BUILD_SHA"
elif [[ "$COMMAND" == "alpha-deploy" || "$COMMAND" == "main-web-release" ]]; then
  BUILD_SHA="${GITHUB_SHA:-}"
else
  BUILD_SHA=""
fi
RUN_ID="${GITHUB_RUN_ID:-local}"
ARTIFACT_DIR="${NOLO_ALPHA_ARTIFACT_DIR:-${GITHUB_WORKSPACE:-$WORK_DIR}/.nolo-artifacts}"
# 持久归档目录：web 产物按 <kind>-<shortsha>.tar.gz 归档，供后续「main 发布晋升 alpha 产物」
# 跨 job 复用。与 ARTIFACT_DIR（随 checkout sync 被清）不同，这里不会被清掉。
NOLO_ARTIFACT_ARCHIVE_DIR="${NOLO_ARTIFACT_ARCHIVE_DIR:-/root/nolo-artifacts}"
MIN_FREE_KB="${NOLO_ALPHA_MIN_FREE_KB:-180224}"
DISK_WARN_KB="${NOLO_ALPHA_DISK_WARN_KB:-1048576}"   # 1 GiB warning
DISK_MIN_KB="${NOLO_ALPHA_DISK_MIN_KB:-524288}"     # 512 MiB hard minimum
ALPHA_PUBLIC_BASE="${NOLO_ALPHA_PUBLIC_BASE:-https://us.nolo.chat}"
ALPHA_LOCAL_BASE="${NOLO_ALPHA_LOCAL_BASE:-http://127.0.0.1:38123}"
SKIP_WORK_SYNC="${NOLO_ALPHA_SKIP_WORK_SYNC:-0}"
PREVIEW_SLOTS="${NOLO_ALPHA_PREVIEW_SLOTS:-alpha-a.nolo.chat:38123,alpha-b.nolo.chat:38123,alpha-c.nolo.chat:38123,alpha-d.nolo.chat:38123}"
ALPHA_RUNNER_DIR="${NOLO_ALPHA_RUNNER_DIR:-/root/actions-runner-2.334.0}"
ALPHA_RUNNER_WORK="${ALPHA_RUNNER_DIR}/_work"
MAIN_RELEASE_DIR="${NOLO_MAIN_RELEASE_DIR:-/root/bun-nolo-release/main}"
PRODUCTION_HOST="${NOLO_PRODUCTION_HOST:-nolo.chat}"
PRODUCTION_USER="${NOLO_PRODUCTION_USER:-nolotus}"
PRODUCTION_REPO_DIR="${NOLO_PRODUCTION_REPO_DIR:-/home/nolotus/bun-nolo}"
PRODUCTION_PM2_BIN="${NOLO_PRODUCTION_PM2_BIN:-pm2}"
# 生产 SSH 用户是 nolotus（HOME=/home/nolotus），PM2 daemon 归 nolotus 管理
# （/home/nolotus/.pm2）。历史上默认 /root/.pm2 会把新实例注册进 root 的
# PM2 daemon，与 nolotus PM2 里现存实例抢同一个 LevelDB 锁，导致服务反复
# 崩溃重启（LEVEL_LOCKED）。必须与 PRODUCTION_USER 的 HOME 保持一致。
PRODUCTION_PM2_HOME="${NOLO_PRODUCTION_PM2_HOME:-/home/nolotus/.pm2}"
PRODUCTION_LOCAL_BASE="${NOLO_PRODUCTION_LOCAL_BASE:-http://127.0.0.1:38123}"
PRODUCTION_PUBLIC_BASE="${NOLO_PRODUCTION_PUBLIC_BASE:-https://nolo.chat}"
# 可选：配置后 alpha/main 部署的健康验证通过后自动 seed 平台内置公开 agent
# （防「代码升级了、生产记录没跟上」的漂移）。未配置则跳过，不阻塞部署。
# Token 需有目标 server 的写权限（建议用专门的 CI 账号）。
NOLO_PLAZA_SEED_TOKEN="${NOLO_PLAZA_SEED_TOKEN:-}"
ALPHA_SSR_PROBE_PATH="${NOLO_ALPHA_SSR_PROBE_PATH:-}"
# 可选 CF builder offload（scripts/ci/cf-builder/）：两者都非空时，alpha-deploy 的
# web 构建 POST /build {branch:alpha} 到 CF worker 并轮询 /status，成功则下载
# /artifact 到 $WORK_DIR/web-build.tar.gz 并跳过宿主 build_web。任一环节失败或
# 未配置 → 原地回退宿主本地 build_web（行为与现状完全一致，部署永远完成）。
NOLO_CF_BUILDER_URL="${NOLO_CF_BUILDER_URL:-}"
NOLO_CF_BUILDER_TOKEN="${NOLO_CF_BUILDER_TOKEN:-}"
CF_BUILD_POLL_INTERVAL_S="${NOLO_CF_BUILD_POLL_INTERVAL_S:-15}"
CF_BUILD_TIMEOUT_S="${NOLO_CF_BUILD_TIMEOUT_S:-900}"
# BLOCK-1 交接点：offload 成功时登记 CF 下载产物的 tar.gz 路径，
# package_web_artifact 据此消费（否则回退从 public/ 重新打包，行为与现状一致）。
CF_OFFLOAD_ARTIFACT_TAR_GZ="${CF_OFFLOAD_ARTIFACT_TAR_GZ:-}"

export HOME
export PM2_HOME
PHASE_TIMING_LINES=()
SNAPSHOT_FILE="$(mktemp)"
trap 'rm -f "$SNAPSHOT_FILE"' EXIT

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/ci/runAlphaServerCi.sh <command>

Commands:
  alpha-deploy              Build, test, package, and deploy origin/alpha on the alpha server.
  alpha-maintenance         Repair alpha server disk/runtime state and ensure the alpha service is healthy.
  alpha-billing-audit       Run alpha billing audit reports against the local alpha service.
  alpha-token-probe         Run one alpha agent chat to verify token usage split ledger.
  alpha-agent-smoke         Run one private DeepInfra billing smoke against alpha.
  alpha-app-workspace-audit Run read-only app workspace git source-truth audit on alpha.
  alpha-app-runtime-audit   Run read-only app source/version/runtime consistency audit on alpha.
  alpha-app-lifecycle-audit Run both app workspace and app runtime/version audits on alpha.
  main-web-release          Build, test, upload, deploy, and audit main from a dedicated alpha-server checkout.

Environment:
  NOLO_ALPHA_REPO_DIR       Alpha server checkout path. Default: /root/bun-nolo
  NOLO_BUN_BIN              Bun executable. Default: /root/.bun/bin/bun
  NOLO_PM2_BIN              PM2 executable. Default: /root/.bun/bin/pm2
  NOLO_BUILD_SHA            Build identity. Defaults to GITHUB_SHA only for deploy/release commands.
  NOLO_ALPHA_PUBLIC_BASE    Public alpha base. Default: https://us.nolo.chat
  NOLO_ALPHA_LOCAL_BASE     Local alpha base. Default: http://127.0.0.1:38123
  NOLO_ALPHA_MIN_FREE_KB    Artifact/deploy minimum free disk. Default: 180224
  NOLO_MAIN_RELEASE_DIR     Dedicated main release checkout. Default: /root/bun-nolo-release/main
  NOLO_PRODUCTION_SSH_KEY   Private key content for production SSH upload/deploy.
  NOLO_PRODUCTION_SSH_KEY_PATH
                            Existing private key path for production SSH upload/deploy.
  NOLO_CF_BUILDER_URL       CF builder worker base URL (scripts/ci/cf-builder). When set together with
                            NOLO_CF_BUILDER_TOKEN, alpha-deploy offloads the web build to CF and skips the
                            host build_web step on success. Unset → host build_web (current behavior).
  NOLO_CF_BUILDER_TOKEN     Auth token for CF builder /build and /artifact (X-Builder-Token). Must be set
                            together with NOLO_CF_BUILDER_URL to enable offload.
  NOLO_CF_BUILD_POLL_INTERVAL_S  Poll interval (s) for CF builder /status. Default: 15
  NOLO_CF_BUILD_TIMEOUT_S   Timeout (s) for CF build completion. Default: 900
USAGE
}

log() {
  printf '\n=== %s ===\n' "$*" || true
}

# The alpha host's `date +%s%3N` does not reliably truncate or zero-pad `%N`.
# Concatenating that variable-width fraction produced nanoseconds labelled as
# milliseconds, and occasionally a 10x clock discontinuity. Python is already
# a required deploy dependency and gives an unambiguous 13-digit epoch value.
epoch_millis() {
  python3 -c 'import time; print(time.time_ns() // 1_000_000)'
}

disk_snapshot() {
  local label="${1:-snapshot}"
  local ws_size="?"
  ws_size="$(du -sh "$WORK_DIR" 2>/dev/null | cut -f1)"
  ws_size="${ws_size:-?}"
  local root_avail
  root_avail="$(df -h / | awk 'NR==2{print $4}' || echo '?')"
  root_avail="${root_avail:-?}"
  local line
  printf -v line '[nolo-ci-disk] %-28s work=%5s root_avail=%s' "$label" "$ws_size" "$root_avail"
  printf '%s\n' "$line"
  printf '%s\n' "$line" >> "$SNAPSHOT_FILE"
}

space_analysis() {
  echo ""
  echo "=== Space Analysis ==="
  echo ""
  echo "## Phase Timeline (workspace size + root available)"
  if [[ -f "$SNAPSHOT_FILE" && -s "$SNAPSHOT_FILE" ]]; then
    cat "$SNAPSHOT_FILE"
  else
    echo "  (no snapshots collected)"
  fi
  echo "## Persistent (survives deploys)"
  printf "  %-35s %s\n" "REPO_DIR/.git" "$(du -sh "$REPO_DIR/.git" 2>/dev/null | cut -f1 || echo '?')"
  printf "  %-35s %s\n" "REPO_DIR/node_modules" "$(du -sh "$REPO_DIR/node_modules" 2>/dev/null | cut -f1 || echo '?')"
  printf "  %-35s %s (%s files)\n" "REPO_DIR/public" "$(du -sh "$REPO_DIR/public" 2>/dev/null | cut -f1 || echo '?')" "$(find "$REPO_DIR/public" -type f 2>/dev/null | wc -l)"
  printf "  %-35s %s\n" "/root/.bun (bun cache)" "$(du -sh /root/.bun 2>/dev/null | cut -f1 || echo '?')"
  printf "  %-35s %s\n" "/root/.pm2/logs" "$(du -sh /root/.pm2/logs 2>/dev/null | cut -f1 || echo '?')"
  echo ""
  echo "## Ephemeral (cleaned after deploy)"
  local ws_root="${NOLO_CI_WORKSPACE_ROOT:-/var/tmp/nolo-ci-workspaces}"
  printf "  %-35s %s\n" "$ws_root" "$(du -sh "$ws_root" 2>/dev/null | cut -f1 || echo 'empty')"
  echo ""
  echo "## Root FS"
  df -h / | tail -1
  echo ""
  echo "## Recommendations"
  local public_files
  public_files="$(find "$REPO_DIR/public/assets" -name 'entry-*.js' 2>/dev/null | wc -l)"
  if [[ "$public_files" -gt 5 ]]; then
    echo "  ⚠️  $public_files old entry-*.js files in public/assets — consider pruning hashed assets >7 days old"
  fi
  local bun_cache_size
  bun_cache_size="$(du -sk /root/.bun 2>/dev/null | cut -f1 || echo 0)"
  if [[ "$bun_cache_size" -gt 1048576 ]]; then
    echo "  ⚠️  bun cache >1 GB ($(du -sh /root/.bun 2>/dev/null | cut -f1)) — run 'bun pm cache rm' periodically"
  fi
  local pm2_log_size
  pm2_log_size="$(du -sk /root/.pm2/logs 2>/dev/null | cut -f1 || echo 0)"
  if [[ "$pm2_log_size" -gt 102400 ]]; then
    echo "  ⚠️  PM2 logs >100 MB ($(du -sh /root/.pm2/logs 2>/dev/null | cut -f1)) — configure log rotation"
  fi
  local root_avail_kb
  root_avail_kb="$(df -k / | awk 'NR==2{print $4}')"
  if [[ "$root_avail_kb" -lt 2097152 ]]; then
    echo "  🔴 Root FS <2 GB free — urgent cleanup needed"
  elif [[ "$root_avail_kb" -lt 5242880 ]]; then
    echo "  🟡 Root FS <5 GB free — plan cleanup"
  else
    echo "  🟢 Root FS healthy"
  fi
  echo ""
}

timed_phase() {
  local phase="$1"
  shift
  local start_ms finish_ms duration_ms status
  local timing_line
  start_ms="$(epoch_millis)"
  # set -e 会在命令失败时立刻终止脚本——如果直接写 `"$@"`，失败相位就来不及
  # 打印下面那行 [nolo-ci-phase] 标记。后果是 phaseTimings 里只剩成功的相位，
  # 「到底哪一步挂了」变成不可知，nolo-ci 只好回退去扫日志猜错误原因（那个
  # 启发式会把无关的早期输出当成根因报出来）。用 `|| status=$?` 接住失败，
  # 标记照常打印，再由末尾的 `return "$status"` 把失败原样传播出去。
  status=0
  "$@" || status=$?
  finish_ms="$(epoch_millis)"
  duration_ms="$((finish_ms - start_ms))"
  printf -v timing_line '[nolo-ci-phase] phase=%s status=%s durationMs=%s startedMs=%s finishedMs=%s' \
    "$phase" "$status" "$duration_ms" "$start_ms" "$finish_ms"
  printf '%s\n' "$timing_line"
  PHASE_TIMING_LINES+=("$timing_line")
  return "$status"
}

print_phase_timing_summary() {
  log "Nolo CI phase timing summary"
  local timing_line
  for timing_line in "${PHASE_TIMING_LINES[@]}"; do
    printf '%s\n' "$timing_line"
  done
}

fail() {
  printf '[alpha-server-ci] %s\n' "$*" >&2
  exit 1
}

require_alpha_server() {
  [[ -d "$REPO_DIR/.git" ]] || fail "Missing alpha checkout: $REPO_DIR"
  [[ -e "$WORK_DIR/.git" ]] || fail "Missing alpha work checkout: $WORK_DIR"
  [[ -x "$BUN_BIN" ]] || fail "Bun executable not found or not executable: $BUN_BIN"
  cd "$WORK_DIR"
}

sync_alpha_checkout() {
  require_alpha_server
  log "Sync alpha checkout"
  if [[ "$SKIP_WORK_SYNC" == "1" && -n "$BUILD_SHA" ]]; then
    local current_head
    current_head="$(git rev-parse HEAD)"
    if [[ "$current_head" != "$BUILD_SHA" ]]; then
      fail "NOLO_ALPHA_SKIP_WORK_SYNC=1 but WORK_DIR is at ${current_head}, expected ${BUILD_SHA}"
    fi
    export BUILD_SHA
    return
  fi
  git fetch --all
  if [[ -n "$BUILD_SHA" ]]; then
    git reset --hard "$BUILD_SHA"
  else
    git reset --hard origin/alpha
    BUILD_SHA="$(git rev-parse HEAD)"
  fi
  export BUILD_SHA
}

sync_alpha_runtime_checkout() {
  if [[ "$WORK_DIR" == "$REPO_DIR" ]]; then
    [ -f "$REPO_DIR/packages/server/.render-dist/render.mjs" ] || {
      echo "FATAL: packages/server/.render-dist/render.mjs missing in $REPO_DIR after sync_alpha_runtime_checkout" >&2
      exit 1
    }
    return
  fi

  log "Sync alpha runtime checkout"
  cd "$REPO_DIR"
  git fetch --all
  git reset --hard "$BUILD_SHA"
  # 解包/同步 SSR render-dist 产物到运行时目录
  if [[ -f "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar" ]]; then
    tar -xf "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar" -C "$REPO_DIR" packages/server/.render-dist 2>/dev/null || {
      echo "WARN: failed to extract packages/server/.render-dist from artifact" >&2
    }
  elif [[ -d "$WORK_DIR/packages/server/.render-dist" ]]; then
    mkdir -p "$REPO_DIR/packages/server/.render-dist"
    cp -R "$WORK_DIR/packages/server/.render-dist"/. "$REPO_DIR/packages/server/.render-dist"/
  fi
  cd "$WORK_DIR"

  # 机械化守卫：同步后断言运行时目录中的 SSR render bundle 存在
  [ -f "$REPO_DIR/packages/server/.render-dist/render.mjs" ] || {
    echo "FATAL: packages/server/.render-dist/render.mjs missing in $REPO_DIR after sync_alpha_runtime_checkout" >&2
    exit 1
  }
}

cleanup_alpha_tmp_rebuildable_state() {
  rm -rf /tmp/nolo-web-build-*.tar /tmp/nolo-web-build-*.tar.gz || true
  find /tmp -mindepth 1 -maxdepth 1 \( \
    -name 'systemd-private-*' -prune -o \
    -type d \( \
      -name 'nolo-main-web-build-*' -o \
      -name 'nolo-alpha-ci-leveldb-*' -o \
      -name 'nolo-app-*-leveldb' -o \
      -name 'nolo-alpha-app-audit-*' -o \
      -name 'nolo-domain-audit-*' -o \
      -name 'nolo-alpha-content-rootcause-*' -o \
      -name 'nolo-cli-runtime-*' -o \
      -name 'nolo-machine-workspace-*' -o \
      -name 'nolo-machine-cli-workspace-*' -o \
      -name 'playwright-download-*' -o \
      -name '.*.react-native-skia' -o \
      -name '.*.react-icons' -o \
      -name '.*.mermaid' \
    \) -mmin +30 -exec rm -rf {} + \
  \) || true
  local ws_root="${NOLO_CI_WORKSPACE_ROOT:-/var/tmp/nolo-ci-workspaces}"
  if [[ -d "$ws_root" ]]; then
    find "$ws_root" -mindepth 1 -maxdepth 1 -type d -mmin +30 -exec rm -rf {} + || true
  fi
  # Legacy path
  if [[ -d /tmp/nolo-ci-workspaces ]]; then
    find /tmp/nolo-ci-workspaces -mindepth 1 -maxdepth 1 -type d -mmin +30 -exec rm -rf {} + || true
  fi
}

cleanup_rebuildable_state() {
  # Runner _temp/_work cleanup is owned by cleanup_alpha_runner_work (active-worker guard).
  cleanup_alpha_runner_work
  df -h /
  cleanup_alpha_tmp_rebuildable_state
  prune_old_public_assets
  find "$WORK_DIR" -maxdepth 1 -type f -name 'core*' -delete || true
  find /var/lib/apport/coredump -maxdepth 1 -type f -name 'core._root__bun_bin_bun.*' -delete || true
  "$PM2_BIN" flush || true
  cleanup_var_lib_rebuildable
  df -h /
}
cleanup_alpha_runner_work() {
  if [[ ! -d "$ALPHA_RUNNER_DIR" ]]; then
    return 0
  fi
  log "Cleanup self-hosted runner disk"
  NOLO_ALPHA_RUNNER_DIR="$ALPHA_RUNNER_DIR" \
    bash "$REPO_DIR/scripts/ops/cleanupAlphaRunnerWorkCore.sh" || true
}


prune_old_public_assets() {
  local public_dir="${1:-$REPO_DIR/public/assets}"
  local max_age_days="${2:-3}"
  [[ -d "$public_dir" ]] || return 0

  local before_count before_size
  before_count="$(find "$public_dir" -type f 2>/dev/null | wc -l)"
  before_size="$(du -sh "$public_dir" 2>/dev/null | cut -f1)"

  find "$public_dir" -type f \( -name 'entry-*.js' -o -name 'entry-*.css' -o -name 'chunk-*.js' \) \
    -mtime "+${max_age_days}" -delete 2>/dev/null || true

  local after_count after_size
  after_count="$(find "$public_dir" -type f 2>/dev/null | wc -l)"
  after_size="$(du -sh "$public_dir" 2>/dev/null | cut -f1)"

  local removed=$((before_count - after_count))
  if [[ "$removed" -gt 0 ]]; then
    echo "[nolo-ci-disk] pruned ${removed} old hashed assets (>${max_age_days}d) in public/assets: ${before_size} → ${after_size}"
  fi
}

install_dependencies() {
  log "Install dependencies"
  cd "$WORK_DIR"
  for attempt in 1 2 3; do
    if [[ "$attempt" == "1" ]]; then
      echo "♻️ 尝试复用现有 CI 依赖..."
    else
      cleanup_install_state
    fi
    if "$BUN_BIN" install --frozen-lockfile; then
      if "$BUN_BIN" ./scripts/dev/workspaceLinkGuard.ts && \
         "$BUN_BIN" -e 'await import("ai/llm/kimi"); await import("ai/llm/providers"); await import("slate"); await import("immer"); await import("react-dom"); await import("@floating-ui/dom"); await import("echarts"); await import("date-fns"); await import("mdast-util-gfm"); await import("micromark-extension-gfm"); await import("micromark-util-chunked");'; then
        return
      fi

      printf 'workspace dependency guard failed after bun install on attempt %s\n' "$attempt" >&2
    fi

    printf 'bun install failed on attempt %s\n' "$attempt" >&2
    if [[ "$attempt" == "3" ]]; then
      return 1
    fi
    cleanup_install_state
    sleep "$((attempt * 10))"
  done
}

cleanup_install_state() {
  local target
  for cleanup_attempt in 1 2 3; do
    rm -rf "$WORK_DIR/node_modules" "$HOME/.bun/install/cache" || true
    for target in "$WORK_DIR/node_modules" "$HOME/.bun/install/cache"; do
      if [[ -d "$target" ]]; then
        find "$target" -mindepth 1 -depth -exec rm -rf {} + 2>/dev/null || true
        rmdir "$target" 2>/dev/null || true
      fi
    done
    if [[ ! -e "$WORK_DIR/node_modules" && ! -e "$HOME/.bun/install/cache" ]]; then
      return
    fi
    printf 'install state cleanup failed on attempt %s; retrying\n' "$cleanup_attempt" >&2
    sleep "$((cleanup_attempt * 2))"
  done
  rm -rf "$WORK_DIR/node_modules" "$HOME/.bun/install/cache" || true
}

verify_server_imports() {
  log "Verify server entry imports (resolve-only, no side effects)"
  cd "$WORK_DIR"
  "$BUN_BIN" scripts/verify/verifyServerImports.ts
}

run_deploy_tests() {
  log "Run alpha deploy tests"
  cd "$WORK_DIR"
  local test_db_dir="/tmp/nolo-alpha-ci-leveldb-${RUN_ID}"
  rm -rf "$test_db_dir"
  # 走 runTestsIsolated 而不是裸 `bun test <files>`，两个原因，都实测踩过：
  #
  # 1. 清单里有 3 个文件用 mock.module（chatHandler 12 处、databaseRoutes 6 处、
  #    chatUpstreamRetry 1 处）。`--max-concurrency 1` 控制的是**测试**并发，不是
  #    进程隔离——这些文件仍在同一进程里，mock 会跨文件泄漏。决定代码能否上生产
  #    的门槛不该有顺序依赖。runTestsIsolated 会把含 mock.module 的文件单独起进程。
  #
  # 2. 裸 `bun test` 对**匹配不到的文件路径静默忽略**，照样报绿。清单里的
  #    packages/database/server/dbPath.test.ts 在 e93081722 拆 database-engine
  #    时就搬走了，此后一直没跑过，而门槛始终是绿的（本次一并修正路径）。
  #    runTestsIsolated 会把它算作失败。
  #
  # 实测两种跑法耗时相同（各约 5s），没有为此付出部署时间。
  NOLO_SERVER_DB_PATH="$test_db_dir" \
    "$BUN_BIN" scripts/runTestsIsolated.ts \
      scripts/ci/runAlphaServerCi.source.test.ts \
      scripts/ci/cf-build-client.test.ts \
      scripts/ci/classifyDeployChanges.test.ts \
      scripts/ops/restartNoloCiAfterJob.test.ts \
      packages/nolo-ci/core/src/scheduler.test.ts \
      packages/nolo-ci/service/src/releaseControlProjector.test.ts \
      scripts/release/deployRemote.source.test.ts \
      scripts/runTestsIsolatedHelpers.test.ts \
      scripts/ci/workflowCostPolicy.test.ts \
      packages/server/handlers/__tests__/chatProxyRouting.test.ts \
      packages/server/handlers/__tests__/chatUpstreamRetry.test.ts \
      packages/server/handlers/agentRun/loop.fireworksFallback.test.ts \
      packages/server/handlers/agentRun/executionKernel.test.ts \
      packages/server/handlers/agentRun/backgroundRunEffect.test.ts \
      packages/server/handlers/agentRun/agentRunControlHandler.test.ts \
      packages/server/handlers/chatHandler.test.ts \
      packages/server/databaseRoutes.test.ts \
      packages/server/renderBundleSsrProbe.source.test.ts \
      packages/ai/llm/modelRegistry.test.ts \
      packages/database-engine/dbPath.test.ts
  rm -rf "$test_db_dir"
}

ensure_alpha_artifact_disk_space() {
  local available_kb
  available_kb="$(df -Pk "$ARTIFACT_DIR" | awk 'NR == 2 { print $4 }')"
  printf 'alpha artifact disk check: available=%sKB required=%sKB path=%s\n' "$available_kb" "$MIN_FREE_KB" "$ARTIFACT_DIR"
  if ((available_kb >= MIN_FREE_KB)); then
    return 0
  fi
  return 1
}

report_disk_usage() {
  log "Disk usage summary"
  df -h / /var/lib 2>/dev/null || df -h /
  echo "--- /var/lib breakdown (top 20) ---"
  du -sh /var/lib/* 2>/dev/null | sort -hr | head -20 || true
  echo "--- CI cache breakdown ---"
  du -sh "$HOME/.bun/install/cache" "$HOME/.cache/ms-playwright" 2>/dev/null | sort -hr || true
}

cleanup_var_lib_rebuildable() {
  log "Cleanup rebuildable /var/lib state"
  apt-get clean || true
  journalctl --vacuum-size=200M || true
  docker system prune -f --volumes || true
}

preflight_disk_check() {
  local available_kb
  available_kb="$(df -Pk / | awk 'NR == 2 { print $4 }')"
  printf 'preflight disk check: available=%sKB warn=%sKB min=%sKB\n' "$available_kb" "$DISK_WARN_KB" "$DISK_MIN_KB"
  if ((available_kb < DISK_MIN_KB)); then
    report_disk_usage
    fail "root filesystem too low on space: ${available_kb}KB available, minimum ${DISK_MIN_KB}KB required; consider expanding the server disk"
  fi
  if ((available_kb < DISK_WARN_KB)); then
    report_disk_usage
    echo "WARNING: root filesystem space is low; continuing but consider cleanup or expansion"
  fi
}

# 尽力而为的产物持久归档（非关键路径）：把已打包好的 tar.gz 复制到
# NOLO_ARTIFACT_ARCHIVE_DIR，命名 <kind>-<shortsha>.tar.gz，并写同路径 .meta.json。
# 归档失败只打警告、绝不阻塞部署（部署行为不受本步影响）。
# 保留策略：同 kind 只留最近 10 份，超出删最旧（打包后清理）。
# 本函数函数级 fail-open：全部外部命令与输出均已独立保护，调用点另有 || 兜底；内置 echo/local/[[ 不视为可失败点。
archive_web_artifact() {
  local kind="$1"
  local src_tar_gz="$2"
  local shortsha
  shortsha="${BUILD_SHA:0:12}"
  if [[ -z "$shortsha" || ! -f "$src_tar_gz" ]]; then
    echo "WARNING: archive_web_artifact skipped (kind=$kind src=$src_tar_gz sha=$shortsha)" || true
    return 0
  fi
  local archive_dir="$NOLO_ARTIFACT_ARCHIVE_DIR"
  local dest="$archive_dir/${kind}-${shortsha}.tar.gz"
  local meta="$archive_dir/${kind}-${shortsha}.meta.json"
  mkdir -p "$archive_dir" || { echo "WARNING: cannot create archive dir $archive_dir" || true; return 0; }
  if ! cp -f "$src_tar_gz" "$dest"; then
    echo "WARNING: artifact archive copy failed for $dest" || true
    return 0
  fi
  # tar.gz 已归档成功。meta 只是元数据，写失败仅告警、不阻塞 artifact-path 输出。
  if ! {
    local bytes created_at
    bytes="$(wc -c < "$dest" | tr -d '[:space:]')"
    created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    cat > "$meta" <<EOF
{"sha":"$BUILD_SHA","kind":"$kind","bytes":$bytes,"created_at":"$created_at"}
EOF
  }; then
    echo "WARNING: artifact meta write failed for $meta (tar.gz already archived)" || true
  fi
  # 归档完全成功后才输出 artifact-path，避免 commandRunner 记录不存在的文件。
  echo "artifact-path=$dest" || true
  # 保留策略：同 kind 只留最近 10 份，超出删最旧（按 mtime 排序）。
  # 扫描与清理均为尽力而为：任一子命令失败只告警、不阻塞部署（函数级 fail-open）。
  # 注意：if 条件内的赋值失败不会触发 errexit（条件上下文豁免），返回值语义即所需。
  local stale=""
  if ! stale="$(find "$archive_dir" -maxdepth 1 -type f -name "${kind}-*.tar.gz" -printf '%T@ %p\n' 2>/dev/null | sort -nr | tail -n +11 | awk '{print $2}')"; then
    echo "WARNING: artifact prune scan failed (non-blocking)" || true
    return 0
  fi
  if [[ -n "$stale" ]]; then
    if ! { echo "$stale" | while IFS= read -r f; do
      rm -f "$f" "${f%.tar.gz}.meta.json" 2>/dev/null || true
    done; }; then
      echo "WARNING: artifact prune loop failed (non-blocking)" || true
    fi
  fi
  return 0
}

package_web_artifact() {
  log "Package web artifact"
  cd "$WORK_DIR"
  mkdir -p "$ARTIFACT_DIR"
  rm -f "$ARTIFACT_DIR"/nolo-web-build-*.tar "$ARTIFACT_DIR"/nolo-web-build-*.tar.gz /tmp/nolo-web-build-*.tar /tmp/nolo-web-build-*.tar.gz

  # BLOCK-1（产物消费链）：offload 成功时直接消费 CF 下载的 tar.gz 交接产物，
  # 不再从 public/ 重新打包（宿主 build_web 已跳过，public/ 不是本次构建产物）。
  # 清掉旧产物后，把 CF 下载文件接上 package→deploy 的精确交接点：
  #   package 产出 nolo-web-build-<sha>.tar(.gz)，deploy 消费 nolo-web-build-<sha>.tar。
  if [[ -n "$CF_OFFLOAD_ARTIFACT_TAR_GZ" && -s "$CF_OFFLOAD_ARTIFACT_TAR_GZ" ]]; then
    local cf_tar_gz_bytes
    cf_tar_gz_bytes="$(wc -c < "$CF_OFFLOAD_ARTIFACT_TAR_GZ" | tr -d '[:space:]')"
    # 先清除本地 package 旧产物（防误用旧构建），再放 CF 产物到 deploy 消费的精确路径。
    rm -f "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar" "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar.gz"
    # 保留 CF 交付的 gzip 原始字节作为归档源（与 package_web_artifact 的 .tar.gz 对齐）。
    cp -f "$CF_OFFLOAD_ARTIFACT_TAR_GZ" "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar.gz"
    # deployRemote.sh 消费的是未压缩 .tar（tar -xf）；由 CF 下载 tar.gz 解出。
    gzip -dc "$CF_OFFLOAD_ARTIFACT_TAR_GZ" > "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar"
    # 将 SSR render-dist 产物追加到 artifact tar 中
    if [[ -d packages/server/.render-dist ]]; then
      tar -rf "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar" packages/server/.render-dist
      gzip -c "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar" > "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar.gz" 2>/dev/null || true
    fi
    local cf_tar_bytes
    cf_tar_bytes="$(wc -c < "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar" | tr -d '[:space:]')"
    # 双端 sha/字节数证明部署的就是 CF 产物。
    echo "CF offload artifact consumed: src=$CF_OFFLOAD_ARTIFACT_TAR_GZ"
    echo "  tar.gz sha=$(shasum -a 256 "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar.gz" | awk '{print $1}') bytes=$(wc -c < "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar.gz" | tr -d '[:space:]')"
    echo "  tar    sha=$(shasum -a 256 "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar" | awk '{print $1}') bytes=$cf_tar_bytes"
    archive_web_artifact "alpha" "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar.gz" || printf 'artifact archive failed (non-blocking, deploy continues)\n' >&2
    return 0
  fi

  cleanup_alpha_tmp_rebuildable_state

  if ! ensure_alpha_artifact_disk_space; then
    echo "alpha artifact disk space low; cleaning CI install state and retrying disk check"
    cleanup_install_state
    if ! ensure_alpha_artifact_disk_space; then
      fail "Insufficient alpha artifact disk space before packaging: required=${MIN_FREE_KB}KB path=${ARTIFACT_DIR}"
    fi
  fi

  local asset_dir
  asset_dir="$(python3 - <<'PY'
import json

base_path = json.load(open("public/latest-assets.json"))["basePath"]
print(base_path.strip("/").rstrip("/"))
PY
)"

  mkdir -p packages/server/.render-dist

  tar -cf "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar" \
    public/latest-assets.json \
    public/meta.json \
    "$asset_dir" \
    public/locales \
    public/route-styles \
    packages/server/.render-dist

  # 产物持久归档（尽力而为，失败不阻塞部署）
  gzip -c "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar" > "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar.gz" 2>/dev/null || true
  archive_web_artifact "alpha" "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar.gz" || printf 'artifact archive failed (non-blocking, deploy continues)\n' >&2
  return 0
}

alpha_core_restart_required() {
  local prev_head="${1:-}"
  [[ -n "$prev_head" ]] || return 0

  # Keep this allowlist deliberately narrow: only files that are packaged into
  # the browser artifact may skip the core restart. Server-specific patterns
  # must stay before shared frontend package patterns below; otherwise a future
  # packages/auth/server/* edit could be swallowed by packages/auth/*.
  while IFS= read -r changed_path; do
    case "$changed_path" in
      packages/server/*|packages/nolo-ci/*|packages/ai/server/*|packages/auth/server/*|packages/database/server/*|packages/share/server/*|packages/billing/*|packages/agent-runtime/*|packages/database-engine/*|packages/leveldb/*|packages/integrations/*|package.json|bun.lock|scripts/*|.github/*)
        return 0
        ;;
      packages/web/*|packages/app/*|packages/chat/*|packages/auth/*|packages/database/*|packages/share/*|public/*)
        ;;
      *)
        return 0
        ;;
    esac
  done < <(git diff --name-only "$prev_head" HEAD)
  return 1
}

schedule_nolo_ci_restart_after_job() {
  local job_id="${NOLO_DEPLOY_JOB_ID:-}"
  if [[ -z "$job_id" ]]; then
    echo "WARNING: nolo-ci changed but NOLO_DEPLOY_JOB_ID is empty; leaving the current scheduler running"
    return 0
  fi
  if ! command -v setsid >/dev/null 2>&1; then
    echo "WARNING: nolo-ci changed but setsid is unavailable; leaving the current scheduler running"
    return 0
  fi

  local log_dir="${NOLO_CI_RESTART_LOG_DIR:-/root/.nolo-ci}"
  local log_file="$log_dir/restart-after-job.log"
  mkdir -p "$log_dir"

  # This command is itself a child of nolo-ci. Restarting PM2 here would kill
  # the scheduler before it persists this job's success, so startup recovery
  # would rewrite an otherwise successful deploy as "interrupted". Detach a
  # watcher instead; it restarts only after /status exposes durable success.
  setsid -f env \
    NOLO_REPO_DIR="$REPO_DIR" \
    NOLO_BUN_BIN="$BUN_BIN" \
    NOLO_PM2_BIN="$PM2_BIN" \
    PM2_HOME="$PM2_HOME" \
    "$BUN_BIN" "$REPO_DIR/scripts/ops/restartNoloCiAfterJob.ts" "$job_id" \
    </dev/null >>"$log_file" 2>&1
  echo "🔁 nolo-ci core logic changed; restart scheduled after job ${job_id} succeeds"
}

gen_diag_token() {
  # SSR 自检端点的部署级随机 token（生命周期 = 单次部署/维护窗口）。
  # 不落盘、不进日志：只经环境变量注入 pm2 env，并由探针经请求头回传。
  openssl rand -hex 16 2>/dev/null || od -An -N16 -tx1 /dev/urandom | tr -d ' \n'
}

deploy_alpha_artifact() {
  # 机械化守卫：alpha 启动/部署前断言 SSR render bundle 存在
  [ -f "$REPO_DIR/packages/server/.render-dist/render.mjs" ] || {
    echo "FATAL: packages/server/.render-dist/render.mjs missing in $REPO_DIR before deploy_alpha_artifact" >&2
    return 1
  }

  local prev_head="${1:-}"
  local skip_core_reload=0
  if ! alpha_core_restart_required "$prev_head"; then
    skip_core_reload=1
    echo "♻️ 仅浏览器 artifact 变更；跳过 nolo 核心重启"
  else
    echo "🔄 检测到非纯前端变更；执行 nolo 核心重启"
  fi
  # canary「就绪后再进场」（NOLO_BLUE_GREEN_DEFER_LISTEN=1）：alpha 与 main 都开。
  #
  # 依据（均为生产实测）：
  # - 开关关闭时 canary 一 bind 就进 reuseport 组、被内核按 hash 分到真实连接，
  #   而它还在等旧进程释放 LevelDB 锁（alpha 实测 2810/3885ms 无 DB 窗口）。
  # - 开启后 alpha 连续多次部署该窗口为 0（日志 "无 DB 暴露窗口 0ms"）。
  # - main 开启前的基线（2026-08-22 07:40 首次 main 部署，开关关闭）：部署窗口探针
  #   samples=102 failures=15 maxDurationMs=5015，其中 7 个 root 请求被 readiness
  #   门驻留到探针 5s 超时。这 7 个**结构上只可能**落在「已 bind 但没有 DB 的
  #   canary」上——旧进程 dbReady 恒为 true，drain 期只会立刻回 503，从不驻留。
  #   即它们正是 defer 消除的那一段。
  #
  # 代价：旧进程摘 listener 到 canary bind 之间有一小段无人监听（alpha 空载实测
  # 76~118ms；main 有真实在途流量，可能到秒级），由 Caddy lb_try_duration 60s
  # 重试拨号有界吸收，PM2 kill-timeout 65s 保证锁必然释放。
  #
  # 首次 main defer 部署的判读口径（先写下来，免得把成功读成回归）：
  #   预期 = 那 7 个 >5s 驻留消失（failures 显著下降），
  #          同时 gap 期间 duration 轻微上升（Caddy 重试，秒级）——后者是成功不是变差。
  #   对照基线 failures=15 / maxDurationMs=5015，另看服务端 [auth] 计数器窗口内
  #   AUTH_STORE_UNAVAILABLE / AUTH_ACCOUNT_INVALID 是否为 0。
  #
  # ⚠️ 注意：注释只能放在这里。上面那串 `VAR=... \` 是同一条命令的续行，
  # 中间插入注释会把 env 列表拦腰截断，deployRemote.sh 将丢失 REPO_DIR /
  # PM2_BIN / ARTIFACT_PATH 等变量——而 `bash -n` 检查不出来。
  log "Deploy alpha artifact"
  cd "$WORK_DIR"
  NOLO_SKIP_CORE_RELOAD="$skip_core_reload" \
  NOLO_BRANCH=alpha \
  NOLO_RELEASE_SHA="$BUILD_SHA" \
  NOLO_DEPLOY_JOB_ID="${NOLO_DEPLOY_JOB_ID:-}" \
  NOLO_REPO_DIR="$REPO_DIR" \
  NOLO_BUN_BIN="$BUN_BIN" \
  NOLO_PM2_BIN="$PM2_BIN" \
  NOLO_USE_SUDO=0 \
  NOLO_SKIP_GIT_SYNC=1 \
  NOLO_PROXY_MODE=caddy \
  NOLO_CADDY_HOSTS="us.nolo.chat,crm.nolo.chat,date.nolo.chat" \
  NOLO_CADDY_PREVIEW_SLOTS="$PREVIEW_SLOTS" \
  NOLO_BLUE_GREEN=1 \
  NOLO_BLUE_GREEN_DEFER_LISTEN=1 \
  NOLO_WEB_HOSTED_EXEC_RUNTIME=1 \
  NOLO_HOSTED_WORKSPACE_ROOT=/tmp/nolo-hosted-workspaces \
  NOLO_MIN_FREE_KB="$MIN_FREE_KB" \
  NOLO_ARTIFACT_PATH="$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar" \
  NOLO_PM2_KILL_TIMEOUT=40000 \
  NOLO_SERVICE_HEALTH_URL="$ALPHA_LOCAL_BASE/ready" \
  NOLO_DEPLOY_WINDOW_PUBLIC_PROBE_URL="$ALPHA_PUBLIC_BASE/health" \
  NOLO_CI_DIAG=1 \
  NOLO_CI_DIAG_TOKEN="${SSR_SELFCHECK_TOKEN:-}" \
  bash ./scripts/release/deployRemote.sh

  NOLO_REPO_DIR="$REPO_DIR" \
  NOLO_BUN_BIN="$BUN_BIN" \
  bash ./scripts/ops/restartAlphaConnector.sh

  if [[ -n "$prev_head" ]]; then
    if git diff --name-only "$prev_head" HEAD \
      | grep -Eq '^(packages/nolo-ci/|scripts/ops/restartNoloCiAfterJob\.ts$)'; then
      schedule_nolo_ci_restart_after_job
    fi
  fi
}

ensure_main_release_checkout() {
  log "Sync dedicated main release checkout"
  mkdir -p "$(dirname "$MAIN_RELEASE_DIR")"
  if [[ ! -d "$MAIN_RELEASE_DIR/.git" ]]; then
    git clone "$REPO_DIR" "$MAIN_RELEASE_DIR"
  fi
  cd "$MAIN_RELEASE_DIR"
  WORK_DIR="$MAIN_RELEASE_DIR"
  git remote set-url origin "$(cd "$REPO_DIR" && git remote get-url origin)"
  git fetch origin main
  if [[ -n "$BUILD_SHA" ]]; then
    git reset --hard "$BUILD_SHA"
  else
    git reset --hard origin/main
    BUILD_SHA="$(git rev-parse HEAD)"
  fi
  export BUILD_SHA
}

main_package_web_artifact() {
  log "Package main web artifact"
  local asset_dir
  asset_dir="$(python3 - <<'PY'
import json

base_path = json.load(open("public/latest-assets.json"))["basePath"]
print(base_path.strip("/").rstrip("/"))
PY
)"

  mkdir -p packages/server/.render-dist

  tar -czf web-build.tar.gz \
    public/latest-assets.json \
    public/meta.json \
    "$asset_dir" \
    public/locales \
    public/route-styles \
    packages/server/.render-dist

  # 产物持久归档（尽力而为，失败不阻塞部署）
  archive_web_artifact "main" "$WORK_DIR/web-build.tar.gz" || printf 'artifact archive failed (non-blocking, deploy continues)\n' >&2
}

prepare_production_ssh_key() {
  local key_path="${NOLO_PRODUCTION_SSH_KEY_PATH:-}"
  if [[ -n "$key_path" ]]; then
    [[ -f "$key_path" ]] || fail "NOLO_PRODUCTION_SSH_KEY_PATH does not exist: $key_path"
    printf '%s\n' "$key_path"
    return
  fi

  if [[ -n "${NOLO_PRODUCTION_SSH_KEY:-}" ]]; then
    local ssh_dir="${RUNNER_TEMP:-/tmp}/nolo-main-release-ssh"
    mkdir -p "$ssh_dir"
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    chmod 700 "$ssh_dir"
    key_path="$ssh_dir/id_ed25519"
    printf '%s\n' "$NOLO_PRODUCTION_SSH_KEY" > "$key_path"
    chmod 600 "$key_path"
    printf '%s\n' "$key_path"
    return
  fi

  # Fallback: check standard default keys in ~/.ssh
  for candidate in ~/.ssh/id_ed25519 ~/.ssh/id_rsa; do
    if [[ -f "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return
    fi
  done

  fail "NOLO_PRODUCTION_SSH_KEY, NOLO_PRODUCTION_SSH_KEY_PATH or a default ~/.ssh key is required"
}

main_remote_artifact_path() {
  printf '/tmp/nolo-main-web-build-%s-%s/web-build.tar.gz\n' "$RUN_ID" "$BUILD_SHA"
}

upload_main_artifact() {
  log "Upload main web artifact"
  local key_path="$1"
  local remote_artifact
  remote_artifact="$(main_remote_artifact_path)"

  mkdir -p ~/.ssh
  chmod 700 ~/.ssh
  ssh-keyscan -H "$PRODUCTION_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true

  local artifact_bytes artifact_kb required_kb
  artifact_bytes="$(wc -c < web-build.tar.gz | tr -d '[:space:]')"
  artifact_kb="$(((artifact_bytes + 1023) / 1024))"
  required_kb="$((artifact_kb + 262144))"

  ssh -i "$key_path" -o IdentitiesOnly=yes "${PRODUCTION_USER}@${PRODUCTION_HOST}" \
    "REMOTE_ARTIFACT='${remote_artifact}' REMOTE_UPLOAD_REQUIRED_KB='${required_kb}' bash -s" <<'REMOTE'
set -euo pipefail
remote_dir="$(dirname "$REMOTE_ARTIFACT")"
rm -rf "$remote_dir"
mkdir -p "$remote_dir"
find /tmp -mindepth 1 -maxdepth 1 -type d -name 'nolo-main-web-build-*' -mmin +120 -exec rm -rf {} + 2>/dev/null || true
rm -f /tmp/nolo-web-build-*.tar.gz
available_kb="$(df -Pk "$remote_dir" | awk 'NR == 2 { print $4 }')"
echo "remote artifact disk check: available=${available_kb}KB required=${REMOTE_UPLOAD_REQUIRED_KB}KB path=${remote_dir}"
if ((available_kb < REMOTE_UPLOAD_REQUIRED_KB)); then
  echo "::error::Insufficient remote disk space before upload: available=${available_kb}KB required=${REMOTE_UPLOAD_REQUIRED_KB}KB path=${remote_dir}"
  exit 1
fi
REMOTE

  scp -i "$key_path" -o IdentitiesOnly=yes web-build.tar.gz "${PRODUCTION_USER}@${PRODUCTION_HOST}:${remote_artifact}"
}

deploy_main_remote() {
  log "Deploy main on production"
  local key_path="$1"
  local remote_artifact
  remote_artifact="$(main_remote_artifact_path)"
  ssh -i "$key_path" -o IdentitiesOnly=yes "${PRODUCTION_USER}@${PRODUCTION_HOST}" \
    "BUILD_SHA='${BUILD_SHA}' DEPLOY_JOB_ID='${NOLO_DEPLOY_JOB_ID:-}' REMOTE_ARTIFACT='${remote_artifact}' PRODUCTION_REPO_DIR='${PRODUCTION_REPO_DIR}' PRODUCTION_PM2_BIN='${PRODUCTION_PM2_BIN}' PRODUCTION_PM2_HOME='${PRODUCTION_PM2_HOME}' bash -s" <<'REMOTE'
set -Eeuo pipefail
cd "$PRODUCTION_REPO_DIR"
git fetch --all
git reset --hard "$BUILD_SHA"
BUN_VERSION="$(tr -d '\n' < .bun-version)"
export BUN_INSTALL="${HOME}/.bun"
export PATH="${BUN_INSTALL}/bin:${PATH}"
if [[ -x "${BUN_INSTALL}/bin/bun" ]] && [[ "$("${BUN_INSTALL}/bin/bun" --version)" == "$BUN_VERSION" ]]; then
  echo "✅ Bun version matches, skipping download."
else
  curl -fsSL https://bun.com/install | bash -s "bun-v${BUN_VERSION}"
fi
STABLE_BUN_BIN="${BUN_INSTALL}/bin/bun-nolo-${BUN_VERSION}"
install -m 755 "$(command -v bun)" "$STABLE_BUN_BIN"
BUN_BIN="$STABLE_BUN_BIN"

cd "$PRODUCTION_REPO_DIR" && "$BUN_BIN" install
cd "$PRODUCTION_REPO_DIR" && "$BUN_BIN" scripts/dev/buildRenderBundle.ts

NOLO_BRANCH=main \
NOLO_RELEASE_SHA="$BUILD_SHA" \
NOLO_DEPLOY_JOB_ID="$DEPLOY_JOB_ID" \
NOLO_REPO_DIR="$PRODUCTION_REPO_DIR" \
NOLO_BUN_BIN="$BUN_BIN" \
NOLO_PM2_BIN="$PRODUCTION_PM2_BIN" \
NOLO_PM2_HOME="$PRODUCTION_PM2_HOME" \
NOLO_USE_SUDO=1 \
NOLO_SKIP_GIT_SYNC=1 \
NOLO_PROXY_MODE=caddy \
NOLO_CADDY_HOSTS=nolo.chat \
NOLO_BLUE_GREEN_DEFER_LISTEN=1 \
NOLO_BLUE_GREEN=1 \
NOLO_ARTIFACT_PATH="$REMOTE_ARTIFACT" \
NOLO_PM2_KILL_TIMEOUT=40000 \
NOLO_SERVICE_HEALTH_URL=http://127.0.0.1:38123/ready \
NOLO_DEPLOY_WINDOW_PUBLIC_PROBE_URL=https://nolo.chat/health \
bash ./scripts/release/deployRemote.sh

curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors https://nolo.chat/ready
REMOTE
}

audit_main_remote() {
  log "Repair main deleted-user billing projections"
  local key_path="$1"
  ssh -i "$key_path" -o IdentitiesOnly=yes "${PRODUCTION_USER}@${PRODUCTION_HOST}" \
    "PRODUCTION_REPO_DIR='${PRODUCTION_REPO_DIR}' bash -s" <<'REMOTE'
set -Eeuo pipefail
cd "$PRODUCTION_REPO_DIR"
BUN_VERSION="$(tr -d '\n' < .bun-version)"
export BUN_INSTALL="${HOME}/.bun"
export PATH="${BUN_INSTALL}/bin:${PATH}"
if [[ -x "${BUN_INSTALL}/bin/bun" ]] && [[ "$("${BUN_INSTALL}/bin/bun" --version)" == "$BUN_VERSION" ]]; then
  echo "✅ Bun version matches, skipping download."
else
  curl -fsSL https://bun.com/install | bash -s "bun-v${BUN_VERSION}"
fi

bun scripts/audits/repairRemoteBillingLedgerDeletedUserProjections.ts \
  --base-url http://127.0.0.1:38123 \
  --cluster main \
  --apply
REMOTE

  log "Audit main billing ledger"
  ssh -i "$key_path" -o IdentitiesOnly=yes "${PRODUCTION_USER}@${PRODUCTION_HOST}" \
    "PRODUCTION_REPO_DIR='${PRODUCTION_REPO_DIR}' bash -s" <<'REMOTE'
set -Eeuo pipefail
cd "$PRODUCTION_REPO_DIR"
BUN_VERSION="$(tr -d '\n' < .bun-version)"
export BUN_INSTALL="${HOME}/.bun"
export PATH="${BUN_INSTALL}/bin:${PATH}"
if [[ -x "${BUN_INSTALL}/bin/bun" ]] && [[ "$("${BUN_INSTALL}/bin/bun" --version)" == "$BUN_VERSION" ]]; then
  echo "✅ Bun version matches, skipping download."
else
  curl -fsSL https://bun.com/install | bash -s "bun-v${BUN_VERSION}"
fi

bun scripts/audits/auditRemoteBillingLedger.ts \
  --base-url http://127.0.0.1:38123 \
  --cluster main \
  --legacy-since 2026-05-14T05:59:30.000Z
REMOTE
}

build_web() {
  NODE_ENV=production NOLO_WEB_PRECOMPRESS=1 NOLO_BUILD_SHA="$BUILD_SHA" "$BUN_BIN" run build
  "$BUN_BIN" "$WORK_DIR/scripts/dev/buildRenderBundle.ts"
}

# CF builder offload（scripts/ci/cf-builder/，Step 3b 产品化）：
#   env 门控——仅当 NOLO_CF_BUILDER_URL 与 NOLO_CF_BUILDER_TOKEN 都非空才尝试。
#   流程：POST /build {branch:alpha} → 每 CF_BUILD_POLL_INTERVAL_S 轮询 GET /status
#   至返回非空 head 且 artifactsReady=true（非零 dist）→ GET /artifact 下载到
#   $WORK_DIR/web-build.tar.gz。任一环节失败 → 返回非零，由调用方回退宿主 build_web。
#   所有分支都是显式 fail-open 之外的分支：offload 失败必须回退本地构建（部署永远完成）。
#
#   实现说明：CF 调用 + 轮询 + 下载 + 校验逻辑集中在独立可执行客户端脚本
#   scripts/ci/cf-build-client.sh（便于 bun test 用 mock CF builder 做行为测试）；
#   本函数只做 env 门控、数值校验，并调用客户端脚本，成功时登记产物交接点
#   （CF_OFFLOAD_ARTIFACT_TAR_GZ）供 package_web_artifact 消费。
cf_build_alpha_offload() {
  if [[ -z "$NOLO_CF_BUILDER_URL" || -z "$NOLO_CF_BUILDER_TOKEN" ]]; then
    echo "CF build unavailable, falling back to host build (env not configured)"
    return 1
  fi

  # MEDIUM-1：interval/timeout 必须是非负有限数字，否则视为配置非法回退本地构建。
  local re='^[0-9]+([.][0-9]+)?$'
  if [[ ! "$CF_BUILD_POLL_INTERVAL_S" =~ $re || ! "$CF_BUILD_TIMEOUT_S" =~ $re ]]; then
    echo "CF build unavailable, falling back to host build (invalid poll interval/timeout: interval=${CF_BUILD_POLL_INTERVAL_S} timeout=${CF_BUILD_TIMEOUT_S})"
    return 1
  fi

  local work_dir="$WORK_DIR"
  local expect_sha="$BUILD_SHA"
  # 独立客户端脚本负责：token 安全传递、轮询、head 身份校验、下载、超时边界。
  # 安全：token 经 env 前缀传递（NOLO_CF_BUILDER_TOKEN），绝不进 argv，避免出现在
  # ps/proc cmdline；argv 只保留 URL/sha/输出路径等非敏感参数。
  if ! NOLO_CF_BUILDER_TOKEN="$NOLO_CF_BUILDER_TOKEN" bash "$REPO_DIR/scripts/ci/cf-build-client.sh" \
    "$NOLO_CF_BUILDER_URL" \
    "$work_dir" "$expect_sha" "$CF_BUILD_POLL_INTERVAL_S" "$CF_BUILD_TIMEOUT_S"; then
    echo "CF build unavailable, falling back to host build (cf-build-client failed)"
    return 1
  fi

  # BLOCK-1：成功 → 登记产物交接点（CF 下载的 tar.gz），供 package_web_artifact 消费。
  CF_OFFLOAD_ARTIFACT_TAR_GZ="$work_dir/web-build.tar.gz"
  echo "CF build ok/free: artifact ready at $CF_OFFLOAD_ARTIFACT_TAR_GZ"
  return 0
}

# 部署后 warmup：健康检查通过后预触发最轻的 2 个 GET 路由，把 lazy import
# 提前执行掉，削掉首请求延迟。失败仅告警，绝不阻塞部署。
warmup_after_deploy() {
  local base="${ALPHA_LOCAL_BASE%/}"
  local code
  code="$(curl -sf -o /dev/null -w '%{http_code}' --max-time 10 "$base/")" \
    || { echo "warmup GET ${base}/ failed (non-blocking)" >&2; code=""; }
  if [[ "$code" != "200" && "$code" != "301" && "$code" != "302" ]]; then
    echo "WARNING: warmup GET ${base}/ returned HTTP ${code:-err} (non-blocking)" >&2
  fi
  code="$(curl -sf -o /dev/null -w '%{http_code}' --max-time 10 "$base/public/meta.json")" \
    || { echo "warmup GET ${base}/public/meta.json failed (non-blocking)" >&2; code=""; }
  if [[ "$code" != "200" ]]; then
    echo "WARNING: warmup GET ${base}/public/meta.json returned HTTP ${code:-err} (non-blocking)" >&2
  fi
}

# 晋升前提：alpha 与 main 共用同一 build 函数，产物同参等价
# meta 缺失 = 无法证明完整 SHA = 必须全量重建
# python3 为部署硬依赖；不可用时 fail-closed 告警并回退全量构建，绝不使用 grep 宽松兜底
check_alpha_artifact_promotable() {
  # 可选 lookup_sha（默认 BUILD_SHA）：main-web-release 传 alpha 侧 HEAD 的 SHA，
  # alpha-deploy 不传保持现状。归档命名与 meta 校验都必须用 lookup_sha 精确匹配。
  local lookup_sha="${1:-$BUILD_SHA}"
  local shortsha="${lookup_sha:0:12}"
  if [[ -z "$shortsha" ]]; then
    return 1
  fi

  local archive_dir="${NOLO_ARTIFACT_ARCHIVE_DIR:-/root/nolo-artifacts}"
  local artifact_path="$archive_dir/alpha-${shortsha}.tar.gz"
  local meta_path="$archive_dir/alpha-${shortsha}.meta.json"

  if [[ ! -s "$artifact_path" ]]; then
    return 1
  fi

  if [[ ! -f "$meta_path" ]]; then
    return 1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    printf '[alpha-server-ci] check_alpha_artifact_promotable: python3 not available; falling back to full rebuild\n' >&2
    return 1
  fi

  if ! python3 - "$meta_path" "$lookup_sha" <<'PY'
import json, sys
try:
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        meta = json.load(f)
    if meta.get("sha") == sys.argv[2]:
        sys.exit(0)
except Exception:
    pass
sys.exit(1)
PY
  then
    return 1
  fi

  return 0
}

# 晋升 cp 失败会 fail-closed 终止发布，不自动回退全量构建
promote_alpha_artifact() {
  # 可选 lookup_sha（默认 BUILD_SHA）：与 check_alpha_artifact_promotable 保持一致，
  # main-web-release 传 alpha 侧 HEAD 的 SHA，alpha-deploy 不传保持现状。
  local lookup_sha="${1:-$BUILD_SHA}"
  local shortsha="${lookup_sha:0:12}"
  local archive_dir="${NOLO_ARTIFACT_ARCHIVE_DIR:-/root/nolo-artifacts}"
  local artifact_path="$archive_dir/alpha-${shortsha}.tar.gz"

  log "promoting alpha artifact for ${lookup_sha} (skip build/test)"
  cd "$WORK_DIR"
  cp -f "$artifact_path" "$WORK_DIR/web-build.tar.gz"
  archive_web_artifact "main" "$WORK_DIR/web-build.tar.gz" || printf 'artifact archive failed (non-blocking, deploy continues)\n' >&2
  return 0
}

main_web_release() {
  timed_phase "preflight-disk-check" preflight_disk_check
  timed_phase "sync-main-release-checkout" ensure_main_release_checkout

  # main 是 alpha 的 merge（parents = [main旧, alpha HEAD]），merge SHA 永远 ≠ alpha SHA，
  # 用 BUILD_SHA 找归档必然 miss → 永远回退全量重建。正确做法：用 merge 的 second parent
  # （alpha 侧 HEAD）的 SHA 作为归档查找键——main 合并的就是 alpha 的 HEAD，alpha 的产物
  # 就是 main 要发布的产物。HEAD^2 解析失败（非 merge 或单父）时回退 BUILD_SHA 并打日志。
  local lookup_sha="$BUILD_SHA"
  if alpha_head="$(git rev-parse HEAD^2 2>/dev/null)"; then
    lookup_sha="$alpha_head"
    log "main-web-release: alpha-side HEAD = ${lookup_sha} (merge second parent), using it as artifact lookup key"
  else
    log "main-web-release: HEAD^2 not resolvable (non-merge or single parent); falling back to BUILD_SHA=${lookup_sha}"
  fi

  if check_alpha_artifact_promotable "$lookup_sha"; then
    timed_phase "promote-alpha-artifact" promote_alpha_artifact "$lookup_sha"
  else
    log "artifact not found; full rebuild"
    timed_phase "install-dependencies" install_dependencies
    timed_phase "build-web" build_web
    timed_phase "verify-server-imports" verify_server_imports
    timed_phase "run-deploy-tests" run_deploy_tests
    timed_phase "package-main-web-artifact" main_package_web_artifact
  fi

  local key_path
  key_path="$(prepare_production_ssh_key)"
  timed_phase "upload-main-artifact" upload_main_artifact "$key_path"
  timed_phase "deploy-main-remote" deploy_main_remote "$key_path"
  # 健康验证必须紧跟部署，排在数据卫生审计**之前**——与 alpha_deploy
  # (deploy-alpha-artifact → verify-alpha-health → audit-alpha-app-lifecycle)
  # 保持同一顺序。
  #
  # 顺序反了会让部署失去验证：set -e 下 audit_main_remote 一失败，
  # verify_main_public_health 就永远不执行。实测代价（2026-07-27）——
  # 一条已删 demo 账号的账本残留让审计恒返回非零，于是每次 main 部署都是红的，
  # 团队学会了忽略它；而真正部署炸掉时，红得一模一样，且健康检查同样不会跑。
  timed_phase "verify-main-public-health" verify_main_public_health
  timed_phase "seed-plaza-agents" seed_plaza_agents "$PRODUCTION_PUBLIC_BASE"
  timed_phase "audit-main-remote" audit_main_remote "$key_path"
  print_phase_timing_summary
}

verify_alpha_health() {
  log "Verify alpha health"
  curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors "$ALPHA_PUBLIC_BASE/ready"
  # DB read smoke: handler must execute (401/404 OK, 500 = broken handler/import)
  local read_status
  read_status="$(curl -s -o /dev/null -w '%{http_code}' "$ALPHA_PUBLIC_BASE/api/v1/db/read/__healthprobe__")"
  if [ "$read_status" = "500" ]; then
    echo "FATAL: /api/v1/db/read returned 500 — DB read handler is broken (missing import?)" >&2
    return 1
  fi
  "$BUN_BIN" scripts/verify/verifyDeployedRouteStyles.ts --base-url "$ALPHA_PUBLIC_BASE"
}

verify_main_public_health() {
  log "Verify main public health"
  curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors "$PRODUCTION_PUBLIC_BASE/ready"
  # DB read smoke: handler must execute (401/404 OK, 500 = broken handler/import)
  local read_status
  read_status="$(curl -s -o /dev/null -w '%{http_code}' "$PRODUCTION_PUBLIC_BASE/api/v1/db/read/__healthprobe__")"
  if [ "$read_status" = "500" ]; then
    echo "FATAL: /api/v1/db/read returned 500 — DB read handler is broken (missing import?)" >&2
    return 1
  fi
  "$BUN_BIN" scripts/verify/verifyDeployedRouteStyles.ts --base-url "$PRODUCTION_PUBLIC_BASE"
}

seed_plaza_agents() {
  local base_url="$1"
  if [[ -z "${NOLO_PLAZA_SEED_TOKEN:-}" ]]; then
    log "NOLO_PLAZA_SEED_TOKEN 未配置，跳过 plaza seed（可选防漂移）"
    return 0
  fi
  log "Seed platform builtin public agents @ $base_url"
  AUTH_TOKEN="$NOLO_PLAZA_SEED_TOKEN" BASE_URL="$base_url" \
    "$BUN_BIN" scripts/seedPlatformBuiltinAgents.ts \
    || { echo "WARN: plaza seed failed (non-fatal) @ $base_url" >&2; }
}

assert_runtime_render_bundle() {
  local target_dir="${1:-$REPO_DIR}"
  local bundle_path="$target_dir/packages/server/.render-dist/render.mjs"
  log "Assert runtime render bundle: $bundle_path"
  if [[ ! -f "$bundle_path" ]]; then
    echo "FATAL: SSR render bundle missing in runtime directory: $bundle_path" >&2
    return 1
  fi
  echo "✅ SSR render bundle verified: $bundle_path ($(wc -c < "$bundle_path" | tr -d '[:space:]') bytes)"
}

probe_alpha_agents_ssr() {
  log "Probe alpha /agents SSR"

  # 1. SSR 自检端点探针：带本次部署生成的 token 请求头；端点 404 视为
  #    token/env 未对齐（自检静默失效），直接判失败。
  local diag_token="${SSR_SELFCHECK_TOKEN:-}"
  local selfcheck_url="${ALPHA_LOCAL_BASE}/api/admin/ssr-selfcheck"
  local selfcheck_file
  selfcheck_file="$(mktemp)"
  local selfcheck_code
  if [[ -n "$diag_token" ]]; then
    # 注意：token 只进请求头，不回显（响应体不含 token）。
    selfcheck_code="$(curl -s -w '%{http_code}' -H "x-nolo-ci-diag-token: $diag_token" -o "$selfcheck_file" "$selfcheck_url" || echo "000")"
  else
    selfcheck_code="$(curl -s -w '%{http_code}' -o "$selfcheck_file" "$selfcheck_url" || echo "000")"
  fi
  echo "--- [diag] SSR Selfcheck Response (HTTP $selfcheck_code) ---" >&2
  cat "$selfcheck_file" >&2
  echo "" >&2

  if [[ "$selfcheck_code" != "200" ]]; then
    echo "FATAL: /api/admin/ssr-selfcheck returned HTTP $selfcheck_code (expected 200; 404 usually means diag token/env mismatch)" >&2
    rm -f "$selfcheck_file"
    return 1
  fi

  local error_msg
  error_msg="$(python3 -c "
import json, sys
try:
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(data.get('errorMessage') or '')
except Exception:
    print('')
" "$selfcheck_file" 2>/dev/null || echo "")"
  rm -f "$selfcheck_file"

  if [[ -n "$error_msg" ]]; then
    echo "FATAL: /api/admin/ssr-selfcheck reported SSR error: $error_msg" >&2
    return 1
  fi

  local probe_url="${ALPHA_LOCAL_BASE}/agents"
  local http_code
  local response_file
  response_file="$(mktemp)"

  http_code="$(curl -s -w '%{http_code}' -o "$response_file" "$probe_url" || echo "000")"

  # [diag] 无条件输出服务端 pm2 错误日志尾（SSR 堆栈经 status API 可读；正常时为空）
  echo "--- [diag] pm2 error log tail (always) ---" >&2
  tail -n 150 /root/.pm2/logs/*error.log 2>/dev/null | grep -av "react-dom-server\|node_modules" | grep -aE "DBG-SSR|Render failed|stylex|Unexpected|Error:" | tail -30 >&2 || true

  if [[ "$http_code" != "200" ]]; then
    echo "FATAL: /agents SSR probe returned HTTP $http_code (expected 200) from $probe_url" >&2
    head -n 30 "$response_file" >&2 || true
    echo "--- [diag] server render errors (pm2 logs tail) ---" >&2
    tail -n 120 /root/.pm2/logs/*error.log 2>/dev/null | grep -av "react-dom-server\|node_modules" | grep -aE "SSR|Render failed|stylex|Unexpected|Error:|error:" | tail -40 >&2 || true
    tail -n 60 /root/.pm2/logs/*out.log 2>/dev/null | grep -av "react-dom-server\|node_modules" | grep -aE "SSR|Render failed|stylex|Unexpected" | tail -20 >&2 || true
    rm -f "$response_file"
    return 1
  fi

  if grep -qi "Render bundle not found" "$response_file"; then
    echo "FATAL: /agents SSR response contains 'Render bundle not found' error" >&2
    rm -f "$response_file"
    return 1
  fi

  echo "✅ SSR /agents probe passed: HTTP 200 ($(wc -c < "$response_file" | tr -d '[:space:]') bytes)"
  rm -f "$response_file"
}

probe_alpha_share_ssr() {
  [[ -n "$ALPHA_SSR_PROBE_PATH" ]] || return 0

  log "Probe alpha share SSR timings"
  local local_url="${ALPHA_LOCAL_BASE}${ALPHA_SSR_PROBE_PATH}"
  local public_url="${ALPHA_PUBLIC_BASE}${ALPHA_SSR_PROBE_PATH}"

  curl -s -o /dev/null -w "alpha_share_local code=%{http_code} ttfb=%{time_starttransfer} total=%{time_total} size=%{size_download}\n" "$local_url"
  curl -s -o /dev/null -w "alpha_share_public code=%{http_code} ttfb=%{time_starttransfer} total=%{time_total} size=%{size_download}\n" "$public_url"

  sleep 1

  grep -E '\[ssr-render\]|\[share-ssr\] preload share detail|SSR total' /root/.pm2/logs/nolo-out.log | tail -n 40 || true
}

alpha_deploy() {
  local prev_head
  # prev_head 必须取「生产运行目录」部署前的版本，而不是本 workspace：
  # workspace 按目标 sha 隔离（alpha-deploy-<sha>-<jobId>），checkout 后其 HEAD
  # 就是目标 sha，若在这里 git rev-parse HEAD 则 diff 永远为空 →
  # alpha_core_restart_required 永远判定「纯前端变更」→ 服务端代码变更从不触发
  # 进程重启（2026-08-13 实测：两次部署 succeeded 但 nolo 进程 87 分钟未重启）。
  prev_head="$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || true)"
  # 每次部署生成一枚新的 SSR 自检 token：随 pm2 env 注入（经 deployRemote.sh
  # 环境透传，见 deploy_alpha_artifact），同一次运行中的探针再以请求头回传同一枚。
  # 生命周期 = 单次部署；不落盘、不回显、不进日志。
  SSR_SELFCHECK_TOKEN="$(gen_diag_token)"
  disk_snapshot "start"
  timed_phase "preflight-disk-check" preflight_disk_check
  disk_snapshot "after-preflight"
  timed_phase "sync-alpha-checkout" sync_alpha_checkout
  disk_snapshot "after-checkout"
  local deploy_decision
  deploy_decision="$(bash ./scripts/ci/classifyDeployChanges.sh "$prev_head" "$BUILD_SHA")"
  if [[ "$deploy_decision" == "skip" ]]; then
    log "Only docs/ changed; skip alpha build, tests, and deployment"
    timed_phase "skip-docs-only-deploy" true
    disk_snapshot "final"
    print_phase_timing_summary
    echo "[nolo-ci-result] status=skipped reason=docs-only"
    return 0
  fi
  timed_phase "disable-core-dumps" env NOLO_PM2_BIN="$PM2_BIN" bash ./scripts/ops/disableCoreDumps.sh || true
  disk_snapshot "after-core-dumps"
  timed_phase "cleanup-rebuildable-state" cleanup_rebuildable_state
  disk_snapshot "after-cleanup"
  timed_phase "install-dependencies" install_dependencies
  disk_snapshot "after-install"
  if timed_phase "cf-build-alpha-offload" cf_build_alpha_offload; then
    disk_snapshot "after-cf-offload"
    timed_phase "build-render-bundle" "$BUN_BIN" "$WORK_DIR/scripts/dev/buildRenderBundle.ts"
  else
    # offload 未配置或任一环节失败 → 原地回退宿主本地构建（行为与现状完全一致）
    timed_phase "build-web" build_web
    disk_snapshot "after-build"
  fi
  timed_phase "run-deploy-tests" run_deploy_tests
  disk_snapshot "after-tests"
  timed_phase "package-web-artifact" package_web_artifact
  disk_snapshot "after-package"
  timed_phase "sync-alpha-runtime-checkout" sync_alpha_runtime_checkout
  disk_snapshot "after-sync-runtime"
  timed_phase "deploy-alpha-artifact" deploy_alpha_artifact "$prev_head"
  disk_snapshot "after-deploy"
  timed_phase "assert-runtime-render-bundle" assert_runtime_render_bundle "$REPO_DIR"
  timed_phase "verify-alpha-health" verify_alpha_health
  timed_phase "warmup-after-deploy" warmup_after_deploy
  timed_phase "seed-plaza-agents" seed_plaza_agents "$ALPHA_PUBLIC_BASE"
  timed_phase "audit-alpha-app-lifecycle" alpha_app_lifecycle_audit
  timed_phase "probe-alpha-share-ssr" probe_alpha_share_ssr
  timed_phase "probe-alpha-agents-ssr" probe_alpha_agents_ssr
  disk_snapshot "final"
  space_analysis
  print_phase_timing_summary
  # Dump snapshot timeline at very end (tail captures from bottom)
  echo ""
  echo "=== Disk Snapshot Timeline ==="
  if [[ -f "$SNAPSHOT_FILE" && -s "$SNAPSHOT_FILE" ]]; then
    cat "$SNAPSHOT_FILE"
  else
    echo "(no snapshots)"
  fi
  # [diag] SSR 堆栈诊断——置于部署输出最末尾，确保进入 status API 的 40 行窗口
  echo ""
  echo "=== [diag] SSR Render Stack (pm2 logs) ==="
  # 主动触发一次公网 /agents（生成新的错误堆栈行）
  curl -s -m 8 -o /dev/null "https://us.nolo.chat/agents?diag=$BUILD_SHA" || true
  sleep 1
  grep -ah "DBG-SSR" /root/.pm2/logs/* 2>/dev/null | tail -2 || true
  grep -ahE "TypeError|ReferenceError|RangeError|SyntaxError|Cannot read|is not a function|is not defined|Cannot destructure" /root/.pm2/logs/*error.log 2>/dev/null | grep -av "react-dom-server\|node_modules" | tail -6 || true
}

alpha_billing_audit() {
  require_alpha_server
  log "Audit alpha billing ledger"
  "$BUN_BIN" scripts/audits/auditRemoteBillingLedger.ts \
    --base-url "$ALPHA_LOCAL_BASE" \
    --cluster alpha \
    --legacy-since none

  "$BUN_BIN" scripts/audits/reportRevenueShare.ts \
    --base-url "$ALPHA_LOCAL_BASE" \
    --cluster alpha \
    --since-hours 1

  "$BUN_BIN" scripts/audits/reportCreatorEarnings.ts \
    --base-url "$ALPHA_LOCAL_BASE" \
    --cluster alpha \
    --since-hours 1

  "$BUN_BIN" scripts/audits/reportCreatorSettlement.ts \
    --base-url "$ALPHA_LOCAL_BASE" \
    --cluster alpha \
    --since-hours 1
}

# CI smoke: 使用 nolotus 账号 (0e95801d90) 的 agent 做 alpha 对账 smoke。
# Token 优先从 NOLO_CI_AUTH_TOKEN env var 读取（CI runner 部署时设置），
# fallback 到 ~/.nolo/config.json 的 default profile token。
# Demo 账号 (b2e06f801f) 已删除，不再用于 CI smoke。
alpha_agent_smoke() {
  require_alpha_server
  log "Alpha smoke agent run through Kimi 最新"
  local smoke_token="${NOLO_CI_AUTH_TOKEN:-}"
  if [ -z "$smoke_token" ] && [ -f "$HOME/.nolo/config.json" ]; then
    smoke_token="$("$BUN_BIN" -e '
      const c = JSON.parse(require("fs").readFileSync(process.env.HOME + "/.nolo/config.json", "utf-8"));
      const p = c.profiles[c.currentProfile];
      process.stdout.write(p?.authToken ?? "");
    ')"
  fi
  if [ -z "$smoke_token" ]; then
    log "ERROR: No auth token for smoke. Set NOLO_CI_AUTH_TOKEN or configure ~/.nolo/config.json."
    return 1
  fi
  AUTH_TOKEN="$smoke_token" \
  NOLO_SERVER="$ALPHA_PUBLIC_BASE" \
  "$BUN_BIN" packages/cli/index.ts agent run agent-0e95801d90-01KIMILATEST0000000190TF2K \
    --server \
    --msg "只回复 OK，用于验证 alpha 对账 smoke / CLI stream dialog handle。"
}

alpha_app_workspace_audit() {
  require_alpha_server
  log "Audit alpha app workspace git state"
  "$BUN_BIN" scripts/audits/auditAppWorkspaces.ts \
    --root "$REPO_DIR/data/app-workspaces" \
    --json
}

alpha_app_runtime_audit() {
  require_alpha_server
  log "Audit alpha app runtime/version state"
  "$BUN_BIN" scripts/audits/auditAppRuntimeVersions.ts \
    --base-url "$ALPHA_LOCAL_BASE" \
    --expect-apps-min 1 \
    --json
}

alpha_app_lifecycle_audit() {
  alpha_app_workspace_audit
  alpha_app_runtime_audit
}

alpha_token_probe() {
  require_alpha_server
  log "Probe alpha token usage split ledger"
  NOLO_SERVER="$ALPHA_LOCAL_BASE" \
  BASE_URL="$ALPHA_LOCAL_BASE" \
  "$BUN_BIN" packages/cli/index.ts agent run agent-pub-01DSV4FLASHPB00000000JFPFD \
    --server \
    --msg "请只回复 ok" \
    --no-stream
}

alpha_maintenance() {
  require_alpha_server
  log "Disk usage"
  df -h /
  df -h /tmp || true

  log "Public network identity"
  hostname -I || true
  curl -fsS https://api.ipify.org || true
  echo

  log "Large paths before cleanup"
  du -xhd1 /root /var /tmp /opt /home 2>/dev/null | sort -h | tail -80 || true
  du -xhd1 /var/lib 2>/dev/null | sort -h | tail -80 || true

  sync_alpha_checkout
  NOLO_PM2_BIN="$PM2_BIN" bash ./scripts/ops/disableCoreDumps.sh || true

  cleanup_alpha_runner_work

  du -sh ~/.gradle/caches 2>/dev/null || true
  du -sh "${ALPHA_RUNNER_WORK}/_temp" 2>/dev/null || true
  du -sh "${ALPHA_RUNNER_WORK}/_tool" 2>/dev/null || true
  rm -rf ~/.gradle/caches/ ~/.bun/install/cache/ ~/.cache/ms-playwright/ || true
  cleanup_alpha_tmp_rebuildable_state
  find "$REPO_DIR" -maxdepth 1 -type f -name 'core*' -delete || true
  find /var/lib/apport/coredump -maxdepth 1 -type f -name 'core._root__bun_bin_bun.*' -delete || true
  find /root/.pm2/logs -type f -name '*.log' -exec truncate -s 0 {} + 2>/dev/null || true
  apt-get clean || true
  docker system prune -f --volumes || true
  journalctl --vacuum-size=200M || true

  log "Fix sshd MaxStartups"
  if ! grep -q "^MaxStartups" /etc/ssh/sshd_config; then
    echo "MaxStartups 100:30:200" >> /etc/ssh/sshd_config
  else
    sed -i 's/^MaxStartups.*/MaxStartups 100:30:200/' /etc/ssh/sshd_config
  fi
  systemctl reload sshd || systemctl reload ssh || true

  log "PM2 status"
  "$PM2_BIN" status || true
  "$PM2_BIN" describe nolo || true

  log "Caddy status"
  systemctl status caddy --no-pager || true
  caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile
  systemctl restart caddy

  log "Ensure alpha service"
  # 重建/重注册 pm2 env 时同样配一枚新 diag token（与 ssrSelfcheckHandler 的
  # token 门控配套）；生命周期 = 本次维护窗口，不落盘、不回显。
  local maintenance_diag_token
  maintenance_diag_token="$(gen_diag_token)"
  NOLO_BRANCH=alpha \
  NOLO_RELEASE_SHA="$BUILD_SHA" \
  NOLO_REPO_DIR="$REPO_DIR" \
  NOLO_BUN_BIN="$BUN_BIN" \
  NOLO_PM2_BIN="$PM2_BIN" \
  NOLO_USE_SUDO=0 \
  NOLO_SKIP_GIT_SYNC=1 \
  NOLO_PROXY_MODE=caddy \
  NOLO_CADDY_HOSTS="us.nolo.chat,crm.nolo.chat,date.nolo.chat" \
  NOLO_CADDY_PREVIEW_SLOTS="$PREVIEW_SLOTS" \
  NOLO_BLUE_GREEN=1 \
  NOLO_BLUE_GREEN_DEFER_LISTEN=1 \
  NOLO_PM2_KILL_TIMEOUT=40000 \
  NOLO_SERVICE_HEALTH_URL="$ALPHA_LOCAL_BASE/ready" \
  NOLO_DEPLOY_WINDOW_PUBLIC_PROBE_URL="$ALPHA_PUBLIC_BASE/health" \
  NOLO_CI_DIAG=1 \
  NOLO_CI_DIAG_TOKEN="$maintenance_diag_token" \
  bash ./scripts/release/deployRemote.sh

  log "Local health"
  curl -fsS "$ALPHA_LOCAL_BASE/health"
  curl -kfsS --resolve us.nolo.chat:443:127.0.0.1 https://us.nolo.chat/health
  curl -fsS "$ALPHA_PUBLIC_BASE/health" || true
  curl -fsS https://alpha-a.nolo.chat/health || true

  alpha_app_lifecycle_audit

  log "Restart alpha machine connector"
  NOLO_REPO_DIR="$REPO_DIR" \
  NOLO_BUN_BIN="$BUN_BIN" \
  bash ./scripts/ops/restartAlphaConnector.sh

  log "Restart nolo-ci service"
  NOLO_REPO_DIR="$REPO_DIR" \
  NOLO_BUN_BIN="$BUN_BIN" \
  NOLO_PM2_BIN="$PM2_BIN" \
  bash ./scripts/ops/manageNoloCiPm2.sh restart

  log "Listening sockets"
  ss -ltnp | grep -E ':(80|443|38123)\b' || true

  cleanup_alpha_runner_work
  rm -rf ~/.gradle/caches/ ~/.bun/install/cache/ ~/.cache/ms-playwright/ || true
  cleanup_alpha_tmp_rebuildable_state
  find "$REPO_DIR" -maxdepth 1 -type f -name 'core*' -delete || true
  find /root/.pm2/logs -type f -name '*.log' -exec truncate -s 0 {} + 2>/dev/null || true
  journalctl --vacuum-size=200M || true

  log "Large paths after cleanup"
  du -xhd1 /root /var /tmp /opt /home 2>/dev/null | sort -h | tail -80 || true

  log "Final disk usage"
  df -h /
  df -h /tmp || true
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
case "$COMMAND" in
  alpha-deploy)
    alpha_deploy
    ;;
  alpha-maintenance)
    alpha_maintenance
    ;;
  alpha-billing-audit)
    alpha_billing_audit
    ;;
  alpha-token-probe)
    alpha_token_probe
    ;;
  alpha-agent-smoke)
    alpha_agent_smoke
    ;;
  alpha-app-workspace-audit)
    alpha_app_workspace_audit
    ;;
  alpha-app-runtime-audit)
    alpha_app_runtime_audit
    ;;
  alpha-app-lifecycle-audit)
    alpha_app_lifecycle_audit
    ;;
  main-web-release)
    main_web_release
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    usage >&2
    fail "Unknown command: $COMMAND"
    ;;
esac
else
  return 0 2>/dev/null || true
fi
