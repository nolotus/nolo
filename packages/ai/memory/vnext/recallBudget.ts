import { estimateTokenCount } from "../../context/tokenUtils";
import { DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET } from "../overlay";

// No deep-recall-specific default is specified in the proposal. Reuse the
// existing memory allowance (3200 estimated tokens); callers can trade context
// cost for coverage via maxInputTokens/maxContextTokens. This is an estimator
// hard cap, not a claim about a provider's tokenizer or wire-level framing.
export const DEFAULT_DEEP_MEMORY_TOKENS = DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET;
export const resolveMemoryBudget = (value?: number): number => {
  const budget = value ?? DEFAULT_DEEP_MEMORY_TOKENS;
  if (!Number.isSafeInteger(budget) || budget < 512) {
    throw new Error("memory budget must be a safe integer >= 512 estimated tokens");
  }
  return budget;
};

export interface MemoryBudgetTrace {
  maxTokens: number;
  usedTokens: number;
  truncated: boolean;
  queryTruncated?: boolean;
  omittedCandidates?: number;
  offeredCandidates: number;
  totalCandidates: number;
}

// Token-aware prefix truncation, using the same estimator/binary-search
// approach as context/toolOutputCap, but without cutting JSON or identifiers.
export const clipMemoryText = (text: string, maxTokens: number): string => {
  if (estimateTokenCount(text) <= maxTokens) return text;
  const suffix = "…[truncated]";
  if (estimateTokenCount(suffix) > maxTokens) return "";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (estimateTokenCount(text.slice(0, mid) + suffix) <= maxTokens) lo = mid;
    else hi = mid - 1;
  }
  // Avoid leaving a dangling UTF-16 high surrogate.
  if (lo && /[\uD800-\uDBFF]/.test(text[lo - 1]!)) lo--;
  return text.slice(0, lo) + suffix;
};

export type MemoryPromptRow = Record<string, unknown>;
const DESCRIPTIVE_FIELDS = new Set(["text", "name", "facet", "subtype", "value", "aliases"]);
export const compactMemoryRow = (row: MemoryPromptRow, fieldTokens = 128): MemoryPromptRow =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
    DESCRIPTIVE_FIELDS.has(key) && estimateTokenCount(typeof value === "string" ? value : JSON.stringify(value) ?? "") > fieldTokens
      ? clipMemoryText(typeof value === "string" ? value : JSON.stringify(value) ?? "", fieldTokens)
      : value,
  ]));

export const memoryMessageTokens = (messages: Array<{ content: string }>): number =>
  messages.reduce((sum, message) => sum + estimateTokenCount(message.content) + 8, 0);

export const buildBudgetedMemoryInput = (input: {
  system: string;
  query: string;
  rows: MemoryPromptRow[];
  maxTokens?: number;
}) => {
  const maxTokens = resolveMemoryBudget(input.maxTokens);
  const query = clipMemoryText(input.query, Math.floor(maxTokens / 4));
  const rows: MemoryPromptRow[] = [];
  const messages = () => [
    { role: "system" as const, content: input.system +
      "\nThis is a budgeted subset. Omitted candidates are unknown, not absent. Select only supplied exact ids; never infer nonexistence from omissions." },
    { role: "user" as const, content: `Query:\n${query}\n\nMemory catalog:\n${JSON.stringify({ candidates: rows })}` },
  ];
  if (memoryMessageTokens(messages()) > maxTokens) {
    throw new Error("memory budget cannot fit instructions and query");
  }
  let clipped = false;
  for (const original of input.rows) {
    const row = compactMemoryRow(original);
    rows.push(row);
    if (memoryMessageTokens(messages()) > maxTokens) rows.pop();
    else if (JSON.stringify(row) !== JSON.stringify(original)) clipped = true;
  }
  const result = messages();
  return {
    messages: result,
    rows,
    budget: {
      maxTokens,
      usedTokens: memoryMessageTokens(result),
      truncated: clipped || rows.length !== input.rows.length || query !== input.query,
      queryTruncated: query !== input.query,
      offeredCandidates: rows.length,
      totalCandidates: input.rows.length,
      omittedCandidates: input.rows.length - rows.length,
    } satisfies MemoryBudgetTrace,
  };
};
