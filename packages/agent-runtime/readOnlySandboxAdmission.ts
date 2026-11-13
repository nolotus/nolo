// packages/agent-runtime/readOnlySandboxAdmission.ts
//
// Aggregate admission control for the minimal read-only web sandbox (fix H2).
//
// WHY THIS FILE EXISTS — the honest version of the limit story:
//
//   `readOnlySandboxLimits.ts` hands the kernel per-PROCESS limits
//   (RLIMIT_AS / CPU / NPROC / NOFILE). Those bound ONE sandboxed payload.
//   They are NOT an aggregate bound: N concurrent runs each get their own
//   256 MiB address space, so 50 authenticated requests are 50 x 256 MiB of
//   potential host memory. A per-process rlimit cannot answer "how much may
//   this host spend in total", because the kernel applies it per process.
//
//   Therefore the aggregate ceiling is enforced HERE, in the server process,
//   before any spawn: a global in-flight cap, a per-user in-flight cap, and a
//   per-user token bucket. All three are process-wide and therefore shared by
//   every request handler in this process.
//
// DESIGN CHOICES (each one is a fail-closed decision, not a convenience):
//
//   - Reject, never queue. An unbounded wait queue is itself a denial-of-
//     service vector: the attacker fills the queue and every other user waits.
//     A rejected request gets an immediate, stable answer (429 + Retry-After).
//   - Decide synchronously. A gate that awaits can be bypassed by flooding the
//     await; `tryAcquire` does no I/O and no awaiting.
//   - Charge the token AFTER the concurrency checks, so a concurrency rejection
//     does not burn a user's rate budget.
//   - Idle bookkeeping is swept so a long-lived process cannot accumulate one
//     map entry per user id ever seen.
//
// This module is pure: no fs, no spawn, no env, injectable clock.

/**
 * Defaults. Chosen so the worst case is bounded and small:
 *   maxConcurrentGlobal 4 x memoryBytes 256 MiB = 1 GiB of address space
 * (not resident memory, but the ceiling the kernel will enforce per process).
 *
 * Operators may tighten these per deployment; `ReadOnlySandboxAdmission`
 * refuses values that are not positive integers rather than defaulting.
 */
export const READ_ONLY_SANDBOX_ADMISSION = Object.freeze({
  /** Total sandboxed runs allowed in flight in this process. */
  maxConcurrentGlobal: 4,
  /** Runs in flight for a single user. 1 = a user never races themselves. */
  maxConcurrentPerUser: 1,
  /** Token bucket capacity: how many requests a user may burst. */
  burstPerUser: 10,
  /** Token refill rate, per minute, per user. */
  refillPerMinutePerUser: 30,
  /** Upper bound on tracked users before idle entries are swept. */
  maxTrackedUsers: 4_096,
} as const);

export type ReadOnlySandboxAdmissionLimits = {
  maxConcurrentGlobal: number;
  maxConcurrentPerUser: number;
  burstPerUser: number;
  refillPerMinutePerUser: number;
  maxTrackedUsers: number;
};

export type ReadOnlySandboxAdmissionRejection =
  | "global_concurrency"
  | "user_concurrency"
  | "user_rate";

export type ReadOnlySandboxAdmissionDecision =
  | { ok: true; release: () => void }
  | { ok: false; reason: ReadOnlySandboxAdmissionRejection; retryAfterMs: number };

type UserState = {
  inFlight: number;
  /** Fractional tokens, so a slow refill is not rounded away every call. */
  tokens: number;
  /** Last time `tokens` was brought up to date. */
  updatedAt: number;
};

const positiveInt = (value: unknown, name: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Sandbox admission limit ${name} must be a positive integer (got ${String(value)})`);
  }
  return value;
};

export function resolveAdmissionLimits(
  overrides: Partial<ReadOnlySandboxAdmissionLimits> = {},
): ReadOnlySandboxAdmissionLimits {
  const resolved: ReadOnlySandboxAdmissionLimits = { ...READ_ONLY_SANDBOX_ADMISSION };
  for (const key of Object.keys(overrides) as Array<keyof ReadOnlySandboxAdmissionLimits>) {
    const raw = overrides[key];
    if (raw === undefined) continue;
    if (!(key in READ_ONLY_SANDBOX_ADMISSION)) {
      throw new Error(`Unknown sandbox admission limit: ${String(key)}`);
    }
    resolved[key] = positiveInt(raw, String(key));
  }
  return resolved;
}

/**
 * Process-wide admission gate. One instance per process: creating one per
 * request would make every counter read "1 in flight" and enforce nothing.
 */
export class ReadOnlySandboxAdmission {
  private readonly limits: ReadOnlySandboxAdmissionLimits;
  private readonly now: () => number;
  private readonly users = new Map<string, UserState>();
  private globalInFlight = 0;

  constructor(
    limits: Partial<ReadOnlySandboxAdmissionLimits> = {},
    now: () => number = Date.now,
  ) {
    this.limits = resolveAdmissionLimits(limits);
    this.now = now;
  }

  /**
   * Reserve one run slot for `userId`. Synchronous and non-awaiting by design.
   *
   * The returned `release` is idempotent: the executor may finish through
   * several paths (success, timeout, throw) and a double release would silently
   * inflate the ceiling.
   */
  tryAcquire(userId: string): ReadOnlySandboxAdmissionDecision {
    if (typeof userId !== "string" || !userId.length) {
      // A gate that cannot name the principal cannot bound it per principal.
      throw new Error("Sandbox admission requires a non-empty userId");
    }
    const at = this.now();

    if (this.globalInFlight >= this.limits.maxConcurrentGlobal) {
      // No per-user knowledge required: the host is busy, retry later.
      return { ok: false, reason: "global_concurrency", retryAfterMs: 1_000 };
    }

    const state = this.stateFor(userId, at);
    if (state.inFlight >= this.limits.maxConcurrentPerUser) {
      return { ok: false, reason: "user_concurrency", retryAfterMs: 1_000 };
    }

    this.refill(state, at);
    if (state.tokens < 1) {
      const perMs = this.limits.refillPerMinutePerUser / 60_000;
      const retryAfterMs = Math.max(1, Math.ceil((1 - state.tokens) / perMs));
      return { ok: false, reason: "user_rate", retryAfterMs };
    }
    state.tokens -= 1;

    state.inFlight += 1;
    this.globalInFlight += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      state.inFlight -= 1;
      this.globalInFlight -= 1;
      // Keep the (now idle) token state: dropping it would hand the user a full
      // burst again on their next request. The sweep below bounds map growth.
      if (this.users.size > this.limits.maxTrackedUsers) this.sweep(at);
    };
    return { ok: true, release };
  }

  /** Observability for ops and tests. Cheap, allocation-light. */
  snapshot(): { globalInFlight: number; trackedUsers: number; usersInFlight: Array<{ userId: string; inFlight: number }> } {
    const usersInFlight: Array<{ userId: string; inFlight: number }> = [];
    for (const [userId, state] of this.users) {
      if (state.inFlight > 0) usersInFlight.push({ userId, inFlight: state.inFlight });
    }
    return { globalInFlight: this.globalInFlight, trackedUsers: this.users.size, usersInFlight };
  }

  private stateFor(userId: string, at: number): UserState {
    let state = this.users.get(userId);
    if (!state) {
      state = { inFlight: 0, tokens: this.limits.burstPerUser, updatedAt: at };
      this.users.set(userId, state);
    }
    return state;
  }

  private refill(state: UserState, at: number): void {
    const elapsed = Math.max(0, at - state.updatedAt);
    state.updatedAt = at;
    if (elapsed === 0) return;
    const gained = (elapsed * this.limits.refillPerMinutePerUser) / 60_000;
    state.tokens = Math.min(this.limits.burstPerUser, state.tokens + gained);
  }

  /**
   * Drop idle users whose bucket is already full (they carry no information).
   * Only reached when the map outgrows `maxTrackedUsers`, so the common path
   * pays nothing.
   */
  private sweep(at: number): void {
    for (const [userId, state] of this.users) {
      if (state.inFlight > 0) continue;
      this.refill(state, at);
      if (state.tokens >= this.limits.burstPerUser) this.users.delete(userId);
      if (this.users.size <= this.limits.maxTrackedUsers) break;
    }
  }
}
