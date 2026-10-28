// 额度面板的「口径来源」文案：把 AgentQuota 快照里的 source 字段翻译成人能判断
// "我在跟谁比"的标签，并把探测时刻翻译成相对时间。
//
// 为什么单一文件：面板显示的是**我们主动探测到的上游接口**，不是官方用量页面的
// 镜像——刷新时机、统计窗口、是否含子功能额度都可能不同。这层映射是纯函数，
// 单独放这里才能单测（不必把 React/StyleX 拖进测试）。

const QUOTA_SOURCE_LABELS: Array<{ match: (s: string) => boolean; label: string }> = [
  {
    match: (s) => s.includes("wham/usage") || s.startsWith("codex-oauth"),
    label: "Codex rate_limit 接口",
  },
  {
    match: (s) => s.includes("oauth/usage") || s.startsWith("claude-oauth"),
    label: "Claude oauth/usage 接口",
  },
  { match: (s) => s.includes("retrieveUserQuotaSummary"), label: "Antigravity 额度接口" },
  { match: (s) => s.includes("SeatManagement"), label: "Devin seat 状态接口" },
  { match: (s) => s.includes("GetCurrentPeriodUsage"), label: "Cursor 周期用量接口" },
  { match: (s) => s.startsWith("anthropic-ratelimit-unified"), label: "上游响应头（unified）" },
  { match: (s) => s.startsWith("x-ratelimit"), label: "上游响应头（x-ratelimit）" },
  { match: (s) => s.startsWith("x-goog-quota"), label: "上游响应头（x-goog-quota）" },
  { match: (s) => s.startsWith("x-sub2api"), label: "上游响应头（x-sub2api）" },
  { match: (s) => s.startsWith("body."), label: "上游响应 body" },
];

/** 把 source 字段翻译成用户能判断"跟谁比"的口径标签。 */
export function describeQuotaProvenance(source: unknown): string {
  if (typeof source !== "string" || !source) return "来源未知";
  for (const { match, label } of QUOTA_SOURCE_LABELS) {
    if (match(source)) return label;
  }
  return "上游响应";
}

/** 探测时刻的相对时间：让"多久以前的数据"可见，而不是假装实时。 */
export function formatProbeAge(observedAt: number | undefined, now: number): string {
  if (typeof observedAt !== "number" || !Number.isFinite(observedAt) || observedAt <= 0) {
    return "探测时间未知";
  }
  const diffMs = Math.max(0, now - observedAt);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "刚刚探测";
  if (minutes < 60) return `${minutes} 分钟前探测`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前探测`;
  return `${Math.floor(hours / 24)} 天前探测`;
}
