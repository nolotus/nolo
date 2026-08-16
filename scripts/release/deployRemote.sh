#!/usr/bin/env bash

set -Eeuo pipefail

BRANCH="${NOLO_BRANCH:?NOLO_BRANCH is required}"
REPO_DIR="${NOLO_REPO_DIR:?NOLO_REPO_DIR is required}"
BUN_BIN="${NOLO_BUN_BIN:?NOLO_BUN_BIN is required}"
PM2_BIN="${NOLO_PM2_BIN:?NOLO_PM2_BIN is required}"
USE_SUDO="${NOLO_USE_SUDO:-0}"
DISABLE_HTTPS="${NOLO_DISABLE_HTTPS:-0}"
PM2_KILL_TIMEOUT="${NOLO_PM2_KILL_TIMEOUT:-}"
ARTIFACT_PATH="${NOLO_ARTIFACT_PATH:-}"
SKIP_GIT_SYNC="${NOLO_SKIP_GIT_SYNC:-0}"
SKIP_DEPLOY_INSTALL="${NOLO_SKIP_DEPLOY_INSTALL:-0}"
PROXY_MODE="${NOLO_PROXY_MODE:-none}"
APP_HTTP_HOST="${NOLO_APP_HTTP_HOST:-}"
APP_HTTP_PORT="${NOLO_APP_HTTP_PORT:-}"
MIN_FREE_KB="${NOLO_MIN_FREE_KB:-262144}"
EXTRACT_SPACE_MULTIPLIER="${NOLO_EXTRACT_SPACE_MULTIPLIER:-3}"
PRUNE_NODE_MODULES_FOR_ARTIFACT="${NOLO_PRUNE_NODE_MODULES_FOR_ARTIFACT:-1}"
STOP_BEFORE_ARTIFACT_PROMOTE="${NOLO_STOP_BEFORE_ARTIFACT_PROMOTE:-0}"
SKIP_CORE_RELOAD="${NOLO_SKIP_CORE_RELOAD:-0}"
PM2_APP_COUNT_WAIT_TIMEOUT="${NOLO_PM2_APP_COUNT_WAIT_TIMEOUT:-30}"
DEPLOY_LOCK_WAIT_TIMEOUT="${NOLO_DEPLOY_LOCK_WAIT_TIMEOUT:-60}"
DEPLOY_READY_TIMEOUT="${NOLO_DEPLOY_READY_TIMEOUT:-180}"
DEPLOY_WINDOW_PROBE="${NOLO_DEPLOY_WINDOW_PROBE:-1}"
DEPLOY_WINDOW_PROBE_SAMPLES="${NOLO_DEPLOY_WINDOW_PROBE_SAMPLES:-80}"
DEPLOY_WINDOW_PROBE_INTERVAL_SECONDS="${NOLO_DEPLOY_WINDOW_PROBE_INTERVAL_SECONDS:-0.2}"
DEPLOY_WINDOW_PUBLIC_PROBE_URL="${NOLO_DEPLOY_WINDOW_PUBLIC_PROBE_URL:-}"
if [[ -n "${NOLO_HOME:-}" ]]; then
  DEPLOY_HOME="$NOLO_HOME"
elif [[ -n "${HOME:-}" ]]; then
  DEPLOY_HOME="$HOME"
elif [[ "$USE_SUDO" == "1" || "$REPO_DIR" == /root/* ]]; then
  DEPLOY_HOME="/root"
else
  DEPLOY_HOME="$(getent passwd "$(id -un)" 2>/dev/null | cut -d: -f6 || true)"
  DEPLOY_HOME="${DEPLOY_HOME:-/root}"
fi
PM2_HOME="${NOLO_PM2_HOME:-${DEPLOY_HOME}/.pm2}"
export HOME="$DEPLOY_HOME"
export PM2_HOME
# GitHub self-hosted runners clean up orphaned processes that retain this
# marker. PM2-managed services must not inherit it, or a successful deploy
# leaves the site down immediately after job cleanup.
export RUNNER_TRACKING_ID=""

if [[ "$PROXY_MODE" == "caddy" ]]; then
  APP_HTTP_HOST="${APP_HTTP_HOST:-127.0.0.1}"
  APP_HTTP_PORT="${APP_HTTP_PORT:-38123}"
  DISABLE_HTTPS=1
else
  APP_HTTP_HOST="${APP_HTTP_HOST:-0.0.0.0}"
  APP_HTTP_PORT="${APP_HTTP_PORT:-80}"
fi

SERVICE_HEALTH_URL="${NOLO_SERVICE_HEALTH_URL:-http://127.0.0.1:${APP_HTTP_PORT}/health}"
EXPECTED_ENTRY_PATH="$REPO_DIR/packages/server/entry.ts"
service_may_need_recovery=0
deploy_completed=0
deploy_window_probe_pid=""
deploy_window_probe_log=""

ulimit -c 0 || true

run_maybe_sudo() {
  if [[ "$USE_SUDO" == "1" ]]; then
    sudo env HOME="$DEPLOY_HOME" PM2_HOME="$PM2_HOME" RUNNER_TRACKING_ID="$RUNNER_TRACKING_ID" "$@"
  else
    env HOME="$DEPLOY_HOME" PM2_HOME="$PM2_HOME" RUNNER_TRACKING_ID="$RUNNER_TRACKING_ID" "$@"
  fi
}

run_env() {
  if [[ "$USE_SUDO" == "1" ]]; then
    sudo env HOME="$DEPLOY_HOME" PM2_HOME="$PM2_HOME" RUNNER_TRACKING_ID="$RUNNER_TRACKING_ID" "$@"
  else
    env HOME="$DEPLOY_HOME" PM2_HOME="$PM2_HOME" RUNNER_TRACKING_ID="$RUNNER_TRACKING_ID" "$@"
  fi
}

timed_deploy_step() {
  local step="$1"
  shift
  local started_ms
  local finished_ms
  local duration_ms
  local status

  started_ms="$(date +%s%3N)"
  if "$@"; then
    status=0
  else
    status=$?
  fi
  finished_ms="$(date +%s%3N)"
  duration_ms=$((finished_ms - started_ms))
  echo "[nolo-deploy-step] step=${step} status=${status} durationMs=${duration_ms} startedMs=${started_ms} finishedMs=${finished_ms}"
  return "$status"
}

restore_tmp_runtime_state() {
  run_maybe_sudo install -d -m 1777 /tmp
  run_maybe_sudo chmod 1777 /tmp
}

pm2_logs() {
  run_maybe_sudo "$PM2_BIN" logs nolo --lines 50 --nostream || true
}

retry_http_contains() {
  local name="$1"
  local url="$2"
  local expected="$3"
  local attempts="${4:-15}"
  local delay_seconds="${5:-2}"
  shift 5
  local curl_args=("$@")

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    local body
    body="$(curl -fsS "${curl_args[@]}" "$url" 2>/dev/null || true)"
    if [[ "$body" == *"$expected"* ]]; then
      echo "✅ ${name} healthcheck passed (${url})"
      return 0
    fi

    echo "⏳ 等待 ${name} 就绪 (${attempt}/${attempts})..."
    sleep "$delay_seconds"
  done

  echo "❌ ${name} healthcheck failed: ${url}"
  return 1
}

verify_rendered_assets() {
  local render_url="${NOLO_RENDER_HEALTH_URL:-http://127.0.0.1:${APP_HTTP_PORT}/}"
  NOLO_VERIFY_ASSET_ORIGINALS="${NOLO_VERIFY_ASSET_ORIGINALS:-1}" \
    bash "$REPO_DIR/scripts/verify/verifyRenderedWebAssets.sh" "$render_url"
}

resolve_release_sha() {
  if [[ -n "${NOLO_RELEASE_SHA:-}" ]]; then
    printf '%s\n' "$NOLO_RELEASE_SHA"
    return
  fi

  git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || printf 'unknown\n'
}

# Deploy target commit: after `git reset --hard origin/${BRANCH}` (or the
# caller-side reset when NOLO_SKIP_GIT_SYNC=1), HEAD is the deploy target.
# Reuses resolve_release_sha so the NOLO_RELEASE_SHA override keeps working;
# prints empty when git cannot resolve so the ready gate degrades instead of
# false-failing the release.
resolve_deploy_target_sha() {
  local sha
  sha="$(resolve_release_sha)"
  if [[ "$sha" == "unknown" ]]; then
    sha=""
  fi
  printf '%s\n' "$sha"
}

resolve_previous_stable_sha() {
  if [[ -n "${NOLO_PREVIOUS_STABLE_SHA:-}" ]]; then
    printf '%s\n' "$NOLO_PREVIOUS_STABLE_SHA"
    return
  fi

  git -C "$REPO_DIR" rev-parse HEAD^ 2>/dev/null || printf 'unknown\n'
}

print_manual_rollback_guidance() {
  local reason="$1"
  local release_sha
  local previous_stable_sha
  release_sha="$(resolve_release_sha)"
  previous_stable_sha="$(resolve_previous_stable_sha)"

  echo "❌ deploy verification failed: ${reason}"
  echo "release_sha: ${release_sha}"
  echo "previous_stable_sha: ${previous_stable_sha}"
  echo "manual rollback:"
  echo "  git fetch origin"
  echo "  git checkout ${BRANCH}"
  echo "  git pull origin ${BRANCH}"
  echo "  git revert ${release_sha}"
  echo "  git push origin ${BRANCH}"
}

# 自动回滚（G5 加固，2026-08-13）：部署验证失败时自动切回上一稳定版本，而不是只打手动指引。
# - 上一稳定版本 = resolve_previous_stable_sha（默认 git HEAD^，可用 NOLO_PREVIOUS_STABLE_SHA 覆盖）
# - 回滚 = git reset --hard 上一版 + reload_or_start_nolo（自带 ready 门与一次 rebuild 自愈）
# - 回滚后健康检查通过 → 成功返回；仍失败 → 降级为手动指引
auto_rollback() {
  local reason="$1"
  local release_sha
  local previous_stable_sha
  release_sha="$(resolve_release_sha)"
  previous_stable_sha="$(resolve_previous_stable_sha)"

  echo "❌ deploy verification failed: ${reason}"
  if [[ -z "$previous_stable_sha" || "$previous_stable_sha" == "unknown" || "$previous_stable_sha" == "$release_sha" ]]; then
    echo "⚠️ 无可用上一稳定版本（release=${release_sha}），回滚降级为手动指引"
    print_manual_rollback_guidance "$reason"
    return 1
  fi

  echo "🔄 自动回滚到上一稳定版本 ${previous_stable_sha}（当前 ${release_sha}）..."
  git -C "$REPO_DIR" fetch --all >/dev/null 2>&1 || true
  if ! git -C "$REPO_DIR" reset --hard "$previous_stable_sha"; then
    echo "❌ git reset --hard ${previous_stable_sha} 失败，进入手动指引"
    print_manual_rollback_guidance "$reason"
    return 1
  fi

  # 显式处理重载返回值：reload_or_start_nolo 内部含 wait_for_nolo_ready_sha 门，
  # 其 /ready buildSha 必须匹配 reset 后的 HEAD（即 previous_stable_sha）——回滚成功
  # 判定由此绑定目标 buildSha，而非仅「健康检查 200」。
  if ! reload_or_start_nolo; then
    echo "❌ 回滚后服务重载失败（未运行目标代码 ${previous_stable_sha}），进入手动指引"
    print_manual_rollback_guidance "rollback-reload-failed"
    return 1
  fi

  if retry_http_contains "rollback" "$SERVICE_HEALTH_URL" "ok"; then
    echo "✅ 自动回滚成功：服务运行在 ${previous_stable_sha}"
    return 0
  fi
  echo "❌ 回滚后健康检查仍失败，进入手动指引"
  print_manual_rollback_guidance "rollback-healthcheck"
  return 1
}

sample_deploy_window_probe_target() {
  local label="$1"
  local url="$2"
  local started_ms
  local finished_ms
  local duration_ms
  local status
  started_ms="$(date +%s%3N)"
  status="$(curl -L -sS -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || echo curl-error)"
  finished_ms="$(date +%s%3N)"
  duration_ms=$((finished_ms - started_ms))
  echo "[nolo-deploy-window-probe] target=${label} status=${status} durationMs=${duration_ms} url=${url}"
}

run_deploy_window_probe() {
  local render_url="${NOLO_RENDER_HEALTH_URL:-http://127.0.0.1:${APP_HTTP_PORT}/}"
  local sample
  for ((sample = 1; sample <= DEPLOY_WINDOW_PROBE_SAMPLES; sample++)); do
    sample_deploy_window_probe_target "health" "$SERVICE_HEALTH_URL"
    sample_deploy_window_probe_target "root" "$render_url"
    if [[ -n "$DEPLOY_WINDOW_PUBLIC_PROBE_URL" ]]; then
      sample_deploy_window_probe_target "public" "$DEPLOY_WINDOW_PUBLIC_PROBE_URL"
    fi
    sleep "$DEPLOY_WINDOW_PROBE_INTERVAL_SECONDS"
  done
}

start_deploy_window_probe() {
  if [[ "$DEPLOY_WINDOW_PROBE" != "1" ]]; then
    return
  fi

  deploy_window_probe_log="$(mktemp)"
  run_deploy_window_probe > "$deploy_window_probe_log" 2>&1 &
  deploy_window_probe_pid="$!"
  echo "📈 deploy window probe started pid=${deploy_window_probe_pid} log=${deploy_window_probe_log}"
}

summarize_deploy_window_probe() {
  if [[ -z "$deploy_window_probe_log" || ! -f "$deploy_window_probe_log" ]]; then
    return
  fi

  cat "$deploy_window_probe_log"
  python3 - "$deploy_window_probe_log" <<'PY'
import re
import sys
from pathlib import Path

rows = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace").splitlines()
samples = 0
failures = 0
durations = []
target_stats = {}
for row in rows:
    if "[nolo-deploy-window-probe]" not in row:
        continue
    samples += 1
    status = re.search(r"status=([^ ]+)", row)
    duration = re.search(r"durationMs=([0-9]+)", row)
    target_match = re.search(r"target=([^ ]+)", row)
    target = target_match.group(1) if target_match else "unknown"
    stats = target_stats.setdefault(target, {"samples": 0, "failures": 0, "durations": []})
    stats["samples"] += 1
    if status and status.group(1) != "200":
        failures += 1
        stats["failures"] += 1
    if duration:
        duration_ms = int(duration.group(1))
        durations.append(duration_ms)
        stats["durations"].append(duration_ms)

max_duration = max(durations) if durations else 0
print(f"[nolo-deploy-window-probe-summary] samples={samples} failures={failures} maxDurationMs={max_duration}")
for target in sorted(target_stats):
    stats = target_stats[target]
    target_max = max(stats["durations"]) if stats["durations"] else 0
    print(f"[nolo-deploy-window-probe-target-summary] target={target} samples={stats['samples']} failures={stats['failures']} maxDurationMs={target_max}")
PY
}

stop_deploy_window_probe() {
  if [[ -z "$deploy_window_probe_pid" ]]; then
    return
  fi

  if kill -0 "$deploy_window_probe_pid" 2>/dev/null; then
    kill "$deploy_window_probe_pid" 2>/dev/null || true
    wait "$deploy_window_probe_pid" 2>/dev/null || true
  fi
  summarize_deploy_window_probe || true
  rm -f "$deploy_window_probe_log"
  deploy_window_probe_pid=""
  deploy_window_probe_log=""
}

ensure_tsc() {
  echo "🧪 确保 tsc 可用（用于服务器侧 applyLineEdits 类型检查）..."
  if ! "$BUN_BIN" x tsc --version >/dev/null 2>&1; then
    "$BUN_BIN" add -g typescript
  fi
}

ensure_rg() {
  echo "🔎 确保 rg 已安装（codesearch 依赖）..."
  if ! command -v rg >/dev/null 2>&1; then
    run_maybe_sudo apt-get update
    run_maybe_sudo apt-get install -y ripgrep
  fi
}

ensure_rtk() {
  echo "🔧 确保 rtk 已安装（agent bash 输出 token 压缩）..."
  if ! command -v rtk >/dev/null 2>&1; then
    curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
    if [[ "$USE_SUDO" == "1" ]]; then
      sudo cp /home/nolotus/.local/bin/rtk /usr/local/bin/rtk
    else
      cp /root/.local/bin/rtk /usr/local/bin/rtk
    fi
  fi
}

playwright_chromium_cache_exists() {
  run_maybe_sudo find "$DEPLOY_HOME/.cache/ms-playwright" \
    -path '*chromium*' \
    -type f \
    \( -name chrome -o -name chrome-headless-shell -o -name headless_shell \) \
    -perm -111 \
    -print -quit 2>/dev/null | grep -q .
}

ensure_playwright_browser() {
  echo "🌐 确保 Playwright Chromium 已安装（browser tools 依赖）..."
  if ! "$BUN_BIN" x playwright --version >/dev/null 2>&1; then
    echo "⚠️ Playwright CLI 不可用，跳过 Chromium 安装（browser tools 将降级运行）"
    return 0
  fi

  run_maybe_sudo mkdir -p "$DEPLOY_HOME/.cache/ms-playwright"
  if playwright_chromium_cache_exists; then
    echo "✅ Playwright Chromium cache already present"
    return 0
  fi

  if run_maybe_sudo "$BUN_BIN" x playwright install --with-deps chromium; then
    return 0
  fi

  echo "⚠️ Playwright Chromium install failed (OS may not be supported), clearing browser cache and retrying once..."
  run_maybe_sudo rm -rf "$DEPLOY_HOME/.cache/ms-playwright"
  run_maybe_sudo mkdir -p "$DEPLOY_HOME/.cache/ms-playwright"
  if run_maybe_sudo "$BUN_BIN" x playwright install --with-deps chromium; then
    return 0
  fi

  echo "⚠️ Playwright Chromium install failed after retry — browser tools will run in degraded mode"
  return 0
}

nolo_exists() {
  run_maybe_sudo "$PM2_BIN" list | grep -qw "nolo"
}

nolo_app_count() {
  run_maybe_sudo "$PM2_BIN" jlist | python3 -c '
import json
import sys

apps = json.load(sys.stdin)
print(sum(1 for item in apps if item.get("name") == "nolo"))
'
}

wait_for_nolo_app_count() {
  local expected_count="$1"
  local timeout_seconds="${2:-$PM2_APP_COUNT_WAIT_TIMEOUT}"
  local started_seconds
  started_seconds="$(date +%s)"

  while true; do
    local current_count
    current_count="$(nolo_app_count 2>/dev/null || echo unknown)"
    if [[ "$current_count" == "$expected_count" ]]; then
      return 0
    fi

    if (( $(date +%s) - started_seconds >= timeout_seconds )); then
      echo "❌ PM2 nolo app count remained ${current_count}; expected ${expected_count}"
      run_maybe_sudo "$PM2_BIN" status nolo || true
      return 1
    fi

    echo "⏳ waiting for PM2 nolo app count ${expected_count}; current=${current_count}"
    sleep 1
  done
}

delete_nolo_and_wait() {
  run_maybe_sudo "$PM2_BIN" delete nolo || true
  wait_for_nolo_app_count "0"
}

# 生产历史 bug 防御：部署曾把新实例注册进 root 的 PM2 daemon
# （PM2_HOME=/root/.pm2），而实际对外服务的实例在 nolotus 的 PM2
# （/home/nolotus/.pm2）——两个 daemon 各管一个 nolo，抢同一个 LevelDB
# 锁（LEVEL_LOCKED 崩溃循环）。部署前必须把其他已知 PM2_HOME 下的残留
# nolo 一并清理，保证全机器只剩当前 PM2_HOME 一个实例。
# 注意：候选列表以「同一物理机上其它部署环境的 PM2_HOME」为前提；
# alpha（us.nolo.chat）与生产（nolo.chat）物理隔离，互不干扰。若未来
# 同机部署多环境，PM2 app 名必须按环境区分，否则会误删对方实例。
NOLO_PM2_CANDIDATE_HOMES="${NOLO_PM2_CANDIDATE_HOMES:-/root/.pm2 /home/nolotus/.pm2}"

delete_stale_nolo_instances() {
  local pm2_home
  for pm2_home in $NOLO_PM2_CANDIDATE_HOMES; do
    if [[ -z "$pm2_home" || "$pm2_home" == "$PM2_HOME" ]]; then
      continue
    fi
    # 目录存在性检查必须与清理命令同一特权级别：deployRemote.sh 由非 root
    # SSH 用户（如 nolotus）启动，无权限访问 /root（700）时 [[ -d ]] 会误判
    # 为「目录不存在」从而跳过清理，导致防双实例逻辑在生产上完全失效。
    if [[ "$USE_SUDO" == "1" ]]; then
      if ! sudo test -d "$pm2_home"; then
        continue
      fi
    else
      if [[ ! -d "$pm2_home" ]]; then
        continue
      fi
    fi
    echo "🧹 清理其他 PM2 daemon (${pm2_home}) 下的残留 nolo 实例，防止双实例抢 LevelDB 锁..."
    # HOME 推导为该 PM2_HOME 的宿主主目录（去掉 /.pm2 后缀），避免与
    # 当前部署用户 HOME 不一致导致 PM2 客户端读取错误配置。
    local pm2_owner_home="${pm2_home%/.pm2}"
    if [[ "$USE_SUDO" == "1" ]]; then
      sudo env HOME="$pm2_owner_home" PM2_HOME="$pm2_home" RUNNER_TRACKING_ID="$RUNNER_TRACKING_ID" "$PM2_BIN" delete nolo || true
    else
      env HOME="$pm2_owner_home" PM2_HOME="$pm2_home" RUNNER_TRACKING_ID="$RUNNER_TRACKING_ID" "$PM2_BIN" delete nolo || true
    fi
  done
}

# Mirrors the server-side source of truth in
# packages/database-engine/dbPath.ts (resolveServerDbPath): NOLO_SERVER_DB_PATH
# wins — export_repo_dotenv already loaded it from ${REPO_DIR}/.env when
# present — otherwise the PM2 process boots with cwd=${REPO_DIR} and LevelDB
# lives at ${REPO_DIR}/data/leveldb.
resolve_leveldb_dir() {
  if [[ -n "${NOLO_SERVER_DB_PATH:-}" ]]; then
    printf '%s\n' "$NOLO_SERVER_DB_PATH"
    return
  fi
  printf '%s\n' "${REPO_DIR}/data/leveldb"
}

# PM2 entry deletion does not mean the old process released the LevelDB LOCK;
# starting while the lock is still held crash-loops the new process. Poll the
# LOCK holder with fuser (empty output == released). Timeout only warns and
# never aborts the deploy — server boot has its own lock retry as fallback.
wait_for_leveldb_lock_release() {
  local lock_file
  lock_file="$(resolve_leveldb_dir)/LOCK"
  local fuser_bin
  fuser_bin="$(command -v fuser || true)"
  if [[ -z "$fuser_bin" && -x /usr/sbin/fuser ]]; then
    fuser_bin="/usr/sbin/fuser"
  fi

  if [[ -z "$fuser_bin" ]]; then
    echo "⚠️ fuser 不可用，固定等待 5s 让旧进程释放 LevelDB 锁 (${lock_file})"
    sleep 5
    return 0
  fi

  local started_seconds
  started_seconds="$(date +%s)"
  while true; do
    if ! run_maybe_sudo test -e "$lock_file"; then
      echo "✅ LevelDB 锁文件已消失 (${lock_file})"
      return 0
    fi
    if [[ -z "$(run_maybe_sudo "$fuser_bin" "$lock_file" 2>/dev/null || true)" ]]; then
      echo "✅ LevelDB 锁已释放 (${lock_file} 无持有者)"
      return 0
    fi
    if (( $(date +%s) - started_seconds >= DEPLOY_LOCK_WAIT_TIMEOUT )); then
      echo "⚠️ LevelDB 锁 ${DEPLOY_LOCK_WAIT_TIMEOUT}s 内未释放 (${lock_file})，继续启动（server boot 侧另有重试兜底）"
      return 0
    fi
    echo "⏳ 等待旧进程释放 LevelDB 锁 (${lock_file})..."
    sleep 1
  done
}

nolo_pm2_field() {
  local field="$1"
  run_maybe_sudo "$PM2_BIN" jlist | python3 -c '
import json
import sys

field = sys.argv[1]
apps = [item for item in json.load(sys.stdin) if item.get("name") == "nolo"]
app = apps[0] if len(apps) == 1 else {}
print(app.get("pm2_env", {}).get(field, ""))
' "$field"
}

nolo_has_legacy_tool_worker_env() {
  run_maybe_sudo "$PM2_BIN" jlist | python3 -c '
import json
import sys

apps = json.load(sys.stdin)
nolo_envs = [item.get("pm2_env", {}) for item in apps if item.get("name") == "nolo"]

def is_legacy_key(key):
    normalized = "".join(ch for ch in key.lower() if ch.isalnum())
    return "toolworker" in normalized

sys.exit(0 if any(is_legacy_key(key) for env in nolo_envs for key in env) else 1)
'
}

# Load $REPO_DIR/.env into the current shell so PM2 start inherits real secrets
# (OLLAMA_API_KEY, SECRET_KEY, provider keys). Do not hand-edit PM2 process env —
# the file is the source of truth; every start/rebuild re-reads it.
export_repo_dotenv() {
  local env_file="${REPO_DIR}/.env"
  local count=0
  local line key val

  if [[ ! -f "$env_file" ]]; then
    echo "⚠️  missing ${env_file} — runtime will not pick up OLLAMA_API_KEY / SECRET_KEY from file"
    return 0
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    # skip blank / comments
    [[ -z "${line//[[:space:]]/}" || "$line" =~ ^[[:space:]]*# ]] && continue
    # KEY=VALUE (first = only)
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
      # strip one layer of matching quotes
      if [[ "$val" =~ ^\"(.*)\"$ ]]; then
        val="${BASH_REMATCH[1]}"
      elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
        val="${BASH_REMATCH[1]}"
      fi
      export "${key}=${val}"
      count=$((count + 1))
    fi
  done <"$env_file"

  echo "📦 loaded ${count} keys from ${env_file}"
  if [[ -z "${OLLAMA_API_KEY:-}" ]]; then
    echo "⚠️  OLLAMA_API_KEY still empty after loading .env"
  else
    echo "📦 OLLAMA_API_KEY present (len=${#OLLAMA_API_KEY})"
  fi
}

verify_production_env() {
  echo "🔐 验证生产运行时必需环境变量..."
  export_repo_dotenv
  if ! (
    cd "$REPO_DIR"
    NODE_ENV=production NOLO_FORCE_PRODUCTION=1 "$BUN_BIN" -e '
if (!process.env.SECRET_KEY) {
  console.error("SECRET_KEY is missing or not parseable from the deployment environment");
  process.exit(1);
}
'
  ); then
    echo "❌ 生产环境变量验证失败，取消部署且不停止当前服务"
    return 1
  fi
}

start_nolo() {
  local args=(start "$EXPECTED_ENTRY_PATH" --interpreter "$BUN_BIN" --name nolo)
  if [[ -n "$PM2_KILL_TIMEOUT" ]]; then
    args+=(--kill-timeout "$PM2_KILL_TIMEOUT")
  fi

  # Always re-read .env so new keys (e.g. OLLAMA_API_KEY) survive rebuilds.
  export_repo_dotenv

  run_env \
    NODE_ENV=production \
    NOLO_FORCE_PRODUCTION=1 \
    NOLO_SERVER_RUNTIME_ROLE=core \
    NOLO_WEB_HOSTED_EXEC_RUNTIME="${NOLO_WEB_HOSTED_EXEC_RUNTIME:-}" \
    NOLO_HOSTED_WORKSPACE_ROOT="${NOLO_HOSTED_WORKSPACE_ROOT:-}" \
    DISABLE_HTTPS="$DISABLE_HTTPS" \
    NOLO_DISABLE_HTTPS="$DISABLE_HTTPS" \
    PLATFORM_SERVER_HOST="$APP_HTTP_HOST" \
    HTTP_PORT="$APP_HTTP_PORT" \
    "$PM2_BIN" "${args[@]}"
}

rebuild_nolo() {
  # 先清掉其他 PM2 daemon 下的残留 nolo（防双实例抢 LevelDB 锁），
  # 再删除当前 PM2_HOME 的实例，避免 start 前锁被残留实例占用。
  delete_stale_nolo_instances
  delete_nolo_and_wait
  wait_for_leveldb_lock_release
  start_nolo
  wait_for_nolo_app_count "1"
}

# SERVICE_HEALTH_URL may point at /health or /ready depending on the caller;
# keep its scheme/host/port but always probe the canonical /ready endpoint,
# which reports the running buildSha.
resolve_nolo_ready_url() {
  if [[ "$SERVICE_HEALTH_URL" == *"://"* ]]; then
    local scheme="${SERVICE_HEALTH_URL%%://*}"
    local host_port="${SERVICE_HEALTH_URL#*://}"
    host_port="${host_port%%/*}"
    printf '%s\n' "${scheme}://${host_port}/ready"
    return
  fi
  printf '%s\n' "http://127.0.0.1:${APP_HTTP_PORT}/ready"
}

# Hard gate replacing the old blind `sleep 5`: the service must not just
# answer, it must run the code this deploy targeted — /ready buildSha must
# match the deploy target commit (12-char prefix).
wait_for_nolo_ready_sha() {
  local ready_url
  ready_url="$(resolve_nolo_ready_url)"
  local target_sha
  target_sha="$(resolve_deploy_target_sha)"
  local target_prefix="${target_sha:0:12}"
  local started_seconds
  started_seconds="$(date +%s)"

  if [[ -z "$target_prefix" ]]; then
    echo "⚠️ 无法解析部署目标 commit sha，/ready 门退化为仅等待服务就绪 (${ready_url})"
  else
    echo "🎯 等待 nolo 运行目标代码 buildSha=${target_prefix} (${ready_url})..."
  fi

  while true; do
    local body=""
    local server_sha=""
    body="$(curl -fsS --max-time 5 "$ready_url" 2>/dev/null || true)"
    if [[ -n "$body" ]]; then
      if [[ -z "$target_prefix" ]]; then
        echo "✅ nolo /ready 已就绪（目标 sha 未知，未校验 buildSha）"
        return 0
      fi
      server_sha="$(printf '%s' "$body" | python3 -c '
import json
import sys

try:
    payload = json.load(sys.stdin)
except Exception:
    payload = {}
if not isinstance(payload, dict):
    payload = {}
print(payload.get("buildSha") or "")
' 2>/dev/null || true)"
      if [[ -n "$server_sha" && "${server_sha:0:12}" == "$target_prefix" ]]; then
        echo "✅ nolo 已运行目标代码 (buildSha=${server_sha:0:12})"
        return 0
      fi
      echo "⏳ /ready buildSha=${server_sha:-<empty>} 尚未匹配目标 ${target_prefix}..."
    else
      echo "⏳ 等待 nolo /ready 就绪..."
    fi

    if (( $(date +%s) - started_seconds >= DEPLOY_READY_TIMEOUT )); then
      echo "❌ nolo 未在 ${DEPLOY_READY_TIMEOUT}s 内运行目标代码 (url=${ready_url} target=${target_prefix:-unknown} lastBuildSha=${server_sha:-<none>})"
      return 1
    fi
    sleep 2
  done
}

# One automatic self-heal: on gate timeout dump PM2 logs and rebuild once;
# only a second timeout marks the release failed with rollback guidance.
wait_for_nolo_ready_sha_or_recover() {
  if wait_for_nolo_ready_sha; then
    return 0
  fi

  echo "⚠️ nolo 就绪 SHA 门超时，采集 PM2 日志后自动恢复重建一次..."
  pm2_logs
  rebuild_nolo
  if wait_for_nolo_ready_sha; then
    return 0
  fi

  echo "❌ 自动恢复重建后 nolo 仍未运行目标代码"
  pm2_logs
  print_manual_rollback_guidance "nolo-ready-sha"
  return 1
}

rebuild_nolo_with_sha_gate() {
  rebuild_nolo
  wait_for_nolo_ready_sha_or_recover
}

reload_or_start_nolo() {
  if nolo_exists; then
    NOLO_APP_COUNT="$(nolo_app_count)"
    if [[ "$NOLO_APP_COUNT" != "1" ]]; then
      echo "🔁 检测到 ${NOLO_APP_COUNT} 个 nolo PM2 进程，重建为单一固定 interpreter 进程..."
      service_may_need_recovery=1
      rebuild_nolo_with_sha_gate
      return
    fi

    SCRIPT_PATH="$(nolo_pm2_field "pm_exec_path")"
    INTERPRETER_PATH="$(nolo_pm2_field "exec_interpreter")"
    echo "当前 nolo 启动脚本: ${SCRIPT_PATH}"
    echo "当前 nolo Bun interpreter: ${INTERPRETER_PATH}"

    if nolo_has_legacy_tool_worker_env; then
      echo "🔁 检测到旧工具进程环境变量，重建 nolo..."
      service_may_need_recovery=1
      rebuild_nolo_with_sha_gate
    elif [[ "$SCRIPT_PATH" == "$EXPECTED_ENTRY_PATH" && "$INTERPRETER_PATH" == "$BUN_BIN" ]]; then
      echo "📡 nolo 已使用 entry.ts 和固定 Bun，重建以避开 PM2 reload 旧状态..."
      service_may_need_recovery=1
      rebuild_nolo_with_sha_gate
    else
      echo "🔁 检测到旧入口或旧 Bun interpreter，迁移为 ${EXPECTED_ENTRY_PATH} with ${BUN_BIN}..."
      service_may_need_recovery=1
      rebuild_nolo_with_sha_gate
    fi
  else
    echo "🚀 进程不存在，首次启动..."
    start_nolo
    wait_for_nolo_ready_sha_or_recover
  fi
}

recover_nolo_on_exit() {
  local status="$1"
  if [[ "$status" -eq 0 || "$deploy_completed" == "1" || "$service_may_need_recovery" != "1" ]]; then
    return
  fi

  echo "⚠️ Deployment interrupted after service stop; attempting PM2 recovery..."
  NOLO_APP_COUNT="$(nolo_app_count 2>/dev/null || echo 0)"
  if [[ "$NOLO_APP_COUNT" == "1" ]] && run_maybe_sudo "$PM2_BIN" describe nolo 2>/dev/null | grep -q "status.*online"; then
    echo "ℹ️ nolo is already online; no recovery needed"
    return
  fi

  echo "🔁 recovering from ${NOLO_APP_COUNT} PM2 nolo process entries..."
  delete_nolo_and_wait || true
  start_nolo || true
  wait_for_nolo_app_count "1" || true
}

cleanup_on_exit() {
  local status="${1:-$?}"
  trap - EXIT INT TERM
  stop_deploy_window_probe
  recover_nolo_on_exit "$status"
  exit "$status"
}

trap 'cleanup_on_exit $?' EXIT
trap 'cleanup_on_exit 143' INT TERM

configure_caddy_proxy() {
  if [[ "$PROXY_MODE" != "caddy" ]]; then
    return
  fi

  echo "🌐 配置 Caddy 统一入口，upstream=${APP_HTTP_HOST}:${APP_HTTP_PORT}..."
  local script_path="$REPO_DIR/scripts/release/configureCaddyProxy.sh"
  run_env \
    NOLO_CADDY_HOSTS="${NOLO_CADDY_HOSTS:?NOLO_CADDY_HOSTS is required when NOLO_PROXY_MODE=caddy}" \
    NOLO_CADDY_UPSTREAM_HOST="$APP_HTTP_HOST" \
    NOLO_CADDY_UPSTREAM_PORT="$APP_HTTP_PORT" \
    NOLO_CADDY_BIN="${NOLO_CADDY_BIN:-caddy}" \
    NOLO_CADDYFILE_PATH="${NOLO_CADDYFILE_PATH:-/etc/caddy/Caddyfile}" \
    NOLO_CADDY_INSTALL="${NOLO_CADDY_INSTALL:-1}" \
    bash "$script_path"
}

prepare_artifact_stage_dir() {
  local artifact_stage_dir="${NOLO_ARTIFACT_STAGE_DIR:-$REPO_DIR/.deploy-artifact-stage}"
  run_maybe_sudo rm -rf "$artifact_stage_dir"
  run_maybe_sudo mkdir -p "$artifact_stage_dir"
  printf '%s\n' "$artifact_stage_dir"
}

cleanup_artifact_stage_dir() {
  local artifact_stage_dir="${1:-${NOLO_ARTIFACT_STAGE_DIR:-$REPO_DIR/.deploy-artifact-stage}}"
  run_maybe_sudo rm -rf "$artifact_stage_dir"
}

extract_artifact_to_stage() {
  local artifact_path="$1"
  local artifact_stage_dir
  artifact_stage_dir="$(prepare_artifact_stage_dir)"
  run_maybe_sudo tar -xf "$artifact_path" -C "$artifact_stage_dir"
  printf '%s\n' "$artifact_stage_dir"
}

resolve_staged_asset_dir() {
  local artifact_stage_dir="$1"
  python3 - "$artifact_stage_dir/public/latest-assets.json" <<'PY'
import json
import sys

base_path = json.load(open(sys.argv[1]))["basePath"]
print(base_path.strip("/").rstrip("/"))
PY
}

prepare_staged_public_metadata_promotion() {
  local artifact_stage_dir="$1"
  local public_stage_dir="$artifact_stage_dir/public"
  local metadata_stage_dir="$artifact_stage_dir/.public-metadata-promotion"
  local latest_assets_path="$public_stage_dir/latest-assets.json"
  local meta_path="$public_stage_dir/meta.json"

  if ! run_maybe_sudo test -f "$latest_assets_path"; then
    echo "❌ staged artifact 缺少 latest-assets.json" >&2
    return 1
  fi

  if ! run_maybe_sudo test -f "$meta_path"; then
    echo "❌ staged artifact 缺少 meta.json" >&2
    return 1
  fi

  run_maybe_sudo rm -rf "$metadata_stage_dir"
  run_maybe_sudo mkdir -p "$metadata_stage_dir"
  run_maybe_sudo cp "$latest_assets_path" "$metadata_stage_dir/latest-assets.json"
  run_maybe_sudo cp "$meta_path" "$metadata_stage_dir/meta.json"
  printf '%s\n' "$metadata_stage_dir"
}

copy_staged_dir_contents() {
  local source_dir="$1"
  local target_dir="$2"
  if ! run_maybe_sudo test -d "$source_dir"; then
    return
  fi

  run_maybe_sudo mkdir -p "$target_dir"
  run_maybe_sudo cp -R "$source_dir"/. "$target_dir"/
}

sync_staged_public_support_files() {
  local artifact_stage_dir="$1"
  local asset_relative_dir
  asset_relative_dir="$(resolve_staged_asset_dir "$artifact_stage_dir")"

  echo "📁 预热 staged 前端资源到 live public 目录（保留旧 hashed assets）..."
  copy_staged_dir_contents "$artifact_stage_dir/$asset_relative_dir" "$REPO_DIR/$asset_relative_dir"
  copy_staged_dir_contents "$artifact_stage_dir/public/locales" "$REPO_DIR/public/locales"
  copy_staged_dir_contents "$artifact_stage_dir/public/route-styles" "$REPO_DIR/public/route-styles"
}

promote_staged_public_files() {
  local artifact_stage_dir="$1"
  local metadata_stage_dir="${2:-$artifact_stage_dir/public}"
  local latest_assets_path="$metadata_stage_dir/latest-assets.json"
  local meta_path="$metadata_stage_dir/meta.json"
  local latest_assets_tmp_path="$REPO_DIR/public/latest-assets.json.next"
  local meta_tmp_path="$REPO_DIR/public/meta.json.next"

  if ! run_maybe_sudo test -f "$latest_assets_path"; then
    echo "❌ staged artifact 缺少 latest-assets.json"
    return 1
  fi

  if ! run_maybe_sudo test -f "$meta_path"; then
    echo "❌ staged artifact 缺少 meta.json"
    return 1
  fi

  run_maybe_sudo mkdir -p "$REPO_DIR/public"
  run_maybe_sudo cp "$latest_assets_path" "$latest_assets_tmp_path"
  run_maybe_sudo cp "$meta_path" "$meta_tmp_path"
  run_maybe_sudo mv -f "$latest_assets_tmp_path" "$REPO_DIR/public/latest-assets.json"
  run_maybe_sudo mv -f "$meta_tmp_path" "$REPO_DIR/public/meta.json"
}

cleanup_core_dumps() {
  echo "🧹 清理仓库根目录下的 core dump，避免异常退出后占满磁盘..."
  local candidate
  for candidate in "$REPO_DIR"/core "$REPO_DIR"/core.*; do
    run_maybe_sudo test -f "$candidate" || continue
    if run_maybe_sudo file "$candidate" 2>/dev/null | grep -qi 'core file'; then
      run_maybe_sudo rm -f "$candidate"
      echo "已删除 core dump: $candidate"
    else
      echo "跳过非 core dump 文件: $candidate"
    fi
  done
}

cleanup_production_install_state() {
  for cleanup_attempt in 1 2 3; do
    if run_maybe_sudo rm -rf node_modules "$DEPLOY_HOME/.bun/install/cache"; then
      return
    fi
    echo "⚠️ production install cleanup failed, retrying (${cleanup_attempt}/3)"
    sleep "$((cleanup_attempt * 2))"
  done
  run_maybe_sudo rm -rf node_modules "$DEPLOY_HOME/.bun/install/cache" || true
}

disable_core_dumps() {
  local script_path="$REPO_DIR/scripts/ops/disableCoreDumps.sh"
  if [[ ! -f "$script_path" ]]; then
    echo "⚠️ core dump disable script not found: $script_path"
    return
  fi

  run_env \
    NOLO_PM2_BIN="$PM2_BIN" \
    bash "$script_path"
}

install_dependencies() {
  local production_install_log=""
  local production_install_status=0

  if [[ -n "$ARTIFACT_PATH" && "$PRUNE_NODE_MODULES_FOR_ARTIFACT" == "1" ]]; then
    echo "📦 使用 CI 构建产物部署，仅安装生产依赖..."
    for attempt in 1 2 3; do
      if [[ "$attempt" == "1" ]]; then
        echo "♻️ 尝试复用现有生产依赖..."
      else
        cleanup_production_install_state
      fi
      production_install_log="$(mktemp)"
      set +e
      "$BUN_BIN" install --production 2>&1 | tee "$production_install_log"
      production_install_status=${PIPESTATUS[0]}
      set -e

      if [[ "$production_install_status" -eq 0 ]] && grep -Eq "PathAlreadyExists|Failed to install [0-9]+ packages" "$production_install_log"; then
        production_install_status=1
      fi

      if [[ "$production_install_status" -eq 0 ]]; then
        rm -f "$production_install_log"
        return
      fi

      rm -f "$production_install_log"

      echo "⚠️ 生产依赖安装失败，准备重试 (${attempt}/3)"
      if [[ "$attempt" == "3" ]]; then
        return 1
      fi
      sleep "$((attempt * 10))"
    done
    return
  fi

  echo "📦 安装完整依赖..."
  "$BUN_BIN" install --frozen-lockfile
  "$BUN_BIN" install --production
}

ensure_artifact_extract_space() {
  local artifact_path="$1"
  local artifact_bytes
  artifact_bytes="$(wc -c < "$artifact_path" | tr -d '[:space:]')"

  local artifact_kb=$(((artifact_bytes + 1023) / 1024))
  local required_kb=$((MIN_FREE_KB + artifact_kb * EXTRACT_SPACE_MULTIPLIER))
  local available_kb
  available_kb="$(df -Pk "$REPO_DIR" | awk 'NR == 2 { print $4 }')"

  echo "💽 检查磁盘空间: available=${available_kb}KB required=${required_kb}KB artifact=${artifact_kb}KB reserve=${MIN_FREE_KB}KB"
  if ((available_kb < required_kb)); then
    echo "❌ 可用磁盘空间不足，取消部署且不停止当前服务"
    return 1
  fi
}

cd "$REPO_DIR"
echo "🏠 部署 HOME=${HOME} PM2_HOME=${PM2_HOME}"
timed_deploy_step "restore-tmp-runtime-state" restore_tmp_runtime_state
timed_deploy_step "disable-core-dumps" disable_core_dumps
timed_deploy_step "cleanup-core-dumps" cleanup_core_dumps
if [[ "$SKIP_GIT_SYNC" != "1" ]]; then
  echo "📥 更新代码到最新 ${BRANCH}..."
  git fetch --all
  git reset --hard "origin/${BRANCH}"
fi

if [[ "$SKIP_DEPLOY_INSTALL" == "1" ]]; then
  echo "Skipping deploy dependency install because NOLO_SKIP_DEPLOY_INSTALL=1"
else
  timed_deploy_step "install-dependencies" install_dependencies
fi

timed_deploy_step "ensure-tsc" ensure_tsc
timed_deploy_step "ensure-rg" ensure_rg
timed_deploy_step "ensure-rtk" ensure_rtk
timed_deploy_step "ensure-playwright-browser" ensure_playwright_browser
timed_deploy_step "verify-production-env" verify_production_env

if [[ -n "$ARTIFACT_PATH" ]]; then
  artifact_stage_dir=""
  public_metadata_stage_dir=""
  if [[ ! -f "$ARTIFACT_PATH" ]]; then
    echo "❌ 缺少 CI 前端构建产物: $ARTIFACT_PATH"
    exit 1
  fi

  echo "📦 使用 CI 前端构建产物..."
  if ! timed_deploy_step "ensure-artifact-extract-space" ensure_artifact_extract_space "$ARTIFACT_PATH"; then
    timed_deploy_step "cleanup-artifact-stage-dir" cleanup_artifact_stage_dir
    timed_deploy_step "ensure-artifact-extract-space-after-cleanup" ensure_artifact_extract_space "$ARTIFACT_PATH"
  fi
  artifact_stage_dir="$(extract_artifact_to_stage "$ARTIFACT_PATH")"
  public_metadata_stage_dir="$(prepare_staged_public_metadata_promotion "$artifact_stage_dir")"
  timed_deploy_step "sync-staged-public-support-files" sync_staged_public_support_files "$artifact_stage_dir"

  if [[ "$STOP_BEFORE_ARTIFACT_PROMOTE" == "1" ]]; then
    echo "🧹 低内存兼容模式：artifact promote 前先释放 PM2 进程占用..."
    service_may_need_recovery=1
    timed_deploy_step "stop-nolo-before-artifact-promote" run_maybe_sudo "$PM2_BIN" stop nolo || true
  else
    echo "♻️ 保持 nolo 在线完成 artifact promote；如需低内存兼容可设置 NOLO_STOP_BEFORE_ARTIFACT_PROMOTE=1"
  fi

  timed_deploy_step "promote-staged-public-files" promote_staged_public_files "$artifact_stage_dir" "$public_metadata_stage_dir"
  timed_deploy_step "remove-artifact" run_maybe_sudo rm -f "$ARTIFACT_PATH"
  timed_deploy_step "cleanup-artifact-stage-dir" cleanup_artifact_stage_dir "$artifact_stage_dir"
else
  echo "🛠 运行前端构建（esbuild）..."
  # Stamp server-side builds with the deploy target sha so /ready buildSha can
  # prove the running code matches this deploy (CI artifact deploys already
  # carry NOLO_BUILD_SHA from the builder).
  timed_deploy_step "build-frontend" env NODE_ENV=production NOLO_FORCE_PRODUCTION=1 NOLO_BUILD_SHA="${NOLO_BUILD_SHA:-$(resolve_deploy_target_sha)}" "$BUN_BIN" run ./scripts/dev/esBuild.js
fi

if [[ "$SKIP_CORE_RELOAD" == "1" ]]; then
  echo "♻️ 纯前端 artifact 部署：保持 nolo 核心进程在线，跳过重载"
  # Even though the core is not restarted, we must confirm it's still
  # healthy before promoting new browser assets. Serving a new frontend
  # to users against a broken backend is worse than staying on the old
  # frontend until the core recovers.
  echo "🔍 确认核心服务健康..."
  if ! curl -fsS "$SERVICE_HEALTH_URL" >/dev/null 2>&1; then
    echo "❌ 核心服务未通过健康检查，取消部署"
    pm2_logs
    exit 1
  fi
  echo "✅ 核心服务在线"
else
  echo "🔄 开始热重载部署..."
  start_deploy_window_probe
  timed_deploy_step "reload-or-start-nolo" reload_or_start_nolo
fi

echo "💾 保存 PM2 进程列表..."
timed_deploy_step "pm2-save" run_maybe_sudo "$PM2_BIN" save

echo "🔍 检查部署结果..."
timed_deploy_step "pm2-status" run_maybe_sudo "$PM2_BIN" status nolo

if ! run_maybe_sudo "$PM2_BIN" describe nolo | grep -q "status.*online"; then
  echo "❌ nolo 进程未在线"
  pm2_logs
  auto_rollback "pm2-not-online"
  exit 1
fi

if ! retry_http_contains "nolo" "$SERVICE_HEALTH_URL" "ok"; then
  pm2_logs
  auto_rollback "healthcheck"
  exit 1
fi

if ! timed_deploy_step "verify-rendered-assets" verify_rendered_assets; then
  stop_deploy_window_probe
  pm2_logs
  auto_rollback "verify-rendered-assets"
  exit 1
fi

stop_deploy_window_probe
timed_deploy_step "configure-caddy-proxy" configure_caddy_proxy
deploy_completed=1

echo "🚀 热重载部署成功！PM2 与 HTTP healthcheck 均通过"
