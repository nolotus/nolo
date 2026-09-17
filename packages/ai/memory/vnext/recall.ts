import type { MemoryBenchmarkTextProvider } from "./benchmark/provider";
import {
  listMemoryEntitiesVNext,
  listMemoryStatesForEntityVNext,
} from "./store";
import type { MemoryEntityVNext, MemoryStateVNext } from "./types";

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

// Known limitation (recorded on purpose, not fixed this round): the catalog is
// rebuilt from every Entity and State with no input budget, so it grows
// unbounded with store scale and inflates the selector prompt (trigger: large
// entity/state counts, see the benchmark --scale modes). Truncation or
// prioritization needs its own design round and is intentionally not hacked in
// here.
const buildCatalog = async (db: any, ownerId: string) => {
  const entities = await listMemoryEntitiesVNext(db, ownerId);
  const states: MemoryStateVNext[] = [];
  for (const entity of entities) {
    states.push(...(await listMemoryStatesForEntityVNext(db, ownerId, entity.id)));
  }
  return { entities, states };
};

const catalogText = (entities: MemoryEntityVNext[], states: MemoryStateVNext[]): string =>
  JSON.stringify(
    {
      entities: entities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        ...(entity.subtype ? { subtype: entity.subtype } : {}),
        ...(entity.aliases?.length ? { aliases: entity.aliases } : {}),
      })),
      states: states.map((state) => ({
        id: state.id,
        entityId: state.entityId,
        facet: state.facet,
        text: state.text,
        // Retired (superseded) States stay listed as recoverable history; the
        // boolean — not the retiredAt timestamp — enters the prompt so no
        // timestamps reach LLM text.
        ...(state.retiredAt ? { retired: true } : {}),
      })),
    },
    null,
    2,
  );

export const createMemoryVNextRecall = (input: {
  db: any;
  ownerId: string;
  provider: MemoryBenchmarkTextProvider;
  timeoutMs?: number;
}) =>
  async (query: string): Promise<MemoryRecallResult> => {
    const startedAt = performance.now();
    const { entities, states } = await buildCatalog(input.db, input.ownerId);
    if (entities.length === 0 && states.length === 0) {
      return {
        query,
        refs: [],
        entities: [],
        states: [],
        reason: "memory catalog is empty",
        trace: {
          candidateEntities: 0,
          candidateStates: 0,
          selectedRefs: 0,
          elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
        },
      };
    }

    const result = await input.provider.complete(
      [
        {
          role: "system",
          content: [
            "Select the smallest useful set of long-lived memory entrances for the user query.",
            "Return ONLY JSON: {\"refs\":[\"exact-id\"],\"reason\":\"short explanation\"}.",
            `Select at most ${MAX_RECALL_REFS} exact ids from the supplied catalog.`,
            "Prefer State ids when current durable understanding answers the query.",
            "Select an Entity id when it is a useful navigation anchor and no single State is enough.",
            "Do not select unrelated memories merely because they are personal or interesting.",
            "Historical-detail questions may select the relevant current State/Entity as an entrance; deeper evidence is handled by inspect, not here.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Query:\n${query}\n\nMemory catalog:\n${catalogText(entities, states)}`,
        },
      ],
      input.timeoutMs ? { timeoutMs: input.timeoutMs } : undefined,
    );

    const selected = parseSelection(result.content);
    const entityById = new Map(entities.map((entity) => [entity.id, entity]));
    const stateById = new Map(states.map((state) => [state.id, state]));
    const validRefs = selected.refs.filter((ref) => entityById.has(ref) || stateById.has(ref));

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
        elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
      },
    };
  };

export const __test__ = { parseSelection };
