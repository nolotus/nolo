import { isLevelNotFoundError } from "database/levelNotFoundError";
import {
  getRecordTimestamp,
  getTombstoneTimestamp,
  isTombstoneRecord,
  shouldReplaceWithNextRecord,
} from "database/tombstones";

export const LEGACY_SPACE_PREFIX = "space-";
export const LEGACY_SPACE_MEMBER_PREFIX = "space-member-";
export const SP_KEY_PREFIX = "sp:";
export const USR_KEY_PREFIX = "usr:";

export type SpaceRole = "owner" | "admin" | "member" | "guest";

export type SpaceReadableStore = {
  get: (key: string) => Promise<unknown>;
  iterator?: (options: {
    gte: string;
    lte: string;
  }) => AsyncIterable<[string, unknown]> | Iterable<[string, unknown]>;
};

export type SpaceScanEntry = {
  key: string;
  value: Record<string, unknown>;
  updatedAt: number;
  tombstone: boolean;
};

export type SpaceProjectionResult = {
  exists: boolean;
  active: boolean;
  tombstone: boolean;
  spaceId: string;
  record: Record<string, any> | null;
};

const isPlainRecord = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const normalizeSpaceRole = (role: unknown): SpaceRole | null => {
  if (typeof role !== "string") return null;
  const lowered = role.trim().toLowerCase();
  if (
    lowered === "owner" ||
    lowered === "admin" ||
    lowered === "member" ||
    lowered === "guest"
  ) {
    return lowered;
  }
  return null;
};

export const isValidKeySegment = (segment: unknown): segment is string =>
  typeof segment === "string" &&
  segment.length > 0 &&
  segment.length <= 256 &&
  !/[:/\s\0\uffff]/.test(segment);

export function normalizeSpaceIdSegment(spaceId: unknown): string | null {
  if (typeof spaceId !== "string") return null;
  const trimmed = spaceId.trim();
  if (!trimmed) return null;
  const bare = trimmed.startsWith(LEGACY_SPACE_PREFIX)
    ? trimmed.slice(LEGACY_SPACE_PREFIX.length)
    : trimmed;
  return bare.length > 0 ? bare : null;
}

export const spSpacePrefix = (spaceId: string): string => `sp:${spaceId}:`;
export const spMetaKey = (spaceId: string): string => `sp:${spaceId}:meta`;
export const spCatKey = (spaceId: string, catId: string): string =>
  `sp:${spaceId}:cat:${catId}`;
export const spItemKey = (spaceId: string, contentKey: string): string =>
  `sp:${spaceId}:item:${contentKey}`;
export const spMemKey = (spaceId: string, userId: string): string =>
  `sp:${spaceId}:mem:${userId}`;
export const usrSpPrefix = (userId: string): string => `usr:${userId}:sp:`;
export const usrSpKey = (userId: string, spaceId: string): string =>
  `usr:${userId}:sp:${spaceId}`;
export const legacySpaceKey = (spaceId: string): string =>
  `${LEGACY_SPACE_PREFIX}${spaceId}`;
export const legacySpaceMemberKey = (userId: string, spaceId: string): string =>
  `${LEGACY_SPACE_MEMBER_PREFIX}${userId}-${spaceId}`;

export const computeEntryTimestamp = (record: unknown): number => {
  if (!isPlainRecord(record)) return 0;
  if (isTombstoneRecord(record)) {
    return Math.max(getTombstoneTimestamp(record), getRecordTimestamp(record));
  }
  const extra = [record.spaceUpdatedAt, record.memberUpdatedAt];
  let best = getRecordTimestamp(record);
  for (const candidate of extra) {
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > best) {
      best = candidate;
    } else if (typeof candidate === "string" && candidate.trim()) {
      const parsed = Date.parse(candidate);
      if (Number.isFinite(parsed) && parsed > best) best = parsed;
    }
  }
  return best;
};

const mergeRecordPair = (
  base: Record<string, any> | null,
  incoming: Record<string, any> | null,
): Record<string, any> | null => {
  if (!base) return incoming;
  if (!incoming) return base;
  return shouldReplaceWithNextRecord(incoming, base) ? incoming : base;
};

export async function optionalStoreGet(
  store: SpaceReadableStore | null | undefined,
  key: string,
): Promise<Record<string, any> | null> {
  if (!store) return null;
  try {
    const val = await store.get(key);
    return isPlainRecord(val) ? val : null;
  } catch (error) {
    if (isLevelNotFoundError(error)) return null;
    throw error;
  }
}

async function scanPrefixRaw(
  store: SpaceReadableStore | null | undefined,
  prefix: string,
): Promise<Array<[string, Record<string, any>]>> {
  if (!store?.iterator) return [];
  const entries: Array<[string, Record<string, any>]> = [];
  for await (const [rawKey, rawValue] of store.iterator({
    gte: prefix,
    lte: `${prefix}\uffff`,
  })) {
    const key = String(rawKey);
    if (!key.startsWith(prefix)) continue;
    if (isPlainRecord(rawValue)) {
      entries.push([key, rawValue]);
    }
  }
  return entries;
}

const isValidMembershipPayload = (
  record: Record<string, any> | null,
  expectedUserId: string,
  expectedSpaceId: string,
  options?: { expectedLegacyDbKey?: string; requireExplicitIdentity?: boolean },
): record is Record<string, any> => {
  if (!record) return false;
  if (
    options?.expectedLegacyDbKey &&
    record.dbKey !== undefined &&
    record.dbKey !== options.expectedLegacyDbKey
  ) {
    return false;
  }
  if (options?.requireExplicitIdentity) {
    if (record.userId !== expectedUserId) return false;
    if (normalizeSpaceIdSegment(record.spaceId) !== expectedSpaceId) return false;
    return true;
  }
  if (record.userId !== undefined && record.userId !== expectedUserId) {
    return false;
  }
  if (record.spaceId !== undefined) {
    const payloadSpace = normalizeSpaceIdSegment(record.spaceId);
    if (payloadSpace !== expectedSpaceId) return false;
  }
  return true;
};

/**
 * Dual-read a single user's membership record across `sp:{spaceId}:mem:{userId}`,
 * `usr:{userId}:sp:{spaceId}`, and legacy `space-member-{userId}-{spaceId}`.
 */
export async function readSpaceMembershipRecord(
  store: SpaceReadableStore | null | undefined,
  userId: string | null | undefined,
  spaceId: string | null | undefined,
): Promise<{ active: Record<string, any> | null; raw: Record<string, any> | null }> {
  const uid = typeof userId === "string" ? userId.trim() : "";
  const sid = normalizeSpaceIdSegment(spaceId);
  if (!store || !uid || !sid) return { active: null, raw: null };

  const legKey = legacySpaceMemberKey(uid, sid);
  const [spMem, usrSp, legMem] = await Promise.all([
    isValidKeySegment(sid) && isValidKeySegment(uid)
      ? optionalStoreGet(store, spMemKey(sid, uid))
      : Promise.resolve(null),
    isValidKeySegment(sid) && isValidKeySegment(uid)
      ? optionalStoreGet(store, usrSpKey(uid, sid))
      : Promise.resolve(null),
    optionalStoreGet(store, legKey),
  ]);

  const validLegacy = isValidMembershipPayload(legMem, uid, sid, {
    expectedLegacyDbKey: legKey,
  })
    ? legMem
    : null;
  const validUsrSp = isValidMembershipPayload(usrSp, uid, sid, {
    requireExplicitIdentity: true,
  })
    ? usrSp
    : null;
  const validSpMem = isValidMembershipPayload(spMem, uid, sid, {
    requireExplicitIdentity: true,
  })
    ? spMem
    : null;

  let merged = mergeRecordPair(validLegacy, validUsrSp);
  merged = mergeRecordPair(merged, validSpMem);
  if (!merged) return { active: null, raw: null };
  if (isTombstoneRecord(merged)) return { active: null, raw: merged };
  return { active: merged, raw: merged };
}

/**
 * Dual-read a Space projection by merging `sp:{spaceId}:*` subkeys with legacy `space-{spaceId}`.
 * Safe for both full stores (with `iterator`) and minimal `get`-only stores.
 */
export async function readSpaceProjection(
  store: SpaceReadableStore | null | undefined,
  spaceId: string | null | undefined,
): Promise<SpaceProjectionResult> {
  const sid = normalizeSpaceIdSegment(spaceId);
  if (!store || !sid) {
    return { exists: false, active: false, tombstone: false, spaceId: "", record: null };
  }

  const canScanSp = isValidKeySegment(sid) && typeof store.iterator === "function";
  const [legacySpace, spEntries, directSpMeta] = await Promise.all([
    optionalStoreGet(store, legacySpaceKey(sid)),
    canScanSp ? scanPrefixRaw(store, spSpacePrefix(sid)) : Promise.resolve([]),
    !canScanSp && isValidKeySegment(sid)
      ? optionalStoreGet(store, spMetaKey(sid))
      : Promise.resolve(null),
  ]);

  const isValidSpMeta = (candidate: Record<string, any> | null): Record<string, any> | null => {
    if (!candidate) return null;
    if (normalizeSpaceIdSegment(candidate.spaceId) !== sid) return null;
    return candidate;
  };

  const metaKey = spMetaKey(sid);
  const catPrefix = `sp:${sid}:cat:`;
  const itemPrefix = `sp:${sid}:item:`;
  const memPrefix = `sp:${sid}:mem:`;

  let spMeta: Record<string, any> | null = isValidSpMeta(directSpMeta);
  const spCats = new Map<string, Record<string, any>>();
  const spItems = new Map<string, Record<string, any>>();
  const spMems = new Map<string, Record<string, any>>();

  for (const [key, val] of spEntries) {
    if (key === metaKey) {
      spMeta = isValidSpMeta(val);
    } else if (key.startsWith(catPrefix)) {
      const catId = key.slice(catPrefix.length);
      if (catId) spCats.set(catId, val);
    } else if (key.startsWith(itemPrefix)) {
      const contentKey = key.slice(itemPrefix.length);
      if (contentKey) spItems.set(contentKey, val);
    } else if (key.startsWith(memPrefix)) {
      const memUid = key.slice(memPrefix.length);
      if (memUid && isValidMembershipPayload(val, memUid, sid, { requireExplicitIdentity: true })) {
        spMems.set(memUid, val);
      }
    }
  }

  const head = mergeRecordPair(legacySpace, spMeta);
  if (!head && spCats.size === 0 && spItems.size === 0 && spMems.size === 0) {
    return { exists: false, active: false, tombstone: false, spaceId: sid, record: null };
  }
  if (head && isTombstoneRecord(head)) {
    return { exists: true, active: false, tombstone: true, spaceId: sid, record: head };
  }

  const base = head ?? {};
  const categories: Record<string, any> = {};
  if (isPlainRecord(legacySpace?.categories)) {
    for (const [catId, catVal] of Object.entries(legacySpace.categories)) {
      if (isPlainRecord(catVal) && !isTombstoneRecord(catVal)) {
        categories[catId] = catVal;
      }
    }
  }
  for (const [catId, spCat] of spCats) {
    const mergedCat = mergeRecordPair(categories[catId] ?? null, spCat);
    if (mergedCat && !isTombstoneRecord(mergedCat)) {
      categories[catId] = mergedCat;
    } else {
      delete categories[catId];
    }
  }

  const contents: Record<string, any> = {};
  if (isPlainRecord(legacySpace?.contents)) {
    for (const [contentKey, entryVal] of Object.entries(legacySpace.contents)) {
      if (isPlainRecord(entryVal) && !isTombstoneRecord(entryVal)) {
        contents[contentKey] = entryVal;
      }
    }
  }
  for (const [contentKey, spItem] of spItems) {
    const mergedItem = mergeRecordPair(contents[contentKey] ?? null, spItem);
    if (mergedItem && !isTombstoneRecord(mergedItem)) {
      contents[contentKey] = {
        ...mergedItem,
        contentKey: typeof mergedItem.contentKey === "string" ? mergedItem.contentKey : contentKey,
      };
    } else {
      delete contents[contentKey];
    }
  }

  const legacyUpdatedAt = computeEntryTimestamp(legacySpace);
  const hasLegacyMembersList = Array.isArray(legacySpace?.members);
  const legacyMemberSet = new Set<string>(
    hasLegacyMembersList
      ? legacySpace!.members.filter((m: unknown): m is string => typeof m === "string" && m.length > 0)
      : [],
  );
  const memberSet = new Set<string>(legacyMemberSet);
  const ownerId =
    typeof base.ownerId === "string" && base.ownerId.trim()
      ? base.ownerId.trim()
      : typeof legacySpace?.ownerId === "string"
        ? legacySpace.ownerId.trim()
        : "";
  if (ownerId) memberSet.add(ownerId);

  for (const [memUid, spMem] of spMems) {
    const spMemTs = computeEntryTimestamp(spMem);
    if (isTombstoneRecord(spMem)) {
      // Only let an sp:mem tombstone remove a member if it is at least as new as legacySpace
      if (!hasLegacyMembersList || !legacyMemberSet.has(memUid) || spMemTs >= legacyUpdatedAt) {
        if (memUid !== ownerId) memberSet.delete(memUid);
      }
    } else {
      // Prevent a stale `sp:{id}:mem:{uid}` row from resurrecting a user revoked by a newer `space-{id}` write
      if (!hasLegacyMembersList || legacyMemberSet.has(memUid) || spMemTs > legacyUpdatedAt) {
        memberSet.add(memUid);
      }
    }
  }

  let maxUpdatedAt = Math.max(
    computeEntryTimestamp(legacySpace),
    computeEntryTimestamp(spMeta),
  );
  for (const v of spCats.values()) maxUpdatedAt = Math.max(maxUpdatedAt, computeEntryTimestamp(v));
  for (const v of spItems.values()) maxUpdatedAt = Math.max(maxUpdatedAt, computeEntryTimestamp(v));
  for (const v of spMems.values()) maxUpdatedAt = Math.max(maxUpdatedAt, computeEntryTimestamp(v));

  const projectedRecord: Record<string, any> = {
    ...legacySpace,
    ...base,
    id: sid,
    name:
      typeof base.name === "string" && base.name.trim()
        ? base.name
        : typeof legacySpace?.name === "string"
          ? legacySpace.name
          : sid,
    description:
      typeof base.description === "string"
        ? base.description
        : typeof legacySpace?.description === "string"
          ? legacySpace.description
          : "",
    ownerId,
    visibility: base.visibility ?? legacySpace?.visibility ?? "private",
    members: [...memberSet],
    categories,
    contents,
    createdAt: base.createdAt ?? legacySpace?.createdAt ?? maxUpdatedAt,
    updatedAt: maxUpdatedAt || base.updatedAt || legacySpace?.updatedAt || 0,
  };

  return {
    exists: true,
    active: true,
    tombstone: false,
    spaceId: sid,
    record: projectedRecord,
  };
}

/**
 * Resolve verified Space role (`owner | admin | member | guest | null`).
 * Enforces bilateral membership when the Space body exists on this store:
 * revoked users (`members` no longer lists them and not `ownerId`) immediately get `null`.
 */
export async function resolveSpaceMemberRole(
  store: SpaceReadableStore | null | undefined,
  userId: string | null | undefined,
  spaceId: string | null | undefined,
  options?: { requireActiveMembershipRow?: boolean },
): Promise<SpaceRole | null> {
  const uid = typeof userId === "string" ? userId.trim() : "";
  const sid = normalizeSpaceIdSegment(spaceId);
  if (!store || !uid || !sid) return null;

  const [projection, membershipRes] = await Promise.all([
    readSpaceProjection(store, sid),
    readSpaceMembershipRecord(store, uid, sid),
  ]);

  if (!projection.exists || !projection.active || !projection.record) {
    return null;
  }

  const space = projection.record;
  const isOwner = space.ownerId === uid;
  const listedInSpace =
    isOwner || (Array.isArray(space.members) && space.members.includes(uid));

  if (!listedInSpace) {
    return null;
  }

  if (options?.requireActiveMembershipRow && !membershipRes.active) {
    return null;
  }

  if (membershipRes.raw && isTombstoneRecord(membershipRes.raw) && !isOwner) {
    return null;
  }

  if (isOwner) return "owner";
  return normalizeSpaceRole(membershipRes.active?.role) ?? "member";
}

/**
 * Dual-read all space memberships indexed for `userId` (`usr:{userId}:sp:*` + `space-member-{userId}-*`).
 * Pure read: never writes or scans `space-*` globally.
 */
export async function listIndexedUserMemberships(
  store: SpaceReadableStore | null | undefined,
  userId: string | null | undefined,
  options?: { includeTombstones?: boolean },
): Promise<Array<{ spaceId: string; record: Record<string, any>; tombstone: boolean; updatedAt: number }>> {
  const uid = typeof userId === "string" ? userId.trim() : "";
  if (!store?.iterator || !uid) return [];

  const legacyPrefix = `${LEGACY_SPACE_MEMBER_PREFIX}${uid}-`;
  const newPrefix = isValidKeySegment(uid) ? usrSpPrefix(uid) : null;

  const [legacyEntries, newEntries] = await Promise.all([
    scanPrefixRaw(store, legacyPrefix),
    newPrefix ? scanPrefixRaw(store, newPrefix) : Promise.resolve([]),
  ]);

  const bySpaceId = new Map<string, Record<string, any>>();

  for (const [key, value] of legacyEntries) {
    const keySpaceId = normalizeSpaceIdSegment(key.slice(legacyPrefix.length));
    if (!keySpaceId) continue;
    if (!isValidMembershipPayload(value, uid, keySpaceId, { expectedLegacyDbKey: key })) continue;
    bySpaceId.set(keySpaceId, mergeRecordPair(bySpaceId.get(keySpaceId) ?? null, value)!);
  }

  for (const [key, value] of newEntries) {
    const keySpaceId = normalizeSpaceIdSegment(key.slice(newPrefix!.length));
    if (!keySpaceId) continue;
    if (!isValidMembershipPayload(value, uid, keySpaceId, { requireExplicitIdentity: true })) continue;
    bySpaceId.set(keySpaceId, mergeRecordPair(bySpaceId.get(keySpaceId) ?? null, value)!);
  }

  const results: Array<{
    spaceId: string;
    record: Record<string, any>;
    tombstone: boolean;
    updatedAt: number;
  }> = [];

  for (const [spaceId, record] of bySpaceId) {
    const tombstone = isTombstoneRecord(record);
    if (tombstone && !options?.includeTombstones) continue;
    results.push({
      spaceId,
      record: { ...record, userId: uid, spaceId },
      tombstone,
      updatedAt: computeEntryTimestamp(record),
    });
  }

  results.sort((a, b) => a.spaceId.localeCompare(b.spaceId));
  return results;
}

/** Extract compact category headers (`name` + `order`) from a Space record. */
export function extractCompactSpaceCategories(
  spaceRecord: Record<string, any> | null | undefined,
): Record<string, { name: string; order: number }> | undefined {
  if (!isPlainRecord(spaceRecord?.categories)) return undefined;
  const out: Record<string, { name: string; order: number }> = {};
  let count = 0;
  for (const [catId, cat] of Object.entries(spaceRecord.categories)) {
    if (!isPlainRecord(cat) || isTombstoneRecord(cat)) continue;
    const name = typeof cat.name === "string" ? cat.name.trim() : "";
    if (!name) continue;
    const order = typeof cat.order === "number" && Number.isFinite(cat.order) ? cat.order : 0;
    out[catId] = { name, order };
    count += 1;
  }
  return count > 0 ? out : {};
}

/**
 * Synthesize ordered `sp:{spaceId}:*` scan entries by dual-reading `sp:{spaceId}:*`
 * and legacy `space-{spaceId}` (including tombstones for `since` delta sync).
 * Pure read: zero writes, zero object-body or credential leakage.
 */
export async function scanCanonicalSpaceSubtree(
  store: SpaceReadableStore,
  spaceId: string,
  requestedPrefix: string,
  options?: { publicDirectoryOnly?: boolean },
): Promise<SpaceScanEntry[]> {
  const sid = normalizeSpaceIdSegment(spaceId);
  if (!sid || !isValidKeySegment(sid)) return [];

  const baseSpPrefix = spSpacePrefix(sid);
  const [legacySpace, rawSpEntries] = await Promise.all([
    optionalStoreGet(store, legacySpaceKey(sid)),
    scanPrefixRaw(store, requestedPrefix),
  ]);

  const byKey = new Map<string, Record<string, any>>();
  const spaceUpdatedAt = computeEntryTimestamp(legacySpace);

  // 1. Project legacy `space-{id}` into canonical `sp:{id}:meta`, `cat:*`, `item:*`
  if (legacySpace) {
    const mKey = spMetaKey(sid);
    if (mKey.startsWith(requestedPrefix)) {
      if (isTombstoneRecord(legacySpace)) {
        byKey.set(mKey, {
          spaceId: sid,
          deletedAt: legacySpace.deletedAt,
          updatedAt: spaceUpdatedAt,
        });
      } else {
        byKey.set(mKey, {
          spaceId: sid,
          name: typeof legacySpace.name === "string" ? legacySpace.name : sid,
          description: typeof legacySpace.description === "string" ? legacySpace.description : "",
          visibility: legacySpace.visibility ?? "private",
          ownerId: typeof legacySpace.ownerId === "string" ? legacySpace.ownerId : "",
          createdAt: legacySpace.createdAt ?? spaceUpdatedAt,
          updatedAt: spaceUpdatedAt,
        });
      }
    }

    if (!isTombstoneRecord(legacySpace)) {
      if (isPlainRecord(legacySpace.categories)) {
        for (const [catId, catVal] of Object.entries(legacySpace.categories)) {
          if (!catId) continue;
          const cKey = spCatKey(sid, catId);
          if (!cKey.startsWith(requestedPrefix)) continue;
          if (catVal === null) {
            byKey.set(cKey, { spaceId: sid, catId, deletedAt: spaceUpdatedAt || 1, updatedAt: spaceUpdatedAt || 1 });
          } else if (isPlainRecord(catVal)) {
            const ts = computeEntryTimestamp(catVal) || spaceUpdatedAt;
            byKey.set(cKey, {
              spaceId: sid,
              catId,
              name: typeof catVal.name === "string" ? catVal.name : "",
              order: typeof catVal.order === "number" ? catVal.order : 0,
              updatedAt: ts,
              ...(isTombstoneRecord(catVal) ? { deletedAt: catVal.deletedAt } : {}),
            });
          }
        }
      }

      if (isPlainRecord(legacySpace.contents)) {
        for (const [contentKey, itemVal] of Object.entries(legacySpace.contents)) {
          if (!contentKey) continue;
          const iKey = spItemKey(sid, contentKey);
          if (!iKey.startsWith(requestedPrefix)) continue;
          if (itemVal === null) {
            byKey.set(iKey, { spaceId: sid, contentKey, deletedAt: spaceUpdatedAt || 1, updatedAt: spaceUpdatedAt || 1 });
          } else if (isPlainRecord(itemVal)) {
            const ts = computeEntryTimestamp(itemVal) || spaceUpdatedAt;
            byKey.set(iKey, {
              spaceId: sid,
              contentKey: typeof itemVal.contentKey === "string" ? itemVal.contentKey : contentKey,
              type: itemVal.type,
              title: typeof itemVal.title === "string" ? itemVal.title : contentKey,
              ...(itemVal.categoryId !== undefined ? { categoryId: itemVal.categoryId } : {}),
              pinned: Boolean(itemVal.pinned),
              ...(typeof itemVal.order === "number" ? { order: itemVal.order } : {}),
              ...(typeof itemVal.fileCategory === "string" ? { fileCategory: itemVal.fileCategory } : {}),
              ...(typeof itemVal.mimeType === "string" ? { mimeType: itemVal.mimeType } : {}),
              ...(typeof itemVal.fileSize === "number" ? { fileSize: itemVal.fileSize } : {}),
              ...(typeof itemVal.blobSha256 === "string" ? { blobSha256: itemVal.blobSha256 } : {}),
              updatedAt: ts,
              ...(isTombstoneRecord(itemVal) || itemVal.deleted
                ? { deletedAt: itemVal.deletedAt ?? (ts || 1) }
                : {}),
            });
          }
        }
      }

      if (!options?.publicDirectoryOnly && Array.isArray(legacySpace.members)) {
        for (const memberUid of legacySpace.members) {
          if (typeof memberUid !== "string" || !isValidKeySegment(memberUid)) continue;
          const memK = spMemKey(sid, memberUid);
          if (!memK.startsWith(requestedPrefix)) continue;
          byKey.set(memK, {
            spaceId: sid,
            userId: memberUid,
            role: legacySpace.ownerId === memberUid ? "owner" : "member",
            updatedAt: spaceUpdatedAt,
          });
        }
      }
    }
  }

  // 2. Overlay authoritative `sp:{id}:*` entries using LWW + tombstone rules
  const hasLegacyMembersArray =
    Boolean(legacySpace && !isTombstoneRecord(legacySpace)) &&
    Array.isArray(legacySpace?.members);
  const legacyActiveMembers = new Set<string>(
    hasLegacyMembersArray
      ? legacySpace!.members.filter((m: unknown): m is string => typeof m === "string" && m.length > 0)
      : [],
  );
  if (typeof legacySpace?.ownerId === "string" && legacySpace.ownerId) {
    legacyActiveMembers.add(legacySpace.ownerId);
  }
  const memKeyPrefix = `sp:${sid}:mem:`;

  for (const [key, val] of rawSpEntries) {
    if (!key.startsWith(baseSpPrefix)) continue;
    if (options?.publicDirectoryOnly) {
      const sub = key.slice(baseSpPrefix.length);
      if (sub !== "meta" && !sub.startsWith("cat:") && !sub.startsWith("item:")) {
        continue;
      }
    }
    if (key.startsWith(memKeyPrefix)) {
      const memUid = key.slice(memKeyPrefix.length);
      if (!isValidMembershipPayload(val, memUid, sid, { requireExplicitIdentity: true })) {
        continue;
      }
      const spMemTs = computeEntryTimestamp(val);
      if (
        hasLegacyMembersArray &&
        !legacyActiveMembers.has(memUid) &&
        !isTombstoneRecord(val) &&
        spMemTs <= spaceUpdatedAt
      ) {
        // Newer legacy `space-*` snapshot revoked this member; emit tombstone instead of active row
        byKey.set(key, {
          spaceId: sid,
          userId: memUid,
          deletedAt: spaceUpdatedAt || 1,
          updatedAt: spaceUpdatedAt || 1,
        });
        continue;
      }
    }
    const merged = mergeRecordPair(byKey.get(key) ?? null, val);
    if (merged) byKey.set(key, merged);
  }

  const out: SpaceScanEntry[] = [];
  for (const [key, value] of byKey) {
    out.push({
      key,
      value,
      updatedAt: computeEntryTimestamp(value),
      tombstone: isTombstoneRecord(value) || Boolean(value.deleted),
    });
  }
  out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return out;
}
