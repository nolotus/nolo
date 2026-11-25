// 额度面板的「口径来源」文案：把 AgentQuota 快照里的 source 字段翻译成人能判断
// "我在跟谁比"的标签，并把探测时刻翻译成相对时间。
//
// 为什么单一文件：面板显示的是**我们主动探测到的上游接口**，不是官方用量页面的
// 镜像——刷新时机、统计窗口、是否含子功能额度都可能不同。这层映射是纯函数，
// 单独放这里才能单测（不必把 React/StyleX 拖进测试）。

import { defaultQuotaLabelTranslator, type QuotaLabelTranslator } from "./quotaLabelTranslation";

const QUOTA_SOURCE_LABELS: Array<{ match: (s: string) => boolean; key: string; label: string }> = [
  {
    match: (s) => s.includes("wham/usage") || s.startsWith("codex-oauth"),
    key: "quota.source.codex", label: "Codex rate_limit 接口",
  },
  {
    match: (s) => s.includes("oauth/usage") || s.startsWith("claude-oauth"),
    key: "quota.source.claude", label: "Claude oauth/usage 接口",
  },
  { match: (s) => s.includes("retrieveUserQuotaSummary"), key: "quota.source.antigravity", label: "Antigravity 额度接口" },
  { match: (s) => s.includes("SeatManagement"), key: "quota.source.devin", label: "Devin seat 状态接口" },
  { match: (s) => s.includes("GetCurrentPeriodUsage"), key: "quota.source.cursor", label: "Cursor 周期用量接口" },
  { match: (s) => s.startsWith("anthropic-ratelimit-unified"), key: "quota.source.unified", label: "上游响应头（unified）" },
  { match: (s) => s.startsWith("x-ratelimit"), key: "quota.source.rateLimit", label: "上游响应头（x-ratelimit）" },
  { match: (s) => s.startsWith("x-goog-quota"), key: "quota.source.googleQuota", label: "上游响应头（x-goog-quota）" },
  { match: (s) => s.startsWith("x-sub2api"), key: "quota.source.sub2api", label: "上游响应头（x-sub2api）" },
  { match: (s) => s.startsWith("body."), key: "quota.source.body", label: "上游响应 body" },
];

/** 把 source 字段翻译成用户能判断"跟谁比"的口径标签。 */
export function describeQuotaProvenance(source: unknown, t: QuotaLabelTranslator = defaultQuotaLabelTranslator): string {
  if (typeof source !== "string" || !source) return t("quota.source.unknown", "来源未知");
  for (const { match, key, label } of QUOTA_SOURCE_LABELS) {
    if (match(source)) return t(key, label);
  }
  return t("quota.source.upstream", "上游响应");
}

/** 探测时刻的相对时间：让"多久以前的数据"可见，而不是假装实时。 */
export function formatProbeAge(observedAt: number | undefined, now: number, t: QuotaLabelTranslator = defaultQuotaLabelTranslator): string {
  if (typeof observedAt !== "number" || !Number.isFinite(observedAt) || observedAt <= 0) {
    return t("quota.age.unknown", "探测时间未知");
  }
  const diffMs = Math.max(0, now - observedAt);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t("quota.age.justNow", "刚刚探测");
  if (minutes < 60) return t("quota.age.minutes", "{{count}} 分钟前探测", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("quota.age.hours", "{{count}} 小时前探测", { count: hours });
  return t("quota.age.days", "{{count}} 天前探测", { count: Math.floor(hours / 24) });
}
