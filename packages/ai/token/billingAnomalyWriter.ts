import {
  buildBillingAnomalyKey,
  type BillingAnomaly,
} from "./billingAnomaly";
import { isMissingRecordError } from "./isMissingRecordError";

export type BillingAnomalyStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeBillingAnomaly({
  store,
  anomaly,
}: {
  store: BillingAnomalyStore;
  anomaly: BillingAnomaly;
}): Promise<{ key: string }> {
  const key = buildBillingAnomalyKey(anomaly.id);
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isMissingRecordError(error)) throw error;
  }
  if (existing) {
    throw new Error(`billing anomaly already exists: ${key}`);
  }
  await store.put(key, anomaly);
  return { key };
}
