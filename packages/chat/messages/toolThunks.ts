// 文件路径: chat/messages/toolThunks.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import { toErrorMessage } from "core/errorMessage";
import { isRecord } from "core/isRecord";
import { clipHeadAndTail } from "core/clipHeadAndTail";
import { asOptionalTrimmedString } from "core/optionalString";
import { findToolExecutor, toolDefinitionsByName } from "ai/tools";
import { getToolResultErrorData } from "ai/tools/toolResultError";
import {
  toolRunStarted,
  toolRunSucceeded,
  toolRunFailed,
  createToolRunId,
  toolRunSetPending,
  collectConfirmedExecutedMessages,
} from "ai/tools/toolRunStore";
import { streamAgentChatTurn } from "ai/agent/agentSlice";

import type { Message, ToolPayload, ToolErrorPayload } from "./types";
import { toolResultNeedsUserConfirmation } from "./toolPresentation";
import { addToolMessage, updateToolMessage } from "./messageSlice";
import { persistToolMessage } from "./persistToolMessage";
import { dialogMessageKey } from "database/keys";
import {
  CONFIRMATION_INPUT_KEYS,
  stripModelToolArgs,
} from "ai/tools/stripModelConfirmationFlags";

const TOOL_ARGS_SENTINELS = [
  "<|tool_calls_section_end|>",
  "<|tool_calls_end|>",
  "<|endofjson|>",
];

function cleanToolArguments(argStr: string): string {
  if (!argStr) return argStr;

  let cleaned = argStr;
  for (const s of TOOL_ARGS_SENTINELS) {
    const idx = cleaned.indexOf(s);
    if (idx >= 0) {
      cleaned = cleaned.slice(0, idx);
    }
  }

  return cleaned.trim();
}

const defaultSummary = (toolName: string, status: ToolPayload["status"]) => {
  if (status === "pending") return `⏸️ ${toolName} 等待确认/授权`;
  if (status === "running") return `⏳ ${toolName} 执行中…`;
  if (status === "failed") return `❌ ${toolName} 执行失败`;
  return `✅ ${toolName} 执行完成`;
};

/**
 * 写侧兜底上限（UTF-8 字节）：与 filterAndCleanMessages 读侧 clipHeadAndTail
 * 的默认值（total 4000 / head 1000 / tail 2500）逐项对齐，写侧产出不会再被
 * 读侧二次裁剪；超限时由 clipHeadAndTail 插入统一截断标记
 * （`[... truncated N bytes.]`）。上限即「明确上限」：再大的真实结果也只会
 * 占用约 3.5KB 上下文，不会把超大 payload 灌进模型。
 */
const RAW_DATA_FALLBACK_MAX_TOTAL_BYTES = 4000;
const RAW_DATA_FALLBACK_MAX_HEAD_BYTES = 1000;
const RAW_DATA_FALLBACK_MAX_TAIL_BYTES = 2500;

/**
 * 写侧兜底：工具既没返回 llmContext、也没返回 displayData 时，用真实 rawData
 * 生成有界 llmContext 写进 toolPayload。
 *
 * 为什么必须在写侧堵：filterAndCleanMessages 对 role="tool" 的取值顺序是
 * llmContext → summary → content。工具只给默认状态摘要（如
 * 「✅ readArtifact 执行完成」）时，真实 content（44 段转写、fileId、
 * downloadUrl）会被摘要整个顶替，模型看不到结果。UI 仍显示默认状态摘要
 * （toolPayload.summary 不变），变的只是模型可见内容。
 *
 * 只在有真实结果时兜底：等待用户确认时 rawData 只是确认标记，且确认成功后
 * finalizeConfirmedToolMessages 只回写 status/summary，陈旧 llmContext 会在
 * 读侧压制新摘要，故 awaitingUserConfirmation 时不写。
 */
const buildRawDataLlmContextFallback = (
  rawData: unknown,
  toolCallId?: string
): string | undefined => {
  const serialized =
    typeof rawData === "string"
      ? rawData.trim()
      : rawData === undefined
        ? ""
        : JSON.stringify(rawData);
  if (!serialized) return undefined;
  const clipped = clipHeadAndTail(serialized, {
    maxHeadBytes: RAW_DATA_FALLBACK_MAX_HEAD_BYTES,
    maxTailBytes: RAW_DATA_FALLBACK_MAX_TAIL_BYTES,
    maxTotalBytes: RAW_DATA_FALLBACK_MAX_TOTAL_BYTES,
    // 完整 rawData 已随 tool message content 原样落盘，无需另写临时日志；
    // 浏览器 stub 本就忽略该选项。
    saveTempLog: false,
    ...(toolCallId ? { toolCallId } : {}),
  });
  return asOptionalTrimmedString(clipped.content);
};

interface ProcessToolDataPayload {
  toolCall: any;
  parentMessageId: string;
  toolRunId: string;
  agentKey?: string;
  /** 当前对话 id：工具层据此数本对话历史（exa_search 定档信号，可选）。 */
  dialogId?: string;
}

export interface HandleToolCallsPayload {
  accumulatedCalls: any[];
  currentContentBuffer: any[];
  agentConfig: any;
  messageId: string;
  dialogId: string;
  dialogKey?: string;
}

const processToolData = createAsyncThunk(
  "message/processToolData",
  async (args: ProcessToolDataPayload, thunkApi: any) => {
    const { toolCall, parentMessageId, toolRunId, agentKey } = args;
    const { dispatch, rejectWithValue } = thunkApi;

    const func = toolCall.function;
    if (!func || !func.name) {
      throw new Error(
        "Invalid tool call data: missing function or function.name"
      );
    }

    const toolCallId =
      toolCall.id ||
      `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const rawToolName = func.name;
    let toolArgs = func.arguments;

    const found = findToolExecutor(rawToolName);
    const canonicalName = found.canonicalName;

    const def = toolDefinitionsByName[canonicalName];
    const behavior = def?.behavior;
    const interaction = def?.interaction ?? "auto";

    if (typeof toolArgs === "string") {
      const cleaned = cleanToolArguments(toolArgs);
      try {
        toolArgs = JSON.parse(cleaned);
      } catch (e) {
        console.error(
          "[ToolThunks/processToolData] toolArgs JSON.parse failed:",
          toolArgs
        );
        throw new Error(`Failed to parse tool arguments JSON: ${e}`);
      }
    }

    const activity =
      isRecord(toolArgs) && isRecord(toolArgs._activity)
        ? toolArgs._activity
        : undefined;
    const withoutActivity =
      isRecord(toolArgs) &&
      Object.prototype.hasOwnProperty.call(toolArgs, "_activity")
        ? (({ _activity: _ignored, ...rest }) => rest)(toolArgs)
        : toolArgs;
    const executionToolArgs = stripModelToolArgs(canonicalName, withoutActivity);

    const inputSummary = JSON.stringify(executionToolArgs).slice(0, 400);

    toolRunStarted({
      id: toolRunId,
      messageId: parentMessageId,
      toolName: canonicalName,
      behavior,
      inputSummary,
      interaction,
      input: executionToolArgs,
    });

    // ========= 分支一：confirm / authorize 工具，走预览（暂停） =========
    if (interaction === "confirm" || interaction === "authorize") {
      try {
        toolRunSetPending({ id: toolRunId });

        const previewExecutor = def?.previewExecutor;
        const previewResult = previewExecutor
          ? await previewExecutor(executionToolArgs, thunkApi, { parentMessageId })
          : {
            rawData: {
              previewOnly: true,
              toolName: canonicalName,
              interaction,
            },
          };

        const rawData = previewResult?.rawData ?? previewResult;

        const summary =
          (typeof previewResult?.displayData === "string" &&
            previewResult.displayData.trim()) ||
          (interaction === "authorize"
            ? `🔐 ${canonicalName} 需要授权后执行`
            : `⚠️ ${canonicalName} 需要确认后执行`);

        const toolPayload: ToolPayload = {
          toolName: canonicalName,
          status: "pending",
          interaction,
          input: executionToolArgs,
          rawToolCall: toolCall,
          toolRunId,
          summary,
          ...(activity ? { activity } : {}),
        };

        return {
          toolCallId,
          rawResult: rawData,
          summary,
          toolName: canonicalName,
          toolRunId,
          toolPayload,
          hasPendingInteraction: true, // ✅ 暂停点
        };
      } catch (e: any) {
        const errorMessage = toErrorMessage(e);
        const structured = getToolResultErrorData(e);
        const rawErrorResult =
          structured?.rawData !== undefined ? structured.rawData : { error: errorMessage };
        const summary =
          asOptionalTrimmedString(structured?.displayData) ||
          `❌ ${canonicalName} 预览失败: ${errorMessage}`;

        toolRunFailed({
          id: toolRunId,
          error: errorMessage,
          outputSummary: summary,
        });

        const errorPayload: ToolErrorPayload = {
          type: e?.name || "Error",
          message: errorMessage,
          code: structured?.code ?? e?.code,
          retryable: structured?.retryable ?? e?.retryable ?? true,
        };

        const toolPayload: ToolPayload = {
          toolName: canonicalName,
          status: "failed",
          input: executionToolArgs,
          rawToolCall: toolCall,
          error: errorPayload,
          toolRunId,
          summary,
          ...(activity ? { activity } : {}),
        };

        return rejectWithValue({
          toolCallId,
          rawResult: rawErrorResult,
          summary,
          toolName: canonicalName,
          toolRunId,
          toolPayload,
          hasPendingInteraction: true,
        });
      }
    }

    // ========= 分支二：auto 工具（包括 ask_user / readFile / execShell 等） =========
    try {
      const toolResult = await found.executor(executionToolArgs, thunkApi, {
        parentMessageId,
        toolRunId,
        agentKey,
        // 定档信号：这里是前台对话流式路径，来源恒为 chat；对话 id 用于数历史搜索。
        ...(args.dialogId ? { dialogId: args.dialogId } : {}),
        origin: "chat" as const,
      });

      const rawData = toolResult?.rawData ?? toolResult;
      const llmContext = asOptionalTrimmedString(toolResult?.llmContext);
      const displayData = asOptionalTrimmedString(toolResult?.displayData);
      // 「等待用户确认」不是成功也不是失败：标 succeeded 会让待确认行显示成已完成，
      // 与卡片上的确认按钮自相矛盾。保持 pending 直到真人授权后服务端给出真实状态。
      const awaitingUserConfirmation = toolResultNeedsUserConfirmation(canonicalName, rawData);

      const summary =
        displayData ||
        defaultSummary(canonicalName, awaitingUserConfirmation ? "pending" : "succeeded");

      // 写侧兜底：llmContext/displayData 都缺时，用有界 rawData 兜底模型可见
      // 内容，避免默认状态摘要顶替真实结果（详见 buildRawDataLlmContextFallback）。
      // 工具显式给了 llmContext / displayData 时一律不兜底，保持既有语义。
      const llmContextFallback =
        llmContext || displayData || awaitingUserConfirmation
          ? undefined
          : buildRawDataLlmContextFallback(rawData, toolCallId);
      const effectiveLlmContext = llmContext ?? llmContextFallback;

      if (!awaitingUserConfirmation) {
        toolRunSucceeded({
          id: toolRunId,
          outputSummary: summary,
        });
      } else {
        toolRunSetPending({ id: toolRunId });
      }

      const toolPayload: ToolPayload = {
        toolName: canonicalName,
        status: awaitingUserConfirmation ? "pending" : "succeeded",
        interaction,
        input: executionToolArgs,
        rawToolCall: toolCall,
        toolRunId,
        summary,
        ...(effectiveLlmContext ? { llmContext: effectiveLlmContext } : {}),
        ...(activity ? { activity } : {}),
      };

      // ✅ 关键：ask_user(blocking=true) 也视作“暂停点”
      const isUiAskChoice = canonicalName === "ask_user";
      const blocking =
        typeof executionToolArgs?.blocking === "boolean"
          ? executionToolArgs.blocking
          : true; // schema 默认 true

      const hasPendingInteraction =
        isUiAskChoice && blocking === true;

      return {
        toolCallId,
        rawResult: rawData,
        summary,
        toolName: canonicalName,
        toolRunId,
        toolPayload,
        hasPendingInteraction,
      };
    } catch (e: any) {
      const errorMessage = toErrorMessage(e);
      const structured = getToolResultErrorData(e);
      const confirmationKey = structured?.code
        ? CONFIRMATION_INPUT_KEYS[structured.code]
        : undefined;

      if (confirmationKey) {
        const confirmedInput = {
          ...(executionToolArgs ?? {}),
          [confirmationKey]: true,
        };
        const summary =
          (typeof structured?.displayData === "string" &&
            structured.displayData.trim()) ||
          `⚠️ ${canonicalName} 需要确认后执行`;

        toolRunStarted({
          id: toolRunId,
          messageId: parentMessageId,
          toolName: canonicalName,
          behavior,
          inputSummary: JSON.stringify(confirmedInput).slice(0, 400),
          interaction: "confirm",
          input: confirmedInput,
        });
        toolRunSetPending({ id: toolRunId });

        const toolPayload: ToolPayload = {
          toolName: canonicalName,
          status: "pending",
          interaction: "confirm",
          input: confirmedInput,
          rawToolCall: toolCall,
          toolRunId,
          summary,
          ...(activity ? { activity } : {}),
        };

        return {
          toolCallId,
          rawResult:
            structured?.rawData !== undefined
              ? structured.rawData
              : // 按实际确认码回填（此分支内 code 必在 CONFIRMATION_INPUT_KEYS 中），
                // 不再对所有工具写死 self_evolution 文案。
                { error: structured?.code },
          summary,
          toolName: canonicalName,
          toolRunId,
          toolPayload,
          hasPendingInteraction: true,
        };
      }

      const rawErrorResult =
        structured?.rawData !== undefined ? structured.rawData : { error: errorMessage };
      const summary =
        asOptionalTrimmedString(structured?.displayData) ||
        `❌ ${canonicalName} 执行失败: ${errorMessage}`;

      toolRunFailed({
        id: toolRunId,
        error: errorMessage,
        outputSummary: summary,
      });

      const errorPayload: ToolErrorPayload = {
        type: e?.name || "Error",
        message: errorMessage,
        code: structured?.code ?? e?.code,
        retryable: structured?.retryable ?? e?.retryable ?? true,
      };

      const toolPayload: ToolPayload = {
        toolName: canonicalName,
        status: "failed",
        input: executionToolArgs,
        rawToolCall: toolCall,
        error: errorPayload,
        toolRunId,
        summary,
        ...(activity ? { activity } : {}),
      };

      return rejectWithValue({
        toolCallId,
        rawResult: rawErrorResult,
        summary,
        toolName: canonicalName,
        toolRunId,
        toolPayload,
        hasPendingInteraction: false,
      });
    }
  }
);

/**
 * 确认执行成功后把工具消息行写回 succeeded（M1）。
 *
 * 确认栏 / 媒体卡片走的是 executeToolRun：它只推进内存 run，从不回写消息行，
 * 落盘的 toolPayload.status 因此永远是 pending。刷新后
 * hydrateToolRunsFromMessages 会照着这行 pending 把 run 复活，卡片再次显示
 * 「需要确认」——对 email_send 这类不可逆操作，再点一次就是重复发送。
 *
 * 这里按「内存 run 已 succeeded、消息行仍 pending」对账，把消息行写回 succeeded
 * （Redux + 同一条 durable 写路径），hydrate 之后便不会再回灌它。调用点放在
 * 消息装载处（MessageList 的 effect），因此与 email_send 的异步签发分支无关：
 * 只有 executeToolRun 真正成功、run 变 succeeded 之后才会写。
 *
 * 只认 succeeded：失败/取消的 run 保持 pending，刷新后仍可重试（与修复前一致）。
 */
export async function finalizeConfirmedToolMessages(
  dispatch: any,
  messages: unknown
): Promise<number> {
  const rows = (Array.isArray(messages) ? messages : []) as Message[];
  const candidates = collectConfirmedExecutedMessages<Message>(rows);

  let applied = 0;
  for (const { message, outputSummary } of candidates) {
    const id = asOptionalTrimmedString(message?.id);
    if (!id) continue;

    const changes = {
      isStreaming: false,
      toolPayload: {
        ...(message.toolPayload ?? {}),
        status: "succeeded" as const,
        toolRunId: asOptionalTrimmedString(message.toolRunId),
        ...(outputSummary ? { summary: outputSummary } : {}),
      },
    };

    dispatch(updateToolMessage({ id, changes: changes as any }));
    await persistToolMessage(
      dispatch,
      { ...message, ...changes },
      { isStreaming: false, soft: true }
    );
    applied += 1;
  }
  return applied;
}

export const handleToolCalls = createAsyncThunk(
  "message/handleToolCalls",
  async (args: HandleToolCallsPayload, thunkApi: any) => {
    const {
      accumulatedCalls,
      currentContentBuffer,
      agentConfig,
      messageId,
      dialogId,
      dialogKey,
    } = args;

    const { dispatch } = thunkApi;

    const updatedContentBuffer = [...currentContentBuffer];
    let hasHandedOff = false;
    let hasPendingInteraction = false;

    for (let toolIndex = 0; toolIndex < accumulatedCalls.length; toolIndex++) {
      const toolCall = accumulatedCalls[toolIndex];
      if (!toolCall.function?.name) continue;

      const toolCallId =
        toolCall.id ||
        `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const toolRunId = createToolRunId();
      // 从 parent 消息 ID 派生 tool 消息 ID，保证 tool 排在 parent 之后、下一个 assistant 之前
      const canonicalToolName = findToolExecutor(toolCall.function.name).canonicalName;
      const runningToolMessageId = `${messageId}-t${String(toolIndex).padStart(3, "0")}`;
      const runningToolDbKey = dialogMessageKey(dialogId, runningToolMessageId);
      // `dialogId` is carried explicitly (see the identity guard): `Message`
      // itself has no such field, hence the intersection.
      const runningToolMessage: Message & { dialogId?: string } = {
        id: runningToolMessageId,
        dbKey: runningToolDbKey,
        // Explicit identity: tool results belong to the run's dialog, and the
        // message-key parse is ambiguous once a message id contains "-msg-".
        dialogId,
        role: "tool",
        content: JSON.stringify({ pending: true }),
        toolCallId,
        thinkContent: "",
        cybotKey: agentConfig.dbKey,
        isStreaming: true,
        toolName: canonicalToolName,
        parentMessageId: messageId,
        toolRunId,
        toolPayload: {
          toolName: canonicalToolName,
          status: "running",
          input: {},
          rawToolCall: toolCall,
          toolRunId,
          summary: defaultSummary(canonicalToolName, "running"),
        },
      };

      dispatch(addToolMessage(runningToolMessage));
      // Same durable write path as desktop local runtime (persistToolMessage).
      await persistToolMessage(dispatch, runningToolMessage, {
        isStreaming: true,
        soft: true,
      });

      try {
        const result = await dispatch(
          processToolData({
            toolCall: { ...toolCall, id: toolCallId },
            parentMessageId: messageId,
            toolRunId,
            agentKey: agentConfig.dbKey,
            dialogId,
          })
        ).unwrap();

        const toolName = result.toolName;
        let rawResult = result.rawResult;
        let toolPayload = result.toolPayload;

        if (toolName) {
          const completedToolMessage = {
            ...runningToolMessage,
            content: JSON.stringify(rawResult),
            toolCallId: result.toolCallId,
            isStreaming: false,
            toolName,
            toolRunId: result.toolRunId,
            toolPayload,
          };
          dispatch(
            updateToolMessage({
              id: runningToolMessageId,
              changes: {
                content: completedToolMessage.content,
                toolCallId: completedToolMessage.toolCallId,
                isStreaming: false,
                toolName,
                toolRunId: result.toolRunId,
                toolPayload,
              },
            })
          );

          await persistToolMessage(dispatch, completedToolMessage, {
            isStreaming: false,
            soft: true,
          });

          if (result.hasPendingInteraction) {
            hasPendingInteraction = true;
          }

          // handoff 型工具：runStreamingAgent
          if (toolName === "runStreamingAgent") {
            const raw = (result.rawResult as any) ?? {};
            const agentKey = raw.agentKey;
            const userInput = raw.userInput;
            const serverBase = asOptionalTrimmedString(raw.serverBase);

            if (agentKey && userInput) {
              hasHandedOff = true;
              void dispatch(
                streamAgentChatTurn({
                  agentKey,
                  userInput,
                  ...(dialogKey ? { dialogKey } : {}),
                  ...(serverBase ? { serverBase } : {}),
                })
              );
            }
          }

        }
      } catch (rejectedValue: any) {
        console.error(
          "[ToolThunks/handleToolCalls] processToolData rejected:",
          rejectedValue
        );

        if (rejectedValue.toolName) {
          const errorResult = {
            error: true,
            message:
              rejectedValue.toolPayload?.error?.message || "未知错误",
          };
          const failedToolMessage = {
            ...runningToolMessage,
            content: JSON.stringify(errorResult),
            toolCallId: rejectedValue.toolCallId,
            isStreaming: false,
            toolName: rejectedValue.toolName,
            toolRunId: rejectedValue.toolRunId,
            toolPayload: rejectedValue.toolPayload,
          };
          dispatch(
            updateToolMessage({
              id: runningToolMessageId,
              changes: {
                content: failedToolMessage.content,
                toolCallId: failedToolMessage.toolCallId,
                isStreaming: false,
                toolName: rejectedValue.toolName,
                toolRunId: rejectedValue.toolRunId,
                toolPayload: rejectedValue.toolPayload,
              },
            })
          );

          await persistToolMessage(dispatch, failedToolMessage, {
            isStreaming: false,
            soft: true,
          });

          if (rejectedValue.hasPendingInteraction) {
            hasPendingInteraction = true;
          }
        }
      }
    }

    return {
      finalContentBuffer: updatedContentBuffer,
      hasHandedOff,
      hasPendingInteraction,
    };
  }
);
