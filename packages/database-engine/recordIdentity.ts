import { resolveCandidateOwnerFromKeyRemainder } from "database/authority/ownerKey";

const SPACE_MEMBER_PREFIX = "space-member-";

const RESERVED_IDENTITY_PATCH_FIELDS = new Set([
  "dbKey",
  "ownerId",
  "tenantId",
  "userId",
]);

const parseSpaceMemberKey = (
  dbKey: string
): { userId: string; spaceId: string } | null => {
  if (typeof dbKey !== "string" || !dbKey.startsWith(SPACE_MEMBER_PREFIX)) {
    return null;
  }

  const rest = dbKey.slice(SPACE_MEMBER_PREFIX.length);
  const lastDash = rest.lastIndexOf("-");
  if (lastDash <= 0 || lastDash === rest.length - 1) {
    return null;
  }

  return {
    userId: rest.slice(0, lastDash),
    spaceId: rest.slice(lastDash + 1),
  };
};

const parseOwnerFromSegmentedKey = (
  dbKey: string,
  prefixA: string,
  prefixB: string,
  candidateOwnerUserIds: Array<string | null | undefined> = []
): string | null => {
  const parts = dbKey.split("-");
  if (parts[0] !== prefixA || parts[1] !== prefixB || parts.length < 4) {
    return null;
  }

  const candidateOwner = resolveCandidateOwnerFromKeyRemainder(
    parts.slice(2).join("-"),
    candidateOwnerUserIds
  );
  if (candidateOwner) return candidateOwner;

  return parts[2] || null;
};

export const normalizeRecordIdentityForWrite = <T>(
  dbKey: string,
  data: T,
  options: {
    candidateOwnerUserIds?: Array<string | null | undefined>;
  } = {}
): T => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const record = { ...(data as Record<string, any>) };
  const spaceMember = parseSpaceMemberKey(dbKey);
  if (spaceMember) {
    return {
      ...record,
      userId: spaceMember.userId,
      spaceId: spaceMember.spaceId,
    } as T;
  }

  const spaceSettingUserId = parseOwnerFromSegmentedKey(
    dbKey,
    "space",
    "setting",
    options.candidateOwnerUserIds
  );
  if (spaceSettingUserId) {
    return {
      ...record,
      userId: spaceSettingUserId,
    } as T;
  }

  const userPrefOwnerId = parseOwnerFromSegmentedKey(
    dbKey,
    "user",
    "pref",
    options.candidateOwnerUserIds
  );
  if (userPrefOwnerId) {
    return {
      ...record,
      userId: userPrefOwnerId,
      ownerId: userPrefOwnerId,
    } as T;
  }

  return data;
};

export const findIdentityPatchField = (
  dbKey: string,
  changes: unknown
): string | null => {
  if (!changes || typeof changes !== "object") {
    return null;
  }

  const fields = new Set(RESERVED_IDENTITY_PATCH_FIELDS);
  if (parseSpaceMemberKey(dbKey)) {
    fields.add("spaceId");
  }

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(changes, field)) {
      return field;
    }
  }

  return null;
};
