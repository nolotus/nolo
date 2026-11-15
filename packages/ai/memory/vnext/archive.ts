import { createMemoryKey, memoryOwnerRange } from "database/keys";
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


/** Explicit history uses index order (newest first), not a global relevance ranking.
 * Each page consumes at most 100 index entries; empty pages can have a cursor.
 * Cursors bind owner/query and are positions, not snapshot or authorization tokens.
 */
export async function queryMemoryArchivePage(input: {
  db: any;
  owner: MemoryOwnerRef;
  query: string;
  limit?: number;
  cursor?: string | null;
}): Promise<{
  hits: ArchiveSearchHit[];
  cursor: string | null;
  truncated: boolean;
  scannedCount: number;
  scanLimit: number;
  limit: number;
}> {
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid archive limit (1..100)");
  }
  if (typeof input.query !== "string" || !input.query.trim() || input.query.length > 4000) {
    throw new Error("Invalid archive query");
  }
  const query = input.query.trim();
  const owner = input.owner;
  const range = memoryOwnerRange(owner.ownerType, owner.ownerId);
  let after: string | undefined;
  if (input.cursor != null) {
    try {
      if (typeof input.cursor !== "string" || input.cursor.length > 16000) throw new Error();
      const decoded = JSON.parse(input.cursor);
      if (decoded.v !== 1 || decoded.ownerType !== owner.ownerType ||
          decoded.ownerId !== owner.ownerId || decoded.query !== query ||
          typeof decoded.key !== "string" || decoded.key <= range.start || decoded.key >= range.end) {
        throw new Error();
      }
      after = decoded.key;
    } catch {
      throw new Error("Invalid archive cursor");
    }
  }
  const scanLimit = 100;
  const tokens = new Set(tokenize(query).filter((token) => token.length >= 2));
  const hits: ArchiveSearchHit[] = [];
  let scannedCount = 0;
  let lastKey: string | undefined;
  let truncated = false;
  for await (const [key, ref] of input.db.iterator({
    gte: range.start, lte: range.end, reverse: true, ...(after ? { lt: after } : {}),
  })) {
    // One index-only lookahead distinguishes exhaustion from a bounded page.
    if (scannedCount >= scanLimit || hits.length >= limit) {
      truncated = true;
      break;
    }
    lastKey = key;
    scannedCount++;
    if (typeof ref?.memoryId !== "string") continue;
    let item: MemoryItem;
    try {
      item = await input.db.get(createMemoryKey(owner.ownerType, owner.ownerId, ref.memoryId));
    } catch (error) {
      if ((error as any)?.notFound || (error as Error)?.message === "NotFound" || (error as any)?.code === "LEVEL_NOT_FOUND") continue;
      throw error;
    }
    if (!item || item.ownerType !== owner.ownerType || item.ownerId !== owner.ownerId ||
        item.id !== ref.memoryId || typeof item.content !== "string") continue;
    const itemTokens = new Set(tokenize(item.content));
    const sharedTokens = [...tokens].filter((token) => itemTokens.has(token)).length;
    if (sharedTokens > 0) hits.push({ item, sharedTokens });
  }
  const cursor = truncated && lastKey ? JSON.stringify({
    v: 1, ownerType: owner.ownerType, ownerId: owner.ownerId, query, key: lastKey,
  }) : null;
  return { hits, cursor, truncated, scannedCount, scanLimit, limit };
}
