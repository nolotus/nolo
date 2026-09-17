import { ulid } from "database/utils/ulid";
import {
  MEMORY_ENTITY_TYPES,
  MEMORY_RELATION_TYPES,
  type MemoryEntityType,
  type MemoryInterpreterMutation,
  type MemoryRelationType,
  type MemoryStateVNext,
} from "./types";

export interface MemoryInterpreterWireEvidence {
  key: string;
  text: string;
  confidence: number;
  sourceRef?: string;
}

export interface MemoryInterpreterWireEntity {
  /** Local key used only inside this one interpreter response. */
  key: string;
  type: MemoryEntityType;
  name: string;
  subtype?: string;
  aliases?: string[];
}

export interface MemoryInterpreterWireState {
  /** Existing persisted state id when updating; omit when creating a state. */
  stateId?: string;
  /**
   * Existing persisted state id this statement REPLACES (supersede only).
   * Mutually exclusive with stateId: supersede creates a new current State and
   * the runtime retires the named one (history stays auditable).
   */
  supersedes?: string;
  /** Existing persisted entity id OR a new entity key emitted in this response. */
  entityRef: string;
  facet: string;
  value: unknown;
  text: string;
  /** Evidence keys emitted in this same response. Existing provenance is retained by runtime. */
  evidenceRefs: string[];
}

export interface MemoryInterpreterWireRelation {
  /** Existing persisted ref OR a local entity/evidence key from this response. */
  fromRef: string;
  type: MemoryRelationType;
  /** Existing persisted ref OR a local entity/evidence key from this response. */
  toRef: string;
}

export interface MemoryInterpreterWireMutation {
  action:
    | "no_op"
    | "create"
    | "update"
    | "specialize"
    | "supersede"
    | "ambiguous";
  reason: string;
  evidence?: MemoryInterpreterWireEvidence[];
  entities?: MemoryInterpreterWireEntity[];
  states?: MemoryInterpreterWireState[];
  relations?: MemoryInterpreterWireRelation[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const isString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);
const optionalArray = <T>(value: unknown, validate: (entry: unknown) => entry is T): value is T[] | undefined =>
  value === undefined || (Array.isArray(value) && value.every(validate));

const ACTIONS = new Set([
  "no_op",
  "create",
  "update",
  "specialize",
  "supersede",
  "ambiguous",
]);

const validateEvidence = (value: unknown): value is MemoryInterpreterWireEvidence => {
  if (!isObject(value)) return false;
  return (
    isString(value.key) &&
    isString(value.text) &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    (value.sourceRef === undefined || isString(value.sourceRef))
  );
};

const validateEntity = (value: unknown): value is MemoryInterpreterWireEntity => {
  if (!isObject(value)) return false;
  return (
    isString(value.key) &&
    MEMORY_ENTITY_TYPES.includes(value.type as MemoryEntityType) &&
    isString(value.name) &&
    (value.subtype === undefined || isString(value.subtype)) &&
    (value.aliases === undefined || isStringArray(value.aliases))
  );
};

const validateState = (value: unknown): value is MemoryInterpreterWireState => {
  if (!isObject(value)) return false;
  return (
    (value.stateId === undefined || isString(value.stateId)) &&
    (value.supersedes === undefined || isString(value.supersedes)) &&
    isString(value.entityRef) &&
    isString(value.facet) &&
    "value" in value &&
    isString(value.text) &&
    isStringArray(value.evidenceRefs)
  );
};

const validateRelation = (value: unknown): value is MemoryInterpreterWireRelation => {
  if (!isObject(value)) return false;
  return (
    isString(value.fromRef) &&
    MEMORY_RELATION_TYPES.includes(value.type as MemoryRelationType) &&
    isString(value.toRef)
  );
};

const stripJsonFence = (raw: string): string => {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1]!.trim() : trimmed;
};

export const parseMemoryInterpreterWireMutation = (
  raw: string
): { ok: true; value: MemoryInterpreterWireMutation } | { ok: false; error: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    return { ok: false, error: "interpreter output is not valid JSON" };
  }
  if (!isObject(parsed)) return { ok: false, error: "interpreter output must be an object" };
  if (!isString(parsed.action) || !ACTIONS.has(parsed.action)) {
    return { ok: false, error: "invalid reconciliation action" };
  }
  if (!isString(parsed.reason)) return { ok: false, error: "reason is required" };
  if (!optionalArray(parsed.evidence, validateEvidence)) return { ok: false, error: "invalid evidence array" };
  if (!optionalArray(parsed.entities, validateEntity)) return { ok: false, error: "invalid entities array" };
  if (!optionalArray(parsed.states, validateState)) return { ok: false, error: "invalid states array" };
  if (!optionalArray(parsed.relations, validateRelation)) return { ok: false, error: "invalid relations array" };
  return { ok: true, value: parsed as unknown as MemoryInterpreterWireMutation };
};

export const buildMemoryInterpreterWireContract = (): string => `
Return ONLY one JSON object:
{
  "action": "no_op|create|update|specialize|supersede|ambiguous",
  "reason": "short explanation",
  "evidence": [{ "key": "e1", "text": "...", "confidence": 0.9, "sourceRef": "optional" }],
  "entities": [{ "key": "n1", "type": "person|organization|project|place|object|activity|concept", "name": "...", "subtype": "optional", "aliases": [] }],
  "states": [{ "stateId": "optional-existing-state-id", "supersedes": "optional-existing-state-id-this-statement-replaces", "entityRef": "existing-entity-id-or-new-entity-key", "facet": "...", "value": {}, "text": "...", "evidenceRefs": ["e1"] }],
  "relations": [{ "fromRef": "existing-id-or-local-key", "type": "related_to|part_of|uses|involves|supersedes", "toRef": "existing-id-or-local-key" }]
}

Do not generate persistent ids, owner ids, timestamps or storage keys. Runtime owns identity and time.
Use short local keys only to connect records created in the SAME response. Every local key must be unique across evidence/entities.
When updating an existing State, reuse its exact stateId, exact entityRef and exact facet. Runtime preserves that State's original entity/facet/createdAt and appends new Evidence provenance.
When creating a new State, omit stateId.
For supersede: emit the replacing statement as a NEW State (omit stateId) and set supersedes to the exact id of the replaced current State. Runtime retires the replaced State — it stays recoverable as history but is no longer current, and the new State becomes the only current one for that facet. Never update or supersede an already retired State.
supersedes and stateId are mutually exclusive on one State.
Do not emit an existing Entity again merely to update its State; reference its exact id in entityRef.
Relations may reference only known persisted Entity/State/Evidence ids or local Entity/Evidence keys emitted in the same response.
Do not invent new Entity or Relation types. Keep expressive detail in subtype/facet/value/text.
`.trim();

const assertUniqueLocalKeys = (wire: MemoryInterpreterWireMutation) => {
  const seen = new Set<string>();
  for (const item of [...(wire.evidence ?? []), ...(wire.entities ?? [])]) {
    if (seen.has(item.key)) throw new Error(`duplicate local key: ${item.key}`);
    seen.add(item.key);
  }
};

export const materializeMemoryInterpreterMutation = (input: {
  ownerId: string;
  wire: MemoryInterpreterWireMutation;
  existingStates?: MemoryStateVNext[];
  existingEntityIds?: string[];
  now?: string;
  nextId?: () => string;
}): MemoryInterpreterMutation => {
  assertUniqueLocalKeys(input.wire);
  const now = input.now ?? new Date().toISOString();
  const nextId = input.nextId ?? ulid;
  const existingStates = new Map((input.existingStates ?? []).map((state) => [state.id, state]));
  const existingStateIds = new Set(existingStates.keys());
  const existingEvidenceIds = new Set(
    [...existingStates.values()].flatMap((state) => state.evidenceIds),
  );
  const existingEntityIds = new Set(input.existingEntityIds ?? []);
  const entityRefs = new Map<string, string>();
  const evidenceRefs = new Map<string, string>();

  const evidence = (input.wire.evidence ?? []).map((item) => {
    const id = nextId();
    evidenceRefs.set(item.key, id);
    return {
      id,
      ownerId: input.ownerId,
      text: item.text,
      ...(item.sourceRef ? { sourceRef: item.sourceRef } : {}),
      confidence: item.confidence,
      createdAt: now,
    };
  });

  const entities = (input.wire.entities ?? []).map((item) => {
    const id = nextId();
    entityRefs.set(item.key, id);
    return {
      id,
      ownerId: input.ownerId,
      type: item.type,
      name: item.name,
      ...(item.subtype ? { subtype: item.subtype } : {}),
      ...(item.aliases ? { aliases: item.aliases } : {}),
      createdAt: now,
      updatedAt: now,
    };
  });

  const resolveEntityRef = (ref: string): string => {
    const created = entityRefs.get(ref);
    if (created) return created;
    if (existingEntityIds.has(ref)) return ref;
    throw new Error(`unknown entity ref: ${ref}`);
  };

  const supersededStateIds: string[] = [];

  const resolveEvidenceRef = (ref: string): string => {
    const created = evidenceRefs.get(ref);
    if (!created) throw new Error(`unknown evidence ref: ${ref}`);
    return created;
  };

  const states = (input.wire.states ?? []).map((item) => {
    const prior = item.stateId ? existingStates.get(item.stateId) : undefined;
    if (item.stateId && !prior) {
      throw new Error(`unknown existing state: ${item.stateId}`);
    }
    // A retired State is history: updating it would resurrect it as current
    // (the materialized record carries no retiredAt, silently erasing the
    // retirement marker on write).
    if (prior?.retiredAt) {
      throw new Error(`retired state cannot be updated: ${item.stateId}`);
    }
    if (prior && item.entityRef !== prior.entityId) {
      throw new Error(`existing state entityRef changed: ${item.stateId}`);
    }
    if (prior && item.facet !== prior.facet) {
      throw new Error(`existing state facet changed: ${item.stateId}`);
    }
    let supersededStateId: string | undefined;
    if (item.supersedes !== undefined) {
      if (input.wire.action !== "supersede") {
        throw new Error(
          `supersedes is only valid for the supersede action, got ${input.wire.action}`
        );
      }
      if (item.stateId !== undefined) {
        throw new Error("supersedes and stateId are mutually exclusive on one state");
      }
      // Supersede must name an existing current State; otherwise the runtime
      // would retire nothing and contradicting states would coexist.
      const superseded = existingStates.get(item.supersedes);
      if (!superseded) {
        throw new Error(`unknown superseded state id: ${item.supersedes}`);
      }
      // A retired State is already replaced history: superseding it again
      // would overwrite its audit retiredAt and put a second current State
      // next to the facet's real replacement.
      if (superseded.retiredAt) {
        throw new Error(`retired state cannot be superseded: ${item.supersedes}`);
      }
      // One State can only be retired once per mutation; a second supersede
      // of the same id is ambiguous about which replacement wins.
      if (supersededStateIds.includes(item.supersedes)) {
        throw new Error(`duplicate superseded state id: ${item.supersedes}`);
      }
      supersededStateId = item.supersedes;
    }
    const newEvidenceIds = item.evidenceRefs.map(resolveEvidenceRef);
    // Supersede always creates a fresh State (the replacement); the retired one
    // keeps its own id as recoverable history.
    const id = prior?.id ?? nextId();
    if (supersededStateId !== undefined) supersededStateIds.push(supersededStateId);
    return {
      id,
      ownerId: input.ownerId,
      entityId: prior?.entityId ?? resolveEntityRef(item.entityRef),
      facet: prior?.facet ?? item.facet,
      value: item.value,
      text: item.text,
      evidenceIds: [...new Set([...(prior?.evidenceIds ?? []), ...newEvidenceIds])],
      createdAt: prior?.createdAt ?? now,
      updatedAt: now,
    };
  });

  const resolveRelationRef = (ref: string): string => {
    const createdEntity = entityRefs.get(ref);
    if (createdEntity) return createdEntity;
    const createdEvidence = evidenceRefs.get(ref);
    if (createdEvidence) return createdEvidence;
    if (existingEntityIds.has(ref) || existingStateIds.has(ref) || existingEvidenceIds.has(ref)) {
      return ref;
    }
    throw new Error(`unknown relation ref: ${ref}`);
  };

  const relations = (input.wire.relations ?? []).map((item) => ({
    id: nextId(),
    ownerId: input.ownerId,
    from: resolveRelationRef(item.fromRef),
    type: item.type,
    to: resolveRelationRef(item.toRef),
    createdAt: now,
  }));

  return {
    action: input.wire.action,
    reason: input.wire.reason,
    ...(evidence.length ? { evidence } : {}),
    ...(entities.length ? { entities } : {}),
    ...(states.length ? { states } : {}),
    ...(supersededStateIds.length ? { supersededStateIds } : {}),
    ...(relations.length ? { relations } : {}),
  };
};
