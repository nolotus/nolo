// packages/ai/agent/executeToolCall.ts
//
// 提取自 runAgentClientLoop：非流式多轮循环中执行单次 tool_call 的公共逻辑。
// streamAgentChatTurn 走 sendOpenAICompletionsRequest → toolThunks，不使用此函数。

import { findToolExecutor } from "ai/tools";
import { getToolResultErrorData } from "ai/tools/toolResultError";
import { stripModelToolArgs } from "ai/tools/stripModelConfirmationFlags";
import { reportToolExecutionErrorInBackground } from "./toolErrorReport";

interface ToolCall {
  id: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

/**
 * 执行单次 tool_call，返回工具结果字符串（供追加到 messages）。
 *
 * @param tc            LLM 返回的单个 tool_call 对象
 * @param thunkApi      Redux thunkApi（含 dispatch / getState）
 * @param parentMessageId 父消息 ID（关联上下文）
 */
export async function executeToolCall(
  tc: ToolCall,
  thunkApi: any,
  context?: {
    parentMessageId?: string;
    agentKey?: string;
    effectiveModel?: string;
    runKind?: "interactive" | "subtask";
    /**
     * 以下为定档信号（可选，透传给 executor 的 context）。
     * 调用点拿不到就不传，工具层会按缺失处理（服务端跳过对应规则）。
     */
    dialogId?: string;
    /**
     * 本次调用所属对话的完整键（`dialog-<owner>-<id>`），与 dialogId 同源。
     * 记忆类工具靠它确定 owner，不按 dialogId 猜。
     */
    dialogKey?: string;
    priorSearches?: number;
    lastResultCount?: number;
    origin?: "chat" | "agent" | "automation";
  }
): Promise<string> {
  const toolName: string = tc.function?.name ?? "";
  const parsedToolArgs = (() => {
    try {
      return JSON.parse(tc.function?.arguments ?? "{}");
    } catch {
      return {};
    }
  })();

  // 上报用的工具名列：能解析出执行器就报 canonicalName（与 toolThunks 的上报词表
  // 一致），解析不到才退回模型给的原始名。模型会用别名（`exec_shell` / `bash` /
  // `terminalCommand`…都由 `findToolExecutor` 归一成 `execShell`），若上报原始名，
  // 同一工具会以两种名字入库，管理员侧的聚合与去重都会被拆成两拨。
  // 只影响上报字段：控制台日志与返回文案保持原始名不变。
  let reportedToolName = toolName;

  try {
    const toolDefinition = findToolExecutor(toolName);
    if (!toolDefinition) {
      return `[工具 "${toolName}" 未找到]`;
    }
    reportedToolName = toolDefinition.canonicalName;
    const toolArgs = stripModelToolArgs(toolDefinition.canonicalName, parsedToolArgs);
    const result = await toolDefinition.executor(toolArgs, thunkApi, {
      parentMessageId: context?.parentMessageId ?? "",
      agentKey: context?.agentKey,
      effectiveModel: context?.effectiveModel,
      runKind: context?.runKind,
      // 定档信号透传：缺省键一律不写入，避免给工具伪造默认值。
      ...(context?.dialogId ? { dialogId: context.dialogId } : {}),
      // 完整对话键（含 owner）：记忆类工具靠它精确定位记录，不看枚举顺序。
      ...(context?.dialogKey ? { dialogKey: context.dialogKey } : {}),
      ...(typeof context?.priorSearches === "number"
        ? { priorSearches: context.priorSearches }
        : {}),
      ...(typeof context?.lastResultCount === "number"
        ? { lastResultCount: context.lastResultCount }
        : {}),
      ...(context?.origin ? { origin: context.origin } : {}),
    });
    // executor 返回 { rawData, displayData? } 或直接返回字符串
    const raw = result?.rawData ?? result;
    return typeof raw === "string" ? raw : JSON.stringify(raw);
  } catch (err: any) {
    console.error(`[executeToolCall] tool "${toolName}" 执行失败:`, err);
    // Web 端 best-effort 上报抛异常（不 await、不重试、失败不影响返回值）。
    reportToolExecutionErrorInBackground({
      thunkApi,
      dialogId: context?.dialogId,
      callId: tc.id,
      toolName: reportedToolName,
      error: err,
    });
    const structured = getToolResultErrorData(err);
    if (structured?.rawData !== undefined) {
      const raw = structured.rawData;
      return typeof raw === "string" ? raw : JSON.stringify(raw);
    }
    return `[工具 "${toolName}" 执行失败: ${err?.message ?? err}]`;
  }
}
