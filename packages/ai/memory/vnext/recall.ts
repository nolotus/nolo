import type { MemoryBenchmarkTextProvider } from "./benchmark/provider";
import { loadMemoryVNextCatalog } from "./store";
import type { MemoryEntityVNext, MemoryStateVNext } from "./types";

import { recallMemoryVNextLocal } from "./localRecall";
import { buildBudgetedMemoryInput, resolveMemoryBudget, type MemoryBudgetTrace } from "./recallBudget";

const MAX_RECALL_REFS = 6;

export interface MemoryRecallResult {
  query: string;
  refs: string[];
  entities: MemoryEntityVNext[];
  states: MemoryStateVNext[];
  reason: string;
  trace: {
    candidateEntities: number;
    candidateStates: number;
    selectedRefs: number;
    elapsedMs: number;
    budget?: MemoryBudgetTrace;
  };
}

const stripFence = (raw: string): string => {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1]!.trim() : trimmed;
};

const parseSelection = (raw: string): { refs: string[]; reason: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(raw));
  } catch {
    throw new Error("memory recall selector output is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("memory recall selector output must be an object");
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.refs) || !obj.refs.every((item) => typeof item === "string")) {
    throw new Error("memory recall selector refs must be string[]");
  }
  if (typeof obj.reason !== "string") {
    throw new Error("memory recall selector reason must be string");
  }
  return {
    refs: [...new Set(obj.refs)].slice(0, MAX_RECALL_REFS),
    reason: obj.reason,
  };
};

export const createMemoryVNextRecall = (input: {
  db: any;
  ownerId: string;
  provider: MemoryBenchmarkTextProvider;
  timeoutMs?: number;
  maxInputTokens?: number;
}) =>
  async (query: string): Promise<MemoryRecallResult> => {
    const startedAt = performance.now();
    const maxTokens = resolveMemoryBudget(input.maxInputTokens);
    const { entities, states } = await loadMemoryVNextCatalog(input.db, input.ownerId);
    if (!query.trim() || (entities.length === 0 && states.length === 0)) {
      return {
        query,
        refs: [],
        entities: [],
        states: [],
        reason: query.trim() ? "memory catalog is empty" : "query is empty",
        trace: {
          candidateEntities: 0,
          candidateStates: 0,
          selectedRefs: 0,
          budget: { maxTokens, usedTokens: 0, truncated: false,
            offeredCandidates: 0, totalCandidates: entities.length + states.length,
            omittedCandidates: entities.length + states.length },
          elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
        },
      };
    }

    // Reuse the existing relevance gate/ranking; deep recall still permits the
    // selector to find semantic/history matches in the deterministic remainder.
    const hits = recallMemoryVNextLocal({ query, entities, states, limit: states.length });
    const priority = new Set(hits.flatMap(({ state }) => [state.id, state.entityId]));
    const rankedStates = [...hits.map(({ state }) => state),
      ...states.filter((state) => !priority.has(state.id)).sort((a, b) => a.id.localeCompare(b.id))];
    const rankedEntities = [...entities].sort((a, b) =>
      Number(priority.has(b.id)) - Number(priority.has(a.id)) || a.id.localeCompare(b.id));
    const stateRows = rankedStates.map((state) => ({
      kind: "state", id: state.id, entityId: state.entityId, facet: state.facet,
      text: state.text, ...(state.retiredAt ? { retired: true } : {}),
    }));
    const entityRows = rankedEntities.map((entity) => ({
      kind: "entity", id: entity.id, type: entity.type, name: entity.name,
      ...(entity.subtype ? { subtype: entity.subtype } : {}),
      ...(entity.aliases?.length ? { aliases: entity.aliases } : {}),
    }));
    const request = buildBudgetedMemoryInput({
      query, maxTokens: input.maxInputTokens,
      rows: [...stateRows.filter((row) => priority.has(row.id)),
        ...entityRows.filter((row) => priority.has(row.id)),
        ...stateRows.filter((row) => !priority.has(row.id)),
        ...entityRows.filter((row) => !priority.has(row.id))],
      system: [
        "Select the smallest useful set of long-lived memory entrances for the user query.",
        'Return ONLY JSON: {"refs":["exact-id"],"reason":"short explanation"}.',
        `Select at most ${MAX_RECALL_REFS} exact ids from the supplied catalog.`,
        "Prefer current State ids; retired States are history entrances, not current facts.",
        "Select an Entity when it is a useful navigation anchor.",
        "Do not select unrelated memories merely because they are personal or interesting.",
        "Historical questions may select a relevant entrance; deeper evidence is handled by inspect.",
      ].join("\n"),
    });
    const result = await input.provider.complete(
      request.messages,
      input.timeoutMs ? { timeoutMs: input.timeoutMs } : undefined,
    );

    const selected = parseSelection(result.content);
    const entityById = new Map(entities.map((entity) => [entity.id, entity]));
    const stateById = new Map(states.map((state) => [state.id, state]));
    const offered = new Set(request.rows.map((row) => row.id));
    const validRefs = selected.refs.filter((ref) => offered.has(ref) && (entityById.has(ref) || stateById.has(ref)));

    return {
      query,
      refs: validRefs,
      entities: validRefs.flatMap((ref) => {
        const entity = entityById.get(ref);
        return entity ? [entity] : [];
      }),
      states: validRefs.flatMap((ref) => {
        const state = stateById.get(ref);
        return state ? [state] : [];
      }),
      reason: selected.reason,
      trace: {
        candidateEntities: entities.length,
        candidateStates: states.length,
        selectedRefs: validRefs.length,
        budget: request.budget,
        elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
      },
    };
  };

export const __test__ = { parseSelection };
