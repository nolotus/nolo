import type { SharedSpaceDialogSummary } from "database/client/sharedSpaceDialogPage";
import type { MyContentListItem } from "app/utils/myContentItems";
import { parseDialogKey } from "database/dialogKey";
import type { OwnedDialogSummary } from "database/client/ownedDialogPage";
import {
  getRecordTimestamp,
  getRestoreTimestamp,
  isTombstoneRecord,
  shouldReplaceWithNextRecord,
} from "database/tombstones";

export type HistorySummary = OwnedDialogSummary & {
  pinned?: boolean;
  createdAt?: string | number;
  spaceName?: string;
  ownerUserId?: string;
};
type Candidate = { record: HistorySummary; cached?: MyContentListItem };

// Equal-version pages have no source priority. Use a stable field ordering so
// page arrival order cannot change either the winner or its partial metadata.
const tieKey = (record: HistorySummary): string => JSON.stringify([
  record.title, record.pinned, record.createdAt, record.spaceId,
  record.spaceName, record.restoredAt, record.updatedAt, record.ownerUserId, record.dbKey,
]);

/** Reconcile complete per-key evidence before projecting visible rows.
 * Ordinary updates select the active version, never constitute restoration.
 * Tombstones remain available until all explicit restore evidence is known.
 */
export function mergeHistoryItems(
  cached: readonly MyContentListItem[],
  pages: readonly HistorySummary[],
  userId?: string,
): MyContentListItem[] {
  const byKey = new Map<string, Candidate[]>();
  for (const item of cached) {
    const owner = item.type === "dialog" ? parseDialogKey(item.contentKey)?.userId : undefined;
    if (userId !== undefined && item.type === "dialog" && owner !== userId && owner !== "local") continue;
    const candidates = byKey.get(item.contentKey) ?? [];
    candidates.push({ record: item, cached: item });
    byKey.set(item.contentKey, candidates);
  }
  for (const record of pages) {
    const key = record.contentKey || record.dbKey;
    if (!key || (userId !== undefined && parseDialogKey(key)?.userId !== userId)) continue;
    const candidates = byKey.get(key) ?? [];
    candidates.push({ record });
    byKey.set(key, candidates);
  }

  const result: MyContentListItem[] = [];
  for (const [key, candidates] of byKey) {
    let tombstone: HistorySummary | undefined;
    let restore: HistorySummary | undefined;
    const active: Candidate[] = [];
    for (const candidate of candidates) {
      const { record } = candidate;
      if (isTombstoneRecord(record)) {
        if (!tombstone || shouldReplaceWithNextRecord(record, tombstone)) tombstone = record;
      } else {
        active.push(candidate);
        const restoreTs = getRestoreTimestamp(record);
        const previousRestoreTs = getRestoreTimestamp(restore);
        if (restoreTs > previousRestoreTs ||
            (restoreTs > 0 && restoreTs === previousRestoreTs &&
              tieKey(record) > tieKey(restore!))) restore = record;
      }
    }
    if (!active.length) continue;
    active.sort((a, b) =>
      getRecordTimestamp(a.record) - getRecordTimestamp(b.record) ||
      Number(Boolean(a.cached)) - Number(Boolean(b.cached)) ||
      (tieKey(a.record) < tieKey(b.record) ? -1 : tieKey(a.record) > tieKey(b.record) ? 1 : 0),
    );
    const winner = active[active.length - 1]!;
    // A newer ordinary version may omit restoredAt. Carry independently
    // observed explicit evidence, not updatedAt, into the shared comparison.
    const canonical = { ...winner.record, ...(restore ? { restoredAt: restore.restoredAt } : {}) };
    if (tombstone && !shouldReplaceWithNextRecord(canonical, tombstone)) continue;

    let item: MyContentListItem | undefined;
    for (const candidate of active) {
      const summary = candidate.record;
      // Only supplied, valid fields overwrite metadata. null explicitly clears
      // spaceId; null is not a value for required title/pinned/spaceName fields.
      item = {
        ...item,
        ...summary,
        ...candidate.cached,
        source: candidate.cached?.source ?? item?.source ?? "user-data",
        type: candidate.cached?.type ?? item?.type ?? "dialog",
        contentKey: key,
        title: typeof summary.title === "string" ? summary.title : item?.title ?? key,
        pinned: typeof summary.pinned === "boolean" ? summary.pinned : item?.pinned ?? false,
        createdAt: summary.createdAt ?? item?.createdAt ?? summary.updatedAt ?? 0,
        updatedAt: summary.updatedAt ?? item?.updatedAt ?? 0,
        spaceId: summary.spaceId !== undefined ? summary.spaceId : item?.spaceId ?? null,
        spaceName: typeof summary.spaceName === "string" ? summary.spaceName : item?.spaceName ?? "",
      } as MyContentListItem;
    }
    result.push({ ...item!, ...(restore ? { restoredAt: restore.restoredAt } : {}) });
  }
  return result;
}

/** Authorized shared candidates use exactly the owned-history reconciliation truth. */
export function mergeSharedHistoryItems(pages: readonly SharedSpaceDialogSummary[]): SharedSpaceDialogSummary[] {
  return mergeHistoryItems([], pages) as unknown as SharedSpaceDialogSummary[];
}
