import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { HostTaskReference } from "./hostTaskEvents";
import {
  reconcileAutoReviewContinuation,
  type AutoReviewAction,
  type AutoReviewAuthorization,
  type AutoReviewBudget,
  type AutoReviewEvidence,
  type AutoReviewFingerprint,
} from "./autoReviewContinuation";

/** Durable continuation state lives next to the other host task records under
 * NOLO_HOME. No extra service, no daemon.
 *
 * Concurrency contract:
 *  - Every mutation is a persistent SEQUENCE SLOT created with O_EXCL
 *    (writeFileSync flag "wx"): `slots/<seq>.json`. Creating the next sequence
 *    number is the compare-and-swap point — exactly one process can win it.
 *  - A claim NEVER retries on a higher sequence: a conflict means another
 *    writer won, and the loser reports busy. No claim is ever deleted,
 *    rewritten or stolen to recover.
 *  - A live owner is never stolen, not even when its lease expired: takeover
 *    requires the owner's PROCESS to be provably gone (PID + /proc start
 *    token), never a timeout alone.
 *  - A failed claim, reconcile or budget commit is never reported as "acted".
 *
 * Platform limits (recorded, not worked around): the PID-reuse check needs
 * /proc, so on non-Linux it degrades to "the PID exists" (no reuse
 * detection); a NOLO_HOME shared across hosts or containers mixes PID
 * namespaces, so an owner of another host may be judged dead. Both are
 * single-host assumptions of this store — they are documented rather than
 * papered over with a second platform.
 */
export const AUTO_REVIEW_CONTINUATION_MAX_ROUNDS = 8;
const DEFAULT_LEASE_MS = 5 * 60 * 1000;
/** A claim of THIS process that was never committed and is this stale is
 * treated as abandoned (recoverable), not as a live owner. */
const SELF_ABANDON_LEASES = 3;

export type AutoReviewClaim = { eventKey: string; owner: string; at: number; leaseMs: number; seq: number };
export type AutoReviewClaimResult =
  | { ok: true; claim: AutoReviewClaim }
  | { ok: false; reason: "duplicate-event" | "busy" | "blocked"; detail?: string };
export type AutoReviewContinuationOutcome = {
  /** "acted" = a fresh decision was persisted (check `effect` for progress).
   * "blocked" = the persisted state is unusable. "failed"/"superseded" =
   * nothing was persisted, so the caller must NOT act on any action. */
  status: "acted" | "blocked" | "failed" | "superseded" | "duplicate-event" | "busy";
  action?: AutoReviewAction;
  budget: AutoReviewBudget;
  reason?: string;
  roundConsumed: boolean;
  /** True only when the action has a real effect (an automatic round was
   * spent). "acted" alone does not mean progress. */
  effect: boolean;
  /** Diagnostic for failures that need a human: which step failed and why. */
  diagnosis?: string;
};

type Env = Record<string, string | undefined>;
type Options = {
  owner?: string;
  leaseMs?: number;
  now?: () => number;
  maxRounds?: number;
  /** Injection points for liveness tests: pretend the claim belongs to
   * another process identity. */
  ownerPid?: number;
  ownerProcStart?: string;
};
type SlotRecord = {
  seq: number;
  kind: "claim" | "commit" | "release";
  owner: string;
  eventKey: string;
  at: number;
  pid: number;
  procStart: string;
  leaseMs: number;
  /** The claim slot this record closes (commit/release). */
  claimSeq?: number;
  /** The claim slot this takeover claim supersedes. */
  supersedesSeq?: number;
  budget?: AutoReviewBudget;
};
type ClaimEntry = { record: SlotRecord; closed: boolean; superseded: boolean };

export function autoReviewContinuationRoot(env: Env): string {
  return join(env.NOLO_HOME || join(homedir(), ".nolo"), "auto-review-continuation");
}

export function autoReviewContinuationTaskDir(env: Env, scope: HostTaskReference): string {
  const key = createHash("sha256").update(JSON.stringify(scope)).digest("hex");
  return join(autoReviewContinuationRoot(env), key);
}

function slotsDir(env: Env, scope: HostTaskReference): string {
  return join(autoReviewContinuationTaskDir(env, scope), "slots");
}

function freshBudget(maxRounds?: number): AutoReviewBudget {
  return {
    rounds: 0,
    maxRounds: maxRounds ?? AUTO_REVIEW_CONTINUATION_MAX_ROUNDS,
    consecutiveNoProgress: 0,
    noProgressLimit: 2,
    consumedEventKeys: [],
  };
}

function validBudget(value: unknown): value is AutoReviewBudget {
  if (!value || typeof value !== "object") return false;
  const b = value as AutoReviewBudget;
  if (!Number.isSafeInteger(b.rounds) || b.rounds < 0) return false;
  if (!Number.isSafeInteger(b.maxRounds) || b.maxRounds <= 0) return false;
  if (!Number.isSafeInteger(b.consecutiveNoProgress) || b.consecutiveNoProgress < 0) return false;
  if (!Number.isSafeInteger(b.noProgressLimit) || b.noProgressLimit <= 0) return false;
  if (!Array.isArray(b.consumedEventKeys) || b.consumedEventKeys.some(k => typeof k !== "string")) return false;
  return true;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/** /proc start time distinguishes the same process from a reused PID. */
function procStartToken(pid: number): string {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    const fields = stat.slice(close + 2).split(" ");
    return fields[19] ?? "";
  } catch {
    return "";
  }
}

/**
 * Liveness of a claim owner. A lease that merely expired is NOT liveness:
 * only a vanished process (or a recycled PID) frees a task for takeover.
 * Without /proc (non-Linux) the check degrades to "the PID exists".
 */
function ownerAlive(record: SlotRecord): boolean {
  if (!record.pid) return false;
  if (record.pid === process.pid) return true;
  const token = procStartToken(record.pid);
  if (token) return !record.procStart || token === record.procStart;
  try {
    process.kill(record.pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readSlots(env: Env, scope: HostTaskReference): { records: SlotRecord[]; corrupt: boolean } {
  const dir = slotsDir(env, scope);
  let names: string[];
  try { names = readdirSync(dir); } catch { return { records: [], corrupt: false }; }
  const records: SlotRecord[] = [];
  let corrupt = false;
  for (const name of names.filter(n => n.endsWith(".json")).sort()) {
    let record: SlotRecord;
    try { record = JSON.parse(readFileSync(join(dir, name), "utf8")) as SlotRecord; } catch { corrupt = true; continue; }
    if (!record || typeof record !== "object" || !Number.isSafeInteger(record.seq) ||
        typeof record.owner !== "string" || typeof record.eventKey !== "string" ||
        !["claim", "commit", "release"].includes(record.kind)) { corrupt = true; continue; }
    records.push(record);
  }
  records.sort((a, b) => a.seq - b.seq);
  return { records, corrupt };
}

function nextSeq(records: SlotRecord[]): number {
  return records.reduce((max, r) => Math.max(max, r.seq), -1) + 1;
}

/** The strict CAS point: exclusive create of the next sequence slot. */
function createSlot(env: Env, scope: HostTaskReference, record: SlotRecord): { ok: boolean; reason?: "conflict" } {
  const dir = slotsDir(env, scope);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, `${String(record.seq).padStart(12, "0")}.json`);
  try {
    writeFileSync(path, JSON.stringify(record), { flag: "wx", mode: 0o600 });
    return { ok: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return { ok: false, reason: "conflict" };
    throw error;
  }
}

/**
 * Claims are tracked by their SLOT SEQUENCE, not by owner: reusing one owner
 * for a second claim must not retroactively invalidate the first claim's
 * committed budget.
 */
function claimEntries(records: SlotRecord[]): Map<number, ClaimEntry> {
  const entries = new Map<number, ClaimEntry>();
  for (const record of records) {
    if (record.kind === "claim") {
      if (typeof record.supersedesSeq === "number") {
        const prior = entries.get(record.supersedesSeq);
        if (prior) prior.superseded = true;
      }
      entries.set(record.seq, { record, closed: false, superseded: false });
    } else if (typeof record.claimSeq === "number") {
      const entry = entries.get(record.claimSeq);
      if (entry) entry.closed = true;
    }
  }
  return entries;
}

function activeClaim(records: SlotRecord[]): ClaimEntry | undefined {
  let active: ClaimEntry | undefined;
  for (const entry of claimEntries(records).values()) {
    if (entry.closed || entry.superseded) continue;
    if (!active || entry.record.seq > active.record.seq) active = entry;
  }
  return active;
}

type BudgetState = { version: number; budget: AutoReviewBudget; corrupt: boolean };

/** Fold the committed budget. A commit whose claim was later superseded does
 * not apply — a stale writer can never roll the state back. */
function readBudgetState(env: Env, scope: HostTaskReference, options: Options = {}): BudgetState {
  const { records, corrupt } = readSlots(env, scope);
  if (corrupt) return { version: 0, budget: { ...freshBudget(options.maxRounds), corrupt: true }, corrupt: true };
  const superseded = new Set<number>();
  for (const entry of claimEntries(records).values()) if (entry.superseded) superseded.add(entry.record.seq);
  let version = 0;
  let budget = freshBudget(options.maxRounds);
  let stateCorrupt = false;
  for (const record of records) {
    if (record.kind !== "commit") continue;
    if (!validBudget(record.budget)) { stateCorrupt = true; continue; }
    if (typeof record.claimSeq === "number" && superseded.has(record.claimSeq)) continue;
    version = record.seq;
    budget = record.budget;
  }
  return { version, budget, corrupt: stateCorrupt };
}

/**
 * Restart-safe budget. A persisted slot that cannot be read or validated is
 * reported as corrupt instead of being reset: a broken budget must not hand
 * out a fresh round allowance.
 */
export function readAutoReviewContinuationBudget(env: Env, scope: HostTaskReference, options: Options = {}): AutoReviewBudget {
  return readBudgetState(env, scope, options).budget;
}

/** The persisted state including its version — the version is the value a
 * commit is checked against, so a stale budget can never be written back. */
export function readAutoReviewContinuationState(env: Env, scope: HostTaskReference, options: Options = {}): BudgetState {
  return readBudgetState(env, scope, options);
}

/**
 * Atomic single-task claim. Exactly one process can win the next sequence
 * slot; the loser reports busy and never retries on a higher sequence (that
 * would be stealing). A live owner is never taken over — takeover needs a
 * provably dead owner process.
 */
export function claimAutoReviewContinuation(scope: HostTaskReference, eventKey: string, env: Env, options: Options = {}): AutoReviewClaimResult {
  let { records, corrupt } = readSlots(env, scope);
  if (corrupt) return { ok: false, reason: "busy" };
  const state = readBudgetState(env, scope, options);
  // An event whose budget was committed is a duplicate; an event that was
  // never committed (crashed mid-flight) is NOT a duplicate.
  if (state.budget.consumedEventKeys.includes(eventKey)) return { ok: false, reason: "duplicate-event" };
  const active = activeClaim(records);
  if (active) {
    const abandonedSelf = active.record.pid === process.pid &&
      !state.budget.consumedEventKeys.includes(active.record.eventKey) &&
      (options.now ? options.now() : Date.now()) - active.record.at > active.record.leaseMs * SELF_ABANDON_LEASES;
    if (ownerAlive(active.record) && !abandonedSelf) {
      // Busy for every event: a repeat is only a duplicate when the committed
      // budget says so (checked above), never because a claim slot exists.
      return { ok: false, reason: "busy" };
    }
    if (abandonedSelf) {
      // This process left an uncommitted claim behind (a failed write): close
      // it with a release slot so the task is recoverable. Nothing is deleted.
      const released = releaseClaimSlot(env, scope, active.record, options);
      if (!released.ok) {
        return { ok: false, reason: "blocked", detail: `abandoned_claim_not_releasable: ${released.detail ?? "unknown"}` };
      }
      // The release slot took a sequence number: re-read before claiming.
      records = readSlots(env, scope).records;
    }
  }
  const owner = options.owner ?? randomUUID();
  const pid = options.ownerPid ?? process.pid;
  const record: SlotRecord = {
    seq: nextSeq(records),
    kind: "claim",
    owner,
    eventKey,
    at: options.now ? options.now() : Date.now(),
    pid,
    procStart: options.ownerProcStart ?? procStartToken(pid),
    leaseMs: options.leaseMs ?? DEFAULT_LEASE_MS,
    ...(active ? { supersedesSeq: active.record.seq } : {}),
  };
  const created = createSlot(env, scope, record);
  if (!created.ok) return { ok: false, reason: "busy" };
  return { ok: true, claim: { eventKey, owner, at: record.at, leaseMs: record.leaseMs, seq: record.seq } };
}

/** Append a release slot that closes the given claim. Nothing is deleted. */
function releaseClaimSlot(env: Env, scope: HostTaskReference, claim: SlotRecord, options: Options = {}): { ok: boolean; detail?: string } {
  const { records } = readSlots(env, scope);
  // A release carries no ownership semantics of its own (it only closes the
  // claim slot it names), so it may take the next free sequence. It still
  // never overwrites: the slot is created exclusively.
  const record: SlotRecord = {
    seq: nextSeq(records),
    kind: "release",
    owner: claim.owner,
    eventKey: claim.eventKey,
    at: options.now ? options.now() : Date.now(),
    pid: process.pid,
    procStart: procStartToken(process.pid),
    leaseMs: claim.leaseMs,
    claimSeq: claim.seq,
  };
  try {
    const created = createSlot(env, scope, record);
    return created.ok ? { ok: true } : { ok: false, detail: "sequence_conflict" };
  } catch (error) {
    return { ok: false, detail: describeError(error) };
  }
}

/** Release the claim by writing a release slot. Nothing is deleted. */
export function releaseAutoReviewContinuation(scope: HostTaskReference, claim: AutoReviewClaim, env: Env): void {
  const { records } = readSlots(env, scope);
  const entry = claimEntries(records).get(claim.seq);
  if (!entry || entry.closed || entry.superseded || entry.record.owner !== claim.owner) return;
  releaseClaimSlot(env, scope, entry.record);
}

/**
 * Persist the next budget by claiming the fixed slot right after our claim
 * (CAS) and then close the claim. Before writing, the persisted version is
 * re-checked: a budget computed from an older state would refund rounds and
 * drop consumed events, so the commit is refused instead.
 */
export function commitAutoReviewContinuation(
  scope: HostTaskReference,
  claim: AutoReviewClaim,
  budget: AutoReviewBudget,
  env: Env,
  meta?: { action?: string; expectedVersion?: number },
): { ok: boolean; reason?: string } {
  const { records, corrupt } = readSlots(env, scope);
  if (corrupt) return { ok: false, reason: "budget_corrupt" };
  const entry = claimEntries(records).get(claim.seq);
  if (!entry || entry.closed || entry.superseded || entry.record.owner !== claim.owner ||
      entry.record.eventKey !== claim.eventKey) {
    return { ok: false, reason: "superseded" };
  }
  const state = readBudgetState(env, scope);
  if (state.corrupt) return { ok: false, reason: "budget_corrupt" };
  if (typeof meta?.expectedVersion === "number" && state.version !== meta.expectedVersion) {
    return { ok: false, reason: "version_conflict" };
  }
  const record: SlotRecord = {
    // Fixed target: the slot right after our claim. Any writer that took it
    // first wins, and our commit fails instead of overwriting the newer state.
    seq: claim.seq + 1,
    kind: "commit",
    owner: claim.owner,
    eventKey: claim.eventKey,
    at: Date.now(),
    pid: process.pid,
    procStart: procStartToken(process.pid),
    leaseMs: claim.leaseMs,
    claimSeq: claim.seq,
    budget,
  };
  const created = createSlot(env, scope, record);
  if (!created.ok) return { ok: false, reason: "conflict" };
  try {
    appendFileSync(join(autoReviewContinuationTaskDir(env, scope), "audit.log"), `${JSON.stringify({ at: new Date().toISOString(), eventKey: claim.eventKey, action: meta?.action, rounds: budget.rounds })}\n`, { mode: 0o600 });
  } catch { /* audit is best effort; the slot log is the truth */ }
  return { ok: true };
}

/**
 * The API a wake/reconcile caller uses: claim → re-read the persisted state →
 * decide → commit. The caller's budget is never trusted: the persisted state
 * read AFTER the claim is the only base for the decision, so a concurrent
 * writer's round can never be refunded and its consumed event never lost.
 */
export function runAutoReviewContinuation(input: {
  scope: HostTaskReference;
  trigger: { kind: "turn-terminal" | "review-terminal" | "acceptance" | "recovery"; eventKey: string };
  fingerprint: AutoReviewFingerprint;
  authorization?: AutoReviewAuthorization;
  evidence?: AutoReviewEvidence;
  /** Accepted for compatibility, IGNORED: the persisted state is the truth. */
  budget?: AutoReviewBudget;
}, env: Env, options: Options = {}): AutoReviewContinuationOutcome {
  const before = readAutoReviewContinuationState(env, input.scope, options);
  if (before.corrupt) {
    // Fail closed: no claim, no write, no repair of the broken state.
    return { status: "blocked", action: { kind: "blocked", reason: "budget_corrupt" }, budget: before.budget, reason: "budget_corrupt", roundConsumed: false, effect: false };
  }
  let claim: AutoReviewClaim | undefined;
  let committed = false;
  let failure: { status: "failed" | "superseded" | "blocked"; reason: string; diagnosis?: string } | undefined;
  let releaseDetail: string | undefined;
  try {
    const claimed = claimAutoReviewContinuation(input.scope, input.trigger.eventKey, env, options);
    if (!claimed.ok) {
      if (claimed.reason === "blocked") {
        failure = { status: "blocked", reason: "claim_blocked", diagnosis: claimed.detail };
      } else {
        return {
          status: claimed.reason === "duplicate-event" ? "duplicate-event" : "busy",
          action: claimed.reason === "duplicate-event" ? { kind: "duplicate" } : undefined,
          budget: before.budget,
          reason: claimed.reason,
          roundConsumed: false,
          effect: false,
          ...(claimed.detail ? { diagnosis: claimed.detail } : {}),
        };
      }
    } else {
      claim = claimed.claim;
      // Re-read the persisted state AFTER the claim: from here on we are the
      // active owner, so this snapshot is stable and current.
      const state = readAutoReviewContinuationState(env, input.scope, options);
      if (state.corrupt) {
        failure = { status: "blocked", reason: "budget_corrupt" };
      } else {
        const result = reconcileAutoReviewContinuation({
          scope: input.scope,
          trigger: input.trigger,
          fingerprint: input.fingerprint,
          budget: state.budget,
          authorization: input.authorization,
          evidence: input.evidence,
        });
        const commitResult = commitAutoReviewContinuation(input.scope, claim, result.budget, env, {
          action: result.action.kind,
          expectedVersion: state.version,
        });
        if (!commitResult.ok) {
          failure = {
            status: commitResult.reason === "superseded" ? "superseded" : "failed",
            reason: commitResult.reason ?? "commit_failed",
          };
        } else {
          committed = true;
          if (result.action.kind === "duplicate") {
            return { status: "duplicate-event", action: result.action, budget: result.budget, reason: result.reason, roundConsumed: false, effect: false };
          }
          return { status: "acted", action: result.action, budget: result.budget, reason: result.reason, roundConsumed: result.roundConsumed, effect: result.roundConsumed };
        }
      }
    }
  } catch (error) {
    failure = { status: "failed", reason: "store_error", diagnosis: describeError(error) };
  } finally {
    // A claim that was not committed must not stay active: it would keep the
    // task busy for this live process. The release is a NEW slot; if the disk
    // refuses it, the failure is reported instead of pretending success.
    if (claim && !committed) {
      try {
        const released = releaseClaimSlot(env, input.scope, {
          seq: claim.seq,
          kind: "claim",
          owner: claim.owner,
          eventKey: claim.eventKey,
          at: claim.at,
          pid: process.pid,
          procStart: procStartToken(process.pid),
          leaseMs: claim.leaseMs,
        }, options);
        if (!released.ok) releaseDetail = `release_failed: ${released.detail ?? "unknown"}`;
      } catch (error) {
        releaseDetail = `release_failed: ${describeError(error)}`;
      }
    }
  }
  const diagnosis = [failure?.diagnosis, releaseDetail].filter(Boolean).join("; ") || undefined;
  return {
    status: failure?.status ?? "failed",
    action: undefined,
    budget: before.budget,
    reason: failure?.reason ?? "commit_failed",
    roundConsumed: false,
    effect: false,
    ...(diagnosis ? { diagnosis } : {}),
  };
}
