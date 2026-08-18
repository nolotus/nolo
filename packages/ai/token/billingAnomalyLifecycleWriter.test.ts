import { describe, expect, it, mock } from "bun:test";
import {
  buildBillingAnomalyLifecycleEventKey,
  type BillingAnomalyLifecycleEvent,
} from "./billingAnomalyLifecycle";
import { writeBillingAnomalyLifecycleEvent } from "./billingAnomalyLifecycleWriter";

const event = {
  schemaVersion: 1,
  recordType: "billing_anomaly_lifecycle_event",
  anomalyId: "anom_01",
  eventId: "evt_01",
  status: "resolved",
  createdAt: "2026-05-26T10:00:00.000Z",
  actorId: "usage-manager",
} satisfies BillingAnomalyLifecycleEvent;

describe("writeBillingAnomalyLifecycleEvent", () => {
  it("writes lifecycle events append-only", async () => {
    const written: Record<string, unknown> = {};
    const store = {
      get: mock(async () => {
        const error = new Error("not found") as Error & { code?: string };
        error.code = "LEVEL_NOT_FOUND";
        throw error;
      }),
      put: mock(async (key: string, value: unknown) => {
        written[key] = value;
      }),
    };

    const result = await writeBillingAnomalyLifecycleEvent({ store, event });

    const key = buildBillingAnomalyLifecycleEventKey(
      event.anomalyId,
      event.eventId
    );
    expect(result).toEqual({ key });
    expect(written[key]).toEqual(event);
  });

  it("refuses to overwrite an existing lifecycle event", async () => {
    const store = {
      get: mock(async () => ({ existing: true })),
      put: mock(async () => undefined),
    };

    await expect(
      writeBillingAnomalyLifecycleEvent({ store, event })
    ).rejects.toThrow(
      "billing anomaly lifecycle event already exists: billing-anomaly-lifecycle-anom_01-event-evt_01"
    );
    expect(store.put).not.toHaveBeenCalled();
  });
});
