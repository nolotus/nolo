import { isMissingRecordError } from "./isMissingRecordError";
import { buildRatingResultKey, type RatingResult } from "./ratingResult";

export type RatingResultStore = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

export async function writeRatingResult({
  store,
  rating,
}: {
  store: RatingResultStore;
  rating: RatingResult;
}): Promise<{ key: string }> {
  const key = buildRatingResultKey(rating.id);
  let existing: unknown;
  try {
    existing = await store.get(key);
  } catch (error) {
    if (!isMissingRecordError(error)) throw error;
  }
  if (existing) {
    throw new Error(`rating result already exists: ${key}`);
  }
  await store.put(key, rating);
  return { key };
}
