import { createHash } from "crypto";
import { applyMemoryInterpreterMutation } from "./applyMutation";
import { getMemoryEvidenceVNextStrict, listMemoryStatesForEntityVNext, loadMemoryVNextCatalog } from "./store";
import type { MemoryStateVNext } from "./types";

export type WorkStatus = "active" | "paused" | "completed" | "cancelled";
/** Host constructs this after authorization of owner, space, dialog and source references. */
export interface WorkContextScope { ownerId: string; spaceId: string | null; dialogId: string }
export interface WorkContextValue {
  version: 1; revision: number; status: WorkStatus; goal: string;
  constraints: string[]; openItems: string[]; nextStep?: string;
  latestSourceRefs: string[]; spaceId: string | null; dialogIds: string[];
}
export type WorkContextPatch = Partial<Pick<WorkContextValue, "status" | "goal" | "constraints" | "openItems" | "nextStep">>;
export type WorkContextInput = ({ itemKey: string; originRef: string; activityId?: never; expectedRevision?: never } | { activityId: string; expectedRevision: number; itemKey?: never; originRef?: never }) & { changeId: string; sourceRefs: string[]; patch: WorkContextPatch };
export interface WorkContextResult { activityId: string; revision: number; outcome: "created" | "updated" | "unchanged" | "conflict" }
export interface WorkContextQuery { activityId?: string; status?: WorkStatus | "all"; query?: string; limit?: number; discovery?: "dialog" | "scope" }
export interface WorkContextItem { activityId: string; value: WorkContextValue; updatedAt: string }
export interface WorkContextPage { items: WorkContextItem[]; hasMore: boolean }
const facet = "work-context";
const statuses: WorkStatus[] = ["active", "paused", "completed", "cancelled"];
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
export const isWorkContextState = (state: Pick<MemoryStateVNext, "facet">): boolean => state.facet === facet;
const bounded = (s: unknown, max: number): s is string => typeof s === "string" && s.trim().length > 0 && s.length <= max;
const list = (x: unknown, maxCount: number, maxLength: number): x is string[] => Array.isArray(x) && x.length <= maxCount && x.every(v => bounded(v, maxLength));
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const validScope = (s: WorkContextScope) => { if (!s || !bounded(s.ownerId, 256) || !bounded(s.dialogId, 512) || !(s.spaceId === null || bounded(s.spaceId, 256))) throw new Error("invalid authorized scope"); };
function validValue(v: unknown): v is WorkContextValue {
  return object(v) && v.version === 1 && Number.isSafeInteger(v.revision) && (v.revision as number) > 0 && statuses.includes(v.status as WorkStatus) && bounded(v.goal, 4096) && list(v.constraints, 50, 2048) && list(v.openItems, 50, 2048) && (v.nextStep === undefined || (typeof v.nextStep === "string" && v.nextStep.length <= 4096)) && list(v.latestSourceRefs, 20, 2048) && v.latestSourceRefs.length > 0 && (v.spaceId === null || bounded(v.spaceId, 256)) && list(v.dialogIds, 100, 512) && v.dialogIds.length > 0;
}
function validPatch(p: WorkContextPatch) {
  if (!object(p) || Object.keys(p).some(k => !["status", "goal", "constraints", "openItems", "nextStep"].includes(k))) throw new Error("invalid patch");
  if (p.status !== undefined && !statuses.includes(p.status)) throw new Error("invalid status");
  if (p.goal !== undefined && !bounded(p.goal, 4096)) throw new Error("invalid goal");
  if (p.nextStep !== undefined && (typeof p.nextStep !== "string" || p.nextStep.length > 4096)) throw new Error("invalid nextStep");
  for (const a of [p.constraints, p.openItems]) if (a !== undefined && !list(a, 50, 2048)) throw new Error("invalid list");
}
/** Same-handle/owner coordination only. No distributed CAS or offline synchronization. */
export async function updateWorkContext(db: any, scope: WorkContextScope, input: WorkContextInput): Promise<WorkContextResult> {
  validScope(scope);
  if (!object(input) || Object.keys(input).some(k => !["activityId", "expectedRevision", "itemKey", "originRef", "changeId", "sourceRefs", "patch"].includes(k))) throw new Error("invalid input");
  validPatch(input.patch);
  if (!bounded(input.changeId, 256) || !list(input.sourceRefs, 20, 2048) || !input.sourceRefs.length) throw new Error("source and changeId required");
  const creating = input.activityId === undefined;
  if (creating && (!bounded(input.itemKey, 256) || !bounded(input.originRef, 2048) || input.expectedRevision !== undefined)) throw new Error("origin and itemKey required");
  if (!creating && (!bounded(input.activityId, 256) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision! < 1 || input.itemKey !== undefined || input.originRef !== undefined)) throw new Error("activityId and revision required");
  const activityId = creating ? `work-${hash([scope.ownerId, scope.spaceId, input.originRef, input.itemKey])}` : input.activityId!;
  const evidenceId = `work-change-${hash([activityId, input.changeId])}`;
  const fingerprint = hash([scope.spaceId, scope.dialogId, input]);
  let result!: WorkContextResult;
  await applyMemoryInterpreterMutation(db, scope.ownerId, async () => {
    const states = (await listMemoryStatesForEntityVNext(db, scope.ownerId, activityId)).filter(isWorkContextState);
    const currents = states.filter(s => !s.retiredAt);
    if (currents.length > 1 || (currents[0] && !validValue(currents[0].value))) throw new Error("invalid work context state");
    const current = currents[0];
    const old = current?.value as WorkContextValue | undefined;
    if (old && old.spaceId !== scope.spaceId) { result = { activityId, revision: 0, outcome: "conflict" }; return { action: "no_op", reason: "scope mismatch" }; }
    const receipt = await getMemoryEvidenceVNextStrict(db, scope.ownerId, evidenceId);
    if (receipt) {
      const matching = states.find(s => s.evidenceIds.includes(evidenceId));
      const savedValue = matching && validValue(matching.value) ? matching.value : undefined;
      const match = receipt.text === fingerprint && !!savedValue;
      result = { activityId, revision: match ? savedValue!.revision : old?.revision ?? 0, outcome: match ? (savedValue!.revision === 1 ? "created" : "updated") : "conflict" };
      return { action: "no_op", reason: "duplicate change" };
    }
    if ((creating && current) || (!creating && (!old || old.revision !== input.expectedRevision))) {
      result = { activityId, revision: old?.revision ?? 0, outcome: "conflict" }; return { action: "no_op", reason: "revision conflict" };
    }
    if (!old && !input.patch.goal) throw new Error("goal required");
    const status = input.patch.status ?? old?.status ?? "active";
    const dialogIds = [...new Set([...(old?.dialogIds ?? []), scope.dialogId])];
    if (dialogIds.length > 100) throw new Error("dialog association limit exceeded");
    const value: WorkContextValue = { version: 1, revision: (old?.revision ?? 0) + 1, status, goal: input.patch.goal ?? old!.goal, constraints: input.patch.constraints ?? old?.constraints ?? [], openItems: input.patch.openItems ?? old?.openItems ?? [], nextStep: input.patch.nextStep ?? old?.nextStep, latestSourceRefs: input.sourceRefs, spaceId: scope.spaceId, dialogIds };
    const unchanged = !!old && JSON.stringify([old.status, old.goal, old.constraints, old.openItems, old.nextStep]) === JSON.stringify([value.status, value.goal, value.constraints, value.openItems, value.nextStep]);
    const now = new Date().toISOString();
    result = { activityId, revision: unchanged ? old!.revision : value.revision, outcome: unchanged ? "unchanged" : old ? "updated" : "created" };
    // No semantic change: no State or Evidence receipt is created. The caller must
    // never reuse a changeId with different content, including after unchanged.
    if (unchanged) return { action: "no_op", reason: "unchanged" };
    const evidence = { id: evidenceId, ownerId: scope.ownerId, text: fingerprint, sourceRef: input.sourceRefs[0], confidence: 1, createdAt: now };
    return { action: old ? "update" : "create", reason: "work context", entities: old ? [] : [{ id: activityId, ownerId: scope.ownerId, type: "activity", subtype: facet, name: value.goal, createdAt: now, updatedAt: now }], evidence: [evidence], states: [{ id: `work-state-${hash([activityId, value.revision])}`, ownerId: scope.ownerId, entityId: activityId, facet, value, text: value.goal, evidenceIds: [evidenceId], createdAt: now, updatedAt: now }], supersededStateIds: current ? [current.id] : [] };
  });
  return result;
}
export async function readWorkContexts(db: any, scope: WorkContextScope, query: WorkContextQuery = {}): Promise<WorkContextPage> {
  validScope(scope);
  if (!object(query) || Object.keys(query).some(k => !["activityId", "status", "query", "limit", "discovery"].includes(k))) throw new Error("invalid query");
  const limit = query.limit ?? 20;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("limit must be 1..100");
  if (query.status !== undefined && query.status !== "all" && !statuses.some(status => status === query.status)) throw new Error("invalid status");
  if (query.discovery !== undefined && query.discovery !== "dialog" && query.discovery !== "scope") throw new Error("invalid discovery");
  if (query.activityId !== undefined && !bounded(query.activityId, 256)) throw new Error("invalid activityId");
  if (query.query !== undefined && !bounded(query.query, 512)) throw new Error("invalid query text");
  const states = query.activityId ? await listMemoryStatesForEntityVNext(db, scope.ownerId, query.activityId) : (await loadMemoryVNextCatalog(db, scope.ownerId)).states;
  const items: WorkContextItem[] = [];
  for (const state of states) {
    if (!isWorkContextState(state) || state.retiredAt) continue;
    if (!validValue(state.value) || !bounded(state.entityId, 256) || !bounded(state.updatedAt, 128)) throw new Error("invalid work context state");
    const value = state.value;
    if (value.spaceId !== scope.spaceId || (!query.activityId && query.discovery !== "scope" && !value.dialogIds.includes(scope.dialogId))) continue;
    if (query.status !== "all" && value.status !== (query.status ?? (query.activityId ? value.status : "active"))) continue;
    if (query.query && !JSON.stringify([value.goal, value.constraints, value.openItems, value.nextStep]).toLowerCase().includes(query.query.toLowerCase())) continue;
    items.push({ activityId: state.entityId, value, updatedAt: state.updatedAt });
  }
  items.sort((a, b) => Number(b.value.dialogIds.includes(scope.dialogId)) - Number(a.value.dialogIds.includes(scope.dialogId)) || b.updatedAt.localeCompare(a.updatedAt) || a.activityId.localeCompare(b.activityId));
  return { items: items.slice(0, limit), hasMore: items.length > limit };
}
