/**
 * Shared throttle for detached (backgrounded) memory work.
 *
 * Slice 5.1/6.3 context: two model-calling features run detached from the
 * legacy answer path — the vNext shadow read (Slice 5) and the vNext lazy
 * promotion (Slice 6). Both were fired on EVERY runtime turn, and on alpha the
 * promotion's Interpreter alone measured 2.5s–13.4s (`latencyMs` in production
 * logs) while the shadow read added a ~1–2s DeepSeek round-trip per turn. On a
 * 1-core host that background work competes with the user's in-flight request
 * (the same request measured 10.6s → 27.1s across runs).
 *
 * Both features therefore use this one helper, each with its own instance:
 *   - process-wide single-flight: at most one run of that feature at a time;
 *   - per-key (per-owner / per-owner-set) minimum interval (cooldown).
 *
 * The two instances are deliberately independent (own gate, own cooldown map,
 * own env override): the features have independent kill switches and different
 * costs (the shadow read is observation-only; the promotion writes State), so a
 * single shared gate would make a skip indistinguishable between them and
 * would let one feature's stall silently starve the other. The trade-off is
 * recorded in the handoff: with both enabled, total background model
 * concurrency can still be 2 (each one single-flight and rate-limited).
 *
 * Nothing here is durable truth: all state is process-local and disposable.
 */

export type DetachedThrottleDecision = "run" | "busy" | "cooldown";

export interface DetachedThrottle {
  readonly name: string;
  readonly defaultCooldownMs: number;
  readonly cooldownEnvKey: string;
  /** Reads the cooldown from env; unset/blank/garbage → the default. */
  resolveCooldownMs(env?: Record<string, string | undefined>): number;
  /**
   * `busy` → another run of this feature is in flight; `cooldown` → this key
   * ran less than one interval ago; `run` → acquired (caller MUST `release()`).
   */
  tryAcquire(key: string, clockMs: number, cooldownMs?: number): DetachedThrottleDecision;
  release(): void;
  /** Test-only observability. */
  isInFlight(): boolean;
  /** Test-only: process-local state outlives a test file's DB resets. */
  reset(): void;
}

/** Shared default interval for detached memory work: 10 minutes per key. */
export const DEFAULT_DETACHED_MEMORY_COOLDOWN_MS = 10 * 60 * 1000;

const MAX_COOLDOWN_KEYS = 512;

/** Unset/blank/negative/garbage → fallback so a typo can never disable a bound. */
export const readMsEnv = (
  raw: string | undefined,
  fallback: number,
  allowZero: boolean
): number => {
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  if (parsed === 0 && !allowZero) return fallback;
  return parsed;
};

export const createDetachedThrottle = (input: {
  name: string;
  defaultCooldownMs: number;
  cooldownEnvKey: string;
}): DetachedThrottle => {
  let inFlight = false;
  /** key → `clockMs` at that key's last run start. */
  const lastStartedAt = new Map<string, number>();

  const resolveCooldownMs = (
    env: Record<string, string | undefined> = typeof process !== "undefined"
      ? process.env
      : {}
  ): number => readMsEnv(env[input.cooldownEnvKey], input.defaultCooldownMs, true);

  const rememberStart = (key: string, clockMs: number): void => {
    lastStartedAt.delete(key); // re-insert so a refreshed key is youngest
    lastStartedAt.set(key, clockMs);
    while (lastStartedAt.size > MAX_COOLDOWN_KEYS) {
      lastStartedAt.delete(lastStartedAt.keys().next().value!);
    }
  };

  return {
    name: input.name,
    defaultCooldownMs: input.defaultCooldownMs,
    cooldownEnvKey: input.cooldownEnvKey,
    resolveCooldownMs,
    tryAcquire(key, clockMs, cooldownMs) {
      if (inFlight) return "busy";
      const interval = cooldownMs ?? resolveCooldownMs();
      const lastStarted = lastStartedAt.get(key);
      if (interval > 0 && lastStarted !== undefined && clockMs - lastStarted < interval) {
        return "cooldown";
      }
      inFlight = true;
      rememberStart(key, clockMs);
      return "run";
    },
    release() {
      inFlight = false;
    },
    isInFlight: () => inFlight,
    reset() {
      inFlight = false;
      lastStartedAt.clear();
    },
  };
};
