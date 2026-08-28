#!/usr/bin/env bash
# scripts/ci/runNoloMirrorOpenSource.sh
# 把 bun-nolo 的客户端源码（CLI + desktop + 前端共享链，保留 monorepo 结构）
# mirror 到 nolotus/nolo（public）开源仓库。
#
# 关键：git clone --depth 1 + 清空重来 + 单 commit —— bun-nolo 的历史
# commit 绝不进入 public 仓库（历史里可能有敏感信息）。
set -Eeuo pipefail

# trap 尽早挂载（mktemp 之后立刻），避免早期失败残留临时目录
PRESERVE_DIR="$(mktemp -d)"
WORK_DIR="$(mktemp -d)"
trap cleanup EXIT

BUN_BIN="${NOLO_BUN_BIN:-bun}"
GIT_BIN="${NOLO_GIT_BIN:-git}"
OUT_DIR="${NOLO_MIRROR_OUT_DIR:-.tmp/nolo-open-source-mirror}"
MIRROR_REPO="${NOLO_MIRROR_REPO:-https://github.com/nolotus/nolo.git}"

cleanup() {
  rm -rf "$PRESERVE_DIR" "$WORK_DIR" "$OUT_DIR"
}

log() {
  printf '[nolo-mirror-ci] %s\n' "$*" >&2
}

require_mirror_token() {
  if [[ -z "${NOLO_MIRROR_GH_TOKEN:-${GH_TOKEN:-}}" ]]; then
    echo "NOLO_MIRROR_GH_TOKEN or GH_TOKEN is required to push the open-source mirror." >&2
    return 1
  fi
}

resolve_nolo_version() {
  if [[ -f "./packages/desktop/desktopVersion.ts" ]]; then
    "$BUN_BIN" -e '
      const { DESKTOP_APP_VERSION } = await import("./packages/desktop/desktopVersion.ts");
      process.stdout.write(DESKTOP_APP_VERSION);
    ' 2>/dev/null && return 0
  fi
  "$BUN_BIN" -p "require('./packages/cli/package.json').version" 2>/dev/null || echo "snapshot"
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

# push 用 token 不拼进 URL / 不传 -c 参数（避免 ps/日志泄漏）；
# 改用 GIT_ASKPASS 脚本从环境变量读取（token 只存在于进程环境）
push_with_token() {
  local token="$1"
  shift
  local askpass
  askpass="$(mktemp)"
  chmod 700 "$askpass"
  # 脚本从 MIRROR_TOKEN 环境变量读取，避免 token 出现在脚本文件内容里
  printf '#!/usr/bin/env bash\nprintf %%s "$MIRROR_TOKEN"\n' >"$askpass"
  MIRROR_TOKEN="$token" GIT_ASKPASS="$askpass" "$GIT_BIN" "$@"
  rm -f "$askpass"
}

main() {
  local version repo_dir token
  require_mirror_token
  version="$(resolve_nolo_version)"
  token="${NOLO_MIRROR_GH_TOKEN:-${GH_TOKEN}}"

  rm -rf "$OUT_DIR"
  "$BUN_BIN" ./scripts/release/prepareNoloOpenSourceMirror.ts --out-dir "$OUT_DIR"

  # --depth 1：只取最新，不带任何历史 commit
  "$GIT_BIN" clone --depth 1 "$MIRROR_REPO" "$WORK_DIR/repo"
  repo_dir="$WORK_DIR/repo"

  # 防护：确认确实是 git 仓库再清空，避免误删
  if [[ ! -d "$repo_dir/.git" ]]; then
    echo "ERROR: $repo_dir is not a git repository; aborting." >&2
    return 1
  fi

  preserve_open_source_scaffold "$repo_dir"

  find "$repo_dir" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
  cp -a "$OUT_DIR/." "$repo_dir/"

  restore_open_source_scaffold "$repo_dir"

  cd "$repo_dir"
  "$GIT_BIN" config user.email "s@nolotus.com"
  "$GIT_BIN" config user.name "nolotus"
  # 移除可能带凭据的 origin，改用 push_with_token 的 credential helper
  "$GIT_BIN" remote set-url origin "https://github.com/nolotus/nolo.git"
  "$GIT_BIN" add -A

  if "$GIT_BIN" diff --staged --quiet; then
    log "Open-source mirror already up to date for ${version}."
    return 0
  fi

  # 单 commit + force push：历史保持单点，不带 bun-nolo 任何历史
  "$GIT_BIN" commit -m "$(cat <<EOF
mirror: sync nolo client source for ${version}

Automated mirror from bun-nolo. Public repo is a read-only source
mirror; releases are published from bun-nolo.
EOF
)"
  "$GIT_BIN" tag -f "v${version}"
  push_with_token "$token" push origin main --force
  push_with_token "$token" push origin "refs/tags/v${version}" --force

  log "Mirrored nolo source to nolotus/nolo@v${version}"
}

main "$@"
