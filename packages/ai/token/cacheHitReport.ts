import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asOptionalTrimmedString } from "core/optionalString";

/**
 * Cache-hit / prefix-churn report over already-normalized TokenRecord rows.
 *
 * Hit/miss semantics (from normalizeUsage + calculatePrice):
 * - `cache_read_input_tokens` = cache hit tokens
 * - `input_tokens` = total input tokens (NOT miss-only)
 * - miss tokens = max(0, input_tokens - cache_read_input_tokens)
 */
export type TokenRecordLike = {
  model?: string;
  agentId?: string;
  cybotId?: string;
  entry_path?: string;
  dialogId?: string;
  input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens?: number;
  cost?: number;
  inputPrice?: number;
  outputPrice?: number;
  /** Optional; used only when present to weight hit-vs-miss cost split. */
  inputCacheHitPrice?: number;
  stable_prefix_hash?: string;
  timestamp?: number;
  createdAt?: number | string;
};

export type CacheHitBucket = {
  calls: number;
  hitTokens: number;
  missTokens: number;
  hitRatio: number;
  missCostShare: number;
};

export type PrefixChurnEntry = {
  dialogId: string;
  distinctPrefixHashes: number;
  firstChangeAt: number;
  hashes: string[];
  missTokensAfterFirstChange: number;
};

export type CacheHitReport = {
  total: CacheHitBucket;
  byModel: Record<string, CacheHitBucket>;
  byAgent: Record<string, CacheHitBucket>;
  byEntryPath: Record<string, CacheHitBucket>;
  byDialog: Record<string, CacheHitBucket>;
  prefixChurn: PrefixChurnEntry[];
};

type MutableBucket = {
  calls: number;
  hitTokens: number;
  missTokens: number;
  cost: number;
  missCost: number;
};

type DialogPrefixState = {
  firstHash: string;
  hashes: string[];
  hashFirstSeenAt: Map<string, number>;
  firstChangeAt: number | null;
  missTokensAfterFirstChange: number;
};

const toNumber = (value: unknown): number =>
  asOptionalFiniteNumber(value) ?? 0;

const emptyMutableBucket = (): MutableBucket => ({
  calls: 0,
  hitTokens: 0,
  missTokens: 0,
  cost: 0,
  missCost: 0,
});

export const recordMissTokens = (record: TokenRecordLike): number => {
  const hit = Math.max(0, toNumber(record.cache_read_input_tokens));
  const input = Math.max(0, toNumber(record.input_tokens));
  return Math.max(0, input - hit);
};

export const recordHitTokens = (record: TokenRecordLike): number =>
  Math.max(0, toNumber(record.cache_read_input_tokens));

const recordTime = (record: TokenRecordLike): number => {
  const timestamp = toNumber(record.timestamp);
  if (timestamp > 0) return timestamp;
  if (typeof record.createdAt === "number" && record.createdAt > 0) {
    return record.createdAt;
  }
  if (typeof record.createdAt === "string" && record.createdAt.trim()) {
    const parsed = Date.parse(record.createdAt);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

/**
 * Attribute `record.cost` to the miss-input portion.
 * Prefer price weights when available; otherwise fall back to miss/(hit+miss).
 */
export const estimateMissAttributedCost = (record: TokenRecordLike): number => {
  const cost = toNumber(record.cost);
  if (cost <= 0) return 0;

  const hit = recordHitTokens(record);
  const miss = recordMissTokens(record);
  const output = Math.max(0, toNumber(record.output_tokens));
  const inputPrice = toNumber(record.inputPrice);
  const outputPrice = toNumber(record.outputPrice);
  const hitPrice = toNumber(record.inputCacheHitPrice);

  if (inputPrice > 0 || outputPrice > 0 || hitPrice > 0) {
    const missWeight = miss * inputPrice;
    const hitWeight = hit * hitPrice;
    const outputWeight = output * outputPrice;
    const totalWeight = missWeight + hitWeight + outputWeight;
    if (totalWeight <= 0) return 0;
    return cost * (missWeight / totalWeight);
  }

  const inputTotal = hit + miss;
  if (inputTotal <= 0) return 0;
  return cost * (miss / inputTotal);
};

const finalizeBucket = (bucket: MutableBucket): CacheHitBucket => {
  const denom = bucket.hitTokens + bucket.missTokens;
  return {
    calls: bucket.calls,
    hitTokens: bucket.hitTokens,
    missTokens: bucket.missTokens,
    hitRatio: denom > 0 ? bucket.hitTokens / denom : 0,
    missCostShare: bucket.cost > 0 ? bucket.missCost / bucket.cost : 0,
  };
};

const addToBucket = (bucket: MutableBucket, record: TokenRecordLike) => {
  bucket.calls += 1;
  bucket.hitTokens += recordHitTokens(record);
  bucket.missTokens += recordMissTokens(record);
  bucket.cost += toNumber(record.cost);
  bucket.missCost += estimateMissAttributedCost(record);
};

const addNamedBucket = (
  buckets: Record<string, MutableBucket>,
  name: string | undefined,
  record: TokenRecordLike,
) => {
  const key = asOptionalTrimmedString(name) ?? "unknown";
  buckets[key] ??= emptyMutableBucket();
  addToBucket(buckets[key], record);
};

const agentKey = (record: TokenRecordLike): string | undefined =>
  asOptionalTrimmedString(record.agentId) ??
  asOptionalTrimmedString(record.cybotId);

const finalizeBuckets = (
  buckets: Record<string, MutableBucket>,
): Record<string, CacheHitBucket> => {
  const out: Record<string, CacheHitBucket> = {};
  for (const [key, bucket] of Object.entries(buckets)) {
    out[key] = finalizeBucket(bucket);
  }
  return out;
};

export const buildPrefixChurn = (records: TokenRecordLike[]): PrefixChurnEntry[] => {
  // Process in time order so first-seen hash order is stable.
  const timed = records
    .map((record, index) => ({ record, index, time: recordTime(record) }))
    .sort((a, b) => a.time - b.time || a.index - b.index);

  const byDialog = new Map<string, DialogPrefixState>();

  for (const { record, time } of timed) {
    const dialogId = asOptionalTrimmedString(record.dialogId);
    if (!dialogId) continue;

    const hash = asOptionalTrimmedString(record.stable_prefix_hash);
    const miss = recordMissTokens(record);

    if (!hash) {
      // Legacy rows without hash: skip churn detection, but if churn already
      // started, still count their miss tokens after the first change.
      const existing = byDialog.get(dialogId);
      if (existing && existing.firstChangeAt !== null && time >= existing.firstChangeAt) {
        existing.missTokensAfterFirstChange += miss;
      }
      continue;
    }

    let state = byDialog.get(dialogId);
    if (!state) {
      state = {
        firstHash: hash,
        hashes: [hash],
        hashFirstSeenAt: new Map([[hash, time]]),
        firstChangeAt: null,
        missTokensAfterFirstChange: 0,
      };
      byDialog.set(dialogId, state);
      continue;
    }

    if (!state.hashFirstSeenAt.has(hash)) {
      state.hashFirstSeenAt.set(hash, time);
      state.hashes.push(hash);
      if (state.firstChangeAt === null && hash !== state.firstHash) {
        state.firstChangeAt = time;
      }
    }

    if (state.firstChangeAt !== null && time >= state.firstChangeAt) {
      state.missTokensAfterFirstChange += miss;
    }
  }

  const entries: PrefixChurnEntry[] = [];
  for (const [dialogId, state] of byDialog) {
    if (state.hashes.length < 2 || state.firstChangeAt === null) continue;
    entries.push({
      dialogId,
      distinctPrefixHashes: state.hashes.length,
      firstChangeAt: state.firstChangeAt,
      hashes: state.hashes,
      missTokensAfterFirstChange: state.missTokensAfterFirstChange,
    });
  }

  entries.sort(
    (a, b) =>
      b.missTokensAfterFirstChange - a.missTokensAfterFirstChange ||
      a.dialogId.localeCompare(b.dialogId),
  );
  return entries;
};

export const buildCacheHitReport = (
  records: TokenRecordLike[],
): CacheHitReport => {
  const total = emptyMutableBucket();
  const byModel: Record<string, MutableBucket> = {};
  const byAgent: Record<string, MutableBucket> = {};
  const byEntryPath: Record<string, MutableBucket> = {};
  const byDialog: Record<string, MutableBucket> = {};

  for (const record of records) {
    addToBucket(total, record);
    addNamedBucket(byModel, record.model, record);
    addNamedBucket(byAgent, agentKey(record), record);
    addNamedBucket(byEntryPath, record.entry_path, record);
    addNamedBucket(byDialog, record.dialogId, record);
  }

  return {
    total: finalizeBucket(total),
    byModel: finalizeBuckets(byModel),
    byAgent: finalizeBuckets(byAgent),
    byEntryPath: finalizeBuckets(byEntryPath),
    byDialog: finalizeBuckets(byDialog),
    prefixChurn: buildPrefixChurn(records),
  };
};
