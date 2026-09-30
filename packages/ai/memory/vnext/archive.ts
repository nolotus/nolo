import type { MemoryItem, MemoryOwnerRef } from "../types";
import { loadOwnerItemsFromDb } from "../queryShared";
import { tokenize } from "../rank";

export interface ArchiveSearchHit {
  item: MemoryItem;
  sharedTokens: number;
}

export interface MemoryArchiveSearchInput {
  db: any;
  owners: MemoryOwnerRef[];
  query: string;
  /** Scan depth per owner. Defaults to 100 for deep recall. */
  scanLimit?: number;
  /** Max results returned. Defaults to 20. */
  limit?: number;
}

/**
 * M5-R Read-only archive search.
 * Searches the frozen legacy store without:
 * - touching items (no activationCount / lastActivatedAt writes)
 * - decaying scores
 * - building overlays
 * - driving promotion
 */
export async function searchMemoryArchive(
  input: MemoryArchiveSearchInput
): Promise<ArchiveSearchHit[]> {
  const queryTokens = new Set(tokenize(input.query).filter((t) => t.length >= 2));
  if (queryTokens.size === 0) return [];

  const scanLimit = input.scanLimit ?? 100;
  // Directly scan owner items across all owners with deep scan window
  const rawItems = (
    await Promise.all(
      input.owners.map((owner) => loadOwnerItemsFromDb(input.db, owner, scanLimit))
    )
  ).flat();

  const hits: ArchiveSearchHit[] = [];
  for (const item of rawItems) {
    const text = [item.content, ...(item.tags ?? []), item.patternKey ?? ""].join(" ");
    const itemTokens = new Set(tokenize(text).filter((t) => t.length >= 2));
    let sharedTokens = 0;
    for (const t of queryTokens) {
      if (itemTokens.has(t)) sharedTokens++;
    }
    if (sharedTokens > 0) {
      hits.push({ item, sharedTokens });
    }
  }

  // Sort by lexical relevance desc, then recency desc
  return hits
    .sort((a, b) => b.sharedTokens - a.sharedTokens || b.item.createdAt.localeCompare(a.item.createdAt))
    .slice(0, input.limit ?? 20);
}
