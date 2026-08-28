// Pure billing-breakdown calculator for a single TokenRecord (US-3.2).
//
// Splits a charged record into its line items so the UI can show "how the
// money was calculated". Mirrors calculatePrice semantics:
//   - input_tokens is TOTAL input (incl. cache hits), so the regular input
//     line only covers the miss portion: max(0, input − cacheRead)
//   - cache reads with no snapshot price are billed at 0 (cachingRead || 0)
//   - per-million prices from the record's own billing snapshot
//
// The estimated total may differ from `cost` on provider-reported paths
// items) — the caller shows both, never hiding the difference.

export interface BillingBreakdownRecord {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  /** per million, billed catalog snapshot (credits) */
  inputPrice?: number;
  outputPrice?: number;
  /** per million, billed catalog snapshot (credits); undefined = billed as free */
  inputCacheHitPrice?: number;
  /** per million, billed catalog snapshot (credits) */
  cacheWritePrice?: number;
  /** final charge in credits */
  cost?: number;
  billable?: boolean;
}

export interface BillingBreakdown {
  missInputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  /** input + output + cacheRead + cacheWrite line items */
  estimatedTotal: number;
  /** record.cost (credits) */
  charged: number;
  /** true when any unit price is known (has something to show) */
  hasPrices: boolean;
  /** true when the cache-read price was snapshotted (not "—") */
  cachePriceKnown: boolean;
  billable: boolean;
}

const toPositive = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function computeBillingBreakdown(
  record: BillingBreakdownRecord
): BillingBreakdown {
  const input = toPositive(record.input_tokens);
  const output = toPositive(record.output_tokens);
  const cacheRead = toPositive(record.cache_read_input_tokens);
  const cacheCreation = toPositive(record.cache_creation_input_tokens);

  const inputPrice = toPositive(record.inputPrice);
  const outputPrice = toPositive(record.outputPrice);
  const cacheReadPrice = toPositive(record.inputCacheHitPrice);
  const cacheWritePrice = toPositive(record.cacheWritePrice);

  const missInput = Math.max(0, input - cacheRead);
  const inputCost = (missInput * inputPrice) / 1e6;
  const outputCost = (output * outputPrice) / 1e6;
  // No snapshot price → cache reads were billed at 0 (calculatePrice || 0).
  const cacheReadCost = (cacheRead * cacheReadPrice) / 1e6;
  const cacheWriteCost = (cacheCreation * cacheWritePrice) / 1e6;

  return {
    missInputTokens: missInput,
    cacheReadTokens: cacheRead,
    cacheCreationTokens: cacheCreation,
    inputCost,
    outputCost,
    cacheReadCost,
    cacheWriteCost,
    estimatedTotal: inputCost + outputCost + cacheReadCost + cacheWriteCost,
    charged: toPositive(record.cost),
    hasPrices: inputPrice > 0 || outputPrice > 0 || cacheReadPrice > 0,
    cachePriceKnown: typeof record.inputCacheHitPrice === "number",
    billable: record.billable !== false,
  };
}
