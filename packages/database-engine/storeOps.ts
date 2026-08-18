// Store-level batch read primitive. Pure data layer — no auth, no routing.
// Lives in the public engine surface (moved to engine/ in stage C step 1).

import { asOptionalPositiveFiniteNumber } from "core/optionalPositiveNumber";

export type StoreGetLike = {
  get(key: string): Promise<unknown>;
};

/**
 * Batch-read many keys with in-flight concurrency (default unbounded Promise.all).
 * Missing keys are omitted from the map (same as swallow-NotFound per key).
 * Prefer this over N× serial `store.get` in handlers / query subject-ref paths.
 *
 * Auth is still the caller's responsibility — this only removes I/O amplification.
 */
export async function storeGetMany(
  store: StoreGetLike,
  keys: readonly string[],
  options?: { concurrency?: number }
): Promise<Map<string, unknown>> {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    if (typeof key !== "string" || !key || seen.has(key)) continue;
    seen.add(key);
    unique.push(key);
  }

  const out = new Map<string, unknown>();
  if (unique.length === 0) return out;

  const positiveConcurrency = asOptionalPositiveFiniteNumber(
    options?.concurrency,
  );
  const concurrency =
    positiveConcurrency !== undefined
      ? Math.min(Math.floor(positiveConcurrency), unique.length)
      : unique.length;

  let next = 0;
  const worker = async () => {
    while (next < unique.length) {
      const index = next;
      next += 1;
      const key = unique[index];
      try {
        out.set(key, await store.get(key));
      } catch {
        // miss / not found — omit
      }
    }
  };

  await Promise.all(
    Array.from({ length: concurrency }, () => worker())
  );
  return out;
}