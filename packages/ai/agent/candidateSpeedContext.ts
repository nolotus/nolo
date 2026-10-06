// ai/agent/candidateSpeedContext.ts
//
// Candidate-scoped, compact speed context for agent selection (`speedContext`,
// injected next to `qualityContext` on listAgents results).
//
// Data sources, per candidate model (one source per line, never mixed):
//   1. observed — this user's own recent token records (firstOutputMs /
//      callDurationMs / output_tokens), resolved by ai/token/observedSpeedResolver
//      (which already drops implausible burst-arrival TPS samples). Used when the
//      model has at least MIN_OBSERVED_FIRST_OUTPUT_SAMPLES first-output samples.
//   2. aa — the Artificial Analysis snapshot in ai/llm/modelAbility.ts
//      (outputSpeedTps / firstAnswerTokenS, with measuredAt), only as fallback.
//   Neither source → no line (missing is missing, not slow).
//
// Deliberately NOT done here: no speed × quality composite score, no ranking,
// no task-domain gating (speed is domain-agnostic). How speed is weighed is
// decided by AGENT_SELECTION_PRIORITY_INSTRUCTIONS. Every failure path returns
// the listAgents result unchanged; this module never throws to the caller.

import { createTokenKey, createKey } from "database/keys";
import { getModelAbility } from "../llm/modelAbility";
import {
  readSpeedSamplesCache,
  writeSpeedSamplesCache,
  SPEED_SAMPLE_CACHE_VERSION,
  SPEED_SAMPLE_DISK_CACHE_TTL_MS,
  SPEED_SAMPLE_SCAN_BUDGET_MS,
  type SpeedSampleDiskCacheOptions,
} from "./speedSampleCache";
import {
  resolveObservedSpeed,
  type ObservedSpeedRecordInput,
} from "../token/observedSpeedResolver";

/** Most recent records per model fed to the resolver. */
export const OBSERVED_SPEED_WINDOW = 50;
/** Fewer first-output samples than this → observed is too thin, fall back to AA. */
export const MIN_OBSERVED_FIRST_OUTPUT_SAMPLES = 5;
/** Per-user cache TTL for the token scan (keys are not time-sortable → full user scan). */
export const SPEED_SAMPLES_CACHE_TTL_MS = 5 * 60_000;
/** Max users kept in the module-level samples cache; oldest entries are evicted beyond this. */
export const SPEED_SAMPLES_CACHE_MAX_ENTRIES = 500;
/**
 * AA firstAnswerTokenS above this is treated as untrustworthy and not rendered.
 * AA's first-answer figure includes thinking time measured on AA's own prompts;
 * values of minutes (e.g. claude-sonnet-5 ≈150s) are sampling/methodology
 * artifacts rather than what a user's channel delivers, and a single outlier
 * would otherwise dominate routing. Same spirit as the TPS plausibility filter
 * in observedSpeedResolver.
 */
export const MAX_PLAUSIBLE_AA_FIRST_ANSWER_S = 60;

export type SpeedSample = ObservedSpeedRecordInput;

/** normalized model name → samples, newest first. */
export type SpeedSamplesByModel = ReadonlyMap<string, readonly SpeedSample[]>;

export interface CandidateSpeedFact {
  model: string;
  source: "observed" | "aa";
  /** observed: median first meaningful output (ms). */
  firstOutputMs?: number;
  /** aa: median first answer token (seconds; includes thinking time). */
  firstAnswerTokenS?: number;
  outputTps?: number;
  firstOutputSamples?: number;
  tpsSamples?: number;
  measuredAt?: string;
}

/** Lightweight normalization: trim, lowercase, drop provider prefix (`deepseek/x` → `x`). */
export function normalizeSpeedModelName(raw: string): string {
  const name = raw.trim().toLowerCase();
  const slash = name.lastIndexOf("/");
  return slash === -1 ? name : name.slice(slash + 1);
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Reasoning-tier suffixes a candidate name may carry on top of the name the
 * samples / AA snapshot are recorded under (`claude-opus-5-5-medium` →
 * `claude-opus-5-5`). `max` is deliberately absent: `swe-2-max` is a model name,
 * not a reasoning tier, and stripping it would invent a different model.
 */
export const REASONING_EFFORT_SUFFIXES = ["minimal", "low", "medium", "high", "xhigh"] as const;
const REASONING_EFFORT_SUFFIX_RE = new RegExp(`-(?:${REASONING_EFFORT_SUFFIXES.join("|")})$`);

/** Base name with the trailing reasoning tier removed; `null` when there is none. */
export function stripReasoningEffortSuffix(model: string): string | null {
  const base = model.replace(REASONING_EFFORT_SUFFIX_RE, "");
  return base && base !== model ? base : null;
}

function resolveOneBare(
  model: string,
  samplesByModel: SpeedSamplesByModel,
): Omit<CandidateSpeedFact, "model"> | null {
  const observed = resolveObservedSpeed(samplesByModel.get(model) ?? [], {
    limit: OBSERVED_SPEED_WINDOW,
  });
  if (
    observed.firstOutputSampleCount >= MIN_OBSERVED_FIRST_OUTPUT_SAMPLES &&
    observed.medianFirstOutputMs !== undefined
  ) {
    return {
      source: "observed",
      firstOutputMs: observed.medianFirstOutputMs,
      ...(observed.medianOutputTokensPerSecond !== undefined
        ? { outputTps: observed.medianOutputTokensPerSecond }
        : {}),
      firstOutputSamples: observed.firstOutputSampleCount,
      tpsSamples: observed.throughputSampleCount,
    };
  }

  const aa = getModelAbility(model)?.aaSnapshot;
  if (!aa) return null;
  const firstAnswerTokenS =
    isFiniteNumber(aa.firstAnswerTokenS) &&
    aa.firstAnswerTokenS <= MAX_PLAUSIBLE_AA_FIRST_ANSWER_S
      ? aa.firstAnswerTokenS
      : undefined;
  if (!isFiniteNumber(aa.outputSpeedTps) && firstAnswerTokenS === undefined) {
    return null;
  }
  return {
    source: "aa",
    ...(firstAnswerTokenS !== undefined ? { firstAnswerTokenS } : {}),
    ...(isFiniteNumber(aa.outputSpeedTps) ? { outputTps: aa.outputSpeedTps } : {}),
    measuredAt: aa.measuredAt,
  };
}

/**
 * One fact per candidate model: exact name first, then the same lookup with a
 * trailing reasoning tier removed. The fact keeps the candidate's own
 * (normalized) name, so every line maps back to a candidate the caller listed.
 */
function resolveOne(
  model: string,
  samplesByModel: SpeedSamplesByModel,
): CandidateSpeedFact | null {
  const direct = resolveOneBare(model, samplesByModel);
  if (direct) return { model, ...direct };
  const base = stripReasoningEffortSuffix(model);
  if (!base) return null;
  const stripped = resolveOneBare(base, samplesByModel);
  return stripped ? { model, ...stripped } : null;
}

/** Resolve one fact per unique (normalized) candidate model; models with no data are dropped. */
export function resolveCandidateSpeedFacts(
  models: readonly string[],
  samplesByModel: SpeedSamplesByModel,
): CandidateSpeedFact[] {
  const unique = [
    ...new Set(
      models
        .filter((model): model is string => typeof model === "string")
        .map(normalizeSpeedModelName)
        .filter(Boolean),
    ),
  ];
  return unique
    .map((model) => resolveOne(model, samplesByModel))
    .filter((fact): fact is CandidateSpeedFact => fact !== null);
}

const formatSeconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;
const formatTps = (tps: number): string => String(Math.round(tps));

export const SPEED_CONTEXT_HEADER =
  "speed (observed=本用户最近调用中位数, firstOutput 含推理输出; aa=Artificial Analysis 快照, firstAnswer 含思考时间, 两源不可直接比较; tps=n/a 表示无可信吞吐样本):";

export function formatCandidateSpeedFacts(facts: readonly CandidateSpeedFact[]): string | null {
  if (facts.length === 0) return null;
  const lines = facts.map((fact) => {
    if (fact.source === "observed") {
      const tps = fact.outputTps !== undefined ? formatTps(fact.outputTps) : "n/a";
      return `  ${fact.model}: firstOutput=${formatSeconds(fact.firstOutputMs ?? 0)} tps=${tps} [observed n=${fact.firstOutputSamples ?? 0} tpsN=${fact.tpsSamples ?? 0}]`;
    }
    const parts: string[] = [];
    if (fact.firstAnswerTokenS !== undefined) parts.push(`firstAnswer=${fact.firstAnswerTokenS.toFixed(1)}s`);
    parts.push(`tps=${fact.outputTps !== undefined ? formatTps(fact.outputTps) : "n/a"}`);
    return `  ${fact.model}: ${parts.join(" ")} [aa measuredAt=${fact.measuredAt}]`;
  });
  return `${SPEED_CONTEXT_HEADER}\n${lines.join("\n")}`;
}

export function buildCandidateSpeedContext(
  models: readonly string[],
  samplesByModel: SpeedSamplesByModel,
): string | null {
  return formatCandidateSpeedFacts(resolveCandidateSpeedFacts(models, samplesByModel));
}

// ── Token record loading ──────────────────────────────────────────────────

/** Keys fetched per iterator page. An unpaged scan of the CLI's broker-backed db
 *  costs ~2ms per record (98k records > 3 min); 2000-key pages finish the same
 *  scan in ~4.3s. */
export const SPEED_SAMPLE_PAGE_SIZE = 2000;

/**
 * Iterator options this module uses. `gt` resumes a page past the last accepted
 * key; stores that ignore it stay correct because the scan itself drops every
 * key <= lastKey it has already seen (see collectRecentSpeedSamples).
 */
export type SpeedSampleIteratorOptions = {
  gte?: string;
  lte?: string;
  gt?: string;
  limit?: number;
};

export interface SpeedSampleDb {
  iterator(options: SpeedSampleIteratorOptions): AsyncIterable<[string, unknown]>;
}

export type SpeedSampleLoadOptions = {
  /** Keys per page (default SPEED_SAMPLE_PAGE_SIZE). */
  pageSize?: number;
  /** Wall-clock budget for the whole scan. When exceeded, scanning stops and
   *  `budgetExhausted` is reported — the partial result is an arbitrary
   *  key-ordered subset, so a caller that needs a trustworthy median must treat
   *  it as "no data". Defaults to no budget. */
  budgetMs?: number;
};

export type SpeedSampleLoadResult = {
  samples: Map<string, SpeedSample[]>;
  budgetExhausted: boolean;
};

const eventTime = (value: Record<string, unknown>): number => {
  if (isFiniteNumber(value.timestamp)) return value.timestamp;
  if (isFiniteNumber(value.createdAt)) return value.createdAt;
  return 0;
};

/**
 * Scan this user's token records and keep, per normalized model, the newest
 * OBSERVED_SPEED_WINDOW records that carry timing. Token keys are call-id based
 * (not time-sortable), so this is a full user-prefix scan sorted by timestamp.
 * Failed-call audit records are skipped.
 */
function collectSample(
  collected: Map<string, Array<SpeedSample & { t: number }>>,
  value: Record<string, unknown>,
): void {
  if (typeof value.model !== "string") return;
  if (!isFiniteNumber(value.firstOutputMs) && !isFiniteNumber(value.callDurationMs)) return;
  const model = normalizeSpeedModelName(value.model);
  if (!model) return;
  const list = collected.get(model) ?? [];
  list.push({
    t: eventTime(value),
    firstOutputMs: value.firstOutputMs as number | undefined,
    callDurationMs: value.callDurationMs as number | undefined,
    output_tokens: value.output_tokens as number | undefined,
  });
  collected.set(model, list);
}

function finalizeSamples(
  collected: Map<string, Array<SpeedSample & { t: number }>>,
): Map<string, SpeedSample[]> {
  const result = new Map<string, SpeedSample[]>();
  for (const [model, list] of collected) {
    list.sort((a, b) => b.t - a.t);
    result.set(
      model,
      list.slice(0, OBSERVED_SPEED_WINDOW).map(({ t: _t, ...sample }) => sample),
    );
  }
  return result;
}

/**
 * Scan this user's token records and keep, per normalized model, the newest
 * OBSERVED_SPEED_WINDOW records that carry timing. Token keys are call-id based
 * (not time-sortable), so this is a full user-prefix scan sorted by timestamp.
 * Failed-call audit records are skipped.
 *
 * Paged on purpose (see SPEED_SAMPLE_PAGE_SIZE). Each page resumes exclusively
 * after the last accepted key, and every key <= that last key is dropped, so a
 * store that ignores `gt`/`limit` can neither double count nor spin forever:
 * a page that accepts nothing ends the scan.
 */
export async function collectRecentSpeedSamples(
  db: SpeedSampleDb,
  userId: string,
  options: SpeedSampleLoadOptions = {},
): Promise<SpeedSampleLoadResult> {
  const pageSize =
    isFiniteNumber(options.pageSize) && options.pageSize > 0
      ? Math.floor(options.pageSize)
      : SPEED_SAMPLE_PAGE_SIZE;
  const budgetMs = isFiniteNumber(options.budgetMs)
    ? options.budgetMs
    : Number.POSITIVE_INFINITY;
  const { start, end } = createTokenKey.rangeOfUser(userId);
  const failedPrefix = createKey("token", userId, "failed-call", "");
  const collected = new Map<string, Array<SpeedSample & { t: number }>>();
  const startedAt = Date.now();
  let lastKey: string | undefined;
  let budgetExhausted = false;

  while (true) {
    if (Date.now() - startedAt >= budgetMs) {
      budgetExhausted = true;
      break;
    }
    const pageOptions: SpeedSampleIteratorOptions = {
      ...(lastKey === undefined ? { gte: start } : { gt: lastKey }),
      lte: end,
      limit: pageSize,
    };
    let accepted = 0;
    let newestKey = lastKey;
    for await (const [key, raw] of db.iterator(pageOptions)) {
      if (typeof key !== "string") continue;
      if (lastKey !== undefined && key <= lastKey) continue;
      accepted += 1;
      newestKey = key;
      if (key.startsWith(failedPrefix)) continue;
      if (!raw || typeof raw !== "object") continue;
      collectSample(collected, raw as Record<string, unknown>);
    }
    if (accepted === 0 || accepted < pageSize) break;
    lastKey = newestKey;
  }

  return { samples: finalizeSamples(collected), budgetExhausted };
}

/**
 * Paged scan without budget reporting: the samples only. Callers that must not
 * act on a partial scan use `collectRecentSpeedSamples` directly.
 */
export async function loadRecentSpeedSamples(
  db: SpeedSampleDb,
  userId: string,
  options: SpeedSampleLoadOptions = {},
): Promise<Map<string, SpeedSample[]>> {
  const { samples } = await collectRecentSpeedSamples(db, userId, options);
  return samples;
}

/**
 * Cold-scan-with-budget behind a per-user disk cache, for short-lived processes
 * (the CLI). A fresh cache entry short-circuits the scan entirely; a cold scan
 * gets `budgetMs` and is discarded (→ empty map → AA-only) if it runs over.
 * Never throws.
 */
export async function loadSpeedSamplesWithDiskCache(
  db: SpeedSampleDb,
  userId: string,
  now: number,
  cache: SpeedSampleDiskCacheOptions,
): Promise<Map<string, SpeedSample[]>> {
  try {
    const ttlMs = isFiniteNumber(cache.ttlMs) ? cache.ttlMs : SPEED_SAMPLE_DISK_CACHE_TTL_MS;
    const cached = await readSpeedSamplesCache(cache.cachePath, { userId, now, ttlMs });
    if (cached) return cached;
    const { samples, budgetExhausted } = await collectRecentSpeedSamples(db, userId, {
      pageSize: cache.pageSize,
      budgetMs: isFiniteNumber(cache.budgetMs) ? cache.budgetMs : SPEED_SAMPLE_SCAN_BUDGET_MS,
    });
    if (budgetExhausted) return new Map();
    await writeSpeedSamplesCache(cache.cachePath, {
      version: SPEED_SAMPLE_CACHE_VERSION,
      userId,
      at: now,
      samples: Object.fromEntries(samples),
    });
    return samples;
  } catch {
    return new Map();
  }
}

// Module-level, per-user cache. Each miss costs a full token-prefix scan of the
// user's records (keys are not time-sortable), awaited synchronously on the
// listAgents tool-call path — at most once per user per TTL. Bounded so a
// long-lived server does not grow without limit: expired entries are pruned on
// every write, and beyond SPEED_SAMPLES_CACHE_MAX_ENTRIES the oldest (Map
// insertion order == write order, since writes re-insert) are evicted.
const samplesCache = new Map<string, { at: number; samples: Map<string, SpeedSample[]> }>();

function writeSamplesCache(
  userId: string,
  now: number,
  samples: Map<string, SpeedSample[]>,
): void {
  for (const [key, entry] of samplesCache) {
    if (now - entry.at >= SPEED_SAMPLES_CACHE_TTL_MS) samplesCache.delete(key);
  }
  samplesCache.delete(userId);
  samplesCache.set(userId, { at: now, samples });
  while (samplesCache.size > SPEED_SAMPLES_CACHE_MAX_ENTRIES) {
    const oldest = samplesCache.keys().next().value;
    if (oldest === undefined) break;
    samplesCache.delete(oldest);
  }
}

/** Test hook: current number of cached users. */
export function speedSamplesCacheSize(): number {
  return samplesCache.size;
}

/** Test hook. */
export function resetSpeedSamplesCache(): void {
  samplesCache.clear();
}

async function loadCachedSpeedSamples(
  db: SpeedSampleDb,
  userId: string,
  now: number,
): Promise<Map<string, SpeedSample[]>> {
  const hit = samplesCache.get(userId);
  if (hit && now - hit.at < SPEED_SAMPLES_CACHE_TTL_MS) return hit.samples;
  const samples = await loadRecentSpeedSamples(db, userId);
  writeSamplesCache(userId, now, samples);
  return samples;
}

// ── Selector-boundary injection ───────────────────────────────────────────

export interface InjectSpeedContextOptions {
  db?: SpeedSampleDb | null;
  userId?: string | null;
  now?: number;
  /**
   * Short-lived callers (the CLI) pass this to read/write the observed samples
   * through `<NOLO_HOME>/cache/speed-samples-<userId>.json` with a scan budget,
   * instead of the module-level in-process cache. Omitted → current behaviour.
   */
  diskCache?: SpeedSampleDiskCacheOptions | null;
}

/**
 * Add `speedContext` to a listAgents JSON result. Observed data needs db+userId;
 * without them (or on any read failure) it falls back to AA-only facts. Invalid /
 * non-list results and "no data at all" return the input byte-for-byte.
 */
export async function injectSpeedContextIntoListAgentsResult(
  result: string,
  options: InjectSpeedContextOptions = {},
): Promise<string> {
  try {
    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch {
      return result;
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.agents)) return result;
    const models = parsed.agents
      .map((agent: any) => agent?.model)
      .filter((model: unknown): model is string => typeof model === "string");
    if (models.length === 0) return result;

    const now = options.now ?? Date.now();
    let samples: SpeedSamplesByModel = new Map();
    const userId = typeof options.userId === "string" ? options.userId.trim() : "";
    if (options.db && userId) {
      try {
        samples = options.diskCache
          ? await loadSpeedSamplesWithDiskCache(options.db, userId, now, options.diskCache)
          : await loadCachedSpeedSamples(options.db, userId, now);
      } catch {
        samples = new Map();
      }
    }
    const speedContext = buildCandidateSpeedContext(models, samples);
    return speedContext ? JSON.stringify({ ...parsed, speedContext }) : result;
  } catch {
    return result;
  }
}
