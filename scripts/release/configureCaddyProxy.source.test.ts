import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "configureCaddyProxy.sh"), "utf-8");

describe("configureCaddyProxy source contract", () => {
  it("keeps platform hosts and bound custom domains on the same Bun upstream", () => {
    expect(source).toContain('PLATFORM_TLS_CERT="${NOLO_CADDY_PLATFORM_TLS_CERT:-}"');
    expect(source).toContain('PLATFORM_TLS_KEY="${NOLO_CADDY_PLATFORM_TLS_KEY:-}"');
    expect(source).toContain('PREVIEW_SLOTS="${NOLO_CADDY_PREVIEW_SLOTS:-}"');
    expect(source).toContain('EXTRA_PROXY_FILE="${NOLO_CADDY_EXTRA_PROXY_FILE:-/etc/caddy/nolo-extra-proxy.caddy}"');
    expect(source).toContain("caddy_site_addresses()");
    expect(source).toContain("preview_slot_site_blocks()");
    expect(source).toContain("read_extra_proxy_snippet()");
    expect(source).toContain("hosts_contain_wildcard()");
    expect(source).toContain("wildcard platform hosts require NOLO_CADDY_PLATFORM_TLS_CERT");
    expect(source).toContain("on_demand_tls");
    expect(source).toContain("servers {");
    expect(source).toContain("protocols h1 h2");
    expect(source).toContain("ask http://${UPSTREAM_HOST}:${UPSTREAM_PORT}/api/app/domain/allow");
    expect(source).toContain("(nolo_proxy)");
    expect(source).toContain("${extra_proxy_snippet}");
    expect(source).toContain("reverse_proxy @stream {args.0}:{args.1}");
    expect(source).toContain("reverse_proxy {args.0}:{args.1}");
    expect(source).toContain("encode gzip");
    expect(source).not.toContain("encode zstd gzip");
    expect(source).toContain("${site_addresses} {");
    expect(source).toContain("import nolo_proxy ${UPSTREAM_HOST} ${UPSTREAM_PORT}");
    expect(source).toContain("${preview_site_blocks}");
    expect(source).toContain("${platform_tls_block}");
    expect(source).toContain('validate --adapter caddyfile --config "$CADDYFILE_PATH"');
    expect(source).toContain("https:// {");
    expect(source).toContain("on_demand");
    expect(source).toContain("http:// {");
    expect(source).toContain("redir https://{host}{uri} 308");
  });

  it("keeps streaming endpoints unbuffered through Caddy", () => {
    expect(source).toContain("@stream path /api/events/* /api/notifications /api/agent/run /api/v1/chat /api/connector/ws");
    expect(source).toContain("header_up -X-Nolo-Client-IP");
    expect(source).toContain("header_up X-Nolo-Client-IP {remote_host}");
    expect(source).toContain("header_up X-Real-IP {remote_host}");
    expect(source).toContain("flush_interval -1");
  });

  it("retries transient loopback connection refusals during Bun reloads", () => {
    // 每个 reverse_proxy 块都必须带重试参数，所以按「块数」断言而不是写死数字。
    // 当前 3 块：@chat（T4 chat-proxy 分流，端口为空时不渲染）、@stream、catch-all。
    const proxyBlockCount = (source.match(/^\t*reverse_proxy [^\n]*\{$/gm) ?? []).length;
    expect(proxyBlockCount).toBeGreaterThanOrEqual(2);
    expect(source.match(/lb_try_duration 60s/g)?.length).toBe(proxyBlockCount);
    expect(source.match(/lb_try_interval 250ms/g)?.length).toBe(proxyBlockCount);
    expect(source.indexOf("lb_try_duration 60s")).toBeLessThan(source.indexOf("flush_interval -1"));
  });

  it("retries only safe GET/HEAD reads when the upstream is draining", () => {
    const proxyBlockCount = (source.match(/^\t*reverse_proxy [^\n]*\{$/gm) ?? []).length;
    const retryMatchers = source.match(
      /lb_retry_match \{\n\s*method GET HEAD\n\s*\}/g
    );
    // 3 块 = @chat（T4 分流）+ @stream + catch-all；每块都只重试安全方法。
    expect(retryMatchers).toHaveLength(proxyBlockCount);
    expect(source).not.toMatch(/lb_retry_match[\s\S]*method GET POST/);
    expect(source.match(/method GET HEAD/g)).toHaveLength(proxyBlockCount);
  });

  it("falls back to restart with diagnostics when systemd reload fails", () => {
    expect(source).toContain("restore_tmp_runtime_state()");
    expect(source).toContain("run_root install -d -m 1777 /tmp");
    expect(source).toContain("run_root chmod 1777 /tmp");
    expect(source.indexOf("restore_tmp_runtime_state")).toBeLessThan(
      source.lastIndexOf("systemctl reload caddy")
    );
    expect(source).toContain("systemctl reload caddy");
    expect(source).toContain("Caddy reload failed; showing service diagnostics before restart fallback");
    expect(source).toContain("systemctl status caddy --no-pager");
    expect(source).toContain("journalctl -xeu caddy.service -n 80 --no-pager");
    expect(source).toContain("systemctl restart caddy");
  });

  it("skips Caddy rewrites and reloads when the rendered config is already active", () => {
    expect(source).toContain("caddy_is_active()");
    expect(source).toContain("write_caddyfile_if_changed()");
    expect(source).toContain('run_root "$CADDY_BIN" fmt --overwrite "$tmp"');
    expect(source).toContain('cmp -s "$tmp" "$CADDYFILE_PATH"');
    expect(source).toContain("Caddy reverse proxy already current; skipping reload");
    expect(source).toContain('if write_caddyfile_if_changed; then');
    expect(source.indexOf("write_caddyfile_if_changed")).toBeLessThan(
      source.indexOf("reload_caddy")
    );
  });
});
