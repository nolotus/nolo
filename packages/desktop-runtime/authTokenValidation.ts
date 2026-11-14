/**
 * 桌面会话接口（`/api/desktop/auth/session`）的 **profile token 校验缝**（契约倒置）。
 *
 * 背景：该接口把本机 CLI profile 里的 token 交回桌面 UI，因此需要校验 token 仍然有效。真实校验实现是
 * `server/authenticateToken`——而 `server` 在 `HARD_DENY_PACKAGES` 里、**绝不进公开投影**。之前 handler 用
 * `await import("../../server/authenticateToken")` 动态引私有实现，靠 catch `Cannot find module` 兜公开构建：
 * 这在依赖图上就是「公开集包 → server」的边（`arch:check` 的 hard-deny-package:server 命中），
 * 只是被 try/catch 掩盖了。
 *
 * 正确形态：handler 只依赖本模块的接口；**私有侧装配点（packages/server/routes.ts，公开仓里根本不存在）
 * 注入真实实现**，公开/本地构建不注册 → 落到 no-op 允许（与既有 fallback 语义逐字一致：拿不到校验器就
 * 当成「模块不可用」，由云端 API 自己回 401）。
 *
 * 注意：不允许把路径写成字符串拼接来绕过架构门——那是隐藏依赖，不是解耦。
 */

export type DesktopProfileTokenValidator = (token: string) => Promise<boolean>;

let registeredValidator: DesktopProfileTokenValidator | null = null;

/** 私有装配点调用（cloud/full 构建）。传 null 可清空（测试与热重载用）。 */
export function registerDesktopProfileTokenValidator(
  validator: DesktopProfileTokenValidator | null,
): void {
  registeredValidator = validator;
}

/** 当前是否已注入真实校验器（公开构建为 false）。 */
export function hasDesktopProfileTokenValidator(): boolean {
  return registeredValidator !== null;
}

/**
 * 校验 profile token。
 *
 * - 已注入（私有/cloud 构建）：用注入实现；它抛错（token 失效/吊销）时由调用方转成「未授权」。
 * - 未注入（公开/本地构建）：返回 true（跳过校验），与改造前「模块找不到就跳过」等价。
 */
export async function validateDesktopProfileToken(token: string): Promise<boolean> {
  if (!registeredValidator) return true;
  return registeredValidator(token);
}
