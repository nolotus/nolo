import { asTrimmedNonEmptyStringArray } from "core/stringArray";
import { asTrimmedString } from "core/trimmedString";
import {
  createMemoryKey,
  createMemoryOwnerIndexKey,
  createMemorySubjectKindIndexKey,
  memoryOwnerRange,
} from "database/keys";
import type {
  MemoryFacet,
  MemoryItem,
  MemoryKind,
  MemoryOwnerRef,
  MemorySubjectType,
} from "./types";
import { _appendRetiredStateBatch, loadMemoryVNextCatalog } from "./vnext/store";
import type { MemoryStateVNext } from "./vnext/types";

/**
 * Public id shape for a vNext current state, as projected by queryMemory.
 * Delete paths must recognize this prefix to bridge recall → deletion.
 */
const VNEXT_STATE_ID_PREFIX = "vnext-state-";

/**
 * Project a vNext State into the same MemoryItem shape queryMemory returns,
 * so preview/confirm surfaces and deletionToken treat both datasets uniformly.
 */
const toVNextMemoryItem = (
  state: MemoryStateVNext,
  owner: MemoryOwnerRef
): MemoryItem => ({
  id: `${VNEXT_STATE_ID_PREFIX}${state.id}`,
  ownerType: owner.ownerType,
  ownerId: owner.ownerId,
  visibility: "private",
  subjectType: "user",
  subjectId: owner.ownerId,
  kind: "semantic",
  content: state.text.trim(),
  createdAt: state.createdAt,
  lastActivatedAt: state.createdAt,
  activationCount: 1,
  importance: 0.9,
  confidence: 0.9,
  resident: state.facet === "preference" || state.facet === "style",
});

/**
 * vNext states are NOT matched by a legacy-shaped filter set. The caller
 * (`canMatchVNext` in deleteMemoriesForOwnerFromDb) already skips the whole
 * vNext section when any scoping filter other than ids / contentSubstring is
 * present, so this matcher only ever sees those two filters — and it combines
 * them exactly like the legacy `matchesFilters` does, i.e. with AND:
 *   - when an id list is present, `vnext-state-<id>` must be IN it;
 *   - when contentSubstring is present, state.text must CONTAIN it;
 *   - when neither is present, nothing matches.
 *
 * The AND semantics are what keep `{ ids: [<legacy id>], contentSubstring }`
 * safe: the id list pins the match set to the ids the caller explicitly named,
 * so a vNext state that is NOT in that list must not be retired merely because
 * its text contains the keyword. With OR, a keyword-scoped delete would retire
 * every current state containing that word even though the caller only asked
 * for one specific (legacy) id — a silent recall deletion with no UI recovery
 * path. A legacy-shaped filter combination can therefore never retire a state
 * that the same combination could not have matched on the legacy side.
 */
const matchesVNextFilters = (
  state: MemoryStateVNext,
  idSet: Set<string> | null,
  contentSub: string
): boolean => {
  // No scoping signal at all: there is nothing to match on, so match nothing
  // (never "match all", which would retire unrelated current states).
  if (!idSet && !contentSub) return false;
  // AND, mirroring matchesFilters: every filter that is present must be
  // satisfied.
  if (idSet && !idSet.has(`${VNEXT_STATE_ID_PREFIX}${state.id}`)) return false;
  if (contentSub && !state.text.toLowerCase().includes(contentSub)) return false;
  return true;
};

interface DeleteMemoryFilters {
  ids?: string[];
  kinds?: MemoryKind[];
  facets?: MemoryFacet[];
  subjectType?: MemorySubjectType;
  subjectId?: string;
  patternKeyPrefix?: string;
  sourceDialogId?: string;
  tags?: string[];
  contentSubstring?: string;
  limit?: number;
  dryRun?: boolean;
  deletionToken?: string;
}

export interface DeleteMemoryResult {
  deletedCount: number;
  deletedIds: string[];
  /**
   * Ids (in the public `vnext-state-<id>` shape) of vNext states that were
   * retired in place rather than physically deleted: the record, text and
   * provenance are preserved for audit, only recall of them stops.
   *
   * `deletedCount` / `deletedIds` keep their COMBINED semantics (physical
   * deletes + retires) for backward compatibility with callers that treat
   * "gone from recall" uniformly; use this field to tell the two apart.
   */
  retiredIds: string[];
  matchedItems: MemoryItem[];
  deletionToken?: string;
}

export function hasExplicitDeleteFilters(filters: DeleteMemoryFilters): boolean {
  return Boolean(
    (filters.ids && filters.ids.length > 0) ||
    (typeof filters.contentSubstring === "string" && filters.contentSubstring.trim().length > 0) ||
    (filters.tags && filters.tags.length > 0) ||
    (typeof filters.sourceDialogId === "string" && filters.sourceDialogId.trim().length > 0) ||
    (typeof filters.patternKeyPrefix === "string" && filters.patternKeyPrefix.trim().length > 0) ||
    (filters.facets && filters.facets.length > 0) ||
    (typeof filters.subjectId === "string" && filters.subjectId.trim().length > 0)
  );
}

export function generateMemoryDeletionToken(ownerId: string, itemIds: string[]): string {
  const sorted = [...itemIds].sort().join(",");
  const seed = `${ownerId}:${sorted}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return `tok-${Math.abs(hash).toString(36)}-${itemIds.length}`;
}

const normalizeSet = (values?: string[]): Set<string> | null => {
  if (!Array.isArray(values) || values.length === 0) return null;
  const normalized = asTrimmedNonEmptyStringArray(values);
  return normalized.length > 0 ? new Set(normalized) : null;
};

const matchesFilters = (item: MemoryItem, filters: DeleteMemoryFilters): boolean => {
  const idSet = normalizeSet(filters.ids);
  if (idSet && !idSet.has(item.id)) return false;

  const kindSet = normalizeSet(filters.kinds);
  if (kindSet && !kindSet.has(item.kind)) return false;

  const facetSet = normalizeSet(filters.facets);
  if (facetSet && (!item.facet || !facetSet.has(item.facet))) return false;

  if (filters.subjectType && item.subjectType !== filters.subjectType) return false;
  if (filters.subjectId && item.subjectId !== filters.subjectId) return false;

  const prefix = asTrimmedString(filters.patternKeyPrefix);
  if (prefix && !(item.patternKey ?? "").startsWith(prefix)) return false;

  if (filters.sourceDialogId && item.sourceDialogId !== filters.sourceDialogId) {
    return false;
  }

  const tagSet = normalizeSet(filters.tags);
  if (tagSet) {
    const itemTags = new Set(asTrimmedNonEmptyStringArray(item.tags));
    for (const tag of tagSet) {
      if (!itemTags.has(tag)) return false;
    }
  }

  const contentSub = asTrimmedString(filters.contentSubstring);
  if (
    contentSub &&
    !(item.content ?? "").toLowerCase().includes(contentSub.toLowerCase())
  ) {
    return false;
  }

  return true;
};

const deleteMemoryItemWithIndexesInBatch = (
  batch: any,
  item: MemoryItem
) => {
  batch.del(createMemoryKey(item.ownerType, item.ownerId, item.id));
  batch.del(
    createMemoryOwnerIndexKey(
      item.ownerType,
      item.ownerId,
      item.createdAt,
      item.id
    )
  );
  batch.del(
    createMemorySubjectKindIndexKey(
      item.subjectType,
      item.subjectId,
      item.kind,
      item.createdAt,
      item.id
    )
  );
};

export const deleteMemoriesForOwnerFromDb = async (
  db: any,
  owner: MemoryOwnerRef,
  filters: DeleteMemoryFilters = {}
): Promise<DeleteMemoryResult> => {
  if (!hasExplicitDeleteFilters(filters)) {
    throw new Error(
      "At least one filter is required; delete operation will not delete all memory implicitly."
    );
  }

  const range = memoryOwnerRange(owner.ownerType, owner.ownerId);
  const matchedItems: MemoryItem[] = [];
  const limit = typeof filters.limit === "number" && filters.limit > 0
    ? filters.limit
    : Number.POSITIVE_INFINITY;

  for await (const [, value] of db.iterator({
    gte: range.start,
    lte: range.end,
    reverse: true,
  })) {
    const memoryId = typeof value?.memoryId === "string" ? value.memoryId : "";
    if (!memoryId) continue;
    const item = (await db
      .get(createMemoryKey(owner.ownerType, owner.ownerId, memoryId))
      .catch(() => null)) as MemoryItem | null;
    if (!item) continue;
    if (!matchesFilters(item, filters)) continue;
    matchedItems.push(item);
    if (matchedItems.length >= limit) break;
  }

  // vNext current states live in a separate key space (`mem2-s-…`) and are not
  // covered by the legacy owner scan above. Match them here so deleting a
  // recalled memory by id or content actually works.
  const idSet = normalizeSet(filters.ids);
  const contentSub = asTrimmedString(filters.contentSubstring).toLowerCase();
  const vnextStateIdsToRetire: string[] = [];
  const vnextStatesToRetire: MemoryStateVNext[] = [];
  const vnextMatchedItems: MemoryItem[] = [];
  let vnextPrincipalId: string | null = null;
  // Scoping-filters guard: any filter other than ids / contentSubstring makes
  // the whole vNext section non-matching (see the note on matchesVNextFilters).
  // A request like deleteMemory({ contentKeyword, kinds: [...] }) must not retire
  // a current state that the kinds filter could never have matched.
  const hasScopingFilters = Boolean(
    normalizeSet(filters.kinds) ||
      normalizeSet(filters.facets) ||
      normalizeSet(filters.tags) ||
      asTrimmedString(filters.subjectType) ||
      asTrimmedString(filters.subjectId) ||
      asTrimmedString(filters.patternKeyPrefix) ||
      asTrimmedString(filters.sourceDialogId)
  );
  const canMatchVNext =
    !hasScopingFilters &&
    (contentSub.length > 0 ||
      (idSet !== null &&
        [...idSet].some((id) => id.startsWith(VNEXT_STATE_ID_PREFIX))));
  if (canMatchVNext) {
    vnextPrincipalId = `${owner.ownerType}:${encodeURIComponent(owner.ownerId)}`;
    const catalog = await loadMemoryVNextCatalog(db, vnextPrincipalId);
    for (const state of catalog.states) {
      // Check the budget BEFORE pushing, so the legacy scan's limit is also the
      // ceiling for the combined (legacy + vNext) match set.
      if (matchedItems.length >= limit) break;
      if (state.retiredAt) continue;
      if (!matchesVNextFilters(state, idSet, contentSub)) continue;
      vnextStateIdsToRetire.push(state.id);
      vnextStatesToRetire.push(state);
      const projected = toVNextMemoryItem(state, owner);
      vnextMatchedItems.push(projected);
      matchedItems.push(projected);
    }
  }

  if (matchedItems.length === 0) {
    return { deletedCount: 0, deletedIds: [], retiredIds: [], matchedItems: [] };
  }

  const token = generateMemoryDeletionToken(
    owner.ownerId,
    matchedItems.map((i) => i.id)
  );

  if (filters.dryRun) {
    return {
      deletedCount: 0,
      deletedIds: [],
      retiredIds: [],
      matchedItems,
      deletionToken: token,
    };
  }

  if (filters.deletionToken && filters.deletionToken !== token) {
    throw new Error(
      "deletionToken mismatch: memory dataset changed since preview; please rerun dry-run preview before confirming."
    );
  }

  // Split legacy records from vNext states by membership in the vNext retire
  // set (NOT by id-prefix sniffing): a legacy id that happened to start with
  // "vnext-state-" must not be reported as deleted while actually left behind.
  // vnextStateIdsToRetire and vnextMatchedItems are filled in lockstep above.
  const vnextMatchedIdSet = new Set(
    vnextStateIdsToRetire.map((stateId) => `${VNEXT_STATE_ID_PREFIX}${stateId}`)
  );
  const legacyItems = matchedItems.filter((item) => !vnextMatchedIdSet.has(item.id));

  // Single atomic commit for BOTH sides. vNext retires are appended to the same
  // batch (and the same `write()`) as the legacy index deletions, so a failure
  // can never leave "legacy rows deleted + half the states retired" behind.
  // vNext keeps the supersede-primitive semantics of retireMemoryStateVNext —
  // the record, text and provenance stay readable for audit — but the write is
  // issued through _appendRetiredStateBatch so it shares this batch.
  // `vnextStatesToRetire` can only be filled inside the single `canMatchVNext`
  // block above, which also sets `vnextPrincipalId` before the first push — so
  // a non-empty retire list already implies the catalog was loaded from a real
  // principal. (Earlier revisions also tested `!!vnextPrincipalId` here, which
  // could never be false when the list is non-empty.)
  const shouldRetireVNext = vnextStatesToRetire.length > 0;
  if (legacyItems.length > 0 || shouldRetireVNext) {
    const batch = db.batch();
    for (const item of legacyItems) {
      deleteMemoryItemWithIndexesInBatch(batch, item);
    }
    if (shouldRetireVNext) {
      const nowIso = new Date().toISOString();
      for (const state of vnextStatesToRetire) {
        _appendRetiredStateBatch(batch, { ...state, retiredAt: nowIso });
      }
    }
    await batch.write();
  }

  return {
    deletedCount: matchedItems.length,
    deletedIds: matchedItems.map((item) => item.id),
    retiredIds: vnextMatchedItems.map((item) => item.id),
    matchedItems,
    deletionToken: token,
  };
};

export const deleteMemoriesForOwner = async (
  owner: MemoryOwnerRef,
  filters: DeleteMemoryFilters = {}
): Promise<DeleteMemoryResult> => {
  const getDefaultDb = async () => (await import("database-engine/db")).default;
  return deleteMemoriesForOwnerFromDb(await getDefaultDb(), owner, filters);
};
