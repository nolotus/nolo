import {
  buildProviderBillableEventKey,
  type ProviderBillableEvent,
} from "./providerBillableEvent";
import { isMissingRecordError } from "./isMissingRecordError";

export type ProviderBillableEventStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeProviderBillableEvent({
  store,
  event,
}: {
  store: ProviderBillableEventStore;
  event: ProviderBillableEvent;
}): Promise<{ key: string }> {
  const key = buildProviderBillableEventKey(event.id);
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isMissingRecordError(error)) throw error;
  }
  if (existing) {
    throw new Error(`provider billable event already exists: ${key}`);
  }
  await store.put(key, event);
  return { key };
}
