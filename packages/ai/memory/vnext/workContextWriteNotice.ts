/**
 * 工作记忆写入结果的人话回执。
 *
 * `updateWorkContext` 的冲突是**正常返回**而不是 error：
 * `{ activityId, revision, outcome: "conflict" }`
 * （packages/ai/memory/vnext/workContext.ts:117,123,126-127，
 * reason 为 "revision conflict" / "scope mismatch" / "duplicate change"）。
 * 工具层（web 的 rememberMemory 与 CLI 的 server platform executor）如果只把
 * 结构化结果裸传给模型，模型看不见「没写进去」，就会回一句「已记住」——
 * 用户以为记住了，实际什么都没存。
 *
 * 这里只做展示层措辞，不含任何重试或自动合并（并发合并策略是产品决策）。
 * 纯函数、无依赖，渲染进程与 CLI 都能加载。
 */

export type WorkContextWriteOutcome = "created" | "updated" | "unchanged" | "conflict";

export interface WorkContextWriteResultLike {
  activityId?: unknown;
  revision?: unknown;
  outcome?: unknown;
}

const text = (value: unknown): string =>
  typeof value === "string" && value.trim() ? value.trim() : "未知";

const revision = (value: unknown): string =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : "未知";

export interface WorkContextWriteNoticeOptions {
  /**
   * 本次写入实际落在哪个存储。只有调用处知道这件事：
   * `queryMemory(mode="work")` 不指定 storage 时默认读本地库
   * （packages/cli/client/cliServerPlatformToolExecutors.ts:570-578 只在
   * storage === "server" 时访问服务端），所以服务端写冲突后的「读最新 revision」
   * 建议必须显式带 storage="server"，否则建议本身查不到这条 activityId。
   * Web 端只支持服务端存储，不需要也不应该传这个参数。
   */
  storage?: "server" | "local";
}

export function formatWorkContextWriteNotice(
  result: WorkContextWriteResultLike | null | undefined,
  options?: WorkContextWriteNoticeOptions,
): string {
  const activityId = text(result?.activityId);
  const rev = revision(result?.revision);
  const outcome = result?.outcome;
  const storage = options?.storage;
  // 有 storage 就把它写进查询/重写的参数里；没有（Web）保持原文案不变。
  const storageArg = storage ? `, storage="${storage}"` : "";

  if (outcome === "created" || outcome === "updated") {
    const verb = outcome === "created" ? "新建" : "更新";
    return `已写入工作记忆（${verb}）：activityId=${activityId}，revision ${rev}。`;
  }

  if (outcome === "unchanged") {
    // 没有语义变化就不会产生新版本：不能报成「已更新」。
    return `工作记忆内容与已有版本完全一致，未产生新版本：activityId=${activityId}，revision 仍为 ${rev}。`;
  }

  if (outcome === "conflict") {
    return [
      `未写入工作记忆：本次修改被拒绝（outcome=conflict），activityId=${activityId}，当前 revision=${rev}。`,
      "常见原因：expectedRevision 已过期（别人先写了）；改了内容却复用了旧 changeId；或该 activityId 属于别的空间。",
      `下一步：调用 queryMemory（mode="work", activityId="${activityId}"${storageArg}）读取最新 revision 与内容，再用该 revision 作为 expectedRevision、并换一个新的 changeId 重写${storage ? `（重写时同样带上 storage="${storage}"）` : ""}；若这条不该改，改用新的 itemKey 另建一条。`,
    ].join("\n");
  }

  // 未知 outcome 一律按「未确认写入」处理，绝不能默认成功。
  return `未确认工作记忆是否写入：服务端返回了无法识别的 outcome=${text(outcome)}，activityId=${activityId}。下一步：调用 queryMemory（mode="work", activityId="${activityId}"${storageArg}）确认当前 revision 后再决定是否重写。`;
}
