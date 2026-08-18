import {
  buildBillingAdminAuditEventKey,
  type BillingAdminAuditEvent,
} from "./billingAdminAuditEvent";
import { isMissingRecordError } from "./isMissingRecordError";

export type BillingAdminAuditEventStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeBillingAdminAuditEvent({
  store,
  event,
}: {
  store: BillingAdminAuditEventStore;
  event: BillingAdminAuditEvent;
}): Promise<{ key: string }> {
  const key = buildBillingAdminAuditEventKey(event.eventId);
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isMissingRecordError(error)) throw error;
  }
  if (existing) {
    throw new Error(`billing admin audit event already exists: ${key}`);
  }
  await store.put(key, event);
  return { key };
}
