/**
 * Agent economics policies (Phase 2A).
 *
 * Versioned, evidence-backed peak/off-peak policies for third-party sources.
 * Only facts confirmed from official documentation are encoded; every other
 * source stays neutral (no snapshot at all). Do not "enrich" this file with
 * numbers that have no official evidence behind them.
 *
 * Deliberately NOT encoded (no confirmed official evidence / out of scope):
 * - DeepSeek concurrency limits (2500/500/2500) — documented but not policy.
 * - BigModel off-peak dynamic concurrency (no fixed number) → no capacityClass.
 * - BigModel temporary night promos (no confirmed effectiveUntil) → not encoded.
 * - 时长预测 / billing ledger 属于 Phase 2B，不在此实现。
 */

export type EconomicsSourceId = "deepseek_api" | "bigmodel_glm_coding_plan";

export type EconomicsPeriod = "peak" | "off_peak" | "neutral";

export interface EconomicsPeakWindow {
  /** IANA timezone the window clock lives in (e.g. "UTC", "Asia/Shanghai"). */
  timezone: string;
  /** Local weekdays the window applies to: 0=Sunday … 6=Saturday. */
  weekdays: number[];
  /** Minutes since local midnight, inclusive. */
  startMinute: number;
  /** Minutes since local midnight, exclusive. Must be > startMinute. */
  endMinute: number;
}

export interface EconomicsPolicy {
  id: EconomicsSourceId;
  /**
   * Policy version. When official terms change, add a new entry with a new
   * version and effectiveFrom/effectiveUntil — never silently mutate the old
   * one (snapshots carry policyVersion for traceability).
   */
  version: string;
  windows: EconomicsPeakWindow[];
  /** Monetary price multiplier during peak windows, when applicable. */
  peakPriceMultiplier?: number;
  /** Monetary price multiplier outside peak windows, when applicable. */
  offPeakPriceMultiplier?: number;
  /** Subscription quota burn multiplier during peak windows, when applicable. */
  peakQuotaMultiplier?: number;
  /** Subscription quota burn multiplier outside peak windows, when applicable. */
  offPeakQuotaMultiplier?: number;
  /** Inclusive epoch ms lower bound. Omitted = effective since forever. */
  effectiveFrom?: number;
  /** Exclusive epoch ms upper bound. Omitted = no confirmed end. */
  effectiveUntil?: number;
  /** Official evidence page backing this policy. */
  sourceUrl: string;
}

/** https://api-docs.deepseek.com/quick_start/pricing */
export const DEEPSEEK_PRICING_DOC = "https://api-docs.deepseek.com/quick_start/pricing";
/** https://docs.bigmodel.cn/cn/coding-plan/overview */
export const BIGMODEL_CODING_PLAN_OVERVIEW =
  "https://docs.bigmodel.cn/cn/coding-plan/overview";
/** https://docs.bigmodel.cn/cn/coding-plan/usage-notes */
export const BIGMODEL_CODING_PLAN_USAGE_NOTES =
  "https://docs.bigmodel.cn/cn/coding-plan/usage-notes";

/** 0=Sunday … 6=Saturday → Monday..Friday */
const WEEKDAYS_MON_FRI = [1, 2, 3, 4, 5];

/**
 * Evidence (2026-09, official pricing page): UTC Mon–Fri 01:00–04:00 and
 * 06:00–10:00 are peak; every other time is off-peak. Peak price is 2× the
 * off-peak price, applied uniformly to cache-hit / cache-miss / output.
 */
export const DEEPSEEK_API_POLICY: EconomicsPolicy = {
  id: "deepseek_api",
  version: "2026-09-weekday-utc-peak-2x",
  windows: [
    { timezone: "UTC", weekdays: WEEKDAYS_MON_FRI, startMinute: 60, endMinute: 240 },
    { timezone: "UTC", weekdays: WEEKDAYS_MON_FRI, startMinute: 360, endMinute: 600 },
  ],
  effectiveFrom: Date.UTC(2026, 7, 16, 16, 0, 0),
  peakPriceMultiplier: 2,
  offPeakPriceMultiplier: 1,
  sourceUrl: DEEPSEEK_PRICING_DOC,
};

/**
 * Evidence (2026-09, official coding-plan overview + usage notes): peak hours
 * are Asia/Shanghai Mon–Fri 14:00–18:00; outside peak, model quota is deducted
 * at 50% of the base credits (quotaMultiplier = 0.5). Off-peak concurrency is
 * raised dynamically with no fixed number → deliberately not encoded. The
 * temporary night activity has no confirmed effectiveUntil → not encoded.
 */
export const BIGMODEL_GLM_CODING_PLAN_POLICY: EconomicsPolicy = {
  id: "bigmodel_glm_coding_plan",
  version: "2026-09-coding-plan-sh-peak-14-18",
  windows: [
    { timezone: "Asia/Shanghai", weekdays: WEEKDAYS_MON_FRI, startMinute: 840, endMinute: 1080 },
  ],
  peakQuotaMultiplier: 1,
  offPeakQuotaMultiplier: 0.5,
  sourceUrl: BIGMODEL_CODING_PLAN_USAGE_NOTES,
};

export const ECONOMICS_POLICIES: EconomicsPolicy[] = [
  DEEPSEEK_API_POLICY,
  BIGMODEL_GLM_CODING_PLAN_POLICY,
];

export interface EconomicsSourceInput {
  provider?: string | null;
  apiSource?: string | null;
  model?: string | null;
  /**
   * Raw record's custom endpoint (record.customProviderUrl). Used only to
   * confirm or refute that the agent really targets the official source —
   * never included in any output.
   */
  customProviderUrl?: string | null;
  cliProvider?: string | null;
  apiKeyRef?: string | null;
}

/**
 * Match a raw agent source onto an economics source id, or null when the
 * evidence is insufficient (neutral). Matching is deliberately conservative:
 *
 * - deepseek_api: provider "deepseek" with a valid official endpoint and a
 *   non-platform source; third-party proxies and platform routes are neutral.
 * - bigmodel_glm_coding_plan: provider "bigmodel" AND a coding-plan endpoint.
 *   bigmodel.cn serves a metered API on the same domain, and the peak/quota
 *   evidence only covers the GLM Coding Plan. The international "zai" plan is
 *   NOT matched (evidence is docs.bigmodel.cn only).
 */
export function resolveEconomicsSourceId(
  input: EconomicsSourceInput
): EconomicsSourceId | null {
  const provider =
    typeof input?.provider === "string" ? input.provider.trim().toLowerCase() : "";
  if (input?.apiSource?.trim().toLowerCase() === "platform") return null;
  const rawUrl = typeof input?.customProviderUrl === "string" ? input.customProviderUrl.trim() : "";
  let hostname = "";
  let pathname = "";
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      hostname = parsed.hostname.toLowerCase();
      pathname = parsed.pathname;
    } catch {
      return null;
    }
  }

  if (provider === "deepseek") {
    if (rawUrl && hostname !== "api.deepseek.com") return null;
    return rawUrl ? "deepseek_api" : null;
  }
  if (provider === "bigmodel") {
    if (hostname === "open.bigmodel.cn" && pathname.startsWith("/api/coding/")) {
      return "bigmodel_glm_coding_plan";
    }
    return null;
  }
  return null;
}
