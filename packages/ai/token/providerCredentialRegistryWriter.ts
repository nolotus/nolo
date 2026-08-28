import {
  buildProviderCredentialRegistryKey,
  type ProviderCredentialRegistryRecord,
} from "./providerCredentialRegistry";
import { isMissingRecordError } from "./isMissingRecordError";

export type ProviderCredentialRegistryStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeProviderCredentialRegistryRecord({
  store,
  record,
}: {
  store: ProviderCredentialRegistryStore;
  record: ProviderCredentialRegistryRecord;
}): Promise<{ key: string }> {
  const key = buildProviderCredentialRegistryKey(record.credentialId);
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isMissingRecordError(error)) throw error;
  }
  if (existing) {
    throw new Error(`provider credential registry record already exists: ${key}`);
  }
  await store.put(key, record);
  return { key };
}
