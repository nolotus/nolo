import { buildProviderCallKey, type ProviderCallEvent } from "./providerCall";
import { isMissingRecordError } from "./isMissingRecordError";

export type ProviderCallStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeProviderCallEvent({
  store,
  event,
}: {
  store: ProviderCallStore;
  event: ProviderCallEvent;
}): Promise<{ key: string }> {
  const key = buildProviderCallKey(event.providerCallId, event.eventId);
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isMissingRecordError(error)) throw error;
  }
  if (existing) {
    throw new Error(`provider-call event already exists: ${key}`);
  }
  await store.put(key, event);
  return { key };
}
