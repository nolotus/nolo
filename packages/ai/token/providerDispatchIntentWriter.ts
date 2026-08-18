import { isMissingRecordError } from "./isMissingRecordError";
import {
  buildProviderDispatchIntentKey,
  type ProviderDispatchIntent,
} from "./providerDispatchIntent";

export type ProviderDispatchIntentStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeProviderDispatchIntent({
  store,
  intent,
}: {
  store: ProviderDispatchIntentStore;
  intent: ProviderDispatchIntent;
}): Promise<{ key: string }> {
  const key = buildProviderDispatchIntentKey(intent.providerCallId, intent.intentId);
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isMissingRecordError(error)) throw error;
  }
  if (existing) {
    throw new Error(`provider dispatch intent already exists: ${key}`);
  }
  await store.put(key, intent);
  return { key };
}
