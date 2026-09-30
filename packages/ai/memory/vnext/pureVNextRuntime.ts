import type { MemoryItem, MemoryOwnerRef } from "../types";
import { loadMemoryVNextCatalog } from "./store";
import { recallMemoryVNextLocal } from "./localRecall";
import { buildMemoryOverlay, DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET } from "../overlay";
import type { MemoryEntityVNext, MemoryStateVNext } from "./types";

export interface PureVNextRuntimeInput {
  db: any;
  owners: MemoryOwnerRef[];
  userInput: string;
  maxTokens?: number;
}

export interface PureVNextRuntimeResult {
  selectedItems: MemoryItem[];
  promptBlock: string | null;
  recalledStateCount: number;
}

const buildSynthesizedStateItem = (
  state: MemoryStateVNext,
  entity: MemoryEntityVNext | undefined,
  ownerType: MemoryItem["ownerType"],
  ownerId: string
): MemoryItem => ({
  id: `vnext-state-${state.id}`,
  ownerType,
  ownerId,
  visibility: "private",
  subjectType: "user",
  subjectId: ownerId,
  kind: "semantic",
  content: state.text.trim(),
  createdAt: state.createdAt,
  lastActivatedAt: state.createdAt,
  activationCount: 1,
  importance: 0.9,
  confidence: 0.9,
  resident: state.facet === "preference" || state.facet === "style",
});

/**
 * Pure vNext Runtime (M5-R Final State).
 * Completely eliminates legacy ranker, candidates DB scanning, touch writes,
 * and background lazy promotion from the hot path.
 */
export async function resolvePureVNextRuntime(
  input: PureVNextRuntimeInput
): Promise<PureVNextRuntimeResult> {
  const { db, owners, userInput } = input;
  if (owners.length === 0 || !userInput.trim()) {
    return { selectedItems: [], promptBlock: null, recalledStateCount: 0 };
  }

  const ownerIds = owners.map((o) => `${o.ownerType}:${encodeURIComponent(o.ownerId)}`);
  const catalogs = await Promise.all(
    ownerIds.map((ownerId) => loadMemoryVNextCatalog(db, ownerId))
  );

  const selectedItems: MemoryItem[] = [];
  // M2 fix: deduplicate by (ownerId, stateId) composite key to respect multi-owner isolation
  const seenStateKeys = new Set<string>();

  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];
    const catalog = catalogs[i];
    const currentStates = catalog.states.filter((s) => !s.retiredAt && s.text.trim());
    const hits = recallMemoryVNextLocal({
      query: userInput,
      entities: catalog.entities,
      states: currentStates,
    });
    const entityById = new Map(catalog.entities.map((e) => [e.id, e]));
    for (const hit of hits) {
      const stateKey = `${hit.state.ownerId}\0${hit.state.id}`;
      if (seenStateKeys.has(stateKey)) continue;
      seenStateKeys.add(stateKey);
      selectedItems.push(
        buildSynthesizedStateItem(hit.state, entityById.get(hit.state.entityId), owner.ownerType, owner.ownerId)
      );
    }
  }

  const promptBlock =
    selectedItems.length === 0
      ? null
      : buildMemoryOverlay(selectedItems, {
          maxTokens: input.maxTokens ?? DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET,
        });

  return {
    selectedItems,
    promptBlock,
    recalledStateCount: selectedItems.length,
  };
}
