export const MEMORY_ENTITY_TYPES = [
  "person",
  "organization",
  "project",
  "place",
  "object",
  "activity",
  "concept",
] as const;

export type MemoryEntityType = (typeof MEMORY_ENTITY_TYPES)[number];

export const MEMORY_RELATION_TYPES = [
  "related_to",
  "part_of",
  "uses",
  "involves",
  "supersedes",
] as const;

export type MemoryRelationType = (typeof MEMORY_RELATION_TYPES)[number];

export interface MemoryEntityVNext {
  id: string;
  ownerId: string;
  type: MemoryEntityType;
  name: string;
  subtype?: string;
  aliases?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryStateVNext {
  id: string;
  ownerId: string;
  entityId: string;
  facet: string;
  value: unknown;
  /** Stable natural-language projection for semantic recall and model portability. */
  text: string;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
  /**
   * Set when a newer statement superseded this State. The record stays fully
   * readable for audit/history (recall marks it `retired` to the selector) but
   * it is no longer current for its facet.
   */
  retiredAt?: string;
}

export interface MemoryEvidenceVNext {
  id: string;
  ownerId: string;
  text: string;
  /** Pointer to dialog/message/file/etc. Source remains authoritative outside memory. */
  sourceRef?: string;
  confidence: number;
  createdAt: string;
}

/**
 * Evidence materialized from a legacy record.
 *
 * `sourceRef` is **always** present here: the legacy record it was built from is the
 * pointer, so there is no "Evidence without provenance" case on this path. That is a
 * real invariant, not an annotation convenience — Interpreter-produced Evidence keeps
 * the optional field above, while legacy import consumers may rely on the id being
 * absolute. Keeping them as one optional-field type is what let the shadow path's
 * assertion (`expect(prompt).toContain(imported.sourceRef)`) drift into a type error.
 */
export type LegacyMemoryEvidenceVNext = MemoryEvidenceVNext & { sourceRef: string };

export interface MemoryRelationVNext {
  id: string;
  ownerId: string;
  from: string;
  type: MemoryRelationType;
  to: string;
  createdAt: string;
}

export type MemoryReconciliationAction =
  | "no_op"
  | "create"
  | "update"
  | "specialize"
  | "supersede"
  | "ambiguous";

export interface MemoryInterpreterMutation {
  evidence?: MemoryEvidenceVNext[];
  entities?: MemoryEntityVNext[];
  states?: MemoryStateVNext[];
  /**
   * Persisted state ids replaced by this mutation (supersede). The runtime
   * retires them; history stays auditable and exactly one current State per
   * (entityId, facet) remains.
   */
  supersededStateIds?: string[];
  relations?: MemoryRelationVNext[];
  action: MemoryReconciliationAction;
  reason: string;
}
