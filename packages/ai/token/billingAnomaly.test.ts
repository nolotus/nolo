import { describe, expect, it } from "bun:test";

import {
  buildBillingAnomalyKey,
  createBillingAnomaly,
} from "./billingAnomaly";

describe("billing anomaly contract", () => {
  it("builds stable append-only keys", () => {
    expect(buildBillingAnomalyKey("anom_01")).toBe("billing-anomaly-anom_01");
  });

  it("records failed ledger evidence with provider-call context", () => {
    const anomaly = createBillingAnomaly({
      anomalyId: "anom_01",
      kind: "ledger_failed",
      severity: "high",
      stage: "ledger",
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-1",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      providerCallId: "call_01",
      billableEventId: "billable_01",
      ratingResultId: "rating_01",
      riskPlatformCredits: 12.34,
      message: "ledger rejected",
      evidence: {
        ledgerStatus: "ledger_rejected",
        ledgerIdempotencyKey: "provider-call:call_01:charge:v1",
      },
      createdAt: "2026-05-26T10:00:00.000Z",
    });

    expect(anomaly).toEqual({
      id: "anom_01",
      kind: "ledger_failed",
      severity: "high",
      stage: "ledger",
      status: "open",
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-1",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      providerCallId: "call_01",
      billableEventId: "billable_01",
      ratingResultId: "rating_01",
      riskPlatformCredits: 12.34,
      message: "ledger rejected",
      evidence: {
        ledgerStatus: "ledger_rejected",
        ledgerIdempotencyKey: "provider-call:call_01:charge:v1",
      },
      createdAt: "2026-05-26T10:00:00.000Z",
    });
  });
});
