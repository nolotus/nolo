import type { MemoryItem } from "../types";
import { buildMemoryVNextInterpreterPrompt } from "./interpreterPrompt";
import {
  materializeMemoryInterpreterMutation,
  parseMemoryInterpreterWireMutation,
  type MemoryInterpreterWireMutation,
} from "./interpreterWireProtocol";
import {
  buildLegacyMemoryEvidence,
  resolveLegacyMemoryPrincipal,
  type LegacyMemoryPrincipal,
} from "./legacyMigration";
import type {
  MemoryEvidenceVNext,
  MemoryInterpreterMutation,
  MemoryReconciliationAction,
  MemoryStateVNext,
} from "./types";

/**
 * Migration Slice 2: shadow Interpreter for one legacy record.
 *
 * Flow (no production write anywhere on this path):
 *
 *   legacy MemoryItem
 *     -> deterministic MemoryEvidenceVNext   (legacyMigration.ts)
 *     -> migration Interpreter context       (this file)
 *     -> existing vNext wire parser          (interpreterWireProtocol.ts)
 *     -> materialize(referenceableEvidenceIds=[imported.id])
 *     -> candidate mutation                  (returned, never persisted)
 *
 * The caller must explicitly supply the provider and (optionally) the existing
 * context snapshot: this module imports no production runtime, no default DB and
 * no benchmark harness, so a shadow run cannot read or write production memory.
 */

/**
 * Narrow text-completion port. A benchmark provider
 * (`MemoryBenchmarkTextProvider`) structurally satisfies it, but nothing here
 * depends on the benchmark layer.
 */
export interface LegacyMigrationShadowProvider {
  model?: string;
  complete(
    messages: Array<{ role: "system" | "user"; content: string }>,
    options?: { timeoutMs?: number }
  ): Promise<{ content: string }>;
}

/**
 * Shadow snapshot for one principal, supplied by the caller. Omitted fields
 * mean "this principal has no vNext memory yet".
 */
export interface LegacyMigrationExistingContext {
  entityIds?: readonly string[];
  states?: readonly MemoryStateVNext[];
}

export interface LegacyMigrationShadowInput {
  item: MemoryItem;
  /** Explicitly supplied model provider. */
  provider: LegacyMigrationShadowProvider;
  /** Explicitly supplied shadow snapshot; never read from production. */
  existing?: LegacyMigrationExistingContext;
  timeoutMs?: number;
  now?: string;
  nextId?: () => string;
}

export interface LegacyMigrationShadowResult {
  principal: LegacyMemoryPrincipal;
  /** Deterministic imported Evidence — present even when the action is `no_op`. */
  evidence: MemoryEvidenceVNext;
  /** Raw parsed wire response, kept for auditing what the model actually said. */
  wire: MemoryInterpreterWireMutation;
  /** Candidate mutation. Not persisted by this module. */
  mutation: MemoryInterpreterMutation;
  action: MemoryReconciliationAction;
  reason: string;
}

/**
 * Legacy ontology is advisory context for the model, never a mapping table and
 * never part of Evidence: `kind` / `subjectType` / `visibility` describe the old
 * store, not the vNext contract.
 */
export const LEGACY_MIGRATION_SHADOW_INSTRUCTION = `
This Evidence came from a legacy memory record.
Legacy kind and subject metadata are advisory hints only.
Re-evaluate it under the current vNext contract.
Do not mechanically map:
- semantic -> State
- procedural -> procedure State
- subjectType=agent -> agent Entity
- visibility -> scope
Prefer Evidence-only when durable semantic value is unclear.
`.trim();

const serializeExisting = (existing: LegacyMigrationExistingContext | undefined): string =>
  JSON.stringify({
    entityIds: existing?.entityIds ?? [],
    states: (existing?.states ?? []).map((state) => ({
      stateId: state.id,
      entityId: state.entityId,
      facet: state.facet,
      text: state.text,
    })),
  });

export const buildLegacyMigrationInterpreterInput = (input: {
  item: MemoryItem;
  evidence: MemoryEvidenceVNext;
  existing?: LegacyMigrationExistingContext;
}): string =>
  [
    LEGACY_MIGRATION_SHADOW_INSTRUCTION,
    `The legacy record's Evidence is marked referenceable with id "${input.evidence.id}" and sourceRef "${input.evidence.sourceRef}". Evidence ids marked referenceable in the supplied memory context may be referenced directly. When a State cites it, reference that exact id in evidenceRefs. Do not emit another Evidence for this legacy record.`,
    `Imported Evidence (text is the authoritative legacy content, referenceable directly):\n${JSON.stringify(
      {
        ...input.evidence,
        referenceable: true,
      },
      null,
      2
    )}`,
    `Legacy metadata (advisory hints only, NOT vNext semantics):\n${JSON.stringify(
      {
        kind: input.item.kind,
        visibility: input.item.visibility,
        subjectType: input.item.subjectType,
        subjectId: input.item.subjectId,
        facet: input.item.facet,
        importance: input.item.importance,
        resident: input.item.resident,
      },
      null,
      2
    )}`,
    `Existing vNext context for this principal (caller-supplied shadow snapshot):\n${serializeExisting(
      input.existing
    )}`,
  ].join("\n\n");

/**
 * The migration result must carry the deterministic imported Evidence even when
 * the Interpreter chose `no_op` (`no durable State change != no Evidence`), and
 * one legacy record must never become two records. A model that re-emits the
 * same legacy record as a fresh local Evidence is folded back onto the
 * deterministic id rather than minting a second copy.
 */
const mergeImportedEvidence = (
  mutation: MemoryInterpreterMutation,
  imported: MemoryEvidenceVNext
): MemoryInterpreterMutation => {
  const emitted = mutation.evidence ?? [];
  const duplicatedIds = new Set(
    emitted
      .filter(
        (item) =>
          item.sourceRef === imported.sourceRef ||
          // A re-emitted copy that drops sourceRef is still the same legacy record:
          // text equality is the only identity left on the wire to catch it.
          (item.sourceRef === undefined && item.text === imported.text)
      )
      .map((item) => item.id)
  );
  const rewrite = (id: string): string => (duplicatedIds.has(id) ? imported.id : id);

  return {
    ...mutation,
    evidence: [imported, ...emitted.filter((item) => !duplicatedIds.has(item.id))],
    ...(mutation.states
      ? {
          states: mutation.states.map((state) => ({
            ...state,
            evidenceIds: [...new Set(state.evidenceIds.map(rewrite))],
          })),
        }
      : {}),
    ...(mutation.relations
      ? {
          relations: mutation.relations.map((relation) => ({
            ...relation,
            from: rewrite(relation.from),
            to: rewrite(relation.to),
          })),
        }
      : {}),
  };
};

export const runLegacyMemoryMigrationShadow = async (
  input: LegacyMigrationShadowInput
): Promise<LegacyMigrationShadowResult> => {
  const principal = resolveLegacyMemoryPrincipal(input.item);
  const evidence = buildLegacyMemoryEvidence(input.item);

  // Deliberately single-shot: a shadow run must fail loudly on an unparsable
  // response instead of silently substituting a no_op, so a broken prompt or a
  // broken model shows up as a failure rather than as "nothing to migrate".
  const completion = await input.provider.complete(
    [
      { role: "system", content: buildMemoryVNextInterpreterPrompt() },
      {
        role: "user",
        content: buildLegacyMigrationInterpreterInput({
          item: input.item,
          evidence,
          ...(input.existing ? { existing: input.existing } : {}),
        }),
      },
    ],
    input.timeoutMs === undefined ? undefined : { timeoutMs: input.timeoutMs }
  );

  const parsed = parseMemoryInterpreterWireMutation(completion.content);
  if (!parsed.ok) {
    throw new Error(`legacy migration shadow: unparsable interpreter response (${parsed.error})`);
  }

  const candidate = materializeMemoryInterpreterMutation({
    // The principal identity (user:/space:/system:<id>) is the migration owner
    // space, so a space migration can never land in a user space.
    ownerId: evidence.ownerId,
    wire: parsed.value,
    ...(input.existing?.states ? { existingStates: [...input.existing.states] } : {}),
    ...(input.existing?.entityIds ? { existingEntityIds: [...input.existing.entityIds] } : {}),
    referenceableEvidenceIds: [evidence.id],
    ...(input.now === undefined ? {} : { now: input.now }),
    ...(input.nextId ? { nextId: input.nextId } : {}),
  });

  const mutation = mergeImportedEvidence(candidate, evidence);

  return {
    principal,
    evidence,
    wire: parsed.value,
    mutation,
    action: mutation.action,
    reason: mutation.reason,
  };
};
