#!/usr/bin/env bash
#
# 假 PM2：把每次调用与关键 env 追加到 $FAKE_PM2_LOG，`jlist` 回放 $FAKE_PM2_JLIST。
# 测试据此断言「core 停机路径到底对哪些 app 名发了命令」。
set -Eeuo pipefail

{
  printf 'CALL:'
  printf ' %s' "$@"
  printf '\n'
  printf 'ENV: role=%s port=%s reuse=%s slot=%s\n' \
    "${NOLO_SERVER_RUNTIME_ROLE:-}" "${HTTP_PORT:-}" \
    "${NOLO_REUSE_PORT:-}" "${NOLO_SLOT:-}"
} >>"${FAKE_PM2_LOG:?FAKE_PM2_LOG is required}"

case "${1:-}" in
  jlist)
    cat "${FAKE_PM2_JLIST:?FAKE_PM2_JLIST is required}"
    ;;
  pid)
    # 读操作：按 name 从 jlist 匹配，输出一个稳定假 pid（fixtures 的 jlist 不带
    # 真实 pid 字段，故统一回 4242）。真实部署里 chat_proxy_env_matches 拿它去读
    # /proc/$pid/environ；mac 开发机无 /proc，[[ -r ]] 失败即视为 env 匹配（不重建）。
    # pid 调用仍照常写入 CALL 日志 —— 测试对「变更序列」的断言只看五动词
    # （start/stop/restart/reload/delete），读操作出现在日志里恰好锁住
    # 「env 漂移检查确实发生了」这一新行为。
    local target="${2:-}"
    python3 -c '
import json, sys
try:
    apps = json.load(sys.stdin)
except Exception:
    sys.exit(1)
match = [a for a in apps if a.get("name") == sys.argv[1]]
if not match:
    sys.exit(1)
print(match[0].get("pid", "4242"), end="")
' "$target" < "${FAKE_PM2_JLIST:?FAKE_PM2_JLIST is required}"
    ;;
  *)
    :
    ;;
esac
