import { isSystemAdmin } from "core/init";
import { parseOwnedAgentId } from "core/prefix";
import { shareKey } from "database/keys";
import * as dbModule from "./db";
import { getAuthorityStoreCompat } from "./dbCompat";
import { resolveKeyOwnerId } from "./writeAuthority";
import { readActiveAgentGrant } from "./agentGrant";
import {
  SPACE_MEMBER_PREFIX,
  SPACE_PREFIX,
  findLinkedMemberSpaceId,
  hasSpaceMembership,
  normalizeSpaceId,
} from "./spaceLinkAccess";

export type AccessAction = "read" | "write" | "delete" | "manage";

type AccessInput = {
  action: AccessAction;
  actionUserId?: string | null;
  dbKey: string;
  record?: any;
};

export type AccessResult = {
  allowed: boolean;
  reason?: string;
  keyOwnerId?: string | null;
  recordOwnerId?: string | null;
  spaceId?: string | null;
};

const isShareRecordKey = (dbKey: unknown): boolean => {
  const value = String(dbKey || "");
  return value.startsWith("share-") || shareKey.isShareKey(value);
};

const getRecordOwnerId = (record: any): string | null =>
  (typeof record?.ownerId === "string" && record.ownerId) ||
  (typeof record?.userId === "string" && record.userId) ||
  (typeof record?.tenantId === "string" && record.tenantId) ||
  (isShareRecordKey(record?.dbKey) && typeof record?.meta?.authorId === "string"
    ? record.meta.authorId
    : null) ||
  null;

const getSpaceIdFromRecord = (record: any): string | null =>
  normalizeSpaceId(record?.spaceId);

const getSpaceIdFromKey = (dbKey: string): string | null => {
  if (!dbKey.startsWith(SPACE_PREFIX) || dbKey.startsWith(SPACE_MEMBER_PREFIX)) {
    return null;
  }
  return normalizeSpaceId(dbKey);
};

const isAgentOwnedByUser = (agentKey: unknown, userId: string): boolean =>
  typeof agentKey === "string" &&
  Boolean(userId) &&
  resolveKeyOwnerId(agentKey, { candidateOwnerUserIds: [userId] }) === userId;

const isPublicAgentRecord = (dbKey: string, record: any): boolean =>
  (dbKey.startsWith("agent-pub-")) &&
  record?.isPublic === true;

const isCommunityShareRecord = (dbKey: string, record: any): boolean =>
  (dbKey.startsWith("share-") || shareKey.isShareKey(dbKey)) &&
  record?.meta?.visibility === "community";

const authoritySpaceStore = () => getAuthorityStoreCompat(dbModule);

export async function authorizeRecordAccess({
  action,
  actionUserId,
  dbKey,
  record,
}: AccessInput): Promise<AccessResult> {
  if (!actionUserId) {
    return { allowed: false, reason: "missing_actor" };
  }

  if (isSystemAdmin(actionUserId)) {
    return { allowed: true };
  }

  if (action === "read") {
    if (isPublicAgentRecord(dbKey, record)) return { allowed: true };
    if (isCommunityShareRecord(dbKey, record)) return { allowed: true };
  }

  const recordOwnerId = getRecordOwnerId({ ...record, dbKey });
  const keyOwnerId = resolveKeyOwnerId(dbKey, {
    candidateOwnerUserIds: [actionUserId, recordOwnerId],
  });
  const spaceId = getSpaceIdFromRecord(record) ?? getSpaceIdFromKey(dbKey);

  if (keyOwnerId && recordOwnerId && keyOwnerId !== recordOwnerId) {
    return {
      allowed: false,
      reason: "owner_mismatch",
      keyOwnerId,
      recordOwnerId,
      spaceId,
    };
  }

  if (keyOwnerId === actionUserId || recordOwnerId === actionUserId) {
    return { allowed: true, keyOwnerId, recordOwnerId, spaceId };
  }

  if (
    record?.ownerType === "agent" &&
    isAgentOwnedByUser(recordOwnerId, actionUserId)
  ) {
    return { allowed: true, keyOwnerId, recordOwnerId, spaceId };
  }

  if (await hasSpaceMembership(authoritySpaceStore(), actionUserId, spaceId)) {
    return { allowed: true, keyOwnerId, recordOwnerId, spaceId };
  }

  // 显式点对点 Agent Grant 读权限判断 (Task G1)
  // 硬约束 1: grant 仅由 owner 创建/撤销 (依靠 key 结构 + 写鉴权)。
  // 硬约束 2: 不递归 (不提供转授)。
  // 硬约束 3: 不经 space 传播 (只认显式 granteeUserId 的 grant，即便通过 space 拿到了 read 权限也不赠送凭证)。
  // 硬约束 4: 撤销立即生效 (实时点查 grant，不加缓存)。
  if (
    action === "read" &&
    dbKey.startsWith("agent-") &&
    !dbKey.startsWith("agent-pub-") &&
    recordOwnerId &&
    recordOwnerId !== actionUserId
  ) {
    // 必须从 dbKey 解析 agentId，避免伪造 record.id。
    // parseOwnedAgentId 在 key 不属于 recordOwnerId 时返回 null，
    // 归属校验与解析合为一步，不会出现"前缀没匹配却仍取到 id"。
    const agentId = parseOwnedAgentId(dbKey, recordOwnerId);
    if (agentId) {
      const store = getAuthorityStoreCompat(dbModule);
      const activeGrant = await readActiveAgentGrant(store, {
        ownerUserId: recordOwnerId,
        agentId,
        granteeUserId: actionUserId,
      });
      if (activeGrant) {
        return { allowed: true, keyOwnerId, recordOwnerId, spaceId };
      }
    }
  }

  const linkedSpaceId = await findLinkedMemberSpaceId(
    authoritySpaceStore(),
    actionUserId,
    dbKey,
    record
  );
  if (linkedSpaceId) {
    return { allowed: true, keyOwnerId, recordOwnerId, spaceId: linkedSpaceId };
  }

  return {
    allowed: false,
    reason: "not_owner_or_member",
    keyOwnerId,
    recordOwnerId,
    spaceId,
  };
}
