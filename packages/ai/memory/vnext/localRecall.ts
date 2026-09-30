import { tokenize } from "../rank";
import type { MemoryEntityVNext, MemoryStateVNext } from "./types";

/**
 * Memory vNext M4/M5 — cheap local recall over current States.
 *
 * Foreground-safe: pure, synchronous, no LLM, no I/O (the caller loads the
 * owner context once). Uses the legacy ranker's `tokenize` (words + CJK
 * bigrams) so legacy and vNext share one notion of lexical relevance.
 *
 * Relevance gate: a State is recalled only when at least MIN_SHARED_TOKENS
 * distinct query tokens appear in its facet / text / Entity name / aliases.
 * One shared CJK bigram (e.g. "技术") is too weak a signal to inject memory
 * into an unrelated conversation.
 */

export const MIN_SHARED_TOKENS = 2;
export const MAX_LOCAL_RECALL_STATES = 8;

export interface MemoryVNextLocalRecallHit {
  state: MemoryStateVNext;
  /** Distinct query tokens found in the State's searchable text. */
  sharedTokens: number;
}

/**
 * Safe, unambiguous domain-specific synonyms.
 * Deliberately excludes high-collision general verbs like "run" / "running" / "jog",
 * which cause false positive bleed in software tasks (e.g. "how to run deploy script").
 */
const SAFE_TECHNICAL_SYNONYMS: Record<string, string[]> = {
  pr: ["审查", "代码审查", "diff"],
  diff: ["审查", "代码审查"],
  review: ["审查", "代码审查"],
  deploy: ["部署", "发版"],
  release: ["发版", "发布"],
  desktop: ["桌面", "桌面端"],
};

const distinctTokens = (text: string): Set<string> =>
  new Set(tokenize(text).filter((token) => token.length >= 2));

export const recallMemoryVNextLocal = (input: {
  query: string;
  entities: readonly MemoryEntityVNext[];
  states: readonly MemoryStateVNext[];
  limit?: number;
}): MemoryVNextLocalRecallHit[] => {
  const rawTokens = distinctTokens(input.query);
  if (rawTokens.size === 0) return [];

  const queryTokens = new Set<string>(rawTokens);
  for (const token of rawTokens) {
    const syns = SAFE_TECHNICAL_SYNONYMS[token.toLowerCase()];
    if (syns) {
      for (const syn of syns) {
        for (const t of distinctTokens(syn)) queryTokens.add(t);
      }
    }
  }

  const entityById = new Map(input.entities.map((entity) => [entity.id, entity]));
  const hits: MemoryVNextLocalRecallHit[] = [];
  for (const state of input.states) {
    if (state.retiredAt || !state.text.trim()) continue;
    const entity = entityById.get(state.entityId);
    const haystack = distinctTokens(
      [state.facet, state.text, entity?.name ?? "", ...(entity?.aliases ?? [])].join(" ")
    );
    let sharedTokens = 0;
    for (const token of queryTokens) if (haystack.has(token)) sharedTokens++;
    if (sharedTokens >= MIN_SHARED_TOKENS) hits.push({ state, sharedTokens });
  }
  return hits
    .sort((a, b) => b.sharedTokens - a.sharedTokens || a.state.id.localeCompare(b.state.id))
    .slice(0, input.limit ?? MAX_LOCAL_RECALL_STATES);
};
