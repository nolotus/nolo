import type { MemoryBenchmarkTextProvider } from "./benchmark/provider";
import { inspectMemoryVNext, type MemoryInspectResult } from "./inspect";
import type { MemoryRecallResult } from "./recall";

import { estimateTokenCount } from "../../context/tokenUtils";
import {
  buildBudgetedMemoryInput, compactMemoryRow, resolveMemoryBudget,
  type MemoryBudgetTrace, type MemoryPromptRow,
} from "./recallBudget";

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
    budget?: MemoryBudgetTrace;
    contextBudget?: MemoryBudgetTrace;
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
  maxInputTokens?: number;
  maxContextTokens?: number;
}): Promise<AdaptiveMemoryContextResult> => {
  const startedAt = performance.now();
  const maxContextTokens = resolveMemoryBudget(input.maxContextTokens);
  const maxInputTokens = resolveMemoryBudget(input.maxInputTokens);
  // A caller-provided recall object is not an authorization capability. Only
  // owner-scoped objects whose exact refs were recalled can reach the planner.
  const allowed = new Set(input.recall.refs);
  const recall: MemoryRecallResult = {
    ...input.recall,
    entities: input.recall.entities.filter((row) => row.ownerId === input.ownerId && allowed.has(row.id)),
    states: input.recall.states.filter((row) => row.ownerId === input.ownerId && allowed.has(row.id)),
  };
  recall.refs = [...new Set([...recall.entities, ...recall.states].map((row) => row.id))];
  if (!input.query.trim() || recall.refs.length === 0) {
    const text = "No relevant durable memory was recalled.";
    return {
      text,
      recall,
      inspections: [],
      trace: {
        depth: 1,
        inspectRefs: [],
        elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
        contextChars: text.length,
        budget: { maxTokens: maxInputTokens, usedTokens: 0, truncated: false,
          totalCandidates: 0, offeredCandidates: 0, omittedCandidates: 0 },
        contextBudget: { maxTokens: maxContextTokens, usedTokens: estimateTokenCount(text),
          truncated: false, totalCandidates: 0, offeredCandidates: 0, omittedCandidates: 0 },
      },
    };
  }

  const recalled = JSON.parse(recallText(recall)) as {
    entities: MemoryPromptRow[]; states: MemoryPromptRow[];
  };
  const request = buildBudgetedMemoryInput({
    query: input.query,
    maxTokens: input.maxInputTokens,
    rows: [...recalled.states, ...recalled.entities],
    system: [
      "Decide whether the recalled long-lived memory is enough to answer the user query.",
      'Return ONLY JSON: {"inspectRefs":["exact-recalled-ref"],"reason":"short explanation"}.',
      `Inspect at most ${MAX_INSPECT_REFS} refs and only refs already recalled and supplied.`,
      "Inspect for exact history, provenance, temporal evolution or related details.",
      "Do not inspect merely to collect more personal detail when current State answers the query.",
      "An empty inspectRefs array means stop at the recalled State/Entity layer.",
    ].join("\n"),
  });
  const planningResult = await input.provider.complete(
    request.messages,
    input.timeoutMs ? { timeoutMs: input.timeoutMs } : undefined,
  );

  const plan = parseInspectPlan(planningResult.content);
  const recalledSet = new Set(request.rows.map((row) => row.id));
  const inspectRefs = plan.inspectRefs.filter((ref) => recalledSet.has(ref));
  const inspections = await Promise.all(
    inspectRefs.map((ref) =>
      inspectMemoryVNext({ db: input.db, ownerId: input.ownerId, ref }),
    ),
  );

  // Render whole records only: identifiers, source refs and relation endpoints
  // are never sliced. Long descriptive fields are clipped independently, then
  // deterministic whole-record admission bounds the aggregate JSON.
  const rendered: {
    recalled: { entities: MemoryPromptRow[]; states: MemoryPromptRow[] };
    inspected: Array<Record<string, unknown>>;
    truncated: boolean;
  } = {
    recalled: { entities: [], states: [] }, inspected: [],
    truncated: Boolean(recall.trace.budget?.truncated),
  };
  let totalCandidates = 0;
  let offeredCandidates = 0;
  const admit = (target: MemoryPromptRow[], original: MemoryPromptRow) => {
    totalCandidates++;
    const row = compactMemoryRow(original);
    const clipped = JSON.stringify(row) !== JSON.stringify(original);
    target.push(row);
    // Reserve the longer boolean spelling throughout admission.
    const text = JSON.stringify({ ...rendered, truncated: false });
    if (estimateTokenCount(text) > maxContextTokens) {
      target.pop();
      rendered.truncated = true;
    } else {
      offeredCandidates++;
      if (clipped) rendered.truncated = true;
    }
  };
  for (const row of recalled.states) admit(rendered.recalled.states, row);
  for (const row of recalled.entities) admit(rendered.recalled.entities, row);
  for (const inspection of inspections) {
    const source = inspectionText(inspection);
    const section: Record<string, unknown> = { ref: source.ref, states: [], evidence: [], relations: [] };
    rendered.inspected.push(section);
    if (estimateTokenCount(JSON.stringify({ ...rendered, truncated: false })) > maxContextTokens) {
      rendered.inspected.pop();
      totalCandidates += Number(Boolean(source.entity)) + Number(Boolean(source.state)) +
        source.states.length + source.evidence.length + source.relations.length;
      rendered.truncated = true;
      continue;
    }
    for (const key of ["entity", "state"] as const) {
      if (!source[key]) continue;
      totalCandidates++;
      const row = compactMemoryRow(source[key]);
      section[key] = row;
      if (estimateTokenCount(JSON.stringify({ ...rendered, truncated: false })) > maxContextTokens) {
        delete section[key];
        rendered.truncated = true;
      } else {
        offeredCandidates++;
        if (JSON.stringify(row) !== JSON.stringify(source[key])) rendered.truncated = true;
      }
    }
    for (const key of ["states", "evidence", "relations"] as const) {
      for (const row of source[key]) admit(section[key] as MemoryPromptRow[], row);
    }
  }
  const text = JSON.stringify(rendered);

  return {
    text,
    recall,
    inspections,
    trace: {
      depth: inspections.length ? 2 : 1,
      inspectRefs,
      elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
      contextChars: text.length,
      budget: request.budget,
      contextBudget: {
        maxTokens: maxContextTokens, usedTokens: estimateTokenCount(text),
        truncated: rendered.truncated, totalCandidates, offeredCandidates,
        omittedCandidates: totalCandidates - offeredCandidates,
      },
    },
  };
};

export const __test__ = { parseInspectPlan };
