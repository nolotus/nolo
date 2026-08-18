// 仅暴露账本计费所需的类型和基础接口
export type TokenUsageChargeResult =
  | {
      success: true;
      status: "charged" | "duplicate";
      userId: string;
      tokenKey: string;
      txId: string;
      balance?: number;
      amountCredits: number;
    }
  | {
      success: false;
      status:
        | "invalid_amount"
        | "user_mismatch"
        | "user_not_found"
        | "invalid_user_balance"
        | "invalid_split_projection"
        | "insufficient_funds"
        | "ledger_rejected"
        | "failed";
      userId: string;
      tokenKey: string;
      txId: string;
      error: string;
      balance?: number;
    };
// TODO: 接管 agentRun / dataHandlers 等地的计费调用
