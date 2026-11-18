import type {
  MemoryItem,
  MemoryKind,
  MemoryOwnerRef,
  MemoryProvenance,
  MemorySourceKind,
  MemorySubjectType,
  MemoryVisibility,
} from "../types";
import { deriveStateResident } from "./pureVNextRuntime";
import { getMemoryEvidenceVNext, loadMemoryVNextCatalog } from "./store";
import type { MemoryEvidenceVNext, MemoryStateVNext } from "./types";
import { isWorkContextState, type WorkStatus } from "./workContext";

export interface ManageableMemoryItem extends Omit<MemoryItem, "facet"> {
  facet: string;
  updatedAt: string;
}

export interface ManageableWorkItem {
  id: string;
  activityId: string;
  status: WorkStatus;
  goal: string;
  constraints: string[];
  openItems: string[];
  nextStep?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  spaceId: string | null;
  dialogIds: string[];
  latestSourceRefs: string[];
}

const ALLOWED_KINDS = new Set<MemoryKind>(["episodic", "semantic", "procedural"]);
const ALLOWED_SUBJECT_TYPES = new Set<MemorySubjectType>([
  "user",
  "agent",
  "space",
  "project",
  "system",
]);
const ALLOWED_VISIBILITIES = new Set<MemoryVisibility>([
  "private",
  "shared",
  "public",
]);
const ALLOWED_PROVENANCES = new Set<MemoryProvenance>([
  "verified",
  "stated",
  "inferred",
]);
const ALLOWED_SOURCE_KINDS = new Set<MemorySourceKind>([
  "explicit-user-directive",
  "agent-tool",
  "inferred-understanding",
  "dialog-learning",
]);
const ALLOWED_WORK_STATUSES = new Set<WorkStatus>([
  "active",
  "paused",
  "completed",
  "cancelled",
]);
const EPISODIC_FACETS = new Set(["tension", "unfinished"]);

const toPrincipalId = (owner: MemoryOwnerRef): string =>
  `${owner.ownerType}:${encodeURIComponent(owner.ownerId)}`;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];

const resolveKind = (facet: string, rawKind: unknown): MemoryKind => {
  if (typeof rawKind === "string" && ALLOWED_KINDS.has(rawKind as MemoryKind)) {
    return rawKind as MemoryKind;
  }
  return EPISODIC_FACETS.has(facet) ? "episodic" : "semantic";
};

const pickLatestEvidence = (
  state: MemoryStateVNext,
  evidenceMap: ReadonlyMap<string, MemoryEvidenceVNext>
): MemoryEvidenceVNext | undefined => {
  for (let i = state.evidenceIds.length - 1; i >= 0; i--) {
    const found = evidenceMap.get(state.evidenceIds[i]);
    if (found) return found;
  }
  return undefined;
};

const loadEvidenceForStates = async (
  db: any,
  principalId: string,
  states: readonly MemoryStateVNext[]
): Promise<Map<string, MemoryEvidenceVNext>> => {
  const neededIds = new Set<string>();
  for (const state of states) {
    const v = asObject(state.value);
    const hasConfidence =
      typeof v.confidence === "number" && Number.isFinite(v.confidence);
    const hasProvenance =
      typeof v.provenance === "string" &&
      ALLOWED_PROVENANCES.has(v.provenance as MemoryProvenance);
    const hasSourceKind =
      typeof v.sourceKind === "string" &&
      ALLOWED_SOURCE_KINDS.has(v.sourceKind as MemorySourceKind);
    if ((!hasConfidence || !hasProvenance || !hasSourceKind) && state.evidenceIds.length > 0) {
      const latestId = state.evidenceIds[state.evidenceIds.length - 1];
      if (latestId) neededIds.add(latestId);
    }
  }
  const map = new Map<string, MemoryEvidenceVNext>();
  if (neededIds.size === 0) return map;
  const rows = await Promise.all(
    [...neededIds].map(async (id) => ({
      id,
      evidence: await getMemoryEvidenceVNext(db, principalId, id),
    }))
  );
  for (const row of rows) {
    if (row.evidence) map.set(row.id, row.evidence);
  }
  return map;
};

/**
 * Project all non-retired, non-work-context active vNext states for an owner
 * (both explicit-memory and interpreter-promoted facets such as preference,
 * goal, style, tension, unfinished).
 */
export async function loadManageableMemoryItems(
  db: any,
  owner: MemoryOwnerRef
): Promise<ManageableMemoryItem[]> {
  const principalId = toPrincipalId(owner);
  const catalog = await loadMemoryVNextCatalog(db, principalId);
  const activeStates = catalog.states.filter(
    (state) => !state.retiredAt && !isWorkContextState(state)
  );
  const evidenceMap = await loadEvidenceForStates(db, principalId, activeStates);

  return activeStates.flatMap((state): ManageableMemoryItem[] => {
    const v = asObject(state.value);
    if (state.facet === "explicit-memory") {
      if (!ALLOWED_KINDS.has(String(v.kind) as MemoryKind)) return [];
    } else if (typeof state.text !== "string" || state.text.trim().length === 0) {
      return [];
    }

    const latestEvidence = pickLatestEvidence(state, evidenceMap);
    const kind = resolveKind(state.facet, v.kind);
    const subjectType = ALLOWED_SUBJECT_TYPES.has(v.subjectType as MemorySubjectType)
      ? (v.subjectType as MemorySubjectType)
      : "user";
    const subjectId =
      typeof v.subjectId === "string" && v.subjectId.trim().length > 0
        ? v.subjectId.trim()
        : owner.ownerId;
    const visibility = ALLOWED_VISIBILITIES.has(v.visibility as MemoryVisibility)
      ? (v.visibility as MemoryVisibility)
      : "private";
    const importance =
      typeof v.importance === "number" && Number.isFinite(v.importance)
        ? v.importance
        : state.facet === "explicit-memory"
          ? 0
          : 0.8;
    const confidence =
      typeof v.confidence === "number" && Number.isFinite(v.confidence)
        ? v.confidence
        : typeof latestEvidence?.confidence === "number" &&
            Number.isFinite(latestEvidence.confidence)
          ? latestEvidence.confidence
          : state.facet === "explicit-memory"
            ? 0
            : 0.8;
    const provenance: MemoryProvenance | undefined = ALLOWED_PROVENANCES.has(
      v.provenance as MemoryProvenance
    )
      ? (v.provenance as MemoryProvenance)
      : latestEvidence?.provenance &&
          ALLOWED_PROVENANCES.has(latestEvidence.provenance)
        ? latestEvidence.provenance
        : latestEvidence?.nativeCapture
          ? "inferred"
          : undefined;
    const sourceKind: MemorySourceKind = ALLOWED_SOURCE_KINDS.has(
      v.sourceKind as MemorySourceKind
    )
      ? (v.sourceKind as MemorySourceKind)
      : state.facet === "explicit-memory"
        ? "explicit-user-directive"
        : latestEvidence?.nativeCapture
          ? "dialog-learning"
          : "inferred-understanding";
    const resident =
      state.facet === "explicit-memory"
        ? v.resident === true
        : deriveStateResident(state, owner.ownerType);

    return [
      {
        id: `vnext-state-${state.id}`,
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        content: state.text,
        facet: state.facet,
        kind,
        subjectType,
        subjectId,
        visibility,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt || state.createdAt,
        lastActivatedAt: state.createdAt,
        activationCount: 0,
        importance,
        confidence,
        ...(resident ? { resident: true } : {}),
        ...(Array.isArray(v.tags) ? { tags: asStringArray(v.tags) } : {}),
        ...(typeof v.patternKey === "string" ? { patternKey: v.patternKey } : {}),
        ...(typeof v.recurrenceEvidence === "string"
          ? { recurrenceEvidence: v.recurrenceEvidence }
          : {}),
        ...(provenance ? { provenance } : {}),
        sourceKind,
        ...(typeof v.sourceDialogId === "string"
          ? { sourceDialogId: v.sourceDialogId }
          : {}),
      },
    ];
  });
}

/**
 * Project all non-retired `work-context` vNext states for an owner.
 */
export async function loadManageableWorkItems(
  db: any,
  owner: MemoryOwnerRef
): Promise<ManageableWorkItem[]> {
  const principalId = toPrincipalId(owner);
  const catalog = await loadMemoryVNextCatalog(db, principalId);
  return catalog.states.flatMap((state): ManageableWorkItem[] => {
    if (state.retiredAt || !isWorkContextState(state)) return [];
    const v = asObject(state.value);
    const status = ALLOWED_WORK_STATUSES.has(v.status as WorkStatus)
      ? (v.status as WorkStatus)
      : "active";
    const goal =
      typeof v.goal === "string" && v.goal.trim().length > 0
        ? v.goal
        : state.text;
    if (!goal || !goal.trim()) return [];
    const revision =
      typeof v.revision === "number" &&
      Number.isSafeInteger(v.revision) &&
      v.revision > 0
        ? v.revision
        : 1;
    return [
      {
        id: `vnext-state-${state.id}`,
        activityId: state.entityId,
        status,
        goal,
        constraints: asStringArray(v.constraints),
        openItems: asStringArray(v.openItems),
        ...(typeof v.nextStep === "string" && v.nextStep.trim().length > 0
          ? { nextStep: v.nextStep }
          : {}),
        revision,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt || state.createdAt,
        spaceId:
          typeof v.spaceId === "string" && v.spaceId.trim().length > 0
            ? v.spaceId
            : null,
        dialogIds: asStringArray(v.dialogIds),
        latestSourceRefs: asStringArray(v.latestSourceRefs),
      },
    ];
  });
}
