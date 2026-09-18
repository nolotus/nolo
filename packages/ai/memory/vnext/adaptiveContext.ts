import type { MemoryBenchmarkTextProvider } from "./benchmark/provider";
import { inspectMemoryVNext, type MemoryInspectResult } from "./inspect";
import type { MemoryRecallResult } from "./recall";

const MAX_INSPECT_REFS = 3;

export interface AdaptiveMemoryContextResult {
  text: string;
  recall: MemoryRecallResult;
  inspections: MemoryInspectResult[];
  trace: {
    depth: 1 | 2;
    inspectRefs: string[];
    elapsedMs: number;
    contextChars: number;
  };
}

const stripFence = (raw: string): string => {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1]!.trim() : trimmed;
};

const parseInspectPlan = (raw: string): { inspectRefs: string[]; reason: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(raw));
  } catch {
    throw new Error("memory inspect planner output is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("memory inspect planner output must be an object");
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.inspectRefs) || !obj.inspectRefs.every((item) => typeof item === "string")) {
    throw new Error("memory inspect planner inspectRefs must be string[]");
  }
  if (typeof obj.reason !== "string") {
    throw new Error("memory inspect planner reason must be string");
  }
  return {
    inspectRefs: [...new Set(obj.inspectRefs)].slice(0, MAX_INSPECT_REFS),
    reason: obj.reason,
  };
};

const recallText = (result: MemoryRecallResult): string =>
  JSON.stringify(
    {
      entities: result.entities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        ...(entity.subtype ? { subtype: entity.subtype } : {}),
      })),
      states: result.states.map((state) => ({
        id: state.id,
        entityId: state.entityId,
        facet: state.facet,
        value: state.value,
        text: state.text,
        // Superseded States stay visible as history; the boolean marker (not
        // the timestamp) is what reaches LLM text.
        ...(state.retiredAt ? { retired: true } : {}),
      })),
    },
    null,
    2,
  );

const inspectionText = (inspection: MemoryInspectResult) => ({
  ref: inspection.ref,
  ...(inspection.entity
    ? {
        entity: {
          id: inspection.entity.id,
          type: inspection.entity.type,
          name: inspection.entity.name,
          ...(inspection.entity.subtype ? { subtype: inspection.entity.subtype } : {}),
        },
      }
    : {}),
  ...(inspection.state
    ? {
        state: {
          id: inspection.state.id,
          entityId: inspection.state.entityId,
          facet: inspection.state.facet,
          value: inspection.state.value,
          text: inspection.state.text,
          ...(inspection.state.retiredAt ? { retired: true } : {}),
        },
      }
    : {}),
  states: inspection.states.map((state) => ({
    id: state.id,
    entityId: state.entityId,
    facet: state.facet,
    value: state.value,
    text: state.text,
    ...(state.retiredAt ? { retired: true } : {}),
  })),
  evidence: inspection.evidence.map((evidence) => ({
    id: evidence.id,
    text: evidence.text,
    ...(evidence.sourceRef ? { sourceRef: evidence.sourceRef } : {}),
    confidence: evidence.confidence,
    createdAt: evidence.createdAt,
  })),
  relations: inspection.relations.map((relation) => ({
    from: relation.from,
    type: relation.type,
    to: relation.to,
  })),
});

export const buildAdaptiveMemoryContext = async (input: {
  db: any;
  ownerId: string;
  query: string;
  recall: MemoryRecallResult;
  provider: MemoryBenchmarkTextProvider;
  timeoutMs?: number;
}): Promise<AdaptiveMemoryContextResult> => {
  const startedAt = performance.now();
  if (input.recall.refs.length === 0) {
    const text = "No relevant durable memory was recalled.";
    return {
      text,
      recall: input.recall,
      inspections: [],
      trace: {
        depth: 1,
        inspectRefs: [],
        elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
        contextChars: text.length,
      },
    };
  }

  const planningResult = await input.provider.complete(
    [
      {
        role: "system",
        content: [
          "Decide whether the recalled long-lived memory is enough to answer the user query.",
          "Return ONLY JSON: {\"inspectRefs\":[\"exact-recalled-ref\"],\"reason\":\"short explanation\"}.",
          `Inspect at most ${MAX_INSPECT_REFS} refs and only refs already recalled.`,
          "Use inspect when exact history, provenance, temporal evolution, or related details are needed.",
          "Do not inspect merely to collect more personal detail when the current State already answers the query.",
          "An empty inspectRefs array means stop at the recalled State/Entity layer.",
        ].join("\n"),
      },
      {
        role: "user",
        content: `Query:\n${input.query}\n\nRecalled memory:\n${recallText(input.recall)}`,
      },
    ],
    input.timeoutMs ? { timeoutMs: input.timeoutMs } : undefined,
  );

  const plan = parseInspectPlan(planningResult.content);
  const recalledSet = new Set(input.recall.refs);
  const inspectRefs = plan.inspectRefs.filter((ref) => recalledSet.has(ref));
  const inspections = await Promise.all(
    inspectRefs.map((ref) =>
      inspectMemoryVNext({ db: input.db, ownerId: input.ownerId, ref }),
    ),
  );

  const text = JSON.stringify(
    {
      recalled: JSON.parse(recallText(input.recall)),
      ...(inspections.length
        ? { inspected: inspections.map(inspectionText) }
        : {}),
    },
    null,
    2,
  );
  // Known limitation (recorded on purpose, not fixed this round): the assembled
  // context has no input budget — recalled and inspected content grow
  // unbounded with memory scale and with the number of inspected refs
  // (trigger: large stores or deep history queries). Budgeting/truncation
  // needs its own design round.

  return {
    text,
    recall: input.recall,
    inspections,
    trace: {
      depth: inspections.length ? 2 : 1,
      inspectRefs,
      elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
      contextChars: text.length,
    },
  };
};

export const __test__ = { parseInspectPlan };
