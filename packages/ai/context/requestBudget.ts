/** Final-wire request estimate only; no trimming, routing, mutation or summary calls. */
export interface RequestBudgetInput {
  contextWindow: number;
  /** Final projected messages, including system/context/summary exactly once. */
  messageTokens: number;
  /** Actual final adapted tool schema, not the entire registry. */
  toolSchemaTokens: number;
  otherInputTokens?: number;
  protocolReserveTokens: number;
  output:
    | { semantics: "shared-window"; finalWireCapTokens: number }
    | { semantics: "independent" }
    | { semantics: "unknown"; fallbackReserveTokens: number };
}

export interface RequestBudgetDecision {
  estimatedInputTokens: number;
  outputReserveTokens: number;
  availableInputTokens: number;
  fitsEstimate: boolean;
  basis: "shared-window" | "independent" | "heuristic";
  reason: "fits" | "over-budget" | "invalid-budget";
}

/** Model metadata output ceilings must never be passed as finalWireCapTokens.
 * Unknown semantics use an explicit caller policy, not max(model cap, 8192).
 * Fits is an estimate, not a tokenizer/provider admission guarantee.
 */
export function evaluateRequestBudget(input: RequestBudgetInput): RequestBudgetDecision {
  const outputReserveTokens = input.output.semantics === "shared-window"
    ? input.output.finalWireCapTokens
    : input.output.semantics === "unknown" ? input.output.fallbackReserveTokens : 0;
  const basis = input.output.semantics === "unknown" ? "heuristic" : input.output.semantics;
  const costs = [input.messageTokens, input.toolSchemaTokens, input.otherInputTokens ?? 0,
    input.protocolReserveTokens, outputReserveTokens];
  if (!Number.isFinite(input.contextWindow) || input.contextWindow <= 0 ||
      costs.some(value => !Number.isFinite(value) || value < 0)) {
    return { estimatedInputTokens: 0, outputReserveTokens: 0, availableInputTokens: 0,
      fitsEstimate: false, basis, reason: "invalid-budget" };
  }
  const estimatedInputTokens = Math.ceil(input.messageTokens) + Math.ceil(input.toolSchemaTokens)
    + Math.ceil(input.otherInputTokens ?? 0);
  const reserve = Math.ceil(outputReserveTokens);
  const availableInputTokens = Math.floor(input.contextWindow) - Math.ceil(input.protocolReserveTokens) - reserve;
  const fitsEstimate = availableInputTokens >= 0 && estimatedInputTokens <= availableInputTokens;
  return { estimatedInputTokens, outputReserveTokens: reserve, availableInputTokens,
    fitsEstimate, basis, reason: fitsEstimate ? "fits" : "over-budget" };
}
