// AgentQuotaPanel — Agent 详情页的订阅额度面板（5h / 周窗口）。
// 数据来自 POST /api/agents/quota/refresh（服务端主动探测并落库），失败静默回退到
// agent.quota 快照。
//
// 「哪些 agent 有额度」的唯一事实来源是服务端探测（subscriptionQuotaProbe：kimi/glm/
// mistral 订阅 + claude/codex/antigravity/devin/cursor OAuth，以及上游响应头带来的被动
// 快照）。这里刻意不维护前端白名单——历史上它含 xai（后端不支持）却漏了
// devin/codex/kimi/glm/mistral，两份名单一旦分叉就静默出错。
// 于是：拿得到窗口就渲染，拿不到就整块不渲染。
import { useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { LuGauge } from "react-icons/lu";
import type { AgentQuota, QuotaWindow } from "ai/agent/quotaSnapshot";
import { agentPageStyles as styles } from "./agentPageStyles";
import { QUOTA_RESET_TICK_MS, formatResetLine } from "./quotaResetLabels";

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

export function AgentQuotaPanel({
  agentKey,
  serverOrigin,
  authToken,
  initialQuota,
}: Props) {
  const [quota, setQuota] = useState<AgentQuota | undefined>(initialQuota);
  const [now, setNow] = useState(() => Date.now());

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
        if (next) {
          setQuota(next);
          // 探测到的快照是"此刻"的，倒计时的基准也一起对齐。
          setNow(Date.now());
        }
      } catch {
        // 额度是展示增强：失败静默，保留已有快照。
      }
    })();
    return () => ctrl.abort();
  }, [agentKey, serverOrigin, authToken]);

  const rows = pickDisplayWindows(quota);
  // 只有「尚未到期」的复位时刻才需要走表：已过期的 resetAt 不该让定时器一直空转
  // 重渲染（review MEDIUM，2026-10-09）。
  const hasActiveResetClock = rows.some(
    (row) =>
      typeof row.window.resetAt === "number" &&
      Number.isFinite(row.window.resetAt) &&
      row.window.resetAt > now,
  );

  useEffect(() => {
    if (!hasActiveResetClock) return;
    const id = setInterval(() => setNow(Date.now()), QUOTA_RESET_TICK_MS);
    return () => clearInterval(id);
  }, [hasActiveResetClock]);

  // 服务端不支持探测 / 探测不到窗口：整块不渲染，不留"额度暂不可用"的噪音提示。
  if (rows.length === 0) return null;

  return (
    <section {...stylex.props(styles.section)}>
      <div {...stylex.props(styles.abilityProofHeading)}>
        <LuGauge size={15} aria-hidden="true" />
        <span>订阅额度</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(({ label, window }) => {
          const used = Number.isFinite(window.utilization)
            ? (window.utilization as number)
            : 0;
          const remaining = Math.min(100, Math.max(0, Math.round((1 - used) * 100)));
          const color =
            remaining <= 10
              ? "var(--error, #e5484d)"
              : remaining <= 30
                ? "var(--warning, #f5a524)"
                : "var(--primary, #3b82f6)";
          const reset = formatResetLine(window.resetAt, now);
          return (
            <div key={window.scope} aria-label={`${label}额度剩余 ${remaining}%`}>
              <div
                style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}
              >
                <span>{label}</span>
                <strong>剩余 {remaining}%</strong>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "var(--backgroundTertiary, rgba(128,128,128,.2))",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    width: `${remaining}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: color,
                  }}
                />
              </div>
              {reset ? (
                <div
                  style={{ fontSize: 11, color: "var(--textTertiary)", marginTop: 2 }}
                >
                  {reset}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default AgentQuotaPanel;
