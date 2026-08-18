import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asOptionalTrimmedString } from "core/optionalString";
import { createKey, createTokenKey } from "database/keys";
import { DataType } from "create/types";

type UsageScope = "user" | "all" | "space";

export type ModelUsageQueryParams = {
  requestUserId: string;
  isAdmin?: boolean;
  scope?: UsageScope;
  userId?: string;
  spaceId?: string;
  provider?: string;
  model?: string;
  serviceTier?: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  creditsPerUsd?: number;
  thresholdCredits?: number;
  thresholdUsd?: number;
};

type TokenRecordLike = {
  type?: string;
  userId?: string;
  timestamp?: number;
  createdAt?: number | string;
  dateKey?: string;
  provider?: string;
  model?: string;
  billing_service_tier?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cost?: number;
};

export type UsageBucket = {
  count: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  costCredits: number;
  costUsd: number;
};

export type ModelUsageQueryResult = {
  scope: Exclude<UsageScope, "space">;
  userId: string | null;
  startDate: string;
  endDate: string;
  currency: string;
  filters: {
    provider: string | null;
    model: string | null;
    serviceTier: string | null;
  };
  total: UsageBucket;
  providers: Record<string, UsageBucket>;
  models: Record<string, UsageBucket>;
  serviceTiers: Record<string, UsageBucket>;
  threshold: {
    costCredits: number | null;
    costUsd: number | null;
    usedPercent: number | null;
    exceeded: boolean;
  };
};

const emptyBucket = (): UsageBucket => ({
  count: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  costCredits: 0,
  costUsd: 0,
});

const toNumber = (value: unknown): number =>
  asOptionalFiniteNumber(value) ?? 0;

const round6 = (value: number): number => Number(value.toFixed(6));

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

const calculateThresholdUsedPercent = (
  costCredits: number,
  thresholdCredits: number | null,
): number | null => {
  if (thresholdCredits == null || thresholdCredits <= 0) return null;
  return clampPercent((costCredits / thresholdCredits) * 100);
};

export const normalizeDateKey = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
};

export const todayDateKey = (): string => new Date().toISOString().slice(0, 10);

export const recordDateKey = (record: TokenRecordLike): string | null => {
  const explicit = normalizeDateKey(record.dateKey);
  if (explicit) return explicit;
  const timestamp = toNumber(record.timestamp);
  if (timestamp > 0) return new Date(timestamp).toISOString().slice(0, 10);
  if (typeof record.createdAt === "number" && record.createdAt > 0) {
    return new Date(record.createdAt).toISOString().slice(0, 10);
  }
  return normalizeDateKey(record.createdAt);
};

const normalizeScope = (scope: unknown): UsageScope =>
  scope === "all" || scope === "space" || scope === "user" ? scope : "user";

const normalizeCreditsPerUsd = (value: unknown): number => {
  const numeric = toNumber(value);
  return numeric > 0 ? numeric : 8;
};

const addToBucket = (
  bucket: UsageBucket,
  record: TokenRecordLike,
  creditsPerUsd: number,
) => {
  const costCredits = toNumber(record.cost);
  bucket.count += 1;
  bucket.inputTokens += toNumber(record.input_tokens);
  bucket.outputTokens += toNumber(record.output_tokens);
  bucket.cacheCreationInputTokens += toNumber(record.cache_creation_input_tokens);
  bucket.cacheReadInputTokens += toNumber(record.cache_read_input_tokens);
  bucket.costCredits = round6(bucket.costCredits + costCredits);
  bucket.costUsd = round6(bucket.costCredits / creditsPerUsd);
};

const addNamedBucket = (
  buckets: Record<string, UsageBucket>,
  name: string | undefined,
  record: TokenRecordLike,
  creditsPerUsd: number,
) => {
  const key = asOptionalTrimmedString(name) ?? "unknown";
  buckets[key] ??= emptyBucket();
  addToBucket(buckets[key], record, creditsPerUsd);
};

export const tokenRecordRange = (
  scope: "user" | "all",
  userId: string | null,
) => {
  if (scope === "user" && userId) {
    const { start, end } = createTokenKey.rangeOfUser(userId);
    return { gte: start, lte: end };
  }
  return { gte: createKey("token", ""), lte: createKey("token", "\uffff") };
};

export const isTokenRecordKey = (key: string): boolean =>
  key.startsWith(createKey("token", "")) &&
  !key.startsWith(createKey("token", "stats", ""));

export const matchesFilter = (
  record: TokenRecordLike,
  params: ModelUsageQueryParams,
  startDate: string,
  endDate: string,
): boolean => {
  if (record.type !== DataType.TOKEN) return false;
  const dateKey = recordDateKey(record);
  if (!dateKey || dateKey < startDate || dateKey > endDate) return false;
  if (params.provider && record.provider !== params.provider) return false;
  if (params.model && record.model !== params.model) return false;
  if (params.serviceTier && record.billing_service_tier !== params.serviceTier) {
    return false;
  }
  return true;
};

export async function queryModelUsage(
  db: any,
  params: ModelUsageQueryParams,
): Promise<ModelUsageQueryResult> {
  const requestUserId = params.requestUserId?.trim();
  if (!requestUserId) {
    throw new Error("MODEL_USAGE_FORBIDDEN: missing request user");
  }

  const scope = normalizeScope(params.scope);
  if (scope === "space") {
    // TODO(space): implement usage ownership by space once token records reliably carry spaceId.
    throw new Error("MODEL_USAGE_SPACE_SCOPE_TODO");
  }

  if (scope === "all" && !params.isAdmin) {
    throw new Error("MODEL_USAGE_FORBIDDEN: all-site usage requires admin");
  }

  const targetUserId = scope === "all" ? null : (params.userId || requestUserId).trim();
  if (targetUserId && targetUserId !== requestUserId && !params.isAdmin) {
    throw new Error("MODEL_USAGE_FORBIDDEN: cannot query another user");
  }

  const startDate = normalizeDateKey(params.startDate) ?? todayDateKey();
  const endDate = normalizeDateKey(params.endDate) ?? startDate;
  const creditsPerUsd = normalizeCreditsPerUsd(params.creditsPerUsd);
  const currency =
    asOptionalTrimmedString(params.currency)?.toUpperCase() ?? "CREDITS";

  const total = emptyBucket();
  const providers: Record<string, UsageBucket> = {};
  const models: Record<string, UsageBucket> = {};
  const serviceTiers: Record<string, UsageBucket> = {};
  const range = tokenRecordRange(scope, targetUserId);

  for await (const [key, value] of db.iterator(range)) {
    if (typeof key !== "string" || !isTokenRecordKey(key)) continue;
    const record = value as TokenRecordLike;
    if (!matchesFilter(record, params, startDate, endDate)) continue;
    addToBucket(total, record, creditsPerUsd);
    addNamedBucket(providers, record.provider, record, creditsPerUsd);
    addNamedBucket(models, record.model, record, creditsPerUsd);
    addNamedBucket(serviceTiers, record.billing_service_tier, record, creditsPerUsd);
  }

  const thresholdCreditsInput = asOptionalFiniteNumber(params.thresholdCredits);
  const thresholdUsdInput = asOptionalFiniteNumber(params.thresholdUsd);
  const thresholdCredits =
    thresholdCreditsInput ??
    (thresholdUsdInput !== undefined
      ? round6(thresholdUsdInput * creditsPerUsd)
      : null);
  const thresholdUsd =
    thresholdUsdInput ??
    (thresholdCredits == null
      ? null
      : round6(thresholdCredits / creditsPerUsd));
  const thresholdUsedPercent = calculateThresholdUsedPercent(
    total.costCredits,
    thresholdCredits,
  );

  return {
    scope,
    userId: targetUserId,
    startDate,
    endDate,
    currency,
    filters: {
      provider: params.provider ?? null,
      model: params.model ?? null,
      serviceTier: params.serviceTier ?? null,
    },
    total,
    providers,
    models,
    serviceTiers,
    threshold: {
      costCredits: thresholdCredits,
      costUsd: thresholdUsd,
      usedPercent: thresholdUsedPercent,
      exceeded: thresholdCredits == null ? false : total.costCredits > thresholdCredits,
    },
  };
}
