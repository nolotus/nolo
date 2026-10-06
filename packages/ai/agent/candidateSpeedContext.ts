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

function resolveOne(
  model: string,
  samplesByModel: SpeedSamplesByModel,
): CandidateSpeedFact | null {
  const observed = resolveObservedSpeed(samplesByModel.get(model) ?? [], {
    limit: OBSERVED_SPEED_WINDOW,
  });
  if (
    observed.firstOutputSampleCount >= MIN_OBSERVED_FIRST_OUTPUT_SAMPLES &&
    observed.medianFirstOutputMs !== undefined
  ) {
    return {
      model,
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
    model,
    source: "aa",
    ...(firstAnswerTokenS !== undefined ? { firstAnswerTokenS } : {}),
    ...(isFiniteNumber(aa.outputSpeedTps) ? { outputTps: aa.outputSpeedTps } : {}),
    measuredAt: aa.measuredAt,
  };
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

export interface SpeedSampleDb {
  iterator(options: Record<string, unknown>): AsyncIterable<[string, unknown]>;
}

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
export async function loadRecentSpeedSamples(
  db: SpeedSampleDb,
  userId: string,
): Promise<Map<string, SpeedSample[]>> {
  const { start, end } = createTokenKey.rangeOfUser(userId);
  const failedPrefix = createKey("token", userId, "failed-call", "");
  const collected = new Map<string, Array<SpeedSample & { t: number }>>();
  for await (const [key, raw] of db.iterator({ gte: start, lte: end })) {
    if (typeof key === "string" && key.startsWith(failedPrefix)) continue;
    if (!raw || typeof raw !== "object") continue;
    const value = raw as Record<string, unknown>;
    if (typeof value.model !== "string") continue;
    if (!isFiniteNumber(value.firstOutputMs) && !isFiniteNumber(value.callDurationMs)) continue;
    const model = normalizeSpeedModelName(value.model);
    if (!model) continue;
    const list = collected.get(model) ?? [];
    list.push({
      t: eventTime(value),
      firstOutputMs: value.firstOutputMs as number | undefined,
      callDurationMs: value.callDurationMs as number | undefined,
      output_tokens: value.output_tokens as number | undefined,
    });
    collected.set(model, list);
  }
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

    let samples: SpeedSamplesByModel = new Map();
    const userId = typeof options.userId === "string" ? options.userId.trim() : "";
    if (options.db && userId) {
      try {
        samples = await loadCachedSpeedSamples(options.db, userId, options.now ?? Date.now());
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
