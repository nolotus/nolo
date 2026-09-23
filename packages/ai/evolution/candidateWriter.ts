import { isLevelNotFoundError } from "database/levelNotFoundError";
import { buildEvolutionCandidateKey, type EvolutionCandidate } from "./candidate";

export type EvolutionCandidateStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeEvolutionCandidate({
  store,
  candidate,
}: {
  store: EvolutionCandidateStore;
  candidate: EvolutionCandidate;
}): Promise<{ key: string }> {
  const key = buildEvolutionCandidateKey(candidate.id);
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isLevelNotFoundError(error)) throw error;
  }
  if (existing) {
    throw new Error(`evolution candidate already exists: ${key}`);
  }
  await store.put(key, candidate);
  return { key };
}
