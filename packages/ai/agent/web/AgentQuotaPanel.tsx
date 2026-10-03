// AgentQuotaPanel — 在 Agent 详情页展示订阅额度剩余（5h / 周窗口）。
// 数据来自 POST /api/agents/quota/refresh（服务端主动探测并落库），失败静默回退到 agent.quota 快照。
import { useEffect, useState } from "react";
import type { AgentQuota, QuotaWindow } from "ai/agent/quotaSnapshot";

type Props = {
  agentKey: string;
  serverOrigin: string;
  authToken: string;
  initialQuota?: AgentQuota;
};

const WINDOW_LABELS: Array<{ match: (scope: string) => boolean; label: string }> = [
  { match: (s) => s === "5h" || s.endsWith("-5h"), label: "5 小时" },
  { match: (s) => s === "7d" || s.endsWith("-7d"), label: "每周" },
];

export function pickDisplayWindows(
  quota: AgentQuota | undefined,
): Array<{ label: string; window: QuotaWindow }> {
  if (!quota || !Array.isArray(quota.windows)) return [];
  const out: Array<{ label: string; window: QuotaWindow }> = [];
  for (const { match, label } of WINDOW_LABELS) {
    const window = quota.windows.find(
      (w) => match(w.scope) && typeof w.utilization === "number",
    );
    if (window) out.push({ label, window });
  }
  return out;
}

export function formatResetIn(resetAt: number | undefined, now: number): string {
  if (typeof resetAt !== "number" || resetAt <= now) return "";
  const min = Math.round((resetAt - now) / 60000);
  if (min < 60) return `${min} 分钟后重置`;
  const hours = min / 60;
  if (hours < 24) return `${hours.toFixed(1).replace(/\.0$/, "")} 小时后重置`;
  return `${(hours / 24).toFixed(1).replace(/\.0$/, "")} 天后重置`;
}

export function AgentQuotaPanel({ agentKey, serverOrigin, authToken, initialQuota }: Props) {
  const [quota, setQuota] = useState<AgentQuota | undefined>(initialQuota);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${serverOrigin}/api/agents/quota/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ agentKeys: [agentKey] }),
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { quotas?: Record<string, AgentQuota> };
        const next = data?.quotas?.[agentKey];
        if (next) setQuota(next);
      } catch {
        // 额度是展示增强：失败静默，保留已有快照。
      }
    })();
    return () => ctrl.abort();
  }, [agentKey, serverOrigin, authToken]);

  const rows = pickDisplayWindows(quota);
  if (rows.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--textTertiary)" }}>
        额度暂不可用（凭据未同步或已失效时请重新授权）
      </div>
    );
  }
  const now = Date.now();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map(({ label, window }) => {
        const used = Number.isFinite(window.utilization) ? (window.utilization as number) : 0;
        const remaining = Math.min(100, Math.max(0, Math.round((1 - used) * 100)));
        const color =
          remaining <= 10 ? "var(--error, #e5484d)" : remaining <= 30 ? "var(--warning, #f5a524)" : "var(--primary, #3b82f6)";
        const reset = formatResetIn(window.resetAt, now);
        return (
          <div key={window.scope} aria-label={`${label}额度剩余 ${remaining}%`}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span>{label}</span>
              <strong>剩余 {remaining}%</strong>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--backgroundTertiary, rgba(128,128,128,.2))", marginTop: 4 }}>
              <div style={{ width: `${remaining}%`, height: "100%", borderRadius: 3, background: color }} />
            </div>
            {reset ? (
              <div style={{ fontSize: 11, color: "var(--textTertiary)", marginTop: 2 }}>{reset}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default AgentQuotaPanel;
