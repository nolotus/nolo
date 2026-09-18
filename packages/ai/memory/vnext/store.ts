import type {
  MemoryEntityVNext,
  MemoryEvidenceVNext,
  MemoryRelationVNext,
  MemoryStateVNext,
} from "./types";

/**
 * Injective segment encoding for composite storage keys.
 *
 * `encodeURIComponent` alone is NOT enough here: it does not escape `-`, and
 * `-` is this store's key separator. With plain `encodeURIComponent`, the
 * segments ("user", "1-state") and ("user-1", "state") both produced the key
 * `mem2-e-user-1-state`, which (1) silently overwrote/read across owners,
 * (2) leaked `list*` prefix scans across owners, and (3) let index entries
 * overwrite each other. Re-escaping `-` to `%2D` restores injectivity: `%` is
 * escaped to `%25` by encodeURIComponent, so `%2D` in the output can only come
 * from a literal `-` input — every encoded segment is injective AND contains no
 * `-`, so joining segments back with `-` is injective again.
 */
const enc = (value: string): string =>
  encodeURIComponent(value).replace(/-/g, "%2D");
const rangeOf = (prefix: string) => ({ gte: prefix, lte: `${prefix}\uffff` });

const entityKey = (ownerId: string, id: string) => `mem2-e-${enc(ownerId)}-${enc(id)}`;
const entityOwnerPrefix = (ownerId: string) => `mem2-e-${enc(ownerId)}-`;

const stateKey = (ownerId: string, id: string) => `mem2-s-${enc(ownerId)}-${enc(id)}`;
const stateEntityIndexKey = (ownerId: string, entityId: string, stateId: string) =>
  `mem2-si-${enc(ownerId)}-${enc(entityId)}-${enc(stateId)}`;
const stateEntityIndexPrefix = (ownerId: string, entityId: string) =>
  `mem2-si-${enc(ownerId)}-${enc(entityId)}-`;

const evidenceKey = (ownerId: string, id: string) => `mem2-v-${enc(ownerId)}-${enc(id)}`;

const relationKey = (ownerId: string, id: string) => `mem2-r-${enc(ownerId)}-${enc(id)}`;
const relationFromIndexKey = (ownerId: string, from: string, relationId: string) =>
  `mem2-rf-${enc(ownerId)}-${enc(from)}-${enc(relationId)}`;
const relationToIndexKey = (ownerId: string, to: string, relationId: string) =>
  `mem2-rt-${enc(ownerId)}-${enc(to)}-${enc(relationId)}`;
const relationFromIndexPrefix = (ownerId: string, from: string) =>
  `mem2-rf-${enc(ownerId)}-${enc(from)}-`;
const relationToIndexPrefix = (ownerId: string, to: string) =>
  `mem2-rt-${enc(ownerId)}-${enc(to)}-`;

const readIndexed = async <T>(db: any, prefix: string): Promise<T[]> => {
  const refs: string[] = [];
  for await (const [, value] of db.iterator({ ...rangeOf(prefix), reverse: false })) {
    if (typeof value?.key === "string") refs.push(value.key);
  }
  const rows = await Promise.all(refs.map((key) => db.get(key).catch(() => null)));
  return rows.filter((row): row is T => !!row);
};

export const putMemoryEntityVNext = async (db: any, entity: MemoryEntityVNext): Promise<void> => {
  await db.put(entityKey(entity.ownerId, entity.id), entity);
};

export const getMemoryEntityVNext = async (
  db: any,
  ownerId: string,
  entityId: string
): Promise<MemoryEntityVNext | null> =>
  db.get(entityKey(ownerId, entityId)).catch(() => null);

export const listMemoryEntitiesVNext = async (
  db: any,
  ownerId: string
): Promise<MemoryEntityVNext[]> => {
  const rows: MemoryEntityVNext[] = [];
  for await (const [, value] of db.iterator({
    ...rangeOf(entityOwnerPrefix(ownerId)),
    reverse: false,
  })) {
    if (value) rows.push(value);
  }
  return rows;
};

export const putMemoryStateVNext = async (db: any, state: MemoryStateVNext): Promise<void> => {
  // Referential integrity: a State pointing at a missing Entity could only ever
  // be read back by id — it would be unreachable from recall/inspect with no
  // cleanup path. Fail loudly at the write instead.
  const entity = await getMemoryEntityVNext(db, state.ownerId, state.entityId);
  if (!entity) {
    throw new Error(
      `memory state ${state.id} references missing entity ${state.entityId} (owner ${state.ownerId})`
    );
  }
  // Same fail-loud rule for evidence provenance: a State referencing missing
  // Evidence would silently break the audit trail downstream (inspect filters
  // unresolvable evidence). Every id must resolve under the same owner.
  for (const evidenceId of state.evidenceIds) {
    const ev = await getMemoryEvidenceVNext(db, state.ownerId, evidenceId);
    if (!ev) {
      throw new Error(
        `memory state ${state.id} references missing evidence ${evidenceId} (owner ${state.ownerId})`
      );
    }
  }
  const key = stateKey(state.ownerId, state.id);
  const batch = db.batch();
  batch.put(key, state);
  batch.put(stateEntityIndexKey(state.ownerId, state.entityId, state.id), { key });
  await batch.write();
};

export const getMemoryStateVNext = async (
  db: any,
  ownerId: string,
  stateId: string
): Promise<MemoryStateVNext | null> =>
  db.get(stateKey(ownerId, stateId)).catch(() => null);

export const listMemoryStatesForEntityVNext = (
  db: any,
  ownerId: string,
  entityId: string
): Promise<MemoryStateVNext[]> =>
  readIndexed<MemoryStateVNext>(db, stateEntityIndexPrefix(ownerId, entityId));

/**
 * Supersede primitive: marks a State as retired in place. The record (value,
 * text, provenance) stays fully readable for audit/history — it just stops
 * being current for its facet. Retiring a missing State is a bug: throw.
 */
export const retireMemoryStateVNext = async (
  db: any,
  ownerId: string,
  stateId: string,
  retiredAt: string
): Promise<MemoryStateVNext> => {
  const existing = await getMemoryStateVNext(db, ownerId, stateId);
  if (!existing) {
    throw new Error(`cannot retire missing memory state: ${stateId} (owner ${ownerId})`);
  }
  const retired: MemoryStateVNext = { ...existing, retiredAt };
  await db.put(stateKey(ownerId, stateId), retired);
  return retired;
};

export const putMemoryEvidenceVNext = async (
  db: any,
  evidence: MemoryEvidenceVNext
): Promise<void> => {
  await db.put(evidenceKey(evidence.ownerId, evidence.id), evidence);
};

export const getMemoryEvidenceVNext = async (
  db: any,
  ownerId: string,
  evidenceId: string
): Promise<MemoryEvidenceVNext | null> =>
  db.get(evidenceKey(ownerId, evidenceId)).catch(() => null);

export const putMemoryRelationVNext = async (
  db: any,
  relation: MemoryRelationVNext
): Promise<void> => {
  // Referential integrity: relations may reference persisted Entity/State or
  // Evidence ids (same rule the wire contract enforces). An endpoint that
  // resolves to nothing would make the relation unreachable from traversal.
  for (const [side, ref] of [
    ["from", relation.from],
    ["to", relation.to],
  ] as const) {
    const resolved =
      (await getMemoryEntityVNext(db, relation.ownerId, ref)) ??
      (await getMemoryStateVNext(db, relation.ownerId, ref)) ??
      (await getMemoryEvidenceVNext(db, relation.ownerId, ref));
    if (!resolved) {
      throw new Error(
        `memory relation ${relation.id} references missing ${side} ${ref} (owner ${relation.ownerId})`
      );
    }
  }
  const key = relationKey(relation.ownerId, relation.id);
  const batch = db.batch();
  batch.put(key, relation);
  batch.put(relationFromIndexKey(relation.ownerId, relation.from, relation.id), { key });
  batch.put(relationToIndexKey(relation.ownerId, relation.to, relation.id), { key });
  await batch.write();
};

export const listMemoryRelationsFromVNext = (
  db: any,
  ownerId: string,
  from: string
): Promise<MemoryRelationVNext[]> =>
  readIndexed<MemoryRelationVNext>(db, relationFromIndexPrefix(ownerId, from));

export const listMemoryRelationsToVNext = (
  db: any,
  ownerId: string,
  to: string
): Promise<MemoryRelationVNext[]> =>
  readIndexed<MemoryRelationVNext>(db, relationToIndexPrefix(ownerId, to));

export const __test__ = {
  entityKey,
  stateKey,
  evidenceKey,
  relationKey,
};
