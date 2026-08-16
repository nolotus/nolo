import { assertIsoTimestamp } from "./assertIsoTimestamp";
import type { BillingAnomalyStatus } from "./billingAnomaly";

export type BillingAnomalyLifecycleEvent = {
  schemaVersion: 1;
  recordType: "billing_anomaly_lifecycle_event";
  anomalyId: string;
  eventId: string;
  status: BillingAnomalyStatus;
  createdAt: string;
  actorId?: string;
  reason?: string;
};

export const buildBillingAnomalyLifecycleEventKey = (
  anomalyId: string,
  eventId: string
) => `billing-anomaly-lifecycle-${anomalyId}-event-${eventId}`;


export function createBillingAnomalyLifecycleEvent({
  anomalyId,
  eventId,
  status,
  createdAt,
  actorId,
  reason,
}: {
  anomalyId: string;
  eventId: string;
  status: BillingAnomalyStatus;
  createdAt: string;
  actorId?: string | null;
  reason?: string | null;
}): BillingAnomalyLifecycleEvent {
  if (!anomalyId.trim()) throw new Error("anomalyId is required");
  if (!eventId.trim()) throw new Error("eventId is required");
  assertIsoTimestamp("createdAt", createdAt);
  return {
    schemaVersion: 1,
    recordType: "billing_anomaly_lifecycle_event",
    anomalyId: anomalyId.trim(),
    eventId: eventId.trim(),
    status,
    createdAt,
    ...(actorId?.trim() ? { actorId: actorId.trim() } : {}),
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  };
}
