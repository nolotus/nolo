#!/usr/bin/env bash
#
# T4 行为场景库。每个 scenario_* 函数在 deployRemoteChatProxyHarness.sh 里被调用，
# 此时 deployRemote.sh 的全部变量/函数已就位、$PM2_BIN 指向假 pm2。
# 约定：场景末尾打印一行 `RESULT ...`，由 TS 测试解析；内部断言失败直接非 0 退出。

emit_result() {
  printf 'RESULT ready=%s failed=%s started=%s\n' \
    "$chat_proxy_upstream_ready" "$chat_proxy_failed" "$chat_proxy_started"
}

# ---------------------------------------------------------------------------
# 命名/端口隔离硬门
# ---------------------------------------------------------------------------

scenario_isolation_accepts_default_name() {
  assert_chat_proxy_app_name_isolation
}

scenario_isolation_rejects_nolo() {
  CHAT_PROXY_APP_NAME="nolo"
  assert_chat_proxy_app_name_isolation
}

scenario_isolation_rejects_canary_slot() {
  CHAT_PROXY_APP_NAME="$NOLO_BLUE_GREEN_CANARY_NAME"
  assert_chat_proxy_app_name_isolation
}

scenario_isolation_rejects_empty_name() {
  CHAT_PROXY_APP_NAME=""
  assert_chat_proxy_app_name_isolation
}

scenario_isolation_rejects_core_port_clash() {
  CHAT_PROXY_HTTP_PORT="$APP_HTTP_PORT"
  assert_chat_proxy_app_name_isolation
}

# ---------------------------------------------------------------------------
# core 的停机/清理/计数函数看不见 chat-proxy
# ---------------------------------------------------------------------------

# jlist 里只有 nolo-chat-proxy 在跑时，graceful_stop_nolo 必须走「nolo 不存在」分支，
# 且只对字面名 "nolo" 发命令 —— 这就是 core 部署不会停掉 chat-proxy 的运行时证据。
scenario_graceful_stop_nolo_ignores_chat_proxy() {
  graceful_stop_nolo
  echo "RESULT graceful_stop_nolo=done"
}

# core 的实例计数按精确名匹配，chat-proxy 不该被计入，也不该让 count 门误判。
scenario_core_counts_ignore_chat_proxy() {
  local count
  count="$(nolo_app_count)"
  local exists="no"
  if nolo_exists; then exists="yes"; fi
  local wait_status=0
  wait_for_nolo_app_count "1" 3 || wait_status=$?
  printf 'RESULT count=%s exists=%s wait_status=%s\n' "$count" "$exists" "$wait_status"
}

# 跨 PM2_HOME 的残留清理只对字面名 "nolo" 发 delete。
scenario_delete_stale_uses_literal_nolo() {
  delete_stale_nolo_instances
  echo "RESULT delete_stale=done"
}

# ---------------------------------------------------------------------------
# chat-proxy 自身的接线
# ---------------------------------------------------------------------------

scenario_wire_disabled_is_noop() {
  wire_chat_proxy
  emit_result
}

# app 不存在 → 启动一份，env 带 role/port。
# 与真实接线链 wire_chat_proxy 保持一致：ensure_chat_proxy_internal_token_file 先行
# （start_chat_proxy 在 set -u 下读 CHAT_PROXY_INTERNAL_TOKEN_FILE）。
scenario_ensure_starts_when_absent() {
  ensure_chat_proxy_internal_token_file
  ensure_chat_proxy_app
  emit_result
}

# app 已在跑 → 一条 pm2 变更命令都不许发（core 部署不停、不重启、不等它）。
scenario_ensure_never_restarts_running_app() {
  ensure_chat_proxy_app
  emit_result
}

# 显式 opt-in 才重启（chat-proxy 自己的发布通道）。
scenario_ensure_restarts_only_when_opted_in() {
  CHAT_PROXY_RESTART=1
  ensure_chat_proxy_app
  emit_result
}

# 探活通过 → ready=1（Caddy 才会拿到 chat upstream）。
scenario_wire_success() {
  wire_chat_proxy
  emit_result
}

# 探活失败 → failed=1 且 ready=0：不切流、大声失败。
scenario_wire_health_failure() {
  wire_chat_proxy
  emit_result
}

# configure_caddy_proxy 只在 ready=1 时下发 chat upstream；否则传空值。
# 用假的 configureCaddyProxy.sh 记录收到的 env。
scenario_caddy_env_when_not_ready() {
  configure_caddy_proxy
  emit_result
}

scenario_caddy_env_when_ready() {
  chat_proxy_upstream_ready=1
  configure_caddy_proxy
  emit_result
}
