import { isLevelNotFoundError } from "database/levelNotFoundError";
import {
  buildEvolutionRunBaselineKey,
  type EvolutionRunBaselineRecord,
} from "./runBaseline";

export type EvolutionRunBaselineStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<unknown>;
};

export const writeEvolutionRunBaselineRecord = async ({
  store,
  record,
}: {
  store: EvolutionRunBaselineStore;
  record: EvolutionRunBaselineRecord;
}): Promise<void> => {
  const key = buildEvolutionRunBaselineKey(record.id);
  try {
    await store.get(key);
    throw new Error(`evolution run baseline already exists: ${record.id}`);
  } catch (error) {
    if (!isLevelNotFoundError(error)) throw error;
  }
  await store.put(key, record);
};
