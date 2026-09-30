import type { MemoryItem } from "../types";
import { buildLegacyMemoryEvidence, resolveLegacyMemoryPrincipal } from "./legacyMigration";
import { currentStatesCitingEvidence, loadExistingContext } from "./lazyPromotion";
import { loadMemoryVNextCatalog } from "./store";
import { recallMemoryVNextLocal, type MemoryVNextLocalRecallHit } from "./localRecall";
import type { MemoryEntityVNext, MemoryStateVNext } from "./types";

/**
 * Memory vNext M4 — foreground local selection (flag-gated).
 *
 * Foreground retrieval is local and cheap (~5ms):
 *  1. Local lexical recall (`recallMemoryVNextLocal`, words + CJK bigrams)
 *     selects current States directly relevant to the user query.
 *  2. Uncovered legacy items selected by the legacy ranker fill the rest —
 *     items that are never promoted, Evidence-only, retired-only, or judged
 *     no_op by the Interpreter stay visible so no memory is lost.
 *  3. Covered legacy items whose covering State was NOT recalled this turn
 *     are suppressed from the legacy tail: vNext has taken authority over
 *     them, and they only appear when the query actually recalls them.
 *
 * Public return contract stays identical: `selectedItems` is the ranked
 * legacy selection, `promptBlock` is the rendered text. The hybrid list
 * flows through the unchanged `buildMemoryOverlay`, so token budgeting,
 * resident handling and kind section grouping remain identical.
 */

export type MemoryVNextPrimaryReadSource = "vnext" | "hybrid" | "legacy_fallback" | "none";

export interface MemoryVNextPrimaryReadObservation {
  source: MemoryVNextPrimaryReadSource;
  legacyHitCount: number;
  /** Legacy items rendered from their original text. */
  uncoveredLegacyCount?: number;
  /** Covered legacy items suppressed because their covering State was not recalled. */
  coveredSuppressedCount?: number;
  /** Distinct current States recalled and injected directly. */
  recalledStateCount?: number;
  vnextLatencyMs?: number;
  legacyLatencyMs: number;
  contextChars?: number;
  fallbackReason?: "no_vnext_context" | "vnext_error";
  error?: string;
}

export const MEMORY_VNEXT_PRIMARY_READ_TIMEOUT_MS = 300;

export const isMemoryVNextPrimaryReadEnabled = (
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {}
): boolean =>
  env.NOLO_MEMORY_VNEXT_PRIMARY_READ === "1" ||
  env.NOLO_MEMORY_VNEXT_PRIMARY_READ === "true";

export interface MemoryVNextM4Selection {
  /** Combined items to pass to buildMemoryOverlay. */
  renderItems: MemoryItem[];
  recalledStateCount: number;
  uncoveredLegacyCount: number;
  coveredSuppressedCount: number;
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
  importance: 0.9,
  confidence: 0.9,
  // Flag resident preferences so they flow into overlay's resident section.
  resident: state.facet === "preference" || state.facet === "style",
  lastActivatedAt: state.createdAt,
  activationCount: 1,
});

/**
 * M4 local selection resolver. Loads each owner's catalog once in parallel,
 * runs local recall, suppresses covered legacy items, and passes through
 * uncovered legacy items. Throws on store errors (caller falls back).
 */
export const resolveMemoryVNextM4Selection = async (input: {
  db: any;
  owners: readonly { ownerType: MemoryItem["ownerType"]; ownerId: string }[];
  query: string;
  selected: readonly MemoryItem[];
}): Promise<MemoryVNextM4Selection> => {
  const { db, owners, query, selected } = input;
  const ownerIds = owners.map((o) => `${o.ownerType}:${encodeURIComponent(o.ownerId)}`);
  const catalogs = new Map<string, { entities: MemoryEntityVNext[]; states: MemoryStateVNext[] }>(
    await Promise.all(
      ownerIds.map(async (ownerId): Promise<[string, { entities: MemoryEntityVNext[]; states: MemoryStateVNext[] }]> => [
        ownerId,
        await loadMemoryVNextCatalog(db, ownerId),
      ])
    )
  );

  // 1. Recall relevant current States directly from vNext across all owners.
  const recalledStates: MemoryItem[] = [];
  const recalledStateIds = new Set<string>();
  for (const owner of owners) {
    const principalId = `${owner.ownerType}:${encodeURIComponent(owner.ownerId)}`;
    const catalog = catalogs.get(principalId);
    if (!catalog) continue;
    const currentStates = catalog.states.filter((s) => !s.retiredAt && s.text.trim());
    const hits = recallMemoryVNextLocal({
      query,
      entities: catalog.entities,
      states: currentStates,
    });
    const entityById = new Map(catalog.entities.map((e) => [e.id, e]));
    for (const hit of hits) {
      if (recalledStateIds.has(hit.state.id)) continue;
      recalledStateIds.add(hit.state.id);
      recalledStates.push(
        buildSynthesizedStateItem(hit.state, entityById.get(hit.state.entityId), owner.ownerType, owner.ownerId)
      );
    }
  }

  // 2. Classify legacy items: keep uncovered (fill gaps), suppress covered.
  const uncoveredLegacy: MemoryItem[] = [];
  let coveredSuppressedCount = 0;
  for (const item of selected) {
    const evidence = buildLegacyMemoryEvidence(item);
    const catalog = catalogs.get(evidence.ownerId);
    const states = catalog?.states ?? [];
    const covering = currentStatesCitingEvidence(states, evidence.id);
    if (covering.length > 0) {
      coveredSuppressedCount++;
    } else {
      uncoveredLegacy.push(item);
    }
  }

  const renderItems = [...recalledStates, ...uncoveredLegacy];
  return {
    renderItems,
    recalledStateCount: recalledStates.length,
    uncoveredLegacyCount: uncoveredLegacy.length,
    coveredSuppressedCount,
  };
};
