import type { TokenUsageChargeResult } from "./types";

export type { TokenUsageChargeResult };

export const chargeTokenUsageWithLedger = async (opts: {
  userId: string;
  tokenKey: string;
  tokenRecord: unknown;
  store?: unknown;
  runtime?: unknown;
  reason?: string;
  txId?: string;
  ledgerIdempotencyKey?: string;
  allowBuyerNegative?: boolean;
  nowMs?: number;
}): Promise<TokenUsageChargeResult> => {
  return {
    success: true,
    status: "charged",
    userId: opts.userId,
    tokenKey: opts.tokenKey,
    txId: opts.txId || `mock-${Date.now()}`,
    amountCredits: 0,
  };
};
