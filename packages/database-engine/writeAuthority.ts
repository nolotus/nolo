import {
  parseOwnerUserIdFromDbKey,
  resolveCandidateOwnerFromKeyRemainder,
} from "database/authority/ownerKey";
import { isSystemAdmin } from "core/init";

const TWO_PART_USER_KEYS = new Set(["settings", "profile"]);
const OWNER_IN_SECOND_SEGMENT_PREFIXES = new Set([
  "dialog",
  "page",
  "doc",
  "email",
  "file",
  "meta",
  "row",
  "agent",
  "app",
  "notification",
  "token",
  "image",
]);

export const resolveKeyOwnerId = (
  dbKey: string,
  options: {
    candidateOwnerUserIds?: Array<string | null | undefined>;
  } = {}
): string | null => {
  if (!dbKey || typeof dbKey !== "string") return null;

  const parts = dbKey.split("-");
  if (parts[0] === "agent" && parts[1] === "thread" && parts.length >= 4) {
    const candidateOwner = resolveCandidateOwnerFromKeyRemainder(
      parts.slice(2).join("-"),
      options.candidateOwnerUserIds
    );
    if (candidateOwner) return candidateOwner;
    return parts[2] || null;
  }
  if (parts[0] === "agent" && parts[1] === "threadidx" && parts.length >= 4) {
    const candidateOwner = resolveCandidateOwnerFromKeyRemainder(
      parts.slice(2).join("-"),
      options.candidateOwnerUserIds
    );
    if (candidateOwner) return candidateOwner;
    return parts[2] || null;
  }

  if (parts.length === 2 && TWO_PART_USER_KEYS.has(parts[1])) {
    return parts[0] || null;
  }

  if (parts[0] === "user" && parts[1] === "pref" && parts.length >= 4) {
    const candidateOwner = resolveCandidateOwnerFromKeyRemainder(
      parts.slice(2).join("-"),
      options.candidateOwnerUserIds
    );
    if (candidateOwner) return candidateOwner;
    return parts[2] || null;
  }

  if (
    parts[0] === "space" &&
    (parts[1] === "setting" || parts[1] === "member") &&
    parts.length >= 4
  ) {
    const candidateOwner = resolveCandidateOwnerFromKeyRemainder(
      parts.slice(2).join("-"),
      options.candidateOwnerUserIds
    );
    if (candidateOwner) return candidateOwner;
    return parts[2] || null;
  }

  if (
    parts[0] === "token" &&
    parts[1] === "stats" &&
    parts[2] === "day" &&
    parts[3] === "user" &&
    parts.length >= 6
  ) {
    return parts[4] || null;
  }

  if (parts[0] === "dialog" && parts[2] === "msg") {
    return null;
  }

  if (parts[0] === "email" && parts.length >= 3) {
    return parts.slice(1, -1).join("-") || null;
  }

  const parsedOwner = parseOwnerUserIdFromDbKey(dbKey, {
    candidateOwnerUserIds: options.candidateOwnerUserIds,
  });
  if (parsedOwner) {
    return parsedOwner;
  }

  // grant-agent-{ownerUserId}-{agentId}-{granteeUserId}
  // owner 在第三段（parts[2]），与 agent- 系列不同（owner 在第二段）。
  if (parts[0] === "grant" && parts[1] === "agent" && parts.length >= 5) {
    return parts[2] || null;
  }

  if (OWNER_IN_SECOND_SEGMENT_PREFIXES.has(parts[0]) && parts.length >= 3) {
    if (parts[1] === "pub") {
      return null;
    }
    return parts[1] || null;
  }

  return null;
};

export const resolveWriteAuthority = ({
  dbKey,
  actionUserId,
  existingRecord,
}: {
  dbKey: string;
  actionUserId?: string | null;
  existingRecord?: any;
}) => {
  const recordOwnerId =
    (typeof existingRecord?.ownerId === "string" && existingRecord.ownerId) ||
    (typeof existingRecord?.userId === "string" && existingRecord.userId) ||
    null;
  const keyOwnerId = resolveKeyOwnerId(dbKey, {
    candidateOwnerUserIds: [actionUserId, recordOwnerId],
  });
  const isKeyOwner =
    Boolean(actionUserId) && Boolean(keyOwnerId) && keyOwnerId === actionUserId;
  const isRecordOwner =
    Boolean(actionUserId) &&
    Boolean(recordOwnerId) &&
    recordOwnerId === actionUserId;
  const isMember =
    Boolean(actionUserId) &&
    Array.isArray(existingRecord?.members) &&
    existingRecord.members.includes(actionUserId);

  // 系统命名空间放行：admin 可写 agent-system- 前缀的资产（平台 preset 等）。
  // 边界严格限定为 agent-system- 前缀（不只看 keyOwnerId=system，避免误放行
  // meta-system- / doc-system- 等其他 system 命名空间），不破坏其他 owner 模型；
  // 普通用户仍无法写 system key。
  const isSystemAdminWriter =
    Boolean(actionUserId) &&
    keyOwnerId === "system" &&
    dbKey.startsWith("agent-system-") &&
    isSystemAdmin(actionUserId);

  return {
    keyOwnerId,
    recordOwnerId,
    isAllowed: Boolean(isKeyOwner || isRecordOwner || isMember || isSystemAdminWriter),
    isKeyOwner,
    isRecordOwner,
    isMember,
    isSystemAdminWriter,
  };
};

export const canWriteRecord = ({
  dbKey,
  actionUserId,
  record,
}: {
  dbKey: string;
  actionUserId?: string | null;
  record?: any;
}) => {
  const { keyOwnerId, recordOwnerId, isAllowed, isSystemAdminWriter } =
    resolveWriteAuthority({
      dbKey,
      actionUserId,
      existingRecord: record,
    });

  // admin 写 system 命名空间优先放行，不被 owner 一致性检查拦截
  if (isSystemAdminWriter) {
    return {
      keyOwnerId,
      recordOwnerId,
      isAllowed: true,
    };
  }

  if (keyOwnerId && recordOwnerId && keyOwnerId !== recordOwnerId) {
    return {
      keyOwnerId,
      recordOwnerId,
      isAllowed: false,
    };
  }

  return {
    keyOwnerId,
    recordOwnerId,
    isAllowed:
      isAllowed ||
      (Boolean(actionUserId) &&
        !keyOwnerId &&
        !recordOwnerId),
  };
};
