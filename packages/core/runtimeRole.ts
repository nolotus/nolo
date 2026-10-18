// packages/core/runtimeRole.ts
//
// 服务器进程只有两种身份，且**必须显式声明**：
//
//   core        —— 拥有共享 LevelDB / 跑后台 worker（部署脚本的 core 槽位）
//   chat-proxy  —— 不碰 LevelDB，只转发 chat（部署脚本的 chat-proxy 槽位）
//
// 缺省不再兜底成 core（2026-09-17 事故，docs/incidents/2026-09-17-table-page-focus-
// context-dispatch-crash.md 之外的部署侧记录见 planning 文档）：一个没带
// NOLO_SERVER_RUNTIME_ROLE 的 PM2 进程按旧默认成为 core，抢占了共享 LevelDB 锁 ——
// 蓝绿核心永远起不来、部署全部失败、11 小时无人能自愈。
// 现在 PM2 托管的进程缺省直接拒绝启动：fail-closed、报错可见、绝不碰库。
// 本地 dev / desktop / CLI 不经 PM2（没有 pm_id），缺省仍是 core，开发体验不变。

export type NoloRuntimeRole = "core" | "chat-proxy";

const ROLE_ENV = "NOLO_SERVER_RUNTIME_ROLE";

let frozenRuntimeRole: NoloRuntimeRole | null = null;

/** PM2 会给托管的 app 注入 pm_id；本地 dev / desktop / CLI 没有。 */
export function isPm2Managed(
  env: Record<string, string | undefined> = process.env
): boolean {
  return typeof env.pm_id === "string" && env.pm_id.trim() !== "";
}

export function resolveRuntimeRole(
  env: Record<string, string | undefined> = process.env
): NoloRuntimeRole {
  const raw = String(env[ROLE_ENV] || "")
    .trim()
    .toLowerCase();
  if (raw === "core" || raw === "chat-proxy") return raw;
  if (raw !== "") {
    throw new Error(`未知的 ${ROLE_ENV}="${raw}"：只支持 "core" / "chat-proxy"。`);
  }
  if (isPm2Managed(env)) {
    throw new Error(
      `PM2 托管进程缺少 ${ROLE_ENV}：拒绝以默认身份启动 —— 历史事故（2026-09-17）中，` +
        `一个缺省成 core 的进程抢占了共享 LevelDB 锁，核心与部署全部失败。` +
        `请通过部署脚本启动槽位（core / chat-proxy 都会显式声明角色）。`
    );
  }
  return "core";
}

/**
 * 冻结当前进程的 runtime role。
 * 在 entry bootstrap / init 时解析一次，后续 shutdown 及运行时全局统一使用，
 * 防止运行过程中 process.env 变化导致 shutdown 走错分支。
 */
export function freezeRuntimeRole(
  roleOrEnv?: NoloRuntimeRole | Record<string, string | undefined>
): NoloRuntimeRole {
  if (roleOrEnv !== undefined) {
    if (typeof roleOrEnv === "string") {
      frozenRuntimeRole = roleOrEnv;
    } else {
      frozenRuntimeRole = resolveRuntimeRole(roleOrEnv);
    }
  } else if (!frozenRuntimeRole) {
    frozenRuntimeRole = resolveRuntimeRole(process.env);
  }
  return frozenRuntimeRole;
}

/**
 * 获取进程冻结的 runtime role。若尚未显式冻结，则按 process.env 解析并冻结。
 */
export function getRuntimeRole(): NoloRuntimeRole {
  if (!frozenRuntimeRole) {
    frozenRuntimeRole = resolveRuntimeRole(process.env);
  }
  return frozenRuntimeRole;
}

/**
 * 仅限测试使用的重置钩子，用于测试不同 role 分支。
 */
export function resetRuntimeRoleForTesting(role?: NoloRuntimeRole | null) {
  frozenRuntimeRole = role ?? null;
}

/**
 * 唯一需要回答的问题：本进程是否拥有共享 DB。
 * core 拥有；chat-proxy 不碰。后台 worker 只随 core 启动，因此不再单列谓词。
 */
export function shouldOpenDatabase(
  role: NoloRuntimeRole = getRuntimeRole()
): boolean {
  return role === "core";
}
