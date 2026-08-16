import {
  buildProviderCredentialLifecycleEventKey,
  type ProviderCredentialLifecycleEvent,
} from "./providerCredentialLifecycle";
import { isMissingRecordError } from "./isMissingRecordError";

export type ProviderCredentialLifecycleStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeProviderCredentialLifecycleEvent({
  store,
  event,
}: {
  store: ProviderCredentialLifecycleStore;
  event: ProviderCredentialLifecycleEvent;
}): Promise<{ key: string }> {
  const key = buildProviderCredentialLifecycleEventKey(
    event.credentialId,
    event.eventId
  );
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isMissingRecordError(error)) throw error;
  }
  if (existing) {
    throw new Error(`provider credential lifecycle event already exists: ${key}`);
  }
  await store.put(key, event);
  return { key };
}
