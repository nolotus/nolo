// 文件路径: chat/sendOpenAICompletionsRequest.native.ts
// React Native 版 - 使用 react-native-sse 进行流式传输



import {
    addActiveController,
    removeActiveController,
} from "chat/dialog/dialogSlice";
import {
    messageStreamEnd,
    messageStreaming,
    addToolMessage,
} from "chat/messages/messageSlice";
import { handleToolCalls } from "chat/messages/toolThunks";
import { CompletionFinishReason, CompletionUsage, MessageContentPart, OpenAITextContent, Message } from "chat/messages/types";
import { DataType } from "create/types";
import { write } from "database/dbSlice";
import { selectCurrentServer } from "app/settings/settingSlice";
import { getApiEndpoint } from "ai/llm/providers";
import { createDialogMessageKeyAndId, dialogMessageKey } from "database/keys";
import { selectIdentityToken } from "identity/selectors";
import { isAbortError } from "core/abortError";
import { toErrorMessage } from "core/errorMessage";
import { asOptionalTrimmedString } from "core/optionalString";
import { extractCustomId } from "core/prefix";
import {
    createThinkParserState,
    flushThinkParser,
    processThinkChunk,
    type ThinkParseState,
} from "agent-runtime/thinkTagParser";
import {
    createToolCallTextParserState,
    processContentChunkWithToolCallStripping,
    flushToolCallTextParserIntoCallback,
    type ToolCallTextParseState,
} from "agent-runtime/toolCallTextParser";

import { performSSEFetchRequest } from "./fetchUtils";
import { createSSEParser } from "./parseMultilineSSE";
import { updateTotalUsage } from "./updateTotalUsage";
import { accumulateToolCallChunks, AccumulatedToolCall } from "./accumulateToolCallChunks";
import {
    parseToolCallArguments,
    buildInvalidToolCallSelfHealResult,
    INVALID_TOOL_ARGS_REPLACEMENT,
    sanitizeOutboundMessages,
} from "./toolCallArgumentGuard";
import {
    isRetryableInitialStreamError,
    MAX_INITIAL_STREAM_RETRIES,
    waitForInitialStreamRetry,
} from "./streamRetry";
import { prepareTools } from "../tools/prepareTools";

import { getModelInfo } from "ai/llm/getModelContextWindow";
import { supportsImageGeneration } from "ai/agent/utils/imageOutput";

import type { RootState } from "app/store";

/**
 * 追加文本 chunk 到 contentBuffer（不可变更新）
 */
function appendTextChunk(
    currentContentBuffer: MessageContentPart[],
    textChunk: string
): MessageContentPart[] {
    if (!textChunk) return currentContentBuffer;

    const updatedContentBuffer = [...currentContentBuffer];
    const lastIndex = updatedContentBuffer.length - 1;

    if (lastIndex >= 0 && updatedContentBuffer[lastIndex].type === "text") {
        const last = updatedContentBuffer[lastIndex] as OpenAITextContent;
        updatedContentBuffer[lastIndex] = {
            ...last,
            text: (last.text || "") + textChunk,
        };
    } else {
        updatedContentBuffer.push({ type: "text", text: textChunk });
    }

    return updatedContentBuffer;
}

/** OpenAI 标准 tool_call 结构 */
type AssistantToolCall = {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
};

const EXPLICIT_IMAGE_TOOL_NAMES = new Set([
    "openAIGptImage",
    "openAIGptImageGenerate",
    "chatgptWebImageGenerate",
    "openAIGptImageEdit",
    "geminiProImagePreview",
]);

function getStreamErrorMessage(data: any): string {
    const message =
        asOptionalTrimmedString(data?.error?.message) ??
        asOptionalTrimmedString(data?.error?.msg) ??
        asOptionalTrimmedString(data?.message);
    if (message) return message;

    const code =
        asOptionalTrimmedString(data?.error?.code) ??
        asOptionalTrimmedString(data?.code);
    if (code) return code;

    const type = asOptionalTrimmedString(data?.error?.type);
    if (type) return type;

    return "Unknown error";
}

function formatStreamErrorMessage(data: any): string {
    const rawMessage = getStreamErrorMessage(data);
    if (
        /prohibited|violation|terms\s+of\s+service|content\s+policy|safety/i.test(
            rawMessage
        )
    ) {
        return "当前模型服务商拒绝了这次请求。你可以稍后重试，或切换到其他模型继续。";
    }
    return rawMessage;
}

function getChoiceFinishErrorMessage(data: any, choice: any): string | null {
    if (choice?.error || choice?.message || choice?.code) {
        const message = formatStreamErrorMessage(choice);
        if (message && message !== "Unknown error") return message;
    }
    if (data?.error || data?.message || data?.code) {
        const message = formatStreamErrorMessage(data);
        if (message && message !== "Unknown error") return message;
    }
    const messageContent = asOptionalTrimmedString(choice?.message?.content);
    if (messageContent) return messageContent;
    return null;
}
type StreamState = {
    contentBuffer: MessageContentPart[];
    totalUsage: CompletionUsage | null;
    accumulatedToolCalls: AccumulatedToolCall[];
    reasoningBuffer: string;
    thinkState: ThinkParseState;
    toolCallTextState: ToolCallTextParseState;
    assistantToolCalls?: AssistantToolCall[];
    hasHandedOff: boolean;
    hasProcessedToolCalls: boolean;
    alreadyFinalized: boolean;
    finishReason: CompletionFinishReason | null;
};

type FinalizeContext = {
    dispatch: any;
    msgKey: string;
    dialogId: string;
    dialogKey: string;
    messageId: string;
    agentConfig: any;
};

type ToolCallsContext = {
    dispatch: any;
    agentConfig: any;
    dialogId: string;
    dialogKey: string;
    messageId: string;
};

type StreamCompletionContext = {
    dispatch: any;
    dialogId: string;
    dialogKey: string;
    messageId: string;
    agentConfig: any;
};


/** 单轮调用后返回给 Agent Loop 的元信息 */
export type CompletionMeta = {
    hasToolCalls: boolean;
    hasPendingInteraction: boolean;
    hasHandedOff: boolean;
    finishReason: CompletionFinishReason | null;
    usage?: any;
};

/**
 * 初始化流式状态
 */
function createInitialStreamState(): StreamState {
    return {
        contentBuffer: [],
        totalUsage: null,
        accumulatedToolCalls: [],
        reasoningBuffer: "",
        thinkState: createThinkParserState(),
        toolCallTextState: createToolCallTextParserState(),
        assistantToolCalls: undefined,
        hasHandedOff: false,
        hasProcessedToolCalls: false,
        alreadyFinalized: false,
        finishReason: null,
    };
}

/**
 * 根据 tools 配置生成本次请求体（不改动外部传入的 bodyData）
 */
function buildRequestBodyWithTools(
    bodyData: any,
    agentConfig: any,
    disableToolsForThisRequest: boolean
): any {
    // 防护 B：出站清洗。历史 messages 里可能含被截断的 tool_calls，
    // provider 会拒绝并让对话永久卡死。这里先清洗再决定是否注入 tools。
    const messagesForBody = Array.isArray(bodyData?.messages)
        ? sanitizeOutboundMessages(bodyData.messages)
        : bodyData?.messages;
    const baseBody =
        messagesForBody !== bodyData?.messages
            ? { ...bodyData, messages: messagesForBody }
            : bodyData;

    if (disableToolsForThisRequest) return baseBody;

    // 如果模型拥有图像输出能力，则不组装任何 tools
    const modelInfo = getModelInfo(agentConfig.model);
    if (modelInfo?.hasImageOutput) {
        return baseBody;
    }

    const rawTools = agentConfig.tools;
    if (!Array.isArray(rawTools) || rawTools.length === 0) return baseBody;
    const hasExplicitImageTool = rawTools.some(
        (toolName: unknown) =>
            typeof toolName === "string" && EXPLICIT_IMAGE_TOOL_NAMES.has(toolName)
    );
    if (supportsImageGeneration(agentConfig) && !hasExplicitImageTool) {
        return baseBody;
    }

    const tools = prepareTools(rawTools, { provider: agentConfig.provider });
    if (!tools.length) return baseBody;

    return {
        ...baseBody,
        tools,
        tool_choice: baseBody.tool_choice ?? "auto",
    };
}

/**
 * 结束当前流式消息，派发 messageStreamEnd（带幂等保护）
 */
async function finalizeStream(
    state: StreamState,
    ctx: FinalizeContext
): Promise<StreamState> {
    if (state.hasHandedOff || state.alreadyFinalized) return state;

    await ctx.dispatch(
        messageStreamEnd({
            finalContentBuffer: state.contentBuffer,
            totalUsage: state.totalUsage,
            msgKey: ctx.msgKey,
            agentConfig: ctx.agentConfig,
            dialogId: ctx.dialogId,
            dialogKey: ctx.dialogKey,
            messageId: ctx.messageId,
            reasoningBuffer: state.reasoningBuffer,
            toolCalls: state.assistantToolCalls,
        })
    );

    return {
        ...state,
        alreadyFinalized: true,
    };
}

/**
 * 累积 usage
 */
function applyUsage(state: StreamState, data: any): StreamState {
    if (!data.usage) return state;

    return {
        ...state,
        totalUsage: updateTotalUsage(state.totalUsage, data.usage),
    };
}

/**
 * 处理单个 delta（文本 / 推理 / tool_calls / 图片）
 */
export function applyDelta(
    state: StreamState,
    delta: any
): { state: StreamState; hasNewVisibleContent: boolean } {
    let hasNewVisibleContent = false;
    let next: StreamState = { ...state };

    // 推理增量：DeepSeek 官方发 reasoning_content，Ollama/Qwen3 发 reasoning。
    // 只认前者会让平台托管模型的思考过程在 native 端整段丢失（web 端见
    // sendOpenAICompletionsRequest.ts 的同名处理）。
    const reasoningChunk = delta.reasoning_content ?? delta.reasoning;
    if (reasoningChunk) {
        next.reasoningBuffer = (next.reasoningBuffer || "") + reasoningChunk;
    }

    // tool_calls 累积 + 映射为 OpenAI 标准格式
    if (Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0) {
        const accumulated = accumulateToolCallChunks(
            next.accumulatedToolCalls,
            delta.tool_calls
        );

        next = {
            ...next,
            accumulatedToolCalls: accumulated,
            assistantToolCalls: accumulated.map((call: AccumulatedToolCall) => ({
                id: call.id,
                type: "function",
                function: {
                    name: call.function?.name || '', // Ensure name is string
                    arguments:
                        typeof call.function?.arguments === "string"
                            ? call.function.arguments
                            : JSON.stringify(call.function?.arguments ?? {}),
                },
            })),
        };
    }

    // 图片增量
    const deltaAny = delta as any;
    if (Array.isArray(deltaAny.images) && deltaAny.images.length > 0) {
        next = {
            ...next,
            contentBuffer: [...next.contentBuffer, ...deltaAny.images],
        };
        hasNewVisibleContent = true;
    }

    // 文本增量：模型可能把思考过程直接包在 \u003cthink\u003e 标签里返回（如 MiniMax M3）
    const contentChunk = delta.content || "";
    if (contentChunk) {
        // Strip Qwen3-style tool-call text markers from visible content.
        const { cleanedContent, state: tcState } =
            processContentChunkWithToolCallStripping(
                contentChunk,
                next.toolCallTextState,
                (name, arguments_) => {
                    next.accumulatedToolCalls = accumulateToolCallChunks(
                        next.accumulatedToolCalls ?? [],
                        [{ index: next.accumulatedToolCalls.length, type: "function", function: { name, arguments: arguments_ } }] as any,
                    );
                },
            );
        next.toolCallTextState = tcState;
        if (!cleanedContent) return { state: next, hasNewVisibleContent };
        const parsed = processThinkChunk(cleanedContent, next.thinkState);
        next.thinkState = parsed.state;
        if (parsed.reasoning) {
            next.reasoningBuffer = (next.reasoningBuffer || "") + parsed.reasoning;
        }
        if (parsed.content) {
            next = {
                ...next,
                contentBuffer: appendTextChunk(next.contentBuffer, parsed.content),
            };
            hasNewVisibleContent = true;
        }
    }

    return { state: next, hasNewVisibleContent };
}

/**
 * 如果有新可见内容，则派发一次 messageStreaming 更新前端
 */
function emitStreamingUpdate(
    hasNewVisibleContent: boolean,
    state: StreamState,
    ctx: {
        dispatch: any;
        agentConfig: any;
        messageId: string;
        msgKey: string;
        dialogId: string;
    }
) {
    if (!hasNewVisibleContent) return;

    ctx.dispatch(
        messageStreaming({
            id: ctx.messageId,
            dialogId: ctx.dialogId,
            dbKey: ctx.msgKey,
            content: state.contentBuffer,
            thinkContent: state.reasoningBuffer,
            role: "assistant",
            cybotKey: ctx.agentConfig.dbKey,
        })
    );
}

/**
 * 防护 A：对流结束时累积的 tool_calls 做 arguments JSON 校验。
 * 详见 ./toolCallArgumentGuard.ts 与 web 版同名函数的说明。
 */
function validateAndPartitionToolCalls(state: StreamState): {
    validCalls: any[];
    invalidCalls: any[];
} {
    const validCalls: any[] = [];
    const invalidCalls: any[] = [];

    for (const call of state.accumulatedToolCalls) {
        if (!call) continue;
        const argsValid = parseToolCallArguments(call?.function?.arguments).valid;
        if (argsValid) {
            validCalls.push(call);
        } else {
            const sanitized = {
                ...call,
                function: {
                    ...(call.function ?? {}),
                    name: call?.function?.name ?? "",
                    arguments: INVALID_TOOL_ARGS_REPLACEMENT,
                },
            };
            invalidCalls.push(sanitized);
        }
    }

    return { validCalls, invalidCalls };
}

function syncAssistantToolCallsAfterSanitize(
    state: StreamState,
    invalidCalls: any[]
): any[] {
    if (!invalidCalls.length) return state.assistantToolCalls ?? [];
    const invalidById = new Map<string, any>();
    for (const call of invalidCalls) {
        if (call?.id) invalidById.set(call.id, call);
    }
    const base = Array.isArray(state.assistantToolCalls)
        ? state.assistantToolCalls
        : state.accumulatedToolCalls.map((call: any) => ({
            id: call.id,
            type: "function",
            function: {
                name: call.function?.name,
                arguments:
                    typeof call.function?.arguments === "string"
                        ? call.function.arguments
                        : JSON.stringify(call.function?.arguments ?? {}),
            },
        }));

    return base.map((call: any) => {
        if (!call?.id) return call;
        const invalid = invalidById.get(call.id);
        if (!invalid) return call;
        return {
            ...call,
            type: "function",
            function: {
                name: invalid.function?.name ?? call.function?.name ?? "",
                arguments: INVALID_TOOL_ARGS_REPLACEMENT,
            },
        };
    });
}

async function persistInvalidToolCallResults(
    invalidCalls: any[],
    ctx: ToolCallsContext,
    startIndex: number
): Promise<void> {
    for (let i = 0; i < invalidCalls.length; i++) {
        const call = invalidCalls[i];
        const callId =
            call?.id || `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const toolIndex = startIndex + i;
        const runningToolMessageId = `${ctx.messageId}-t${String(toolIndex).padStart(3, "0")}`;
        const runningToolDbKey = dialogMessageKey(ctx.dialogId, runningToolMessageId);
        const toolName = call?.function?.name || "unknown";
        const selfHealContent = buildInvalidToolCallSelfHealResult(callId, toolName);

        const toolMessage: Message = {
            id: runningToolMessageId,
            dbKey: runningToolDbKey,
            role: "tool",
            content: selfHealContent,
            toolCallId: callId,
            thinkContent: "",
            cybotKey: ctx.agentConfig.dbKey,
            isStreaming: false,
            toolName,
            parentMessageId: ctx.messageId,
            toolPayload: {
                toolName,
                status: "failed",
                input: {},
                rawToolCall: call,
                error: {
                    type: "InvalidToolCallArguments",
                    message:
                        "工具参数 JSON 被截断或非法，已跳过执行并替换为占位 arguments。",
                    retryable: true,
                },
                summary: `❌ ${toolName} 参数被截断，已跳过`,
            },
        } as any;

        ctx.dispatch(addToolMessage(toolMessage as any));
        const { controller: _c, ...messageToWrite } = toolMessage as any;
        await ctx.dispatch(
            write({
                data: { ...messageToWrite, type: DataType.MSG },
                customKey: runningToolDbKey,
            })
        );
    }
}

/**
 * 处理已经累积好的 tool_calls
 */
async function processAccumulatedToolCalls(
    state: StreamState,
    ctx: ToolCallsContext
): Promise<{
    state: StreamState;
    hasHandedOff: boolean;
    hasPendingInteraction: boolean;
}> {
    if (!state.accumulatedToolCalls.length) {
        return {
            state,
            hasHandedOff: false,
            hasPendingInteraction: false,
        };
    }

    // 防护 A：流结束校验 arguments，分离合法 / 非法 call。
    const { validCalls, invalidCalls } = validateAndPartitionToolCalls(state);
    const sanitizedAssistantToolCalls = syncAssistantToolCallsAfterSanitize(
        state,
        invalidCalls
    );

    if (invalidCalls.length > 0) {
        await persistInvalidToolCallResults(invalidCalls, ctx, validCalls.length);
    }

    if (!validCalls.length) {
        const nextState: StreamState = {
            ...state,
            accumulatedToolCalls: [],
            assistantToolCalls: sanitizedAssistantToolCalls,
            hasProcessedToolCalls: true,
            hasHandedOff: false,
        };
        return {
            state: nextState,
            hasHandedOff: false,
            hasPendingInteraction: false,
        };
    }

    const result = await ctx
        .dispatch(
            handleToolCalls({
                accumulatedCalls: validCalls,
                currentContentBuffer: state.contentBuffer,
                agentConfig: ctx.agentConfig,
                messageId: ctx.messageId,
                dialogId: ctx.dialogId,
                dialogKey: ctx.dialogKey,
            })
        )
        .unwrap();

    const nextState: StreamState = {
        ...state,
        contentBuffer: result.finalContentBuffer,
        accumulatedToolCalls: [],
        assistantToolCalls: sanitizedAssistantToolCalls,
        hasProcessedToolCalls: true,
        hasHandedOff: result.hasHandedOff,
    };

    return {
        state: nextState,
        hasHandedOff: result.hasHandedOff,
        hasPendingInteraction: result.hasPendingInteraction,
    };
}

/**
 * 处理「流结束」场景（done === true）
 */
async function handleStreamCompletion(
    state: StreamState,
    ctx: StreamCompletionContext,
    finalizeCtx: FinalizeContext
): Promise<{
    state: StreamState;
    hasHandedOff: boolean;
    hasPendingInteraction: boolean;
}> {
    let hasHandedOff = false;
    let hasPendingInteraction = false;

    // Flush any buffered think-tag bytes so the final message is complete.
    const { residualContent, state: tcFlushState } = flushToolCallTextParserIntoCallback(
        state.toolCallTextState,
        (name, arguments_) => {
            state.accumulatedToolCalls = accumulateToolCallChunks(
                state.accumulatedToolCalls ?? [],
                [{ index: state.accumulatedToolCalls.length, type: "function", function: { name, arguments: arguments_ } }] as any,
            );
        },
    );
    state.toolCallTextState = tcFlushState;
    const flushed = flushThinkParser(state.thinkState);
    state.thinkState = flushed.state;
    if (flushed.reasoning) {
        state.reasoningBuffer = (state.reasoningBuffer || "") + flushed.reasoning;
    }
    const combinedFlushContent = residualContent + (flushed.content ?? "");
    if (combinedFlushContent) {
        state = {
            ...state,
            contentBuffer: appendTextChunk(state.contentBuffer, combinedFlushContent),
        };
    }
    if (!state.hasProcessedToolCalls && state.accumulatedToolCalls.length > 0) {
        const toolResult = await processAccumulatedToolCalls(state, {
            dispatch: ctx.dispatch,
            agentConfig: ctx.agentConfig,
            dialogId: ctx.dialogId,
            dialogKey: ctx.dialogKey,
            messageId: ctx.messageId,
        });

        let next = toolResult.state;
        hasHandedOff ||= toolResult.hasHandedOff;
        hasPendingInteraction ||= toolResult.hasPendingInteraction;

        next = await finalizeStream(next, finalizeCtx);
        return { state: next, hasHandedOff, hasPendingInteraction };
    }

    // 上游偶发返回 200 + 空流(无 delta、无 tool call):写入明确错误文案,
    // 避免把空消息按正常完成落库(与 web 版 markEmptyCompletionAsError 对齐)。
    const producedNothing =
        state.contentBuffer.length === 0 &&
        !(state.reasoningBuffer || "").trim() &&
        (state.assistantToolCalls?.length ?? 0) === 0;
    if (producedNothing && !state.hasHandedOff && !state.alreadyFinalized) {
        state = {
            ...state,
            contentBuffer: appendTextChunk(
                state.contentBuffer,
                "[错误: 模型返回了空响应，请重试或切换其他模型]"
            ),
        };
    }

    const finalized = await finalizeStream(state, finalizeCtx);
    return { state: finalized, hasHandedOff, hasPendingInteraction };
}

/**
 * React Native 版主流程：使用 react-native-sse 处理流式 SSE
 */
export const sendOpenAICompletionsRequest = async ({
    bodyData,
    agentConfig,
    thunkApi,
    dialogKey,
    parentMessageId,
    disableToolsForThisRequest = false,
}: {
    bodyData: any;
    agentConfig: any;
    thunkApi: any;
    dialogKey: string;
    parentMessageId?: string;
    disableToolsForThisRequest?: boolean;
}): Promise<CompletionMeta> => {
    const getStreamErrorMessage = (data: any): string => {
        const message =
            asOptionalTrimmedString(data?.error?.message) ??
            asOptionalTrimmedString(data?.error?.msg) ??
            asOptionalTrimmedString(data?.message);
        if (message) return message;

        const code =
            asOptionalTrimmedString(data?.error?.code) ??
            asOptionalTrimmedString(data?.code);
        if (code) return code;

        const type = asOptionalTrimmedString(data?.error?.type);
        if (type) return type;

        return "Unknown error";
    };

    const formatStreamErrorMessage = (data: any): string => {
        const rawMessage = getStreamErrorMessage(data);
        if (
            /prohibited|violation|terms\s+of\s+service|content\s+policy|safety/i.test(
                rawMessage
            )
        ) {
            return "当前模型服务商拒绝了这次请求。你可以稍后重试，或切换到其他模型继续。";
        }
        return rawMessage;
    };

    const { dispatch, getState, signal: thunkSignal } = thunkApi;

    const dialogId = extractCustomId(dialogKey);
    const controller = new AbortController();
    thunkSignal.addEventListener("abort", () => controller.abort());
    const signal = controller.signal;

    let messageId: string;
    let msgKey: string;

    if (parentMessageId) {
        messageId = parentMessageId;
        msgKey = `msg:${dialogId}:${messageId}`;
    } else {
        const newIds = createDialogMessageKeyAndId(dialogId);
        messageId = newIds.messageId;
        msgKey = newIds.key;
    }

    dispatch(addActiveController({ messageId, controller, dialogKey }));


    const requestBody = buildRequestBodyWithTools(
        bodyData,
        agentConfig,
        disableToolsForThisRequest
    );

    let streamState: StreamState = createInitialStreamState();
    const parseSSE = createSSEParser();
    let cleanup: (() => void) | undefined;

    const finalizeCtx: FinalizeContext = {
        dispatch,
        msgKey,
        dialogId,
        dialogKey,
        messageId,
        agentConfig,
    };

    let hasHandedOffOverall = false;
    let hasPendingInteractionOverall = false;
    let lastFinishReason: CompletionFinishReason = null;

    const buildMeta = (): CompletionMeta => ({
        hasToolCalls:
            Array.isArray(streamState.assistantToolCalls) &&
            streamState.assistantToolCalls.length > 0,
        hasPendingInteraction: hasPendingInteractionOverall,
        hasHandedOff: hasHandedOffOverall,
        finishReason: lastFinishReason,
        usage: streamState.totalUsage ?? undefined,
    });
    const resetStateForRetry = () => {
        streamState = createInitialStreamState();
        lastFinishReason = null;
    };

    return new Promise<CompletionMeta>((resolve) => {
        // 防止 finishWithMeta 被多次调用（[DONE] + close/error 事件可能重复触发）
        let resolved = false;

        const finishWithMeta = async () => {
            if (resolved) {

                return;
            }
            resolved = true;

            dispatch(removeActiveController({ messageId, dialogKey }));
            cleanup?.();
            resolve(buildMeta());
        };

        if (!parentMessageId) {
            dispatch(
                messageStreaming({
                    id: messageId,
                    dialogId,
                    dbKey: msgKey,
                    content: "",
                    role: "assistant",
                    cybotKey: agentConfig.dbKey,
                    isStreaming: true,
                })
            );
        }

        const api = getApiEndpoint(agentConfig);
        const token = selectIdentityToken(getState() as RootState) ?? "";
        const handleAttemptFailure = async (error: any) => {
            let errorText: string;
            if (isAbortError(error)) {
                errorText = "\n[用户中断]";
            } else {
                errorText = `\n[错误: ${toErrorMessage(error)}]`;
            }

            console.error("[SSE Native] sendOpenAICompletionsRequest error:", error);

            streamState = {
                ...streamState,
                contentBuffer: appendTextChunk(streamState.contentBuffer, errorText),
            };
            streamState = await finalizeStream(streamState, finalizeCtx);
            await finishWithMeta();
        };
        const startAttempt = (attempt: number) => {
            let loggedFirstVisibleDelta = false;
            let retryScheduled = false;
            const canRetryInitialStreamAttempt = () =>
                attempt < MAX_INITIAL_STREAM_RETRIES &&
                !loggedFirstVisibleDelta &&
                !streamState.accumulatedToolCalls.length &&
                !(streamState.assistantToolCalls?.length) &&
                !lastFinishReason;
            const scheduleRetry = async () => {
                if (resolved || retryScheduled) return;
                retryScheduled = true;
                cleanup?.();
                cleanup = undefined;
                resetStateForRetry();
                // 把重试进度写进 streaming 消息，UI 据此展示「自动重试 N/M · Xs」。
                dispatch(
                    messageStreaming({
                        id: messageId,
                        dialogId,
                        dbKey: msgKey,
                        content: "",
                        role: "assistant",
                        cybotKey: agentConfig.dbKey,
                        isStreaming: true,
                        retryProgress: {
                            attempt: attempt + 1,
                            maxAttempts: MAX_INITIAL_STREAM_RETRIES,
                            delayMs: 1_500,
                        },
                    })
                );
                try {
                    await waitForInitialStreamRetry(1_500, signal);
                    if (!resolved) startAttempt(attempt + 1);
                } catch (error: any) {
                    await handleAttemptFailure(error);
                }
            };
            const handleCompletion = async () => {
                if (canRetryInitialStreamAttempt()) {
                    await scheduleRetry();
                    return;
                }
                const completion = await handleStreamCompletion(
                    streamState,
                    {
                        dispatch,
                        dialogId,
                        dialogKey: finalizeCtx.dialogKey,
                        messageId,
                        agentConfig,
                    },
                    finalizeCtx
                );

                streamState = completion.state;
                hasHandedOffOverall ||= completion.hasHandedOff;
                hasPendingInteractionOverall ||= completion.hasPendingInteraction;

                await finishWithMeta();
            };

            try {
                cleanup = performSSEFetchRequest({
                    agentConfig,
                    api,
                    bodyData: requestBody,
                    currentServer: selectCurrentServer(getState() as RootState),
                    signal,
                    token,
                    dialogId,
                    onChunk: (chunk: string) => {
                        const parsedResults = parseSSE(chunk);

                        for (const parsedData of parsedResults) {
                            const dataList = Array.isArray(parsedData) ? parsedData : [parsedData];

                            for (const data of dataList) {
                                streamState = applyUsage(streamState, data);

                                if (data === "[DONE]") {
                                    cleanup?.();
                                    void handleCompletion();
                                    return;
                                }

                                if (data.error) {
                                    const errorMsg = `Error: ${formatStreamErrorMessage(data)}`;
                                    if (
                                        canRetryInitialStreamAttempt() &&
                                        isRetryableInitialStreamError(new Error(errorMsg))
                                    ) {
                                        void scheduleRetry();
                                        return;
                                    }
                                    streamState = {
                                        ...streamState,
                                        contentBuffer: appendTextChunk(
                                            streamState.contentBuffer,
                                            `\n[API Error] ${errorMsg}`
                                        ),
                                    };
                                    finalizeStream(streamState, finalizeCtx).then(() => {
                                        finishWithMeta();
                                    });
                                    return;
                                }

                                const choice = data.choices?.[0];
                                if (!choice) continue;

                                const delta = choice.delta || {};

                                const { state: updatedState, hasNewVisibleContent } = applyDelta(
                                    streamState,
                                    delta
                                );
                                streamState = updatedState;
                                if (hasNewVisibleContent) {
                                    loggedFirstVisibleDelta = true;
                                }

                                emitStreamingUpdate(hasNewVisibleContent, streamState, {
                                    dispatch,
                                    agentConfig,
                                    messageId,
                                    msgKey,
                                    dialogId,
                                });

                                const finishReason = choice.finish_reason as CompletionFinishReason | "error" | "length" | "content_filter";
                                if (finishReason) {
                                    lastFinishReason = finishReason === "error" ? null : finishReason;
                                    streamState.finishReason = finishReason === "error" ? null : finishReason as CompletionFinishReason;

                                    if (finishReason === "tool_calls") {
                                        processAccumulatedToolCalls(streamState, {
                                            dispatch,
                                            agentConfig,
                                            dialogId,
                                            dialogKey,
                                            messageId,
                                        }).then((toolResult) => {
                                            streamState = toolResult.state;
                                            hasHandedOffOverall ||= toolResult.hasHandedOff;
                                            hasPendingInteractionOverall ||= toolResult.hasPendingInteraction;

                                            finalizeStream(streamState, finalizeCtx).then((finalized) => {
                                                streamState = finalized;
                                            });
                                        });
                                    } else if (finishReason !== "stop") {
                                        const finishErrorMessage =
                                            finishReason === "error"
                                                ? getChoiceFinishErrorMessage(data, choice)
                                                : null;
                                        streamState = {
                                            ...streamState,
                                            contentBuffer: appendTextChunk(
                                                streamState.contentBuffer,
                                                finishErrorMessage
                                                    ? `\n[API Error] Error: ${finishErrorMessage}`
                                                    : finishReason === "error"
                                                        ? "\n[API Error] Error: 模型响应以 error 结束，但上游未返回具体错误。请重试，或切换到其他支持图片输入的模型。"
                                                        : `\n[流结束原因: ${finishReason}]`
                                            ),
                                        };
                                    }
                                }
                            }
                        }
                    },
                    onError: async (error: Error) => {
                        if (error?.message?.includes('[DONE]')) {
                            await handleCompletion();
                            return;
                        }

                        if (
                            canRetryInitialStreamAttempt() &&
                            isRetryableInitialStreamError(error)
                        ) {
                            await scheduleRetry();
                            return;
                        }

                        await handleAttemptFailure(error);
                    },
                    onComplete: handleCompletion,
                });
            } catch (error: any) {
                if (
                    canRetryInitialStreamAttempt() &&
                    isRetryableInitialStreamError(error)
                ) {
                    void scheduleRetry();
                    return;
                }
                void handleAttemptFailure(error);
            }
        };

        startAttempt(0);
    });
};
