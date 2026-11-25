// 文件路径: database-engine/spaceWriteRole.ts
//
// 「调用者能否向某个 Space 写入」的唯一实现。目前有两个调用方，规则必须完全一致：
// - `database/server/routes/uploadOwnership.ts`：上传归属裁定（ownerType="space"）
// - `database-engine/workspaceFileAccess.ts`：`authorizeWorkspacePrincipalWrite` 的 space 分支
//
// 为什么单独成模块：`workspaceFileAccess.ts` 会连带 import `./fileService` 与 `./db`
// （serverDb 单例），而上传路由只需要「Space 存在 / 未删除 / 角色够不够」这一步判定。
// 本模块只依赖 `./spaceStoreReader`（只读投影 + canonical membership 解析），
// 因此上传链路不会因为复用这条规则而拖进 fileService / serverDb。
import {
  normalizeSpaceIdSegment,
  readSpaceProjection,
  resolveSpaceMemberRole,
  type SpaceReadableStore,
  type SpaceRole,
} from "./spaceStoreReader";

/**
 * 拒绝写入的具体原因。**只用于服务端日志与内部映射**：spaceId 由调用方自选、
 * 可猜，对外必须合并成同一句拒绝（避免 Space 存在性 oracle），
 * 合并口径由各调用方决定（上传路由统一 403，写授权器沿用既有 reason 字符串）。
 */
export type SpaceWriteDenyReason =
  | "space_not_found"
  | "space_deleted"
  | "not_space_member"
  | "insufficient_space_role";

export type SpaceWriteAuthorizationResult =
  | { kind: "allowed"; spaceId: string; role: SpaceRole }
  | { kind: "denied"; spaceId: string; reason: SpaceWriteDenyReason }
  /** 存储未就绪或读失败：调用方各自映射成 503（fail-closed，绝不放行为可写）。 */
  | { kind: "unavailable"; spaceId: string };

/**
 * 写资格策略：owner / admin / member 可写；非成员、已撤权成员与 guest 不可写。
 * 角色解析走 `resolveSpaceMemberRole`（canonical，同一套 membership 投影），
 * 不吞错、不回落成任何角色。
 */
export async function resolveSpaceWriteAuthorization(args: {
  store: SpaceReadableStore | null | undefined;
  actorUserId: string | null | undefined;
  spaceId: string | null | undefined;
}): Promise<SpaceWriteAuthorizationResult> {
  const store = args.store ?? null;
  const spaceId = normalizeSpaceIdSegment(args.spaceId) ?? "";
  const actorUserId =
    typeof args.actorUserId === "string" ? args.actorUserId.trim() : "";

  // 两个调用方都在进来之前校验过 spaceId / actorUserId；这里仍然 fail-closed，
  // 不让空 id 被当成「无约束」。
  if (!spaceId || !store) return { kind: "unavailable", spaceId };

  let projection;
  try {
    projection = await readSpaceProjection(store, spaceId);
  } catch {
    return { kind: "unavailable", spaceId };
  }
  if (!projection.exists) {
    return { kind: "denied", spaceId, reason: "space_not_found" };
  }
  if (!projection.active) {
    return { kind: "denied", spaceId, reason: "space_deleted" };
  }
  if (!actorUserId) {
    return { kind: "denied", spaceId: projection.spaceId, reason: "not_space_member" };
  }

  let role: SpaceRole | null;
  try {
    role = await resolveSpaceMemberRole(store, actorUserId, projection.spaceId);
  } catch {
    return { kind: "unavailable", spaceId: projection.spaceId };
  }
  if (!role) {
    return { kind: "denied", spaceId: projection.spaceId, reason: "not_space_member" };
  }
  if (role === "guest") {
    return {
      kind: "denied",
      spaceId: projection.spaceId,
      reason: "insufficient_space_role",
    };
  }
  return { kind: "allowed", spaceId: projection.spaceId, role };
}
