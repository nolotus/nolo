import { describe, expect, it, mock } from "bun:test";

import { writeBillingAnomaly } from "./billingAnomalyWriter";
import { createBillingAnomaly } from "./billingAnomaly";

const anomaly = createBillingAnomaly({
  anomalyId: "anom_01",
  kind: "rating_failed",
  severity: "high",
  stage: "rating",
  userId: "user-1",
  provider: "openai",
  model: "gpt-5.4",
  providerCallId: "call_01",
  message: "rating failed",
  evidence: {},
  createdAt: "2026-05-26T10:00:00.000Z",
});

describe("writeBillingAnomaly", () => {
  it("writes append-only anomaly records under deterministic keys", async () => {
    const written: Record<string, unknown> = {};
    const store = {
      get: mock(async () => {
        const error: any = new Error("not found");
        error.code = "LEVEL_NOT_FOUND";
        throw error;
      }),
      put: mock(async (key: string, value: unknown) => {
        written[key] = value;
      }),
    };

    const result = await writeBillingAnomaly({ store, anomaly });

    expect(result).toEqual({ key: "billing-anomaly-anom_01" });
    expect(written["billing-anomaly-anom_01"]).toEqual(anomaly);
  });

  it("refuses to overwrite an existing anomaly", async () => {
    const store = {
      get: mock(async () => ({ existing: true })),
      put: mock(async () => undefined),
    };

    await expect(writeBillingAnomaly({ store, anomaly })).rejects.toThrow(
      "billing anomaly already exists: billing-anomaly-anom_01"
    );
    expect(store.put).not.toHaveBeenCalled();
  });

  it("treats NOT_FOUND from the store as an empty append slot", async () => {
    const store = {
      get: mock(async () => {
        const error: any = new Error("missing");
        error.code = "NOT_FOUND";
        throw error;
      }),
      put: mock(async () => undefined),
    };

    await expect(writeBillingAnomaly({ store, anomaly })).resolves.toEqual({
      key: "billing-anomaly-anom_01",
    });
  });
});
