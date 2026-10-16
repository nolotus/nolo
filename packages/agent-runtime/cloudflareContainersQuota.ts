// packages/agent-runtime/cloudflareContainersQuota.ts

/**
 * Cloudflare Containers resource usage & Workers Paid included quota reader and
 * pure transformation module.
 *
 * Design boundaries:
 * - Pure fetch/read + deterministic transformation; no global cache, no ambient
 *   credential loading, no CLI config file reads, and no local Cloudflare dist
 *   hash imports.
 * - Included allocations come from Cloudflare's official static pricing
 *   documentation (NOT dynamically delivered by the subscription or GraphQL API).
 * - Usage numbers are observational/estimated from Cloudflare GraphQL Analytics
 *   (`containersUsageAdaptiveGroups`) and are never authoritative billing ledger
 *   truth or runtime execution permission gates.
 * - Each metric (`cpu`, `memory`, `disk`) keeps its own unit, included amount,
 *   used amount, clamped remaining (`>= 0`), and independent overage (`>= 0`);
 *   metrics are never collapsed into a single synthetic token balance.
 * - Egress (`txBytes`) is collected as raw bytes without assuming a single
 *   regional 1 TB tier (since `containersUsageAdaptiveGroups` without region
 *   dimension cannot attribute region-specific egress allowances) and never
 *   produces a fake USD estimate.
 */

export const CLOUDFLARE_CONTAINERS_PRICING_SOURCE = {
  kind: "cloudflare-static-pricing-doc",
  url: "https://developers.cloudflare.com/containers/pricing/",
  version: "2026-10-16",
  planId: "workers_paid",
  allocationAuthority: "static-doc-not-api",
} as const;

export const CLOUDFLARE_WORKERS_PAID_PLAN_ID = "workers_paid" as const;

export const CLOUDFLARE_GRAPHQL_MAX_WINDOW_DAYS = 32 as const;
export const CLOUDFLARE_GRAPHQL_MAX_WINDOW_MS =
  CLOUDFLARE_GRAPHQL_MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const SECONDS_PER_MINUTE = 60 as const;
export const SECONDS_PER_HOUR = 3600 as const;
export const BYTES_PER_GIB = 1073741824 as const; // 2^30 (binary GiB)
export const BYTES_PER_GB = 1000000000 as const; // 10^9 (decimal GB)

/**
 * Official Workers Paid monthly included Cloudflare Containers allocations:
 * - CPU: 375 vCPU-minutes = 375 * 60 = 22,500 vCPU-seconds (NOT 375 hours)
 * - Memory: 25 GiB-hours = 25 * 3600 * 2^30 = 96,636,764,160,000 byte-seconds
 * - Disk: 200 GB-hours = 200 * 3600 * 10^9 = 720,000,000,000,000 byte-seconds
 */
export const CLOUDFLARE_WORKERS_PAID_INCLUDED_CPU_VCPU_MINUTES = 375 as const;
export const CLOUDFLARE_WORKERS_PAID_INCLUDED_CPU_SECONDS =
  CLOUDFLARE_WORKERS_PAID_INCLUDED_CPU_VCPU_MINUTES * SECONDS_PER_MINUTE; // 22_500

export const CLOUDFLARE_WORKERS_PAID_INCLUDED_MEMORY_GIB_HOURS = 25 as const;
export const CLOUDFLARE_WORKERS_PAID_INCLUDED_MEMORY_BYTE_SECONDS =
  CLOUDFLARE_WORKERS_PAID_INCLUDED_MEMORY_GIB_HOURS *
  SECONDS_PER_HOUR *
  BYTES_PER_GIB; // 96_636_764_160_000

export const CLOUDFLARE_WORKERS_PAID_INCLUDED_DISK_GB_HOURS = 200 as const;
export const CLOUDFLARE_WORKERS_PAID_INCLUDED_DISK_BYTE_SECONDS =
  CLOUDFLARE_WORKERS_PAID_INCLUDED_DISK_GB_HOURS *
  SECONDS_PER_HOUR *
  BYTES_PER_GB; // 720_000_000_000_000

export const CLOUDFLARE_CONTAINERS_USAGE_GRAPHQL_QUERY = `query CloudflareContainersUsage($accountTag: string!, $start: Time!, $end: Time!, $limit: Int! = 10) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      containersUsageAdaptiveGroups(
        limit: $limit
        filter: { datetime_geq: $start, datetime_leq: $end }
      ) {
        sum {
          cpuTimeSec
          allocatedMemory
          allocatedDisk
          txBytes
        }
      }
    }
  }
}`;

export type CloudflareContainerMetricUnit =
  | "vcpu-seconds"
  | "byte-seconds"
  | "bytes";

export interface CloudflareContainerQuotaMetric<
  U extends CloudflareContainerMetricUnit = CloudflareContainerMetricUnit,
> {
  metric: "cpu" | "memory" | "disk";
  unit: U;
  included: number;
  used: number;
  remaining: number;
  overage: number;
  estimated: true;
  authoritative: false;
}

export interface CloudflareContainerNetworkEgressObservation {
  metric: "txBytes";
  unit: "bytes";
  used: number;
  included: null;
  remaining: null;
  overage: null;
  regionAttribution: "unavailable-without-region-dimension";
  estimatedCostUsd: null;
  estimated: true;
  authoritative: false;
}

export interface CloudflareBillingWindow {
  periodStart: string;
  periodEnd: string;
  queryStart: string;
  queryEnd: string;
  durationMs: number;
  clampedToNow: boolean;
}

export type CloudflareQuotaUnknownReason =
  | "invalid_account_tag"
  | "invalid_now_timestamp"
  | "missing_subscription"
  | "unsupported_rate_plan"
  | "invalid_billing_period"
  | "billing_window_not_started"
  | "window_exceeds_32d_limit"
  | "http_error"
  | "graphql_errors"
  | "missing_viewer_accounts"
  | "account_count_mismatch"
  | "malformed_usage_groups"
  | "UsageSumInvalid"
  | "transport_error";

export interface CloudflareContainersQuotaKnown {
  status: "estimated";
  estimated: true;
  authoritative: false;
  hardCapEnforced: false;
  executionPermissionGranted: null;
  accountTag: string;
  planId: typeof CLOUDFLARE_WORKERS_PAID_PLAN_ID;
  budgetScope: "cloudflare-account-billing-period";
  budgetKey: string;
  observedAt: string;
  window: CloudflareBillingWindow;
  source: typeof CLOUDFLARE_CONTAINERS_PRICING_SOURCE & {
    usageApi: "graphql:containersUsageAdaptiveGroups";
    subscriptionApi: "rest:accounts.subscriptions";
  };
  emptyUsageGroups: boolean;
  metrics: {
    cpu: CloudflareContainerQuotaMetric<"vcpu-seconds">;
    memory: CloudflareContainerQuotaMetric<"byte-seconds">;
    disk: CloudflareContainerQuotaMetric<"byte-seconds">;
  };
  network: {
    txBytes: CloudflareContainerNetworkEgressObservation;
  };
}

export interface CloudflareContainersQuotaUnknown {
  status: "unknown";
  estimated: true;
  authoritative: false;
  hardCapEnforced: false;
  executionPermissionGranted: null;
  accountTag: string | null;
  planId: string | null;
  budgetScope: "cloudflare-account-billing-period";
  budgetKey: string | null;
  observedAt: string;
  window: CloudflareBillingWindow | null;
  source: typeof CLOUDFLARE_CONTAINERS_PRICING_SOURCE & {
    usageApi: "graphql:containersUsageAdaptiveGroups";
    subscriptionApi: "rest:accounts.subscriptions";
  };
  reason: CloudflareQuotaUnknownReason;
  detail?: string;
  metrics: null;
  network: null;
}

export type CloudflareContainersQuotaSnapshot =
  | CloudflareContainersQuotaKnown
  | CloudflareContainersQuotaUnknown;

export interface CloudflareContainersUsageVariables {
  accountTag: string;
  start: string;
  end: string;
  limit: number;
}

export interface CloudflareContainersUsageGraphQLRequestPayload {
  query: string;
  variables: CloudflareContainersUsageVariables;
}

function parseStrictIsoTimestampMs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return ms;
}

function normalizeNowIso(nowInput?: string | number | Date): {
  ms: number;
  iso: string;
} | null {
  if (nowInput === undefined) {
    const ms = Date.now();
    return { ms, iso: new Date(ms).toISOString() };
  }
  if (nowInput instanceof Date) {
    const ms = nowInput.getTime();
    if (!Number.isFinite(ms)) return null;
    return { ms, iso: new Date(ms).toISOString() };
  }
  if (typeof nowInput === "number") {
    if (!Number.isFinite(nowInput)) return null;
    return { ms: nowInput, iso: new Date(nowInput).toISOString() };
  }
  if (typeof nowInput === "string") {
    const ms = parseStrictIsoTimestampMs(nowInput);
    if (ms === null) return null;
    return { ms, iso: new Date(ms).toISOString() };
  }
  return null;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function buildCloudflareAccountBudgetKey(params: {
  accountTag: string;
  periodStart: string;
  periodEnd: string;
}): string | null {
  const accountTag =
    typeof params.accountTag === "string" ? params.accountTag.trim() : "";
  const startMs = parseStrictIsoTimestampMs(params.periodStart);
  const endMs = parseStrictIsoTimestampMs(params.periodEnd);
  if (!accountTag || startMs === null || endMs === null || endMs <= startMs) {
    return null;
  }
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();
  return `cf-containers-quota:v1:${accountTag}:${startIso}..${endIso}`;
}

export type BillingWindowResolution =
  | {
      ok: true;
      window: CloudflareBillingWindow;
    }
  | {
      ok: false;
      reason:
        | "invalid_now_timestamp"
        | "invalid_billing_period"
        | "billing_window_not_started"
        | "window_exceeds_32d_limit";
      detail: string;
    };

export function resolveCloudflareBillingWindow(params: {
  periodStart: unknown;
  periodEnd: unknown;
  now?: string | number | Date;
}): BillingWindowResolution {
  const nowParsed = normalizeNowIso(params.now);
  if (!nowParsed) {
    return {
      ok: false,
      reason: "invalid_now_timestamp",
      detail: "Invalid current timestamp (now).",
    };
  }

  const startMs = parseStrictIsoTimestampMs(params.periodStart);
  const endMs = parseStrictIsoTimestampMs(params.periodEnd);
  if (startMs === null || endMs === null || endMs <= startMs) {
    return {
      ok: false,
      reason: "invalid_billing_period",
      detail:
        "Billing period start/end timestamps must be valid ISO-8601 strings with periodEnd > periodStart.",
    };
  }

  const clampedEndMs = Math.min(nowParsed.ms, endMs);
  if (clampedEndMs < startMs) {
    return {
      ok: false,
      reason: "billing_window_not_started",
      detail: `Current time (${nowParsed.iso}) is before billing period start (${new Date(startMs).toISOString()}).`,
    };
  }

  const durationMs = clampedEndMs - startMs;
  if (durationMs > CLOUDFLARE_GRAPHQL_MAX_WINDOW_MS) {
    return {
      ok: false,
      reason: "window_exceeds_32d_limit",
      detail: `Query window duration (${durationMs} ms) exceeds Cloudflare GraphQL 32-day limit (${CLOUDFLARE_GRAPHQL_MAX_WINDOW_MS} ms); refusing to truncate and disguise partial data as complete.`,
    };
  }

  return {
    ok: true,
    window: {
      periodStart: new Date(startMs).toISOString(),
      periodEnd: new Date(endMs).toISOString(),
      queryStart: new Date(startMs).toISOString(),
      queryEnd: new Date(clampedEndMs).toISOString(),
      durationMs,
      clampedToNow: nowParsed.ms < endMs,
    },
  };
}

export function buildCloudflareContainersUsageGraphQLPayload(params: {
  accountTag: string;
  start: string;
  end: string;
  limit?: number;
}): CloudflareContainersUsageGraphQLRequestPayload {
  const limit =
    typeof params.limit === "number" &&
    Number.isInteger(params.limit) &&
    params.limit > 0
      ? params.limit
      : 10;
  return {
    query: CLOUDFLARE_CONTAINERS_USAGE_GRAPHQL_QUERY,
    variables: {
      accountTag: params.accountTag.trim(),
      start: params.start,
      end: params.end,
      limit,
    },
  };
}

export function computeQuotaMetric<U extends CloudflareContainerMetricUnit>(params: {
  metric: "cpu" | "memory" | "disk";
  unit: U;
  included: number;
  used: number;
}): CloudflareContainerQuotaMetric<U> {
  const remaining = Math.max(0, params.included - params.used);
  const overage = Math.max(0, params.used - params.included);
  return {
    metric: params.metric,
    unit: params.unit,
    included: params.included,
    used: params.used,
    remaining,
    overage,
    estimated: true,
    authoritative: false,
  };
}

export interface ExtractedSubscriptionInfo {
  planId: string;
  periodStart: string;
  periodEnd: string;
}

export type SubscriptionExtractionResult =
  | { ok: true; subscription: ExtractedSubscriptionInfo }
  | {
      ok: false;
      reason:
        | "missing_subscription"
        | "unsupported_rate_plan"
        | "invalid_billing_period";
      detail: string;
      planId: string | null;
    };

/**
 * Extracts Workers Paid billing cycle from either a normalized subscription
 * object or a raw Cloudflare `/accounts/:id/subscriptions` REST envelope.
 */
export function extractWorkersPaidSubscription(
  input: unknown,
): SubscriptionExtractionResult {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      reason: "missing_subscription",
      detail: "Subscription payload is missing or not an object.",
      planId: null,
    };
  }

  const record = input as Record<string, unknown>;
  if (record.success === false) {
    return {
      ok: false,
      reason: "missing_subscription",
      detail: "Cloudflare subscriptions API returned success: false.",
      planId: null,
    };
  }
  if (Array.isArray(record.errors) && record.errors.length > 0) {
    return {
      ok: false,
      reason: "missing_subscription",
      detail: "Cloudflare subscriptions API returned non-empty errors.",
      planId: null,
    };
  }

  const candidates: Record<string, unknown>[] = [];
  if (Array.isArray(record.result)) {
    for (const item of record.result) {
      if (item && typeof item === "object") {
        candidates.push(item as Record<string, unknown>);
      }
    }
  } else if (record.result && typeof record.result === "object") {
    candidates.push(record.result as Record<string, unknown>);
  } else if (Array.isArray(record.subscriptions)) {
    for (const item of record.subscriptions) {
      if (item && typeof item === "object") {
        candidates.push(item as Record<string, unknown>);
      }
    }
  } else {
    candidates.push(record);
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      reason: "missing_subscription",
      detail: "No subscription entries found in payload.",
      planId: null,
    };
  }

  let seenPlanId: string | null = null;
  for (const sub of candidates) {
    const ratePlan =
      sub.rate_plan && typeof sub.rate_plan === "object"
        ? (sub.rate_plan as Record<string, unknown>)
        : sub.ratePlan && typeof sub.ratePlan === "object"
          ? (sub.ratePlan as Record<string, unknown>)
          : null;
    const rawPlanId =
      typeof ratePlan?.id === "string"
        ? ratePlan.id.trim()
        : typeof sub.ratePlanId === "string"
          ? sub.ratePlanId.trim()
          : typeof sub.planId === "string"
            ? sub.planId.trim()
            : null;
    if (rawPlanId) {
      seenPlanId = rawPlanId;
    }
    if (rawPlanId !== CLOUDFLARE_WORKERS_PAID_PLAN_ID) {
      continue;
    }

    const periodStart =
      typeof sub.current_period_start === "string"
        ? sub.current_period_start
        : typeof sub.currentPeriodStart === "string"
          ? sub.currentPeriodStart
          : typeof sub.periodStart === "string"
            ? sub.periodStart
            : null;
    const periodEnd =
      typeof sub.current_period_end === "string"
        ? sub.current_period_end
        : typeof sub.currentPeriodEnd === "string"
          ? sub.currentPeriodEnd
          : typeof sub.periodEnd === "string"
            ? sub.periodEnd
            : null;

    const startMs = parseStrictIsoTimestampMs(periodStart);
    const endMs = parseStrictIsoTimestampMs(periodEnd);
    if (
      !periodStart ||
      !periodEnd ||
      startMs === null ||
      endMs === null ||
      endMs <= startMs
    ) {
      return {
        ok: false,
        reason: "invalid_billing_period",
        detail:
          "Workers Paid subscription is missing valid current_period_start / current_period_end timestamps.",
        planId: CLOUDFLARE_WORKERS_PAID_PLAN_ID,
      };
    }

    return {
      ok: true,
      subscription: {
        planId: CLOUDFLARE_WORKERS_PAID_PLAN_ID,
        periodStart: new Date(startMs).toISOString(),
        periodEnd: new Date(endMs).toISOString(),
      },
    };
  }

  return {
    ok: false,
    reason: seenPlanId ? "unsupported_rate_plan" : "missing_subscription",
    detail: seenPlanId
      ? `Unsupported Cloudflare rate_plan.id "${seenPlanId}" (expected "${CLOUDFLARE_WORKERS_PAID_PLAN_ID}").`
      : "No subscription with rate_plan.id found.",
    planId: seenPlanId,
  };
}

function makeUnknownSnapshot(params: {
  accountTag: string | null;
  planId: string | null;
  budgetKey: string | null;
  observedAt: string;
  window: CloudflareBillingWindow | null;
  reason: CloudflareQuotaUnknownReason;
  detail?: string;
}): CloudflareContainersQuotaUnknown {
  return {
    status: "unknown",
    estimated: true,
    authoritative: false,
    hardCapEnforced: false,
    executionPermissionGranted: null,
    accountTag: params.accountTag,
    planId: params.planId,
    budgetScope: "cloudflare-account-billing-period",
    budgetKey: params.budgetKey,
    observedAt: params.observedAt,
    window: params.window,
    source: {
      ...CLOUDFLARE_CONTAINERS_PRICING_SOURCE,
      usageApi: "graphql:containersUsageAdaptiveGroups",
      subscriptionApi: "rest:accounts.subscriptions",
    },
    reason: params.reason,
    ...(params.detail ? { detail: params.detail } : {}),
    metrics: null,
    network: null,
  };
}

export interface TransformCloudflareContainersQuotaInput {
  accountTag: unknown;
  subscription: unknown;
  graphqlResponse: unknown;
  graphqlHttpStatus?: number;
  subscriptionHttpStatus?: number;
  now?: string | number | Date;
}

/**
 * Pure transformation from raw subscription + GraphQL response into a
 * normalized Cloudflare Containers quota snapshot.
 *
 * Strict validation rules:
 * - HTTP 200 is necessary but NOT sufficient; non-200 HTTP status, non-empty
 *   GraphQL `errors`, missing `data.viewer.accounts`, `accounts.length !== 1`,
 *   non-array `containersUsageAdaptiveGroups`, or any group with missing/NaN/
 *   infinite/negative/non-number sum fields yields `status: "unknown"`.
 * - A single valid account with `containersUsageAdaptiveGroups: []` yields
 *   `status: "estimated"` with `used = 0` across all metrics and
 *   `emptyUsageGroups: true` (never `authoritative: true`).
 */
export function transformCloudflareContainersQuota(
  input: TransformCloudflareContainersQuotaInput,
): CloudflareContainersQuotaSnapshot {
  const nowParsed = normalizeNowIso(input.now);
  const fallbackObservedAt = nowParsed
    ? nowParsed.iso
    : new Date(0).toISOString();

  const accountTag =
    typeof input.accountTag === "string" && input.accountTag.trim().length > 0
      ? input.accountTag.trim()
      : null;

  if (!nowParsed) {
    return makeUnknownSnapshot({
      accountTag,
      planId: null,
      budgetKey: null,
      observedAt: fallbackObservedAt,
      window: null,
      reason: "invalid_now_timestamp",
      detail: "Provided `now` timestamp is invalid.",
    });
  }

  if (!accountTag) {
    return makeUnknownSnapshot({
      accountTag: null,
      planId: null,
      budgetKey: null,
      observedAt: nowParsed.iso,
      window: null,
      reason: "invalid_account_tag",
      detail: "accountTag must be a non-empty string.",
    });
  }

  if (
    input.subscriptionHttpStatus !== undefined &&
    input.subscriptionHttpStatus !== 200
  ) {
    return makeUnknownSnapshot({
      accountTag,
      planId: null,
      budgetKey: null,
      observedAt: nowParsed.iso,
      window: null,
      reason: "http_error",
      detail: `Cloudflare subscriptions HTTP status ${input.subscriptionHttpStatus}.`,
    });
  }

  const subResult = extractWorkersPaidSubscription(input.subscription);
  if (!subResult.ok) {
    return makeUnknownSnapshot({
      accountTag,
      planId: subResult.planId,
      budgetKey: null,
      observedAt: nowParsed.iso,
      window: null,
      reason: subResult.reason,
      detail: subResult.detail,
    });
  }

  const { planId, periodStart, periodEnd } = subResult.subscription;
  const budgetKey = buildCloudflareAccountBudgetKey({
    accountTag,
    periodStart,
    periodEnd,
  });

  const windowResult = resolveCloudflareBillingWindow({
    periodStart,
    periodEnd,
    now: nowParsed.ms,
  });
  if (!windowResult.ok) {
    return makeUnknownSnapshot({
      accountTag,
      planId,
      budgetKey,
      observedAt: nowParsed.iso,
      window: null,
      reason: windowResult.reason,
      detail: windowResult.detail,
    });
  }

  const window = windowResult.window;

  if (
    input.graphqlHttpStatus !== undefined &&
    input.graphqlHttpStatus !== 200
  ) {
    return makeUnknownSnapshot({
      accountTag,
      planId,
      budgetKey,
      observedAt: nowParsed.iso,
      window,
      reason: "http_error",
      detail: `Cloudflare GraphQL HTTP status ${input.graphqlHttpStatus}.`,
    });
  }

  if (!input.graphqlResponse || typeof input.graphqlResponse !== "object") {
    return makeUnknownSnapshot({
      accountTag,
      planId,
      budgetKey,
      observedAt: nowParsed.iso,
      window,
      reason: "malformed_usage_groups",
      detail: "GraphQL response body is missing or not a JSON object.",
    });
  }

  const gql = input.graphqlResponse as Record<string, unknown>;
  if (gql.errors !== undefined && gql.errors !== null) {
    if (!Array.isArray(gql.errors) || gql.errors.length > 0) {
      return makeUnknownSnapshot({
        accountTag,
        planId,
        budgetKey,
        observedAt: nowParsed.iso,
        window,
        reason: "graphql_errors",
        detail: "GraphQL response contains errors.",
      });
    }
  }

  const data =
    gql.data && typeof gql.data === "object"
      ? (gql.data as Record<string, unknown>)
      : null;
  const viewer =
    data?.viewer && typeof data.viewer === "object"
      ? (data.viewer as Record<string, unknown>)
      : null;
  const accounts = viewer?.accounts;

  if (!Array.isArray(accounts)) {
    return makeUnknownSnapshot({
      accountTag,
      planId,
      budgetKey,
      observedAt: nowParsed.iso,
      window,
      reason: "missing_viewer_accounts",
      detail: "GraphQL response is missing data.viewer.accounts array.",
    });
  }

  if (accounts.length !== 1) {
    return makeUnknownSnapshot({
      accountTag,
      planId,
      budgetKey,
      observedAt: nowParsed.iso,
      window,
      reason: "account_count_mismatch",
      detail: `Expected exactly 1 account in data.viewer.accounts, received ${accounts.length}.`,
    });
  }

  const accountObj = accounts[0];
  if (!accountObj || typeof accountObj !== "object") {
    return makeUnknownSnapshot({
      accountTag,
      planId,
      budgetKey,
      observedAt: nowParsed.iso,
      window,
      reason: "malformed_usage_groups",
      detail: "Account entry in data.viewer.accounts[0] is not an object.",
    });
  }

  const groups = (accountObj as Record<string, unknown>)
    .containersUsageAdaptiveGroups;
  if (!Array.isArray(groups)) {
    return makeUnknownSnapshot({
      accountTag,
      planId,
      budgetKey,
      observedAt: nowParsed.iso,
      window,
      reason: "malformed_usage_groups",
      detail:
        "data.viewer.accounts[0].containersUsageAdaptiveGroups is not an array.",
    });
  }

  let totalCpuTimeSec = 0;
  let totalAllocatedMemoryByteSec = 0;
  let totalAllocatedDiskByteSec = 0;
  let totalTxBytes = 0;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (!group || typeof group !== "object") {
      return makeUnknownSnapshot({
        accountTag,
        planId,
        budgetKey,
        observedAt: nowParsed.iso,
        window,
        reason: "malformed_usage_groups",
        detail: `containersUsageAdaptiveGroups[${i}] is not an object.`,
      });
    }
    const sum = (group as Record<string, unknown>).sum;
    if (!sum || typeof sum !== "object") {
      return makeUnknownSnapshot({
        accountTag,
        planId,
        budgetKey,
        observedAt: nowParsed.iso,
        window,
        reason: "malformed_usage_groups",
        detail: `containersUsageAdaptiveGroups[${i}].sum is missing or not an object.`,
      });
    }
    const sumRecord = sum as Record<string, unknown>;
    const cpuTimeSec = sumRecord.cpuTimeSec;
    const allocatedMemory = sumRecord.allocatedMemory;
    const allocatedDisk = sumRecord.allocatedDisk;
    const txBytes = sumRecord.txBytes;

    if (
      !isNonNegativeFiniteNumber(cpuTimeSec) ||
      !isNonNegativeFiniteNumber(allocatedMemory) ||
      !isNonNegativeFiniteNumber(allocatedDisk) ||
      !isNonNegativeFiniteNumber(txBytes)
    ) {
      return makeUnknownSnapshot({
        accountTag,
        planId,
        budgetKey,
        observedAt: nowParsed.iso,
        window,
        reason: "UsageSumInvalid",
        detail: `containersUsageAdaptiveGroups[${i}].sum contains non-numeric, NaN, infinite, or negative values.`,
      });
    }

    totalCpuTimeSec += cpuTimeSec;
    totalAllocatedMemoryByteSec += allocatedMemory;
    totalAllocatedDiskByteSec += allocatedDisk;
    totalTxBytes += txBytes;
  }

  return {
    status: "estimated",
    estimated: true,
    authoritative: false,
    hardCapEnforced: false,
    executionPermissionGranted: null,
    accountTag,
    planId: CLOUDFLARE_WORKERS_PAID_PLAN_ID,
    budgetScope: "cloudflare-account-billing-period",
    budgetKey: budgetKey!,
    observedAt: nowParsed.iso,
    window,
    source: {
      ...CLOUDFLARE_CONTAINERS_PRICING_SOURCE,
      usageApi: "graphql:containersUsageAdaptiveGroups",
      subscriptionApi: "rest:accounts.subscriptions",
    },
    emptyUsageGroups: groups.length === 0,
    metrics: {
      cpu: computeQuotaMetric({
        metric: "cpu",
        unit: "vcpu-seconds",
        included: CLOUDFLARE_WORKERS_PAID_INCLUDED_CPU_SECONDS,
        used: totalCpuTimeSec,
      }),
      memory: computeQuotaMetric({
        metric: "memory",
        unit: "byte-seconds",
        included: CLOUDFLARE_WORKERS_PAID_INCLUDED_MEMORY_BYTE_SECONDS,
        used: totalAllocatedMemoryByteSec,
      }),
      disk: computeQuotaMetric({
        metric: "disk",
        unit: "byte-seconds",
        included: CLOUDFLARE_WORKERS_PAID_INCLUDED_DISK_BYTE_SECONDS,
        used: totalAllocatedDiskByteSec,
      }),
    },
    network: {
      txBytes: {
        metric: "txBytes",
        unit: "bytes",
        used: totalTxBytes,
        included: null,
        remaining: null,
        overage: null,
        regionAttribution: "unavailable-without-region-dimension",
        estimatedCostUsd: null,
        estimated: true,
        authoritative: false,
      },
    },
  };
}

export interface CloudflareApiFetchLikeResponse {
  status: number;
  ok?: boolean;
  json(): Promise<unknown>;
}

export type CloudflareApiFetchFn = (
  url: string,
  init: {
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<CloudflareApiFetchLikeResponse>;

export interface CloudflareContainersQuotaReadRequest {
  accountTag: string;
  /**
   * Bearer token or pre-resolved authorization header value injected by the
   * trusted host. This module never reads local CLI files or env vars.
   */
  apiToken?: string;
  authorizationHeader?: string;
  /**
   * Optional pre-fetched subscription payload (if the caller already has the
   * account's subscription record). When omitted, the reader fetches
   * `${apiBaseUrl}/accounts/${accountTag}/subscriptions`.
   */
  subscription?: unknown;
  /**
   * Injected fetch implementation or custom transport. Defaults to global
   * `fetch` only when not overridden.
   */
  fetchFn?: CloudflareApiFetchFn;
  /**
   * Optional injected reader hook for callers that route GraphQL / REST through
   * a custom host bridge instead of raw HTTP `fetch`.
   */
  readGraphQL?: (
    payload: CloudflareContainersUsageGraphQLRequestPayload,
  ) => Promise<{ status?: number; body: unknown }>;
  readSubscriptions?: (
    accountTag: string,
  ) => Promise<{ status?: number; body: unknown }>;
  apiBaseUrl?: string;
  now?: string | number | Date;
  limit?: number;
  signal?: AbortSignal;
}

function buildAuthHeaders(req: {
  apiToken?: string;
  authorizationHeader?: string;
}): Record<string, string> | null {
  if (
    typeof req.authorizationHeader === "string" &&
    req.authorizationHeader.trim().length > 0
  ) {
    return {
      Authorization: req.authorizationHeader.trim(),
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
  if (typeof req.apiToken === "string" && req.apiToken.trim().length > 0) {
    return {
      Authorization: `Bearer ${req.apiToken.trim()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
  return null;
}

/**
 * Injected reader that orchestrates subscription window resolution and GraphQL
 * usage querying without any global state, caching, or credential file access.
 */
export async function readCloudflareContainersQuota(
  request: CloudflareContainersQuotaReadRequest,
): Promise<CloudflareContainersQuotaSnapshot> {
  const nowParsed = normalizeNowIso(request.now);
  const observedAt = nowParsed ? nowParsed.iso : new Date(0).toISOString();
  const accountTag =
    typeof request.accountTag === "string" &&
    request.accountTag.trim().length > 0
      ? request.accountTag.trim()
      : null;

  if (!nowParsed) {
    return makeUnknownSnapshot({
      accountTag,
      planId: null,
      budgetKey: null,
      observedAt,
      window: null,
      reason: "invalid_now_timestamp",
      detail: "Provided `now` timestamp is invalid.",
    });
  }

  if (!accountTag) {
    return makeUnknownSnapshot({
      accountTag: null,
      planId: null,
      budgetKey: null,
      observedAt: nowParsed.iso,
      window: null,
      reason: "invalid_account_tag",
      detail: "accountTag must be a non-empty string.",
    });
  }

  const baseUrl = (
    request.apiBaseUrl ?? "https://api.cloudflare.com/client/v4"
  ).replace(/\/+$/, "");
  const fetchImpl: CloudflareApiFetchFn | undefined =
    request.fetchFn ??
    (typeof globalThis.fetch === "function"
      ? (url, init) => globalThis.fetch(url, init)
      : undefined);

  let subscriptionStatus = 200;
  let subscriptionPayload: unknown = request.subscription;

  try {
    if (subscriptionPayload === undefined) {
      if (request.readSubscriptions) {
        const subResp = await request.readSubscriptions(accountTag);
        subscriptionStatus = subResp.status ?? 200;
        subscriptionPayload = subResp.body;
      } else {
        const headers = buildAuthHeaders(request);
        if (!headers || !fetchImpl) {
          return makeUnknownSnapshot({
            accountTag,
            planId: null,
            budgetKey: null,
            observedAt: nowParsed.iso,
            window: null,
            reason: "transport_error",
            detail:
              "Missing injected credentials or fetch implementation for subscriptions read.",
          });
        }
        const subUrl = `${baseUrl}/accounts/${encodeURIComponent(accountTag)}/subscriptions`;
        const resp = await fetchImpl(subUrl, {
          method: "GET",
          headers,
          ...(request.signal ? { signal: request.signal } : {}),
        });
        subscriptionStatus = resp.status;
        if (subscriptionStatus === 200) {
          subscriptionPayload = await resp.json();
        }
      }
    }
  } catch (err) {
    return makeUnknownSnapshot({
      accountTag,
      planId: null,
      budgetKey: null,
      observedAt: nowParsed.iso,
      window: null,
      reason: "transport_error",
      detail:
        err instanceof Error
          ? `Subscription read failed: ${err.message}`
          : "Subscription read failed.",
    });
  }

  if (subscriptionStatus !== 200) {
    return makeUnknownSnapshot({
      accountTag,
      planId: null,
      budgetKey: null,
      observedAt: nowParsed.iso,
      window: null,
      reason: "http_error",
      detail: `Cloudflare subscriptions HTTP status ${subscriptionStatus}.`,
    });
  }

  const subExtract = extractWorkersPaidSubscription(subscriptionPayload);
  if (!subExtract.ok) {
    return makeUnknownSnapshot({
      accountTag,
      planId: subExtract.planId,
      budgetKey: null,
      observedAt: nowParsed.iso,
      window: null,
      reason: subExtract.reason,
      detail: subExtract.detail,
    });
  }

  const { planId, periodStart, periodEnd } = subExtract.subscription;
  const budgetKey = buildCloudflareAccountBudgetKey({
    accountTag,
    periodStart,
    periodEnd,
  });

  const windowRes = resolveCloudflareBillingWindow({
    periodStart,
    periodEnd,
    now: nowParsed.ms,
  });
  if (!windowRes.ok) {
    return makeUnknownSnapshot({
      accountTag,
      planId,
      budgetKey,
      observedAt: nowParsed.iso,
      window: null,
      reason: windowRes.reason,
      detail: windowRes.detail,
    });
  }

  const gqlPayload = buildCloudflareContainersUsageGraphQLPayload({
    accountTag,
    start: windowRes.window.queryStart,
    end: windowRes.window.queryEnd,
    ...(request.limit !== undefined ? { limit: request.limit } : {}),
  });

  let graphqlStatus = 200;
  let graphqlBody: unknown;

  try {
    if (request.readGraphQL) {
      const gqlResp = await request.readGraphQL(gqlPayload);
      graphqlStatus = gqlResp.status ?? 200;
      graphqlBody = gqlResp.body;
    } else {
      const headers = buildAuthHeaders(request);
      if (!headers || !fetchImpl) {
        return makeUnknownSnapshot({
          accountTag,
          planId,
          budgetKey,
          observedAt: nowParsed.iso,
          window: windowRes.window,
          reason: "transport_error",
          detail:
            "Missing injected credentials or fetch implementation for GraphQL read.",
        });
      }
      const gqlUrl = `${baseUrl}/graphql`;
      const resp = await fetchImpl(gqlUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(gqlPayload),
        ...(request.signal ? { signal: request.signal } : {}),
      });
      graphqlStatus = resp.status;
      if (graphqlStatus === 200) {
        graphqlBody = await resp.json();
      }
    }
  } catch (err) {
    return makeUnknownSnapshot({
      accountTag,
      planId,
      budgetKey,
      observedAt: nowParsed.iso,
      window: windowRes.window,
      reason: "transport_error",
      detail:
        err instanceof Error
          ? `GraphQL read failed: ${err.message}`
          : "GraphQL read failed.",
    });
  }

  return transformCloudflareContainersQuota({
    accountTag,
    subscription: subscriptionPayload,
    subscriptionHttpStatus: subscriptionStatus,
    graphqlResponse: graphqlBody,
    graphqlHttpStatus: graphqlStatus,
    now: nowParsed.ms,
  });
}
