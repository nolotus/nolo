import {
  buildBillingAnomalyLifecycleEventKey,
  type BillingAnomalyLifecycleEvent,
} from "./billingAnomalyLifecycle";
import { isMissingRecordError } from "./isMissingRecordError";

export type BillingAnomalyLifecycleStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeBillingAnomalyLifecycleEvent({
  store,
  event,
}: {
  store: BillingAnomalyLifecycleStore;
  event: BillingAnomalyLifecycleEvent;
}): Promise<{ key: string }> {
  const key = buildBillingAnomalyLifecycleEventKey(
    event.anomalyId,
    event.eventId
  );
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isMissingRecordError(error)) throw error;
  }
  if (existing) {
    throw new Error(`billing anomaly lifecycle event already exists: ${key}`);
  }
  await store.put(key, event);
  return { key };
}
