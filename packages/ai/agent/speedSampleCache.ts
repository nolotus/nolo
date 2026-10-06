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
 * Wall-clock budget for one cold scan. Past this the scan is abandoned and the
 * caller must treat the result as "no observed data" (partial samples are an
 * arbitrary key-ordered subset, not the newest records, so they are not a
 * trustworthy basis for a median).
 */
export const SPEED_SAMPLE_SCAN_BUDGET_MS = 8_000;
/** Bump when the file layout below changes; other versions are ignored. */
export const SPEED_SAMPLE_CACHE_VERSION = 1;

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
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const sanitizeSample = (value: unknown): SpeedSample | null => {
  if (!value || typeof value !== "object") return null;
  const sample = value as Record<string, unknown>;
  const clean: SpeedSample = {};
  if (isFiniteNumber(sample.firstOutputMs)) clean.firstOutputMs = sample.firstOutputMs;
  if (isFiniteNumber(sample.callDurationMs)) clean.callDurationMs = sample.callDurationMs;
  if (isFiniteNumber(sample.output_tokens)) clean.output_tokens = sample.output_tokens;
  return clean.firstOutputMs === undefined && clean.callDurationMs === undefined ? null : clean;
};

/**
 * Read a fresh cache entry for this user. `null` on any miss (absent, stale,
 * future-dated, other user, other version, unparsable, unreadable).
 */
export async function readSpeedSamplesCache(
  cachePath: string,
  options: { userId: string; now: number; ttlMs?: number },
): Promise<Map<string, SpeedSample[]> | null> {
  const ttlMs = isFiniteNumber(options.ttlMs) ? options.ttlMs : SPEED_SAMPLE_DISK_CACHE_TTL_MS;
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SpeedSampleCacheFile> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== SPEED_SAMPLE_CACHE_VERSION) return null;
    if (parsed.userId !== options.userId) return null;
    if (!isFiniteNumber(parsed.at)) return null;
    const age = options.now - parsed.at;
    // Negative age = the clock moved backwards since the write → treat as stale.
    if (age < 0 || age >= ttlMs) return null;
    const samples = new Map<string, SpeedSample[]>();
    const source = parsed.samples;
    if (!source || typeof source !== "object") return null;
    for (const [model, list] of Object.entries(source)) {
      if (!model || !Array.isArray(list)) continue;
      const cleaned: SpeedSample[] = [];
      for (const entry of list) {
        const sample = sanitizeSample(entry);
        if (sample) cleaned.push(sample);
      }
      samples.set(model, cleaned);
    }
    return samples;
  } catch {
    return null;
  }
}

/** Best-effort write; any failure (read-only home, no space, ...) is swallowed. */
export async function writeSpeedSamplesCache(
  cachePath: string,
  payload: SpeedSampleCacheFile,
): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(payload), "utf8");
  } catch {
    // Cache writes are an optimization only.
  }
}
