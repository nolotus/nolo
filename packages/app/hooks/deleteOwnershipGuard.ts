import {
  DEVICE_LOCAL_OWNER_ID,
  isDeviceLocalOwnerId,
} from "database/authority/deviceLocal";

/**
 * 删除执行前的归属复核（opt-in）结果。
 * - `allow`：有正证据表明是本人（或设备本地）内容；
 * - `deny`：记录 owner 是**别的用户**，即使当前用户在管理该空间也不能删本体；
 * - `unknown`：没有 actor（未登录/本地 owner 场景）或记录没有 owner 字段 —— 不阻断，
 *   由服务端权威校验兜底；调用方必须把它当「未核实」而不是「已授权」。
 */
export type DeleteOwnershipVerdict = "allow" | "deny" | "unknown";

export function resolveDeleteOwnershipGuard(input: {
  ownerId?: unknown;
  actorUserId?: string | null;
  recordLoaded?: boolean;
}): DeleteOwnershipVerdict {
  const actor =
    typeof input.actorUserId === "string" ? input.actorUserId.trim() : "";
  const owner = typeof input.ownerId === "string" ? input.ownerId.trim() : "";
  const recordLoaded = input.recordLoaded !== false;
  if (!actor) return "unknown";
  if (owner) {
    // 明确的他人 owner 优先：actor 是设备本地身份也不例外。
    if (owner === actor || owner === DEVICE_LOCAL_OWNER_ID) return "allow";
    return "deny";
  }
  // 没有 owner 字段：只有设备本地记录才按本机数据放行。
  if (isDeviceLocalOwnerId(actor) && recordLoaded) return "allow";
  return "unknown";
}
