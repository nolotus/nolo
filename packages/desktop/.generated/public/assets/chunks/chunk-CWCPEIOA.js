import {
  supportsImageGeneration
} from "/public/assets/chunks/chunk-M5DXP5RW.js";
import {
  performFetchRequest
} from "/public/assets/chunks/chunk-KF3GADC7.js";
import {
  createSSEParser,
  createToolRunId,
  findToolExecutor,
  getToolResultErrorData,
  i18n_default,
  toolDefinitionsByName,
  toolRegistry,
  toolRunFailed,
  toolRunSetPending,
  toolRunStarted,
  toolRunSucceeded
} from "/public/assets/chunks/chunk-CJFHNPRU.js";
import {
  canonicalizeToolNames
} from "/public/assets/chunks/chunk-LWXWW4DE.js";
import {
  addToolMessage,
  createAsyncThunk,
  createDialogMessageKeyAndId,
  dialogMessageKey,
  getModelInfo,
  isAbortError,
  messageStreamEnd,
  messageStreaming,
  selectCurrentServer,
  selectCurrentSpaceId,
  selectIdentityToken,
  streamAgentChatTurn,
  updateToolMessage,
  write
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  addActiveController,
  extractCustomId,
  removeActiveController,
  tokenUsageLiveUpdate
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import {
  getApiEndpoint
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import {
  isNoloHostedProvider
} from "/public/assets/chunks/chunk-XDKHKMJ3.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";

// packages/core/clipHeadAndTail.browser.stub.ts
var encoder = new TextEncoder();
var decoder = new TextDecoder("utf-8", { fatal: false });
function clipHeadAndTail(rawContent, options = {}) {
  const maxHeadBytes = options.maxHeadBytes ?? 1e3;
  const maxTailBytes = options.maxTailBytes ?? 2500;
  const maxTotalBytes = options.maxTotalBytes ?? 4e3;
  const bytes = encoder.encode(rawContent);
  const originalBytes = bytes.length;
  if (originalBytes <= maxTotalBytes) {
    return { content: rawContent, clipped: false, originalBytes };
  }
  let headEnd = Math.min(maxHeadBytes, bytes.length);
  while (headEnd > 0 && (bytes[headEnd] & 192) === 128) {
    headEnd--;
  }
  let tailStart = Math.max(0, bytes.length - maxTailBytes);
  while (tailStart < bytes.length && (bytes[tailStart] & 192) === 128) {
    tailStart++;
  }
  if (tailStart < headEnd) {
    tailStart = headEnd;
  }
  const headStr = decoder.decode(bytes.subarray(0, headEnd));
  const tailStr = decoder.decode(bytes.subarray(tailStart));
  const elidedBytes = Math.max(0, originalBytes - headEnd - (bytes.length - tailStart));
  const notice = `

[... truncated ${elidedBytes} bytes.]

`;
  return {
    content: `${headStr}${notice}${tailStr}`,
    clipped: true,
    // 浏览器侧无临时落盘能力，也不需要（调用方只用 content）。
    logPath: void 0,
    originalBytes
  };
}

// packages/integrations/openai/filterAndCleanMessages.ts
var isValidMessagePart = (part) => {
  if (!part || typeof part !== "object") return false;
  if (part.type === "text") return typeof part.text === "string";
  if (part.type === "image_url") {
    const img = part.image_url;
    return img && typeof img === "object" && typeof img.url === "string" && img.url.length > 0;
  }
  return false;
};
var extractContent = (msg) => {
  if (msg.role === "tool") {
    const llmContext = asTrimmedString(msg.toolPayload?.llmContext);
    if (llmContext) return clipHeadAndTail(llmContext, { toolCallId: extractToolCallId(msg) ?? void 0 }).content;
    const summary = asTrimmedString(msg.toolPayload?.summary);
    if (summary) return clipHeadAndTail(summary, { toolCallId: extractToolCallId(msg) ?? void 0 }).content;
    if (typeof msg.content === "string") return clipHeadAndTail(msg.content, { toolCallId: extractToolCallId(msg) ?? void 0 }).content;
    if (msg.content != null) return clipHeadAndTail(JSON.stringify(msg.content), { toolCallId: extractToolCallId(msg) ?? void 0 }).content;
    return null;
  }
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    const parts = msg.content.filter(isValidMessagePart);
    return parts.length > 0 ? parts : null;
  }
  if (msg.content && typeof msg.content === "object" && isValidMessagePart(msg.content)) {
    return [msg.content];
  }
  return null;
};
var extractToolCalls = (msg) => {
  const calls = msg.tool_calls ?? msg.toolCalls;
  return Array.isArray(calls) && calls.length > 0 ? calls : void 0;
};
var extractToolCallId = (msg) => msg.tool_call_id ?? msg.toolCallId ?? msg.toolPayload?.rawToolCall?.id;
var extractName = (msg) => {
  if (typeof msg.name === "string") return msg.name;
  if (typeof msg.toolName === "string") return msg.toolName;
  if (typeof msg.toolPayload?.toolName === "string") return msg.toolPayload.toolName;
  return void 0;
};
var getToolName = (msg) => msg?.toolName ?? msg?.toolPayload?.toolName;
var isHandoffToolMessage = (msg) => {
  const toolName = getToolName(msg);
  return toolName === "runStreamingAgent";
};
var getToolMessageCallId = (msg) => msg?.tool_call_id ?? msg?.toolCallId ?? msg?.toolPayload?.rawToolCall?.id;
var collectHandoffToolCallIds = (msgs) => {
  const ids = /* @__PURE__ */ new Set();
  for (const msg of msgs) {
    if (msg?.role !== "tool" || !isHandoffToolMessage(msg)) continue;
    const id = getToolMessageCallId(msg);
    if (id) ids.add(id);
  }
  return ids;
};
var stripHandoffToolMessage = (msg) => msg?.role === "tool" && isHandoffToolMessage(msg) ? null : msg;
var removeToolCallsById = (calls, ids) => calls?.filter((call) => !ids.has(call.id));
var stripHandoffToolCallsFromAssistant = (msg, handoffIds) => {
  if (msg?.role !== "assistant") return msg;
  const calls = msg.tool_calls ?? msg.toolCalls;
  if (!calls?.some((call) => handoffIds.has(call.id))) return msg;
  const kept = removeToolCallsById(calls, handoffIds);
  return {
    ...msg,
    tool_calls: kept?.length ? kept : void 0,
    toolCalls: kept?.length ? kept : void 0
  };
};
var stripHandoffToolMessages = (msgs) => {
  const handoffIds = collectHandoffToolCallIds(msgs);
  if (handoffIds.size === 0) return msgs;
  const out = [];
  for (const raw of msgs) {
    const stripped = stripHandoffToolMessage(raw);
    if (!stripped) continue;
    out.push(stripHandoffToolCallsFromAssistant(stripped, handoffIds));
  }
  return out;
};
var toOpenAIMessage = (rawMsg) => {
  const msg = rawMsg;
  const { role, id } = msg;
  if (!role || !["system", "user", "assistant", "tool"].includes(role)) return null;
  const toolCalls = extractToolCalls(msg);
  let content = extractContent(msg);
  if (content === null) {
    if (role === "assistant" && toolCalls) content = "";
    else return null;
  }
  const cleaned = { role, content };
  if (id) cleaned.id = id;
  const name = extractName(msg);
  if (name) cleaned.name = name;
  if (role === "assistant" && toolCalls) {
    cleaned.tool_calls = toolCalls;
  }
  if (role === "assistant") {
    const reasoningContent = typeof msg.reasoning_content === "string" ? msg.reasoning_content : typeof msg.thinkContent === "string" ? msg.thinkContent : "";
    if (reasoningContent) cleaned.reasoning_content = reasoningContent;
  }
  if (role === "tool") {
    const toolCallId = extractToolCallId(msg);
    if (toolCallId) cleaned.tool_call_id = toolCallId;
    if (!cleaned.tool_call_id) {
      console.warn("[filterAndCleanMessages] \u4E22\u5F03\u65E0\u6548 tool \u6D88\u606F\uFF1A\u7F3A\u5C11 tool_call_id", msg);
      return null;
    }
  }
  return cleaned;
};
var removeOrphanedToolPairs = (msgs) => {
  const dropIndexes = /* @__PURE__ */ new Set();
  const toolToAssistant = /* @__PURE__ */ new Map();
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].role !== "tool") continue;
    for (let j = i - 1; j >= 0; j--) {
      if (msgs[j].role === "assistant") {
        toolToAssistant.set(i, j);
        break;
      }
    }
  }
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].role === "tool" && !toolToAssistant.has(i)) {
      dropIndexes.add(i);
      console.warn("[filterAndCleanMessages] \u4E22\u5F03\u5B64\u7ACB tool \u6D88\u606F\uFF1A\u7F3A\u5C11\u524D\u7F6E assistant", msgs[i].tool_call_id);
    }
  }
  for (const [toolIdx, assistantIdx] of toolToAssistant) {
    const toolMsg = msgs[toolIdx];
    if (!toolMsg.tool_call_id) continue;
    const knownIds = new Set((msgs[assistantIdx].tool_calls ?? []).map((tc) => tc.id));
    if (!knownIds.has(toolMsg.tool_call_id)) {
      dropIndexes.add(toolIdx);
      console.warn("[filterAndCleanMessages] \u4E22\u5F03\u5B64\u7ACB tool \u6D88\u606F:", toolMsg.tool_call_id);
    }
  }
  for (const assistantIdx of new Set(toolToAssistant.values())) {
    if (dropIndexes.has(assistantIdx)) continue;
    const stub = msgs[assistantIdx];
    const content = typeof stub.content === "string" ? stub.content.trim() : stub.content;
    const isEmpty = content === "" || Array.isArray(content) && content.length === 0;
    if (!isEmpty) continue;
    const allToolsDropped = (stub.tool_calls ?? []).every((tc) => {
      return msgs.every(
        (m, idx) => m.role !== "tool" || m.tool_call_id !== tc.id || dropIndexes.has(idx)
      );
    });
    if (allToolsDropped) {
      dropIndexes.add(assistantIdx);
      console.warn("[filterAndCleanMessages] \u4E00\u5E76\u4E22\u5F03\u5B64\u7ACB assistant stub\uFF08index:", assistantIdx, ")");
    }
  }
  if (dropIndexes.size === 0) return msgs;
  return msgs.filter((_, idx) => !dropIndexes.has(idx));
};
var filterAndCleanMessages = (msgs) => {
  if (!Array.isArray(msgs)) return [];
  const flat = msgs.flat();
  const preprocessed = stripHandoffToolMessages(flat);
  const cleaned = preprocessed.map(toOpenAIMessage).filter((m) => m !== null);
  return removeOrphanedToolPairs(cleaned);
};

// packages/chat/messages/persistToolMessage.ts
async function persistToolMessage(dispatch, message, options = {}) {
  const id = asOptionalTrimmedString(message?.id);
  const dbKey = asOptionalTrimmedString(message?.dbKey);
  if (!id || !dbKey) {
    const err = new Error(
      `[persistToolMessage] missing id/dbKey (id=${String(id)} dbKey=${String(dbKey)})`
    );
    if (options.soft) {
      console.error(err.message);
      return;
    }
    throw err;
  }
  const { controller: _controller, ...rest } = message;
  const isStreaming = options.isStreaming !== void 0 ? options.isStreaming : Boolean(rest.isStreaming);
  try {
    const writeRequest = dispatch(
      write({
        data: {
          ...rest,
          id,
          dbKey,
          role: "tool",
          isStreaming,
          type: "msg" /* MSG */
        },
        customKey: dbKey
      })
    );
    if (writeRequest && typeof writeRequest.unwrap === "function") {
      await writeRequest.unwrap();
      return;
    }
    await writeRequest;
  } catch (error) {
    console.error("[persistToolMessage] write failed", { id, dbKey, error });
    if (!options.soft) throw error;
  }
}
async function persistToolMessages(dispatch, messages, options = {}) {
  for (const message of messages) {
    await persistToolMessage(dispatch, message, options);
  }
}

// packages/ai/chat/updateTotalUsage.ts
function updateTotalUsage(currentUsage, newUsageChunk) {
  if (!newUsageChunk) {
    return currentUsage;
  }
  if (!currentUsage) {
    return {
      completion_tokens: 0,
      prompt_tokens: 0,
      total_tokens: 0,
      ...newUsageChunk
    };
  }
  const updatedUsage = { ...currentUsage };
  if (newUsageChunk.completion_tokens !== void 0) updatedUsage.completion_tokens = newUsageChunk.completion_tokens;
  if (newUsageChunk.prompt_tokens !== void 0) updatedUsage.prompt_tokens = newUsageChunk.prompt_tokens;
  if (newUsageChunk.total_tokens !== void 0) updatedUsage.total_tokens = newUsageChunk.total_tokens;
  if (newUsageChunk.prompt_tokens_details) {
    updatedUsage.prompt_tokens_details = {
      ...updatedUsage.prompt_tokens_details || {},
      ...newUsageChunk.prompt_tokens_details
    };
  }
  if (newUsageChunk.completion_tokens_details) {
    updatedUsage.completion_tokens_details = {
      ...updatedUsage.completion_tokens_details || {},
      ...newUsageChunk.completion_tokens_details
    };
  }
  if (typeof newUsageChunk.cost === "number") {
    updatedUsage.cost = newUsageChunk.cost;
  }
  if (newUsageChunk.cost_details) {
    updatedUsage.cost_details = {
      ...updatedUsage.cost_details || {},
      ...newUsageChunk.cost_details
    };
  }
  const billingProvider = asOptionalTrimmedString(newUsageChunk.billing_provider);
  if (billingProvider) {
    updatedUsage.billing_provider = billingProvider;
  }
  const billingModel = asOptionalTrimmedString(newUsageChunk.billing_model);
  if (billingModel) {
    updatedUsage.billing_model = billingModel;
  }
  return updatedUsage;
}

// packages/chat/messages/toolThunks.ts
var TOOL_ARGS_SENTINELS = [
  "<|tool_calls_section_end|>",
  "<|tool_calls_end|>",
  "<|endofjson|>"
];
function cleanToolArguments(argStr) {
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
var defaultSummary = (toolName, status) => {
  if (status === "pending") return `\u23F8\uFE0F ${toolName} \u7B49\u5F85\u786E\u8BA4/\u6388\u6743`;
  if (status === "running") return `\u23F3 ${toolName} \u6267\u884C\u4E2D\u2026`;
  if (status === "failed") return `\u274C ${toolName} \u6267\u884C\u5931\u8D25`;
  return `\u2705 ${toolName} \u6267\u884C\u5B8C\u6210`;
};
var processToolData = createAsyncThunk(
  "message/processToolData",
  async (args, thunkApi) => {
    const { toolCall, parentMessageId, toolRunId } = args;
    const { dispatch, rejectWithValue } = thunkApi;
    const func = toolCall.function;
    if (!func || !func.name) {
      throw new Error(
        "Invalid tool call data: missing function or function.name"
      );
    }
    const toolCallId = toolCall.id || `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
    const activity = isRecord(toolArgs) && isRecord(toolArgs._activity) ? toolArgs._activity : void 0;
    const executionToolArgs = isRecord(toolArgs) && Object.prototype.hasOwnProperty.call(toolArgs, "_activity") ? (({ _activity: _ignored, ...rest }) => rest)(toolArgs) : toolArgs;
    const inputSummary = JSON.stringify(executionToolArgs).slice(0, 400);
    toolRunStarted({
      id: toolRunId,
      messageId: parentMessageId,
      toolName: canonicalName,
      behavior,
      inputSummary,
      interaction,
      input: executionToolArgs
    });
    if (interaction === "confirm" || interaction === "authorize") {
      try {
        toolRunSetPending({ id: toolRunId });
        const previewExecutor = def?.previewExecutor;
        const previewResult = previewExecutor ? await previewExecutor(executionToolArgs, thunkApi, { parentMessageId }) : {
          rawData: {
            previewOnly: true,
            toolName: canonicalName,
            interaction
          }
        };
        const rawData = previewResult?.rawData ?? previewResult;
        const summary = typeof previewResult?.displayData === "string" && previewResult.displayData.trim() || (interaction === "authorize" ? `\u{1F510} ${canonicalName} \u9700\u8981\u6388\u6743\u540E\u6267\u884C` : `\u26A0\uFE0F ${canonicalName} \u9700\u8981\u786E\u8BA4\u540E\u6267\u884C`);
        const toolPayload = {
          toolName: canonicalName,
          status: "pending",
          input: executionToolArgs,
          rawToolCall: toolCall,
          toolRunId,
          summary,
          ...activity ? { activity } : {}
        };
        return {
          toolCallId,
          rawResult: rawData,
          summary,
          toolName: canonicalName,
          toolRunId,
          toolPayload,
          hasPendingInteraction: true
          // ✅ 暂停点
        };
      } catch (e) {
        const errorMessage = toErrorMessage(e);
        const structured = getToolResultErrorData(e);
        const rawErrorResult = structured?.rawData !== void 0 ? structured.rawData : { error: errorMessage };
        const summary = asOptionalTrimmedString(structured?.displayData) || `\u274C ${canonicalName} \u9884\u89C8\u5931\u8D25: ${errorMessage}`;
        toolRunFailed({
          id: toolRunId,
          error: errorMessage,
          outputSummary: summary
        });
        const errorPayload = {
          type: e?.name || "Error",
          message: errorMessage,
          code: structured?.code ?? e?.code,
          retryable: structured?.retryable ?? e?.retryable ?? true
        };
        const toolPayload = {
          toolName: canonicalName,
          status: "failed",
          input: executionToolArgs,
          rawToolCall: toolCall,
          error: errorPayload,
          toolRunId,
          summary,
          ...activity ? { activity } : {}
        };
        return rejectWithValue({
          toolCallId,
          rawResult: rawErrorResult,
          summary,
          toolName: canonicalName,
          toolRunId,
          toolPayload,
          hasPendingInteraction: true
        });
      }
    }
    try {
      const toolResult = await found.executor(executionToolArgs, thunkApi, {
        parentMessageId,
        toolRunId
      });
      const rawData = toolResult?.rawData ?? toolResult;
      const llmContext = asOptionalTrimmedString(toolResult?.llmContext);
      const summary = asOptionalTrimmedString(toolResult?.displayData) || defaultSummary(canonicalName, "succeeded");
      toolRunSucceeded({
        id: toolRunId,
        outputSummary: summary
      });
      const toolPayload = {
        toolName: canonicalName,
        status: "succeeded",
        input: executionToolArgs,
        rawToolCall: toolCall,
        toolRunId,
        summary,
        ...llmContext ? { llmContext } : {},
        ...activity ? { activity } : {}
      };
      const isUiAskChoice = canonicalName === "ask_user";
      const blocking = typeof executionToolArgs?.blocking === "boolean" ? executionToolArgs.blocking : true;
      const hasPendingInteraction = isUiAskChoice && blocking === true;
      return {
        toolCallId,
        rawResult: rawData,
        summary,
        toolName: canonicalName,
        toolRunId,
        toolPayload,
        hasPendingInteraction
      };
    } catch (e) {
      const errorMessage = toErrorMessage(e);
      const structured = getToolResultErrorData(e);
      const requiresConfirmation = structured?.code === "self_evolution_requires_confirmation" || structured?.code === "agent_update_requires_confirmation";
      if (requiresConfirmation) {
        const confirmedInput = {
          ...executionToolArgs ?? {},
          __confirmedSelfEvolution: true
        };
        const summary2 = typeof structured?.displayData === "string" && structured.displayData.trim() || `\u26A0\uFE0F ${canonicalName} \u9700\u8981\u786E\u8BA4\u540E\u6267\u884C`;
        toolRunStarted({
          id: toolRunId,
          messageId: parentMessageId,
          toolName: canonicalName,
          behavior,
          inputSummary: JSON.stringify(confirmedInput).slice(0, 400),
          interaction: "confirm",
          input: confirmedInput
        });
        toolRunSetPending({ id: toolRunId });
        const toolPayload2 = {
          toolName: canonicalName,
          status: "pending",
          input: confirmedInput,
          rawToolCall: toolCall,
          toolRunId,
          summary: summary2,
          ...activity ? { activity } : {}
        };
        return {
          toolCallId,
          rawResult: structured?.rawData !== void 0 ? structured.rawData : { error: "self_evolution_requires_confirmation" },
          summary: summary2,
          toolName: canonicalName,
          toolRunId,
          toolPayload: toolPayload2,
          hasPendingInteraction: true
        };
      }
      const rawErrorResult = structured?.rawData !== void 0 ? structured.rawData : { error: errorMessage };
      const summary = asOptionalTrimmedString(structured?.displayData) || `\u274C ${canonicalName} \u6267\u884C\u5931\u8D25: ${errorMessage}`;
      toolRunFailed({
        id: toolRunId,
        error: errorMessage,
        outputSummary: summary
      });
      const errorPayload = {
        type: e?.name || "Error",
        message: errorMessage,
        code: structured?.code ?? e?.code,
        retryable: structured?.retryable ?? e?.retryable ?? true
      };
      const toolPayload = {
        toolName: canonicalName,
        status: "failed",
        input: executionToolArgs,
        rawToolCall: toolCall,
        error: errorPayload,
        toolRunId,
        summary,
        ...activity ? { activity } : {}
      };
      return rejectWithValue({
        toolCallId,
        rawResult: rawErrorResult,
        summary,
        toolName: canonicalName,
        toolRunId,
        toolPayload,
        hasPendingInteraction: false
      });
    }
  }
);
var handleToolCalls = createAsyncThunk(
  "message/handleToolCalls",
  async (args, thunkApi) => {
    const {
      accumulatedCalls,
      currentContentBuffer,
      agentConfig,
      messageId,
      dialogId,
      dialogKey
    } = args;
    const { dispatch } = thunkApi;
    const updatedContentBuffer = [...currentContentBuffer];
    let hasHandedOff = false;
    let hasPendingInteraction = false;
    for (let toolIndex = 0; toolIndex < accumulatedCalls.length; toolIndex++) {
      const toolCall = accumulatedCalls[toolIndex];
      if (!toolCall.function?.name) continue;
      const toolCallId = toolCall.id || `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const toolRunId = createToolRunId();
      const canonicalToolName = findToolExecutor(toolCall.function.name).canonicalName;
      const runningToolMessageId = `${messageId}-t${String(toolIndex).padStart(3, "0")}`;
      const runningToolDbKey = dialogMessageKey(dialogId, runningToolMessageId);
      const runningToolMessage = {
        id: runningToolMessageId,
        dbKey: runningToolDbKey,
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
          summary: defaultSummary(canonicalToolName, "running")
        }
      };
      dispatch(addToolMessage(runningToolMessage));
      await persistToolMessage(dispatch, runningToolMessage, {
        isStreaming: true,
        soft: true
      });
      try {
        const result = await dispatch(
          processToolData({
            toolCall: { ...toolCall, id: toolCallId },
            parentMessageId: messageId,
            toolRunId
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
            toolPayload
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
                toolPayload
              }
            })
          );
          await persistToolMessage(dispatch, completedToolMessage, {
            isStreaming: false,
            soft: true
          });
          if (result.hasPendingInteraction) {
            hasPendingInteraction = true;
          }
          if (toolName === "runStreamingAgent") {
            const raw = result.rawResult ?? {};
            const agentKey = raw.agentKey;
            const userInput = raw.userInput;
            const serverBase = asOptionalTrimmedString(raw.serverBase);
            if (agentKey && userInput) {
              hasHandedOff = true;
              void dispatch(
                streamAgentChatTurn({
                  agentKey,
                  userInput,
                  ...dialogKey ? { dialogKey } : {},
                  ...serverBase ? { serverBase } : {}
                })
              );
            }
          }
        }
      } catch (rejectedValue) {
        console.error(
          "[ToolThunks/handleToolCalls] processToolData rejected:",
          rejectedValue
        );
        if (rejectedValue.toolName) {
          const errorResult = {
            error: true,
            message: rejectedValue.toolPayload?.error?.message || "\u672A\u77E5\u9519\u8BEF"
          };
          const failedToolMessage = {
            ...runningToolMessage,
            content: JSON.stringify(errorResult),
            toolCallId: rejectedValue.toolCallId,
            isStreaming: false,
            toolName: rejectedValue.toolName,
            toolRunId: rejectedValue.toolRunId,
            toolPayload: rejectedValue.toolPayload
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
                toolPayload: rejectedValue.toolPayload
              }
            })
          );
          await persistToolMessage(dispatch, failedToolMessage, {
            isStreaming: false,
            soft: true
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
      hasPendingInteraction
    };
  }
);

// packages/agent-runtime/tagPrefixMatch.ts
function longestTagPrefixLength(buffer, tag) {
  const max = Math.min(buffer.length, tag.length - 1);
  for (let len = max; len > 0; len--) {
    if (tag.startsWith(buffer.slice(-len))) {
      return len;
    }
  }
  return 0;
}

// packages/agent-runtime/thinkTagParser.ts
var OPEN_TAG = "<think>";
var CLOSE_TAG = "</think>";
function createThinkParserState() {
  return { mode: "content", buffer: "", trimNextVisible: false };
}
function processThinkChunk(chunk, state) {
  let visible = "";
  let reasoning = "";
  let { mode, buffer, trimNextVisible } = state;
  buffer += chunk;
  while (true) {
    if (mode === "content") {
      const idx = buffer.indexOf(OPEN_TAG);
      if (idx === -1) {
        const keep = longestTagPrefixLength(buffer, OPEN_TAG);
        visible += buffer.slice(0, buffer.length - keep);
        buffer = buffer.slice(buffer.length - keep);
        break;
      }
      visible += buffer.slice(0, idx);
      buffer = buffer.slice(idx + OPEN_TAG.length);
      mode = "reasoning";
    } else {
      const idx = buffer.indexOf(CLOSE_TAG);
      if (idx === -1) {
        const keep = longestTagPrefixLength(buffer, CLOSE_TAG);
        reasoning += buffer.slice(0, buffer.length - keep);
        buffer = buffer.slice(buffer.length - keep);
        break;
      }
      reasoning += buffer.slice(0, idx);
      buffer = buffer.slice(idx + CLOSE_TAG.length);
      mode = "content";
      trimNextVisible = true;
    }
  }
  if (mode === "content" && visible.length > 0 && trimNextVisible) {
    visible = visible.replace(/^\n/, "");
    trimNextVisible = false;
  }
  return { content: visible, reasoning, state: { mode, buffer, trimNextVisible } };
}
function flushThinkParser(state) {
  const { mode, buffer, trimNextVisible } = state;
  if (mode === "reasoning") {
    return {
      content: "",
      reasoning: buffer,
      state: { mode: "content", buffer: "", trimNextVisible: false }
    };
  }
  let visible = buffer;
  const nextTrim = trimNextVisible;
  if (nextTrim) {
    visible = visible.replace(/^\n/, "");
  }
  return {
    content: visible,
    reasoning: "",
    state: { mode: "content", buffer: "", trimNextVisible: false }
  };
}

// packages/agent-runtime/toolCallTextParser.ts
var OPEN_TAG2 = "<tool_call>";
var CLOSE_TAG2 = "</tool_call>";
function createToolCallTextParserState() {
  return { mode: "content", buffer: "" };
}
function processToolCallTextChunk(chunk, state) {
  let visible = "";
  let toolCallTexts = [];
  let { mode, buffer } = state;
  buffer += chunk;
  while (true) {
    if (mode === "content") {
      const idx = buffer.indexOf(OPEN_TAG2);
      if (idx === -1) {
        const keep = longestTagPrefixLength(buffer, OPEN_TAG2);
        visible += buffer.slice(0, buffer.length - keep);
        buffer = buffer.slice(buffer.length - keep);
        break;
      }
      visible += buffer.slice(0, idx);
      buffer = buffer.slice(idx + OPEN_TAG2.length);
      mode = "toolcall";
    } else {
      const idx = buffer.indexOf(CLOSE_TAG2);
      if (idx === -1) {
        break;
      }
      toolCallTexts.push(buffer.slice(0, idx));
      buffer = buffer.slice(idx + CLOSE_TAG2.length);
      mode = "content";
    }
  }
  return {
    content: visible,
    toolCallTexts,
    state: { mode, buffer }
  };
}
function flushToolCallTextParser(state) {
  const { mode, buffer } = state;
  if (mode === "toolcall") {
    const keep = longestTagPrefixLength(buffer, CLOSE_TAG2);
    const text = buffer.slice(0, buffer.length - keep);
    return {
      content: "",
      toolCallTexts: text ? [text] : [],
      state: { mode: "content", buffer: "" }
    };
  }
  return {
    content: buffer,
    toolCallTexts: [],
    state: { mode: "content", buffer: "" }
  };
}
function tryParseToolCallText(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && typeof parsed.name === "string") {
      return {
        name: parsed.name,
        arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments ?? {})
      };
    }
  } catch {
  }
  return null;
}
function processContentChunkWithToolCallStripping(chunk, state, onToolCall) {
  const stripped = processToolCallTextChunk(chunk, state);
  for (const text of stripped.toolCallTexts) {
    const parsedTc = tryParseToolCallText(text);
    if (parsedTc) {
      onToolCall(parsedTc.name, parsedTc.arguments);
    }
  }
  return { cleanedContent: stripped.content, state: stripped.state };
}
function flushToolCallTextParserIntoCallback(state, onToolCall) {
  const flushed = flushToolCallTextParser(state);
  for (const text of flushed.toolCallTexts) {
    const parsedTc = tryParseToolCallText(text);
    if (parsedTc) {
      onToolCall(parsedTc.name, parsedTc.arguments);
    }
  }
  return { residualContent: flushed.content, state: flushed.state };
}

// packages/ai/agent/toolOutputPolicy.ts
var MAX_IN_TURN_TOOL_CONTENT_CHARS = 4e3;
var FRESH_TOOL_OUTPUT_MAX_CHARS = 32e3;
var DEFAULT_TOOL_OUTPUT_PROFILE = {
  maxChars: MAX_IN_TURN_TOOL_CONTENT_CHARS,
  headRatio: 0.5
};
var TOOL_OUTPUT_PROFILES = {
  readFile: { maxChars: 4800, headRatio: 0.68 },
  read_file: { maxChars: 4800, headRatio: 0.68 },
  readWorkspaceFile: { maxChars: 4800, headRatio: 0.68 },
  searchFiles: { maxChars: 3600, headRatio: 0.78 },
  search_files: { maxChars: 3600, headRatio: 0.78 },
  listFiles: { maxChars: 2800, headRatio: 0.85 },
  globFiles: { maxChars: 2800, headRatio: 0.85 },
  execShell: { maxChars: 4e3, headRatio: 0.35 },
  runCommand: { maxChars: 4e3, headRatio: 0.35 },
  launchProcess: { maxChars: 2800, headRatio: 0.35 },
  editFile: { maxChars: 2800, headRatio: 0.62 },
  writeFile: { maxChars: 2400, headRatio: 0.62 },
  readPastedText: { maxChars: 4800, headRatio: 0.5 }
};
function resolveToolOutputProfile(toolName) {
  return (toolName ? TOOL_OUTPUT_PROFILES[toolName] : void 0) ?? DEFAULT_TOOL_OUTPUT_PROFILE;
}
function projectToolMessageContent(input) {
  const { content, isFresh, toolName, historicalMaxChars } = input;
  if (isFresh) {
    if (content.length <= FRESH_TOOL_OUTPUT_MAX_CHARS) return content;
    return clipToolText(
      content,
      FRESH_TOOL_OUTPUT_MAX_CHARS,
      resolveToolOutputProfile(toolName).headRatio,
      `
\u2026[\u622A\u65AD\uFF0C\u539F\u59CB\u957F\u5EA6 ${content.length} \u5B57\u7B26]`
    );
  }
  if (content.length <= historicalMaxChars) return content;
  return content.slice(0, historicalMaxChars) + `
\u2026[\u622A\u65AD\uFF0C\u539F\u59CB\u957F\u5EA6 ${content.length} \u5B57\u7B26]`;
}
function clipToolText(content, maxChars, headRatio, marker = "\n\n[... tool output middle omitted; head/tail preserved ...]\n\n") {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxChars) return normalized;
  if (maxChars <= marker.length + 2) return normalized.slice(0, maxChars);
  const available = maxChars - marker.length;
  const headChars = Math.max(1, Math.floor(available * headRatio));
  const tailChars = Math.max(1, available - headChars);
  return `${normalized.slice(0, headChars)}${marker}${normalized.slice(-tailChars)}`;
}

// packages/agent-runtime/turnContext.ts
var DEFAULT_RECENT_CONTENT_LIMIT = 10;
var asTrimmed = (value) => typeof value === "string" ? value.trim() : "";
var asFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value : 0;
var spaceRecordKey = (spaceId) => spaceId.startsWith("space-") ? spaceId : `space-${spaceId}`;
var makeLayer = (id, content, cacheScope = "turn") => ({ id, owner: "runtime", cacheScope, content });
var renderSpaceStructure = (spaceRecord, recentLimit) => {
  const categories = spaceRecord.categories ?? {};
  const validCategories = Object.entries(categories).filter((entry) => entry[1] !== null).sort(
    (a, b) => asFiniteNumber(a[1].order) - asFiniteNumber(b[1].order)
  );
  const categoryNameById = /* @__PURE__ */ new Map();
  let struct = "Directory Structure (Categories):\n";
  if (validCategories.length === 0) struct += "(No categories defined)\n";
  validCategories.forEach(([id, category]) => {
    const name = asTrimmed(category.name) || id;
    categoryNameById.set(id, name);
    struct += `- ${name} (ID: ${id})
`;
  });
  const contents = spaceRecord.contents ?? {};
  const recentContents = recentLimit > 0 ? Object.values(contents).filter((content) => content !== null).sort(
    (a, b) => asFiniteNumber(b.updatedAt) - asFiniteNumber(a.updatedAt)
  ).slice(0, recentLimit) : [];
  if (recentContents.length > 0) {
    struct += `
Recent Contents (Top ${recentLimit}):
`;
    recentContents.forEach((content) => {
      const categoryId = asTrimmed(content.categoryId);
      const categoryName = categoryId ? categoryNameById.get(categoryId) || "Unknown" : "Uncategorized";
      struct += `- [${asTrimmed(content.type) || "content"}] ${asTrimmed(content.title)} (Category: ${categoryName}, dbKey: ${asTrimmed(content.contentKey)})
`;
    });
  }
  return struct;
};
var buildSpaceContextLayer = async (args) => {
  const spaceId = asTrimmed(args.spaceId);
  if (!spaceId) return null;
  const recentLimit = args.recentContentLimit ?? DEFAULT_RECENT_CONTENT_LIMIT;
  let spaceRecord = null;
  let readError = null;
  try {
    spaceRecord = await args.source.readRecord(spaceRecordKey(spaceId));
  } catch (error) {
    readError = error instanceof Error ? error.message : String(error);
  }
  if (!spaceRecord) {
    return makeLayer(
      "space-context",
      [
        "--- \u5F53\u524D\u7A7A\u95F4\uFF08Space\uFF09---",
        `\u672C\u5BF9\u8BDD\u8BB0\u5F55\u58F0\u660E\u5C5E\u4E8E Space ${spaceId}\uFF0C\u4F46\u5F53\u524D\u65E0\u6CD5\u8BFB\u53D6\u8BE5 Space \u7684\u6570\u636E${readError ? `\uFF08${readError}\uFF09` : "\uFF08\u8BB0\u5F55\u4E0D\u5B58\u5728\u6216\u4E0D\u53EF\u8FBE\uFF09"}\u3002`,
        "\u5982\u88AB\u95EE\u53CA\uFF0C\u8BF7\u5982\u5B9E\u8BF4\u660E\u300C\u5BF9\u8BDD\u5C5E\u4E8E\u8BE5 Space \u4F46\u6682\u65F6\u8BFB\u4E0D\u5230\u7A7A\u95F4\u8BE6\u60C5\u300D\uFF0C\u4E0D\u8981\u58F0\u79F0\u5BF9\u8BDD\u4E0D\u5C5E\u4E8E\u4EFB\u4F55\u7A7A\u95F4\u3002"
      ].join("\n")
    );
  }
  const name = asTrimmed(spaceRecord.name);
  const description = asTrimmed(spaceRecord.description);
  const structure = renderSpaceStructure(spaceRecord, recentLimit);
  return makeLayer(
    "space-context",
    [
      "--- \u5F53\u524D\u7A7A\u95F4\uFF08Space\uFF09---",
      "\u672C\u5BF9\u8BDD\u5C5E\u4E8E\u4EE5\u4E0B Space\uFF1A",
      `Space Title: ${name || spaceId}`,
      `Space ID: ${spaceId}`,
      `Description: ${description || "N/A"}`,
      "",
      structure.trimEnd()
    ].join("\n")
  );
};
var buildLinkedSpacesSection = async (args) => {
  const ids = (args.linkedSpaceIds ?? []).filter(
    (id) => typeof id === "string" && id.trim() !== ""
  );
  if (ids.length === 0) return null;
  const lines = [];
  for (const rawId of ids) {
    const spaceId = asTrimmed(rawId);
    let spaceData = null;
    try {
      spaceData = await args.source.readRecord(spaceRecordKey(spaceId));
    } catch {
      spaceData = null;
    }
    if (spaceData) {
      const name = asTrimmed(spaceData.name) || spaceId;
      const desc = asTrimmed(spaceData.description);
      lines.push(`- ${name} (ID: ${spaceId})${desc ? `: ${desc}` : ""}`);
    } else {
      lines.push(`- [\u65E0\u6CD5\u8BBF\u95EE] ${spaceId}`);
    }
  }
  if (lines.length === 0) return null;
  return [
    "--- \u5173\u8054\u7A7A\u95F4 (Linked Spaces) ---",
    "\u4EE5\u4E0B\u662F Agent \u53EF\u8BBF\u95EE\u7684\u5176\u4ED6\u5DE5\u4F5C\u7A7A\u95F4\uFF08\u7C97\u7565\u4E0A\u4E0B\u6587\uFF09\uFF1A",
    lines.join("\n"),
    "",
    "\u63D0\u793A\uFF1A\u5982\u9700\u67E5\u8BE2\u8FD9\u4E9B\u7A7A\u95F4\u7684\u8BE6\u7EC6\u5185\u5BB9\uFF0C\u53EF\u4F7F\u7528 read \u5DE5\u5177\u914D\u5408\u5BF9\u5E94\u7684 dbKey\u3002"
  ].join("\n");
};

// packages/agent-runtime/localAutoCompaction.ts
var COLD_RESUME_IDLE_MS = 60 * 60 * 1e3;

// packages/agent-runtime/localLoop.ts
var EMPTY_ASSISTANT_REPAIR_PROMPT = "\u8BF7\u7ED9\u51FA\u660E\u786E\u7684\u6587\u5B57\u56DE\u7B54\u6216\u6267\u884C\u4E0B\u4E00\u6B65\uFF1A\u5982\u679C\u4EFB\u52A1\u5DF2\u5B8C\u6210\uFF0C\u8BF7\u76F4\u63A5\u603B\u7ED3\u7ED3\u679C\uFF1B\u5982\u679C\u9700\u8981\u8C03\u7528\u5DE5\u5177\uFF0C\u8BF7\u76F4\u63A5\u8F93\u51FA tool_calls\u3002\u8BF7\u5207\u52FF\u8FD4\u56DE\u7A7A\u5185\u5BB9\u3002";

// packages/ai/chat/parseApiError.ts
async function parseApiError(response) {
  const errorBody = await response.text();
  const truncateErrorMessage = (message, maxChars = 320) => message.length <= maxChars ? message : `${message.slice(0, maxChars)}\u2026`;
  const isContextOverflow = (message) => /maximum context length|context length|context_length_exceeded|requested about .*tokens|too many tokens/i.test(message);
  let defaultMessage = `\u72B6\u6001\u7801 ${response.status} ${response.statusText}`;
  let errorMessage = defaultMessage;
  let errorCode = `E${response.status}`;
  try {
    const errorJson = JSON.parse(errorBody);
    errorMessage = errorJson?.error?.message || errorJson?.message || errorJson?.msg || errorBody || defaultMessage;
    errorCode = errorJson?.error?.code || errorJson?.code || errorCode;
  } catch (_e) {
    if (errorBody) {
      errorMessage = errorBody;
    }
  }
  switch (response.status) {
    case 400:
      if (isContextOverflow(errorMessage) || isContextOverflow(errorBody) || errorCode === "UPSTREAM_400") {
        return "\u4E0A\u4E0B\u6587\u8FC7\u957F\uFF1A\u672C\u8F6E\u6D88\u606F\u6216\u5DE5\u5177\u7ED3\u679C\u592A\u5927\u3002\u8BF7\u7F29\u5C0F\u8303\u56F4\uFF0C\u6216\u5148\u8BFB\u53D6\u66F4\u5C0F\u7247\u6BB5\u540E\u518D\u7EE7\u7EED\u3002";
      }
      if (errorCode === "MISSING_PROVIDER_API_KEY") {
        return truncateErrorMessage(errorMessage);
      }
      if (errorMessage && errorMessage !== defaultMessage) {
        return `\u8BF7\u6C42\u53C2\u6570\u9519\u8BEF: ${truncateErrorMessage(errorMessage)}`;
      }
      return "\u8BF7\u6C42\u53C2\u6570\u9519\u8BEF\uFF0C\u8BF7\u68C0\u67E5\u8F93\u5165";
    case 413:
      return "\u8BF7\u6C42\u5185\u5BB9\u8FC7\u5927\uFF1A\u8BF7\u51CF\u5C11\u4E00\u6B21\u53D1\u9001\u7684\u6D88\u606F\u3001\u6587\u4EF6\u6216\u5DE5\u5177\u7ED3\u679C\u3002";
    case 401:
      switch (errorCode) {
        case "AUTH_TOKEN_EXPIRED":
          return "\u767B\u5F55\u72B6\u6001\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5148\u767B\u51FA\u540E\u91CD\u65B0\u767B\u5F55";
        case "AUTH_ACCOUNT_INVALID":
          return "\u8D26\u6237\u65E0\u6548\u6216\u5DF2\u88AB\u505C\u7528\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458";
        case "AUTH_NO_TOKEN":
          return "\u672A\u68C0\u6D4B\u5230\u767B\u5F55\u72B6\u6001\uFF0C\u8BF7\u5148\u767B\u5F55";
        case "AUTH_INVALID_TOKEN":
          return "\u767B\u5F55\u51ED\u8BC1\u65E0\u6548\uFF0C\u8BF7\u5148\u767B\u51FA\u540E\u91CD\u65B0\u767B\u5F55";
        case "AUTH_TOKEN_NOT_ACTIVE":
          return "\u4EE4\u724C\u5C1A\u672A\u751F\u6548\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5";
        default:
          return errorMessage && errorMessage !== `\u72B6\u6001\u7801 401 Unauthorized` ? `\u8BA4\u8BC1\u9519\u8BEF: ${truncateErrorMessage(errorMessage)}` : "\u8EAB\u4EFD\u9A8C\u8BC1\u5931\u8D25\uFF0C\u8BF7\u5148\u767B\u51FA\u540E\u91CD\u65B0\u767B\u5F55";
      }
    case 503:
      return errorMessage && errorMessage !== `\u72B6\u6001\u7801 503 Service Unavailable` ? truncateErrorMessage(errorMessage) : "\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5";
    case 504:
      return "\u8BF7\u6C42\u8D85\u65F6\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5";
    default:
      return `API\u8BF7\u6C42\u5931\u8D25: ${truncateErrorMessage(errorMessage)}`;
  }
}

// packages/agent-runtime/toolCallAccumulator.ts
function resolveSlot(accumulator, deltaId, wireIndex) {
  const { slots } = accumulator;
  if (deltaId) {
    const existing = slots.findIndex((slot) => slot.id === deltaId);
    if (existing !== -1) return existing;
  } else if (wireIndex !== void 0) {
    const sameIndex = slots.findLastIndex((slot) => slot.wireIndex === wireIndex);
    if (sameIndex !== -1) return sameIndex;
  } else if (slots.length > 0) {
    return slots.length - 1;
  }
  slots.push({
    id: deltaId,
    type: "function",
    function: { name: "", arguments: "" },
    wireIndex: wireIndex ?? slots.length
  });
  return slots.length - 1;
}
function accumulateToolCallDelta(accumulator, deltas) {
  for (const delta of deltas) {
    const deltaId = typeof delta.id === "string" && delta.id ? delta.id : "";
    const wireIndex = typeof delta.index === "number" ? delta.index : void 0;
    const current = accumulator.slots[resolveSlot(accumulator, deltaId, wireIndex)];
    const fn = delta.function;
    if (fn && typeof fn === "object") {
      const functionDelta = fn;
      if (typeof functionDelta.name === "string" && functionDelta.name) {
        current.function.name += functionDelta.name;
      }
      const argumentsDelta = functionDelta.arguments;
      if (typeof argumentsDelta === "string" && argumentsDelta) {
        const soFar = typeof current.function.arguments === "string" ? current.function.arguments : "";
        current.function.arguments = soFar + argumentsDelta;
      } else if (argumentsDelta && typeof argumentsDelta === "object") {
        current.function.arguments = argumentsDelta;
      }
    }
  }
}

// packages/ai/chat/accumulateToolCallChunks.ts
function accumulateToolCallChunks(currentAccumulatedCalls, toolCallChunks) {
  const accumulator = {
    slots: currentAccumulatedCalls.map(
      (call, position) => ({
        ...call,
        // The accumulator appends into function.arguments, so the nested
        // object has to be copied too or the caller's snapshot moves.
        function: { ...call.function },
        wireIndex: call.index ?? position
      })
    )
  };
  accumulateToolCallDelta(accumulator, toolCallChunks);
  return accumulator.slots.map(({ wireIndex, ...call }) => ({
    ...call,
    index: wireIndex
  }));
}

// packages/ai/chat/toolCallArgumentGuard.ts
var INVALID_TOOL_ARGS_REPLACEMENT = '{"_invalid":true,"_reason":"arguments truncated or malformed"}';
var INVALID_TOOL_ARGS_OUTBOUND_REPLACEMENT = '{"_invalid":true}';
var INVALID_TOOL_RESULT_HINT = "\u5DE5\u5177\u53C2\u6570 JSON \u88AB\u622A\u65AD\uFF08\u5927\u6982\u7387\u8D85\u51FA\u8F93\u51FA\u957F\u5EA6\uFF09\u3002\u4E0D\u8981\u628A\u5B8C\u6574\u6E90\u7801\u585E\u8FDB\u4E00\u6B21\u5DE5\u5177\u8C03\u7528\uFF1A\u5148\u7528 appFileWrite \u5206\u6587\u4EF6\u591A\u6B21\u5199\u5165\uFF0C\u518D\u8C03\u7528\u4E0D\u5E26\u5185\u8054\u5927\u53C2\u6570\u7684 appPreflight/appDeploy\u3002";
var ORPHAN_TOOL_RESULT_PLACEHOLDER = '{"error":"tool call was interrupted"}';
function parseToolCallArguments(args) {
  if (isRecord(args)) {
    return { valid: true, parsed: args };
  }
  if (typeof args !== "string") return { valid: false };
  const trimmed = args.trim();
  if (!trimmed) return { valid: false };
  try {
    const parsed = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      return { valid: false };
    }
    return { valid: true, parsed };
  } catch {
    return { valid: false };
  }
}
function buildInvalidToolCallSelfHealResult(callId, toolName) {
  return JSON.stringify({
    error: true,
    toolCallId: callId,
    ...toolName ? { toolName } : {},
    message: INVALID_TOOL_RESULT_HINT
  });
}
function normalizeToolCallArgumentsInPlace(call, replacement) {
  if (!call || typeof call !== "object") return;
  const fn = call.function;
  if (!fn || typeof fn !== "object") return;
  const { valid } = parseToolCallArguments(fn.arguments);
  if (!valid) {
    fn.arguments = replacement;
  } else if (typeof fn.arguments !== "string") {
    try {
      fn.arguments = JSON.stringify(fn.arguments);
    } catch {
      fn.arguments = replacement;
    }
  }
}
function sanitizeOutboundMessages(messages, opts = {}) {
  if (!Array.isArray(messages) || messages.length === 0) return messages ?? [];
  const argsReplacement = opts.argsReplacement ?? INVALID_TOOL_ARGS_OUTBOUND_REPLACEMENT;
  const orphanReplacement = opts.orphanReplacement ?? ORPHAN_TOOL_RESULT_PLACEHOLDER;
  const cloned = messages.map((msg) => ({ ...msg }));
  const answeredCallIds = /* @__PURE__ */ new Set();
  for (const msg of cloned) {
    if (msg?.role === "tool" && typeof msg.tool_call_id === "string") {
      answeredCallIds.add(msg.tool_call_id);
    }
  }
  const result = [];
  for (const msg of cloned) {
    if (msg?.role === "assistant" && Array.isArray(msg.tool_calls)) {
      msg.tool_calls = msg.tool_calls.map((call) => ({
        ...call,
        function: { ...call?.function ?? {} }
      }));
      for (const call of msg.tool_calls) {
        normalizeToolCallArgumentsInPlace(call, argsReplacement);
      }
      result.push(msg);
      for (const call of msg.tool_calls) {
        const callId = typeof call?.id === "string" ? call.id : void 0;
        if (!callId) continue;
        if (answeredCallIds.has(callId)) continue;
        answeredCallIds.add(callId);
        result.push({
          role: "tool",
          tool_call_id: callId,
          content: orphanReplacement
        });
      }
      continue;
    }
    result.push(msg);
  }
  return result;
}
function sanitizeOutboundResponsesInput(input, opts = {}) {
  if (!Array.isArray(input) || input.length === 0) return input ?? [];
  const argsReplacement = opts.argsReplacement ?? INVALID_TOOL_ARGS_OUTBOUND_REPLACEMENT;
  const orphanReplacement = opts.orphanReplacement ?? ORPHAN_TOOL_RESULT_PLACEHOLDER;
  const answeredCallIds = /* @__PURE__ */ new Set();
  for (const item of input) {
    if (item?.type === "function_call_output" && typeof item.call_id === "string") {
      answeredCallIds.add(item.call_id);
    }
  }
  const result = [];
  for (const item of input) {
    if (item?.type === "function_call") {
      const cloned = { ...item };
      const { valid } = parseToolCallArguments(cloned.arguments);
      if (!valid) {
        cloned.arguments = argsReplacement;
      } else if (typeof cloned.arguments !== "string") {
        try {
          cloned.arguments = JSON.stringify(cloned.arguments);
        } catch {
          cloned.arguments = argsReplacement;
        }
      }
      result.push(cloned);
      const callId = typeof cloned.call_id === "string" ? cloned.call_id : void 0;
      if (callId && !answeredCallIds.has(callId)) {
        answeredCallIds.add(callId);
        result.push({
          type: "function_call_output",
          call_id: callId,
          output: orphanReplacement
        });
      }
      continue;
    }
    result.push(item);
  }
  return result;
}

// packages/ai/tools/toolSchemaCompatibility.ts
var COMPOSITION_KEYS = ["anyOf", "oneOf", "allOf"];
var LIMITED_JSON_SCHEMA_PROVIDERS = /* @__PURE__ */ new Set([
  "fireworks"
]);
var sanitizeSchemaNode = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSchemaNode(item));
  }
  if (!isRecord(value)) {
    return value;
  }
  const next = {};
  for (const [key, child] of Object.entries(value)) {
    if (COMPOSITION_KEYS.includes(key)) {
      continue;
    }
    next[key] = sanitizeSchemaNode(child);
  }
  return next;
};
var shouldSanitizeProviderSchema = (provider) => LIMITED_JSON_SCHEMA_PROVIDERS.has(asTrimmedLowercaseString(provider));
var sanitizeToolForProvider = (tool, provider) => {
  if (!shouldSanitizeProviderSchema(provider)) {
    return tool;
  }
  const parameters = tool?.function?.parameters;
  if (!isRecord(parameters)) {
    return tool;
  }
  return {
    ...tool,
    function: {
      ...tool.function,
      parameters: sanitizeSchemaNode(parameters)
    }
  };
};

// packages/ai/tools/prepareTools.ts
var translatedFunctionCache = /* @__PURE__ */ new Map();
var prepareToolsResultCache = /* @__PURE__ */ new Map();
var PREPARE_TOOLS_CACHE_LIMIT = 128;
var warnedUnknownToolNames = /* @__PURE__ */ new Set();
function getTranslation(keys, defaultVal) {
  for (const key of keys) {
    if (i18n_default.exists(key)) {
      return i18n_default.t(key);
    }
    const aiKey = key.startsWith("ai:") ? key : `ai:${key}`;
    if (i18n_default.exists(aiKey)) {
      return i18n_default.t(aiKey);
    }
  }
  return defaultVal;
}
function translateSchema(schema) {
  if (!schema || typeof schema !== "object") return schema;
  const nextSchema = JSON.parse(JSON.stringify(schema));
  const toolName = nextSchema.name;
  if (!toolName) return nextSchema;
  const walk = (node, path) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.description === "string") {
      const keysToTry = [
        `${path}.description`,
        `${path}.desc`,
        path,
        node.description
      ];
      node.description = getTranslation(keysToTry, node.description);
    }
    if (node.parameters && typeof node.parameters === "object") {
      walk(node.parameters, path);
    }
    if (node.properties && typeof node.properties === "object") {
      for (const [key, child] of Object.entries(node.properties)) {
        const nextPath = path.endsWith(".params") ? `${path}.${key}` : `${path}.params.${key}`;
        walk(child, nextPath);
      }
    }
    if (node.items && typeof node.items === "object") {
      walk(node.items, path);
    }
    const compositions = ["anyOf", "oneOf", "allOf"];
    for (const comp of compositions) {
      if (Array.isArray(node[comp])) {
        node[comp].forEach((child, idx) => {
          const suffix = child.type === "string" ? "stringDesc" : child.type === "object" ? "objectDesc" : `${idx}`;
          walk(child, `${path}.${suffix}`);
        });
      }
    }
  };
  walk(nextSchema, `tools.${toolName}`);
  return nextSchema;
}
function currentI18nLanguage() {
  return typeof i18n_default.language === "string" ? i18n_default.language : "";
}
function translateSchemaCached(schema) {
  if (!schema || typeof schema !== "object") return schema;
  const toolName = typeof schema.name === "string" ? schema.name : "";
  if (!toolName) return translateSchema(schema);
  const cacheKey = `${currentI18nLanguage()}\0${toolName}`;
  const hit = translatedFunctionCache.get(cacheKey);
  if (hit) return hit;
  const translated = translateSchema(schema);
  translatedFunctionCache.set(cacheKey, translated);
  return translated;
}
function buildPrepareToolsCacheKey(toolNames, disabledToolNames, provider) {
  return [
    currentI18nLanguage(),
    provider ?? "",
    disabledToolNames.join(""),
    toolNames.join("")
  ].join("\0");
}
function rememberPrepareToolsResult(key, value) {
  if (prepareToolsResultCache.size >= PREPARE_TOOLS_CACHE_LIMIT) {
    const oldest = prepareToolsResultCache.keys().next().value;
    if (oldest !== void 0) {
      prepareToolsResultCache.delete(oldest);
    }
  }
  prepareToolsResultCache.set(key, value);
}
var prepareTools = (toolNames, options) => {
  const disabledList = canonicalizeToolNames(options?.disabledToolNames ?? []);
  const disabledToolNames = new Set(disabledList);
  const canonicalNames = canonicalizeToolNames(toolNames).filter(
    (toolName) => !disabledToolNames.has(toolName)
  );
  const cacheKey = buildPrepareToolsCacheKey(
    canonicalNames,
    disabledList,
    options?.provider
  );
  const cached = prepareToolsResultCache.get(cacheKey);
  if (cached) {
    return cached.slice();
  }
  const prepared = canonicalNames.map((toolName) => {
    const regTool = toolRegistry[toolName];
    if (!regTool) {
      if (!warnedUnknownToolNames.has(toolName)) {
        warnedUnknownToolNames.add(toolName);
        console.warn(
          `[prepareTools] unknown tool name "${toolName}" ignored (not in toolRegistry); likely stale agent config from a renamed/deprecated tool.`
        );
      }
      return regTool;
    }
    return {
      ...regTool,
      function: translateSchemaCached(regTool.function)
    };
  }).map((tool) => sanitizeToolForProvider(tool, options?.provider)).filter(Boolean);
  rememberPrepareToolsResult(cacheKey, prepared);
  return prepared.slice();
};

// packages/ai/chat/inlineImageUrlsForCustomProvider.ts
var FILE_CONTENT_PATH = "/api/v1/db/file/content/";
var shouldInlineImageUrlsForAgent = (agentConfig) => {
  const apiSource = agentConfig?.apiSource?.toLowerCase();
  const provider = agentConfig?.provider?.toLowerCase();
  const model = agentConfig?.model?.toLowerCase();
  if (apiSource === "custom" || provider === "custom") return true;
  if (isNoloHostedProvider(provider)) return true;
  return provider === "openrouter" && model === "minimax/minimax-m3";
};
var isInlineCandidate = (url) => /^https?:\/\//i.test(url) && url.includes(FILE_CONTENT_PATH);
var bytesToBase64 = (bytes) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};
var defaultFetchImage = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    return {
      ok: false,
      error: `HTTP ${response.status}`
    };
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    ok: true,
    mimeType: response.headers.get("content-type") ?? "application/octet-stream",
    bytes
  };
};
var cloneImagePartWithDataUrl = async (part, fetchImage, isAllowedImageUrl) => {
  const url = part?.image_url?.url;
  if (typeof url !== "string" || !isInlineCandidate(url) || isAllowedImageUrl && !isAllowedImageUrl(url)) {
    return part;
  }
  const result = await fetchImage(url);
  if (!result.ok || !result.bytes) return part;
  const mimeType = result.mimeType || "application/octet-stream";
  return {
    ...part,
    image_url: {
      ...part.image_url,
      url: `data:${mimeType};base64,${bytesToBase64(result.bytes)}`
    }
  };
};
var inlineImageUrlsForCustomProvider = async (bodyData, options) => {
  if (!options.shouldInline) return bodyData;
  const body = bodyData;
  if (!Array.isArray(body?.messages)) return bodyData;
  const fetchImage = options.fetchImage ?? defaultFetchImage;
  let changed = false;
  const messages = [];
  for (const message of body.messages) {
    if (!Array.isArray(message?.content)) {
      messages.push(message);
      continue;
    }
    const content = await Promise.all(
      message.content.map(async (part) => {
        if (part?.type !== "image_url") return part;
        return cloneImagePartWithDataUrl(
          part,
          fetchImage,
          options.isAllowedImageUrl
        );
      })
    );
    let messageChanged = false;
    for (let i = 0; i < content.length; i++) {
      if (content[i] !== message.content[i]) {
        changed = true;
        messageChanged = true;
        break;
      }
    }
    messages.push(messageChanged ? { ...message, content } : message);
  }
  if (!changed) return bodyData;
  return {
    ...body,
    messages
  };
};

// packages/ai/chat/streamReader.ts
function createAbortError(message = "The operation was aborted.") {
  return new DOMException(message, "AbortError");
}
async function readStreamChunk(reader, options) {
  const signal = options?.signal;
  if (signal?.aborted) {
    throw createAbortError();
  }
  const timeoutMs = options?.timeoutMs;
  if (!signal && !(timeoutMs && timeoutMs > 0)) {
    return reader.read();
  }
  let settled = false;
  let timeoutId;
  let onAbort;
  return new Promise((resolve, reject) => {
    const finish = (cb) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (onAbort && signal) signal.removeEventListener("abort", onAbort);
      cb();
    };
    onAbort = () => {
      void reader.cancel().catch(() => {
      });
      finish(() => reject(createAbortError()));
    };
    signal?.addEventListener("abort", onAbort);
    if (timeoutMs && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        finish(
          () => reject(
            new Error(
              options?.timeoutErrorMessage ?? `Stream stalled for ${Math.round(timeoutMs / 1e3)}s`
            )
          )
        );
      }, timeoutMs);
    }
    reader.read().then(
      (result) => finish(() => resolve(result)),
      (err) => finish(() => reject(err))
    );
  });
}

// packages/ai/chat/sendOpenAICompletionsRequest.ts
function appendTextChunk(currentContentBuffer, textChunk) {
  if (!textChunk) return currentContentBuffer;
  const updatedContentBuffer = [...currentContentBuffer];
  const lastIndex = updatedContentBuffer.length - 1;
  if (lastIndex >= 0 && updatedContentBuffer[lastIndex].type === "text") {
    const last = updatedContentBuffer[lastIndex];
    updatedContentBuffer[lastIndex] = {
      ...last,
      text: (last.text || "") + textChunk
    };
  } else {
    updatedContentBuffer.push({ type: "text", text: textChunk });
  }
  return updatedContentBuffer;
}
var EXPLICIT_IMAGE_TOOL_NAMES = /* @__PURE__ */ new Set([
  "openAIGptImage",
  "openAIGptImageGenerate",
  "chatgptWebImageGenerate",
  "openAIGptImageEdit",
  "geminiProImagePreview"
]);
function getStreamErrorMessage(data) {
  const message = asOptionalTrimmedString(data?.error?.message) ?? asOptionalTrimmedString(data?.error?.msg) ?? asOptionalTrimmedString(data?.message);
  if (message) return message;
  const code = asOptionalTrimmedString(data?.error?.code) ?? asOptionalTrimmedString(data?.code);
  if (code) return code;
  const type = asOptionalTrimmedString(data?.error?.type);
  if (type) return type;
  return "Unknown error";
}
function formatStreamErrorMessage(data) {
  const rawMessage = getStreamErrorMessage(data);
  if (/prohibited|violation|terms\s+of\s+service|content\s+policy|safety/i.test(
    rawMessage
  )) {
    return "\u5F53\u524D\u6A21\u578B\u670D\u52A1\u5546\u62D2\u7EDD\u4E86\u8FD9\u6B21\u8BF7\u6C42\u3002\u4F60\u53EF\u4EE5\u7A0D\u540E\u91CD\u8BD5\uFF0C\u6216\u5207\u6362\u5230\u5176\u4ED6\u6A21\u578B\u7EE7\u7EED\u3002";
  }
  return rawMessage;
}
function getChoiceFinishErrorMessage(data, choice) {
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
var withImageGenerationStage = (messageMetadata, stage) => {
  const previousState = messageMetadata?.imageGenerationState;
  if (previousState?.kind !== "image_generation") {
    return messageMetadata;
  }
  return {
    ...messageMetadata ?? {},
    imageGenerationState: {
      ...previousState,
      stage
    }
  };
};
var shouldShowImageSavingState = (contentBuffer) => contentBuffer.some((part) => part?.type === "image_url") && !contentBuffer.some(
  (part) => part?.type === "text" && typeof part.text === "string" && part.text.trim().length > 0
);
var STREAM_READ_TIMEOUT_MS = 45e3;
var logQuickChatPerfStage = (startedAt, stage, details) => {
  if (!startedAt) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info("[QuickChatPerf]", {
    stage,
    elapsedMs: now - startedAt,
    ...typeof performance !== "undefined" ? { atMs: now } : {},
    ...details ?? {}
  });
};
function createInitialStreamState() {
  return {
    contentBuffer: [],
    totalUsage: null,
    accumulatedToolCalls: [],
    reasoningBuffer: "",
    thinkState: createThinkParserState(),
    toolCallTextState: createToolCallTextParserState(),
    assistantToolCalls: void 0,
    hasHandedOff: false,
    hasProcessedToolCalls: false,
    alreadyFinalized: false,
    finishReason: null
  };
}
function buildRequestBodyWithTools(bodyData, agentConfig, disableToolsForThisRequest) {
  const messagesForBody = Array.isArray(bodyData?.messages) ? sanitizeOutboundMessages(bodyData.messages) : bodyData?.messages;
  const baseBody = messagesForBody !== bodyData?.messages ? { ...bodyData, messages: messagesForBody } : bodyData;
  if (disableToolsForThisRequest) return baseBody;
  const modelInfo = getModelInfo(agentConfig.model);
  if (modelInfo?.hasImageOutput) {
    return baseBody;
  }
  const rawTools = agentConfig.tools;
  if (!Array.isArray(rawTools) || rawTools.length === 0) return baseBody;
  const hasExplicitImageTool = rawTools.some(
    (toolName) => typeof toolName === "string" && EXPLICIT_IMAGE_TOOL_NAMES.has(toolName)
  );
  if (supportsImageGeneration(agentConfig) && !hasExplicitImageTool) {
    return baseBody;
  }
  const tools = prepareTools(rawTools, { provider: agentConfig.provider });
  if (!tools.length) return baseBody;
  return {
    ...baseBody,
    tools,
    tool_choice: baseBody.tool_choice ?? "auto"
  };
}
async function finalizeStream(state, ctx) {
  if (state.hasHandedOff || state.alreadyFinalized) return state;
  const savingMetadata = withImageGenerationStage(
    ctx.messageMetadata,
    "saving"
  );
  if (savingMetadata && shouldShowImageSavingState(state.contentBuffer)) {
    ctx.dispatch(
      messageStreaming({
        id: ctx.messageId,
        dialogId: ctx.dialogId,
        dbKey: ctx.msgKey,
        content: "",
        thinkContent: state.reasoningBuffer,
        role: "assistant",
        agentKey: ctx.agentConfig.dbKey,
        cybotKey: ctx.agentConfig.dbKey,
        ...asOptionalTrimmedString(ctx.agentConfig?.name) ? { agentName: asOptionalTrimmedString(ctx.agentConfig?.name) } : {},
        ...savingMetadata ?? {}
      })
    );
    ctx.messageMetadata = savingMetadata;
  }
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
      messageMetadata: ctx.messageMetadata,
      toolCalls: state.assistantToolCalls,
      spaceId: ctx.spaceId
    })
  );
  return {
    ...state,
    alreadyFinalized: true
  };
}
var EMPTY_UPSTREAM_STREAM_MESSAGE = "\u6A21\u578B\u8FD4\u56DE\u4E86\u7A7A\u54CD\u5E94\uFF0C\u8BF7\u91CD\u8BD5\u6216\u5207\u6362\u5176\u4ED6\u6A21\u578B";
function markEmptyCompletionAsError(state, ctx) {
  const producedNothing = state.contentBuffer.length === 0 && !state.reasoningBuffer.trim() && (state.assistantToolCalls?.length ?? 0) === 0;
  if (!producedNothing || state.hasHandedOff || state.alreadyFinalized) {
    return state;
  }
  markStreamMessageAborted(ctx, EMPTY_UPSTREAM_STREAM_MESSAGE);
  return {
    ...state,
    contentBuffer: appendTextChunk(
      state.contentBuffer,
      `[\u9519\u8BEF: ${EMPTY_UPSTREAM_STREAM_MESSAGE}]`
    )
  };
}
function markStreamMessageAborted(ctx, errorMessage) {
  const base = ctx.messageMetadata ?? {};
  const previousMetadata = base.metadata && typeof base.metadata === "object" ? base.metadata : {};
  ctx.messageMetadata = {
    ...base,
    metadata: {
      ...previousMetadata,
      error: true,
      message: errorMessage
    }
  };
}
function applyUsage(state, data) {
  if (!data.usage) return state;
  return {
    ...state,
    totalUsage: updateTotalUsage(state.totalUsage, data.usage)
  };
}
function applyDelta(state, delta) {
  let hasNewVisibleContent = false;
  let next = { ...state };
  const reasoningChunk = delta.reasoning_content ?? delta.reasoning ?? "";
  if (reasoningChunk) {
    next.reasoningBuffer = (next.reasoningBuffer || "") + reasoningChunk;
    hasNewVisibleContent = true;
  }
  if (Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0) {
    const accumulated = accumulateToolCallChunks(
      next.accumulatedToolCalls,
      delta.tool_calls
    );
    next = {
      ...next,
      accumulatedToolCalls: accumulated,
      assistantToolCalls: accumulated.map((call) => ({
        id: call.id,
        type: "function",
        function: {
          name: call.function?.name,
          arguments: typeof call.function?.arguments === "string" ? call.function.arguments : JSON.stringify(call.function?.arguments ?? {})
        }
      }))
    };
  }
  const deltaAny = delta;
  if (Array.isArray(deltaAny.images) && deltaAny.images.length > 0) {
    next = {
      ...next,
      contentBuffer: [...next.contentBuffer, ...deltaAny.images]
    };
    hasNewVisibleContent = true;
  }
  const contentChunk = delta.content || "";
  if (contentChunk) {
    const { cleanedContent, state: tcState } = processContentChunkWithToolCallStripping(
      contentChunk,
      next.toolCallTextState,
      (name, arguments_) => {
        next.accumulatedToolCalls = accumulateToolCallChunks(
          next.accumulatedToolCalls ?? [],
          [{ index: next.accumulatedToolCalls.length, type: "function", function: { name, arguments: arguments_ } }]
        );
      }
    );
    next.toolCallTextState = tcState;
    if (!cleanedContent) return { state: next, hasNewVisibleContent };
    const parsed = processThinkChunk(cleanedContent, next.thinkState);
    next.thinkState = parsed.state;
    if (parsed.reasoning) {
      next.reasoningBuffer = (next.reasoningBuffer || "") + parsed.reasoning;
      hasNewVisibleContent = true;
    }
    if (parsed.content) {
      next = {
        ...next,
        contentBuffer: appendTextChunk(next.contentBuffer, parsed.content)
      };
      hasNewVisibleContent = true;
    }
  }
  return { state: next, hasNewVisibleContent };
}
function emitStreamingUpdate(hasNewVisibleContent, state, ctx) {
  if (!hasNewVisibleContent) return;
  ctx.dispatch(
    messageStreaming({
      id: ctx.messageId,
      dialogId: ctx.dialogId,
      dbKey: ctx.msgKey,
      content: state.contentBuffer,
      thinkContent: state.reasoningBuffer,
      role: "assistant",
      agentKey: ctx.agentConfig.dbKey,
      cybotKey: ctx.agentConfig.dbKey,
      ...asOptionalTrimmedString(ctx.agentConfig?.name) ? { agentName: asOptionalTrimmedString(ctx.agentConfig?.name) } : {},
      ...ctx.messageMetadata ?? {}
    })
  );
}
function createStreamThrottler(emitUpdate, options) {
  let pendingState = null;
  let timerId = null;
  const defaultSchedule = (cb) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      return window.requestAnimationFrame(cb);
    }
    return setTimeout(cb, 16);
  };
  const defaultCancel = (id) => {
    if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(id);
      return;
    }
    clearTimeout(id);
  };
  const scheduleFn = options?.schedule ?? defaultSchedule;
  const cancelFn = options?.cancel ?? defaultCancel;
  return {
    push(state) {
      pendingState = state;
      if (timerId === null) {
        timerId = scheduleFn(() => {
          timerId = null;
          if (pendingState !== null) {
            const stateToEmit = pendingState;
            pendingState = null;
            emitUpdate(stateToEmit);
          }
        });
      }
    },
    flush() {
      if (timerId !== null) {
        cancelFn(timerId);
        timerId = null;
      }
      if (pendingState !== null) {
        const stateToEmit = pendingState;
        pendingState = null;
        emitUpdate(stateToEmit);
      }
    },
    cancel() {
      if (timerId !== null) {
        cancelFn(timerId);
        timerId = null;
      }
      pendingState = null;
    }
  };
}
function validateAndPartitionToolCalls(state) {
  const validCalls = [];
  const invalidCalls = [];
  for (const call of state.accumulatedToolCalls) {
    if (!call) continue;
    const argsValid = parseToolCallArguments(call?.function?.arguments).valid;
    if (argsValid) {
      validCalls.push(call);
    } else {
      const sanitized = {
        ...call,
        function: {
          ...call.function ?? {},
          name: call?.function?.name ?? "",
          arguments: INVALID_TOOL_ARGS_REPLACEMENT
        }
      };
      invalidCalls.push(sanitized);
    }
  }
  return { validCalls, invalidCalls };
}
function syncAssistantToolCallsAfterSanitize(state, invalidCalls) {
  if (!invalidCalls.length) return state.assistantToolCalls ?? [];
  const invalidById = /* @__PURE__ */ new Map();
  for (const call of invalidCalls) {
    if (call?.id) invalidById.set(call.id, call);
  }
  const base = Array.isArray(state.assistantToolCalls) ? state.assistantToolCalls : state.accumulatedToolCalls.map((call) => ({
    id: call.id,
    type: "function",
    function: {
      name: call.function?.name,
      arguments: typeof call.function?.arguments === "string" ? call.function.arguments : JSON.stringify(call.function?.arguments ?? {})
    }
  }));
  return base.map((call) => {
    if (!call?.id) return call;
    const invalid = invalidById.get(call.id);
    if (!invalid) return call;
    return {
      ...call,
      type: "function",
      function: {
        name: invalid.function?.name ?? call.function?.name ?? "",
        arguments: INVALID_TOOL_ARGS_REPLACEMENT
      }
    };
  });
}
async function persistInvalidToolCallResults(invalidCalls, ctx, startIndex) {
  for (let i = 0; i < invalidCalls.length; i++) {
    const call = invalidCalls[i];
    const callId = call?.id || `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toolIndex = startIndex + i;
    const runningToolMessageId = `${ctx.messageId}-t${String(toolIndex).padStart(3, "0")}`;
    const runningToolDbKey = dialogMessageKey(ctx.dialogId, runningToolMessageId);
    const toolName = call?.function?.name || "unknown";
    const selfHealContent = buildInvalidToolCallSelfHealResult(callId, toolName);
    const toolMessage = {
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
          message: "\u5DE5\u5177\u53C2\u6570 JSON \u88AB\u622A\u65AD\u6216\u975E\u6CD5\uFF0C\u5DF2\u8DF3\u8FC7\u6267\u884C\u5E76\u66FF\u6362\u4E3A\u5360\u4F4D arguments\u3002",
          retryable: true
        },
        summary: `\u274C ${toolName} \u53C2\u6570\u88AB\u622A\u65AD\uFF0C\u5DF2\u8DF3\u8FC7`
      }
    };
    ctx.dispatch(addToolMessage(toolMessage));
    await persistToolMessage(ctx.dispatch, toolMessage, {
      isStreaming: false,
      soft: true
    });
  }
}
async function processAccumulatedToolCalls(state, ctx) {
  if (!state.accumulatedToolCalls.length) {
    return {
      state,
      hasHandedOff: false,
      hasPendingInteraction: false
    };
  }
  const { validCalls, invalidCalls } = validateAndPartitionToolCalls(state);
  const sanitizedAssistantToolCalls = syncAssistantToolCallsAfterSanitize(
    state,
    invalidCalls
  );
  if (invalidCalls.length > 0) {
    await persistInvalidToolCallResults(
      invalidCalls,
      ctx,
      validCalls.length
    );
  }
  if (!validCalls.length) {
    const nextState2 = {
      ...state,
      accumulatedToolCalls: [],
      assistantToolCalls: sanitizedAssistantToolCalls,
      hasProcessedToolCalls: true,
      hasHandedOff: false
    };
    return {
      state: nextState2,
      hasHandedOff: false,
      hasPendingInteraction: false
    };
  }
  const result = await ctx.dispatch(
    handleToolCalls({
      accumulatedCalls: validCalls,
      currentContentBuffer: state.contentBuffer,
      agentConfig: ctx.agentConfig,
      messageId: ctx.messageId,
      dialogId: ctx.dialogId,
      dialogKey: ctx.dialogKey
    })
  ).unwrap();
  const nextState = {
    ...state,
    contentBuffer: result.finalContentBuffer,
    accumulatedToolCalls: [],
    assistantToolCalls: sanitizedAssistantToolCalls,
    hasProcessedToolCalls: true,
    hasHandedOff: result.hasHandedOff
  };
  return {
    state: nextState,
    hasHandedOff: result.hasHandedOff,
    hasPendingInteraction: result.hasPendingInteraction
  };
}
async function readStreamChunkWithTimeout(reader, signal) {
  return readStreamChunk(reader, {
    signal,
    timeoutMs: STREAM_READ_TIMEOUT_MS,
    timeoutErrorMessage: `\u6A21\u578B\u54CD\u5E94\u6D41 ${Math.round(STREAM_READ_TIMEOUT_MS / 1e3)} \u79D2\u5185\u6CA1\u6709\u8FD4\u56DE\u65B0\u5185\u5BB9`
  });
}
async function handleStreamCompletion(state, ctx, finalizeCtx) {
  let hasHandedOff = false;
  let hasPendingInteraction = false;
  const { residualContent, state: tcFlushState } = flushToolCallTextParserIntoCallback(
    state.toolCallTextState,
    (name, arguments_) => {
      state.accumulatedToolCalls = accumulateToolCallChunks(
        state.accumulatedToolCalls ?? [],
        [{ index: state.accumulatedToolCalls.length, type: "function", function: { name, arguments: arguments_ } }]
      );
    }
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
      contentBuffer: appendTextChunk(state.contentBuffer, combinedFlushContent)
    };
  }
  if (!state.hasProcessedToolCalls && state.accumulatedToolCalls.length > 0) {
    if (state.totalUsage) {
      ctx.dispatch(tokenUsageLiveUpdate({
        input_tokens: state.totalUsage.prompt_tokens ?? state.totalUsage.input_tokens,
        output_tokens: state.totalUsage.completion_tokens ?? state.totalUsage.output_tokens,
        cost: state.totalUsage.cost,
        dialogKey: ctx.dialogKey
      }));
    }
    const toolResult = await processAccumulatedToolCalls(state, {
      dispatch: ctx.dispatch,
      agentConfig: ctx.agentConfig,
      dialogId: ctx.dialogId,
      dialogKey: ctx.dialogKey,
      messageId: ctx.messageId
    });
    let next = toolResult.state;
    hasHandedOff || (hasHandedOff = toolResult.hasHandedOff);
    hasPendingInteraction || (hasPendingInteraction = toolResult.hasPendingInteraction);
    next = await finalizeStream(next, finalizeCtx);
    return { state: next, hasHandedOff, hasPendingInteraction };
  }
  state = markEmptyCompletionAsError(state, finalizeCtx);
  const finalized = await finalizeStream(state, finalizeCtx);
  return { state: finalized, hasHandedOff, hasPendingInteraction };
}
var sendOpenAICompletionsRequest = async ({
  bodyData,
  agentConfig,
  thunkApi,
  dialogKey,
  parentMessageId,
  messageMetadata,
  disableToolsForThisRequest = false,
  quickChatPerfStartedAt,
  streamThrottlerOptions
}) => {
  const { dispatch, getState, signal: thunkSignal } = thunkApi;
  const dialogId = extractCustomId(dialogKey);
  const controller = new AbortController();
  thunkSignal.addEventListener("abort", () => controller.abort());
  const signal = controller.signal;
  const streamSpaceId = selectCurrentSpaceId(getState()) || void 0;
  let messageId;
  let msgKey;
  if (parentMessageId) {
    messageId = parentMessageId;
    msgKey = `msg:${dialogId}:${messageId}`;
  } else {
    const newIds = createDialogMessageKeyAndId(dialogId);
    messageId = newIds.messageId;
    msgKey = newIds.key;
  }
  dispatch(addActiveController({ messageId, controller, dialogKey }));
  const requestBody = await inlineImageUrlsForCustomProvider(
    buildRequestBodyWithTools(
      bodyData,
      agentConfig,
      disableToolsForThisRequest
    ),
    {
      shouldInline: shouldInlineImageUrlsForAgent(agentConfig)
    }
  );
  let streamState = createInitialStreamState();
  let parseSSE = createSSEParser();
  let reader;
  const finalizeCtx = {
    dispatch,
    msgKey,
    dialogId,
    dialogKey,
    messageId,
    agentConfig,
    spaceId: streamSpaceId,
    messageMetadata
  };
  let hasHandedOffOverall = false;
  let hasPendingInteractionOverall = false;
  let lastFinishReason = null;
  let activeMessageMetadata = messageMetadata;
  let emptyCompletionRetryUsed = false;
  const throttler = createStreamThrottler((latestState) => {
    emitStreamingUpdate(true, latestState, {
      dispatch,
      agentConfig,
      messageId,
      msgKey,
      dialogId,
      messageMetadata: activeMessageMetadata
    });
  }, streamThrottlerOptions);
  const buildMeta = () => ({
    hasToolCalls: Array.isArray(streamState.assistantToolCalls) && streamState.assistantToolCalls.length > 0,
    hasPendingInteraction: hasPendingInteractionOverall,
    hasHandedOff: hasHandedOffOverall,
    finishReason: lastFinishReason,
    messageId,
    usage: streamState.totalUsage ?? void 0
  });
  try {
    if (!parentMessageId) {
      dispatch(
        messageStreaming({
          id: messageId,
          dialogId,
          dbKey: msgKey,
          content: "",
          role: "assistant",
          agentKey: agentConfig.dbKey,
          cybotKey: agentConfig.dbKey,
          ...asOptionalTrimmedString(agentConfig?.name) ? { agentName: asOptionalTrimmedString(agentConfig?.name) } : {},
          ...activeMessageMetadata ?? {},
          isStreaming: true
        })
      );
    }
    const api = getApiEndpoint(agentConfig);
    const token = selectIdentityToken(getState()) ?? "";
    logQuickChatPerfStage(quickChatPerfStartedAt, "openai-completions-fetch-starting", {
      api,
      dialogKey
    });
    const response = await performFetchRequest({
      agentConfig,
      api,
      bodyData: requestBody,
      currentServer: selectCurrentServer(getState()),
      signal,
      token,
      dialogId,
      onRetry: (info) => {
        dispatch(
          messageStreaming({
            id: messageId,
            dialogId,
            dbKey: msgKey,
            content: "",
            role: "assistant",
            agentKey: agentConfig.dbKey,
            cybotKey: agentConfig.dbKey,
            ...activeMessageMetadata ?? {},
            isStreaming: true,
            retryProgress: info
          })
        );
      }
    });
    logQuickChatPerfStage(quickChatPerfStartedAt, "openai-completions-fetch-response", {
      ok: response.ok,
      status: response.status,
      dialogKey
    });
    activeMessageMetadata = withImageGenerationStage(
      activeMessageMetadata,
      "generating"
    );
    finalizeCtx.messageMetadata = activeMessageMetadata;
    if (!parentMessageId && activeMessageMetadata?.imageGenerationState) {
      dispatch(
        messageStreaming({
          id: messageId,
          dialogId,
          dbKey: msgKey,
          content: "",
          role: "assistant",
          agentKey: agentConfig.dbKey,
          cybotKey: agentConfig.dbKey,
          ...asOptionalTrimmedString(agentConfig?.name) ? { agentName: asOptionalTrimmedString(agentConfig?.name) } : {},
          ...activeMessageMetadata ?? {},
          isStreaming: true
        })
      );
    }
    if (!response.ok) {
      const errorMessage = await parseApiError(response);
      streamState = {
        ...streamState,
        contentBuffer: appendTextChunk(
          streamState.contentBuffer,
          `[\u9519\u8BEF: ${errorMessage}]`
        )
      };
      streamState = await finalizeStream(streamState, finalizeCtx);
      return buildMeta();
    }
    reader = response.body?.getReader();
    if (!reader) {
      streamState = markEmptyCompletionAsError(streamState, finalizeCtx);
      streamState = await finalizeStream(streamState, finalizeCtx);
      return buildMeta();
    }
    let decoder2 = new TextDecoder();
    let loggedFirstStreamChunk = false;
    let loggedFirstParsedEvent = false;
    let loggedFirstVisibleDelta = false;
    while (true) {
      const { done, value } = await readStreamChunkWithTimeout(reader, signal);
      if (done) {
        throttler.flush();
        const producedNothing = streamState.contentBuffer.length === 0 && !streamState.reasoningBuffer.trim() && (streamState.assistantToolCalls?.length ?? 0) === 0;
        if (producedNothing && !emptyCompletionRetryUsed && !streamState.hasHandedOff && !streamState.alreadyFinalized && !signal.aborted) {
          emptyCompletionRetryUsed = true;
          const retryResponse = await performFetchRequest({
            agentConfig,
            api,
            bodyData: {
              ...requestBody,
              messages: [
                ...requestBody.messages ?? [],
                { role: "user", content: EMPTY_ASSISTANT_REPAIR_PROMPT }
              ]
            },
            currentServer: selectCurrentServer(getState()),
            signal,
            token,
            dialogId
          });
          if (retryResponse.ok && retryResponse.body) {
            throttler.cancel();
            streamState = createInitialStreamState();
            parseSSE = createSSEParser();
            decoder2 = new TextDecoder();
            reader = retryResponse.body.getReader();
            continue;
          }
        }
        const completion = await handleStreamCompletion(
          streamState,
          {
            dispatch,
            dialogId,
            dialogKey: finalizeCtx.dialogKey,
            messageId,
            agentConfig
          },
          finalizeCtx
        );
        streamState = completion.state;
        hasHandedOffOverall || (hasHandedOffOverall = completion.hasHandedOff);
        hasPendingInteractionOverall || (hasPendingInteractionOverall = completion.hasPendingInteraction);
        break;
      }
      if (!loggedFirstStreamChunk) {
        loggedFirstStreamChunk = true;
        logQuickChatPerfStage(
          quickChatPerfStartedAt,
          "openai-completions-first-stream-chunk",
          { dialogKey, byteLength: value.byteLength }
        );
      }
      const chunk = decoder2.decode(value, { stream: true });
      const parsedResults = parseSSE(chunk);
      if (parsedResults.length > 0 && !loggedFirstParsedEvent) {
        loggedFirstParsedEvent = true;
        logQuickChatPerfStage(
          quickChatPerfStartedAt,
          "openai-completions-first-sse-event",
          { dialogKey, eventCount: parsedResults.length }
        );
      }
      for (const parsedData of parsedResults) {
        const dataList = Array.isArray(parsedData) ? parsedData : [parsedData];
        for (const data of dataList) {
          streamState = applyUsage(streamState, data);
          if (data === "[DONE]") {
            continue;
          }
          if (data.error) {
            throttler.flush();
            const errorMsg = `Error: ${formatStreamErrorMessage(data)}`;
            streamState = {
              ...streamState,
              contentBuffer: appendTextChunk(
                streamState.contentBuffer,
                `
[API Error] ${errorMsg}`
              )
            };
            await reader.cancel();
            break;
          }
          const choice = data.choices?.[0];
          if (!choice) continue;
          const delta = choice.delta || {};
          const { state: updatedState, hasNewVisibleContent } = applyDelta(
            streamState,
            delta
          );
          streamState = updatedState;
          if (hasNewVisibleContent && !loggedFirstVisibleDelta) {
            loggedFirstVisibleDelta = true;
            logQuickChatPerfStage(
              quickChatPerfStartedAt,
              "openai-completions-first-visible-delta",
              { dialogKey }
            );
          }
          if (hasNewVisibleContent) {
            throttler.push(streamState);
          }
          if (Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0) {
            throttler.flush();
          }
          const finishReason = choice.finish_reason;
          if (finishReason) {
            lastFinishReason = finishReason;
            streamState.finishReason = finishReason;
            if (finishReason === "tool_calls") {
              throttler.flush();
              if (streamState.totalUsage) {
                dispatch(tokenUsageLiveUpdate({
                  input_tokens: streamState.totalUsage.prompt_tokens ?? streamState.totalUsage.input_tokens,
                  output_tokens: streamState.totalUsage.completion_tokens ?? streamState.totalUsage.output_tokens,
                  cost: streamState.totalUsage.cost,
                  dialogKey
                }));
              }
              const toolResult = await processAccumulatedToolCalls(
                streamState,
                {
                  dispatch,
                  agentConfig,
                  dialogId,
                  dialogKey,
                  messageId,
                  messageMetadata
                }
              );
              streamState = toolResult.state;
              hasHandedOffOverall || (hasHandedOffOverall = toolResult.hasHandedOff);
              hasPendingInteractionOverall || (hasPendingInteractionOverall = toolResult.hasPendingInteraction);
              streamState = await finalizeStream(streamState, finalizeCtx);
            } else if (finishReason !== "stop") {
              const finishErrorMessage = finishReason === "error" ? getChoiceFinishErrorMessage(data, choice) : null;
              streamState = {
                ...streamState,
                contentBuffer: appendTextChunk(
                  streamState.contentBuffer,
                  finishErrorMessage ? `
[API Error] Error: ${finishErrorMessage}` : finishReason === "error" ? "\n[API Error] Error: \u6A21\u578B\u54CD\u5E94\u4EE5 error \u7ED3\u675F\uFF0C\u4F46\u4E0A\u6E38\u672A\u8FD4\u56DE\u5177\u4F53\u9519\u8BEF\u3002\u8BF7\u91CD\u8BD5\uFF0C\u6216\u5207\u6362\u5230\u5176\u4ED6\u652F\u6301\u56FE\u7247\u8F93\u5165\u7684\u6A21\u578B\u3002" : `
[\u6D41\u7ED3\u675F\u539F\u56E0: ${finishReason}]`
                )
              };
            }
          }
        }
      }
    }
  } catch (error) {
    throttler.flush();
    let errorText;
    const isAbort = isAbortError(error);
    if (isAbort) {
      errorText = "\n[\u7528\u6237\u4E2D\u65AD]";
    } else {
      errorText = `
[\u9519\u8BEF: ${toErrorMessage(error)}]`;
    }
    console.error("[SSE] sendOpenAICompletionsRequest error:", error);
    streamState = {
      ...streamState,
      contentBuffer: appendTextChunk(streamState.contentBuffer, errorText)
    };
    if (!isAbort) {
      markStreamMessageAborted(
        finalizeCtx,
        toErrorMessage(error)
      );
    }
    streamState = await finalizeStream(streamState, finalizeCtx);
  } finally {
    throttler.cancel();
    logQuickChatPerfStage(quickChatPerfStartedAt, "openai-completions-stream-finished", {
      dialogKey
    });
    dispatch(removeActiveController({ messageId, dialogKey }));
    try {
      await reader?.cancel();
    } catch (_e) {
    }
  }
  return buildMeta();
};

export {
  filterAndCleanMessages,
  persistToolMessages,
  handleToolCalls,
  projectToolMessageContent,
  buildSpaceContextLayer,
  buildLinkedSpacesSection,
  parseApiError,
  updateTotalUsage,
  INVALID_TOOL_ARGS_REPLACEMENT,
  parseToolCallArguments,
  buildInvalidToolCallSelfHealResult,
  sanitizeOutboundResponsesInput,
  prepareTools,
  readStreamChunk,
  sendOpenAICompletionsRequest
};
