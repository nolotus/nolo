// packages/chat/messages/web/agentRunStartReceipt.ts
// `startAgentRun` 成功回执与固定运行区的**重复反馈**判定（web 聊天工具列表）。
//
// 规则边界（违反任一条即保留回执，不隐藏）：
// - 只处理 `startAgentRun`：`controlAgentRun` / `listAgents` 是操作与查询结果，
//   RN / 分享 / 只读视图没有固定运行区，一律仍走原渲染路径（本函数只被 web
//   消息列表调用，RN 不引用它）。
// - 只隐藏**明确成功派发**的回执：工具状态必须落在成功白名单内；失败 / 超时 /
//   失联 / 取消 / 未知、工具报错、pending（无回执）全部保留——固定区会在 TTL
//   后回收行，消息流是唯一留痕。
// - 状态判定**按来源逐个检查，不用 `??` 串联**：外层工具完成态（`succeeded`）
//   不得掩盖嵌套结果里的 run 失败态（`payload.result.status: "failed"`）。
//   失败/异常判定复用 `toolPresentation` 的既有状态分类真值
//   （`isAgentRunStatusNormal`：只接受明确正常分类），不另建第二份状态表；
//   非空但未登记的状态按「非正常」处理 → 保留回执。
// - 只隐藏**同一 run 已被固定区逐行覆盖**的回执：runId 解析不到、或不在覆盖
//   集合内，一律保留。
// - 判定只读消息与覆盖集合，不改工具返回、不改模型上下文、不改落库记录。

import { isRecord } from "core/isRecord";
import { isAgentRunStatusNormal } from "core/agentRunStatusKind";
import { asOptionalTrimmedString } from "core/optionalString";

export const AGENT_RUN_START_TOOL_NAME = "startAgentRun";

/** 工具自身「明确成功派发」的白名单：不在其中的工具状态一律保留回执。 */
const TOOL_SUCCESS_STATUSES: Record<string, true> = {
  succeeded: true,
  success: true,
  ok: true,
  done: true,
  completed: true,
};

function asRecordOrUndefined(
  value: unknown,
): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function parseContentRecord(
  content: unknown,
): Record<string, unknown> | undefined {
  const direct = asRecordOrUndefined(content);
  if (direct) return direct;
  if (typeof content !== "string") return undefined;
  try {
    return asRecordOrUndefined(JSON.parse(content));
  } catch {
    return undefined;
  }
}

/** 缺失状态不算「未证明成功」；一旦有值就必须是明确的成功态。 */
function isProvenSuccessfulDispatch(status: string | undefined): boolean {
  return !status || TOOL_SUCCESS_STATUSES[status] === true;
}

/**
 * 该工具消息是否与固定运行区重复（因此可从可见聊天工具列表过滤掉）。
 *
 * @param coveredRunIds 固定运行区逐行覆盖的 runId（未挂载时为空集）
 */
export function isDuplicatedAgentRunStartReceipt(
  message: any,
  coveredRunIds?: ReadonlySet<string> | null,
): boolean {
  if (!coveredRunIds || coveredRunIds.size === 0) return false;
  if (!message || message.role !== "tool") return false;
  if (asOptionalTrimmedString(message.toolName) !== AGENT_RUN_START_TOOL_NAME) {
    return false;
  }
  // pending：工具调用还没有回执，谈不上重复。
  if (message.isStreaming) return false;
  if (message.isError) return false;

  const payload = asRecordOrUndefined(message.toolPayload);
  const payloadResult = asRecordOrUndefined(payload?.result);
  const payloadRun = asRecordOrUndefined(payload?.run);
  const raw = parseContentRecord(message.content);

  // ① 工具自身必须「明确成功派发」：有状态且不在成功白名单 → 保留。
  if (payload?.error) return false;
  if (typeof message.error === "string") return false;
  if (
    !isProvenSuccessfulDispatch(asOptionalTrimmedString(payload?.status)) ||
    !isProvenSuccessfulDispatch(asOptionalTrimmedString(message.status))
  ) {
    return false;
  }

  // ② run 状态按来源逐个检查（不串联、不取单值）：只接受「明确正常」
  //    （core `isAgentRunStatusNormal`：active/succeeded，与 CLI 同一张表）。
  //    任一来源非空且非正常即保留——未登记状态、not_found/unknown/cancelling
  //    都走这条；失效方向是保留回执，不是隐藏。
  const runStatusSources = [
    asOptionalTrimmedString(raw?.status),
    asOptionalTrimmedString(payloadResult?.status),
    asOptionalTrimmedString(payloadRun?.status),
  ];
  for (const sourceStatus of runStatusSources) {
    if (sourceStatus && !isAgentRunStatusNormal(sourceStatus)) return false;
  }

  // ③ 身份：任一处能解析出 runId 即用；解析不到就保留（无法证明重复）。
  const runId =
    asOptionalTrimmedString(raw?.runId) ??
    asOptionalTrimmedString(payload?.runId) ??
    asOptionalTrimmedString(payloadResult?.runId) ??
    asOptionalTrimmedString(payloadRun?.runId);
  if (!runId) return false;

  return coveredRunIds.has(runId);
}
