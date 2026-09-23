import { isLevelNotFoundError } from "database/levelNotFoundError";
import {
  buildEvolutionCandidateKey,
  buildEvolutionCandidateRange,
  type EvolutionCandidate,
  type EvolutionCandidateStatus,
} from "./candidate";
import type { EvolutionSignal } from "./types";

/**
 * Investigation Queue / Selector v1.
 *
 * Evolution's current goal is NOT automatic root-cause diagnosis. It is to
 * funnel many real completed runs through deterministic facts (+ future
 * System One enrichment) into a small set of high-value Candidates that a
 * user can then claim — manually or via a future worker — for Deep Review.
 *
 * This module is deliberately cheap:
 * - it only reads the compact EvolutionCandidate projection
 * - it never reads dialogs, conversations, traces or raw observations
 * - it never requires a System One (Jev) verdict to list or rank
 */

export const EVOLUTION_QUEUE_DEFAULT_LIMIT = 10;
export const EVOLUTION_QUEUE_HARD_MAX_LIMIT = 500;

/**
 * Minimal store contract for the queue. `iterator` + `batchWrite` match the
 * LegacyServerDb / AuthorityStore shape so `serverDb` can be passed directly.
 * A narrower fake (get + iterator + batchWrite) satisfies tests.
 */
export type EvolutionQueueStore = {
  get(key: string): Promise<unknown>;
  iterator(
    options?: {
      gte?: string;
      lte?: string;
      lt?: string;
      reverse?: boolean;
    },
  ): AsyncIterableIterator<[string, unknown]>;
  /**
   * Atomic multi-put. Claim relies on this so a batch of status transitions
   * is applied as one unit rather than read-then-loop-put.
   */
  batchWrite(
    ops: Array<{ type: "put"; key: string; value: unknown } | { type: "del"; key: string }>,
  ): Promise<void>;
};

/**
 * Cheap, already-persisted filters. Every field maps to a column already on
 * the compact Candidate — no dialog read, no full-text search, no taskClass
 * (taskClass is not stored on Candidate; it belongs to a later materialized
 * Case / baseline record).
 */
export type EvolutionCandidateFilters = {
  status?: EvolutionCandidateStatus;
  success?: boolean;
  signalKinds?: EvolutionSignal["kind"][];
  runKind?: EvolutionCandidate["snapshot"]["runKind"];
  provider?: string;
  model?: string;
};

export type EvolutionQueueOrder = "newest" | "priority";

export type EvolutionQueuePage = {
  candidates: EvolutionCandidate[];
  /**
   * Opaque cursor for the NEXT page. Pass it back as `cursor` to continue.
   * `undefined` means there is no further page under the current filter/order.
   */
  nextCursor?: string;
};

export type ListEvolutionCandidatesOptions = {
  limit?: number;
  filters?: EvolutionCandidateFilters;
  order?: EvolutionQueueOrder;
  cursor?: string;
};

export type EvolutionCandidatePriorityTier = "critical" | "high" | "medium" | "low";

export type EvolutionCandidatePriority = {
  tier: EvolutionCandidatePriorityTier;
  /** Human-auditable reasons this candidate ranked where it did. */
  reasons: string[];
};

const clampLimit = (limit?: number): number => {
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
    return EVOLUTION_QUEUE_DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit), EVOLUTION_QUEUE_HARD_MAX_LIMIT);
};

const matchesFilters = (
  candidate: EvolutionCandidate,
  filters?: EvolutionCandidateFilters,
): boolean => {
  if (!filters) return true;
  if (filters.status !== undefined && candidate.status !== filters.status) return false;
  if (filters.success !== undefined && candidate.snapshot.success !== filters.success) {
    return false;
  }
  if (filters.runKind !== undefined && candidate.snapshot.runKind !== filters.runKind) {
    return false;
  }
  if (filters.provider !== undefined && candidate.snapshot.provider !== filters.provider) {
    return false;
  }
  if (filters.model !== undefined && candidate.snapshot.model !== filters.model) {
    return false;
  }
  if (filters.signalKinds !== undefined && filters.signalKinds.length > 0) {
    const present = new Set(candidate.signals.map((s) => s.kind));
    if (!filters.signalKinds.some((kind) => present.has(kind))) return false;
  }
  return true;
};

/**
 * Deterministic, explainable priority. Tier order is a fixed lexicographic
 * ladder of failure severity — not a weighted numeric score, so the ordering
 * stays auditable and stable.
 *
 *   critical: run_failure          — the run did not complete
 *   high:     loop_stall           — the run stalled and needed recovery
 *   medium:   tool_failure         — at least one tool call failed
 *   low:      everything else      — efficiency / waste anomalies
 *
 * Ties fall back to newest-first so ordering is fully deterministic.
 */
export const rankEvolutionCandidatePriority = (
  candidate: EvolutionCandidate,
): EvolutionCandidatePriority => {
  const kinds = new Set(candidate.signals.map((s) => s.kind));
  const reasons: string[] = [];

  let tier: EvolutionCandidatePriorityTier = "low";
  if (kinds.has("run_failure")) {
    tier = "critical";
    reasons.push("run_failure");
  } else if (kinds.has("loop_stall")) {
    tier = "high";
    reasons.push("loop_stall");
  } else if (kinds.has("tool_failure")) {
    tier = "medium";
    reasons.push("tool_failure");
  }

  if (kinds.has("repeated_tool_call")) reasons.push("repeated_tool_call");
  if (kinds.has("high_tool_call_count")) reasons.push("high_tool_call_count");
  if (kinds.has("large_context")) reasons.push("large_context");
  if (candidate.snapshot.stalled && !kinds.has("loop_stall")) reasons.push("stalled");

  if (reasons.length === 0) reasons.push("interesting");
  return { tier, reasons };
};

const TIER_RANK: Record<EvolutionCandidatePriorityTier, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const compareNewest = (a: EvolutionCandidate, b: EvolutionCandidate): number => {
  // Newest first; stable tiebreak on id so ordering never depends on
  // iterator/insertion order.
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

const comparePriority = (a: EvolutionCandidate, b: EvolutionCandidate): number => {
  const ta = TIER_RANK[rankEvolutionCandidatePriority(a).tier];
  const tb = TIER_RANK[rankEvolutionCandidatePriority(b).tier];
  if (ta !== tb) return ta - tb;
  return compareNewest(a, b);
};

/**
 * Cursor = `${createdAt}|${id}` — the full sort tuple of the last emitted
 * candidate. The Candidate key carries no timestamp and `priority` order needs
 * full signals, so we resume by comparing against this position inside the
 * freshly sorted window rather than pushing a raw key boundary into the
 * iterator (candidate ids are ULIDs, but we must not assume id order ==
 * createdAt order). Bounded by the same hard-cap scan.
 */
const encodeCursor = (c: EvolutionCandidate): string =>
  `${TIER_RANK[rankEvolutionCandidatePriority(c).tier]}|${c.createdAt}|${c.id}`;
const decodeCursor = (
  cursor: string,
): { tierRank: number; createdAt: string; id: string } | null => {
  const parts = cursor.split("|");
  if (parts.length !== 3) return null;
  const tierRank = Number(parts[0]);
  if (!Number.isFinite(tierRank)) return null;
  return { tierRank, createdAt: parts[1], id: parts[2] };
};

const isCandidateRecord = (value: unknown): value is EvolutionCandidate =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as EvolutionCandidate).id === "string" &&
  typeof (value as EvolutionCandidate).status === "string" &&
  typeof (value as EvolutionCandidate).createdAt === "string";

/**
 * Read a bounded, deterministically-ordered page of candidates.
 *
 * `newest` orders by createdAt (id tiebreak); `priority` orders by the
 * explainable tier ladder then createdAt. Both scan at most the hard-cap
 * window of raw candidate records — never unbounded.
 *
 * The cursor encodes the last emitted sort position (tier|createdAt|id);
 * resume drops everything at-or-before it, so `next N` never replays.
 */
export const listEvolutionCandidates = async ({
  store,
  limit,
  filters,
  order = "newest",
  cursor,
}: ListEvolutionCandidatesOptions & { store: EvolutionQueueStore }): Promise<EvolutionQueuePage> => {
  const effectiveLimit = clampLimit(limit);
  const range = buildEvolutionCandidateRange();

  // Iterate newest-first by key. We do NOT push a row `limit` into the
  // iterator: `limit` caps RAW rows before our filter runs, which would
  // silently under-report whenever the newest rows don't match (and iterator
  // `limit` is not part of the AuthorityIteratorOptions contract — some
  // drivers ignore it). The single bound is the post-filter break below.
  const iteratorOptions: { gte: string; lte: string; reverse: boolean } = {
    gte: range.start,
    lte: range.end,
    reverse: true,
  };

  const collected: EvolutionCandidate[] = [];
  for await (const [key, value] of store.iterator(iteratorOptions)) {
    if (typeof key !== "string") continue;
    if (!isCandidateRecord(value)) continue;
    if (!matchesFilters(value, filters)) continue;
    collected.push(value);
    // `newest` needs only limit+1 matches to decide a page + hasMore on the
    // first page, but a cursor resume must scan the full bounded window to
    // locate the cursor position reliably. `priority` always needs the full
    // window before sorting. Bound everything by the hard cap.
    const bound =
      order === "newest" && !cursor ? effectiveLimit + 1 : EVOLUTION_QUEUE_HARD_MAX_LIMIT;
    if (collected.length >= bound) break;
  }

  const comparator = order === "priority" ? comparePriority : compareNewest;
  collected.sort(comparator);

  // Resume strictly after the cursor position inside the sorted order. The
  // cursor encodes the last emitted (tierRank, createdAt, id); we drop every
  // element that sorts at-or-before it, so a page never replays — even if the
  // cursor element itself has since changed status or been resolved.
  let start = 0;
  if (cursor) {
    const pos = decodeCursor(cursor);
    if (pos) {
      const after = (c: EvolutionCandidate): boolean => {
        if (order === "priority") {
          const tier = TIER_RANK[rankEvolutionCandidatePriority(c).tier];
          if (tier !== pos.tierRank) return tier > pos.tierRank;
        }
        return compareNewest(c, CURSOR_STUB(pos)) > 0;
      };
      start = collected.findIndex(after);
      if (start < 0) start = collected.length; // cursor sorts past window → done
    }
    // malformed cursor → start at 0 (treat as first page)
  }
  const page = collected.slice(start, start + effectiveLimit);
  const hasMore = start + page.length < collected.length;
  const nextCursor =
    hasMore && page.length > 0 ? encodeCursor(page[page.length - 1]) : undefined;
  return { candidates: page, ...(nextCursor ? { nextCursor } : {}) };
};

// Minimal candidate-shaped value for the newest-order cursor comparison —
// compareNewest only reads createdAt and id.
const CURSOR_STUB = (pos: { createdAt: string; id: string }): EvolutionCandidate =>
  ({
    id: pos.id,
    createdAt: pos.createdAt,
    status: "open",
    snapshot: { success: true } as EvolutionCandidate["snapshot"],
    signals: [],
  }) as EvolutionCandidate;

/**
 * Peek: bounded listing that does NOT change status. Repeated calls return
 * the same set (given the same filters/order).
 */
export const peekEvolutionCandidates = async ({
  store,
  limit,
  filters,
  order,
}: {
  store: EvolutionQueueStore;
  limit?: number;
  filters?: EvolutionCandidateFilters;
  order?: EvolutionQueueOrder;
}): Promise<EvolutionCandidate[]> => {
  const page = await listEvolutionCandidates({ store, limit, filters, order });
  return page.candidates;
};

/**
 * In-process claim mutex. Serializes read→batchWrite within one process so two
 * concurrent `claimEvolutionCandidates` calls cannot both observe the same
 * `open` set. Cross-process exclusion is an explicit v1 limit (LevelDB has no
 * CAS) — see the claim docstring.
 */
let claimChain: Promise<unknown> = Promise.resolve();
const withClaimLock = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = claimChain.then(fn, fn);
  claimChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
};

/**
 * Claim: atomically transition up to `limit` still-open candidates to
 * `accepted` and return them. The next claim returns the NEXT batch — never
 * the same items.
 *
 * Concurrency boundary (v1): LevelDB has no compare-and-swap, so we serialize
 * claims in-process via `withClaimLock` and commit each batch atomically via
 * `batchWrite` (all puts land together or not at all). Two *separate OS
 * processes* racing on the same DB can still interleave read→batchWrite; that
 * is an explicit v1 limit — future auto-workers must serialize claims through
 * a single owner or an external lock. Within one process this is safe.
 */
export const claimEvolutionCandidates = async ({
  store,
  limit,
  filters,
  order,
}: {
  store: EvolutionQueueStore;
  limit?: number;
  filters?: Omit<EvolutionCandidateFilters, "status">;
  order?: EvolutionQueueOrder;
}): Promise<EvolutionCandidate[]> =>
  withClaimLock(async () => {
    const page = await listEvolutionCandidates({
      store,
      limit,
      order,
      filters: { ...(filters ?? {}), status: "open" },
    });
    const open = page.candidates.filter((c) => c.status === "open");
    if (open.length === 0) return [];

    const claimed = open.map((c) => ({ ...c, status: "accepted" as const }));
    await store.batchWrite(
      claimed.map((c) => ({ type: "put" as const, key: buildEvolutionCandidateKey(c.id), value: c })),
    );
    return claimed;
  });

export type EvolutionCandidateReviewOutcome = "resolved" | "dismissed" | "promoted";

/**
 * Map the review outcome onto the persisted status enum. We deliberately keep
 * the legacy enum (`open|accepted|rejected|resolved`) to avoid a migration —
 * `dismissed`/`promoted` are review outcomes, stored as the closest existing
 * status. `promoted` stays `accepted` because promotion means "this candidate
 * graduates to Deep Review", which is the consumed/in-progress state.
 */
const outcomeToStatus = (outcome: EvolutionCandidateReviewOutcome): EvolutionCandidateStatus => {
  switch (outcome) {
    case "resolved":
      return "resolved";
    case "dismissed":
      return "rejected";
    case "promoted":
      return "accepted";
  }
};

/**
 * Minimal review-completion lifecycle. Only flips status — Deep Review's
 * long-form output is NOT stored on the Candidate (it belongs to a later
 * stage). Returns the updated candidate.
 *
 * Runs under the same in-process lock as claim so a review write cannot race
 * a concurrent claim's read-modify-write of the same record. The lifecycle is
 * enforced: only a candidate currently `accepted` (i.e. claimed) may be
 * completed — `resolved`, `dismissed` and `promoted` all require it. This
 * stops an `open` candidate from jumping straight to a terminal state and
 * stops a `resolved` record from being flipped back.
 */
export const completeEvolutionCandidateReview = async ({
  store,
  candidateId,
  outcome,
}: {
  store: EvolutionQueueStore;
  candidateId: string;
  outcome: EvolutionCandidateReviewOutcome;
}): Promise<EvolutionCandidate> =>
  withClaimLock(async () => {
    const key = buildEvolutionCandidateKey(candidateId);
    let existing: unknown;
    try {
      existing = await store.get(key);
    } catch (error) {
      if (isLevelNotFoundError(error)) {
        throw new Error(`evolution candidate not found: ${candidateId}`);
      }
      throw error;
    }
    if (!isCandidateRecord(existing)) {
      throw new Error(`evolution candidate not found: ${candidateId}`);
    }
    if (existing.status !== "accepted") {
      throw new Error(
        `evolution candidate ${candidateId} cannot complete review from status "${existing.status}" (requires "accepted")`,
      );
    }
    const updated: EvolutionCandidate = { ...existing, status: outcomeToStatus(outcome) };
    await store.batchWrite([{ type: "put", key, value: updated }]);
    return updated;
  });
