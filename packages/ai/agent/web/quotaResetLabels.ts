// 额度复位时刻的展示文案（Agent 详情页面板用）。
//
// 与 quotaSnapshot.formatQuotaSummary 里的紧凑写法（"1h后重置"）刻意不同：徽章只有一行，
// 要的是最短文本；详情页面板给的是「绝对时刻 + 精确到分钟的倒计时」，用户在这里既判断
// "还要等多久"，也判断"什么时候回来看"。两处格式因此不共享，但同样是纯函数纪律。
//
// 纪律（与 quotaSnapshot 一致）：零 I/O、不读系统时钟，`now` 一律由入参传入，
// 这样跨时区/跨天边界都可单测。

import { defaultQuotaLabelTranslator, type QuotaLabelTranslator } from "./quotaLabelTranslation";

/** 倒计时刷新间隔：展示到分钟，30s 一跳足够平滑，也不必让每个面板每秒重渲染。 */
export const QUOTA_RESET_TICK_MS = 30_000;

function isValidResetAt(resetAt: number | undefined): resetAt is number {
  return typeof resetAt === "number" && Number.isFinite(resetAt);
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function clockText(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/**
 * 绝对复位时刻（本地时区）：`今天 22:30` / `明天 08:00` / `10月15日 22:30`。
 * 已过去或非法一律返回 ""（调用方据此不渲染这一行）。
 */
export function formatResetClock(
  resetAt: number | undefined,
  now: number,
  t: QuotaLabelTranslator = defaultQuotaLabelTranslator,
): string {
  if (!isValidResetAt(resetAt) || resetAt <= now) return "";
  const at = new Date(resetAt);
  const text = clockText(at);
  if (localDayKey(at) === localDayKey(new Date(now))) return t("quota.reset.today", "今天 {{time}}", { time: text });
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (localDayKey(at) === localDayKey(tomorrow)) return t("quota.reset.tomorrow", "明天 {{time}}", { time: text });
  return t("quota.reset.date", "{{month}}月{{day}}日 {{time}}", { month: at.getMonth() + 1, day: at.getDate(), time: text });
}

/**
 * 剩余时长（分钟粒度）：`还剩 2h45m` / `还剩 18m` / `即将重置`。
 * 余量不足一分钟给「即将重置」，已过去或非法返回 ""。
 */
export function formatResetRemaining(
  resetAt: number | undefined,
  now: number,
  t: QuotaLabelTranslator = defaultQuotaLabelTranslator,
): string {
  if (!isValidResetAt(resetAt) || resetAt <= now) return "";
  const totalMin = Math.floor((resetAt - now) / 60_000);
  if (totalMin < 1) return t("quota.reset.soon", "即将重置");
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const duration = totalMin < 60
    ? `${totalMin}m`
    : days > 0
      ? `${days}d${hours > 0 ? `${hours}h` : ""}`
      : `${hours}h${mins > 0 ? `${mins}m` : ""}`;
  return t("quota.reset.remaining", "还剩 {{duration}}", { duration });
}

/** 面板整行文案：`今天 22:30 重置 · 还剩 2h45m`；没有复位时刻返回 ""。 */
export function formatResetLine(
  resetAt: number | undefined,
  now: number,
  t: QuotaLabelTranslator = defaultQuotaLabelTranslator,
): string {
  const clock = formatResetClock(resetAt, now, t);
  if (!clock) return "";
  const remaining = formatResetRemaining(resetAt, now, t);
  return t("quota.reset.line", "{{clock}} 重置 · {{remaining}}", { clock, remaining });
}
