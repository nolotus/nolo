import { describe, expect, it } from "bun:test";
import {
  buildBillingAnomalyLifecycleEventKey,
  createBillingAnomalyLifecycleEvent,
} from "./billingAnomalyLifecycle";

describe("billing anomaly lifecycle event", () => {
  it("creates append-only lifecycle events without mutating the anomaly", () => {
    const event = createBillingAnomalyLifecycleEvent({
      anomalyId: "anom_01",
      eventId: "evt_01",
      status: "acknowledged",
      createdAt: "2026-05-26T10:00:00.000Z",
      actorId: "usage-manager",
      reason: "reviewing provider bucket",
    });

    expect(event).toEqual({
      schemaVersion: 1,
      recordType: "billing_anomaly_lifecycle_event",
      anomalyId: "anom_01",
      eventId: "evt_01",
      status: "acknowledged",
      createdAt: "2026-05-26T10:00:00.000Z",
      actorId: "usage-manager",
      reason: "reviewing provider bucket",
    });
  });

  it("uses a deterministic key scoped by anomaly id and event id", () => {
    expect(buildBillingAnomalyLifecycleEventKey("anom_01", "evt_01")).toBe(
      "billing-anomaly-lifecycle-anom_01-event-evt_01"
    );
  });
});
