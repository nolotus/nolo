import type { MemoryItem, MemoryOwnerRef } from "../types";
import { loadMemoryVNextCatalog } from "./store";
import { recallMemoryVNextLocal } from "./localRecall";
import { buildMemoryOverlay, DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET } from "../overlay";
import { RESIDENT_MAX_CONTENT_CHARS } from "../remember";
import type { MemoryEntityVNext, MemoryStateVNext } from "./types";
import { isWorkContextState } from "./workContext";

export interface PureVNextRuntimeInput {
  db: any;
  owners: MemoryOwnerRef[];
  userInput: string;
  maxTokens?: number;
  injectionEmit?: import("../overlay").BuildMemoryOverlayOptions["injectionEmit"];
}

export interface PureVNextRuntimeResult {
  selectedItems: MemoryItem[];
  promptBlock: string | null;
  recalledStateCount: number;
}

/**
 * 是否把这条 State 放进 overlay 的常驻偏好小节。
 *
 * `resident` 是 overlay 里**唯一**会改变注入口径的字段（`overlay.ts` 直接消费
 * `item.resident === true`，把该条分流进独立的 500 token 常驻区，见
 * `overlay.ts` 的 residentMaxTokens）。所以判错不是「权重差一点」，而是
 * **挤占真正的用户短期偏好的预算**。
 *
 * 原实现只判 facet，漏了两道 legacy 侧本来就有（`remember.ts:200` 写入时强制
 * `content.length <= RESIDENT_MAX_CONTENT_CHARS`）的约束：
 * - `ownerType` 必须是 user：space 级 State 不属于「用户长期偏好」，不该进这块；
 * - 文本长度必须在上限内：超长的 State 会把常驻区预算吃光。
 *
 * 两处都对齐 legacy 的既有语义，不是新造规则。facet 仍是唯一的「是不是偏好类」
 * 信号 —— vNext State 目前没有 sourceKind，无法区分 user-directive 与 inferred，
 * 所以这里如实保留 facet 启发式，不假装它更精确。
 */
export function deriveStateResident(
  state: MemoryStateVNext,
  ownerType: MemoryItem["ownerType"]
): boolean {
  if (ownerType !== "user") return false;
  if (state.text.trim().length > RESIDENT_MAX_CONTENT_CHARS) return false;
  return state.facet === "preference" || state.facet === "style";
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
  resident: deriveStateResident(state, ownerType),
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
    return { selectedItems: [], promptBlock: buildMemoryOverlay([], { injectionEmit: input.injectionEmit }), recalledStateCount: 0 };
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
    // 工作接续（facet = work-context）不在语义召回里出现：它由
    // `workContextRecall` 走独立的有界块注入，混进语义候选会既绕过它自己的
    // 预算、又被当成普通长期记忆。
    const currentStates = catalog.states.filter(
      (s) => !s.retiredAt && s.text.trim() && !isWorkContextState(s),
    );
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

  const promptBlock = buildMemoryOverlay(selectedItems, {
    sources: new Map(selectedItems.map(item => [item, "vnext"] as const)),
    injectionEmit: input.injectionEmit,
    maxTokens: input.maxTokens ?? DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET,
  });

  return {
    selectedItems,
    promptBlock,
    recalledStateCount: selectedItems.length,
  };
}
