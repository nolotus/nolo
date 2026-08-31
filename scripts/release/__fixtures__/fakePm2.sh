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
  *)
    :
    ;;
esac
