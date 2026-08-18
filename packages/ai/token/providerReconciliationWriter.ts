import {
  buildProviderReconciliationBucketKey,
  type ProviderReconciliationBucket,
} from "./providerReconciliation";
import { isMissingRecordError } from "./isMissingRecordError";

export type ProviderReconciliationBucketStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeProviderReconciliationBucket({
  store,
  bucket,
}: {
  store: ProviderReconciliationBucketStore;
  bucket: ProviderReconciliationBucket;
}): Promise<{ key: string }> {
  const key = buildProviderReconciliationBucketKey(bucket.id);
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isMissingRecordError(error)) throw error;
  }
  if (existing) {
    throw new Error(`provider reconciliation bucket already exists: ${key}`);
  }
  await store.put(key, bucket);
  return { key };
}
