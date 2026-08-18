import * as dbModule from "./db";
import { getAuthorityStoreCompat } from "./dbCompat";

const SPACE_MEMBER_PREFIX = "space-member-";
const SPACE_PREFIX = "space-";

export const parseSpaceMemberKey = (
  dbKey: string
): { memberUserId: string; spaceId: string } | null => {
  if (typeof dbKey !== "string" || !dbKey.startsWith(SPACE_MEMBER_PREFIX)) {
    return null;
  }

  const rest = dbKey.slice(SPACE_MEMBER_PREFIX.length);
  const lastDash = rest.lastIndexOf("-");
  if (lastDash <= 0 || lastDash === rest.length - 1) {
    return null;
  }

  return {
    memberUserId: rest.slice(0, lastDash),
    spaceId: rest.slice(lastDash + 1),
  };
};

const loadSpaceRecord = async (spaceId: string): Promise<any | null> => {
  const store = getAuthorityStoreCompat(dbModule);
  try {
    return await store.get(`${SPACE_PREFIX}${spaceId}`);
  } catch {
    return null;
  }
};

export const canWriteSpaceMemberRecord = async ({
  dbKey,
  actionUserId,
}: {
  dbKey: string;
  actionUserId?: string | null;
}): Promise<boolean> => {
  const parsed = parseSpaceMemberKey(dbKey);
  if (!parsed || !actionUserId) {
    return false;
  }

  const space = await loadSpaceRecord(parsed.spaceId);
  return Array.isArray(space?.members) && space.members.includes(actionUserId);
};

export const canDeleteSpaceMemberRecord = async ({
  dbKey,
  actionUserId,
}: {
  dbKey: string;
  actionUserId?: string | null;
}): Promise<boolean> => {
  const parsed = parseSpaceMemberKey(dbKey);
  if (!parsed || !actionUserId) {
    return false;
  }

  if (parsed.memberUserId === actionUserId) {
    return true;
  }

  const space = await loadSpaceRecord(parsed.spaceId);
  return typeof space?.ownerId === "string" && space.ownerId === actionUserId;
};
