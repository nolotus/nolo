import { createHash } from "crypto";
import type { MemoryItem } from "../types";
import { applyMemoryInterpreterMutation } from "./applyMutation";
import { getMemoryEntityVNext, getMemoryStateVNext, getMemoryEvidenceVNextStrict } from "./store";

/** Explicit saves are native vNext writes, not a legacy migration or dual write. */
export async function rememberExplicitVNext(db: any, item: MemoryItem): Promise<MemoryItem> {
  const ownerId = `${item.ownerType}:${encodeURIComponent(item.ownerId)}`;
  const digest = createHash("sha256").update(JSON.stringify([
    ownerId, item.subjectType, item.subjectId, item.kind, item.content,
  ])).digest("hex");
  const entityId = `explicit-${digest}`;
  const stateId = `explicit-${digest}`;
  let saved!: MemoryItem;
  await applyMemoryInterpreterMutation(db, ownerId, async () => {
    const existing = await getMemoryStateVNext(db, ownerId, stateId);
    if (existing?.retiredAt) throw new Error("Explicit memory conflicts with a retired state");
    const entity = await getMemoryEntityVNext(db, ownerId, entityId);
    const createdAt = existing?.createdAt ?? item.createdAt;
    const oldValue = existing?.value && typeof existing.value === "object"
      ? existing.value as Record<string, unknown> : {};
    // State retains the existing max aggregation; evidence describes only this write.
    const confidence = Math.max(Number(oldValue.confidence) || 0, item.confidence ?? 0);
    const resident = oldValue.resident === true || item.resident === true;
    const evidenceId = `explicit-${digest}-${createHash("sha256").update(JSON.stringify([
      item.confidence, item.sourceDialogId ?? null, item.provenance ?? null,
    ])).digest("hex").slice(0, 24)}`;
    const evidence = await getMemoryEvidenceVNextStrict(db, ownerId, evidenceId);
    saved = { ...item, id: `vnext-state-${stateId}`, createdAt, confidence,
      ...(resident ? { resident: true } : {}) };
    return {
      action: existing ? "update" : "create",
      reason: "Explicit memory save",
      entities: entity ? [] : [{
        id: entityId, ownerId, type: "concept", name: item.content,
        createdAt, updatedAt: createdAt,
      }],
      evidence: evidence ? [] : [{
        id: evidenceId, ownerId, text: item.content, confidence: item.confidence,
        ...(item.provenance ? { provenance: item.provenance } : {}),
        sourceRef: item.sourceDialogId ? `dialog:${item.sourceDialogId}` : `explicit:${digest}`,
        createdAt,
      }],
      states: [{
        id: stateId, ownerId, entityId, facet: "explicit-memory", text: item.content,
        value: { ...oldValue, kind: item.kind, subjectType: item.subjectType,
          subjectId: item.subjectId, confidence, resident, visibility: item.visibility,
          tags: item.tags, importance: item.importance, patternKey: item.patternKey, recurrenceEvidence: item.recurrenceEvidence,
          provenance: item.provenance, sourceKind: item.sourceKind, sourceDialogId: item.sourceDialogId },
        evidenceIds: [...new Set([...(existing?.evidenceIds ?? []), evidenceId])],
        createdAt, updatedAt: item.createdAt,
      }],
    };
  });
  return saved;
}
