import { createHash } from "node:crypto";

const SALT = "nolo-session-identity-v1";

/** NOLO_STABLE_SESSION_IDENTITY=0 回退到旧的全随机 id 行为（A/B 用）。 */
export function isStableSessionIdentityEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const v = env.NOLO_STABLE_SESSION_IDENTITY?.trim().toLowerCase();
  return !(v === "0" || v === "false" || v === "off");
}

/** 带固定盐的 sha256 → UUID 形态（v5 风格），不可逆暴露原 key。 */
export function deriveStableUuid(sessionKey: string, purpose: string): string {
  const h = createHash("sha256").update(`${SALT}\0${purpose}\0${sessionKey}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

/** 会话稳定键：仅由 dialogId 派生；没有 dialogId 返回 undefined → 走旧的随机行为。 */
export function resolveSessionKey(args: { dialogId?: string | null }): string | undefined {
  const d = args.dialogId?.trim();
  return d ? `dialog:${d}` : undefined;
}

/** 服务端会话命名空间键：`${userId}:${dialogId}`，任一缺失返回 undefined。 */
export function serverSessionKey(
  userId: string | null | undefined,
  dialogId: string | null | undefined,
): string | undefined {
  return userId && dialogId ? `${userId}:${dialogId}` : undefined;
}
