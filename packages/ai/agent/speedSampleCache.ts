// ai/agent/speedSampleCache.ts
//
// On-disk cache + scan budget for the observed-speed token scan, for short-lived
// callers. The CLI is the motivating case: every `nolo agent list` is a fresh
// process, so the module-level cache in candidateSpeedContext.ts never survives
// a call, and a cold scan over a broker-backed db is the only way to get
// observed samples (measured: ~4.3s for 98k records in 2000-key pages).
//
// Contract: every function here is best-effort and silent. A missing / stale /
// malformed / unreadable cache is a miss (never an error), and a write failure
// is ignored — the caller must be able to fall back to AA-only data without the
// listAgents result ever failing.
//
// No top-level `node:fs` import: this module sits in the ai package, which is
// also bundled for the browser; the Node built-ins are pulled in lazily on the
// only code paths that actually touch the filesystem.

import type { SpeedSample } from "./candidateSpeedContext";

/** Short-lived-process cache TTL for the observed samples (CLI: disk). */
export const SPEED_SAMPLE_DISK_CACHE_TTL_MS = 10 * 60_000;
/**
 * Wall-clock budget for one cold scan. The scan runs synchronously inside a
 * listAgents call, so this is dispatch latency, not a background job: it is kept
 * well below the measured full-scan time (10.9s for this user's records). When the
 * budget runs out the scan only records `.progress` sidecar progress
 * (`loadSpeedSamplesWithDiskCache`) and does not render it as window output;
 * samples already read are still returned rather than discarded. Discarding them
 * was the actual outage: the scan always overran this budget, so no listAgents
 * result ever carried speed data.
 */
export const SPEED_SAMPLE_SCAN_BUDGET_MS = 2_500;
/** Current layout version. 2 adds the incremental `cursor` / `complete` pair;
 *  version 1 files were only ever written by a completed scan, so they still
 *  read as complete windows. Other versions are ignored.
 *  Bump when the file layout below changes. */
export const SPEED_SAMPLE_CACHE_VERSION = 2;
/** Legacy complete-window-only layout (no cursor). */
export const SPEED_SAMPLE_LEGACY_CACHE_VERSION = 1;

/** Disk cache + budget wiring for the CLI (`injectSpeedContextIntoListAgentsResult`). */
export type SpeedSampleDiskCacheOptions = {
  /** Absolute path of the JSON cache file, e.g. `<NOLO_HOME>/cache/speed-samples-<userId>.json`. */
  cachePath: string;
  /** Cache TTL in ms (default SPEED_SAMPLE_DISK_CACHE_TTL_MS). */
  ttlMs?: number;
  /** Cold-scan budget in ms (default SPEED_SAMPLE_SCAN_BUDGET_MS). */
  budgetMs?: number;
  /** Keys per iterator page (default SPEED_SAMPLE_PAGE_SIZE). */
  pageSize?: number;
};

export type SpeedSampleCacheFile = {
  version: number;
  userId: string;
  /** Write time (ms epoch); freshness is judged against this, not the file mtime. */
  at: number;
  /** normalized model name → samples, newest first. */
  samples: Record<string, SpeedSample[]>;
  /** Resume key of the incremental walk: the scan continues strictly after this
   *  token key. Absent (v1 files, or a finished walk) means "start at the head". */
  cursor?: string;
  /** True only when the walk read the whole user key range. An incomplete file is
   *  resumable progress, never a window: it is not rendered. Absent = legacy v1
   *  file, which was only written on completion. */
  complete?: boolean;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** One accumulated sample. `t` is the record timestamp and is only used to merge
 *  incremental segments into the newest window; the resolver never sees it. */
export type TimedSpeedSample = SpeedSample & { t?: number };

const sanitizeSample = (value: unknown): TimedSpeedSample | null => {
  if (!value || typeof value !== "object") return null;
  const sample = value as Record<string, unknown>;
  const clean: TimedSpeedSample = {};
  if (isFiniteNumber(sample.firstOutputMs)) clean.firstOutputMs = sample.firstOutputMs;
  if (isFiniteNumber(sample.callDurationMs)) clean.callDurationMs = sample.callDurationMs;
  if (isFiniteNumber(sample.output_tokens)) clean.output_tokens = sample.output_tokens;
  if (isFiniteNumber(sample.t)) clean.t = sample.t;
  return clean.firstOutputMs === undefined && clean.callDurationMs === undefined ? null : clean;
};

/**
 * How old an otherwise valid *complete* snapshot may be and still be served
 * (labelled with its age). A complete window collected 3 days ago is still real
 * measured data for this user; a partial scan is not, and is never served.
 */
export const SPEED_SAMPLE_STALE_SNAPSHOT_MAX_MS = 7 * 24 * 60 * 60_000;

type ParsedCacheFile = {
  samples: Map<string, TimedSpeedSample[]>;
  at: number;
  /** True only for a finished walk (or a legacy v1 file, which was always complete). */
  complete: boolean;
  /** Resume key for an unfinished walk; undefined once complete. */
  cursor?: string;
};

/** Parse one cache file body. No age policy — callers decide freshness. */
async function parseCacheFile(
  cachePath: string,
  userId: string,
): Promise<ParsedCacheFile | null> {
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SpeedSampleCacheFile> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const version = parsed.version;
    if (version !== SPEED_SAMPLE_CACHE_VERSION && version !== SPEED_SAMPLE_LEGACY_CACHE_VERSION) {
      return null;
    }
    if (parsed.userId !== userId) return null;
    if (!isFiniteNumber(parsed.at)) return null;
    const source = parsed.samples;
    if (!source || typeof source !== "object") return null;
    const samples = new Map<string, TimedSpeedSample[]>();
    for (const [model, list] of Object.entries(source)) {
      if (!model || !Array.isArray(list)) continue;
      const cleaned: TimedSpeedSample[] = [];
      for (const entry of list) {
        const sample = sanitizeSample(entry);
        if (sample) cleaned.push(sample);
      }
      samples.set(model, cleaned);
    }
    const complete =
      version === SPEED_SAMPLE_LEGACY_CACHE_VERSION ? true : parsed.complete === true;
    const cursor =
      typeof parsed.cursor === "string" && parsed.cursor.length > 0 ? parsed.cursor : undefined;
    return { samples, at: parsed.at, complete, cursor: complete ? undefined : cursor };
  } catch {
    return null;
  }
}

/**
 * Read a fresh *complete* cache entry for this user. `null` on any miss (absent,
 * stale, future-dated, other user, other version, unfinished walk, unparsable,
 * unreadable).
 */
export async function readSpeedSamplesCache(
  cachePath: string,
  options: { userId: string; now: number; ttlMs?: number },
): Promise<Map<string, SpeedSample[]> | null> {
  const ttlMs = isFiniteNumber(options.ttlMs) ? options.ttlMs : SPEED_SAMPLE_DISK_CACHE_TTL_MS;
  const parsed = await parseCacheFile(cachePath, options.userId);
  if (!parsed || !parsed.complete) return null;
  const age = options.now - parsed.at;
  // Negative age = the clock moved backwards since the write → treat as stale.
  if (age < 0 || age >= ttlMs) return null;
  return parsed.samples;
}

/**
 * Read a *complete* snapshot of any age up to `maxAgeMs`, with its age so the
 * caller can label it. An unfinished incremental walk never qualifies: it is
 * resumable progress, not a window.
 */
export async function readSpeedSamplesSnapshot(
  cachePath: string,
  options: { userId: string; now: number; maxAgeMs?: number },
): Promise<{ samples: Map<string, SpeedSample[]>; ageMs: number } | null> {
  const maxAgeMs = isFiniteNumber(options.maxAgeMs)
    ? options.maxAgeMs
    : SPEED_SAMPLE_STALE_SNAPSHOT_MAX_MS;
  const parsed = await parseCacheFile(cachePath, options.userId);
  if (!parsed || !parsed.complete) return null;
  const age = options.now - parsed.at;
  if (age < 0 || age >= maxAgeMs) return null;
  return { samples: parsed.samples, ageMs: age };
}

/**
 * Read whatever the cache file holds, complete or not, to resume an incremental
 * walk. No age policy: progress does not go bad, it just stops advancing.
 */
export async function readSpeedSamplesProgress(
  cachePath: string,
  userId: string,
): Promise<{
  samples: Map<string, SpeedSample[]>;
  at: number;
  complete: boolean;
  cursor?: string;
} | null> {
  const parsed = await parseCacheFile(cachePath, userId);
  if (!parsed) return null;
  return {
    samples: parsed.samples,
    at: parsed.at,
    complete: parsed.complete,
    ...(parsed.cursor === undefined ? {} : { cursor: parsed.cursor }),
  };
}

/** Sidecar holding the incremental walk's progress, kept beside (not on top of)
 *  the snapshot so a completed window stays servable while the next walk runs. */
export function resolveSpeedSamplesProgressPath(cachePath: string): string {
  return `${cachePath}.progress`;
}

/**
 * Best-effort *atomic* write: the payload goes to a sibling temp file and is
 * renamed over the target, so a concurrent reader sees either the previous file
 * or the new one — never a half-written body. Any failure is swallowed.
 */
export async function writeSpeedSamplesCache(
  cachePath: string,
  payload: SpeedSampleCacheFile,
): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    const tmpPath = `${cachePath}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
    await fs.writeFile(tmpPath, JSON.stringify(payload), "utf8");
    await fs.rename(tmpPath, cachePath);
  } catch {
    // Cache writes are an optimization only; a leftover temp file is harmless.
  }
}
