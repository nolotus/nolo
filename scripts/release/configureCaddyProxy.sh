#!/usr/bin/env bash

set -Eeuo pipefail

HOSTS="${NOLO_CADDY_HOSTS:?NOLO_CADDY_HOSTS is required, for example nolo.chat or us.nolo.chat}"
UPSTREAM_HOST="${NOLO_CADDY_UPSTREAM_HOST:-127.0.0.1}"
UPSTREAM_PORT="${NOLO_CADDY_UPSTREAM_PORT:-38123}"
CADDY_BIN="${NOLO_CADDY_BIN:-caddy}"
CADDYFILE_PATH="${NOLO_CADDYFILE_PATH:-/etc/caddy/Caddyfile}"
INSTALL_CADDY="${NOLO_CADDY_INSTALL:-1}"
PLATFORM_TLS_CERT="${NOLO_CADDY_PLATFORM_TLS_CERT:-}"
PLATFORM_TLS_KEY="${NOLO_CADDY_PLATFORM_TLS_KEY:-}"
PREVIEW_SLOTS="${NOLO_CADDY_PREVIEW_SLOTS:-}"
EXTRA_PROXY_FILE="${NOLO_CADDY_EXTRA_PROXY_FILE:-/etc/caddy/nolo-extra-proxy.caddy}"
# chat proxy 进程拆分（docs/plans/2026-08-31-chat-proxy-process-split.md，T4）。
# 端口为空（默认）时 @chat 块完全不渲染，chat 仍由下面的 @stream 打到 core upstream，
# 渲染结果与拆分前逐字节相同 —— 分流必须由调用方显式开启。
CHAT_PROXY_UPSTREAM_HOST="${NOLO_CADDY_CHAT_PROXY_UPSTREAM_HOST:-$UPSTREAM_HOST}"
CHAT_PROXY_UPSTREAM_PORT="${NOLO_CADDY_CHAT_PROXY_UPSTREAM_PORT:-}"
CHAT_PROXY_PATHS="${NOLO_CADDY_CHAT_PROXY_PATHS:-/api/v1/chat}"
# 流式（SSE / WebSocket）路径。两处消费：@stream 反代块（免缓冲直通）与
# encode 的排除匹配器，必须共用同一份列表。
# 为什么 SSE 必须排除出 encode：压缩中间件会把 text/event-stream 攒成一整块，
# 等生成结束才下发。2026-09-01 在 nolo.chat 实测到该形态：SSE 带
# content-encoding: gzip 返回、整条流 1 个 chunk、首字节 = 总生成时长
# 5.8-16.3s；同期 Accept-Encoding: identity 对照 123-138 chunks、首字节
# 1.2-3.6s。此处不赌边缘 Caddy 版本（2.8+ 才自动跳过 SSE），显式排除。
STREAM_PATHS="/api/events/* /api/notifications /api/agent/run /api/v1/chat /api/cli/chat /api/connector/ws"

run_root() {
  if [[ "$(id -u)" == "0" ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

restore_tmp_runtime_state() {
  run_root install -d -m 1777 /tmp
  run_root chmod 1777 /tmp
}

ensure_caddy() {
  if command -v "$CADDY_BIN" >/dev/null 2>&1; then
    return
  fi

  if [[ "$INSTALL_CADDY" != "1" ]]; then
    echo "❌ caddy is not installed and NOLO_CADDY_INSTALL is not 1"
    exit 1
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    echo "❌ automatic Caddy install currently supports apt-get hosts only"
    exit 1
  fi

  run_root apt-get update
  run_root apt-get install -y caddy
}

normalize_hosts() {
  printf '%s\n' "$HOSTS" | tr ',' ' ' | xargs
}

caddy_site_addresses() {
  normalize_hosts | sed 's/ /, /g'
}

hosts_contain_wildcard() {
  local host
  for host in $(normalize_hosts); do
    if [[ "$host" == \*.* ]]; then
      return 0
    fi
  done
  return 1
}

normalize_preview_slots() {
  printf '%s\n' "$PREVIEW_SLOTS" | tr ',' ' ' | xargs
}

preview_slot_site_blocks() {
  local tls_block="$1"
  local entry host port

  for entry in $(normalize_preview_slots); do
    host="${entry%%:*}"
    port="${entry##*:}"
    if [[ -z "$host" || -z "$port" || "$host" == "$port" ]]; then
      echo "❌ invalid NOLO_CADDY_PREVIEW_SLOTS entry: ${entry} (expected host:port)"
      exit 1
    fi
    if ! [[ "$port" =~ ^[0-9]+$ ]]; then
      echo "❌ invalid preview port for ${host}: ${port}"
      exit 1
    fi
    cat <<EOF
${host} {
${tls_block}
	import nolo_proxy ${UPSTREAM_HOST} ${port}
}

EOF
  done
}

read_extra_proxy_snippet() {
  if [[ -f "$EXTRA_PROXY_FILE" ]]; then
    cat "$EXTRA_PROXY_FILE"
  fi
}

# 渲染 chat-proxy 分流块（@chat）。空端口 => 不输出任何内容 => 行为与拆分前一致。
#
# ⚠️ 顺序硬约束：Caddy 在同一 site/snippet 内按**书写顺序**匹配同类指令，而下面的
# `@stream` 匹配器本身就包含 /api/v1/chat。因此该块必须渲染在 @stream 与
# catch-all reverse_proxy **之前**，否则 chat 会被 @stream 抢先打回 core，
# 分流静默失效（配置校验也不会报错）。调用点见 render_caddyfile。
render_chat_proxy_route_block() {
  if [[ -z "$CHAT_PROXY_UPSTREAM_PORT" ]]; then
    return 0
  fi

  if ! [[ "$CHAT_PROXY_UPSTREAM_PORT" =~ ^[0-9]+$ ]]; then
    echo "❌ invalid NOLO_CADDY_CHAT_PROXY_UPSTREAM_PORT: ${CHAT_PROXY_UPSTREAM_PORT}" >&2
    exit 1
  fi
  if [[ "$CHAT_PROXY_UPSTREAM_PORT" == "$UPSTREAM_PORT" && "$CHAT_PROXY_UPSTREAM_HOST" == "$UPSTREAM_HOST" ]]; then
    echo "❌ chat proxy upstream ${CHAT_PROXY_UPSTREAM_HOST}:${CHAT_PROXY_UPSTREAM_PORT} equals the core upstream; split would be a no-op" >&2
    exit 1
  fi
  if [[ -z "${CHAT_PROXY_PATHS//[[:space:]]/}" ]]; then
    echo "❌ NOLO_CADDY_CHAT_PROXY_PATHS resolved to an empty path list" >&2
    exit 1
  fi

  cat <<EOF
	@chat path ${CHAT_PROXY_PATHS}
	reverse_proxy @chat ${CHAT_PROXY_UPSTREAM_HOST}:${CHAT_PROXY_UPSTREAM_PORT} {
		lb_try_duration 60s
		lb_try_interval 250ms
		# Retry only safe page/event reads when the upstream is draining.
		lb_retry_match {
			method GET HEAD
		}
		header_up -X-Nolo-Client-IP
		header_up X-Nolo-Client-IP {remote_host}
		header_up X-Real-IP {remote_host}
		flush_interval -1
	}
EOF
}

caddy_is_active() {
  if command -v systemctl >/dev/null 2>&1; then
    run_root systemctl is-active --quiet caddy
    return
  fi

  return 1
}

render_caddyfile() {
  local normalized_hosts
  normalized_hosts="$(normalize_hosts)"
  if [[ -z "$normalized_hosts" ]]; then
    echo "❌ NOLO_CADDY_HOSTS resolved to an empty host list"
    exit 1
  fi

  if hosts_contain_wildcard && { [[ -z "$PLATFORM_TLS_CERT" ]] || [[ -z "$PLATFORM_TLS_KEY" ]]; }; then
    echo "❌ wildcard platform hosts require NOLO_CADDY_PLATFORM_TLS_CERT and NOLO_CADDY_PLATFORM_TLS_KEY"
    echo "   Use a Cloudflare Origin Certificate or another wildcard certificate for *.nolo.chat."
    exit 1
  fi

  local site_addresses
  site_addresses="$(caddy_site_addresses)"

  local platform_tls_block=""
  if [[ -n "$PLATFORM_TLS_CERT" || -n "$PLATFORM_TLS_KEY" ]]; then
    if [[ -z "$PLATFORM_TLS_CERT" || -z "$PLATFORM_TLS_KEY" ]]; then
      echo "❌ NOLO_CADDY_PLATFORM_TLS_CERT and NOLO_CADDY_PLATFORM_TLS_KEY must be set together"
      exit 1
    fi
    platform_tls_block=$'\ttls '"${PLATFORM_TLS_CERT}"$' '"${PLATFORM_TLS_KEY}"
  fi

  local preview_site_blocks
  preview_site_blocks="$(preview_slot_site_blocks "$platform_tls_block")"

  local extra_proxy_snippet=""
  extra_proxy_snippet="$(read_extra_proxy_snippet)"

  # 声明与赋值分开：`local x="$(f)"` 会吞掉 f 的退出码（local 总是返回 0），
  # 那样 render_chat_proxy_route_block 里的校验失败就不会中止脚本。
  local chat_proxy_block
  chat_proxy_block="$(render_chat_proxy_route_block)"

  # encode 排除列表 = 流式路径 ∪ chat 分流路径（去重，保持出现顺序）。
  # set -f：路径列表含字面通配符（/api/events/*），未加引号展开会同时触发
  # 分词与 pathname expansion——部署机上若真存在 /api/events/ 目录，`*` 会被
  # 静默替换成实际文件名，排除列表被污染且校验照样通过。分词是这里要的，
  # glob 不是，所以只关 glob。
  local ENCODE_EXCLUDED_PATHS=""
  local seen_path
  set -f
  for seen_path in $STREAM_PATHS $CHAT_PROXY_PATHS; do
    if [[ " $ENCODE_EXCLUDED_PATHS " != *" $seen_path "* ]]; then
      ENCODE_EXCLUDED_PATHS+="${ENCODE_EXCLUDED_PATHS:+ }$seen_path"
    fi
  done
  set +f
  if [[ -n "$chat_proxy_block" ]]; then
    chat_proxy_block+=$'\n\n'
  fi

  cat <<EOF
# Generated by scripts/release/configureCaddyProxy.sh.
# Caddy owns public 80/443; Bun stays on the loopback upstream below.
{
	servers {
		protocols h1 h2
	}
	on_demand_tls {
		ask http://${UPSTREAM_HOST}:${UPSTREAM_PORT}/api/app/domain/allow
	}
}

(nolo_proxy) {
	# 压缩只对非流式响应生效：gzip encoder 会把 SSE 攒成一整块，抹掉流式
	# 的全部 TTFT 收益（见 STREAM_PATHS 注释的实测数据）。@chat 自定义路径
	# 一并排除，避免分流配置绕开这条约束。
	@compressible not path ${ENCODE_EXCLUDED_PATHS}
	encode @compressible gzip

${extra_proxy_snippet}

${chat_proxy_block}	@stream path ${STREAM_PATHS}
	reverse_proxy @stream {args.0}:{args.1} {
		lb_try_duration 60s
		lb_try_interval 250ms
		# Retry only safe page/event reads when the upstream is draining.
		lb_retry_match {
			method GET HEAD
		}
		header_up -X-Nolo-Client-IP
		header_up X-Nolo-Client-IP {remote_host}
		header_up X-Real-IP {remote_host}
		flush_interval -1
	}

	reverse_proxy {args.0}:{args.1} {
		lb_try_duration 60s
		lb_try_interval 250ms
		# Retry only safe page/event reads when the upstream is draining.
		lb_retry_match {
			method GET HEAD
		}
		header_up -X-Nolo-Client-IP
		header_up X-Nolo-Client-IP {remote_host}
		header_up X-Real-IP {remote_host}
	}
}

${site_addresses} {
${platform_tls_block}
	import nolo_proxy ${UPSTREAM_HOST} ${UPSTREAM_PORT}
}

${preview_site_blocks}
https:// {
	tls {
		on_demand
	}
	import nolo_proxy ${UPSTREAM_HOST} ${UPSTREAM_PORT}
}

http:// {
	redir https://{host}{uri} 308
}
EOF
}

write_caddyfile_if_changed() {
  local tmp
  tmp="$(mktemp)"
  render_caddyfile > "$tmp"
  run_root "$CADDY_BIN" fmt --overwrite "$tmp"

  if run_root test -f "$CADDYFILE_PATH" && run_root cmp -s "$tmp" "$CADDYFILE_PATH" && caddy_is_active; then
    rm -f "$tmp"
    echo "✅ Caddy reverse proxy already current; skipping reload"
    return 1
  fi

  run_root install -d -m 755 "$(dirname "$CADDYFILE_PATH")"
  run_root install -m 644 "$tmp" "$CADDYFILE_PATH"
  rm -f "$tmp"
  return 0
}

reload_caddy() {
  run_root "$CADDY_BIN" validate --adapter caddyfile --config "$CADDYFILE_PATH"

  if command -v systemctl >/dev/null 2>&1; then
    run_root systemctl enable caddy
    if run_root systemctl is-active --quiet caddy; then
      if ! run_root systemctl reload caddy; then
        echo "⚠️ Caddy reload failed; showing service diagnostics before restart fallback"
        run_root systemctl status caddy --no-pager || true
        run_root journalctl -xeu caddy.service -n 80 --no-pager || true
        run_root systemctl restart caddy
      fi
    else
      run_root systemctl restart caddy
    fi
  else
    run_root "$CADDY_BIN" reload --adapter caddyfile --config "$CADDYFILE_PATH"
  fi
}

restore_tmp_runtime_state
ensure_caddy
if write_caddyfile_if_changed; then
  reload_caddy
fi

echo "✅ Caddy reverse proxy configured: hosts=$(normalize_hosts) upstream=${UPSTREAM_HOST}:${UPSTREAM_PORT}"
if [[ -n "$CHAT_PROXY_UPSTREAM_PORT" ]]; then
  echo "✅ Caddy chat split active: paths=[${CHAT_PROXY_PATHS}] → ${CHAT_PROXY_UPSTREAM_HOST}:${CHAT_PROXY_UPSTREAM_PORT}"
else
  echo "ℹ️ Caddy chat split disabled (no NOLO_CADDY_CHAT_PROXY_UPSTREAM_PORT); chat stays on the core upstream"
fi
