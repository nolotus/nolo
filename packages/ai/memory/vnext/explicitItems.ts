import type { MemoryItem, MemoryOwnerRef } from "../types";
import { loadMemoryVNextCatalog } from "./store";

/** Public item projection for native explicit states; no legacy reads or writes. */
export async function loadExplicitMemoryItems(db: any, owner: MemoryOwnerRef): Promise<MemoryItem[]> {
  const catalog = await loadMemoryVNextCatalog(db, `${owner.ownerType}:${encodeURIComponent(owner.ownerId)}`);
  return catalog.states.flatMap((state) => {
    if (state.retiredAt || state.facet !== "explicit-memory") return [];
    const v = state.value as Record<string, unknown>;
    if (!v || !["episodic", "semantic", "procedural"].includes(String(v.kind))) return [];
    return [{
      id: `vnext-state-${state.id}`, ...owner, content: state.text,
      kind: v.kind as MemoryItem["kind"], subjectType: v.subjectType as MemoryItem["subjectType"],
      subjectId: String(v.subjectId), visibility: v.visibility as MemoryItem["visibility"],
      createdAt: state.createdAt, lastActivatedAt: state.createdAt, activationCount: 0,
      importance: Number(v.importance) || 0, confidence: Number(v.confidence) || 0,
      ...(v.resident === true ? { resident: true } : {}),
      tags: v.tags as string[] | undefined,
      patternKey: v.patternKey as string | undefined,
      recurrenceEvidence: v.recurrenceEvidence as string | undefined,
      sourceKind: v.sourceKind as MemoryItem["sourceKind"], sourceDialogId: v.sourceDialogId as string | undefined,
    }];
  });
}
