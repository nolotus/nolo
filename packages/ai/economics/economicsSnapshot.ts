/**
 * Pure economics snapshot resolver (Phase 2A).
 *
 * `resolveEconomicsSnapshot(input, at)` maps a raw agent source + an instant
 * onto the versioned policy that is effective at that instant, and returns the
 * peak/off-peak period, the price/quota multiplier and the next period boundary.
 *
 * Purity contract: no clock reads, no I/O, no ambient state — `at` is always a
 * parameter, policies are injectable, and the same inputs always produce the
 * same snapshot. Timezone math uses Intl (no external deps); DST-correct via a
 * two-pass wall-clock → epoch conversion (Shanghai/UTC have no DST but the
 * helper must not silently break if a future policy adds a DST zone).
 */

import {
  ECONOMICS_POLICIES,
  resolveEconomicsSourceId,
  type EconomicsPeriod,
  type EconomicsPolicy,
  type EconomicsSourceId,
  type EconomicsSourceInput,
} from "./economicsPolicy";

export interface AgentEconomicsSnapshot {
  source: EconomicsSourceId;
  /** Version of the policy that produced this snapshot (traceability). */
  policyVersion: string;
  period: EconomicsPeriod;
  /** Monetary price multiplier, when this source has a documented price rule. */
  priceMultiplier?: number;
  /** Subscription quota burn multiplier, when this source has a documented quota rule. */
  quotaMultiplier?: number;
  /** Next economics boundary as an absolute epoch timestamp. */
  changesAt?: number;
}

interface ZonedWallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0=Sunday … 6=Saturday, in the target timezone. */
  weekday: number;
  minutesOfDay: number;
}

const wallClockFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getWallClockFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = wallClockFormatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    wallClockFormatterCache.set(timezone, formatter);
  }
  return formatter;
}

export function getZonedWallClock(timezone: string, at: number): ZonedWallClock {
  const parts = getWallClockFormatter(timezone).formatToParts(new Date(at));
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  const year = values.year;
  const month = values.month;
  const day = values.day;
  const hour = values.hour;
  const minute = values.minute;
  const second = values.second;
  // Weekday comes from the wall-clock date via pure UTC arithmetic — exact for
  // any timezone, no offset math involved.
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, hour, minute, second, weekday, minutesOfDay: hour * 60 + minute };
}

/** Offset (local wall-clock minus UTC) in ms at the given instant. */
function getTimeZoneOffsetMs(timezone: string, at: number): number {
  const atSecond = Math.floor(at / 1000) * 1000;
  const clock = getZonedWallClock(timezone, atSecond);
  return Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second) - atSecond;
}

/** Wall-clock time in `timezone` → UTC epoch ms (two-pass, DST-safe). */
export function zonedWallClockToEpochMs(
  timezone: string,
  year: number,
  month: number,
  day: number,
  minutesOfDay: number
): number {
  const guess = Date.UTC(year, month - 1, day, Math.floor(minutesOfDay / 60), minutesOfDay % 60);
  let instant = guess - getTimeZoneOffsetMs(timezone, guess);
  instant = guess - getTimeZoneOffsetMs(timezone, instant);
  return instant;
}

/**
 * Phase at instant `at`. Windows are half-open [startMinute, endMinute) in the
 * window's own timezone; a window only applies on its weekdays. Windows never
 * wrap midnight (startMinute < endMinute), so "outside every window" is
 * off-peak even right after midnight or on weekend days.
 */
export function resolveEconomicsPeriod(
  policy: EconomicsPolicy,
  at: number
): EconomicsPeriod {
  for (const window of policy.windows) {
    const clock = getZonedWallClock(window.timezone, at);
    if (!window.weekdays.includes(clock.weekday)) continue;
    if (clock.minutesOfDay >= window.startMinute && clock.minutesOfDay < window.endMinute) {
      return "peak";
    }
  }
  return "off_peak";
}

/**
 * Nearest window boundary (start or end) strictly after `at`, scanned over the
 * next 8 local days per window (covers any weekly weekday combination).
 */
export function findNextEconomicsBoundary(
  policy: EconomicsPolicy,
  at: number
): number | undefined {
  let best: number | undefined;
  for (const window of policy.windows) {
    const anchor = getZonedWallClock(window.timezone, at);
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const dayUtc = new Date(Date.UTC(anchor.year, anchor.month - 1, anchor.day + dayOffset));
      const weekday = dayUtc.getUTCDay();
      if (!window.weekdays.includes(weekday)) continue;
      const year = dayUtc.getUTCFullYear();
      const month = dayUtc.getUTCMonth() + 1;
      const day = dayUtc.getUTCDate();
      for (const edge of [window.startMinute, window.endMinute]) {
        const instant = zonedWallClockToEpochMs(window.timezone, year, month, day, edge);
        if (instant > at && (best === undefined || instant < best)) best = instant;
      }
    }
  }
  return best;
}

/**
 * Pick the policy version for `sourceId` that is effective at `at`:
 * effectiveFrom (inclusive) <= at < effectiveUntil (exclusive). The latest
 * effective version wins. Returns null when no version applies (neutral).
 */
export function selectEconomicsPolicyVersion(
  policies: readonly EconomicsPolicy[],
  sourceId: EconomicsSourceId,
  at: number
): EconomicsPolicy | null {
  const applicable = policies.filter(
    (policy) =>
      policy.id === sourceId &&
      (policy.effectiveFrom === undefined || policy.effectiveFrom <= at) &&
      (policy.effectiveUntil === undefined || at < policy.effectiveUntil)
  );
  if (applicable.length === 0) return null;
  return applicable.reduce((latest, candidate) =>
    (candidate.effectiveFrom ?? -Infinity) >= (latest.effectiveFrom ?? -Infinity)
      ? candidate
      : latest
  );
}

function findNextPolicyBoundary(
  policy: EconomicsPolicy,
  at: number,
  policies: readonly EconomicsPolicy[]
): number | undefined {
  const boundaries = [
    policy.effectiveUntil,
    ...policies
      .filter((candidate) => candidate.id === policy.id)
      .map((candidate) => candidate.effectiveFrom)
      .filter((value): value is number => value !== undefined && value > at),
  ].filter((value): value is number => value !== undefined && value > at);
  return boundaries.length > 0 ? Math.min(...boundaries) : undefined;
}

export function resolveEconomicsSnapshot(
  input: EconomicsSourceInput,
  at: number,
  policies: readonly EconomicsPolicy[] = ECONOMICS_POLICIES
): AgentEconomicsSnapshot | null {
  const sourceId = resolveEconomicsSourceId(input);
  if (!sourceId) return null;
  const policy = selectEconomicsPolicyVersion(policies, sourceId, at);
  if (!policy) return null;
  const period = resolveEconomicsPeriod(policy, at);
  const priceMultiplier =
    period === "peak" ? policy.peakPriceMultiplier : policy.offPeakPriceMultiplier;
  const quotaMultiplier =
    period === "peak" ? policy.peakQuotaMultiplier : policy.offPeakQuotaMultiplier;
  const windowBoundary = findNextEconomicsBoundary(policy, at);
  const policyBoundary = findNextPolicyBoundary(policy, at, policies);
  const changesAt = [windowBoundary, policyBoundary]
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b)[0];
  return {
    source: sourceId,
    policyVersion: policy.version,
    period,
    ...(priceMultiplier !== undefined ? { priceMultiplier } : {}),
    ...(quotaMultiplier !== undefined ? { quotaMultiplier } : {}),
    ...(changesAt !== undefined ? { changesAt } : {}),
  };
}
