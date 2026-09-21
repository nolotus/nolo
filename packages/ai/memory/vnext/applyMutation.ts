import type {
  MemoryEntityVNext,
  MemoryEvidenceVNext,
  MemoryInterpreterMutation,
  MemoryRelationVNext,
  MemoryStateVNext,
} from "./types";

import {
  getMemoryEntityVNext,
  getMemoryEvidenceVNext,
  getMemoryStateVNext,
  listMemoryStatesForEntityVNext,
  _appendEntityBatch,
  _appendEvidenceBatch,
  _appendStateBatch,
  _appendRetiredStateBatch,
  _appendRelationBatch,
} from "./store";

/**
 * Memory vNext Slice 4 — atomic mutation apply.
 *
 * Two-phase contract:
 *   Phase A (validate): read-only. Collects every violation before any write.
 *   Phase B (apply):    appends all writes to one db.batch(), then a single
 *                        batch.write() commits atomically.
 *
 * Atomicity comes from LevelDB's chained batch write — "all operations will be
 * written atomically, that is, they will either all succeed or fail with no
 * partial commits" (abstract-level). We do NOT add application-level rollback,
 * CAS, locks, or retry frameworks.
 *
 * This is the generic vNext mutation apply entry point. It is NOT the
 * deterministic legacy Evidence import seam (legacyMigrationApply.ts) and does
 * NOT handle runtime/recall integration.
 */

// ── Validation ──

type PendingRefs = {
  evidenceIds: Set<string>;
  entityIds: Set<string>;
  stateIds: Set<string>;
  relationIds: Set<string>;
};

/**
 * Validate the entire mutation without writing anything.
 * Throws on the first violation found.
 */
async function validateMutation(
  db: any,
  ownerId: string,
  mutation: MemoryInterpreterMutation
): Promise<void> {
  const pending: PendingRefs = {
    evidenceIds: new Set(),
    entityIds: new Set(),
    stateIds: new Set(),
    relationIds: new Set(),
  };

  // Collect pending ids for cross-reference validation.
  for (const ev of mutation.evidence ?? []) {
    if (!ev.id || typeof ev.id !== "string") {
      throw new Error("evidence id must be a non-empty string");
    }
    if (pending.evidenceIds.has(ev.id)) {
      throw new Error(`duplicate evidence id in mutation: ${ev.id}`);
    }
    pending.evidenceIds.add(ev.id);
  }
  for (const ent of mutation.entities ?? []) {
    if (!ent.id || typeof ent.id !== "string") {
      throw new Error("entity id must be a non-empty string");
    }
    if (pending.entityIds.has(ent.id)) {
      throw new Error(`duplicate entity id in mutation: ${ent.id}`);
    }
    pending.entityIds.add(ent.id);
  }
  for (const st of mutation.states ?? []) {
    if (!st.id || typeof st.id !== "string") {
      throw new Error("state id must be a non-empty string");
    }
    if (pending.stateIds.has(st.id)) {
      throw new Error(`duplicate state id in mutation: ${st.id}`);
    }
    pending.stateIds.add(st.id);
  }
  for (const rel of mutation.relations ?? []) {
    if (!rel.id || typeof rel.id !== "string") {
      throw new Error("relation id must be a non-empty string");
    }
    if (pending.relationIds.has(rel.id)) {
      throw new Error(`duplicate relation id in mutation: ${rel.id}`);
    }
    pending.relationIds.add(rel.id);
  }

  // Duplicate supersededStateIds
  const supersededIds = new Set<string>();
  for (const sid of mutation.supersededStateIds ?? []) {
    if (supersededIds.has(sid)) {
      throw new Error(`duplicate supersededStateId in mutation: ${sid}`);
    }
    supersededIds.add(sid);
  }

  // Owner consistency: every record must belong to the apply ownerId.
  for (const ev of mutation.evidence ?? []) {
    if (ev.ownerId !== ownerId) {
      throw new Error(
        `evidence ${ev.id} has ownerId ${ev.ownerId}, expected ${ownerId}`
      );
    }
  }
  for (const ent of mutation.entities ?? []) {
    if (ent.ownerId !== ownerId) {
      throw new Error(
        `entity ${ent.id} has ownerId ${ent.ownerId}, expected ${ownerId}`
      );
    }
  }
  for (const st of mutation.states ?? []) {
    if (st.ownerId !== ownerId) {
      throw new Error(
        `state ${st.id} has ownerId ${st.ownerId}, expected ${ownerId}`
      );
    }
  }
  for (const rel of mutation.relations ?? []) {
    if (rel.ownerId !== ownerId) {
      throw new Error(
        `relation ${rel.id} has ownerId ${rel.ownerId}, expected ${ownerId}`
      );
    }
  }

  // A State id must not appear in both `states` (as a new/updated record) and
  // `supersededStateIds` (as a record to retire). That would write the same key
  // twice in one batch — the second put silently wins, which is a contract bug.
  for (const st of mutation.states ?? []) {
    if (supersededIds.has(st.id)) {
      throw new Error(
        `state ${st.id} appears in both states and supersededStateIds; ` +
        `a record cannot be created and retired in the same mutation`
      );
    }
  }

  // (entityId, facet) uniqueness within mutation — only one current State per slot.
  const facetSlots = new Set<string>();
  for (const st of mutation.states ?? []) {
    const slot = `${st.entityId} ${st.facet}`;
    if (facetSlots.has(slot)) {
      throw new Error(
        `mutation writes parallel current states for entity ${st.entityId} facet ${st.facet}`
      );
    }
    facetSlots.add(slot);
  }

  // Validate Evidence: check for conflicts with existing DB records.
  for (const ev of mutation.evidence ?? []) {
    const existing = await getMemoryEvidenceVNext(db, ownerId, ev.id);
    if (existing) {
      throw new Error(
        `evidence ${ev.id} already exists (owner ${ownerId}); use a unique id`
      );
    }
  }

  // Validate Entity: check for conflicts with existing DB records.
  for (const ent of mutation.entities ?? []) {
    const existing = await getMemoryEntityVNext(db, ownerId, ent.id);
    if (existing) {
      throw new Error(
        `entity ${ent.id} already exists (owner ${ownerId}); use a unique id`
      );
    }
  }

  // Validate State references: entity + evidence must resolve (DB or pending).
  for (const st of mutation.states ?? []) {
    // Entity must exist in DB or be created in this mutation.
    if (!pending.entityIds.has(st.entityId)) {
      const entity = await getMemoryEntityVNext(db, ownerId, st.entityId);
      if (!entity) {
        throw new Error(
          `memory state ${st.id} references missing entity ${st.entityId} (owner ${ownerId})`
        );
      }
    }
    // Every evidenceId must exist in DB or be created in this mutation.
    for (const evidenceId of st.evidenceIds) {
      if (!pending.evidenceIds.has(evidenceId)) {
        const ev = await getMemoryEvidenceVNext(db, ownerId, evidenceId);
        if (!ev) {
          throw new Error(
            `memory state ${st.id} references missing evidence ${evidenceId} (owner ${ownerId})`
          );
        }
      }
    }
    // If the State id already exists in DB, this must be an update (same id reuse).
    // New states with existing ids are rejected as duplicates.
    const existing = await getMemoryStateVNext(db, ownerId, st.id);
    if (existing) {
      // Allow update only if the existing state is not retired.
      if (existing.retiredAt) {
        throw new Error(
          `cannot update retired memory state ${st.id} (owner ${ownerId})`
        );
      }
      // If the existing state has a different (entityId, facet), it's a conflict —
      // updating a state to point at a different entity/facet is not supported
      // by the current contract. The materializer should use supersede instead.
      if (existing.entityId !== st.entityId || existing.facet !== st.facet) {
        throw new Error(
          `state ${st.id} already exists with different entity/facet ` +
          `(${existing.entityId}/${existing.facet} vs ${st.entityId}/${st.facet}); ` +
          `use supersede instead`
        );
      }
    }
    // Check (entityId, facet) conflict: if we're creating a NEW state for a slot
    // that already has a current state in DB, that's a conflict unless the
    // existing state is being superseded in this same mutation.
    if (!existing) {
      // Check if there's already a current state for this (entityId, facet) in DB.
      const existingStates = await listMemoryStatesForEntityVNext(db, ownerId, st.entityId);
      for (const es of existingStates) {
        if (es.facet === st.facet && !es.retiredAt) {
          // There's already a current state for this slot. It must be superseded
          // in this mutation.
          if (!supersededIds.has(es.id)) {
            throw new Error(
              `entity ${st.entityId} facet ${st.facet} already has current state ${es.id}; ` +
              `supersede it or use a different facet`
            );
          }
        }
      }
    }
  }

  // Validate supersededStateIds: each must exist, belong to owner, not be retired,
  // and have a replacement state in this mutation.
  for (const sid of mutation.supersededStateIds ?? []) {
    const existing = await getMemoryStateVNext(db, ownerId, sid);
    if (!existing) {
      throw new Error(
        `cannot supersede missing memory state: ${sid} (owner ${ownerId})`
      );
    }
    if (existing.retiredAt) {
      throw new Error(
        `cannot supersede already retired memory state: ${sid} (owner ${ownerId})`
      );
    }
    // Check that a replacement state exists in this mutation.
    const replacement = (mutation.states ?? []).find(
      (st) => st.entityId === existing.entityId && st.facet === existing.facet
    );
    if (!replacement) {
      throw new Error(
        `superseded state ${sid} (entity ${existing.entityId} facet ${existing.facet}) ` +
        `has no replacement in this mutation`
      );
    }
  }

  // Validate Relation endpoints: from/to must resolve to Entity/State/Evidence.
  for (const rel of mutation.relations ?? []) {
    for (const [side, ref] of [
      ["from", rel.from],
      ["to", rel.to],
    ] as const) {
      // Check pending first (mutation-local refs).
      if (pending.entityIds.has(ref) || pending.stateIds.has(ref) || pending.evidenceIds.has(ref)) {
        continue;
      }
      // Check DB.
      const resolved =
        (await getMemoryEntityVNext(db, ownerId, ref)) ??
        (await getMemoryStateVNext(db, ownerId, ref)) ??
        (await getMemoryEvidenceVNext(db, ownerId, ref));
      if (!resolved) {
        throw new Error(
          `memory relation ${rel.id} references missing ${side} ${ref} (owner ${ownerId})`
        );
      }
    }
  }
}

// ── Public API ──

/**
 * Apply a fully materialized MemoryInterpreterMutation atomically.
 *
 * Phase A: validates the entire mutation (all references resolvable, owner
 * consistent, no duplicates, supersede contracts satisfied). Zero writes.
 *
 * Phase B: appends all writes to a single db.batch(), then calls batch.write()
 * exactly once. If validation fails, nothing is written. If batch.write()
 * fails, the error propagates — no partial commit, no rollback.
 *
 * @param db       Level-compatible DB handle (must have .batch() → {put,del,write})
 * @param ownerId  The owner principal — all records must belong to this owner
 * @param mutation The materialized interpreter output to persist
 */
export const applyMemoryInterpreterMutation = async (
  db: any,
  ownerId: string,
  mutation: MemoryInterpreterMutation
): Promise<void> => {
  // Phase A — validate (zero writes)
  await validateMutation(db, ownerId, mutation);

  // Phase B — build one batch, write once
  const batch = db.batch();

  // Evidence
  for (const ev of mutation.evidence ?? []) {
    _appendEvidenceBatch(batch, ev);
  }

  // Entities
  for (const ent of mutation.entities ?? []) {
    _appendEntityBatch(batch, ent);
  }

  // New States
  for (const st of mutation.states ?? []) {
    _appendStateBatch(batch, st);
  }

  // Retire superseded states (read old, construct retired copy, append to batch)
  for (const sid of mutation.supersededStateIds ?? []) {
    const existing = await getMemoryStateVNext(db, ownerId, sid);
    if (!existing) {
      // Should not reach here — validation already checked — but defensive.
      throw new Error(
        `cannot supersede missing memory state: ${sid} (owner ${ownerId})`
      );
    }
    // Find the replacement state for this specific (entityId, facet) slot.
    // Validation already confirmed one exists.
    const replacement = (mutation.states ?? []).find(
      (st) => st.entityId === existing.entityId && st.facet === existing.facet
    );
    const retired: MemoryStateVNext = {
      ...existing,
      retiredAt: replacement?.updatedAt ?? new Date().toISOString(),
    };
    _appendRetiredStateBatch(batch, retired);
  }

  // Relations
  for (const rel of mutation.relations ?? []) {
    _appendRelationBatch(batch, rel);
  }

  // Single atomic commit
  await batch.write();
};
