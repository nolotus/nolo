import { isLevelNotFoundError } from "database/levelNotFoundError";
import { buildEvolutionCaseKey, type EvolutionCase } from "./case";

export type EvolutionCaseStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeEvolutionCase({
  store,
  evolutionCase,
}: {
  store: EvolutionCaseStore;
  evolutionCase: EvolutionCase;
}): Promise<{ key: string }> {
  const key = buildEvolutionCaseKey(evolutionCase.id);
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isLevelNotFoundError(error)) throw error;
  }
  if (existing) {
    throw new Error(`evolution case already exists: ${key}`);
  }
  await store.put(key, evolutionCase);
  return { key };
}
