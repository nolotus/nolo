import type { MemoryItem, MemoryOwnerRef } from "../types";
import { createDetachedThrottle, DEFAULT_DETACHED_MEMORY_COOLDOWN_MS } from "./detachedThrottle";
import { createMemoryVNextRecall, type MemoryRecallResult } from "./recall";
import type { MemoryBenchmarkTextProvider } from "./benchmark/provider";
import { resolveLegacyMemoryPrincipal } from "./legacyMigration";

/**
 * Memory vNext Slice 5 — shadow read orchestrator.
 *
 * Runs a vNext recall alongside the production legacy recall for the same
 * query and emits a single minimal comparison observation. The shadow result
 * is observation-only: it never enters `selectedItems` / `promptBlock`, never
 * writes to any store, and a shadow failure must not change the legacy answer.
 *
 * Authority contract (Slice 5, not cutover):
 *   legacy recall = behavior authority
 *   vNext recall  = shadow observation only
 *
 * Whatever the shadow returns — more hits, zero hits, lower latency, an
 * error — the production path keeps using the legacy result.
 */

/**
 * Narrow text-completion port for the shadow selector — same shape as the
 * benchmark text provider so the server RunInfra wiring and benchmark stubs
 * both satisfy it.
 */
export type MemoryVNextShadowProvider = MemoryBenchmarkTextProvider;

/**
 * Minimum the orchestrator needs from the host. `db` is the same handle the
 * legacy path already uses; `provider` is injected by the caller (server
 * passes a RunInfra-backed completion, tests pass a stub). No default import
 * of a DB or provider — a shadow run must not pick up ambient production
 * resources on its own.
 */
export interface MemoryVNextShadowInput {
  db: any;
  /** Legacy owners for this query, already resolved by `chooseMemoryOwners`. */
  owners: MemoryOwnerRef[];
  /** Raw user query text (same string the legacy ranker sees). */
  query: string;
  provider: MemoryVNextShadowProvider;
  /** Optional per-recall timeout; forwarded to `provider.complete`. */
  timeoutMs?: number;
  /** Wall-clock bound for the whole shadow phase (all owners). */
  shadowTimeoutMs?: number;
  /** Injectable clock for tests; defaults to `performance.now`. */
  now?: () => number;
  /** Per-owner-set cooldown override, in ms (tests); `0` disables it. */
  cooldownMs?: number;
}

/**
 * Why a turn did no shadow work at all. The run acquired nothing: no DB read,
 * no provider call, no state change — `skipped_busy` means another shadow read
 * is already in flight in this process, `skipped_cooldown` means this owner set
 * already ran inside the cooldown interval.
 */
export type MemoryVNextShadowReadSkip = "skipped_busy" | "skipped_cooldown";

/**
 * Minimal Slice 5 observation. No quality/recall score, no similarity metric,
 * no LLM judge — counts, latency, sizes, and one error field.
 */
export interface MemoryShadowReadObservation {
  legacyHitCount: number;
  vnextHitCount: number;
  /** Shared-normalized-text overlap; `null` when overlap could not be computed. */
  overlapCount: number | null;
  legacyOnlyCount: number | null;
  vnextOnlyCount: number | null;
  legacyLatencyMs: number;
  vnextLatencyMs: number;
  legacyContextChars: number;
  vnextContextChars: number;
  /** Short error category/message when the shadow failed; absent on success. */
  vnextError?: string;
  /** Present only when the throttle skipped the turn; absent otherwise. */
  skipped?: MemoryVNextShadowReadSkip;
}

/**
 * Structured log payload for the shadow read, as emitted by the default sink:
 * the observation plus the `event` discriminator operators filter logs by.
 * `event` belongs to the log line — `MemoryShadowReadObservation` itself is also
 * handed to pure in-memory sinks via `emit`, which have no use for it.
 */
export type MemoryShadowReadLogPayload = MemoryShadowReadObservation & {
  event: "memory_vnext_shadow_read";
};

const SHADOW_TIMEOUT_MS = 20_000;
const ERROR_MESSAGE_MAX = 120;

/**
 * Slice 5.1 throttle. Measured on alpha: with `NOLO_MEMORY_VNEXT_SHADOW_READ`
 * on, this detached comparison ran on EVERY runtime turn at ~1–2s of DeepSeek
 * time per turn — on top of the detached lazy promotion (median ~3.1s, max
 * 13.4s) — competing with the user's in-flight request on a 1-core host.
 *
 * It uses the SAME throttle helper as the promotion but its OWN instance, gate
 * and interval: the two features have independent kill switches and different
 * costs (observation-only vs writing State), so skipping must stay attributable
 * per feature and one feature's stall must not starve the other. Cost class is
 * the same (one model call per turn), hence the same default interval, exposed
 * as a separate env key so operators can tune each independently.
 */
export const MEMORY_VNEXT_SHADOW_READ_COOLDOWN_ENV =
  "NOLO_MEMORY_VNEXT_SHADOW_READ_COOLDOWN_MS";
export const DEFAULT_SHADOW_READ_COOLDOWN_MS = DEFAULT_DETACHED_MEMORY_COOLDOWN_MS;

export const shadowReadThrottle = createDetachedThrottle({
  name: "shadow_read",
  defaultCooldownMs: DEFAULT_SHADOW_READ_COOLDOWN_MS,
  cooldownEnvKey: MEMORY_VNEXT_SHADOW_READ_COOLDOWN_ENV,
});

/** Per-owner-set cooldown; unset/garbage env → default, `0` disables it. */
export const resolveShadowReadCooldownMs = (
  env?: Record<string, string | undefined>
): number => shadowReadThrottle.resolveCooldownMs(env);

/** Test-only: throttle state is process-local module state. */
export const resetMemoryVNextShadowReadThrottleForTests = (): void =>
  shadowReadThrottle.reset();
export const isMemoryVNextShadowReadInFlightForTests = (): boolean =>
  shadowReadThrottle.isInFlight();

/**
 * Throttle key = the resolved principal set of this turn (user, and possibly
 * space/system). It is stable across turns for one user, so a user's shadow read
 * cannot be triggered more often than the interval, while a different owner set
 * is throttled independently. Sorted, so owner order can never alias two keys.
 */
const shadowReadThrottleKey = (owners: readonly MemoryOwnerRef[]): string =>
  owners
    .map((owner) =>
      resolveLegacyMemoryPrincipal({
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
      }).principalId
    )
    .sort()
    .join("\u0001");

/** Collapse whitespace, trim, lowercase — a deliberately simple shared key. */
const normalizeTextKey = (text: string): string =>
  text.trim().replace(/\s+/g, " ").toLowerCase();

const legacyItemKeys = (item: MemoryItem): string[] => {
  const keys = [normalizeTextKey(item.content ?? "")];
  return keys.filter((key) => key.length > 0);
};

const vnextResultKeys = (result: MemoryRecallResult): string[] => {
  const keys: string[] = [];
  for (const entity of result.entities) {
    if (entity.name) keys.push(normalizeTextKey(entity.name));
  }
  for (const state of result.states) {
    if (state.text) keys.push(normalizeTextKey(state.text));
  }
  return keys.filter((key) => key.length > 0);
};

const vnextContextChars = (result: MemoryRecallResult): number =>
  result.entities.reduce(
    (sum, entity) => sum + (entity.name?.length ?? 0),
    result.states.reduce((sum, state) => sum + (state.text?.length ?? 0), 0),
  );

const shortError = (error: unknown): string => {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return message.length > ERROR_MESSAGE_MAX
    ? `${message.slice(0, ERROR_MESSAGE_MAX)}…`
    : message;
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Run the vNext shadow recall for every owner and emit one observation.
 *
 * This function never throws: every failure mode (provider down, catalog
 * error, timeout, malformed selector output) collapses into `vnextError` so
 * the caller can log it without affecting the legacy answer path.
 */
export const runMemoryVNextShadowRead = async (input: {
  ctx: MemoryVNextShadowInput;
  legacyItems: MemoryItem[];
  legacyLatencyMs: number;
  legacyContextChars: number;
  /** Sink for the structured observation; defaults to console.info. */
  emit?: (observation: MemoryShadowReadObservation) => void;
}): Promise<MemoryShadowReadObservation> => {
  const now = input.ctx.now ?? (() => performance.now());
  const defaultEmit = (observation: MemoryShadowReadObservation): void => {
    const payload: MemoryShadowReadLogPayload = {
      event: "memory_vnext_shadow_read",
      ...observation,
    };
    console.info("[memory] vnext shadow read", payload);
  };
  const emit = input.emit ?? defaultEmit;

  // Same class of bound as the detached lazy promotion (shared helper):
  // process-wide single-flight + per-owner-set cooldown. Both skips return
  // before any DB read or provider call, so a throttled turn costs nothing.
  const throttle = shadowReadThrottle.tryAcquire(
    shadowReadThrottleKey(input.ctx.owners),
    now(),
    input.ctx.cooldownMs ?? resolveShadowReadCooldownMs()
  );
  if (throttle !== "run") {
    // `null` overlap counts mean "not computed", exactly as on the error path.
    const skippedObservation: MemoryShadowReadObservation = {
      legacyHitCount: input.legacyItems.length,
      vnextHitCount: 0,
      overlapCount: null,
      legacyOnlyCount: null,
      vnextOnlyCount: null,
      legacyLatencyMs: input.legacyLatencyMs,
      vnextLatencyMs: 0,
      legacyContextChars: input.legacyContextChars,
      vnextContextChars: 0,
      skipped: throttle === "busy" ? "skipped_busy" : "skipped_cooldown",
    };
    emit(skippedObservation);
    return skippedObservation;
  }

  const legacyKeys = new Set(
    input.legacyItems.flatMap((item) => legacyItemKeys(item)),
  );

  const vnextStartedAt = now();
  let vnextHitCount = 0;
  let vnextChars = 0;
  const vnextKeys = new Set<string>();
  let vnextError: string | undefined;

  try {
    const shadowTimeoutMs = input.ctx.shadowTimeoutMs ?? SHADOW_TIMEOUT_MS;
    const perOwner = async (owner: MemoryOwnerRef) => {
      const principal = resolveLegacyMemoryPrincipal({
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
      });
      const recall = createMemoryVNextRecall({
        db: input.ctx.db,
        ownerId: principal.principalId,
        provider: input.ctx.provider,
        timeoutMs: input.ctx.timeoutMs,
      });
      return recall(input.ctx.query);
    };

    const results = await withTimeout(
      Promise.all(input.ctx.owners.map((owner) => perOwner(owner))),
      shadowTimeoutMs,
      `memory vnext shadow read timed out after ${shadowTimeoutMs}ms`,
    );

    for (const result of results) {
      vnextHitCount += result.refs.length;
      vnextChars += vnextContextChars(result);
      for (const key of vnextResultKeys(result)) vnextKeys.add(key);
    }
  } catch (error) {
    vnextError = shortError(error);
  }

  // The gate is released once the shadow work is over. The recall phase above
  // cannot throw (its failures collapse into `vnextError`), so protecting this
  // tail — which includes the caller-supplied `emit` sink — is enough to make
  // sure a throwing sink can never pin the process-wide gate.
  try {
    const vnextLatencyMs = Math.round((now() - vnextStartedAt) * 10) / 10;

    let overlapCount: number | null = null;
    let legacyOnlyCount: number | null = null;
    let vnextOnlyCount: number | null = null;
    if (!vnextError) {
      let overlap = 0;
      for (const key of vnextKeys) if (legacyKeys.has(key)) overlap += 1;
      overlapCount = overlap;
      legacyOnlyCount = Math.max(0, legacyKeys.size - overlap);
      vnextOnlyCount = Math.max(0, vnextKeys.size - overlap);
    }

    const observation: MemoryShadowReadObservation = {
      legacyHitCount: input.legacyItems.length,
      vnextHitCount,
      overlapCount,
      legacyOnlyCount,
      vnextOnlyCount,
      legacyLatencyMs: input.legacyLatencyMs,
      vnextLatencyMs,
      legacyContextChars: input.legacyContextChars,
      vnextContextChars: vnextChars,
      ...(vnextError ? { vnextError } : {}),
    };
    emit(observation);
    return observation;
  } finally {
    shadowReadThrottle.release();
  }
};

/**
 * Feature gate. Shadow read is opt-in: the flag must be explicitly enabled
 * AND a provider must be supplied — both layers are required so an accidental
 * provider injection alone can never start shadow LLM calls.
 */
export const isMemoryVNextShadowReadEnabled = (
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {},
): boolean =>
  env.NOLO_MEMORY_VNEXT_SHADOW_READ === "1" ||
  env.NOLO_MEMORY_VNEXT_SHADOW_READ === "true";
