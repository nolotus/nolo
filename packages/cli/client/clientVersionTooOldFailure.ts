// packages/cli/client/clientVersionTooOldFailure.ts
//
// CLIENT_VERSION_TOO_OLD 的 CLI 侧渲染（三层贯通的第 3 层，参照
// PLATFORM_LLM_BUSY 的 describeLocalRunFailure 分支模式）。
//
// 两个消费方共用同一份渲染，避免文案漂移：
// 1. agentRun.ts describeLocalRunFailure —— 本地 run 路径（self-check 在
//    providerResolution 抛错，Error.detail 携带结构化字段）。
// 2. agentRunStream.ts —— server run 路径（SSE error 帧带 code + detail，
//    handlePayload 把它们挂到抛出的 Error 上）。
//
// detail 形状来自 server/agent-runtime 共用的 buildClientVersionGateErrorDetail：
// { reason: CLIENT_VERSION_TOO_OLD, model, minClientVersion, clientVersion?,
//   upgradeCommand, retryable: false }。字段缺失时退回裸 message（不猜）。

import {
  CLIENT_VERSION_TOO_OLD_CODE,
  buildClientVersionUpgradeMessage,
} from "core/clientVersionGate";

type VersionGateDetail = {
  model?: unknown;
  minClientVersion?: unknown;
  clientVersion?: unknown;
  upgradeCommand?: unknown;
};

const asVersionGateDetail = (value: unknown): VersionGateDetail | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.model !== "string" ||
    typeof candidate.minClientVersion !== "string"
  ) {
    return undefined;
  }
  return candidate;
};

/**
 * 判定一次失败是否为客户端版本闸门拒绝。三个证据源任一命中即可：
 * - rawError.code（server run：SSE error 帧的 code 被 handlePayload 挂上来）
 * - rawError.detail.reason / detail.code（结构化 detail；reason 是
 *   buildClientVersionGateErrorDetail 的键名）
 * - message 文本里带 code（本地 self-check 旧版本抛错曾只有 message）
 */
export const isClientVersionTooOldFailure = (
  message: string,
  rawError?: unknown,
): boolean => {
  if (message.includes(CLIENT_VERSION_TOO_OLD_CODE)) return true;
  if (typeof rawError !== "object" || rawError === null) return false;
  const err = rawError as { code?: unknown; detail?: unknown };
  if (err.code === CLIENT_VERSION_TOO_OLD_CODE) return true;
  if (typeof err.detail !== "object" || err.detail === null) return false;
  const detail = err.detail as { reason?: unknown; code?: unknown };
  return (
    detail.reason === CLIENT_VERSION_TOO_OLD_CODE ||
    detail.code === CLIENT_VERSION_TOO_OLD_CODE
  );
};

/**
 * SSE error 帧的结构化字段 → 抛出的 Error。agentRunStream.handlePayload 用它把
 * server 侧 error 帧上的 code / detail 挂到 Error 上（三层贯通第 2→3 层的透传点），
 * 供 describeClientVersionTooOldFailure / describeLocalRunFailure 渲染。抽成纯函数
 * 是为了能在不 import agentRunStream（其依赖链含 tui/theme，测试环境无法裸跑）的
 * 情况下直接钉死这段透传行为。
 */
export const attachStreamFrameErrorFields = (
  error: Error,
  payload: Record<string, unknown> | undefined | null,
): Error & { code?: unknown; detail?: unknown } => {
  const target = error as Error & { code?: unknown; detail?: unknown };
  if (payload && typeof payload === "object") {
    if (payload.code !== undefined) target.code = payload.code;
    if (payload.detail !== undefined) target.detail = payload.detail;
  }
  return target;
};

/**
 * 渲染可操作的失败文案：点名模型、所需版本、当前版本、升级命令，并说明
 * 本次拒绝发生在任何上游调用之前（零费用）。detail 字段不全时退回原
 * message（它本身已含升级指引，来自 buildClientVersionUpgradeMessage）。
 */
export const describeClientVersionTooOldFailure = (
  message: string,
  rawError?: unknown,
): string => {
  const detail =
    typeof rawError === "object" && rawError !== null
      ? asVersionGateDetail((rawError as { detail?: unknown }).detail)
      : undefined;
  if (!detail) {
    return `[nolo] ${message}\n`;
  }
  const model = detail.model as string;
  const minClientVersion = detail.minClientVersion as string;
  const current =
    typeof detail.clientVersion === "string" && detail.clientVersion.trim()
      ? detail.clientVersion.trim()
      : undefined;
  const upgradeCommand =
    typeof detail.upgradeCommand === "string" && detail.upgradeCommand.trim()
      ? detail.upgradeCommand.trim()
      : "npx nolo-cli@latest";
  return (
    `[nolo] Run blocked: client version too old (${CLIENT_VERSION_TOO_OLD_CODE}). ` +
    buildClientVersionUpgradeMessage({ model, minClientVersion, ...(current ? { clientVersion: current } : {}) }) +
    `本次拒绝发生在任何上游调用之前，未产生费用。升级命令：${upgradeCommand}。\n`
  );
};
