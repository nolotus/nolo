/**
 * Shared space-membership / contents-link helpers.
 *
 * Used by both record read authorization (`resourceAccess`) and OAuth
 * credential delegation (`resolveCredentialOwnerUserId`) so the two paths
 * cannot drift on membership or contents-key matching.
 */

export const SPACE_PREFIX = "space-";
export const SPACE_MEMBER_PREFIX = "space-member-";

export type SpaceLinkStore = {
  get: (key: string) => Promise<unknown>;
  iterator?: (options: {
    gte: string;
    lte: string;
  }) => AsyncIterable<[string, unknown]> | Iterable<[string, unknown]>;
};

export type SpaceLinkRecord = {
  dbKey?: unknown;
  contentKey?: unknown;
  key?: unknown;
  id?: unknown;
  spaceId?: unknown;
  ownerId?: unknown;
  members?: unknown;
  contents?: unknown;
};

export function normalizeSpaceId(spaceId?: unknown): string | null {
  if (typeof spaceId !== "string") return null;
  const trimmed = spaceId.trim();
  if (!trimmed) return null;
  return trimmed.startsWith(SPACE_PREFIX)
    ? trimmed.slice(SPACE_PREFIX.length)
    : trimmed;
}

export function getContentKeyCandidates(
  dbKey: string | null | undefined,
  record?: SpaceLinkRecord | null,
): string[] {
  const candidates = [
    typeof dbKey === "string" ? dbKey : "",
    typeof record?.dbKey === "string" ? record.dbKey : "",
    typeof record?.contentKey === "string" ? record.contentKey : "",
    typeof record?.key === "string" ? record.key : "",
    typeof record?.id === "string" ? record.id : "",
  ].filter(Boolean);

  return [...new Set(candidates)];
}

export async function hasSpaceMembership(
  store: SpaceLinkStore | null | undefined,
  userId: string | null | undefined,
  spaceId: string | null | undefined,
): Promise<boolean> {
  if (!store) return false;
  const normalizedUserId =
    typeof userId === "string" ? userId.trim() : "";
  const normalized = normalizeSpaceId(spaceId);
  if (!normalizedUserId || !normalized) return false;

  try {
    const membership = await store.get(
      `${SPACE_MEMBER_PREFIX}${normalizedUserId}-${normalized}`,
    );
    if (membership) return true;
  } catch {
    // Fall through to the space record. Some older data only has members[].
  }

  try {
    const space = (await store.get(`${SPACE_PREFIX}${normalized}`)) as
      | SpaceLinkRecord
      | null;
    if (!space) return false;
    if (
      typeof space.ownerId === "string" &&
      space.ownerId === normalizedUserId
    ) {
      return true;
    }
    return (
      Array.isArray(space.members) && space.members.includes(normalizedUserId)
    );
  } catch {
    return false;
  }
}

/**
 * Scan the caller's space memberships for a contents-tree link to this record.
 * Returns the first matching spaceId, or null.
 */
export async function findLinkedMemberSpaceId(
  store: SpaceLinkStore | null | undefined,
  userId: string | null | undefined,
  dbKey: string | null | undefined,
  record?: SpaceLinkRecord | null,
): Promise<string | null> {
  if (!store?.iterator) return null;
  const normalizedUserId =
    typeof userId === "string" ? userId.trim() : "";
  if (!normalizedUserId || !dbKey) return null;

  const contentKeys = getContentKeyCandidates(dbKey, record);
  if (contentKeys.length === 0) return null;

  const prefix = `${SPACE_MEMBER_PREFIX}${normalizedUserId}-`;
  try {
    for await (const [, membership] of store.iterator({
      gte: prefix,
      lte: `${prefix}\uffff`,
    })) {
      const spaceId = normalizeSpaceId(
        (membership as { spaceId?: unknown } | null)?.spaceId,
      );
      if (!spaceId) continue;

      try {
        const space = (await store.get(`${SPACE_PREFIX}${spaceId}`)) as
          | SpaceLinkRecord
          | null;
        const contents = space?.contents;
        if (!contents || typeof contents !== "object") continue;
        const map = contents as Record<string, unknown>;
        if (contentKeys.some((contentKey) => Boolean(map[contentKey]))) {
          return spaceId;
        }
      } catch {
        // Ignore stale membership pointers.
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * True when the caller may treat a private agent as space-shared for OAuth:
 * birth-space membership, or linked via a member space contents tree.
 */
export async function isPrivateRecordSharedWithMember(
  store: SpaceLinkStore | null | undefined,
  userId: string | null | undefined,
  dbKey: string | null | undefined,
  record?: SpaceLinkRecord | null,
): Promise<boolean> {
  const birthSpaceId = normalizeSpaceId(record?.spaceId);
  if (birthSpaceId && (await hasSpaceMembership(store, userId, birthSpaceId))) {
    return true;
  }
  const linked = await findLinkedMemberSpaceId(store, userId, dbKey, record);
  return Boolean(linked);
}
