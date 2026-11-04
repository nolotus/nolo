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
//   2. REMOVED: aa (Artificial Analysis) fallback. Its numbers are
//      cross-account averages that misrank this user's own channels; a wrong
//      ordering is worse than no ordering, so only observed data is rendered.
//   Neither source → no line (missing is missing, not slow).
//
// Deliberately NOT done here: no speed × quality composite score, no ranking,
// no task-domain gating (speed is domain-agnostic). How speed is weighed is
// decided by AGENT_SELECTION_PRIORITY_INSTRUCTIONS. Every failure path returns
// the listAgents result unchanged; this module never throws to the caller.

import { createTokenKey, createKey } from "database/keys";
import {
  readSpeedSamplesProgress,
  readSpeedSamplesSnapshot,
  resolveSpeedSamplesProgressPath,
  writeSpeedSamplesCache,
  SPEED_SAMPLE_CACHE_VERSION,
  SPEED_SAMPLE_DISK_CACHE_TTL_MS,
  SPEED_SAMPLE_SCAN_BUDGET_MS,
  SPEED_SAMPLE_STALE_SNAPSHOT_MAX_MS,
  type SpeedSampleDiskCacheOptions,
} from "./speedSampleCache";
import {
  resolveObservedSpeed,
  type ObservedSpeedRecordInput,
} from "../token/observedSpeedResolver";

/** Most recent records per model fed to the resolver. */
export const OBSERVED_SPEED_WINDOW = 50;
/** Fewer first-output samples than this → observed is too thin, model is omitted. */
export const MIN_OBSERVED_FIRST_OUTPUT_SAMPLES = 5;
/** Per-user cache TTL for the token scan (keys are not time-sortable → full user scan). */
export const SPEED_SAMPLES_CACHE_TTL_MS = 5 * 60_000;
/** Max users kept in the module-level samples cache; oldest entries are evicted beyond this. */
export const SPEED_SAMPLES_CACHE_MAX_ENTRIES = 500;
export type SpeedSample = ObservedSpeedRecordInput;

/** normalized model name → samples, newest first. */
export type SpeedSamplesByModel = ReadonlyMap<string, readonly SpeedSample[]>;

export interface CandidateSpeedFact {
  model: string;
  source: "observed";
  /** observed: median first meaningful output (ms). */
  firstOutputMs?: number;
  outputTps?: number;
  firstOutputSamples?: number;
  tpsSamples?: number;
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
 * samples are recorded under (`claude-opus-5-5-medium` →
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
  // Legacy scalar TPS is generation-only; end-to-end groups never enter this view.
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

  // 只认**本用户真实调用**的中位数；不再回落到 Artificial Analysis 的通用快照。
  // aa 的口径（含思考时间的首答、跨账号平均）与我们要挑的"这个用户这条通道多快"不是一回事，
  // 实测多次证明它会给出误导排序——错误的排序比没有排序更糟。
  return null;
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
  "speed (observed=本用户实测调用中位数, firstOutput 含推理输出; tps=generation（不含端到端口径）, tps=n/a 表示无可信吞吐样本。未列出的 model 表示没有实测样本，不代表慢):";

/** Age label for a reused complete snapshot. A complete window collected hours
 *  ago is real measured data; a budget-truncated scan is not a "最近" median and
 *  is never rendered at all — so the only caveat worth printing is how old the
 *  window is. */
export function formatSnapshotAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return "<1min";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatCandidateSpeedFacts(
  facts: readonly CandidateSpeedFact[],
  options: { snapshotAgeMs?: number } = {},
): string | null {
  if (facts.length === 0) return null;
  const lines = facts.map((fact) => {
    const tps = fact.outputTps !== undefined ? formatTps(fact.outputTps) : "n/a";
    return `  ${fact.model}: firstOutput=${formatSeconds(fact.firstOutputMs ?? 0)} tps=${tps} [observed n=${fact.firstOutputSamples ?? 0} tpsN=${fact.tpsSamples ?? 0}]`;
  });
  const age = options.snapshotAgeMs;
  const note =
    typeof age === "number" && age > 0
      ? `  (snapshot=${formatSnapshotAge(age)}前采集的完整窗口, 非本次实时扫描)`
      : "";
  return `${SPEED_CONTEXT_HEADER}${note}\n${lines.join("\n")}`;
}

export function buildCandidateSpeedContext(
  models: readonly string[],
  samplesByModel: SpeedSamplesByModel,
  options: { snapshotAgeMs?: number } = {},
): string | null {
  return formatCandidateSpeedFacts(resolveCandidateSpeedFacts(models, samplesByModel), options);
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
  /** Wall-clock budget for the whole scan. When exceeded the walk stops after
   *  the last complete page and `budgetExhausted` is reported together with
   *  `nextCursor` — the partial result is never a window, it is resume state. */
  budgetMs?: number;
  /** Resume strictly after this token key (incremental walk). */
  startAfter?: string;
  /** Keep each sample's record timestamp (`t`) so segments from different steps
   *  can be merged into the newest window. The resolver ignores the field. */
  keepTime?: boolean;
};

export type SpeedSampleLoadResult = {
  samples: Map<string, SpeedSample[]>;
  budgetExhausted: boolean;
  /** Token keys the walk actually read. `0` means the walk learned nothing about
   *  the range (empty store / wrong user), which is not the same as a range that
   *  was read and simply carried no usable timing. */
  scanned: number;
  /** Key to resume after when the budget cut the walk short (undefined = the
   *  walk reached the end of the user range). */
  nextCursor?: string;
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
  keepTime = false,
): Map<string, SpeedSample[]> {
  const result = new Map<string, SpeedSample[]>();
  for (const [model, list] of collected) {
    list.sort((a, b) => b.t - a.t);
    const window = list.slice(0, OBSERVED_SPEED_WINDOW);
    result.set(
      model,
      keepTime ? window : window.map(({ t: _t, ...sample }) => sample),
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
  let lastKey: string | undefined = options.startAfter;
  let budgetExhausted = false;
  let scanned = 0;

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
      scanned += 1;
      newestKey = key;
      if (key.startsWith(failedPrefix)) continue;
      if (!raw || typeof raw !== "object") continue;
      collectSample(collected, raw as Record<string, unknown>);
    }
    if (accepted === 0 || accepted < pageSize) break;
    lastKey = newestKey;
  }

  return {
    samples: finalizeSamples(collected, options.keepTime === true),
    budgetExhausted,
    scanned,
    ...(budgetExhausted && lastKey !== undefined ? { nextCursor: lastKey } : {}),
  };
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

/** What a selector may render: a complete snapshot (fresh, or old and labelled),
 *  or nothing. Never a budget-truncated subset. */
export type SpeedSamplesForSelection = {
  samples: Map<string, SpeedSample[]>;
  /** Set when the complete window is older than the freshness TTL. */
  snapshotAgeMs?: number;
};

/** Fold one walk segment into the accumulated window: newest N per model by
 *  record timestamp. Segments never overlap (each walk resumes strictly after
 *  the previous cursor), so no de-duplication is needed here. */
export function mergeNewestSamples(
  into: Map<string, SpeedSample[]>,
  from: Map<string, SpeedSample[]>,
): void {
  for (const [model, list] of from) {
    const merged = [...(into.get(model) ?? []), ...list];
    merged.sort(
      (a, b) =>
        ((b as { t?: number }).t ?? 0) - ((a as { t?: number }).t ?? 0),
    );
    into.set(model, merged.slice(0, OBSERVED_SPEED_WINDOW));
  }
}

/**
 * Snapshot-first loader behind the per-user disk cache (the CLI's short-lived
 * process, plus the server's cold start).
 *
 *   1. A fresh complete window (age < `ttlMs`) is served and nothing is scanned.
 *   2. Otherwise a complete window of any age up to the stale cap is served
 *      *with its age*, and one bounded walk step runs per call so the window
 *      does not silently rot: progress lives in a separate `<cache>.progress`
 *      sidecar, so a failed or interrupted walk never costs the served window.
 *   3. Past the stale cap nothing is served — but the walk still advances (no
 *      permanent stall), and the first walk that reaches the end of the user
 *      range atomically replaces the snapshot.
 *   4. Progress is resume state, never a window: it is not rendered, and a
 *      model with no data reads as unknown rather than slow.
 *
 * Never throws.
 */
export async function loadSpeedSamplesWithDiskCache(
  db: SpeedSampleDb,
  userId: string,
  now: number,
  cache: SpeedSampleDiskCacheOptions,
): Promise<SpeedSamplesForSelection> {
  try {
    const ttlMs = isFiniteNumber(cache.ttlMs) ? cache.ttlMs : SPEED_SAMPLE_DISK_CACHE_TTL_MS;
    const snapshot = await readSpeedSamplesSnapshot(cache.cachePath, { userId, now });
    if (snapshot && snapshot.ageMs < ttlMs) return { samples: snapshot.samples };

    const progressPath = resolveSpeedSamplesProgressPath(cache.cachePath);
    const progress = await readSpeedSamplesProgress(progressPath, userId);
    const resumable = progress && !progress.complete && progress.cursor ? progress : undefined;
    const collected = new Map<string, SpeedSample[]>(resumable?.samples ?? []);

    let step: SpeedSampleLoadResult;
    try {
      step = await collectRecentSpeedSamples(db, userId, {
        pageSize: cache.pageSize,
        budgetMs: isFiniteNumber(cache.budgetMs) ? cache.budgetMs : SPEED_SAMPLE_SCAN_BUDGET_MS,
        keepTime: true,
        ...(resumable?.cursor ? { startAfter: resumable.cursor } : {}),
      });
    } catch {
      // A failed walk must not cost the window we already have.
      return snapshot
        ? { samples: snapshot.samples, snapshotAgeMs: snapshot.ageMs }
        : { samples: new Map() };
    }

    // A walk that *finished* having read no keys learned nothing about the range
    // (empty store, wrong user, transient hiccup): it is neither a new window nor
    // progress, so it must not replace a window we were already serving. With
    // resumable progress present the empty page is a normal tail — the previous
    // step consumed the final key — so the accumulated window must be published.
    // A walk that read keys and found no usable timing is a real (if empty) result
    // and falls through to the swap. A budget-exhausted walk read nothing only
    // because it was given no budget — it still records resumable progress below.
    if (!resumable && step.scanned === 0 && !step.budgetExhausted) {
      return snapshot
        ? { samples: snapshot.samples, snapshotAgeMs: snapshot.ageMs }
        : { samples: new Map() };
    }

    mergeNewestSamples(collected, step.samples);
    if (!step.budgetExhausted) {
      // Atomic swap: concurrent readers keep seeing the previous window until it lands.
      await writeSpeedSamplesCache(cache.cachePath, {
        version: SPEED_SAMPLE_CACHE_VERSION,
        userId,
        at: now,
        complete: true,
        samples: Object.fromEntries(collected),
      });
      // Park the sidecar as "nothing to resume" (overwrites our own progress format only).
      await writeSpeedSamplesCache(progressPath, {
        version: SPEED_SAMPLE_CACHE_VERSION,
        userId,
        at: now,
        complete: true,
        samples: {},
      });
      return { samples: collected };
    }

    await writeSpeedSamplesCache(progressPath, {
      version: SPEED_SAMPLE_CACHE_VERSION,
      userId,
      // Progress keeps the cycle's collection start so a later stale label stays honest.
      at: resumable?.at ?? now,
      complete: false,
      samples: Object.fromEntries(collected),
      ...(step.nextCursor ? { cursor: step.nextCursor } : {}),
    });
    return snapshot
      ? { samples: snapshot.samples, snapshotAgeMs: snapshot.ageMs }
      : { samples: new Map() };
  } catch {
    return { samples: new Map() };
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

/** Hard cap for one background snapshot refresh: the scan is finite by
 *  construction (a single pass over the user prefix), this is the belt for a db
 *  that hangs so the job can never live forever. */
export const SPEED_SAMPLE_REFRESH_BUDGET_MS = 60_000;

/** userId → the in-flight refresh, deduped and removed the moment it settles.
 *  A burst of listAgents calls therefore starts at most one scan. */
const snapshotRefreshes = new Map<string, Promise<void>>();

/** Test hook: refreshes currently running. */
export function speedSnapshotRefreshesInFlight(): number {
  return snapshotRefreshes.size;
}

/** Await the in-flight refresh of one user (test hook / shutdown). */
export async function awaitSpeedSnapshotRefresh(userId: string): Promise<void> {
  await snapshotRefreshes.get(userId);
}

/**
 * Refresh the complete window off the interactive path. Called when the served
 * snapshot is missing or past its TTL: the caller returns immediately with what
 * it already has, and this budget-capped scan replaces the snapshot when it
 * finishes. It never surfaces partial data — an incomplete refresh writes
 * nothing and leaves the previous snapshot in place.
 */
export function startSpeedSnapshotRefresh(
  db: SpeedSampleDb,
  userId: string,
  now: number = Date.now(),
): Promise<void> {
  const inFlight = snapshotRefreshes.get(userId);
  if (inFlight) return inFlight;
  const job = (async () => {
    try {
      const { samples, budgetExhausted } = await collectRecentSpeedSamples(db, userId, {
        budgetMs: SPEED_SAMPLE_REFRESH_BUDGET_MS,
      });
      if (!budgetExhausted) writeSamplesCache(userId, now, samples);
    } catch {
      // A failed refresh leaves the previous snapshot untouched.
    }
  })().finally(() => {
    snapshotRefreshes.delete(userId);
  });
  snapshotRefreshes.set(userId, job);
  return job;
}

async function loadCachedSpeedSamples(
  db: SpeedSampleDb,
  userId: string,
  now: number,
): Promise<SpeedSamplesForSelection> {
  const hit = samplesCache.get(userId);
  if (hit) {
    const age = now - hit.at;
    if (age >= 0 && age < SPEED_SAMPLE_STALE_SNAPSHOT_MAX_MS) {
      // Past the TTL: keep serving the complete window and label its age, then
      // refresh behind the call — a full scan is 10.9s and must never sit on the
      // dispatch path again.
      if (age >= SPEED_SAMPLES_CACHE_TTL_MS) void startSpeedSnapshotRefresh(db, userId);
      return age >= SPEED_SAMPLES_CACHE_TTL_MS
        ? { samples: hit.samples, snapshotAgeMs: age }
        : { samples: hit.samples };
    }
  }
  // No complete window yet → no speed lines for this call, and start one refresh.
  void startSpeedSnapshotRefresh(db, userId);
  return { samples: new Map() };
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
 * without observed samples it injects nothing — there is no fallback source. Invalid /
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
    let snapshotAgeMs: number | undefined;
    const userId = typeof options.userId === "string" ? options.userId.trim() : "";
    if (options.db && userId) {
      try {
        const loaded = options.diskCache
          ? await loadSpeedSamplesWithDiskCache(options.db, userId, now, options.diskCache)
          : await loadCachedSpeedSamples(options.db, userId, now);
        samples = loaded.samples;
        snapshotAgeMs = loaded.snapshotAgeMs;
      } catch {
        samples = new Map();
      }
    }
    const speedContext = buildCandidateSpeedContext(models, samples, { snapshotAgeMs });
    return speedContext ? JSON.stringify({ ...parsed, speedContext }) : result;
  } catch {
    return result;
  }
}
