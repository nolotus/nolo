import { assertIsoTimestamp } from "./assertIsoTimestamp";

export type BillingAdminAuditAction =
  | "dry_run_viewed"
  | "reconciliation_dry_run"
  | "reconciliation_committed"
  | "plan_marked_reviewed"
  | "plan_abandoned";

export type BillingAdminAuditEvent = {
  schemaVersion: 1;
  recordType: "billing_admin_audit_event";
  eventId: string;
  actorId: string;
  action: BillingAdminAuditAction;
  anomalyId: string;
  planId: string;
  inputSetHash: string;
  createdAt: string;
  reason?: string;
};

export const buildBillingAdminAuditEventKey = (eventId: string) =>
  `billing-admin-audit-event-${eventId}`;


export function createBillingAdminAuditEvent({
  eventId,
  actorId,
  action,
  anomalyId,
  planId,
  inputSetHash,
  createdAt,
  reason,
}: {
  eventId: string;
  actorId: string;
  action: BillingAdminAuditAction;
  anomalyId: string;
  planId: string;
  inputSetHash: string;
  createdAt: string;
  reason?: string | null;
}): BillingAdminAuditEvent {
  if (!eventId.trim()) throw new Error("eventId is required");
  if (!actorId.trim()) throw new Error("actorId is required");
  if (!anomalyId.trim()) throw new Error("anomalyId is required");
  if (!planId.trim()) throw new Error("planId is required");
  if (!inputSetHash.trim()) throw new Error("inputSetHash is required");
  assertIsoTimestamp("createdAt", createdAt);
  return {
    schemaVersion: 1,
    recordType: "billing_admin_audit_event",
    eventId: eventId.trim(),
    actorId: actorId.trim(),
    action,
    anomalyId: anomalyId.trim(),
    planId: planId.trim(),
    inputSetHash: inputSetHash.trim(),
    createdAt,
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  };
}
