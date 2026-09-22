import type { MemoryItem } from "../types";
import { applyMemoryInterpreterMutation } from "./applyMutation";
import { buildLegacyMemoryEvidence } from "./legacyMigration";
import { applyLegacyMemoryEvidence } from "./legacyMigrationApply";
import {
  runLegacyMemoryMigrationShadow,
  type LegacyMigrationExistingContext,
  type LegacyMigrationShadowProvider,
} from "./legacyMigrationShadow";
import {
  listMemoryEntitiesVNext,
  listMemoryStatesForEntityVNext,
} from "./store";
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
  action?: MemoryInterpreterMutation["action"];
  error?: string;
}

export interface MemoryVNextLazyPromotionInput {
  db: any;
  item: MemoryItem;
  provider: LegacyMigrationShadowProvider;
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

const loadExistingContext = async (
  db: any,
  ownerId: string
): Promise<LegacyMigrationExistingContext> => {
  const entities = await listMemoryEntitiesVNext(db, ownerId);
  const states = (
    await Promise.all(
      entities.map((entity) => listMemoryStatesForEntityVNext(db, ownerId, entity.id))
    )
  ).flat();
  return {
    entityIds: entities.map((entity) => entity.id),
    states,
  };
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
    const alreadyCovered = (existing.states ?? []).some(
      (state) => !state.retiredAt && state.evidenceIds.includes(evidence.id)
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
