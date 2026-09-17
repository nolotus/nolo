import {
  getMemoryEntityVNext,
  getMemoryEvidenceVNext,
  getMemoryStateVNext,
  listMemoryRelationsFromVNext,
  listMemoryRelationsToVNext,
  listMemoryStatesForEntityVNext,
} from "./store";
import type {
  MemoryEntityVNext,
  MemoryEvidenceVNext,
  MemoryRelationVNext,
  MemoryStateVNext,
} from "./types";

export interface MemoryInspectResult {
  ref: string;
  entity?: MemoryEntityVNext;
  state?: MemoryStateVNext;
  states: MemoryStateVNext[];
  evidence: MemoryEvidenceVNext[];
  relations: MemoryRelationVNext[];
  trace: {
    evidenceReads: number;
    relationCount: number;
    elapsedMs: number;
  };
}

export const inspectMemoryVNext = async (input: {
  db: any;
  ownerId: string;
  ref: string;
}): Promise<MemoryInspectResult> => {
  const startedAt = performance.now();
  const [entity, state, fromRelations, toRelations] = await Promise.all([
    getMemoryEntityVNext(input.db, input.ownerId, input.ref),
    getMemoryStateVNext(input.db, input.ownerId, input.ref),
    listMemoryRelationsFromVNext(input.db, input.ownerId, input.ref),
    listMemoryRelationsToVNext(input.db, input.ownerId, input.ref),
  ]);

  const states = entity
    ? await listMemoryStatesForEntityVNext(input.db, input.ownerId, entity.id)
    : state
      ? [state]
      : [];

  const evidenceIds = [...new Set(states.flatMap((item) => item.evidenceIds))];
  const evidenceRows = await Promise.all(
    evidenceIds.map((id) => getMemoryEvidenceVNext(input.db, input.ownerId, id)),
  );
  const evidence = evidenceRows.filter((item): item is MemoryEvidenceVNext => !!item);
  const relationById = new Map<string, MemoryRelationVNext>();
  for (const relation of [...fromRelations, ...toRelations]) relationById.set(relation.id, relation);
  const relations = [...relationById.values()];

  return {
    ref: input.ref,
    ...(entity ? { entity } : {}),
    ...(state ? { state } : {}),
    states,
    evidence,
    relations,
    trace: {
      evidenceReads: evidenceIds.length,
      relationCount: relations.length,
      elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
    },
  };
};
