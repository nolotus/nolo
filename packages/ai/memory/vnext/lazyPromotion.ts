import type { MemoryItem } from "../types";
import { applyMemoryInterpreterMutation } from "./applyMutation";
import { buildLegacyMemoryEvidence } from "./legacyMigration";
import { applyLegacyMemoryEvidence } from "./legacyMigrationApply";
import {
  runLegacyMemoryMigrationShadow,
  type LegacyMigrationExistingContext,
  type LegacyMigrationShadowProvider,
} from "./legacyMigrationShadow";
import { loadMemoryVNextCatalog } from "./store";
import type { MemoryInterpreterMutation } from "./types";

export type MemoryVNextLazyPromotionStatus =
  | "promoted"
  | "already_covered"
  | "no_op"
  | "conflict"
  | "in_flight"
  | "error";

export interface MemoryVNextLazyPromotionObservation {
  status: MemoryVNextLazyPromotionStatus;
  latencyMs: number;
  /** Which legacy record was promoted this turn (never its content). */
  legacyItemId?: string;
  /** Deterministic Evidence id derived from the legacy record identity. */
  evidenceId?: string;
  /** Position inside the ranked `selected` list (0-based) this item occupied. */
  selectedIndex?: number;
  /** Items ahead of the pick skipped because a current State already covers them. */
  skippedCoveredCount?: number;
  /** Items ahead of the pick skipped because they were no_op under the same context. */
  skippedNoOpCount?: number;
  action?: MemoryInterpreterMutation["action"];
  error?: string;
}

export interface MemoryVNextLazyPromotionInput {
  db: any;
  item: MemoryItem;
  provider: LegacyMigrationShadowProvider;
  /** 0-based position of `item` inside the ranked `selected` list (telemetry only). */
  selectedIndex?: number;
  /** Candidate-selection telemetry forwarded verbatim into the observation. */
  skippedCoveredCount?: number;
  skippedNoOpCount?: number;
  timeoutMs?: number;
  now?: string;
  nextId?: () => string;
  clock?: () => number;
  emit?: (observation: MemoryVNextLazyPromotionObservation) => void;
}

const ERROR_MESSAGE_MAX = 120;
const inFlight = new Set<string>();

const shortError = (error: unknown): string => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return message.length > ERROR_MESSAGE_MAX
    ? `${message.slice(0, ERROR_MESSAGE_MAX)}…`
    : message;
};

export const loadExistingContext = async (
  db: any,
  ownerId: string
): Promise<LegacyMigrationExistingContext> => {
  const { entities, states } = await loadMemoryVNextCatalog(db, ownerId);
  return { entityIds: entities.map((entity) => entity.id), states };
};

/**
 * The single coverage contract shared by the runtime pre-selection snapshot,
 * the defensive in-helper re-check and Slice 7 primary read: an Evidence is
 * covered by the non-retired current States that reference its id.
 * Evidence-only (Evidence exists but no current State cites it) is NOT
 * covered and stays retryable.
 */
export const currentStatesCitingEvidence = <
  T extends { retiredAt?: string | null; evidenceIds: readonly string[] },
>(
  states: readonly T[],
  evidenceId: string
): T[] =>
  states.filter((state) => !state.retiredAt && (state.evidenceIds ?? []).includes(evidenceId));

export const isEvidenceCoveredByCurrentStates = (
  states: readonly { retiredAt?: string | null; evidenceIds: readonly string[] }[],
  evidenceId: string
): boolean => currentStatesCitingEvidence(states, evidenceId).length > 0;

/**
 * Stable, content-free fingerprint of exactly what the Interpreter reasons
 * over for an owner: the Entity ids plus every State's id/updatedAt/retiredAt.
 * Any Entity create or State create/update/supersede changes it, so a no_op
 * verdict recorded under one fingerprint automatically expires once that
 * context has moved on. No text is read; cost is linear in context size.
 */
export const memoryVNextContextFingerprint = (
  existing: LegacyMigrationExistingContext
): string => {
  const states = existing.states ?? [];
  const entityIds = existing.entityIds ?? [];
  const canonical = [
    ...entityIds.map((id) => `e\u0000${id}`),
    ...states.map((state) => `s\u0000${state.id}\u0000${state.updatedAt}\u0000${state.retiredAt ?? ""}`),
  ]
    .sort()
    .join("\u0001");
  // FNV-1a 32-bit; the sizes are kept alongside to make accidental
  // collisions between differently sized contexts impossible.
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${entityIds.length}.${states.length}:${(hash >>> 0).toString(16)}`;
};

/**
 * Slice 6.2 no_op suppression. Process-local and disposable by design: it is
 * NOT durable truth (restart clears it), keyed by owner principal + Evidence
 * id so owners never share verdicts, and bounded by insertion-order eviction.
 * An entry only suppresses while the owner's current fingerprint still equals
 * the one the Interpreter saw when it said no_op — no TTL.
 */
export const MAX_NOOP_SUPPRESSIONS = 512;
const noOpSuppressions = new Map<string, string>();
const suppressionKey = (ownerId: string, evidenceId: string): string =>
  `${ownerId}\u0000${evidenceId}`;

const recordNoOpSuppression = (ownerId: string, evidenceId: string, fingerprint: string) => {
  const key = suppressionKey(ownerId, evidenceId);
  noOpSuppressions.delete(key); // re-insert so a refreshed entry is youngest
  noOpSuppressions.set(key, fingerprint);
  while (noOpSuppressions.size > MAX_NOOP_SUPPRESSIONS) {
    noOpSuppressions.delete(noOpSuppressions.keys().next().value!);
  }
};

/**
 * `fresh`: never judged no_op in this process. `stale`: judged no_op under an
 * older context, so eligible again. `suppressed`: no_op under this context.
 */
const noOpHistory = (
  ownerId: string,
  evidenceId: string,
  fingerprint: string
): "fresh" | "stale" | "suppressed" => {
  const recorded = noOpSuppressions.get(suppressionKey(ownerId, evidenceId));
  if (recorded === undefined) return "fresh";
  return recorded === fingerprint ? "suppressed" : "stale";
};

/** Test-only: the suppression cache is module state shared across tests. */
export const resetMemoryVNextNoOpSuppressionsForTests = (): void => {
  noOpSuppressions.clear();
};
export const memoryVNextNoOpSuppressionSizeForTests = (): number => noOpSuppressions.size;

export interface MemoryVNextLazyPromotionPick {
  item: MemoryItem;
  selectedIndex: number;
  skippedCoveredCount: number;
  skippedNoOpCount: number;
}

/**
 * Slice 6.1/6.2: pick the first eligible item from the already-ranked
 * `selected` list without N+1 DB reads. selected is at most ~20 items; we
 * load each vNext owner principal's Entity/State context once, memoize it in
 * a per-call Map (coverage and fingerprint share that one load), then skip
 * items that are covered or were no_op under the owner's unchanged context.
 * Never-attempted items win over no_op items re-qualified by a context change.
 */
export const pickFirstUncoveredLazyPromotionItem = async (
  db: any,
  selected: readonly MemoryItem[]
): Promise<MemoryVNextLazyPromotionPick | null> => {
  const contextByOwner = new Map<
    string,
    Promise<{ states: NonNullable<LegacyMigrationExistingContext["states"]>; fingerprint: string }>
  >();
  const contextFor = (ownerId: string) => {
    let pending = contextByOwner.get(ownerId);
    if (!pending) {
      pending = loadExistingContext(db, ownerId).then((existing) => ({
        states: existing.states ?? [],
        fingerprint: memoryVNextContextFingerprint(existing),
      }));
      contextByOwner.set(ownerId, pending);
    }
    return pending;
  };
  let skippedCoveredCount = 0;
  let skippedNoOpCount = 0;
  let firstStale: MemoryVNextLazyPromotionPick | null = null;
  for (const [selectedIndex, item] of selected.entries()) {
    const evidence = buildLegacyMemoryEvidence(item);
    const context = await contextFor(evidence.ownerId);
    if (isEvidenceCoveredByCurrentStates(context.states, evidence.id)) {
      skippedCoveredCount++;
      continue;
    }
    const history = noOpHistory(evidence.ownerId, evidence.id, context.fingerprint);
    if (history === "fresh") {
      return { item, selectedIndex, skippedCoveredCount, skippedNoOpCount };
    }
    // Every promotion changes the context, which re-qualifies ALL earlier
    // no_op items at once. Retrying them in rank order would put them back in
    // front of never-attempted items (quadratic tail delay), so a context-
    // changed no_op is only retried once no fresh candidate remains.
    if (history === "stale" && !firstStale) {
      firstStale = { item, selectedIndex, skippedCoveredCount, skippedNoOpCount };
    }
    skippedNoOpCount++;
  }
  return firstStale;
};

const withoutImportedEvidence = (
  mutation: MemoryInterpreterMutation,
  importedEvidenceId: string
): MemoryInterpreterMutation => ({
  ...mutation,
  evidence: (mutation.evidence ?? []).filter((evidence) => evidence.id !== importedEvidenceId),
});

const hasWrites = (mutation: MemoryInterpreterMutation): boolean =>
  (mutation.evidence?.length ?? 0) > 0 ||
  (mutation.entities?.length ?? 0) > 0 ||
  (mutation.states?.length ?? 0) > 0 ||
  (mutation.supersededStateIds?.length ?? 0) > 0 ||
  (mutation.relations?.length ?? 0) > 0;

/**
 * Slice 6: opportunistically promote one legacy record that the production
 * runtime actually selected.
 *
 * Evidence is persisted first through the deterministic Slice 3 seam. That is
 * intentionally allowed to survive an Interpreter/apply failure: Evidence is
 * durable experience, while State is rebuildable consolidation. The existing
 * migration Interpreter is then reused, but its imported Evidence is removed
 * from the candidate mutation before Slice 4 atomic apply because that exact
 * deterministic Evidence already exists in the store.
 *
 * This function is best-effort and never throws. It is suitable for detached
 * runtime use: any failure is observable but cannot affect the legacy-authority
 * answer currently being produced.
 */
export const runMemoryVNextLazyPromotion = async (
  input: MemoryVNextLazyPromotionInput
): Promise<MemoryVNextLazyPromotionObservation> => {
  const clock = input.clock ?? (() => performance.now());
  const startedAt = clock();
  const emit =
    input.emit ??
    ((observation: MemoryVNextLazyPromotionObservation) =>
      console.info("[memory] vnext lazy promotion", {
        event: "memory_vnext_lazy_promotion",
        ...observation,
      }));
  const finish = (
    partial: Omit<MemoryVNextLazyPromotionObservation, "latencyMs">
  ): MemoryVNextLazyPromotionObservation => {
    const observation: MemoryVNextLazyPromotionObservation = {
      legacyItemId: input.item.id,
      evidenceId: deterministicEvidence.id,
      ...(input.selectedIndex === undefined
        ? {}
        : { selectedIndex: input.selectedIndex }),
      ...(input.skippedCoveredCount === undefined
        ? {}
        : { skippedCoveredCount: input.skippedCoveredCount }),
      ...(input.skippedNoOpCount === undefined
        ? {}
        : { skippedNoOpCount: input.skippedNoOpCount }),
      ...partial,
      latencyMs: Math.round((clock() - startedAt) * 10) / 10,
    };
    // Observation delivery must never take down a detached promotion: a
    // throwing emit sink would otherwise turn a successful/early return into
    // an unhandled rejection on the `void` call site.
    try {
      emit(observation);
    } catch {
      /* best-effort telemetry; swallow */
    }
    return observation;
  };

  const deterministicEvidence = buildLegacyMemoryEvidence(input.item);
  const flightKey = `${deterministicEvidence.ownerId}\u0000${deterministicEvidence.id}`;
  if (inFlight.has(flightKey)) {
    return finish({ status: "in_flight" });
  }
  inFlight.add(flightKey);

  try {
    const evidenceResult = await applyLegacyMemoryEvidence(input.db, input.item);
    if (evidenceResult.status === "conflict") {
      return finish({ status: "conflict" });
    }

    const evidence = evidenceResult.evidence;
    const existing = await loadExistingContext(input.db, evidence.ownerId);
    // Defensive re-check (same shared predicate the runtime pre-selection
    // used): a concurrent turn may have covered this item between the
    // candidate pick and this run.
    const alreadyCovered = isEvidenceCoveredByCurrentStates(
      existing.states ?? [],
      evidence.id
    );
    if (alreadyCovered) {
      return finish({ status: "already_covered" });
    }

    const interpreted = await runLegacyMemoryMigrationShadow({
      item: input.item,
      provider: input.provider,
      existing,
      ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
      ...(input.now === undefined ? {} : { now: input.now }),
      ...(input.nextId ? { nextId: input.nextId } : {}),
    });

    // runLegacyMemoryMigrationShadow always carries the deterministic imported
    // Evidence so shadow candidates are self-contained. On the write path that
    // Evidence already exists by construction, and Slice 4 correctly rejects
    // duplicate Evidence ids. Strip only that one imported record; any other
    // Interpreter-produced Evidence remains part of the atomic mutation.
    const semanticMutation = withoutImportedEvidence(interpreted.mutation, evidence.id);
    if (!hasWrites(semanticMutation)) {
      // Record against the context the Interpreter actually reasoned over, so
      // the verdict expires exactly when that context changes. Only no_op is
      // suppressed; error/conflict/in_flight stay immediately retryable.
      recordNoOpSuppression(
        evidence.ownerId,
        evidence.id,
        memoryVNextContextFingerprint(existing)
      );
      return finish({ status: "no_op", action: semanticMutation.action });
    }

    await applyMemoryInterpreterMutation(input.db, evidence.ownerId, semanticMutation);
    return finish({ status: "promoted", action: semanticMutation.action });
  } catch (error) {
    return finish({ status: "error", error: shortError(error) });
  } finally {
    inFlight.delete(flightKey);
  }
};

export const isMemoryVNextLazyPromotionEnabled = (
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {}
): boolean =>
  env.NOLO_MEMORY_VNEXT_LAZY_PROMOTION === "1" ||
  env.NOLO_MEMORY_VNEXT_LAZY_PROMOTION === "true";
