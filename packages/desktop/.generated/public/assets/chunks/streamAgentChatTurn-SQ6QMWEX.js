import {
  applyQuickChatModelOverride
} from "/public/assets/chunks/chunk-KH5LQ5GL.js";
import {
  isLiveAudioOnlyAgent
} from "/public/assets/chunks/chunk-IFVDE6LX.js";
import "/public/assets/chunks/chunk-VKQKRZVR.js";
import {
  INVALID_TOOL_ARGS_REPLACEMENT,
  buildInvalidToolCallSelfHealResult,
  buildLinkedSpacesSection,
  buildSpaceContextLayer,
  filterAndCleanMessages,
  handleToolCalls,
  parseApiError,
  parseToolCallArguments,
  persistToolMessages,
  prepareTools,
  projectToolMessageContent,
  readStreamChunk,
  sanitizeOutboundResponsesInput,
  sendOpenAICompletionsRequest,
  updateTotalUsage
} from "/public/assets/chunks/chunk-CWCPEIOA.js";
import {
  resolveAgentImageInputSupport
} from "/public/assets/chunks/chunk-FPYFWXR7.js";
import "/public/assets/chunks/chunk-M5DXP5RW.js";
import {
  extractImagePartsFromResponseOutput,
  extractTextFromResponseOutput,
  fetchReferenceContents,
  generateRequestBody,
  isResponsesConversationStateRejection,
  performFetchRequest,
  performServerProxyFetchWithRetry,
  resolveAgentCallPlan,
  resolveClientWire,
  selectResponsesConversationState,
  toResponsesTools,
  updateResponsesConversationState
} from "/public/assets/chunks/chunk-KF3GADC7.js";
import {
  mergeReferences,
  resolveReferenceAssets,
  resolveToolsFromKeys
} from "/public/assets/chunks/chunk-IDOLQ4EL.js";
import "/public/assets/chunks/chunk-CD3MPOQP.js";
import {
  TOOL_PACKS,
  addDefaultSystemCapabilityTools,
  applyDefaultWebToolPacks,
  applyDisabledTools,
  applySystemBuiltinSkillFilter,
  createSSEParser,
  expandEnabledPackPromptPatches,
  expandEnabledPacks,
  getAllToolRuns,
  resolveEffectiveEnabledPacks,
  resolveRuntimeToolSurfaceForAgent,
  waitForAbortableDelay
} from "/public/assets/chunks/chunk-CJFHNPRU.js";
import {
  shouldBlockForGptPro
} from "/public/assets/chunks/chunk-52ICTTPO.js";
import "/public/assets/chunks/chunk-Y3JDDU5C.js";
import "/public/assets/chunks/chunk-DMDFFSG6.js";
import "/public/assets/chunks/chunk-2XKWBRFO.js";
import "/public/assets/chunks/chunk-G4VE62AJ.js";
import "/public/assets/chunks/chunk-7PX5UKK4.js";
import {
  canonicalizeToolNames,
  prioritizeToolNames
} from "/public/assets/chunks/chunk-LWXWW4DE.js";
import "/public/assets/chunks/chunk-RI4COCAN.js";
import {
  resolveToolBaseUrl
} from "/public/assets/chunks/chunk-NJHFOS5M.js";
import "/public/assets/chunks/chunk-FCIRSLPG.js";
import "/public/assets/chunks/chunk-SSBU25HK.js";
import {
  getFinalPrice,
  getModelPricing,
  getPrices,
  hasExplicitAgentPricing
} from "/public/assets/chunks/chunk-5IJJ57JD.js";
import {
  getPublicImageAgentDefaultProfile,
  getPublicImageAgentMode
} from "/public/assets/chunks/chunk-VCSNZD3S.js";
import "/public/assets/chunks/chunk-AWGGOX2H.js";
import "/public/assets/chunks/chunk-DFTLAEUX.js";
import {
  extractCategorizedMentions
} from "/public/assets/chunks/chunk-ZV2RZQG3.js";
import "/public/assets/chunks/chunk-GIMH23VB.js";
import "/public/assets/chunks/chunk-PTH5G2FS.js";
import "/public/assets/chunks/chunk-FXT35AYA.js";
import {
  getDocState
} from "/public/assets/chunks/chunk-VPSYWRNH.js";
import "/public/assets/chunks/chunk-5E4522JS.js";
import "/public/assets/chunks/chunk-V2ALUAJU.js";
import {
  DEFAULT_AGENT_BASE_POLICY,
  DEFAULT_USER_PREFERENCE_PROFILE,
  PERSONALIZATION_DIALOG_CATEGORY,
  addToolMessage,
  addUserMessage,
  asRecordOrEmpty,
  buildPersonalizationDialogPolicyContext,
  createCliChatTurnStream,
  createDialogMessageKeyAndId,
  dialogMessageKey,
  estimateMissingUsage,
  estimateTokenCount,
  extractReferenceKeysFromMessage,
  finalizeTransientMessageOnError,
  getCliChatSession,
  getModelContextWindow,
  getModelInfo,
  isAbortError,
  messageStreamEnd,
  messageStreaming,
  patch,
  planContextUsage,
  prepareAndPersistUserMessage,
  read,
  removeTransientMessage,
  selectAiRecentContentLimit,
  selectAllMsgs,
  selectById,
  selectCurrentDialogConfig,
  selectCurrentServer,
  selectCurrentSpaceId,
  selectCurrentTable,
  selectCurrentUserBalance,
  selectDialogConfigByKey,
  selectGlobalPrompt,
  selectIdentityToken,
  selectIdentityUser,
  selectIdentityUserId,
  selectKnowledgeCaptureLevel,
  selectMaxExecutionTime,
  selectRuntimeCurrentServer,
  selectSpaceContextLevel,
  selectTableRows,
  selectUserTonePreset,
  selectViewMode,
  startCliChatSession,
  updateTokens,
  write
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  getIsDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asNonEmptyStringArray,
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  addActiveController,
  clearPendingUserInputQueue,
  dequeueUserInput,
  extractCustomId,
  removeActiveController,
  selectActiveControllers,
  selectPendingFiles,
  selectPendingUserInputQueue,
  tokenUsageLiveUpdate
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import {
  getApiEndpoint,
  getModelConfig,
  getProviderByModelName
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  asOptionalFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/projectDesktopToolUiContent.ts
var DESKTOP_TOOL_UI_CONTENT_MAX_CHARS = 48e3;
function clipUiText(value, max = DESKTOP_TOOL_UI_CONTENT_MAX_CHARS) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 20))}
\u2026[truncated for UI]`;
}
function tryParseJsonRecord(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function parseShellToolTextContent(content) {
  const text = content ?? "";
  if (!text.trim()) return { stdout: "", stderr: "" };
  const exitMatch = text.match(/(?:^|\n)exitCode:\s*(-?\d+)\s*$/);
  const exitCode = exitMatch ? Number(exitMatch[1]) : void 0;
  const body = (exitMatch ? text.slice(0, exitMatch.index) : text).replace(
    /\s+$/,
    ""
  );
  let stdout = "";
  let stderr = "";
  if (body.startsWith("stdout:\n") || body.includes("\nstdout:\n")) {
    const afterStdout = body.replace(/^[\s\S]*?stdout:\n/, "");
    if (afterStdout.includes("\n\nstderr:\n")) {
      const [out, err] = afterStdout.split("\n\nstderr:\n");
      stdout = out ?? "";
      stderr = err ?? "";
    } else if (afterStdout.startsWith("stderr:\n")) {
      stderr = afterStdout.slice("stderr:\n".length);
    } else {
      stdout = afterStdout;
    }
  } else if (body.startsWith("stderr:\n") || body.includes("\nstderr:\n")) {
    stderr = body.replace(/^[\s\S]*?stderr:\n/, "");
  } else {
    stdout = body;
  }
  return {
    stdout,
    stderr,
    ...typeof exitCode === "number" && Number.isFinite(exitCode) ? { exitCode } : {}
  };
}
function resolveShellCommand(metadata, argumentsPreview) {
  return asOptionalTrimmedString(metadata.command) || asOptionalTrimmedString(metadata.cmd) || asOptionalTrimmedString(argumentsPreview) || "";
}
function projectDesktopToolUiContent(args) {
  const toolName = asOptionalTrimmedString(args.toolName) || "tool";
  const metadata = isRecord(args.metadata) ? args.metadata : {};
  const rawContent = typeof args.content === "string" ? args.content : typeof args.summary === "string" ? args.summary : typeof args.message === "string" ? args.message : "";
  if (toolName === "execShell") {
    const existing = tryParseJsonRecord(rawContent);
    if (existing && (typeof existing.stdout === "string" || typeof existing.command === "string" || typeof existing.stderr === "string")) {
      const command2 = asOptionalTrimmedString(existing.command) || resolveShellCommand(metadata, args.argumentsPreview);
      return JSON.stringify({
        ...existing,
        command: command2,
        cwd: asOptionalTrimmedString(existing.cwd) || asOptionalTrimmedString(metadata.cwd) || null,
        exitCode: asOptionalFiniteNumber(existing.exitCode) ?? asOptionalFiniteNumber(metadata.exitCode)
      });
    }
    const parsed = parseShellToolTextContent(rawContent);
    const command = resolveShellCommand(metadata, args.argumentsPreview);
    return JSON.stringify({
      command,
      cwd: asOptionalTrimmedString(metadata.cwd) || null,
      stdout: clipUiText(parsed.stdout),
      stderr: clipUiText(parsed.stderr),
      exitCode: asOptionalFiniteNumber(metadata.exitCode) ?? parsed.exitCode,
      timedOut: metadata.timedOut === true,
      blocked: metadata.blocked === true
    });
  }
  if (toolName === "readFile" || toolName === "read_file") {
    const filePath = asOptionalTrimmedString(metadata.path) || asOptionalTrimmedString(metadata.filePath) || asOptionalTrimmedString(metadata.file_path) || asOptionalTrimmedString(args.argumentsPreview) || "";
    const body = typeof args.content === "string" && args.content || typeof args.summary === "string" && args.summary || typeof args.message === "string" && args.message || "";
    return JSON.stringify({
      filePath,
      content: clipUiText(body),
      ...asOptionalFiniteNumber(metadata.startLine) != null ? { startLine: asOptionalFiniteNumber(metadata.startLine) } : {},
      ...asOptionalFiniteNumber(metadata.endLine) != null ? { endLine: asOptionalFiniteNumber(metadata.endLine) } : {},
      ...asOptionalFiniteNumber(metadata.totalLines) != null ? { totalLines: asOptionalFiniteNumber(metadata.totalLines) } : {},
      ...metadata.truncated === true ? { truncated: true } : {}
    });
  }
  const preferred = typeof args.content === "string" && args.content || typeof args.summary === "string" && args.summary || typeof args.message === "string" && args.message || "";
  return clipUiText(preferred);
}

// packages/ai/agent/desktopTurnSegments.ts
function attachToolCallIdToSegment(segments, callId) {
  if (!segments || segments.length === 0) return;
  const current = segments[segments.length - 1];
  if (!current.toolCallIds) {
    current.toolCallIds = [];
  }
  current.toolCallIds.push(callId);
}
function resolveSegmentToolCalls(toolCallIds, turnMessages) {
  if (!toolCallIds || toolCallIds.length === 0 || !Array.isArray(turnMessages) || turnMessages.length === 0) {
    return [];
  }
  const callMap = /* @__PURE__ */ new Map();
  for (const msg of turnMessages) {
    if (Array.isArray(msg?.tool_calls)) {
      for (const tc of msg.tool_calls) {
        if (tc && typeof tc.id === "string") {
          callMap.set(tc.id, tc);
        }
      }
    }
  }
  const resolved = [];
  for (const id of toolCallIds) {
    const tc = callMap.get(id);
    if (tc) {
      resolved.push(tc);
    }
  }
  return resolved;
}
function buildMinimalToolCallsFromIds(toolCallIds, toolNameById) {
  if (!toolCallIds || toolCallIds.length === 0) return [];
  const result = [];
  for (const id of toolCallIds) {
    if (!toolNameById.has(id)) continue;
    const name = toolNameById.get(id) || "tool";
    result.push({ id, type: "function", function: { name, arguments: "{}" } });
  }
  return result;
}
function selectPersistableFinalizedSegments(segments) {
  if (!Array.isArray(segments)) return [];
  return segments.filter(
    (segment) => segment.finalized && (segment.content.length > 0 || segment.toolCallIds && segment.toolCallIds.length > 0)
  );
}

// packages/chat/queue/chatQueueLifecycleActions.ts
function runChatQueueTurnEnd(payload) {
  return (_dispatch, _getState, extra) => {
    const adapter = extra?.chatQueueAdapter;
    if (!adapter) return;
    void adapter.notifyTurnEnd(payload.dialogKey, {
      ok: payload.ok,
      aborted: payload.aborted
    });
  };
}

// packages/ai/agent/getFullChatContextKeys.ts
var difference = (arrA, arrB) => {
  if (!arrA.length) return [];
  if (!arrB.length) return [...arrA];
  const exclude = new Set(arrB);
  return arrA.filter((item) => !exclude.has(item));
};
var getFullChatContextKeys = async (state, dispatch, agentConfig, userInput, dialogConfig) => {
  const msgs = selectAllMsgs(
    state,
    dialogConfig?.dbKey ? extractCustomId(dialogConfig.dbKey) : dialogConfig?.id
  );
  const botInstructionKeys = /* @__PURE__ */ new Set();
  const botKnowledgeKeys = /* @__PURE__ */ new Set();
  if (Array.isArray(agentConfig.references)) {
    for (const ref of agentConfig.references) {
      if (!ref?.dbKey) continue;
      if (ref.type === "instruction") {
        botInstructionKeys.add(ref.dbKey);
      } else {
        botKnowledgeKeys.add(ref.dbKey);
      }
    }
  }
  const currentInputKeys = /* @__PURE__ */ new Set();
  if (Array.isArray(userInput)) {
    for (const part of userInput) {
      if (part?.pageKey) currentInputKeys.add(part.pageKey);
      if (part?.dialogKey) currentInputKeys.add(part.dialogKey);
    }
  }
  const historyKeys = /* @__PURE__ */ new Set();
  const savedKeys = dialogConfig?.referenceKeys;
  if (Array.isArray(savedKeys)) {
    savedKeys.forEach((k) => historyKeys.add(k));
  }
  const scanContentParts = (msg) => {
    if (!msg) return;
    for (const key of extractReferenceKeysFromMessage(msg)) {
      historyKeys.add(key);
    }
  };
  if (msgs && msgs.length > 0) {
    const summarizedBeforeId = dialogConfig?.summarizedBeforeId;
    if (!summarizedBeforeId) {
      for (const msg of msgs) scanContentParts(msg);
    } else {
      let foundMarker = false;
      let startScan = false;
      for (const msg of msgs) {
        if (!startScan) {
          if (msg.id === summarizedBeforeId) {
            foundMarker = true;
            startScan = true;
          }
          continue;
        }
        scanContentParts(msg);
      }
      if (!foundMarker) {
        console.warn(`[getFullChatContextKeys] marker ${summarizedBeforeId} not found, scanning all`);
        for (const msg of msgs) scanContentParts(msg);
      }
    }
  }
  return {
    botInstructionKeys,
    currentInputKeys,
    historyKeys,
    botKnowledgeKeys
  };
};
var deduplicateContextKeys = (keys) => {
  const {
    botInstructionKeys,
    currentInputKeys,
    historyKeys,
    botKnowledgeKeys
  } = keys;
  const finalBotInstructionKeys = Array.from(botInstructionKeys);
  const finalCurrentInputKeys = difference(
    Array.from(currentInputKeys),
    finalBotInstructionKeys
  );
  const finalHistoryKeys = difference(Array.from(historyKeys), [
    ...finalBotInstructionKeys,
    ...finalCurrentInputKeys
  ]);
  const finalBotKnowledgeKeys = difference(Array.from(botKnowledgeKeys), [
    ...finalBotInstructionKeys,
    ...finalCurrentInputKeys,
    ...finalHistoryKeys
  ]);
  return {
    botInstructionsContext: finalBotInstructionKeys,
    currentInputContext: finalCurrentInputKeys,
    historyContext: finalHistoryKeys,
    botKnowledgeContext: finalBotKnowledgeKeys
  };
};

// packages/ai/chat/streamRetry.ts
var MAX_INITIAL_STREAM_RETRIES = 3;
var DEFAULT_INITIAL_STREAM_RETRY_AFTER_MS = 1500;
var normalizeInitialStreamRetryAfterMs = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : DEFAULT_INITIAL_STREAM_RETRY_AFTER_MS;
};
var isRetryableInitialStreamError = (error) => {
  if (!error || isAbortError(error)) return false;
  const message = typeof error?.message === "string" ? error.message : String(error);
  return /ECONNRESET|ECONNREFUSED|EPIPE|socket hang up|network error|failed to fetch|fetch failed|load failed|connection closed|stream ended before first visible delta|response stream ended before first visible delta|模型响应流 .* 秒内没有返回新内容/i.test(
    message
  );
};
var waitForInitialStreamRetry = async (retryAfterMs, signal) => {
  await waitForAbortableDelay(
    normalizeInitialStreamRetryAfterMs(retryAfterMs),
    signal
  );
};

// packages/ai/chat/sendOpenAIResponseRequest.ts
var seg = (txt) => [{ type: "text", text: txt ?? "" }];
var shouldEnableBuiltInImageGeneration = (agentConfig) => String(agentConfig?.provider || "").toLowerCase() === "openai" && !getModelInfo(String(agentConfig?.model || ""))?.hasImageOutput && !!agentConfig?.imageConfig?.enabled;
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
  (part) => part?.type === "text" && typeof part.text === "string" && part.text.trim()
);
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
var safeCancel = async (reader) => {
  if (!reader) return;
  try {
    await reader.cancel();
  } catch {
  }
};
var ensureToolCall = (state, key, partial) => {
  let toolCall = state.assistantToolCalls.find((call) => call.id === key);
  if (!toolCall) {
    toolCall = {
      id: key,
      type: "function",
      function: { name: "", arguments: "" }
    };
    state.assistantToolCalls.push(toolCall);
  }
  if (partial.id) toolCall.id = partial.id;
  if (partial.function?.name) toolCall.function.name = partial.function.name;
  if (typeof partial.function?.arguments === "string") {
    toolCall.function.arguments = partial.function.arguments;
  }
  return toolCall;
};
var extractTextFromOutputItem = (item) => {
  if (item?.type !== "message" || !Array.isArray(item.content)) return "";
  return item.content.filter(
    (content) => content?.type === "output_text" && typeof content.text === "string"
  ).map((content) => content.text).join("");
};
var getStreamErrorMessage = (event) => {
  const directMessage = asOptionalTrimmedString(event?.message);
  if (directMessage) return directMessage;
  const nestedMessage = asOptionalTrimmedString(event?.error?.message) ?? asOptionalTrimmedString(event?.error?.msg);
  if (nestedMessage) return nestedMessage;
  const nestedCode = asOptionalTrimmedString(event?.error?.code) ?? asOptionalTrimmedString(event?.code);
  if (nestedCode) return nestedCode;
  const nestedType = asOptionalTrimmedString(event?.error?.type);
  if (nestedType) return nestedType;
  const eventType = asOptionalTrimmedString(event?.type);
  if (eventType && eventType !== "error") return eventType;
  return "Unknown error";
};
var sendOpenAIResponseRequest = async ({
  bodyData,
  agentConfig,
  thunkApi,
  dialogKey,
  parentMessageId,
  messageMetadata,
  quickChatPerfStartedAt,
  fallbackBodyData
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
  const state = {
    content: "",
    contentBuffer: [],
    reasoning: "",
    usage: null,
    assistantToolCalls: [],
    completedResponse: null
  };
  let activeMessageMetadata = messageMetadata;
  const buildMeta = (hasPendingInteraction = false, hasHandedOff = false, finishReason = null) => ({
    hasToolCalls: state.assistantToolCalls.length > 0,
    hasPendingInteraction,
    hasHandedOff,
    finishReason,
    messageId,
    usage: state.usage ?? void 0,
    responseId: typeof state.completedResponse?.id === "string" ? state.completedResponse.id : void 0,
    ...state.responsesStateFallback ? { responsesStateFallback: true } : {}
  });
  const resetStateForRetry = () => {
    state.content = "";
    state.contentBuffer = [];
    state.reasoning = "";
    state.usage = null;
    state.assistantToolCalls = [];
    state.completedResponse = null;
    activeMessageMetadata = messageMetadata;
  };
  const canRetryInitialResponseAttempt = (attempt, loggedFirstVisibleDelta, finishReason) => attempt < MAX_INITIAL_STREAM_RETRIES && !loggedFirstVisibleDelta && !state.assistantToolCalls.length && !finishReason && !state.completedResponse;
  const flush = () => dispatch(
    messageStreaming({
      id: messageId,
      dialogId,
      dbKey: msgKey,
      content: state.contentBuffer,
      thinkContent: state.reasoning,
      role: "assistant",
      agentKey: agentConfig.dbKey,
      cybotKey: agentConfig.dbKey,
      ...asOptionalTrimmedString(agentConfig?.name) ? { agentName: asOptionalTrimmedString(agentConfig?.name) } : {},
      ...activeMessageMetadata ?? {}
    })
  );
  const finalize = async () => {
    if (!state.content) {
      const completedText = extractTextFromResponseOutput(state.completedResponse);
      if (completedText) {
        state.content = completedText;
      }
    }
    const completedImages = extractImagePartsFromResponseOutput(state.completedResponse);
    if (state.contentBuffer.length === 0) {
      state.contentBuffer = [
        ...state.content ? seg(state.content) : [],
        ...completedImages
      ];
    } else if (completedImages.length > 0 && !state.contentBuffer.some((part) => part.type === "image_url")) {
      state.contentBuffer = [...state.contentBuffer, ...completedImages];
    }
    if (state.contentBuffer.length === 0 && state.content) {
      state.contentBuffer = seg(state.content);
    }
    activeMessageMetadata = withImageGenerationStage(
      activeMessageMetadata,
      "saving"
    );
    if (activeMessageMetadata?.imageGenerationState && shouldShowImageSavingState(state.contentBuffer)) {
      dispatch(
        messageStreaming({
          id: messageId,
          dialogId,
          dbKey: msgKey,
          content: "",
          thinkContent: state.reasoning,
          role: "assistant",
          agentKey: agentConfig.dbKey,
          cybotKey: agentConfig.dbKey,
          ...asOptionalTrimmedString(agentConfig?.name) ? { agentName: asOptionalTrimmedString(agentConfig?.name) } : {},
          ...activeMessageMetadata ?? {}
        })
      );
    } else {
      flush();
    }
    await dispatch(
      messageStreamEnd({
        finalContentBuffer: state.contentBuffer,
        totalUsage: state.usage,
        msgKey,
        agentConfig,
        dialogId,
        dialogKey,
        messageId,
        reasoningBuffer: state.reasoning,
        messageMetadata: activeMessageMetadata,
        toolCalls: state.assistantToolCalls,
        spaceId: streamSpaceId
      })
    );
  };
  const processToolCalls = async () => {
    if (!state.assistantToolCalls.length) {
      await finalize();
      return buildMeta(false, false, null);
    }
    const validCalls = [];
    const invalidCalls = [];
    for (const call of state.assistantToolCalls) {
      if (!call) continue;
      if (parseToolCallArguments(call?.function?.arguments).valid) {
        validCalls.push(call);
      } else {
        invalidCalls.push({
          ...call,
          type: "function",
          function: {
            name: call?.function?.name ?? "",
            arguments: INVALID_TOOL_ARGS_REPLACEMENT
          }
        });
      }
    }
    if (invalidCalls.length > 0) {
      const invalidById = /* @__PURE__ */ new Map();
      for (const call of invalidCalls) {
        if (call?.id) invalidById.set(call.id, call);
      }
      state.assistantToolCalls = state.assistantToolCalls.map((call) => {
        const invalid = call?.id ? invalidById.get(call.id) : void 0;
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
      for (let i = 0; i < invalidCalls.length; i++) {
        const call = invalidCalls[i];
        const callId = call?.id || `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const toolIndex = validCalls.length + i;
        const runningToolMessageId = `${messageId}-t${String(toolIndex).padStart(3, "0")}`;
        const runningToolDbKey = dialogMessageKey(dialogId, runningToolMessageId);
        const toolName = call?.function?.name || "unknown";
        const selfHealContent = buildInvalidToolCallSelfHealResult(callId, toolName);
        const toolMessage = {
          id: runningToolMessageId,
          dbKey: runningToolDbKey,
          role: "tool",
          content: selfHealContent,
          toolCallId: callId,
          thinkContent: "",
          cybotKey: agentConfig.dbKey,
          isStreaming: false,
          toolName,
          parentMessageId: messageId,
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
        dispatch(addToolMessage(toolMessage));
        const { controller: _c, ...messageToWrite } = toolMessage;
        await dispatch(
          write({
            data: { ...messageToWrite, type: "msg" /* MSG */ },
            customKey: runningToolDbKey
          })
        );
      }
    }
    if (!validCalls.length) {
      await finalize();
      return buildMeta(false, false, null);
    }
    if (state.usage) {
      dispatch(
        tokenUsageLiveUpdate({
          input_tokens: state.usage.prompt_tokens ?? state.usage.input_tokens,
          output_tokens: state.usage.completion_tokens ?? state.usage.output_tokens,
          cost: state.usage.cost,
          dialogKey
        })
      );
    }
    const result = await dispatch(
      handleToolCalls({
        accumulatedCalls: validCalls,
        currentContentBuffer: state.contentBuffer,
        agentConfig,
        messageId,
        dialogId,
        dialogKey
      })
    ).unwrap();
    state.content = Array.isArray(result.finalContentBuffer) ? result.finalContentBuffer.filter((part) => part?.type === "text").map((part) => part.text ?? "").join("") : state.content;
    state.contentBuffer = Array.isArray(result.finalContentBuffer) ? result.finalContentBuffer : state.contentBuffer;
    await finalize();
    return buildMeta(result.hasPendingInteraction, result.hasHandedOff, null);
  };
  let reader;
  let responsesStateFallbackUsed = false;
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
    const functionTools = getModelInfo(agentConfig.model)?.hasImageOutput ? [] : prepareTools(agentConfig.tools ?? [], { provider: agentConfig.provider });
    const imageMode = getPublicImageAgentMode(agentConfig);
    const imageProfile = imageMode === "continuous" ? getPublicImageAgentDefaultProfile("continuous") : null;
    const tools = [
      ...toResponsesTools(functionTools) ?? [],
      ...shouldEnableBuiltInImageGeneration(agentConfig) ? [{ type: "image_generation" }] : [],
      ...imageMode === "continuous" ? [
        {
          type: "image_generation",
          action: "auto",
          quality: imageProfile?.quality,
          output_format: imageProfile?.outputFormat
        }
      ] : []
    ];
    const buildRequestBody = (sourceBodyData) => {
      const sanitizedInput = Array.isArray(sourceBodyData?.input) ? sanitizeOutboundResponsesInput(sourceBodyData.input) : sourceBodyData?.input;
      const baseBodyData = sanitizedInput !== sourceBodyData?.input ? { ...sourceBodyData, input: sanitizedInput } : sourceBodyData;
      return {
        ...baseBodyData,
        ...tools.length ? { tools, tool_choice: baseBodyData.tool_choice ?? "auto" } : {},
        stream: true
      };
    };
    let requestBody = buildRequestBody(bodyData);
    const fallbackRequestBody = fallbackBodyData ? buildRequestBody(fallbackBodyData) : null;
    const api = getApiEndpoint(agentConfig);
    const token = selectIdentityToken(getState());
    logQuickChatPerfStage(quickChatPerfStartedAt, "openai-response-fetch-starting", {
      api,
      dialogKey
    });
    attemptLoop:
      for (let attempt = 0; attempt <= MAX_INITIAL_STREAM_RETRIES; attempt += 1) {
        const response = await performFetchRequest({
          agentConfig,
          api,
          bodyData: requestBody,
          currentServer: selectRuntimeCurrentServer(getState()),
          signal,
          token: token ?? "",
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
        logQuickChatPerfStage(quickChatPerfStartedAt, "openai-response-fetch-response", {
          ok: response.ok,
          status: response.status,
          dialogKey
        });
        activeMessageMetadata = withImageGenerationStage(
          activeMessageMetadata,
          "generating"
        );
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
          const rejectedStoredState = !!requestBody.previous_response_id && !!fallbackRequestBody && isResponsesConversationStateRejection(
            response.status,
            await response.clone().text().catch(() => "")
          );
          if (!responsesStateFallbackUsed && rejectedStoredState) {
            responsesStateFallbackUsed = true;
            state.responsesStateFallback = true;
            requestBody = fallbackRequestBody;
            resetStateForRetry();
            continue attemptLoop;
          }
          const errorMessage = await parseApiError(response);
          state.content = `[\u9519\u8BEF: ${errorMessage}]`;
          await finalize();
          return buildMeta();
        }
        reader = response.body?.getReader();
        if (!reader) {
          if (canRetryInitialResponseAttempt(attempt, false, null)) {
            resetStateForRetry();
            await waitForInitialStreamRetry(1500, signal);
            continue;
          }
          await finalize();
          return buildMeta();
        }
        const parseSSE = createSSEParser();
        const decoder = new TextDecoder();
        let finishReason = null;
        let loggedFirstStreamChunk = false;
        let loggedFirstParsedEvent = false;
        let loggedFirstVisibleDelta = false;
        try {
          while (true) {
            const { done, value } = await readStreamChunk(reader, { signal });
            if (done) {
              if (canRetryInitialResponseAttempt(attempt, loggedFirstVisibleDelta, finishReason)) {
                await safeCancel(reader);
                reader = void 0;
                resetStateForRetry();
                await waitForInitialStreamRetry(1500, signal);
                continue attemptLoop;
              }
              const meta = await processToolCalls();
              return {
                ...meta,
                finishReason: meta.finishReason ?? finishReason
              };
            }
            if (!loggedFirstStreamChunk) {
              loggedFirstStreamChunk = true;
              logQuickChatPerfStage(
                quickChatPerfStartedAt,
                "openai-response-first-stream-chunk",
                { dialogKey, byteLength: value.byteLength }
              );
            }
            const chunk = decoder.decode(value, { stream: true });
            const events = parseSSE(chunk);
            if (events.length > 0 && !loggedFirstParsedEvent) {
              loggedFirstParsedEvent = true;
              logQuickChatPerfStage(
                quickChatPerfStartedAt,
                "openai-response-first-sse-event",
                { dialogKey, eventCount: events.length }
              );
            }
            const eventList = Array.isArray(events) ? events : [events];
            for (const event of eventList) {
              if (event?.usage) {
                state.usage = updateTotalUsage(state.usage, event.usage);
              }
              if (event?.type === "error" || event?.error) {
                const streamError = new Error(getStreamErrorMessage(event));
                if (canRetryInitialResponseAttempt(attempt, loggedFirstVisibleDelta, finishReason) && isRetryableInitialStreamError(streamError)) {
                  await safeCancel(reader);
                  reader = void 0;
                  resetStateForRetry();
                  await waitForInitialStreamRetry(1500, signal);
                  continue attemptLoop;
                }
                state.content += `
[Error: ${getStreamErrorMessage(event)}]`;
                await finalize();
                return buildMeta();
              }
              switch (event?.type) {
                case "response.output_text.delta":
                  if (event.delta) {
                    state.content += event.delta;
                    state.contentBuffer = seg(state.content);
                    if (!loggedFirstVisibleDelta) {
                      loggedFirstVisibleDelta = true;
                      logQuickChatPerfStage(
                        quickChatPerfStartedAt,
                        "openai-response-first-visible-delta",
                        { dialogKey }
                      );
                    }
                    flush();
                  }
                  break;
                case "response.reasoning.delta":
                  if (event.delta?.text) {
                    state.reasoning += event.delta.text;
                    flush();
                  }
                  break;
                case "response.reasoning_text.delta":
                  if (typeof event.delta === "string" && event.delta) {
                    state.reasoning += event.delta;
                    flush();
                  }
                  break;
                case "response.reasoning.done":
                  if (event.text) {
                    state.reasoning += event.text;
                    flush();
                  }
                  break;
                case "response.output_item.added":
                case "response.output_item.done": {
                  const item = event.item;
                  if (!state.content) {
                    const itemText = extractTextFromOutputItem(item);
                    if (itemText) {
                      state.content = itemText;
                      state.contentBuffer = seg(state.content);
                      if (!loggedFirstVisibleDelta) {
                        loggedFirstVisibleDelta = true;
                        logQuickChatPerfStage(
                          quickChatPerfStartedAt,
                          "openai-response-first-visible-delta",
                          { dialogKey }
                        );
                      }
                      flush();
                    }
                  }
                  if (item?.type === "function_call") {
                    ensureToolCall(state, item.call_id || item.id, {
                      id: item.call_id || item.id,
                      function: {
                        name: item.name || "",
                        arguments: typeof item.arguments === "string" ? item.arguments : ""
                      }
                    });
                  }
                  break;
                }
                case "response.function_call_arguments.delta": {
                  const key = event.call_id || event.item_id || `${event.output_index ?? 0}`;
                  const toolCall = ensureToolCall(state, key, {
                    id: event.call_id || key,
                    function: { name: event.name || "", arguments: "" }
                  });
                  toolCall.function.arguments += event.delta ?? "";
                  break;
                }
                case "response.function_call_arguments.done": {
                  const key = event.call_id || event.item_id || `${event.output_index ?? 0}`;
                  ensureToolCall(state, key, {
                    id: event.call_id || key,
                    function: {
                      name: event.name || "",
                      arguments: typeof event.arguments === "string" ? event.arguments : typeof event.output?.arguments === "string" ? event.output.arguments : ""
                    }
                  });
                  break;
                }
                case "response.completed":
                  state.completedResponse = event.response ?? null;
                  if (responsesStateFallbackUsed) {
                    state.responsesStateFallback = true;
                  }
                  finishReason = event.response?.status === "completed" ? "stop" : event.response?.status ?? null;
                  if (event.response?.usage) {
                    state.usage = updateTotalUsage(state.usage, event.response.usage);
                  }
                  break;
                case "response.failed":
                  state.content += `
[API Failed: ${event.response?.error?.message || "unknown"}]`;
                  finishReason = "error";
                  await finalize();
                  return buildMeta(false, false, finishReason);
                case "response.incomplete":
                  state.content += `
[Incomplete: ${event.response?.incomplete_details?.reason || "unknown"}]`;
                  finishReason = "incomplete";
                  await finalize();
                  return buildMeta(false, false, finishReason);
                default:
                  break;
              }
            }
          }
        } catch (error) {
          if (canRetryInitialResponseAttempt(attempt, loggedFirstVisibleDelta, finishReason) && isRetryableInitialStreamError(
            error ?? new Error("response stream ended before first visible delta")
          )) {
            await safeCancel(reader);
            reader = void 0;
            resetStateForRetry();
            await waitForInitialStreamRetry(1500, signal);
            continue;
          }
          throw error;
        }
      }
    return buildMeta(false, false, null);
  } catch (error) {
    state.content += isAbortError(error) ? "[\u7528\u6237\u4E2D\u65AD]" : `[\u5F02\u5E38: ${error?.message || "unknown"}]`;
    await finalize();
    return buildMeta(false, false, "error");
  } finally {
    logQuickChatPerfStage(quickChatPerfStartedAt, "openai-response-stream-finished", {
      dialogKey
    });
    dispatch(removeActiveController({ messageId, dialogKey }));
    await safeCancel(reader);
  }
};

// packages/ai/agent/cleanAgentMessages.ts
var isEmptyContent = (content) => {
  if (content == null) return true;
  if (typeof content === "string") {
    return content.trim().length === 0;
  }
  if (Array.isArray(content)) {
    return content.length === 0;
  }
  return false;
};
var buildAgentViewMessages = (allMessages, currentAgentKey) => {
  const result = [];
  for (const msg of allMessages) {
    if (!msg) continue;
    const role = msg.role;
    if (!role) continue;
    const hasToolCalls = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0 || Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0;
    const empty = isEmptyContent(msg.content);
    if (role === "assistant" && empty && !hasToolCalls) {
      continue;
    }
    const isCurrentAgent = msg.cybotKey === currentAgentKey;
    if (role === "user") {
      result.push(msg);
      continue;
    }
    if (role === "assistant") {
      if (isCurrentAgent) {
        result.push(msg);
      } else {
        const cloned = { ...msg };
        if (cloned.tool_calls) {
          delete cloned.tool_calls;
        }
        if (cloned.toolCalls) {
          delete cloned.toolCalls;
        }
        const rawAgentName = cloned.agentName;
        const agentName = rawAgentName && String(rawAgentName).trim() ? String(rawAgentName).trim() : "\u5176\u4ED6 Agent";
        if (typeof cloned.content === "string") {
          const trimmed = cloned.content.trim();
          if (trimmed) {
            cloned.content = `\u3010${agentName}\u3011 ${trimmed}`;
          } else {
            cloned.content = `\u3010${agentName}\u3011\uFF08\u4F7F\u7528\u4E86\u5DE5\u5177\u751F\u6210\u56DE\u590D\uFF09`;
          }
        } else {
          cloned.content = `\u3010${agentName}\u3011\uFF08\u4F7F\u7528\u4E86\u5DE5\u5177\u751F\u6210\u56DE\u590D\uFF09`;
        }
        result.push(cloned);
      }
      continue;
    }
    if (role === "tool") {
      if (isCurrentAgent) {
        result.push(msg);
      } else {
        continue;
      }
      continue;
    }
    result.push(msg);
  }
  return result;
};

// packages/ai/policy/runtimePolicy.ts
var clampLevel = (value, fallback) => {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4) {
    return n;
  }
  return fallback;
};
var normalizeTonePreset = (value, fallback) => {
  switch (value) {
    case "professional":
    case "friendly":
    case "direct":
    case "pragmatic":
    case "default":
      return value;
    default:
      return fallback;
  }
};
var normalizeToneResolutionMode = (value, fallback) => {
  switch (value) {
    case "agent_first":
    case "user_first":
    case "blend":
      return value;
    default:
      return fallback;
  }
};
var normalizeSelfEvolutionMode = (value, fallback) => {
  switch (value) {
    case "none":
    case "knowledge_only":
    case "prompt_and_refs":
    case "full":
      return value;
    default:
      return fallback;
  }
};
var resolveAgentBasePolicy = (agentConfig) => {
  const raw = agentConfig?.basePolicy ?? {};
  return {
    version: 1,
    tone: {
      preset: normalizeTonePreset(
        raw?.tone?.preset,
        DEFAULT_AGENT_BASE_POLICY.tone?.preset ?? "default"
      ),
      resolutionMode: normalizeToneResolutionMode(
        raw?.tone?.resolutionMode,
        DEFAULT_AGENT_BASE_POLICY.tone?.resolutionMode ?? "blend"
      )
    },
    knowledgeCaptureMaxLevel: clampLevel(
      raw?.knowledgeCaptureMaxLevel,
      DEFAULT_AGENT_BASE_POLICY.knowledgeCaptureMaxLevel
    ),
    spaceContextMaxLevel: clampLevel(
      raw?.spaceContextMaxLevel,
      DEFAULT_AGENT_BASE_POLICY.spaceContextMaxLevel
    ),
    selfEvolutionMode: normalizeSelfEvolutionMode(
      raw?.selfEvolutionMode,
      DEFAULT_AGENT_BASE_POLICY.selfEvolutionMode
    )
  };
};
var resolveUserPreferenceProfile = (settingsRecord) => {
  const fallbackSpaceLevel = settingsRecord?.enableReadCurrentSpace === false ? 1 : DEFAULT_USER_PREFERENCE_PROFILE.spaceContextLevel;
  return {
    version: 1,
    tone: {
      preset: normalizeTonePreset(
        settingsRecord?.userTonePreset,
        DEFAULT_USER_PREFERENCE_PROFILE.tone?.preset ?? "default"
      )
    },
    knowledgeCaptureLevel: clampLevel(
      settingsRecord?.knowledgeCaptureLevel,
      DEFAULT_USER_PREFERENCE_PROFILE.knowledgeCaptureLevel
    ),
    spaceContextLevel: clampLevel(
      settingsRecord?.spaceContextLevel,
      fallbackSpaceLevel
    )
  };
};
var resolveTonePreset = (agentTone, userTone, mode) => {
  if (mode === "agent_first") {
    return agentTone === "default" ? userTone : agentTone;
  }
  if (mode === "user_first") {
    return userTone === "default" ? agentTone : userTone;
  }
  if (userTone !== "default") return userTone;
  return agentTone;
};
var preloadSummaryCountByLevel = (level) => ({ 1: 0, 2: 0, 3: 8, 4: 16 })[level];
var preloadBudgetRatioByLevel = (level) => ({ 1: 0, 2: 0.01, 3: 0.04, 4: 0.08 })[level];
var knowledgeCaptureLevelLabel = (level) => ({
  1: "\u4E0D\u4E3B\u52A8\u521B\u5EFA",
  2: "\u5148\u95EE\u518D\u521B\u5EFA",
  3: "\u56DE\u7B54\u540E\u5EFA\u8BAE\u521B\u5EFA",
  4: "\u9AD8\u4EF7\u503C\u7ED3\u679C\u53EF\u81EA\u52A8\u521B\u5EFA"
})[level] ?? "\u672A\u77E5\u7EA7\u522B";
var spaceContextLevelLabel = (level) => ({
  1: "\u4E0D\u81EA\u52A8\u8BFB\u53D6",
  2: "\u53EA\u770B\u7ED3\u6784\u548C\u6807\u9898",
  3: "\u8F7B\u91CF\u8BFB\u53D6",
  4: "\u81EA\u9002\u5E94\u8BFB\u53D6"
})[level] ?? "\u672A\u77E5\u7EA7\u522B";
var buildStaticUserPolicyContext = (params) => {
  const agentBasePolicy = resolveAgentBasePolicy(params.agentConfig);
  const userPreferenceProfile = resolveUserPreferenceProfile(params.settingsRecord);
  const tonePreset = resolveTonePreset(
    agentBasePolicy.tone?.preset ?? "default",
    userPreferenceProfile.tone?.preset ?? "default",
    agentBasePolicy.tone?.resolutionMode ?? "blend"
  );
  const knowledgeLevel = Math.min(
    agentBasePolicy.knowledgeCaptureMaxLevel,
    userPreferenceProfile.knowledgeCaptureLevel
  );
  const spaceLevel = Math.min(
    agentBasePolicy.spaceContextMaxLevel,
    userPreferenceProfile.spaceContextLevel
  );
  return [
    `\u7528\u6237\u8BED\u6C14\u504F\u597D\uFF1A${tonePreset}`,
    `\u77E5\u8BC6\u6C89\u6DC0\u7EA7\u522B\uFF1A${knowledgeLevel}\uFF08${knowledgeCaptureLevelLabel(knowledgeLevel)}\uFF09`,
    `\u7A7A\u95F4\u4E0A\u4E0B\u6587\u7EA7\u522B\uFF1A${spaceLevel}\uFF08${spaceContextLevelLabel(spaceLevel)}\uFF09`,
    "\u8BF7\u5C3D\u91CF\u4FDD\u7559 agent \u81EA\u8EAB\u89D2\u8272\u8BBE\u5B9A\uFF0C\u540C\u65F6\u6309\u7528\u6237\u504F\u597D\u8C03\u6574\u8868\u8FBE\u548C\u81EA\u52A8\u5316\u7A0B\u5EA6\u3002"
  ].join("\n");
};
var resolveSpaceContextPreloadPlan = (level) => ({
  preloadSummaryCount: preloadSummaryCountByLevel(level),
  preloadBudgetRatio: preloadBudgetRatioByLevel(level),
  includeRecentContent: level >= 3
});

// packages/ai/agent/canvasEditingContext.ts
function buildCanvasNodeEditingContextSummary(runtimeOptions) {
  if (runtimeOptions?.editingTarget?.kind !== "canvas_node") return null;
  const editingTarget = runtimeOptions.editingTarget;
  const metadata = editingTarget.metadata ?? {};
  const selectedNodeId = typeof metadata.selectedNodeId === "string" ? metadata.selectedNodeId : editingTarget.key ?? "(\u672A\u77E5\u8282\u70B9)";
  const part = typeof metadata.part === "string" ? metadata.part : editingTarget.title ?? selectedNodeId;
  const nodeType = typeof metadata.type === "string" ? metadata.type : "(\u672A\u77E5\u7C7B\u578B)";
  const path = Array.isArray(metadata.path) ? metadata.path.filter((item) => typeof item === "string") : [];
  const props = asRecordOrEmpty(metadata.props);
  const style = asRecordOrEmpty(metadata.style);
  return [
    "\u5F53\u524D\u7F16\u8F91\u76EE\u6807\uFF1ACanvas Tree \u4E2D\u7684\u4E00\u4E2A\u9009\u4E2D\u8282\u70B9\u3002",
    `- \u8282\u70B9 ID: ${selectedNodeId}`,
    `- part: ${part}`,
    `- \u8282\u70B9\u7C7B\u578B: ${nodeType}`,
    ...path.length ? [`- \u8282\u70B9\u8DEF\u5F84: ${path.join(" > ")}`] : [],
    "",
    "\u5F53\u524D\u8282\u70B9 props:",
    JSON.stringify(props, null, 2),
    "",
    "\u5F53\u524D\u8282\u70B9 style:",
    JSON.stringify(style, null, 2),
    "",
    "\u3010\u7ED9 AI \u7684\u64CD\u4F5C\u6307\u5357 / \u975E\u7528\u6237\u539F\u8BDD\u3011",
    `1. \u5982\u679C\u7528\u6237\u8981\u6C42\u4FEE\u6539\u5F53\u524D\u6A21\u5757\uFF0C\u53EA\u8F93\u51FA updateNode\uFF0C\u76EE\u6807 id \u5FC5\u987B\u662F ${selectedNodeId}\u3002`,
    "2. \u4E0D\u8981\u91CD\u5EFA root/shell\uFF0C\u4E0D\u8981\u91CD\u65B0 append \u5DF2\u5B58\u5728\u7684\u5927\u5757\u5185\u5BB9\u3002",
    "3. \u9664\u975E\u7528\u6237\u660E\u786E\u8981\u6C42\u65B0\u589E\u5B50\u6A21\u5757\uFF0C\u5426\u5219\u4E0D\u8981 appendNode\u3002",
    "4. \u56DE\u590D\u4ECD\u5FC5\u987B\u9075\u5B88 Canvas Tree MVP \u534F\u8BAE\uFF1A\u53EA\u8F93\u51FA canvas_snapshot NDJSON\uFF0C\u4E0D\u8981\u8F93\u51FA\u89E3\u91CA\u6216\u6E90\u7801\u3002"
  ].join("\n");
}

// packages/ai/agent/buildEditingContext.ts
var buildAppConstraintPacks = (args) => {
  const imports = new Set(args.externalImports);
  const fileSet = new Set(args.fileNames);
  const packs = [
    {
      id: "repair-loop",
      title: "\u9884\u68C0\u4E0E\u5B9A\u70B9\u4FEE\u590D",
      rules: [
        "\u6BCF\u6B21\u6539\u5B8C\u4EE3\u7801\u540E\uFF0C\u5148\u8C03\u7528 appPreflight\uFF0C\u53EA\u6709\u9884\u68C0\u901A\u8FC7\u540E\u518D\u8C03\u7528 appDeploy\u3002",
        "\u5982\u679C preflight / deploy \u5931\u8D25\uFF0C\u4F18\u5148\u6839\u636E\u8FD4\u56DE\u7684 issues \u505A\u5B9A\u70B9\u4FEE\u590D\uFF0C\u7136\u540E\u91CD\u65B0 preflight\uFF1B\u4E0D\u8981\u65E0\u5173\u91CD\u5199\u6574\u9875\u5E94\u7528\u3002",
        "\u5982\u679C\u5DE5\u5177\u7ED3\u679C\u91CC\u5E26\u6709 repairPlan\uFF0C\u9ED8\u8BA4\u7ACB\u5373\u6267\u884C repairPlan \u4E2D\u7684\u5C40\u90E8\u4FEE\u590D\u6B65\u9AA4\uFF0C\u4E0D\u8981\u5148\u505C\u4E0B\u6765\u95EE\u7528\u6237\u3002",
        "\u5982\u679C\u5DE5\u5177\u7ED3\u679C\u660E\u786E\u8BF4\u660E\u662F HTML / \u975E JSON \u54CD\u5E94\u3001transport failure \u6216 retryable=false\uFF0C\u505C\u6B62\u81EA\u52A8 deploy \u91CD\u8BD5\uFF1B\u8FD9\u8BF4\u660E\u5F53\u524D\u662F\u5E73\u53F0\u901A\u9053\u5F02\u5E38\uFF0C\u4E0D\u662F\u4EE3\u7801\u95EE\u9898\u3002"
      ]
    },
    {
      id: "design-system",
      title: "\u8BBE\u8BA1\u7CFB\u7EDF\u4E0E\u5C0F\u6539\u52A8\u7EA6\u675F",
      rules: [
        "\u5148\u68C0\u67E5\u5F53\u524D\u5E94\u7528\u662F\u5426\u5DF2\u7ECF\u6709 theme / tokens / designSystem / \u5171\u4EAB\u6837\u5F0F\u5E38\u91CF\uFF1B\u5982\u679C\u5DF2\u6709\uFF0C\u4F18\u5148\u6CBF\u7528\u8FD9\u5957\u8BBE\u8BA1\u7CFB\u7EDF\uFF0C\u4E0D\u8981\u5E73\u884C\u518D\u9020\u4E00\u5957\u3002",
        "\u5982\u679C\u5F53\u524D\u5E94\u7528\u8FD8\u6CA1\u6709\u8BBE\u8BA1\u7CFB\u7EDF\uFF0C\u800C\u7528\u6237\u9700\u6C42\u6D89\u53CA UI / \u6837\u5F0F / \u65B0\u9875\u9762\uFF0C\u4F18\u5148\u8865\u4E00\u5C42\u6700\u5C0F\u5171\u4EAB token\uFF08colors\u3001typography\u3001spacing\u3001radius\u3001shadow\uFF09\uFF0C\u518D\u8BA9\u7EC4\u4EF6\u6D88\u8D39\u8FD9\u4E9B token\u3002",
        "\u5982\u679C\u5F53\u524D\u5E94\u7528\u662F\u65E7\u5199\u6CD5\uFF1A\u89C6\u89C9\u503C\u6563\u843D\u5728\u591A\u4E2A\u7EC4\u4EF6\u7684\u786C\u7F16\u7801 style / \u5E38\u91CF\u91CC\uFF0C\u800C\u672C\u6B21\u9700\u6C42\u53EA\u662F\u8C03\u5B57\u4F53\u3001\u989C\u8272\u3001\u95F4\u8DDD\u3001\u5706\u89D2\u3001\u9634\u5F71\uFF0C\u9ED8\u8BA4\u6267\u884C\u4E00\u6B21\u6700\u5C0F token \u8FC1\u79FB\uFF0C\u518D\u5728 token \u5C42\u5B8C\u6210\u8C03\u6574\uFF1B\u4E0D\u8981\u7EE7\u7EED\u628A\u65B0\u6570\u5B57\u6563\u843D\u5199\u56DE\u591A\u4E2A\u4F4D\u7F6E\u3002",
        "\u5F53\u7528\u6237\u53EA\u662F\u60F3\u8C03\u5B57\u4F53\u5927\u5C0F\u3001\u5B57\u91CD\u3001\u989C\u8272\u3001\u5706\u89D2\u3001\u9634\u5F71\u3001\u95F4\u8DDD\u7B49\u89C6\u89C9\u53C2\u6570\u65F6\uFF0C\u4F18\u5148\u4FEE\u6539 token \u6216\u547D\u4E2D\u7684\u5C40\u90E8\u7EC4\u4EF6\uFF0C\u4E0D\u8981\u987A\u624B\u91CD\u5199\u6574\u4E2A\u9875\u9762\u7ED3\u6784\u3002",
        "\u9664\u975E\u7528\u6237\u660E\u786E\u8981\u6C42\u6574\u4F53\u6539\u7248\u6216\u91CD\u505A\u98CE\u683C\uFF0C\u5426\u5219\u4E0D\u8981\u8FDE\u5E26\u4FEE\u6539\u5E03\u5C40\u3001\u7EC4\u4EF6\u6811\u3001\u6587\u6848\u3001\u6570\u636E\u6D41\u3001\u8DEF\u7531\u6216\u672A\u547D\u4E2D\u7684\u9875\u9762\u3002",
        "\u5982\u679C\u53EA\u662F\u5C0F\u6539\u4E00\u5904\uFF0C\u5C3D\u91CF\u628A\u53D8\u66F4\u6536\u655B\u5728\u5C11\u6570\u6587\u4EF6\uFF0C\u5E76\u4FDD\u6301\u672A\u547D\u4E2D\u6587\u4EF6\u7684\u7ED3\u6784\u4E0E\u547D\u540D\u7A33\u5B9A\u3002"
      ]
    }
  ];
  if (args.framework === "react-spa" || fileSet.has("main.tsx") || fileSet.has("App.tsx")) {
    packs.push({
      id: "react-spa-core",
      title: "React SPA \u5F62\u6001\u4FDD\u6301",
      rules: [
        '\u7EE7\u7EED\u6CBF\u7528 framework: "react-spa" + files\uFF0C\u4E0D\u8981\u9000\u56DE\u5355\u6587\u4EF6 Worker\u3002',
        "\u4FDD\u7559\u7A33\u5B9A\u5165\u53E3\u7ED3\u6784\uFF0C\u4F18\u5148\u7EF4\u62A4 main.tsx + App.tsx\uFF0C\u518D\u5C40\u90E8\u4FEE\u6539\u7EC4\u4EF6\u6587\u4EF6\u3002"
      ]
    });
  }
  if (imports.has("react-icons/lu")) {
    packs.push({
      id: "react-icons-lu",
      title: "Lucide \u56FE\u6807\u5B89\u5168\u89C4\u5219",
      rules: [
        "\u53EA\u80FD\u4F7F\u7528 react-icons/lu \u4E2D\u771F\u5B9E\u5B58\u5728\u7684\u56FE\u6807\u540D\uFF0C\u4E0D\u8981\u731C\u6D4B\u53D8\u4F53\u540D\u3002",
        "\u5982\u679C\u4E0D\u786E\u5B9A\u56FE\u6807\u540D\uFF0C\u4F18\u5148\u4F7F\u7528 LuCircle\u3001LuCheck\u3001LuX\u3001LuInfo\u3001LuArrowRight \u8FD9\u7C7B\u57FA\u7840\u56FE\u6807\u3002"
      ]
    });
  }
  if (imports.has("leaflet") || imports.has("react-leaflet")) {
    packs.push({
      id: "leaflet",
      title: "Leaflet \u5730\u56FE\u7EA6\u675F",
      rules: [
        "\u4E0D\u8981\u624B\u52A8 import leaflet.css\uFF1B\u5E73\u53F0\u4F1A\u81EA\u52A8\u6CE8\u5165 Leaflet \u6837\u5F0F\u3002",
        "\u4FEE\u6539\u5730\u56FE\u65F6\u4F18\u5148\u4FDD\u7559\u73B0\u6709\u5750\u6807\u3001\u7F29\u653E\u548C\u56FE\u5C42\u7ED3\u6784\uFF0C\u53EA\u505A\u5FC5\u8981\u7684\u4EA4\u4E92\u6216\u89C6\u89C9\u8C03\u6574\u3002"
      ]
    });
  }
  if (imports.has("@xyflow/react")) {
    packs.push({
      id: "xyflow",
      title: "Flow \u56FE\u7F16\u8F91\u7EA6\u675F",
      rules: [
        "\u4E0D\u8981\u65B0\u589E\u5916\u90E8 CSS import\uFF1B\u9700\u8981\u6837\u5F0F\u65F6\u76F4\u63A5\u8865\u6700\u5C0F\u5FC5\u8981\u5185\u8054\u6837\u5F0F\u6216\u7EC4\u4EF6\u5185 style \u6807\u7B7E\u3002",
        "\u4F18\u5148\u590D\u7528\u73B0\u6709\u8282\u70B9/\u8FB9\u6570\u636E\u7ED3\u6784\uFF0C\u907F\u514D\u91CD\u5199\u6574\u5957 flow \u753B\u5E03\u3002"
      ]
    });
  }
  if (imports.has("echarts") || imports.has("echarts-for-react")) {
    packs.push({
      id: "echarts",
      title: "\u56FE\u8868\u6539\u52A8\u7EA6\u675F",
      rules: [
        "\u4F18\u5148\u5C40\u90E8\u4FEE\u6539 option \u914D\u7F6E\u3001\u6570\u636E\u6620\u5C04\u548C\u7EC4\u4EF6 props\uFF0C\u4E0D\u8981\u91CD\u5199\u6574\u4E2A\u56FE\u8868\u9875\u9762\u3002",
        "\u54CD\u5E94\u5F0F\u5E03\u5C40\u4F18\u5148\u9760\u5BB9\u5668\u5C3A\u5BF8\u548C\u73B0\u6709\u7EC4\u4EF6\u7ED3\u6784\u8C03\u6574\uFF0C\u4E0D\u8981\u989D\u5916\u5F15\u5165 CSS \u6587\u4EF6\u3002"
      ]
    });
  }
  if (imports.has("docx") || imports.has("xlsx")) {
    packs.push({
      id: "file-processing",
      title: "\u6587\u6863/\u8868\u683C\u5904\u7406\u7EA6\u675F",
      rules: [
        "\u4E0D\u8981\u628A\u5927\u578B\u6570\u636E\u6216\u6A21\u677F\u5185\u5BB9\u76F4\u63A5\u5185\u5D4C\u8FDB\u4EE3\u7801\u5E38\u91CF\uFF1B\u4F18\u5148\u4FDD\u7559\u8FD0\u884C\u65F6\u52A0\u8F7D\u65B9\u5F0F\u3002",
        "\u4FEE\u6539\u5BFC\u5165\u5BFC\u51FA\u903B\u8F91\u65F6\uFF0C\u4F18\u5148\u6CBF\u7528\u73B0\u6709\u6587\u4EF6\u5904\u7406\u94FE\u8DEF\u548C\u6570\u636E\u7ED3\u6784\u3002"
      ]
    });
  }
  return packs;
};
var formatAppConstraintPacks = (packs) => {
  if (packs.length === 0) return [];
  return [
    "",
    "\u5F53\u524D\u6FC0\u6D3B\u7EA6\u675F\u5305\uFF08\u6309\u5F53\u524D\u5E94\u7528\u4F9D\u8D56/\u5F62\u6001\u52A8\u6001\u6CE8\u5165\uFF09\uFF1A",
    ...packs.flatMap((pack) => [
      `- ${pack.title}\uFF08${pack.id}\uFF09`,
      ...pack.rules.map((rule) => `  - ${rule}`)
    ])
  ];
};
var buildEditingContextSummary = (state, runtimeOptions) => {
  const targetKind = runtimeOptions?.editingTarget?.kind;
  if (targetKind === "table") {
    const table = selectCurrentTable(state);
    const rows = selectTableRows(state);
    const metadata = runtimeOptions?.editingTarget?.metadata;
    const focusContext = metadata && typeof metadata === "object" ? metadata.focusContext : null;
    if (!table) return null;
    const columns = Array.isArray(table.columns) ? table.columns : [];
    const columnSummaries = columns.length ? columns.map((c) => {
      const displayName = c.label || c.name;
      const type = c.type || "text";
      const requiredFlag = c.required ? "\u5FC5\u586B" : "\u53EF\u9009";
      const primaryFlag = c.isPrimary ? "\uFF0C\u4E3B\u5B57\u6BB5" : "";
      const optionsStr = Array.isArray(c.options) && c.options.length ? `\uFF0C\u53EF\u9009\u503C\uFF1A${c.options.join(" | ")}` : "";
      const descStr = c.description ? `\u3002\u8BF4\u660E\uFF1A${c.description}` : "";
      return `- ${c.name}\uFF08\u663E\u793A\u540D\uFF1A${displayName}\uFF0C\u7C7B\u578B\uFF1A${type}\uFF0C${requiredFlag}${primaryFlag}${optionsStr}${descStr}\uFF09`;
    }) : ["- (\u5F53\u524D\u8868\u5C1A\u672A\u5B9A\u4E49\u5B57\u6BB5)"];
    const sampleRows = Array.isArray(rows) ? rows.slice(0, 20) : [];
    const rowsPreview = sampleRows.length ? JSON.stringify(sampleRows, null, 2) : "(\u5F53\u524D\u8868\u6682\u65E0\u884C\u6570\u636E)";
    const tableTitle = table.displayName ?? table.tableId ?? "(\u672A\u547D\u540D\u8868)";
    const tableDesc = table.description ? `\u7528\u9014\u8BF4\u660E\uFF1A${table.description}` : "(\u6682\u65E0\u7528\u9014\u8BF4\u660E)";
    const tableTagsLine = Array.isArray(table.tags) && table.tags.length ? `- \u5173\u952E\u8BCD\u6807\u7B7E: ${table.tags.join(", ")}` : null;
    return [
      "\u5F53\u524D\u7F16\u8F91\u76EE\u6807\uFF1A\u4E00\u5F20\u6570\u636E\u8868\uFF08Editing Table\uFF09\u3002",
      `- \u8868 ID: ${table.tableId}`,
      `- \u663E\u793A\u540D\u79F0: ${tableTitle}`,
      `- ${tableDesc}`,
      ...tableTagsLine ? [tableTagsLine] : [],
      ...focusContext && typeof focusContext === "object" && "columnName" in focusContext ? [
        "",
        "\u5F53\u524D\u7126\u70B9\uFF08Focus Context\uFF09\uFF1A",
        `- \u5F53\u524D\u5355\u5143\u683C\u5217: ${String(focusContext.columnName ?? "(\u672A\u77E5\u5217)")}`,
        ...focusContext.rowTitle ? [`- \u5F53\u524D\u884C\u6807\u9898: ${String(focusContext.rowTitle)}`] : [],
        ...focusContext.rowIndex !== null && focusContext.rowIndex !== void 0 ? [`- \u5F53\u524D\u884C\u53F7: ${Number(focusContext.rowIndex) + 1}`] : [],
        ...focusContext.cellPreview ? [`- \u5F53\u524D\u5355\u5143\u683C\u5185\u5BB9\u9884\u89C8: ${String(focusContext.cellPreview)}`] : []
      ] : [],
      "",
      "\u5B57\u6BB5\u5B9A\u4E49\uFF08Field Schema\uFF09\uFF1A",
      ...columnSummaries,
      "",
      "\u3010\u7ED9 AI \u7684\u64CD\u4F5C\u6307\u5357 / \u975E\u7528\u6237\u539F\u8BDD\u3011",
      "\u5F53\u7528\u6237\u5E0C\u671B\u5728\u5F53\u524D\u8868\u4E2D\u201C\u65B0\u589E\u4E00\u884C / \u65B0\u589E\u8BB0\u5F55 / \u63D2\u5165\u4E00\u6761 / \u5E2E\u6211\u8BB0\u4E00\u6761 xxx\u201D\u65F6\uFF1A",
      "1. \u5FC5\u987B\u8C03\u7528\u5DE5\u5177 addTableRow\uFF08\u800C\u4E0D\u662F\u53EA\u5728\u56DE\u7B54\u4E2D\u53E3\u5934\u63CF\u8FF0\u8981\u65B0\u589E\u7684\u6570\u636E\uFF09\u3002",
      "2. \u8C03\u7528 addTableRow \u65F6\uFF1A",
      "   - \u4F7F\u7528\u53C2\u6570 values\uFF08\u4E00\u4E2A\u5BF9\u8C61\uFF09\uFF0C\u5176\u4E2D\u6BCF\u4E2A key \u5FC5\u987B\u662F\u4E0A\u9762\u5B57\u6BB5\u540D\u4E4B\u4E00\uFF08name\uFF0C\u800C\u4E0D\u662F label\uFF09\u3002",
      '   - \u4F8B\u5982\uFF1A{"values":{"title":"\u4FEE Bug #123","status":"todo","note":"\u9AD8\u4F18\u5148\u7EA7"}}\u3002',
      "   - \u5C3D\u91CF\u4ECE\u7528\u6237\u7684\u81EA\u7136\u8BED\u8A00\u4E2D\u63A8\u65AD\u5E76\u586B\u6EE1\u6240\u6709\u76F8\u5173\u5B57\u6BB5\uFF1B\u5BF9\u4E8E\u5FC5\u586B\u5B57\u6BB5\uFF08required=true\uFF09\u5C24\u5176\u8981\u6CE8\u610F\u3002",
      '   - \u7528\u6237\u6CA1\u6709\u63D0\u5230\u7684\u5B57\u6BB5\uFF0C\u53EF\u4EE5\u4F7F\u7528\u7A7A\u5B57\u7B26\u4E32 "" \u6216 null \u4F5C\u4E3A\u5360\u4F4D\u3002',
      "   - \u7EDD\u4E0D\u8981\u4F20\u5165\u7A7A\u5BF9\u8C61 {} \u4F5C\u4E3A values\u3002",
      "",
      "\u4EE5\u4E0B\u662F\u90E8\u5206\u793A\u4F8B\u884C\uFF08\u6700\u591A 20 \u884C\uFF0C\u7528\u4E8E\u5E2E\u52A9\u4F60\u7406\u89E3\u5217\u542B\u4E49\uFF0C\u8BF7\u907F\u514D\u5728\u56DE\u7B54\u4E2D\u5B8C\u6574\u7C98\u8D34\u6574\u8868\uFF09\uFF1A",
      rowsPreview
    ].join("\n");
  }
  if (targetKind === "page" || targetKind === "article") {
    const page = getDocState();
    const metadata = runtimeOptions?.editingTarget?.metadata;
    const focusContext = metadata && typeof metadata === "object" ? metadata.focusContext : null;
    if (!page) return null;
    const title = page.title ?? "(\u672A\u547D\u540D\u9875\u9762)";
    return [
      "\u5F53\u524D\u7F16\u8F91\u76EE\u6807\uFF1A\u4E00\u4E2A\u9875\u9762 / \u6587\u7AE0\uFF08Editing Document\uFF09\u3002",
      `- \u6807\u9898: ${title}`,
      ...focusContext && typeof focusContext === "object" && "anchorPath" in focusContext ? [
        "",
        "\u5F53\u524D\u7126\u70B9\uFF08Focus Context\uFF09\uFF1A",
        `- \u5149\u6807\u662F\u5426\u6298\u53E0: ${Boolean(focusContext.isCollapsed) ? "\u662F" : "\u5426"}`,
        ...focusContext.blockType ? [`- \u5F53\u524D\u5757\u7C7B\u578B: ${String(focusContext.blockType)}`] : [],
        ...focusContext.selectedText ? [`- \u5F53\u524D\u9009\u4E2D\u6587\u672C: ${String(focusContext.selectedText)}`] : [],
        ...focusContext.anchorPath?.length ? [`- \u5F53\u524D\u951A\u70B9\u8DEF\u5F84: ${focusContext.anchorPath.join(" > ")}`] : []
      ] : [],
      "",
      "\u5982\u679C\u7528\u6237\u8981\u6C42\u4F60\u5BF9\u8FD9\u7BC7\u6587\u7AE0\u8FDB\u884C\u4FEE\u6539\u6216\u4F18\u5316\uFF0C\u8BF7\u5728\u56DE\u7B54\u4E2D\u660E\u786E\u6307\u51FA\u4FEE\u6539\u65B9\u5411\u3002",
      "\u5982\u679C\u5B58\u5728\u5F53\u524D\u9009\u533A\u6216\u5149\u6807\u4E0A\u4E0B\u6587\uFF0C\u4F18\u5148\u56F4\u7ED5\u8BE5\u5C40\u90E8\u4F4D\u7F6E\u505A\u5B9A\u70B9\u6539\u5199\uFF0C\u800C\u4E0D\u662F\u6CDB\u6CDB\u91CD\u5199\u6574\u7BC7\u6587\u6863\u3002"
    ].join("\n");
  }
  if (targetKind === "app") {
    const editingTarget = runtimeOptions?.editingTarget;
    const metadata = editingTarget?.metadata;
    const appId = editingTarget?.key ?? "(\u672A\u77E5 appId)";
    const title = editingTarget?.title ?? "(\u672A\u547D\u540D\u5E94\u7528)";
    const framework = typeof metadata?.framework === "string" ? metadata.framework : "worker";
    const appUrl = typeof metadata?.appUrl === "string" ? metadata.appUrl : null;
    const fileNames = Array.isArray(metadata?.fileNames) ? metadata.fileNames.filter((name) => typeof name === "string") : [];
    const externalImports = Array.isArray(metadata?.externalImports) ? metadata.externalImports.filter(
      (name) => typeof name === "string"
    ) : [];
    const sourceSummary = asOptionalTrimmedString(editingTarget?.summary) ?? null;
    const selectedNode = metadata && typeof metadata === "object" && metadata.selectedNode && typeof metadata.selectedNode === "object" ? metadata.selectedNode : null;
    const constraintPacks = buildAppConstraintPacks({
      framework,
      fileNames,
      externalImports
    });
    if (selectedNode && typeof selectedNode.cssPath === "string") {
      const tagName = typeof selectedNode.tagName === "string" && selectedNode.tagName ? selectedNode.tagName : "\u5143\u7D20";
      const cssPath = String(selectedNode.cssPath);
      const outerHTMLSnippet = typeof selectedNode.outerHTMLSnippet === "string" ? selectedNode.outerHTMLSnippet : "";
      const textSnippet = typeof selectedNode.textSnippet === "string" ? selectedNode.textSnippet : "";
      const noloLoc = typeof selectedNode.noloLoc === "string" ? selectedNode.noloLoc : "";
      constraintPacks.push({
        id: "selected-node",
        title: "\u7528\u6237\u9009\u4E2D\u8282\u70B9\uFF08\u5B9A\u70B9\u4FEE\u6539\uFF09",
        rules: [
          `\u7528\u6237\u5DF2\u5728\u9884\u89C8\u4E2D\u7CBE\u51C6\u9009\u4E2D\u4E00\u4E2A\u5143\u7D20\uFF1A<${tagName}> \uFF0CCSS \u8DEF\u5F84\uFF1A${cssPath}${noloLoc ? `\uFF0C\u6E90\u7801\u4F4D\u7F6E\uFF1A${noloLoc}` : ""}\u3002\u672C\u8F6E\u4FEE\u6539\u5FC5\u987B\u4EE5\u8FD9\u4E2A\u5143\u7D20\u4E3A\u4E2D\u5FC3\u3002`,
          `\u9009\u4E2D\u5143\u7D20\u7684 HTML \u7247\u6BB5\uFF08\u53EF\u80FD\u622A\u65AD\uFF09\uFF1A${outerHTMLSnippet}${textSnippet ? `\uFF1B\u53EF\u89C1\u6587\u672C\uFF1A${textSnippet}` : ""}\u3002\u5148\u5728\u6E90\u7801\u6587\u4EF6\u4E2D\u5B9A\u4F4D\u5230\u751F\u6210\u8FD9\u6BB5 HTML \u7684\u4EE3\u7801\uFF0C\u518D\u52A8\u624B\u3002`,
          "\u4FEE\u6539\u6536\u655B\u5728\u8BE5\u5143\u7D20\u53CA\u5176\u76F4\u63A5\u6837\u5F0F\u6765\u6E90\uFF08\u547D\u4E2D\u7684\u7EC4\u4EF6/\u7C7B/design token\uFF09\uFF1B\u8C03\u89C6\u89C9\u53C2\u6570\u4F18\u5148\u6539 token \u6216\u5C40\u90E8\u7EC4\u4EF6\u3002",
          "\u7981\u6B62\u91CD\u5199\u672A\u547D\u4E2D\u7684\u9875\u9762\u7ED3\u6784\u3001\u5E03\u5C40\u3001\u6587\u6848\u3001\u6570\u636E\u6D41\u6216\u5176\u4ED6\u7EC4\u4EF6\uFF1B\u4FDD\u6301\u672A\u547D\u4E2D\u6587\u4EF6\u4E0D\u53D8\u3002",
          "\u5982\u679C\u6309 CSS \u8DEF\u5F84\u548C HTML \u7247\u6BB5\u5728\u6E90\u7801\u4E2D\u627E\u4E0D\u5230\u5BF9\u5E94\u4F4D\u7F6E\uFF0C\u5148\u5411\u7528\u6237\u8BF4\u660E\u5E76\u8BF7\u7528\u6237\u91CD\u65B0\u9009\u62E9\uFF0C\u4E0D\u8981\u51ED\u731C\u6D4B\u5927\u8303\u56F4\u6539\u52A8\u3002"
        ]
      });
    }
    return [
      "\u5F53\u524D\u7F16\u8F91\u76EE\u6807\uFF1A\u4E00\u4E2A Web \u5E94\u7528\uFF08Editing App\uFF09\u3002",
      `- \u5E94\u7528 ID: ${appId}`,
      `- \u540D\u79F0: ${title}`,
      `- \u6280\u672F\u5F62\u6001: ${framework}`,
      ...appUrl ? [`- \u5F53\u524D\u8BBF\u95EE\u5730\u5740: ${appUrl}`] : [],
      ...fileNames.length ? [`- \u5F53\u524D\u6E90\u7801\u6587\u4EF6: ${fileNames.join(", ")}`] : ["- \u5F53\u524D\u6E90\u7801\u6587\u4EF6: (\u672A\u63D0\u4F9B\u591A\u6587\u4EF6\u6E05\u5355\uFF1B\u53EF\u80FD\u662F\u5355\u6587\u4EF6\u6E90\u7801\uFF0C\u4E5F\u53EF\u80FD\u53EA\u5269\u90E8\u7F72\u4EA7\u7269)"],
      ...externalImports.length ? [`- \u5F53\u524D\u4F9D\u8D56\u767D\u540D\u5355\u547D\u4E2D: ${externalImports.join(", ")}`] : [],
      ...sourceSummary ? ["", sourceSummary] : [],
      "",
      "\u3010\u7ED9 AI \u7684\u64CD\u4F5C\u6307\u5357 / \u975E\u7528\u6237\u539F\u8BDD\u3011",
      "1. \u7528\u6237\u8981\u6C42\u4FEE\u6539\u5F53\u524D\u5E94\u7528\u65F6\uFF0C\u5148\u8C03\u7528 appRead \u83B7\u53D6\u5F53\u524D\u4EE3\u7801/\u6587\u4EF6\uFF0C\u518D\u57FA\u4E8E\u73B0\u6709\u5B9E\u73B0\u4FEE\u6539\u3002",
      "1b. \u5982\u679C appFileList / appFileSearch / appFileRead \u8FD4\u56DE 409\uFF08APP_WORKSPACE_MISSING / \u6E90\u7801\u5DE5\u4F5C\u533A\u7F3A\u5931\uFF09\u6216 400\uFF08UNSUPPORTED_APP_FRAMEWORK / \u4E0D\u662F Nolo React SSR\uFF09\uFF0C**\u7ACB\u5373\u505C\u6B62\u4FEE\u6539\uFF0C\u4E0D\u8981\u81EA\u5DF1\u7F16\u5360\u4F4D\u4EE3\u7801\u6216\u964D\u7EA7 framework \u53BB appDeploy**\u3002\u5148\u8C03\u7528 appVersionList(appId) \u67E5\u770B\u5386\u53F2\u7248\u672C\uFF0C\u9009\u4E00\u4E2A\u6700\u8FD1\u7684\u5B8C\u6574\u7248\u672C\u7528 appVersionRestore(appId, versionId) \u6062\u590D\uFF0C\u6062\u590D\u540E\u6E90\u7801\u5DE5\u4F5C\u533A\u4F1A\u91CD\u5EFA\uFF0C\u518D\u7EE7\u7EED\u4FEE\u6539\u3002\u5982\u679C\u6CA1\u6709\u5386\u53F2\u7248\u672C\uFF0C\u518D\u5411\u7528\u6237\u8BF4\u660E\u60C5\u51B5\u3002\u7EDD\u4E0D\u53EF\u4EE5\u7528 `fetch(appUrl)`\u3001\u7A7A\u4EE3\u7801\u3001\u5360\u4F4D\u4EE3\u7801\u53BB appDeploy\u2014\u2014\u90A3\u4F1A\u8986\u76D6\u73B0\u6709\u5E94\u7528\u5BFC\u81F4\u6570\u636E\u4E22\u5931\u3002",
      "2. \u5982\u679C appRead \u8FD4\u56DE workspaceRef/sourceFiles/sourceOmitted\uFF0C\u4E0D\u8981\u6574\u7AD9\u91CD\u5199\uFF1B\u4F7F\u7528 App Builder \u7684\u53D7\u9650 workspace \u6587\u4EF6\u5DE5\u5177\uFF1AappFileList=listFiles\u3001appFileSearch=searchFiles\u3001appFileRead=readFile\u3001appFileReplace=editFile\u3001appFileWrite=writeFile\u3002\u5148\u5B9A\u4F4D\u6587\u4EF6\u4E0E\u547D\u4E2D\u884C\uFF0C\u5927\u6587\u4EF6\u53EA\u8BFB\u53D6\u5FC5\u8981\u884C\u8303\u56F4\uFF1B\u6587\u5B57\u3001\u6837\u5F0F\u3001token\u3001\u5C40\u90E8\u903B\u8F91\u7B49\u5C0F\u6539\u52A8\u5FC5\u987B\u4F18\u5148\u7528 appFileReplace \u7CBE\u786E\u66FF\u6362\u552F\u4E00\u7247\u6BB5\uFF0C\u53EA\u6709\u65B0\u5EFA\u6587\u4EF6\u6216\u786E\u5B9E\u9700\u8981\u6574\u6587\u4EF6\u91CD\u5199\u65F6\u624D\u7528 appFileWrite\u3002",
      "3. \u5148\u8BC6\u522B\u5F53\u524D\u5E94\u7528\u662F\u5426\u5DF2\u6709 theme / tokens / design system\uFF1B\u5DF2\u6709\u5C31\u4F18\u5148\u6539\u8FD9\u5C42\uFF0C\u6CA1\u6709\u518D\u8865\u4E00\u5C42\u6700\u5C0F\u5171\u4EAB token\uFF0C\u518D\u57FA\u4E8E token \u8C03\u6574\u7EC4\u4EF6\u3002",
      "4. \u5982\u679C\u5F53\u524D\u5E94\u7528\u8FD8\u662F\u65E7\u5199\u6CD5\uFF1A\u89C6\u89C9\u503C\u6563\u843D\u5728\u7EC4\u4EF6\u786C\u7F16\u7801 style \u91CC\uFF0C\u800C\u7528\u6237\u53EA\u662F\u505A\u5B57\u4F53/\u989C\u8272/\u95F4\u8DDD\u7B49\u89C6\u89C9\u5FAE\u8C03\uFF0C\u9ED8\u8BA4\u5148\u628A\u547D\u4E2D\u7684\u89C6\u89C9\u503C\u62BD\u5230\u6700\u5C0F token \u5C42\uFF0C\u518D\u5B8C\u6210\u672C\u6B21\u4FEE\u6539\uFF1B\u9664\u975E\u7528\u6237\u660E\u786E\u8981\u6C42\u4E0D\u8981\u91CD\u6784\u3002",
      `5. \u91CD\u65B0\u90E8\u7F72\u5F53\u524D\u5E94\u7528\u65F6\uFF0CappDeploy \u5FC5\u987B\u7EE7\u7EED\u4F20\u540C\u4E00\u4E2A appId\uFF08${appId}\uFF09\uFF0C\u907F\u514D\u521B\u5EFA\u65B0\u5E94\u7528\u3002`,
      framework === "nolo-react" ? "6. \u5F53\u524D\u5E94\u7528\u662F Nolo React SSR\uFF0C\u4FEE\u6539\u65F6\u4F18\u5148\u4F7F\u7528\u53D7\u9650 app workspace \u6587\u4EF6\u5DE5\u5177\u64CD\u4F5C\u6E90\u7801\u5DE5\u4F5C\u533A\uFF0C\u7136\u540E appPreflight/appDeploy\uFF1B\u4E0D\u8981\u9000\u56DE react-spa \u6216\u5355\u6587\u4EF6 Worker\u3002" : framework === "react-spa" ? '6. \u5F53\u524D\u5E94\u7528\u662F React SPA\uFF0C\u4FEE\u6539\u65F6\u7EE7\u7EED\u6CBF\u7528 framework: "react-spa" + files\uFF0C\u4E0D\u8981\u9000\u56DE\u5355\u6587\u4EF6 Worker\u3002' : "6. \u5F53\u524D\u5E94\u7528\u76EE\u524D\u662F Worker \u5F62\u6001\uFF1B\u5982\u679C\u9700\u6C42\u53D8\u6210\u590D\u6742\u4EA4\u4E92\u6216\u56FE\u8868\uFF0C\u53EF\u4EE5\u8BC4\u4F30\u5347\u7EA7\u4E3A React SPA\u3002",
      ...fileNames.length ? [] : [
        "7. \u5F53\u524D\u6CA1\u6709\u6E90\u7801\u6587\u4EF6\u6E05\u5355\u65F6\uFF0C\u5FC5\u987B\u5148\u7528 appRead \u5224\u65AD\u8BFB\u5230\u7684\u662F\u53EF\u7EF4\u62A4\u6E90\u7801\u8FD8\u662F\u90E8\u7F72\u4EA7\u7269 / \u6253\u5305 bundle\u3002",
        "8. \u5982\u679C appRead \u8FD4\u56DE\u7684\u662F HTML \u58F3\u3001importmap\u3001\u538B\u7F29 bundle \u6216\u660E\u663E\u4E0D\u662F\u539F\u59CB\u6E90\u7801\u6587\u4EF6\uFF0C\u7981\u6B62\u5728\u672A\u544A\u77E5\u7528\u6237\u98CE\u9669\u7684\u60C5\u51B5\u4E0B\u6574\u7AD9\u91CD\u5199\uFF1B\u5E94\u5148\u8BF4\u660E\u201C\u5F53\u524D\u7F3A\u5C11\u539F\u59CB\u6E90\u7801\u5FEB\u7167\uFF0C\u7EE7\u7EED\u4FEE\u6539\u66F4\u50CF\u6574\u4F53\u91CD\u5EFA\u201D\uFF0C\u7B49\u7528\u6237\u786E\u8BA4\u540E\u518D\u7EE7\u7EED\u3002"
      ],
      "9. \u5982\u679C\u7528\u6237\u53EA\u662F\u8981\u8C03\u5B57\u4F53\u5927\u5C0F\u3001\u914D\u8272\u3001\u5706\u89D2\u3001\u9634\u5F71\u3001\u7559\u767D\u7B49\u89C6\u89C9\u7EC6\u8282\uFF0C\u9ED8\u8BA4\u4F18\u5148\u6539\u8BBE\u8BA1 token \u6216\u547D\u4E2D\u7684\u5C40\u90E8\u7EC4\u4EF6\uFF1B\u5BF9\u65E7\u5199\u6CD5\u5E94\u7528\u5219\u4F18\u5148\u505A\u6700\u5C0F token \u8FC1\u79FB\uFF0C\u4E0D\u8981\u53EA\u6539\u6563\u843D\u786C\u7F16\u7801\u3002",
      "10. \u6BCF\u6B21\u4FEE\u6539\u5B8C\u6210\u540E\uFF0C\u5148 appPreflight\uFF0C\u518D appDeploy\uFF1B\u5982\u679C\u5931\u8D25\uFF0C\u6309\u8FD4\u56DE issues \u5B9A\u70B9\u4FEE\u590D\u3002",
      "11. \u56DE\u590D\u7528\u6237\u65F6\u4F18\u5148\u8BF4\u660E\u505A\u4E86\u4EC0\u4E48\u53D8\u5316\u3001\u73B0\u5728\u5E94\u7528\u53EF\u4EE5\u600E\u4E48\u7528\uFF0C\u800C\u4E0D\u662F\u76F4\u63A5\u5806\u4EE3\u7801\u3002",
      ...formatAppConstraintPacks(constraintPacks)
    ].join("\n");
  }
  if (targetKind === "local_preview") {
    const metadata = runtimeOptions?.editingTarget?.metadata;
    const selectedNode = metadata && typeof metadata === "object" && metadata.selectedNode && typeof metadata.selectedNode === "object" ? metadata.selectedNode : null;
    if (!selectedNode) return null;
    const readString = (key) => typeof selectedNode[key] === "string" ? selectedNode[key] : "";
    const tagName = readString("tagName") || "\u5143\u7D20";
    const cssPath = readString("cssPath");
    const noloLoc = readString("noloLoc");
    const textSnippet = readString("textSnippet");
    const outerHTMLSnippet = readString("outerHTMLSnippet");
    return [
      "\u5F53\u524D\u7F16\u8F91\u76EE\u6807\uFF1A\u672C\u5730\u5DE5\u4F5C\u533A\u91CC\u6B63\u5728\u9884\u89C8\u7684\u7F51\u9875\uFF08Local Preview\uFF09\u3002",
      `\u7528\u6237\u5728\u9884\u89C8\u4E2D\u9009\u4E2D\u4E86\u4E00\u4E2A\u5143\u7D20\uFF1A<${tagName}>\uFF0CCSS \u8DEF\u5F84\uFF1A${cssPath}${noloLoc ? `\uFF0C\u6E90\u7801\u4F4D\u7F6E\uFF1A${noloLoc}` : ""}\u3002`,
      `\u9009\u4E2D\u5143\u7D20\u7684 HTML \u7247\u6BB5\uFF08\u53EF\u80FD\u622A\u65AD\uFF09\uFF1A${outerHTMLSnippet}${textSnippet ? `\uFF1B\u53EF\u89C1\u6587\u672C\uFF1A${textSnippet}` : ""}\u3002`,
      "",
      "\u3010\u7ED9 AI \u7684\u64CD\u4F5C\u6307\u5357 / \u975E\u7528\u6237\u539F\u8BDD\u3011",
      "1. \u672C\u8F6E\u4FEE\u6539\u5FC5\u987B\u4EE5\u8FD9\u4E2A\u5143\u7D20\u4E3A\u4E2D\u5FC3\uFF1B\u5148\u5728\u672C\u5730\u5DE5\u4F5C\u533A\u6E90\u7801\u4E2D\u5B9A\u4F4D\u5230\u751F\u6210\u8FD9\u6BB5 HTML \u7684\u4EE3\u7801\uFF0C\u518D\u52A8\u624B\u3002",
      noloLoc ? "2. \u5DF2\u7ED9\u51FA\u6E90\u7801\u4F4D\u7F6E\uFF0C\u76F4\u63A5\u8BFB\u8BE5\u6587\u4EF6\u7684\u5BF9\u5E94\u884C\u8303\u56F4\u786E\u8BA4\uFF0C\u4E0D\u8981\u5168\u5C40\u641C\u7D22\u3002" : "2. \u6CA1\u6709\u6E90\u7801\u4F4D\u7F6E\u65F6\uFF0C\u7528 CSS \u8DEF\u5F84\u91CC\u7684\u7C7B\u540D\u3001\u53EF\u89C1\u6587\u672C\u6216 HTML \u7247\u6BB5\u641C\u7D22\u5DE5\u4F5C\u533A\u5B9A\u4F4D\uFF0C\u4E0D\u8981\u51ED\u731C\u6D4B\u6539\u52A8\u3002",
      "3. \u4FEE\u6539\u6536\u655B\u5728\u8BE5\u5143\u7D20\u53CA\u5176\u76F4\u63A5\u6837\u5F0F\u6765\u6E90\uFF08\u547D\u4E2D\u7684\u7EC4\u4EF6/\u7C7B/design token\uFF09\uFF1B\u4FDD\u6301\u672A\u547D\u4E2D\u7684\u6587\u4EF6\u4E0D\u53D8\u3002",
      "4. \u5982\u679C\u5B9A\u4F4D\u7ED3\u679C\u843D\u5728 node_modules \u6216\u6765\u81EA\u63A5\u53E3\u6570\u636E\uFF0C\u5148\u544A\u8BC9\u7528\u6237\u5B9E\u9645\u60C5\u51B5\uFF0C\u518D\u63D0\u51FA\u53EF\u884C\u7684\u6539\u6CD5\uFF0C\u4E0D\u8981\u786C\u6539\u3002",
      "5. \u5982\u679C\u6309 CSS \u8DEF\u5F84\u548C HTML \u7247\u6BB5\u627E\u4E0D\u5230\u5BF9\u5E94\u4F4D\u7F6E\uFF0C\u5148\u5411\u7528\u6237\u8BF4\u660E\u5E76\u8BF7\u5176\u91CD\u65B0\u9009\u62E9\u3002"
    ].join("\n");
  }
  if (targetKind === "image" || targetKind === "file") {
    const editingTarget = runtimeOptions?.editingTarget;
    const metadata = editingTarget?.metadata;
    const title = editingTarget?.title ?? "(\u672A\u547D\u540D\u5BF9\u8C61)";
    const objectKey = editingTarget?.key ?? "(\u672A\u77E5 key)";
    const fileId = typeof metadata?.fileId === "string" ? metadata.fileId : null;
    const url = typeof metadata?.url === "string" ? metadata.url : null;
    const size = typeof metadata?.size === "number" ? metadata.size : null;
    return [
      `\u5F53\u524D\u7F16\u8F91\u76EE\u6807\uFF1A\u4E00\u4E2A${targetKind === "image" ? "\u56FE\u7247" : "\u6587\u4EF6"}\u5BF9\u8C61\uFF08Editing ${targetKind === "image" ? "Image" : "File"}\uFF09\u3002`,
      `- \u5BF9\u8C61 key: ${objectKey}`,
      `- \u6807\u9898: ${title}`,
      ...fileId ? [`- fileId: ${fileId}`] : [],
      ...url ? [`- \u8D44\u6E90\u5730\u5740: ${url}`] : [],
      ...size !== null ? [`- \u6587\u4EF6\u5927\u5C0F: ${size} bytes`] : [],
      "",
      "\u3010\u7ED9 AI \u7684\u64CD\u4F5C\u6307\u5357 / \u975E\u7528\u6237\u539F\u8BDD\u3011",
      targetKind === "image" ? "\u5F53\u524D\u9636\u6BB5\u4F18\u5148\u5E2E\u52A9\u7528\u6237\u7406\u89E3\u56FE\u7247\u5185\u5BB9\u3001\u63D0\u70BC\u91CD\u70B9\u3001\u547D\u540D\u5F52\u7C7B\u548C\u4E0B\u4E00\u6B65\u5904\u7406\u5EFA\u8BAE\u3002\u4E0D\u8981\u5047\u88C5\u5DF2\u7ECF\u5B8C\u6210\u590D\u6742\u56FE\u7247\u7F16\u8F91\u3002" : "\u5F53\u524D\u9636\u6BB5\u4F18\u5148\u5E2E\u52A9\u7528\u6237\u7406\u89E3\u6587\u4EF6\u7528\u9014\u3001\u63D0\u53D6\u5904\u7406\u601D\u8DEF\u3001\u7ED9\u51FA\u6574\u7406\u5EFA\u8BAE\u548C\u4E0B\u4E00\u6B65\u64CD\u4F5C\u5EFA\u8BAE\u3002\u4E0D\u8981\u5047\u88C5\u5DF2\u7ECF\u5B8C\u6574\u89E3\u6790\u6587\u4EF6\u5185\u5BB9\u3002"
    ].join("\n");
  }
  if (targetKind === "canvas_node") {
    return buildCanvasNodeEditingContextSummary(runtimeOptions);
  }
  return null;
};

// packages/ai/agent/appWorkingMemory.ts
var APP_TOOL_NAMES = /* @__PURE__ */ new Set([
  "appList",
  "appRead",
  "appDeploy",
  "appPreflight",
  "appDelete"
]);
var contentToText = (content) => {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => "text" in part ? part.text ?? "" : "").join("\n");
  }
  return "";
};
var parseAppListEntries = (text) => text.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("- **") && line.includes("(appId:"));
var buildRecentAppToolMemory = (messages, toolRuns) => {
  const messageById = new Map(messages.map((msg) => [msg.id, msg]));
  const recentRuns = [...toolRuns].filter((run) => APP_TOOL_NAMES.has(run.toolName)).sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)).slice(0, 8);
  if (recentRuns.length === 0) return null;
  const lines = [
    "\u8FD9\u4E9B\u4FE1\u606F\u6765\u81EA\u5F53\u524D\u5BF9\u8BDD\u91CC\u6700\u8FD1\u7684 app \u5DE5\u5177\u8C03\u7528\uFF0C\u4E0D\u4F9D\u8D56\u53F3\u4FA7\u7F16\u8F91\u6001\u3002"
  ];
  const latestDeployLike = recentRuns.find(
    (run) => ["appDeploy", "appRead", "appPreflight"].includes(run.toolName)
  );
  if (latestDeployLike) {
    const input = latestDeployLike.input ?? {};
    const parts = [
      `- \u6700\u8FD1\u4E00\u6B21\u5173\u952E app \u64CD\u4F5C: ${latestDeployLike.toolName}`,
      typeof input.appId === "string" ? `appId=${input.appId}` : null,
      typeof input.name === "string" ? `name=${input.name}` : null,
      typeof input.framework === "string" ? `framework=${input.framework}` : null
    ].filter(Boolean);
    lines.push(parts.join("\uFF0C"));
  }
  const relatedMessages = recentRuns.map((run) => messageById.get(run.messageId)).filter((msg) => !!msg);
  const appListMessage = relatedMessages.find((msg) => msg.toolName === "appList");
  if (appListMessage) {
    const entries = parseAppListEntries(contentToText(appListMessage.content)).slice(0, 5);
    if (entries.length > 0) {
      lines.push("- \u6700\u8FD1\u4E00\u6B21 appList \u7ED3\u679C\uFF1A");
      lines.push(...entries.map((entry) => `  ${entry}`));
    }
  }
  const latestReadMessage = relatedMessages.find((msg) => msg.toolName === "appRead");
  if (latestReadMessage) {
    const text = contentToText(latestReadMessage.content);
    const appId = text.match(/- appId:\s*(.+)/)?.[1]?.trim();
    const url = text.match(/- 访问地址:\s*(.+)/)?.[1]?.trim();
    if (appId || url) {
      lines.push(
        [
          "- \u6700\u8FD1\u4E00\u6B21 appRead \u771F\u503C:",
          appId ? `appId=${appId}` : null,
          url ? `url=${url}` : null
        ].filter(Boolean).join("\uFF0C")
      );
    }
  }
  const latestPreflightRun = recentRuns.find((run) => run.toolName === "appPreflight");
  if (latestPreflightRun) {
    lines.push(
      [
        "- \u6700\u8FD1\u4E00\u6B21 appPreflight:",
        latestPreflightRun.status === "failed" ? "\u5931\u8D25" : "\u5DF2\u6267\u884C",
        latestPreflightRun.outputSummary ? `\u6458\u8981=${latestPreflightRun.outputSummary}` : null
      ].filter(Boolean).join("\uFF0C")
    );
  }
  const latestDeployMessage = relatedMessages.find((msg) => msg.toolName === "appDeploy");
  if (latestDeployMessage) {
    const text = contentToText(latestDeployMessage.content);
    const appId = text.match(/- appId:\s*(.+)/)?.[1]?.trim();
    const url = text.match(/- 访问地址:\s*(.+)/)?.[1]?.trim();
    if (appId || url) {
      lines.push(
        [
          "- \u6700\u8FD1\u4E00\u6B21 appDeploy \u7ED3\u679C:",
          appId ? `appId=${appId}` : null,
          url ? `url=${url}` : null
        ].filter(Boolean).join("\uFF0C")
      );
    }
  }
  lines.push(
    "- \u5982\u679C\u7528\u6237\u8BF4\u201C\u521A\u624D\u90A3\u4E2A app / \u90A3\u4E2A\u7F51\u7AD9\u201D\uFF0C\u4F18\u5148\u628A\u5B83\u7406\u89E3\u4E3A\u4E0A\u9762\u6700\u8FD1\u4E00\u6B21\u88AB\u8BFB\u53D6\u3001\u9884\u68C0\u6216\u90E8\u7F72\u7684\u5E94\u7528\uFF1B\u82E5\u4ECD\u6709\u6B67\u4E49\uFF0C\u518D\u7528 appList \u6216 appRead \u786E\u8BA4\u3002"
  );
  return lines.join("\n");
};

// packages/ai/agent/streamAgentChatTurnUtils.ts
var BROWSER_UNAVAILABLE_CORE_TOOLS = {
  queryModelUsage: true,
  createAgentAutomation: true,
  notifyUser: true
};
var getRuntimeCoreTools = () => {
  if (typeof window === "undefined") {
    return [...TOOL_PACKS.CORE];
  }
  return TOOL_PACKS.CORE.filter(
    (toolName) => !BROWSER_UNAVAILABLE_CORE_TOOLS[toolName]
  );
};
var isInlineVisualArtifactAgent = (agentConfig) => {
  const tags = Array.isArray(agentConfig.tags) ? agentConfig.tags : [];
  return tags.some(
    (tag) => typeof tag === "string" && ["inline-artifact", "streaming-ui"].includes(tag)
  );
};
var estimateTokensOfMessage = (msg) => {
  let content = "";
  if (typeof msg.content === "string") {
    content = msg.content;
  } else if (Array.isArray(msg.content)) {
    content = msg.content.map((p) => {
      if (p.type === "text") return p.text || "";
      if (p.type === "image_url") return "[image]";
      return "[non-text]";
    }).join("");
  } else if (msg.content && typeof msg.content === "object") {
    content = JSON.stringify(msg.content);
  }
  let extraTokens = 0;
  if (Array.isArray(msg.tool_calls)) {
    const toolsStr = JSON.stringify(msg.tool_calls);
    extraTokens = estimateTokenCount(toolsStr);
  }
  return estimateTokenCount(content) + extraTokens;
};
var classifyConversationLoad = (messages) => {
  const N = 20;
  if (!Array.isArray(messages) || messages.length === 0) return "light";
  const tail = messages.slice(-N);
  const tokenSamples = tail.map(estimateTokensOfMessage);
  if (tokenSamples.length === 0) return "light";
  const sum = tokenSamples.reduce((acc, v) => acc + v, 0);
  const avg = sum / tokenSamples.length;
  const sorted = [...tokenSamples].sort((a, b) => a - b);
  const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)];
  if (p95 < 200 && avg < 120) {
    return "light";
  }
  if (p95 > 2e3 || avg > 1200) {
    return "heavy";
  }
  return "medium";
};
var compressOldToolResults = (messages, maxChars = 800) => {
  let lastToolCallAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant" && Array.isArray(messages[i].tool_calls) && messages[i].tool_calls.length > 0) {
      lastToolCallAssistantIdx = i;
      break;
    }
  }
  return messages.map((msg, idx) => {
    if (msg.role !== "tool") return msg;
    const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    const projected = projectToolMessageContent({
      content,
      isFresh: idx > lastToolCallAssistantIdx,
      toolName: msg.name,
      historicalMaxChars: maxChars
    });
    if (projected === content) return msg;
    return { ...msg, content: projected };
  });
};
var trimMessagesWithSummary = (messages, contextWindow, summaryTokenCount) => {
  const recentLoad = classifyConversationLoad(messages);
  const { rawMessageBudget, minTailTokens } = planContextUsage({
    contextWindow,
    summaryTokens: summaryTokenCount,
    recentLoad
  });
  if (!Array.isArray(messages) || messages.length === 0) return messages;
  let totalTokens = 0;
  let keepCount = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = estimateTokensOfMessage(messages[i]);
    if (totalTokens + t > rawMessageBudget) break;
    totalTokens += t;
    keepCount++;
  }
  if (keepCount >= messages.length) {
    return messages;
  }
  if (totalTokens < minTailTokens) {
    const maxBudgetWithSlack = rawMessageBudget * 1.2;
    for (let i = messages.length - 1 - keepCount; i >= 0; i--) {
      const t = estimateTokensOfMessage(messages[i]);
      if (totalTokens + t > maxBudgetWithSlack) break;
      totalTokens += t;
      keepCount++;
      if (totalTokens >= minTailTokens) break;
    }
  }
  if (keepCount === 0 && messages.length > 0) {
    keepCount = Math.min(2, messages.length);
  }
  let cutIndex = messages.length - keepCount;
  if (cutIndex < 0) cutIndex = 0;
  while (cutIndex > 0 && messages[cutIndex]?.role === "tool") {
    cutIndex--;
  }
  return messages.slice(cutIndex);
};
var createDbSliceTurnContextSource = (dispatch) => ({
  readRecord: async (dbKey) => {
    const result = await dispatch(read({ dbKey })).unwrap();
    return result ?? null;
  }
});
var joinMapValues = (map) => Array.from(map.values()).join("");
var hasImageInMessages = (messages) => {
  if (!Array.isArray(messages)) return false;
  return messages.some((msg) => {
    const content = msg.content;
    if (!Array.isArray(content)) return false;
    return content.some(
      (part) => part && typeof part === "object" && part.type === "image_url" && part.image_url && typeof part.image_url.url === "string" && part.image_url.url.trim() !== ""
    );
  });
};
var REJECT_NO_VISION_MESSAGE = "\u5F53\u524D Agent \u4E0D\u652F\u6301\u56FE\u7247\u8F93\u5165\uFF0C\u8BF7\u6539\u7528\u6587\u672C\u6216\u6587\u6863\u3002";
function shouldRejectImageInputForAgent(agentConfig, messages) {
  const agentHasVision = resolveAgentImageInputSupport(agentConfig);
  if (!agentHasVision && hasImageInMessages(messages)) {
    return REJECT_NO_VISION_MESSAGE;
  }
  return null;
}
var formatCurrentInputContext = (pendingFiles, currentInputMap) => {
  if (pendingFiles.length === 0 || currentInputMap.size === 0) {
    return joinMapValues(currentInputMap);
  }
  const relevantPendingFiles = pendingFiles.filter((file) => {
    const key = file.sourceDialogKey || file.dialogKey || file.pageKey;
    return key && currentInputMap.has(key);
  });
  if (relevantPendingFiles.length === 0) {
    return joinMapValues(currentInputMap);
  }
  const filesByGroup = /* @__PURE__ */ new Map();
  for (const file of relevantPendingFiles) {
    const groupKey = file.groupId || file.id;
    const group = filesByGroup.get(groupKey);
    if (group) {
      group.push(file);
    } else {
      filesByGroup.set(groupKey, [file]);
    }
  }
  let sourceCounter = 1;
  let output = "";
  filesByGroup.forEach((filesInGroup) => {
    const isGroup = filesInGroup.length > 1;
    const sourceName = isGroup ? filesInGroup[0].name.split(" (")[0] : filesInGroup[0].name;
    output += `--- Source ${sourceCounter}: "${sourceName}" ---
`;
    filesInGroup.forEach((file) => {
      const key = file.sourceDialogKey || file.dialogKey || file.pageKey;
      if (!key) return;
      const content = currentInputMap.get(key);
      if (!content) return;
      if (isGroup) {
        output += `### Document: "${file.name}"
${content}
`;
      } else {
        output += `${content}
`;
      }
    });
    output += `--- End of Source ${sourceCounter} ---

`;
    sourceCounter++;
  });
  return output;
};
var validateAccessAndBalance = (agentConfig, state) => {
  const userBalance = selectCurrentUserBalance(state);
  const currentUserId = selectIdentityUserId(state);
  const isCustomApi = agentConfig.apiSource === "custom";
  const isCliApi = agentConfig.apiSource === "cli";
  const isDeviceLocalOwner = agentConfig.userId === "local" && !currentUserId;
  const isOwner = isDeviceLocalOwner || Boolean(currentUserId) && agentConfig.userId === currentUserId;
  if (!isOwner) {
    const hasWhitelist = Array.isArray(agentConfig.whitelist) && agentConfig.whitelist.length > 0;
    if (hasWhitelist) {
      const isUserInWhitelist = !!currentUserId && agentConfig.whitelist?.includes(currentUserId);
      if (!isUserInWhitelist) {
        return "\u60A8\u4E0D\u5728\u8BE5\u5E94\u7528\u7684\u767D\u540D\u5355\u4E2D\uFF0C\u65E0\u6CD5\u4F7F\u7528\u3002";
      }
    }
  }
  if (isCustomApi || isCliApi) {
    return null;
  }
  const SUBSCRIPTION_OAUTH_REFS = /* @__PURE__ */ new Set([
    "cursor",
    "chatgpt",
    "xai",
    "antigravity",
    "claude"
  ]);
  if (SUBSCRIPTION_OAUTH_REFS.has((agentConfig.apiKeyRef ?? "").trim().toLowerCase())) {
    return null;
  }
  const isPlatformApi = agentConfig.apiSource === "platform" || agentConfig.useServerProxy === true;
  if (isDeviceLocalOwner && !isPlatformApi) {
    return null;
  }
  if (typeof userBalance !== "number") {
    const hasSessionUser = Boolean(
      state?.auth?.currentUser?.userId
    );
    if (!currentUserId || !hasSessionUser) {
      return "\u8BF7\u767B\u5F55\u540E\u4F7F\u7528\u5E73\u53F0\u6A21\u578B\uFF0C\u6216\u6539\u7528\u672C\u5730\u81EA\u5B9A\u4E49/API/CLI Agent\u3002";
    }
    return "\u6B63\u5728\u83B7\u53D6\u7528\u6237\u4F59\u989D\uFF0C\u8BF7\u7A0D\u5019...";
  }
  const serverPrices = getModelPricing(agentConfig.provider || "", agentConfig.model);
  if (!serverPrices && !hasExplicitAgentPricing(agentConfig)) {
    return "\u65E0\u6CD5\u83B7\u53D6\u6A21\u578B\u5B9A\u4EF7\u4FE1\u606F\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002";
  }
  const prices = getPrices(agentConfig, serverPrices ?? null);
  const maxPrice = getFinalPrice(prices);
  if (userBalance < maxPrice) {
    return "\u4F59\u989D\u4E0D\u8DB3\uFF0C\u8BF7\u5145\u503C\u540E\u518D\u8BD5\u3002";
  }
  return null;
};
var fetchMemoryOverlayContext = async (state, agentConfig, userInput, dialogConfig) => {
  const token = typeof state?.auth?.currentToken === "string" ? state.auth.currentToken : null;
  const currentServer = typeof state?.settings?.currentServer === "string" ? state.settings.currentServer : null;
  const agentKey = asOptionalTrimmedString(agentConfig.dbKey) ?? "";
  if (!token || !currentServer || !agentKey) return null;
  const baseUrl = resolveToolBaseUrl(currentServer);
  if (!baseUrl) return null;
  const inputText = typeof userInput === "string" ? userInput : JSON.stringify(userInput ?? "");
  const spaceId = asOptionalTrimmedString(dialogConfig?.spaceId) ?? (state?.space?.viewMode === "all" ? void 0 : asOptionalTrimmedString(state?.space?.currentSpaceId));
  try {
    const response = await fetch(`${baseUrl}/api/memory/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        agentKey,
        userInput: inputText,
        ...spaceId ? { spaceId } : {}
      })
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return asOptionalTrimmedString(payload?.promptBlock) ?? null;
  } catch {
    return null;
  }
};
var buildStaticContexts = async (state, dispatch, agentConfig, dialogConfig, referenceContentCache) => {
  const keySets = await getFullChatContextKeys(
    state,
    dispatch,
    agentConfig,
    "",
    // 静态上下文不需要 userInput
    void 0
    // 静态上下文不需要 dialogConfig
  );
  const finalKeys = deduplicateContextKeys(keySets);
  const fetchReferences = (keys) => fetchReferenceContents(keys, dispatch, {
    format: "simplified_markdown",
    inlineMentionMeta: true,
    preloaded: referenceContentCache
  });
  const [botInstructionsMap, botKnowledgeMap] = await Promise.all([
    fetchReferences(finalKeys.botInstructionsContext),
    fetchReferences(finalKeys.botKnowledgeContext)
  ]);
  const globalPrompt = selectGlobalPrompt(state);
  const userTonePreset = selectUserTonePreset(state);
  const knowledgeCaptureLevel = selectKnowledgeCaptureLevel(state);
  const spaceContextLevel = selectSpaceContextLevel(state);
  const userRecentLimit = selectAiRecentContentLimit(state);
  const contextWindow = getModelContextWindow(agentConfig.model) || 128e3;
  const preloadPlan = resolveSpaceContextPreloadPlan(spaceContextLevel);
  const dynamicLimit = Math.floor(contextWindow * preloadPlan.preloadBudgetRatio / 150);
  const recentLimit = preloadPlan.includeRecentContent ? Math.max(3, Math.min(userRecentLimit, Math.max(3, dynamicLimit))) : 0;
  const turnContextSource = createDbSliceTurnContextSource(dispatch);
  let spaceContext = null;
  if (spaceContextLevel > 1) {
    const spaceLayer = await buildSpaceContextLayer({
      source: turnContextSource,
      spaceId: dialogConfig?.spaceId,
      recentContentLimit: recentLimit
    });
    spaceContext = spaceLayer ? spaceLayer.content.trim() : null;
  }
  const linkedSpaceIds = agentConfig.linkedSpaces || [];
  if (linkedSpaceIds.length > 0 && spaceContextLevel > 1) {
    const linkedSection = await buildLinkedSpacesSection({
      source: turnContextSource,
      linkedSpaceIds
    });
    if (linkedSection) {
      spaceContext = (spaceContext ?? "") + `

${linkedSection}`;
    }
  }
  const dialogPolicyContext = dialogConfig?.category === PERSONALIZATION_DIALOG_CATEGORY ? buildPersonalizationDialogPolicyContext() : null;
  return {
    botInstructionsContext: joinMapValues(botInstructionsMap),
    botKnowledgeContext: joinMapValues(botKnowledgeMap),
    spaceContext,
    userGlobalPrompt: globalPrompt,
    userPolicyContext: [
      buildStaticUserPolicyContext({
        agentConfig,
        settingsRecord: {
          userTonePreset,
          knowledgeCaptureLevel,
          spaceContextLevel,
          enableReadCurrentSpace: spaceContextLevel > 1
        }
      }),
      dialogPolicyContext
    ].filter(Boolean).join("\n")
  };
};
var buildDynamicContexts = async (state, dispatch, agentConfig, userInput, runtimeOptions, referenceContentCache, dialogKey) => {
  let dialogSummary = null;
  let dialogConfig;
  if (dialogKey) {
    dialogConfig = selectById(state, dialogKey);
    if (dialogConfig?.summary) {
      dialogSummary = dialogConfig.summary;
    }
  }
  const keySets = await getFullChatContextKeys(
    state,
    dispatch,
    agentConfig,
    userInput,
    dialogConfig
  );
  const finalKeys = deduplicateContextKeys(keySets);
  const fetchReferences = (keys) => fetchReferenceContents(keys, dispatch, {
    format: "simplified_markdown",
    inlineMentionMeta: true,
    preloaded: referenceContentCache
  });
  const [currentInputMap, historyMap] = await Promise.all([
    fetchReferences(finalKeys.currentInputContext),
    fetchReferences(finalKeys.historyContext)
  ]);
  const pendingFiles = selectPendingFiles(state);
  const formattedCurrentInputContext = formatCurrentInputContext(
    pendingFiles,
    currentInputMap
  );
  const dialogId = dialogConfig?.id ?? null;
  const currentDialogMessages = selectAllMsgs(state, dialogId);
  const currentDialogMessageIds = new Set(currentDialogMessages.map((msg) => msg.id));
  const currentDialogToolRuns = getAllToolRuns().filter(
    (run) => currentDialogMessageIds.has(run.messageId)
  );
  const editingContext = buildEditingContextSummary(state, runtimeOptions);
  const appWorkingMemory = buildRecentAppToolMemory(
    currentDialogMessages,
    currentDialogToolRuns
  );
  const memoryOverlay = await fetchMemoryOverlayContext(
    state,
    agentConfig,
    userInput,
    dialogConfig
  );
  return {
    currentInputContext: formattedCurrentInputContext.trim() || null,
    historyContext: joinMapValues(historyMap),
    editingContext,
    appWorkingMemory,
    memoryOverlay,
    dialogSummary,
    referenceKeys: dialogConfig?.referenceKeys || []
  };
};
var mergeContexts = (staticCtx, dynamicCtx) => ({
  botInstructionsContext: staticCtx.botInstructionsContext || void 0,
  botKnowledgeContext: staticCtx.botKnowledgeContext || void 0,
  spaceContext: staticCtx.spaceContext || void 0,
  userGlobalPrompt: staticCtx.userGlobalPrompt || void 0,
  userPolicyContext: staticCtx.userPolicyContext || void 0,
  currentInputContext: dynamicCtx.currentInputContext,
  historyContext: dynamicCtx.historyContext || void 0,
  editingContext: dynamicCtx.editingContext,
  appWorkingMemory: dynamicCtx.appWorkingMemory,
  memoryOverlay: dynamicCtx.memoryOverlay,
  dialogSummary: dynamicCtx.dialogSummary,
  referenceKeys: dynamicCtx.referenceKeys
});
var mergeAgentToolsWithRuntime = (agentConfig, referencedTools, mentionedTools, runtimeOptions, state) => {
  const rawBaseTools = Array.isArray(agentConfig.tools) ? agentConfig.tools : [];
  const agentEnabledPacks = agentConfig?.enabledPacks;
  const isInlineArtifact = isInlineVisualArtifactAgent(agentConfig);
  const effectiveEnabledPacks = resolveEffectiveEnabledPacks({
    enabledPacks: Array.isArray(agentEnabledPacks) ? agentEnabledPacks : [],
    declaredOnly: isInlineArtifact
  });
  const expandedPackTools = expandEnabledPacks(
    effectiveEnabledPacks,
    rawBaseTools
  );
  const baseTools = canonicalizeToolNames(expandedPackTools);
  const requiredSkillTools = canonicalizeToolNames(
    agentConfig.referencedTools ?? []
  );
  const recommendedSkillTools = canonicalizeToolNames(
    agentConfig.recommendedSkillTools ?? []
  );
  const recommendedSkillHints = [
    ...new Set(asNonEmptyStringArray(agentConfig.recommendedSkillHints))
  ];
  const skillPromptPatches = [
    .../* @__PURE__ */ new Set([
      ...asNonEmptyStringArray(agentConfig.skillPromptPatches),
      // 能力包的 promptPatch（方法论文档）与 skill reference 的 patch 走同一条
      // 注入链（buildSkillGuidanceBlock → buildSkillGuidancePromptBlock），
      // 让「工具 + 配套纪律」作为一个能力包整体注入 system prompt。
      ...expandEnabledPackPromptPatches(effectiveEnabledPacks)
    ])
  ];
  const webPadded = applyDefaultWebToolPacks({
    toolNames: baseTools,
    skipWeb: isInlineVisualArtifactAgent(agentConfig)
  });
  const enhancedTools = /* @__PURE__ */ new Set([
    ...webPadded,
    ...isInlineVisualArtifactAgent(agentConfig) ? [] : getRuntimeCoreTools(),
    ...isInlineVisualArtifactAgent(agentConfig) ? [] : requiredSkillTools,
    ...isInlineVisualArtifactAgent(agentConfig) ? [] : canonicalizeToolNames(referencedTools),
    ...isInlineVisualArtifactAgent(agentConfig) ? [] : canonicalizeToolNames(mentionedTools)
  ]);
  const extraTools = isInlineVisualArtifactAgent(agentConfig) ? [] : canonicalizeToolNames(runtimeOptions?.extraTools ?? []);
  for (const t of extraTools) {
    enhancedTools.add(t);
  }
  if (!isInlineVisualArtifactAgent(agentConfig)) {
    const viewMode = state ? selectViewMode(state) : "categories";
    if (viewMode === "all") {
      enhancedTools.delete("search_workspace");
      enhancedTools.add("search_all_spaces");
    } else {
      enhancedTools.delete("search_all_spaces");
      enhancedTools.add("search_workspace");
    }
  }
  const systemBuiltinSkills = state?.settings?.systemBuiltinSkills;
  const mountedTools = isInlineVisualArtifactAgent(agentConfig) ? Array.from(enhancedTools) : addDefaultSystemCapabilityTools(Array.from(enhancedTools));
  const filteredTools = applySystemBuiltinSkillFilter(
    mountedTools,
    systemBuiltinSkills
  );
  return {
    ...agentConfig,
    tools: applyDisabledTools(
      prioritizeToolNames(
        filteredTools,
        recommendedSkillTools
      ),
      agentConfig?.disabledTools
    ),
    recommendedSkillTools,
    recommendedSkillHints,
    skillPromptPatches
  };
};
var applyImageConfigRuntimeOverride = (agentConfig, runtimeOptions) => {
  const override = runtimeOptions?.imageConfigOverride;
  if (!override) {
    return agentConfig;
  }
  const baseImageConfig = agentConfig.imageConfig ?? {};
  return {
    ...agentConfig,
    ...override.imageModelOverride ? { model: override.imageModelOverride } : {},
    imageConfig: {
      ...baseImageConfig,
      ...override
    }
  };
};
var formatImageWaitHint = (range) => {
  if (!range || typeof range.min !== "number" || typeof range.max !== "number") {
    return void 0;
  }
  return `\u901A\u5E38\u9700\u8981 ${range.min}-${range.max} \u79D2`;
};
var resolveAgentImageModelIdentity = (agentConfig) => {
  let providerKey = (agentConfig.provider || "").toLowerCase();
  let modelName = agentConfig.model ?? "";
  if (modelName.includes("/")) {
    const slash = modelName.indexOf("/");
    if (!providerKey) providerKey = modelName.slice(0, slash);
    modelName = modelName.slice(slash + 1);
  }
  try {
    return {
      providerKey,
      modelConfig: getModelConfig(providerKey, modelName)
    };
  } catch {
    try {
      const detected = getProviderByModelName(modelName);
      if (!detected) {
        return { providerKey, modelConfig: null };
      }
      return {
        providerKey: detected,
        modelConfig: getModelConfig(detected, modelName)
      };
    } catch {
      return { providerKey, modelConfig: null };
    }
  }
};
var EXPLICIT_IMAGE_GENERATION_TOOL_NAMES = /* @__PURE__ */ new Set([
  "openAIGptImage",
  "openAIGptImageGenerate",
  "openAIGptImageEdit",
  "chatgptWebImageGenerate",
  "geminiFlashImage",
  "geminiProImagePreview"
]);
var agentUsesExplicitImageGenerationTool = (agentConfig) => {
  const toolNames = Array.isArray(agentConfig.tools) ? agentConfig.tools : Array.isArray(agentConfig.toolNames) ? agentConfig.toolNames : [];
  return toolNames.some(
    (name) => typeof name === "string" && EXPLICIT_IMAGE_GENERATION_TOOL_NAMES.has(name.trim())
  );
};
var resolveImageGenerationStreamingState = (agentConfig, args) => {
  const { modelConfig } = resolveAgentImageModelIdentity(agentConfig);
  const hasImageOutput = !!(modelConfig?.hasImageOutput ?? modelConfig?.supportsImageOutput) || agentConfig.imageConfig?.enabled === true || agentUsesExplicitImageGenerationTool(agentConfig);
  if (!hasImageOutput) {
    return void 0;
  }
  const currentProfile = modelConfig?.imageGenerationProfiles?.find(
    (profile) => profile.imageModel === modelConfig.name
  );
  const usesWebImageTool = agentUsesExplicitImageGenerationTool(agentConfig) && (Array.isArray(agentConfig.tools) ? agentConfig.tools : []).includes("chatgptWebImageGenerate");
  return {
    kind: "image_generation",
    stage: args?.stage ?? args?.previous?.stage ?? "submitted",
    startedAt: args?.previous?.startedAt ?? Date.now(),
    waitHint: formatImageWaitHint(modelConfig?.imageGenerationWaitTimeSeconds) ?? (usesWebImageTool ? "\u7F51\u9875\u751F\u56FE\u901A\u5E38\u9700\u8981 30 \u79D2\u5230\u51E0\u5206\u949F\uFF0C\u5207\u6362\u5BF9\u8BDD\u4E0D\u4F1A\u4E2D\u65AD" : "\u901A\u5E38\u9700\u8981\u51E0\u5341\u79D2"),
    profileLabel: currentProfile?.label
  };
};

// packages/ai/agent/cliPrompt.ts
function buildCliPrompt(systemPrompt, taskPrompt) {
  if (!systemPrompt?.trim()) return taskPrompt;
  return `[\u89D2\u8272\u8BBE\u5B9A]
${systemPrompt.trim()}

[\u5F53\u524D\u4EFB\u52A1]
${taskPrompt.trim()}`;
}

// packages/ai/agent/persistMessageWithFixedId.ts
async function persistMessageWithFixedId(dispatch, message) {
  dispatch(addUserMessage(message));
  const { controller, ...messageToWrite } = message;
  try {
    const writeRequest = dispatch(
      write({
        data: {
          ...messageToWrite,
          type: "msg" /* MSG */
        },
        customKey: message.dbKey
      })
    );
    if (writeRequest && typeof writeRequest.unwrap === "function") {
      await writeRequest.unwrap();
      return;
    }
    await writeRequest;
  } catch (error) {
    console.error(
      "[persistMessageWithFixedId] Failed to persist fixed-id message:",
      error
    );
  }
}

// packages/ai/agent/serverOrigin.ts
var normalizeServerOrigin = (base) => {
  try {
    return new URL(base).origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
};

// packages/agent-runtime/desktopRequestSnapshot.ts
var DESKTOP_AGENT_CONFIG_SNAPSHOT_STRING_FIELDS = [
  "name",
  "prompt",
  "provider",
  "model",
  "apiSource",
  "cliProvider",
  "customProviderUrl",
  "credentialRef",
  "apiKeyRef",
  "apiKeyHeader",
  "reasoning_effort",
  "reasoningEffort"
];
var DESKTOP_AGENT_CONFIG_SNAPSHOT_NUMBER_FIELDS = [
  "temperature",
  "top_p",
  "frequency_penalty",
  "presence_penalty",
  "max_tokens"
];
var DESKTOP_AGENT_CONFIG_SNAPSHOT_OBJECT_FIELDS = [
  "runtimeBinding",
  "runtimeToolPolicy",
  "delegation"
];
var DESKTOP_AGENT_CONFIG_SNAPSHOT_FORBIDDEN_KEYS = [
  "apiKey",
  "apiKeyFromAgentKey",
  "token",
  "secret",
  "password",
  "accessToken",
  "refreshToken",
  "authorization",
  "authToken",
  "AUTH_TOKEN",
  "AUTH",
  "clientSecret",
  "privateKey",
  "bearer"
];
var DESKTOP_TOOL_CALL_ARGUMENTS_MAX_CHARS = 8192;
var REDACTED_SECRET_PLACEHOLDER = "[redacted]";
var FORBIDDEN_KEY_SET = new Set(
  DESKTOP_AGENT_CONFIG_SNAPSHOT_FORBIDDEN_KEYS.map((k) => k.toLowerCase())
);
function isForbiddenKey(key) {
  return FORBIDDEN_KEY_SET.has(key.toLowerCase());
}
function isDesktopSnapshotSensitivePropertyName(key) {
  return isForbiddenKey(key);
}
function redactSensitiveJsonTree(value, depth = 0) {
  if (depth > 6) return null;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveJsonTree(item, depth + 1));
  }
  if (typeof value !== "object") return null;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (isDesktopSnapshotSensitivePropertyName(key)) {
      out[key] = REDACTED_SECRET_PLACEHOLDER;
      continue;
    }
    out[key] = redactSensitiveJsonTree(child, depth + 1);
  }
  return out;
}
function sanitizeToolCallArguments(raw, maxChars = DESKTOP_TOOL_CALL_ARGUMENTS_MAX_CHARS) {
  const source = typeof raw === "string" ? raw : raw == null ? "{}" : String(raw);
  let candidate = source;
  try {
    const parsed = JSON.parse(source);
    if (parsed && typeof parsed === "object") {
      candidate = JSON.stringify(redactSensitiveJsonTree(parsed));
    }
  } catch {
  }
  if (candidate.length <= maxChars) return candidate;
  return candidate.slice(0, maxChars);
}
function stringField(record, key) {
  return asOptionalTrimmedString(record[key]);
}
function numberField(record, key) {
  return asOptionalFiniteNumber(record[key]);
}
function uniqueToolNames(values) {
  if (!Array.isArray(values)) return void 0;
  const names = [];
  const seen = /* @__PURE__ */ new Set();
  for (const value of values) {
    const name = asTrimmedString(value) || asTrimmedString(value?.name) || asTrimmedString(
      value?.function?.name
    );
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names.length > 0 ? names : void 0;
}
function sanitizePlainObject(value, depth = 0) {
  if (!isRecord(value)) return void 0;
  if (depth > 4) return void 0;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (isForbiddenKey(key)) continue;
    if (child === null) {
      out[key] = null;
      continue;
    }
    if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
      out[key] = child;
      continue;
    }
    if (Array.isArray(child)) {
      const items = child.map((item) => {
        if (item === null || typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          return item;
        }
        if (isRecord(item)) {
          return sanitizePlainObject(item, depth + 1);
        }
        return void 0;
      }).filter((item) => item !== void 0);
      out[key] = items;
      continue;
    }
    if (typeof child === "object") {
      const nested = sanitizePlainObject(child, depth + 1);
      if (nested) out[key] = nested;
    }
  }
  return out;
}
function pickAllowlistedAgentConfigFields(source, dbKey) {
  const snapshot = { dbKey };
  for (const key of DESKTOP_AGENT_CONFIG_SNAPSHOT_STRING_FIELDS) {
    if (key === "reasoningEffort") continue;
    const value = stringField(source, key);
    if (value !== void 0) {
      snapshot[key] = value;
    }
  }
  const reasoningEffort = stringField(source, "reasoning_effort") || stringField(source, "reasoningEffort");
  if (reasoningEffort) snapshot.reasoning_effort = reasoningEffort;
  for (const key of DESKTOP_AGENT_CONFIG_SNAPSHOT_NUMBER_FIELDS) {
    const value = numberField(source, key);
    if (value !== void 0) {
      snapshot[key] = value;
    }
  }
  if (source.useServerProxy === true) {
    snapshot.useServerProxy = true;
  } else if (source.useServerProxy === false) {
    snapshot.useServerProxy = false;
  }
  const tools = uniqueToolNames(source.tools) ?? uniqueToolNames(source.toolNames);
  if (tools) snapshot.tools = tools;
  const enabledPacks = uniqueToolNames(source.enabledPacks);
  if (enabledPacks) snapshot.enabledPacks = enabledPacks;
  for (const key of DESKTOP_AGENT_CONFIG_SNAPSHOT_OBJECT_FIELDS) {
    const value = sanitizePlainObject(source[key]);
    if (value) {
      snapshot[key] = value;
    }
  }
  return snapshot;
}
function buildDesktopAgentRuntimeAgentConfigSnapshot(source, agentRef) {
  if (!isRecord(source)) return null;
  const ref = asTrimmedString(agentRef);
  if (!ref) return null;
  const claimed = stringField(source, "dbKey") || stringField(source, "key");
  if (claimed && claimed !== ref) return null;
  const dbKey = claimed || ref;
  return pickAllowlistedAgentConfigFields(source, dbKey);
}
function sanitizeMessageContent(content) {
  if (content === null || content === void 0) return null;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const record = part;
    if (record.type === "text" && typeof record.text === "string") {
      parts.push({ type: "text", text: record.text });
    }
  }
  return parts.length > 0 ? parts : null;
}
function sanitizeToolCalls(value) {
  if (!Array.isArray(value)) return void 0;
  const calls = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item;
    const id = asTrimmedString(record.id);
    const fn = record.function && typeof record.function === "object" ? record.function : null;
    const name = asTrimmedString(fn?.name);
    const rawArgs = typeof fn?.arguments === "string" ? fn.arguments : "{}";
    if (!id || !name) continue;
    calls.push({
      id,
      type: "function",
      function: { name, arguments: sanitizeToolCallArguments(rawArgs) }
    });
  }
  return calls.length > 0 ? calls : void 0;
}
function sanitizeChatMessage(value) {
  if (!isRecord(value)) return null;
  const role = value.role;
  if (role !== "system" && role !== "user" && role !== "assistant" && role !== "tool") {
    return null;
  }
  const content = sanitizeMessageContent(value.content);
  const message = {
    role,
    content
  };
  const toolCallId = asOptionalTrimmedString(value.tool_call_id) ?? asOptionalTrimmedString(value.toolCallId);
  if (toolCallId) message.tool_call_id = toolCallId;
  const toolCalls = sanitizeToolCalls(value.tool_calls);
  if (toolCalls) message.tool_calls = toolCalls;
  if (typeof value.reasoning_content === "string" && value.reasoning_content) {
    message.reasoning_content = value.reasoning_content;
  }
  return message;
}
function buildDesktopAgentRuntimeDialogHistorySnapshot(args) {
  const dialogId = asTrimmedString(args.dialogId);
  if (!dialogId) return null;
  if (!Array.isArray(args.messages)) return null;
  let messages = args.messages.map((item) => sanitizeChatMessage(item)).filter((item) => item !== null);
  messages = messages.filter((msg) => {
    const raw = msg;
    return raw.isStreaming !== true;
  });
  const inputText = normalizeContentToText(args.currentInput);
  if (inputText && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last.role === "user" && normalizeContentToText(last.content) === inputText) {
      messages = messages.slice(0, -1);
    }
  }
  return { dialogId, messages };
}
function normalizeContentToText(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content.flatMap((part) => part?.type === "text" && part.text ? [part.text] : []).join("\n").trim();
}
function assertDesktopAgentRuntimeTurnBodyHasNoRawSecrets(body) {
  if (!body || typeof body !== "object") return;
  const json = JSON.stringify(body);
  const walk = (value, path) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (isForbiddenKey(key)) {
        throw new Error(`Forbidden secret field in request body at ${path}.${key}`);
      }
      walk(child, path ? `${path}.${key}` : key);
    }
  };
  walk(body, "");
}

// packages/app/utils/desktopAgentRuntimeTurnClient.ts
var DESKTOP_AGENT_CONFIG_SNAPSHOT_BUILD_FAILED = "desktop_agent_config_snapshot_invalid";
function buildDesktopAgentRuntimeTurnBody(args) {
  const continueDialogId = asTrimmedString(args.continueDialogId);
  let agentConfigSnapshot;
  if (args.agentConfigSnapshot && typeof args.agentConfigSnapshot === "object") {
    const built = buildDesktopAgentRuntimeAgentConfigSnapshot(
      args.agentConfigSnapshot,
      args.agentRef
    );
    if (!built) {
      throw new Error(DESKTOP_AGENT_CONFIG_SNAPSHOT_BUILD_FAILED);
    }
    agentConfigSnapshot = built;
  }
  let dialogHistorySnapshot;
  if (args.dialogHistorySnapshot && typeof args.dialogHistorySnapshot === "object") {
    dialogHistorySnapshot = args.dialogHistorySnapshot;
  } else if (Array.isArray(args.dialogMessages) && continueDialogId) {
    dialogHistorySnapshot = buildDesktopAgentRuntimeDialogHistorySnapshot({
      dialogId: continueDialogId,
      messages: args.dialogMessages,
      currentInput: args.input
    }) ?? void 0;
  }
  const body = {
    agentRef: args.agentRef,
    input: args.input,
    ...args.runtimeContext ? { runtimeContext: args.runtimeContext } : {},
    ...continueDialogId ? { continueDialogId } : {},
    ...continueDialogId && asTrimmedString(args.dialogKey) ? { dialogKey: asTrimmedString(args.dialogKey) } : {},
    ...args.cwd ? { cwd: args.cwd } : {},
    ...args.restrictShellToWorkspace ? { restrictShellToWorkspace: true } : {},
    ...args.workspaceToolsHint ? { workspaceToolsHint: true } : {},
    ...agentConfigSnapshot ? { agentConfigSnapshot } : {},
    ...dialogHistorySnapshot ? { dialogHistorySnapshot } : {}
  };
  assertDesktopAgentRuntimeTurnBodyHasNoRawSecrets(body);
  return body;
}
function normalizeDesktopAgentRuntimeTurnError(data) {
  return typeof data?.error === "string" ? data.error : "Failed to run desktop agent runtime turn";
}
async function* runDesktopAgentRuntimeTurnStream({
  fetchImpl = fetch,
  signal,
  ...args
}) {
  try {
    if (signal?.aborted) {
      yield { type: "error", error: "The operation was aborted." };
      return;
    }
    const response = await fetchImpl("/api/desktop/agent-runtime/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDesktopAgentRuntimeTurnBody(args)),
      signal
    });
    if (!response.ok) {
      const data = await response.clone().json().catch(() => null);
      yield {
        type: "error",
        error: data ? normalizeDesktopAgentRuntimeTurnError(data) : `HTTP ${response.status}: ${response.statusText}`
      };
      return;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
      const data = await response.json().catch(() => ({}));
      if (data?.ok === false) {
        yield { type: "error", error: normalizeDesktopAgentRuntimeTurnError(data) };
      } else if (data?.result) {
        yield { type: "done", result: data.result };
      } else {
        yield { type: "error", error: "Desktop runtime response did not include a result" };
      }
      return;
    }
    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "Response body reader not available" };
      return;
    }
    const decoder = new TextDecoder();
    let buffer = "";
    const readLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) return null;
      try {
        return JSON.parse(trimmed.slice(6));
      } catch (e) {
        console.error("[desktop-client] Failed to parse stream line:", trimmed, e);
        return null;
      }
    };
    try {
      while (true) {
        if (signal?.aborted) {
          yield { type: "error", error: "The operation was aborted." };
          return;
        }
        const { done, value } = await readStreamChunk(reader, { signal });
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const event2 = readLine(line);
          if (event2) yield event2;
        }
      }
      buffer += decoder.decode();
      const event = readLine(buffer);
      if (event) yield event;
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) {
        yield { type: "error", error: "The operation was aborted." };
        return;
      }
      yield {
        type: "error",
        error: toErrorMessage(error)
      };
    } finally {
      try {
        await reader.cancel();
      } catch {
      }
      try {
        reader.releaseLock();
      } catch {
      }
    }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      yield { type: "error", error: "The operation was aborted." };
      return;
    }
    yield {
      type: "error",
      error: toErrorMessage(error)
    };
  }
}

// packages/ai/agent/streamTurnMessageBuild.ts
var buildMessageMetadata = (agentConfig) => {
  const rawName = asTrimmedString(agentConfig?.name);
  return {
    agentKey: agentConfig.dbKey,
    cybotKey: agentConfig.dbKey,
    ...rawName ? { agentName: rawName } : {}
  };
};
var buildDesktopRuntimeToolMessagesForUi = ({
  dialogId,
  turnMessages
}) => {
  if (!Array.isArray(turnMessages) || turnMessages.length === 0) return [];
  const toolNamesByCallId = /* @__PURE__ */ new Map();
  const activityByCallId = /* @__PURE__ */ new Map();
  const projected = [];
  for (const message of turnMessages) {
    if (Array.isArray(message?.tool_calls)) {
      for (const call of message.tool_calls) {
        const callId = asTrimmedString(call?.id);
        const toolName2 = asTrimmedString(call?.function?.name);
        if (callId && toolName2) toolNamesByCallId.set(callId, toolName2);
        if (callId) {
          try {
            const args = typeof call?.function?.arguments === "string" ? JSON.parse(call.function.arguments) : call?.function?.arguments;
            const rawActivity = isRecord(args) ? args._activity : void 0;
            const activity2 = isRecord(rawActivity) ? rawActivity : void 0;
            const legacyTitle = typeof activity2?.title === "string" && activity2.title.trim();
            const action = activity2?.action;
            const actionTitle = isRecord(action) && typeof action.title === "string" && action.title.trim();
            const plan = activity2?.plan;
            const hasPlan = isRecord(plan) && Array.isArray(plan.phases) && plan.phases.some((phase) => {
              if (!isRecord(phase)) return false;
              return typeof phase.title === "string" && !!phase.title.trim();
            });
            if (activity2 && (legacyTitle || actionTitle || hasPlan)) {
              activityByCallId.set(callId, args._activity);
            }
          } catch {
          }
        }
      }
      continue;
    }
    if (message?.role !== "tool") continue;
    const toolCallId = asTrimmedString(message.tool_call_id);
    const metadata = asRecordOrEmpty(message.tool_result_metadata);
    const metadataToolName = asTrimmedString(metadata.toolName);
    const toolName = metadataToolName || (toolCallId ? toolNamesByCallId.get(toolCallId) : "") || "tool";
    const { key: dbKey, messageId } = createDialogMessageKeyAndId(dialogId);
    const resultActivity = metadata.activity && typeof metadata.activity === "object" ? metadata.activity : void 0;
    const callActivity = toolCallId ? activityByCallId.get(toolCallId) : void 0;
    const activity = resultActivity || callActivity;
    const mergedMetadata = activity ? { ...metadata, activity } : metadata;
    projected.push({
      id: messageId,
      dialogId,
      dbKey,
      role: "tool",
      content: projectDesktopToolUiContent({
        toolName,
        content: typeof message.content === "string" ? message.content : "",
        metadata: mergedMetadata
      }),
      isStreaming: false,
      toolName,
      ...toolCallId ? { toolCallId } : {},
      ...Object.keys(mergedMetadata).length ? { metadata: mergedMetadata } : {}
    });
  }
  return projected;
};
var toolMessageWillPersist = (toolMsg) => {
  const content = toolMsg?.content;
  if (typeof content === "string") return content.trim().length > 0;
  return Array.isArray(content) && content.length > 0;
};
var shouldUseDesktopLocalRuntime = (agentConfig) => {
  if (!getIsDesktopApp()) return false;
  return agentConfig?.apiSource !== "cli";
};
var readCurrentDesktopMachineId = () => {
  const fromProcess = typeof process !== "undefined" ? (process.env?.NOLO_CURRENT_MACHINE_ID || process.env?.NOLO_MACHINE_ID || "").trim() : "";
  if (fromProcess) return fromProcess;
  const w = typeof globalThis !== "undefined" && globalThis.window ? globalThis.window : null;
  const fromWindow = asTrimmedString(w?.__NOLO_CURRENT_MACHINE_ID__) || asTrimmedString(w?.__NOLO_MACHINE_ID__);
  return fromWindow;
};
var resolveRemoteBoundMachineId = (machineId) => {
  if (!machineId || !getIsDesktopApp()) return machineId;
  const currentMachineId = readCurrentDesktopMachineId();
  return currentMachineId && currentMachineId === machineId ? "" : machineId;
};
var resolveWebAgentRuntimeToolSurface = (agentConfig, state) => {
  const toolSurface = resolveRuntimeToolSurfaceForAgent({
    explicitToolNames: Array.isArray(agentConfig.tools) ? agentConfig.tools : [],
    currentUserId: selectIdentityUserId(state),
    agentOwnerId: typeof agentConfig.userId === "string" ? agentConfig.userId : null,
    agentKey: agentConfig.dbKey ?? agentConfig.agentKey,
    isPublic: agentConfig.isPublic === true,
    sharingLevel: typeof agentConfig.sharingLevel === "string" ? agentConfig.sharingLevel : null,
    runtimeHost: "web"
  });
  return {
    ...agentConfig,
    tools: toolSurface.finalToolNames,
    runtimeToolSurface: toolSurface
  };
};
var formatMachineAgentRunError = async (response) => {
  const errorText = await response.text();
  let payload = null;
  try {
    payload = errorText ? JSON.parse(errorText) : null;
  } catch {
    payload = null;
  }
  const reason = typeof payload?.reason === "string" ? payload.reason : "";
  if (response.status === 409) {
    if (reason === "bound_machine_unavailable") {
      return "\u7ED1\u5B9A\u7684\u7535\u8111\u4E0D\u5728\u7EBF\u3002\u8BF7\u786E\u8BA4\u8FD9\u53F0\u7535\u8111\u5DF2\u5F00\u673A\u5E76\u91CD\u65B0\u8FD0\u884C\u8FDE\u63A5\u547D\u4EE4\u3002";
    }
    if (reason === "bound_machine_owner_mismatch") {
      return "\u8FD9\u53F0\u7535\u8111\u662F\u5728\u7EBF\u7684\uFF0C\u4F46\u5F53\u524D\u8D26\u53F7\u548C Agent \u7ED1\u5B9A\u8D26\u53F7\u4E0D\u4E00\u81F4\u3002\u8BF7\u91CD\u65B0\u7ED1\u5B9A Agent\uFF0C\u6216\u5728\u7ED1\u5B9A\u8D26\u53F7\u4E0B\u91CD\u65B0\u8FDE\u63A5\u8FD9\u53F0\u7535\u8111\u3002";
    }
    if (reason === "connector_offline") {
      return "\u7535\u8111\u5728\u7EBF\uFF0C\u4F46\u8FDE\u63A5\u5668\u672A\u8FDE\u63A5\u3002\u8BF7\u5728\u8FD9\u53F0\u7535\u8111\u4E0A\u91CD\u65B0\u8FD0\u884C\u8FDE\u63A5\u547D\u4EE4\u540E\u518D\u8BD5\u3002";
    }
    if (reason === "missing_capability") {
      return "\u8FD9\u53F0\u7535\u8111\u6CA1\u6709\u5BF9\u5E94\u7684 CLI \u80FD\u529B\u3002\u8BF7\u5B89\u88C5\u5BF9\u5E94 CLI\uFF0C\u6216\u628A Agent \u7ED1\u5B9A\u5230\u53E6\u4E00\u53F0\u7535\u8111\u3002";
    }
  }
  const message = asOptionalTrimmedString(payload?.message) ?? asOptionalTrimmedString(payload?.error) ?? errorText.trim();
  return message || `Machine agent run failed (${response.status})`;
};
var normalizeThreadMetadataPatch = (value) => {
  if (!isRecord(value)) return null;
  const record = value;
  const changes = {};
  const threadKind = asOptionalTrimmedString(record.threadKind);
  if (threadKind) {
    changes.threadKind = threadKind;
  }
  const presentationIntent = asOptionalTrimmedString(record.presentationIntent);
  if (presentationIntent) {
    changes.presentationIntent = presentationIntent;
  }
  return Object.keys(changes).length > 0 ? changes : null;
};
var patchDialogThreadMetadata = async (dispatch, dialogKey, metadata) => {
  const changes = normalizeThreadMetadataPatch(metadata);
  if (!changes) return;
  await dispatch(
    patch({
      dbKey: dialogKey,
      changes
    })
  ).unwrap?.();
};
var patchDialogActiveAgent = async (dispatch, dialogKey, agentKey) => {
  if (typeof agentKey !== "string" || !agentKey.trim()) return;
  await dispatch(
    patch({
      dbKey: dialogKey,
      changes: {
        primaryAgentKey: agentKey.trim()
      }
    })
  ).unwrap?.();
};
function appendCliCapabilityWarnings(content, warnings) {
  if (!warnings.length) return content;
  const warningBlock = `

[CLI \u80FD\u529B\u63D0\u793A]
${warnings.map((warning) => `- ${warning}`).join("\n")}`;
  return `${content}${warningBlock}`;
}

// packages/ai/agent/streamTurnStreamConsumer.ts
async function readAgentRunStreamChunk(reader, signal, isAborted) {
  if (isAborted() || signal?.aborted) {
    void reader.cancel().catch(() => {
    });
    throw new DOMException("The operation was aborted.", "AbortError");
  }
  if (!signal) {
    return reader.read();
  }
  let settled = false;
  return new Promise((resolve, reject) => {
    const finish = (cb) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      cb();
    };
    const onAbort = () => {
      void reader.cancel().catch(() => {
      });
      finish(
        () => reject(new DOMException("The operation was aborted.", "AbortError"))
      );
    };
    signal.addEventListener("abort", onAbort);
    reader.read().then(
      (result) => finish(() => resolve(result)),
      (err) => finish(() => reject(err))
    );
  });
}
async function consumeAgentRunStream(handlers) {
  const {
    reader,
    decoder,
    parseChunk,
    onPayload,
    isDoneEvent,
    isAborted,
    signal,
    onAbort
  } = handlers;
  let sawDone = false;
  try {
    while (true) {
      let done;
      let value;
      try {
        ({ done, value } = await readAgentRunStreamChunk(
          reader,
          signal,
          isAborted
        ));
      } catch (error) {
        if (isAbortError(error) || isAborted() || signal?.aborted) {
          await onAbort();
          return { outcome: "aborted" };
        }
        throw error;
      }
      if (isAborted() || signal?.aborted) {
        await onAbort();
        return { outcome: "aborted" };
      }
      if (done) {
        return { outcome: "streamEnded", sawDone };
      }
      const payloads = parseChunk(
        decoder.decode(value, { stream: true })
      );
      for (const payload of payloads) {
        if (isAborted() || signal?.aborted) {
          await onAbort();
          return { outcome: "aborted" };
        }
        const directive = await onPayload(payload);
        if (directive?.reject !== void 0) {
          return { outcome: "rejected", message: directive.reject };
        }
        if (directive?.abort) {
          await onAbort();
          return { outcome: "aborted" };
        }
        if (isDoneEvent(payload)) {
          sawDone = true;
        }
      }
    }
  } catch (error) {
    if (isAbortError(error) || isAborted() || signal?.aborted) {
      await onAbort();
      return { outcome: "aborted" };
    }
    throw error;
  }
}

// packages/ai/llm/isResponseAPIModel.ts
var isResponseAPIModel = (agentConfig) => {
  const provider = agentConfig.provider?.trim().toLowerCase();
  if (provider !== "openai") return false;
  if (agentConfig.endpointKey === "responses") return true;
  if (!agentConfig.model) return false;
  try {
    return getModelConfig("openai", agentConfig.model).endpointKey === "responses";
  } catch {
    return false;
  }
};

// packages/ai/agent/streamTurnQuickChat.ts
var QUICK_CHAT_AGENT_CONFIG_READ_TIMEOUT_MS = 1e4;
var QUICK_CHAT_DYNAMIC_CONTEXT_TIMEOUT_MS = 5e3;
var EMPTY_DYNAMIC_CONTEXTS = {
  currentInputContext: null,
  historyContext: "",
  editingContext: null,
  appWorkingMemory: null,
  memoryOverlay: null,
  dialogSummary: null,
  referenceKeys: []
};
var logQuickChatPerfStage2 = (startedAt, stage, details = {}) => {
  if (!startedAt) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info("[QuickChatPerf]", {
    stage,
    elapsedMs: now - startedAt,
    ...typeof performance !== "undefined" ? { atMs: now } : {},
    ...details
  });
};
var readAgentConfigForTurn = async (dispatch, agentKey, quickChatPerfStartedAt) => {
  const readPromise = dispatch(read({ dbKey: agentKey })).unwrap();
  if (!quickChatPerfStartedAt) return readPromise;
  let timeoutId;
  try {
    return await Promise.race([
      readPromise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          logQuickChatPerfStage2(
            quickChatPerfStartedAt,
            "quick-chat-agent-config-read-timeout",
            { agentKey, timeoutMs: QUICK_CHAT_AGENT_CONFIG_READ_TIMEOUT_MS }
          );
          reject(
            new Error("\u8BFB\u53D6 Agent \u914D\u7F6E\u8D85\u65F6\uFF0C\u672A\u80FD\u542F\u52A8\u6A21\u578B\u56DE\u590D\u3002")
          );
        }, QUICK_CHAT_AGENT_CONFIG_READ_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
var buildDynamicContextsForTurn = async (state, dispatch, agentConfig, userInput, runtimeOptions, mergedContentCache, dialogKey, quickChatPerfStartedAt) => {
  if (!quickChatPerfStartedAt) {
    return buildDynamicContexts(
      state,
      dispatch,
      agentConfig,
      userInput,
      runtimeOptions,
      mergedContentCache,
      dialogKey
    );
  }
  let timeoutId;
  try {
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        logQuickChatPerfStage2(
          quickChatPerfStartedAt,
          "quick-chat-dynamic-context-timeout",
          { agentKey: agentConfig.dbKey, dialogKey, timeoutMs: QUICK_CHAT_DYNAMIC_CONTEXT_TIMEOUT_MS }
        );
        resolve(EMPTY_DYNAMIC_CONTEXTS);
      }, QUICK_CHAT_DYNAMIC_CONTEXT_TIMEOUT_MS);
    });
    logQuickChatPerfStage2(
      quickChatPerfStartedAt,
      "stream-agent-dynamic-context-starting",
      { responseApi: isResponseAPIModel(agentConfig) }
    );
    const contextPromise = buildDynamicContexts(
      state,
      dispatch,
      agentConfig,
      userInput,
      runtimeOptions,
      mergedContentCache,
      dialogKey
    );
    return await Promise.race([
      contextPromise,
      timeoutPromise
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
var finalizeQuickChatAgentTurnFailure = async (dispatch, dialogKey, agentKey, error) => {
  const dialogId = extractCustomId(dialogKey);
  const { key: msgKey, messageId } = createDialogMessageKeyAndId(dialogId);
  const reason = error instanceof Error && error.message.trim() ? error.message.trim() : typeof error === "string" && error.trim() ? error.trim() : error && typeof error === "object" && typeof error.message === "string" && error.message.trim() ? error.message.trim() : "\u672A\u80FD\u542F\u52A8\u6A21\u578B\u56DE\u590D\uFF0C\u8BF7\u91CD\u8BD5\u3002";
  await dispatch(
    messageStreamEnd({
      finalContentBuffer: [
        { type: "text", text: `[\u9519\u8BEF: ${reason}]` }
      ],
      totalUsage: null,
      msgKey,
      agentConfig: { dbKey: agentKey },
      dialogId,
      dialogKey,
      messageId,
      reasoningBuffer: ""
    })
  ).unwrap?.();
};
var normalizeAgentRunUserInput = (userInput) => {
  if (typeof userInput === "string") return userInput;
  if (!Array.isArray(userInput)) return "";
  return userInput.filter((part) => {
    if (!part || typeof part !== "object") return false;
    if (part.type === "text") return typeof part.text === "string";
    return part.type === "image_url" && typeof part.image_url?.url === "string" && !!part.image_url.url.trim();
  });
};
var isSimpleTextInput = (userInput) => {
  if (typeof userInput === "string") return true;
  if (!Array.isArray(userInput)) return false;
  return userInput.every(
    (part) => part && typeof part === "object" && part.type === "text" && typeof part.text === "string"
  );
};
var canUseQuickChatEmptyDynamicContexts = (quickChatPerfStartedAt, userInput, runtimeOptions, dialogConfig, agentConfig) => {
  if (!quickChatPerfStartedAt) return false;
  if (runtimeOptions) return false;
  if (agentConfig?.tools?.includes("rememberMemory")) return false;
  if (!isSimpleTextInput(userInput)) return false;
  if (dialogConfig?.referenceKeys?.length) return false;
  return true;
};
var QUICK_CHAT_DIRECT_ANSWER_PATTERN = /(只回复|只输出|只回答|直接回复|直接回答|不要解释|无需解释|不用解释|简短回答|一句话)/i;
var QUICK_CHAT_TOOL_INTENT_PATTERN = /(调用|转交|agent|助手|应用|网页|页面|图表|图片|生成图|画图|删除|清理|空间|商品|链接|https?:\/\/|www\.|@)/i;
var shouldDisableQuickChatToolsForDirectAnswer = (quickChatPerfStartedAt, userInput, runtimeOptions, dialogConfig) => {
  if (!canUseQuickChatEmptyDynamicContexts(
    quickChatPerfStartedAt,
    userInput,
    runtimeOptions,
    dialogConfig,
    void 0
  )) {
    return false;
  }
  const text = extractAgentRunUserText(userInput);
  if (!text || text.length > 500) return false;
  if (!QUICK_CHAT_DIRECT_ANSWER_PATTERN.test(text)) return false;
  return !QUICK_CHAT_TOOL_INTENT_PATTERN.test(text);
};
var classifyQuickChatAccessError = (accessError) => {
  if (accessError.includes("\u83B7\u53D6\u7528\u6237\u4F59\u989D")) return "balance-loading";
  if (accessError.includes("\u4F59\u989D")) return "balance";
  if (accessError.includes("\u767D\u540D\u5355")) return "whitelist";
  if (accessError.includes("\u5B9A\u4EF7")) return "pricing";
  return "unknown";
};
var isUsableAgentConfig = (value) => !!value && typeof value === "object" && value.__ssrPreviewOnly !== true && typeof value.dbKey === "string" && !!value.dbKey && typeof value.model === "string" && !!value.model && typeof value.provider === "string" && !!value.provider;
var extractAgentRunUserText = (userInput) => {
  if (typeof userInput === "string") return userInput.trim();
  if (!Array.isArray(userInput)) return "";
  return userInput.filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("").trim();
};
var hasAgentRunUserInputContent = (userInput) => {
  if (typeof userInput === "string") return userInput.trim().length > 0;
  return Array.isArray(userInput) && userInput.length > 0;
};
var isLastMessageMatchingUserInput = (visibleMessages, userInput) => {
  if (visibleMessages.length === 0) return false;
  const lastMsg = visibleMessages[visibleMessages.length - 1];
  if (lastMsg.role !== "user") return false;
  const content1 = lastMsg.content;
  const content2 = userInput;
  const normalize = (content) => {
    if (typeof content === "string") return content.trim();
    if (Array.isArray(content)) {
      if (content.length === 1 && content[0]?.type === "text") {
        return (content[0].text || "").trim();
      }
      return content.map((part) => {
        if (part?.type === "text") return { type: "text", text: part.text?.trim() };
        if (part?.type === "image_url") return { type: "image_url", url: part.image_url?.url };
        return part;
      });
    }
    return content;
  };
  const norm1 = normalize(content1);
  const norm2 = normalize(content2);
  if (typeof norm1 === "string" && typeof norm2 === "string") {
    return norm1 === norm2;
  }
  return JSON.stringify(norm1) === JSON.stringify(norm2);
};
var setLoopStopReason = (reason) => {
  const w = typeof globalThis !== "undefined" && globalThis.window ? globalThis.window : null;
  if (w) w.__LOOP_STOP_REASON__ = reason;
};
var prewarmPreparedToolsForAgent = (agentConfig) => {
  const tools = agentConfig?.tools;
  if (!Array.isArray(tools) || tools.length === 0) return;
  try {
    prepareTools(tools, { provider: agentConfig.provider });
  } catch {
  }
};
var buildStaticContextsWithToolsPrewarm = async (state, dispatch, agentConfig, currentDialog, mergedContentCache) => {
  const [staticContexts] = await Promise.all([
    buildStaticContexts(
      state,
      dispatch,
      agentConfig,
      currentDialog ?? void 0,
      mergedContentCache
    ),
    Promise.resolve().then(() => prewarmPreparedToolsForAgent(agentConfig))
  ]);
  return staticContexts;
};

// packages/ai/agent/streamAgentChatTurn.ts
function hasInlineExecutedToolCalls(result) {
  const output = result?.output;
  return Array.isArray(output) && output.some((b) => b?.type === "toolCall" && b?.result != null);
}
function createRemoteToolEventHandlers(opts) {
  const { dialogId, dispatch, messageMetadata } = opts;
  const activeToolMessages = /* @__PURE__ */ new Map();
  const handleToolPayload = (payload) => {
    if (!payload || typeof payload !== "object") return;
    if (payload.type === "assistant_tool_calls") {
      const toolCalls = Array.isArray(payload.tool_calls) ? payload.tool_calls : [];
      for (const tc of toolCalls) {
        const callId = tc?.id;
        const toolName = tc?.function?.name;
        if (!callId || !toolName) continue;
        const { key: toolDbKey, messageId: toolMsgId } = createDialogMessageKeyAndId(dialogId);
        const argsStr = typeof tc.function?.arguments === "string" ? tc.function.arguments : "";
        const toolMsg = {
          id: toolMsgId,
          dialogId,
          dbKey: toolDbKey,
          role: "tool",
          content: "",
          isStreaming: true,
          toolName,
          toolCallId: callId,
          toolPayload: {
            toolName,
            status: "running",
            input: safeParseToolArgs(argsStr),
            rawToolCall: tc,
            summary: ""
          },
          ...messageMetadata
        };
        activeToolMessages.set(callId, toolMsg);
        dispatch(messageStreaming(toolMsg));
      }
      return;
    }
    if (payload.type === "tool_result") {
      const callId = payload.toolCallId;
      if (!callId) return;
      const existing = activeToolMessages.get(callId);
      const toolName = asOptionalTrimmedString(payload.toolName) || asOptionalTrimmedString(existing?.toolName) || "tool";
      const mergedMeta = isRecord(payload.metadata) ? payload.metadata : void 0;
      const isToolError = !!mergedMeta?.error;
      const projectedContent = projectDesktopToolUiContent({
        toolName,
        content: payload.content,
        metadata: mergedMeta ?? void 0
      });
      const resultStatus = isToolError ? "failed" : "succeeded";
      if (existing) {
        const updatedMsg = {
          ...existing,
          isStreaming: false,
          content: projectedContent,
          toolName,
          toolPayload: {
            ...existing.toolPayload ?? {},
            toolName,
            status: resultStatus
          }
        };
        activeToolMessages.set(callId, updatedMsg);
        dispatch(messageStreaming(updatedMsg));
      } else {
        const { key: toolDbKey, messageId: toolMsgId } = createDialogMessageKeyAndId(dialogId);
        const toolMsg = {
          id: toolMsgId,
          dialogId,
          dbKey: toolDbKey,
          role: "tool",
          content: projectedContent,
          isStreaming: false,
          toolName,
          toolCallId: callId,
          toolPayload: {
            toolName,
            status: resultStatus,
            input: {},
            summary: ""
          },
          ...messageMetadata
        };
        activeToolMessages.set(callId, toolMsg);
        dispatch(messageStreaming(toolMsg));
      }
    }
  };
  return { handleToolPayload, activeToolMessages };
}
async function persistRemoteToolMessagesAndCleanup(dispatch, activeToolMessages) {
  const durableTools = [];
  for (const toolMsg of activeToolMessages.values()) {
    const content = toolMsg?.content;
    const hasContent = typeof content === "string" ? content.trim().length > 0 : Array.isArray(content) && content.length > 0;
    if (!hasContent) {
      dispatch(removeTransientMessage(toolMsg.id));
      continue;
    }
    const stopped = { ...toolMsg, isStreaming: false };
    dispatch(messageStreaming(stopped));
    durableTools.push(stopped);
  }
  await persistToolMessages(dispatch, durableTools, {
    isStreaming: false,
    soft: true
  });
  activeToolMessages.clear();
}
function safeParseToolArgs(argsStr) {
  if (!argsStr) return {};
  try {
    return JSON.parse(argsStr);
  } catch {
    return { raw: argsStr };
  }
}
var streamAgentChatTurnHandler = async (args, thunkApi) => {
  const {
    agentKey,
    userInput,
    dialogKey: explicitDialogKey,
    parentMessageId,
    runtimeOptions,
    quickChatPerfStartedAt
  } = args;
  const { getState, dispatch, rejectWithValue } = thunkApi;
  const state = getState();
  const loopController = new AbortController();
  const isTurnAborted = (error) => isAbortError(error) || loopController.signal.aborted || thunkApi.signal.aborted;
  const onAbort = () => loopController.abort();
  thunkApi.signal.addEventListener("abort", onAbort);
  let loopKey = null;
  let runtimeDialogKey = explicitDialogKey ?? null;
  let remoteTransientMessageId = null;
  let remoteTransientMessageFinalized = false;
  let modelRequestStarted = false;
  let turnAborted = false;
  if (explicitDialogKey) {
    const dialogId = extractCustomId(explicitDialogKey);
    const existingLoopKey = `loop:${dialogId}`;
    const activeControllers = selectActiveControllers(
      getState(),
      explicitDialogKey
    );
    if (activeControllers[existingLoopKey]) {
      console.warn(
        "[streamAgentChatTurn] Rejected concurrent turn for dialog",
        { dialogId, agentKey }
      );
      return rejectWithValue("Agent is already responding for this dialog");
    }
  }
  try {
    let totalTurnUsage = null;
    const agentRunUserInput = normalizeAgentRunUserInput(userInput);
    logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-entered", {
      agentKey,
      dialogKey: explicitDialogKey ?? null
    });
    const cachedAgentConfig = selectById(
      getState(),
      agentKey
    );
    let rawAgentConfig = null;
    rawAgentConfig = isUsableAgentConfig(cachedAgentConfig) ? cachedAgentConfig : await readAgentConfigForTurn(
      dispatch,
      agentKey,
      quickChatPerfStartedAt
    );
    if (!rawAgentConfig) {
      return rejectWithValue(
        `Agent config not found for ID: ${agentKey}`
      );
    }
    if (runtimeOptions?.quickChatModelOverride) {
      rawAgentConfig = applyQuickChatModelOverride(
        rawAgentConfig,
        runtimeOptions.quickChatModelOverride
      );
    }
    if (runtimeOptions?.quickChatReasoningEffort && rawAgentConfig.model === "deepseek-v4-flash") {
      rawAgentConfig = {
        ...rawAgentConfig,
        reasoning_effort: runtimeOptions.quickChatReasoningEffort
      };
    }
    if (isLiveAudioOnlyAgent(rawAgentConfig)) {
      return rejectWithValue(
        "\u6B64 Agent \u4EC5\u652F\u6301\u5B9E\u65F6\u8BED\u97F3\u6A21\u5F0F\uFF0C\u8BF7\u4F7F\u7528\u8BED\u97F3\u9762\u677F\u8FDB\u884C\u5BF9\u8BDD\u3002"
      );
    }
    const agentConfig = resolveWebAgentRuntimeToolSurface(
      rawAgentConfig,
      getState()
    );
    logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-config-read", {
      agentKey,
      model: agentConfig.model,
      provider: agentConfig.provider,
      apiSource: agentConfig.apiSource,
      source: rawAgentConfig === cachedAgentConfig ? "cache" : "read"
    });
    const gptProCheck = shouldBlockForGptPro(
      agentConfig,
      selectIdentityUser(getState())?.gptProAccess?.status
    );
    if (gptProCheck.blocked) {
      return rejectWithValue(gptProCheck.message);
    }
    const configuredBoundMachineId = asTrimmedString(
      agentConfig.runtimeBinding?.machineId
    );
    const boundMachineId = resolveRemoteBoundMachineId(configuredBoundMachineId);
    if (agentConfig.apiSource === "cli" || boundMachineId && !getIsDesktopApp()) {
      console.info("[streamAgentChatTurn] Triggered CLI/machine route. apiSource:", agentConfig.apiSource, "boundMachineId:", boundMachineId, "agentKey:", agentKey);
      const currentState = getState();
      const w2 = typeof globalThis !== "undefined" && globalThis.window ? globalThis.window : null;
      if (w2) w2.__LOOP_STOP_REASON__ = null;
      const userText = extractAgentRunUserText(userInput);
      const prompt = buildCliPrompt(agentConfig.prompt, userText);
      const dialogConfig = selectDialogConfigByKey(currentState, explicitDialogKey) ?? selectCurrentDialogConfig(currentState);
      if (!dialogConfig) {
        return rejectWithValue("Dialog config not found");
      }
      const dialogKey2 = explicitDialogKey || dialogConfig.dbKey;
      if (!dialogKey2) {
        return rejectWithValue("\u5F53\u524D\u5BF9\u8BDD\u4E0D\u5B58\u5728\uFF0C\u65E0\u6CD5\u53D1\u9001\u6D88\u606F\u3002");
      }
      runtimeDialogKey = dialogKey2;
      const dialogId2 = extractCustomId(dialogKey2);
      loopKey = `loop:${dialogId2}`;
      dispatch(addActiveController({ messageId: loopKey, controller: loopController, dialogKey: dialogKey2 }));
      const { key: msgKey, messageId } = createDialogMessageKeyAndId(dialogId2);
      const cliMessageMetadata = buildMessageMetadata(agentConfig);
      if (boundMachineId) {
        const token = selectIdentityToken(currentState);
        const authHeader = token ? `Bearer ${token}` : "";
        const rawMessages = selectAllMsgs(currentState, dialogId2);
        const visibleMessages = buildAgentViewMessages(
          rawMessages,
          agentConfig.dbKey
        );
        const cleanedMessages = filterAndCleanMessages(visibleMessages);
        const currentServer2 = selectCurrentServer(currentState);
        remoteTransientMessageId = messageId;
        let accumulated2 = "";
        let totalTurnUsage2 = void 0;
        const buildMachineAssistantMessage = () => ({
          id: messageId,
          dbKey: msgKey,
          role: "assistant",
          content: accumulated2,
          ...cliMessageMetadata,
          userId: selectIdentityUserId(getState())
        });
        const remoteToolHandlers = createRemoteToolEventHandlers({
          dialogId: dialogId2,
          dispatch,
          messageMetadata: cliMessageMetadata
        });
        dispatch(messageStreaming({
          id: messageId,
          dialogId: dialogId2,
          dbKey: msgKey,
          content: "",
          role: "assistant",
          ...cliMessageMetadata
        }));
        const rejectMachineStream = async (message) => {
          if (accumulated2.length > 0) {
            await persistMessageWithFixedId(dispatch, buildMachineAssistantMessage());
          } else {
            dispatch(removeTransientMessage(messageId));
          }
          await persistRemoteToolMessagesAndCleanup(
            dispatch,
            remoteToolHandlers.activeToolMessages
          ).catch(() => {
          });
          setLoopStopReason("error");
          remoteTransientMessageFinalized = true;
          return rejectWithValue(message);
        };
        const machineResponse = await fetch(`${currentServer2.replace(/\/+$/, "")}/api/agent/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...authHeader ? { Authorization: authHeader } : {}
          },
          body: JSON.stringify({
            agentKey,
            userInput: agentRunUserInput,
            messages: cleanedMessages,
            stream: true,
            persistDialog: false,
            clientDialogId: dialogId2,
            runtimeContext: {
              surface: "web",
              host: "browser",
              runtime: "react",
              entrypoint: "chat-dialog",
              capabilities: ["streaming", "dialog-ui", "machine-bound-cli"]
            },
            ...dialogConfig?.spaceId ? { spaceId: dialogConfig.spaceId } : {}
          }),
          signal: loopController.signal
        });
        if (!machineResponse.ok) {
          return await rejectMachineStream(
            await formatMachineAgentRunError(machineResponse)
          );
        }
        const reader2 = machineResponse.body?.getReader();
        if (!reader2) {
          return await rejectMachineStream("\u65E0\u6CD5\u8BFB\u53D6\u7535\u8111\u7AEF Agent \u6D41\u5F0F\u54CD\u5E94");
        }
        const decoder2 = new TextDecoder();
        const parseSSE = createSSEParser();
        const abortMachineStream = async () => {
          if (w2) w2.__LOOP_STOP_REASON__ = "aborted";
          if (accumulated2.length <= 0) {
            await persistRemoteToolMessagesAndCleanup(
              dispatch,
              remoteToolHandlers.activeToolMessages
            ).catch(() => {
            });
            return;
          }
          await persistMessageWithFixedId(dispatch, buildMachineAssistantMessage());
          await persistRemoteToolMessagesAndCleanup(
            dispatch,
            remoteToolHandlers.activeToolMessages
          ).catch(() => {
          });
        };
        try {
          const result = await consumeAgentRunStream({
            reader: reader2,
            decoder: decoder2,
            parseChunk: (raw) => parseSSE(raw),
            isAborted: () => loopController.signal.aborted || thunkApi.signal.aborted,
            signal: loopController.signal,
            onAbort: abortMachineStream,
            isDoneEvent: (payload) => payload?.type === "done",
            onPayload: (payload) => {
              if (payload.type === "error") {
                return { reject: payload.message || "\u7535\u8111\u7AEF Agent \u6267\u884C\u5931\u8D25" };
              }
              remoteToolHandlers.handleToolPayload(payload);
              if (payload.type === "text" && typeof payload.content === "string") {
                accumulated2 += payload.content;
                dispatch(messageStreaming({
                  id: messageId,
                  dialogId: dialogId2,
                  dbKey: msgKey,
                  content: accumulated2,
                  role: "assistant",
                  ...cliMessageMetadata
                }));
              }
              if (payload.type === "done") {
                totalTurnUsage2 = payload.usage;
              }
            }
          });
          if (result.outcome === "rejected") {
            return await rejectMachineStream(result.message);
          }
          if (result.outcome === "aborted") {
            return { aborted: true };
          }
          if (result.outcome === "streamEnded") {
            if (!result.sawDone) {
              dispatch(finalizeTransientMessageOnError({
                id: messageId,
                error: "\u7535\u8111\u7AEF Agent \u6D41\u5F0F\u54CD\u5E94\u88AB\u4E2D\u65AD,\u672A\u6536\u5230\u5B8C\u6210\u4FE1\u53F7"
              }));
              await persistRemoteToolMessagesAndCleanup(
                dispatch,
                remoteToolHandlers.activeToolMessages
              ).catch(() => {
              });
              remoteTransientMessageFinalized = true;
              setLoopStopReason("error");
              return rejectWithValue(
                "\u7535\u8111\u7AEF Agent \u6D41\u5F0F\u54CD\u5E94\u88AB\u4E2D\u65AD,\u672A\u6536\u5230\u5B8C\u6210\u4FE1\u53F7"
              );
            }
            await persistMessageWithFixedId(dispatch, buildMachineAssistantMessage());
            await persistRemoteToolMessagesAndCleanup(
              dispatch,
              remoteToolHandlers.activeToolMessages
            );
            remoteTransientMessageFinalized = true;
          }
        } finally {
          try {
            await reader2.cancel();
          } catch {
          }
          if (remoteToolHandlers.activeToolMessages.size > 0) {
            await persistRemoteToolMessagesAndCleanup(
              dispatch,
              remoteToolHandlers.activeToolMessages
            ).catch(() => {
            });
          }
        }
        return {
          usage: totalTurnUsage2 ?? void 0
        };
      }
      let cliSessionId = dialogConfig.cliSessionId ?? null;
      dispatch(messageStreaming({
        id: messageId,
        dialogId: dialogId2,
        dbKey: msgKey,
        content: "",
        role: "assistant",
        ...cliMessageMetadata
      }));
      remoteTransientMessageId = messageId;
      const ensureCliSession = async () => {
        if (cliSessionId) {
          const existing = await getCliChatSession(
            { getState },
            { sessionId: cliSessionId }
          ).catch(() => null);
          if (existing?.ok && existing?.session?.sessionId) {
            return cliSessionId;
          }
        }
        const started = await startCliChatSession(
          { getState },
          {
            cliProvider: agentConfig.cliProvider || "copilot",
            model: agentConfig.model || void 0,
            systemPrompt: agentConfig.prompt || void 0,
            reasoningEffort: agentConfig.reasoning_effort || agentConfig.reasoningEffort || void 0,
            temperature: agentConfig.temperature,
            topP: agentConfig.top_p,
            frequencyPenalty: agentConfig.frequency_penalty,
            presencePenalty: agentConfig.presence_penalty,
            maxTokens: agentConfig.max_tokens,
            enableThinking: agentConfig.enableThinking,
            thinkingBudget: agentConfig.thinkingBudget
          }
        );
        const newSessionId = typeof started?.sessionId === "string" ? started.sessionId : null;
        if (!newSessionId) {
          throw new Error("\u65E0\u6CD5\u521B\u5EFA CLI session\u3002");
        }
        cliSessionId = newSessionId;
        const patchResult = dispatch(
          patch({
            dbKey: dialogKey2,
            changes: {
              cliSessionId: newSessionId
            }
          })
        );
        try {
          if (typeof patchResult?.unwrap === "function") {
            await patchResult.unwrap();
          } else {
            await patchResult;
          }
        } catch {
        }
        return newSessionId;
      };
      const initialSessionId = await ensureCliSession();
      console.info("[streamAgentChatTurn] Calling CLI turn stream. Session ID:", initialSessionId);
      let resp = await createCliChatTurnStream(
        {
          getState
        },
        {
          sessionId: initialSessionId,
          prompt,
          model: agentConfig.model || void 0
        },
        loopController.signal
      );
      if (!resp.ok && resp.status === 404) {
        console.warn("[streamAgentChatTurn] CLI Session 404. Re-creating session...");
        cliSessionId = null;
        const renewedSessionId = await ensureCliSession();
        console.info("[streamAgentChatTurn] Retrying CLI turn stream. Session ID:", renewedSessionId);
        resp = await createCliChatTurnStream(
          {
            getState
          },
          {
            sessionId: renewedSessionId,
            prompt,
            model: agentConfig.model || void 0
          },
          loopController.signal
        );
      }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        console.error("[streamAgentChatTurn] Local CLI fetch failed. Status:", resp.status, "Error details:", err);
        dispatch(removeTransientMessage(messageId));
        setLoopStopReason("error");
        remoteTransientMessageFinalized = true;
        return rejectWithValue(err.error || "CLI \u6267\u884C\u5931\u8D25");
      }
      const reader = resp.body?.getReader();
      if (!reader) {
        dispatch(removeTransientMessage(messageId));
        setLoopStopReason("error");
        remoteTransientMessageFinalized = true;
        return rejectWithValue("\u65E0\u6CD5\u8BFB\u53D6\u6D41\u5F0F\u54CD\u5E94");
      }
      let accumulated = "";
      let cliCapabilityWarnings = [];
      let cliTurnUsage = null;
      const decoder = new TextDecoder();
      const buildCliAssistantMessage = () => ({
        id: messageId,
        dbKey: msgKey,
        role: "assistant",
        content: accumulated,
        ...cliMessageMetadata,
        userId: selectIdentityUserId(getState())
      });
      const rejectCliStream = async (message) => {
        if (accumulated.length > 0) {
          await persistMessageWithFixedId(dispatch, buildCliAssistantMessage());
        } else {
          dispatch(removeTransientMessage(messageId));
        }
        setLoopStopReason("error");
        remoteTransientMessageFinalized = true;
        return rejectWithValue(message);
      };
      const abortCliStream = async () => {
        if (w2) w2.__LOOP_STOP_REASON__ = "aborted";
        if (accumulated.length <= 0) {
          return;
        }
        await persistMessageWithFixedId(dispatch, buildCliAssistantMessage());
      };
      try {
        const result = await consumeAgentRunStream({
          reader,
          decoder,
          parseChunk: (raw) => {
            const parsed = [];
            for (const line of raw.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              try {
                parsed.push(JSON.parse(line.slice(6)));
              } catch {
              }
            }
            return parsed;
          },
          isAborted: () => loopController.signal.aborted || thunkApi.signal.aborted,
          signal: loopController.signal,
          onAbort: abortCliStream,
          isDoneEvent: (payload) => payload?.done === true,
          onPayload: (payload) => {
            if (payload.error) {
              return { reject: payload.error };
            }
            if (payload.chunk) {
              accumulated += payload.chunk;
              dispatch(messageStreaming({
                id: messageId,
                dialogId: dialogId2,
                dbKey: msgKey,
                content: accumulated,
                role: "assistant",
                ...cliMessageMetadata
              }));
            }
            if (payload.done && Array.isArray(payload.warnings)) {
              cliCapabilityWarnings = payload.warnings.filter(
                (warning) => typeof warning === "string" && warning.trim().length > 0
              );
            }
            if (payload.done && payload.usage) {
              cliTurnUsage = updateTotalUsage(cliTurnUsage, payload.usage);
            }
          }
        });
        if (result.outcome === "rejected") {
          return await rejectCliStream(result.message);
        }
        if (result.outcome === "aborted") {
          return { aborted: true };
        }
        if (result.outcome === "streamEnded") {
          if (!result.sawDone) {
            dispatch(finalizeTransientMessageOnError({
              id: messageId,
              error: "CLI \u6D41\u5F0F\u54CD\u5E94\u88AB\u4E2D\u65AD,\u672A\u6536\u5230\u5B8C\u6210\u4FE1\u53F7"
            }));
            remoteTransientMessageFinalized = true;
            setLoopStopReason("error");
            return rejectWithValue("CLI \u6D41\u5F0F\u54CD\u5E94\u88AB\u4E2D\u65AD,\u672A\u6536\u5230\u5B8C\u6210\u4FE1\u53F7");
          }
          if (cliCapabilityWarnings.length > 0) {
            accumulated = appendCliCapabilityWarnings(accumulated, cliCapabilityWarnings);
            dispatch(messageStreaming({
              id: messageId,
              dialogId: dialogId2,
              dbKey: msgKey,
              content: accumulated,
              role: "assistant",
              ...cliMessageMetadata
            }));
          }
          await persistMessageWithFixedId(dispatch, buildCliAssistantMessage());
          remoteTransientMessageFinalized = true;
          const cliUsageRaw = cliTurnUsage;
          const hasRealUsage = !!cliUsageRaw && (cliUsageRaw.prompt_tokens ?? cliUsageRaw.input_tokens ?? 0) + (cliUsageRaw.completion_tokens ?? cliUsageRaw.output_tokens ?? 0) + (cliUsageRaw.cache_creation_input_tokens ?? 0) + (cliUsageRaw.cache_read_input_tokens ?? 0) > 0;
          const isCliEstimated = !hasRealUsage;
          const cliUsage = hasRealUsage ? cliUsageRaw : estimateMissingUsage({ content: accumulated });
          if (dialogKey2) {
            try {
              await dispatch(updateTokens({
                dialogId: dialogId2,
                dialogKey: dialogKey2,
                usage: cliUsage,
                agentConfig: isCliEstimated ? { ...agentConfig, apiSource: "cli" } : agentConfig
              })).unwrap();
            } catch (err) {
              console.warn("[streamAgentChatTurn] CLI token stats dispatch failed", err);
            }
          }
        }
      } finally {
        try {
          await reader.cancel();
        } catch {
        }
      }
      return;
    }
    const currentDialog = selectDialogConfigByKey(state, explicitDialogKey) ?? selectCurrentDialogConfig(state);
    const activeDialogKey = currentDialog?.dbKey;
    const dialogKey = explicitDialogKey || activeDialogKey;
    if (!dialogKey) {
      return rejectWithValue("\u5F53\u524D\u5BF9\u8BDD\u4E0D\u5B58\u5728\uFF0C\u65E0\u6CD5\u53D1\u9001\u6D88\u606F\u3002");
    }
    runtimeDialogKey = dialogKey;
    const dialogId = extractCustomId(dialogKey);
    logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-dialog-resolved", {
      dialogKey,
      dialogId
    });
    if (shouldUseDesktopLocalRuntime(agentConfig)) {
      const desktopMessageMetadata = buildMessageMetadata(agentConfig);
      const w2 = typeof globalThis !== "undefined" && globalThis.window ? globalThis.window : null;
      loopKey = `loop:${dialogId}`;
      dispatch(addActiveController({ messageId: loopKey, controller: loopController, dialogKey }));
      let currentContent = "";
      const assistantSegments = [];
      let assistantMessageKeys = null;
      let streamResult = null;
      let streamError = null;
      let reasoningBuffer = "";
      const activeToolMessages = /* @__PURE__ */ new Map();
      const ensureAssistantMessageKeys = () => {
        if (!assistantMessageKeys) {
          assistantMessageKeys = createDialogMessageKeyAndId(dialogId);
          assistantSegments.push({
            key: assistantMessageKeys.key,
            messageId: assistantMessageKeys.messageId,
            content: "",
            finalized: false,
            toolCallIds: []
          });
          remoteTransientMessageId = assistantMessageKeys.messageId;
        }
        return assistantMessageKeys;
      };
      const streamDesktopAssistantText = (text) => {
        currentContent += text;
        const { key: msgKey2, messageId: messageId2 } = ensureAssistantMessageKeys();
        const segment2 = assistantSegments[assistantSegments.length - 1];
        segment2.content = currentContent;
        dispatch(messageStreaming({
          id: messageId2,
          dialogId,
          dbKey: msgKey2,
          content: currentContent,
          role: "assistant",
          isStreaming: true,
          ...desktopMessageMetadata
        }));
      };
      const finalizeCurrentAssistantSegmentForTool = () => {
        const segment2 = assistantSegments[assistantSegments.length - 1];
        if (segment2) {
          segment2.content = currentContent;
          segment2.finalized = true;
        }
        if (assistantMessageKeys && currentContent.length > 0) {
          dispatch(messageStreaming({
            id: assistantMessageKeys.messageId,
            dialogId,
            dbKey: assistantMessageKeys.key,
            content: currentContent,
            role: "assistant",
            isStreaming: false,
            ...desktopMessageMetadata
          }));
        }
        assistantMessageKeys = null;
        currentContent = "";
      };
      try {
        const desktopAgentRef = agentConfig.dbKey || agentKey;
        const eventStream = runDesktopAgentRuntimeTurnStream({
          agentRef: desktopAgentRef,
          input: userInput,
          continueDialogId: dialogId,
          dialogKey,
          cwd: runtimeOptions?.cwd,
          restrictShellToWorkspace: runtimeOptions?.restrictShellToWorkspace === true,
          workspaceToolsHint: runtimeOptions?.workspaceToolsHint === true,
          agentConfigSnapshot: agentConfig,
          dialogMessages: selectAllMsgs(getState(), dialogId),
          signal: loopController.signal
        });
        for await (const event of eventStream) {
          if (loopController.signal.aborted || thunkApi.signal.aborted) {
            if (w2) w2.__LOOP_STOP_REASON__ = "aborted";
            break;
          }
          if (event.type === "delta") {
            streamDesktopAssistantText(event.text);
          } else if (event.type === "thinking") {
            if (typeof event.content === "string") {
              reasoningBuffer += event.content;
            }
          } else if (event.type === "tool") {
            const toolEvent = event.event;
            const callId = toolEvent.toolCallId;
            if (!callId) continue;
            if (toolEvent.type === "tool-call") {
              attachToolCallIdToSegment(assistantSegments, callId);
              finalizeCurrentAssistantSegmentForTool();
              const { key: dbKey, messageId: toolMsgId } = createDialogMessageKeyAndId(dialogId);
              const toolMsg = {
                id: toolMsgId,
                dialogId,
                dbKey,
                role: "tool",
                content: "",
                isStreaming: true,
                toolName: toolEvent.toolName,
                toolCallId: callId,
                ...toolEvent.argumentsPreview ? {
                  toolPayload: {
                    input: {
                      command: toolEvent.argumentsPreview,
                      cmd: toolEvent.argumentsPreview
                    }
                  },
                  metadata: {
                    argumentsPreview: toolEvent.argumentsPreview
                  }
                } : {}
              };
              activeToolMessages.set(callId, toolMsg);
              dispatch(messageStreaming(toolMsg));
            } else if (toolEvent.type === "tool-result" || toolEvent.type === "tool-error") {
              const existing = activeToolMessages.get(callId);
              if (existing) {
                const isError = toolEvent.type === "tool-error";
                const existingMeta = asRecordOrEmpty(existing.metadata);
                const existingInput = isRecord(existing.toolPayload?.input) ? existing.toolPayload.input : {};
                const mergedMeta = {
                  ...existingMeta,
                  ...toolEvent.metadata,
                  ...isError ? { error: true, message: toolEvent.message } : {}
                };
                const toolResultMsg = {
                  ...existing,
                  isStreaming: false,
                  content: projectDesktopToolUiContent({
                    toolName: toolEvent.toolName || existing.toolName,
                    content: toolEvent.content,
                    summary: toolEvent.summary,
                    message: toolEvent.message,
                    metadata: mergedMeta,
                    argumentsPreview: asOptionalTrimmedString(mergedMeta.argumentsPreview) || asOptionalTrimmedString(existingInput.command) || asOptionalTrimmedString(existingInput.cmd) || void 0
                  }),
                  metadata: mergedMeta
                };
                activeToolMessages.set(callId, toolResultMsg);
                dispatch(messageStreaming(toolResultMsg));
              }
            }
          } else if (event.type === "done") {
            streamResult = event.result;
          } else if (event.type === "error") {
            streamError = event.error;
          }
        }
      } catch (err) {
        if (isAbortError(err) || loopController.signal.aborted || thunkApi.signal.aborted) {
          if (w2) w2.__LOOP_STOP_REASON__ = "aborted";
        } else {
          streamError = err?.message || "Local turn read stream error";
        }
      }
      if (loopController.signal.aborted || thunkApi.signal.aborted || typeof streamError === "string" && /operation was aborted/i.test(streamError)) {
        if (w2) w2.__LOOP_STOP_REASON__ = "aborted";
        const stopKeys = assistantMessageKeys;
        if (stopKeys) {
          const last = assistantSegments[assistantSegments.length - 1];
          if (last && last.messageId === stopKeys.messageId) {
            last.content = currentContent;
          }
        }
        const stopToolNameById = /* @__PURE__ */ new Map();
        for (const [callId, toolMsg] of activeToolMessages) {
          if (!toolMessageWillPersist(toolMsg)) continue;
          const toolName = toolMsg?.toolName;
          stopToolNameById.set(
            callId,
            typeof toolName === "string" && toolName ? toolName : "tool"
          );
        }
        for (const segment2 of assistantSegments) {
          const hasContent = segment2.content.trim().length > 0;
          const hasToolCalls = segment2.toolCallIds && segment2.toolCallIds.length > 0;
          if (hasContent || hasToolCalls) {
            const stopToolCalls = buildMinimalToolCallsFromIds(
              segment2.toolCallIds,
              stopToolNameById
            );
            await persistMessageWithFixedId(dispatch, {
              id: segment2.messageId,
              dbKey: segment2.key,
              role: "assistant",
              content: segment2.content,
              ...stopToolCalls.length > 0 ? { tool_calls: stopToolCalls } : {},
              ...desktopMessageMetadata,
              userId: selectIdentityUserId(getState())
            });
          } else {
            dispatch(removeTransientMessage(segment2.messageId));
          }
        }
        const durableTools = [];
        for (const toolMsg of activeToolMessages.values()) {
          const content = toolMsg?.content;
          const hasContent = typeof content === "string" ? content.trim().length > 0 : Array.isArray(content) && content.length > 0;
          if (!hasContent) {
            dispatch(removeTransientMessage(toolMsg.id));
            continue;
          }
          const stopped = { ...toolMsg, isStreaming: false };
          dispatch(messageStreaming(stopped));
          durableTools.push(stopped);
        }
        await persistToolMessages(dispatch, durableTools, {
          isStreaming: false,
          soft: true
        });
        remoteTransientMessageFinalized = true;
        return { aborted: true };
      }
      const finalizeDesktopTurnOnError = async (errorText) => {
        const errorToolNameById = /* @__PURE__ */ new Map();
        for (const [callId, toolMsg] of activeToolMessages) {
          if (!toolMessageWillPersist(toolMsg)) continue;
          const toolName = toolMsg?.toolName;
          errorToolNameById.set(
            callId,
            typeof toolName === "string" && toolName ? toolName : "tool"
          );
        }
        for (const segment2 of assistantSegments) {
          const hasContent = segment2.content.trim().length > 0;
          const hasToolCalls = segment2.toolCallIds && segment2.toolCallIds.length > 0;
          if (hasContent || hasToolCalls) {
            const errorToolCalls = buildMinimalToolCallsFromIds(
              segment2.toolCallIds,
              errorToolNameById
            );
            await persistMessageWithFixedId(dispatch, {
              id: segment2.messageId,
              dbKey: segment2.key,
              role: "assistant",
              content: segment2.content,
              ...errorToolCalls.length > 0 ? { tool_calls: errorToolCalls } : {},
              ...desktopMessageMetadata,
              userId: selectIdentityUserId(getState())
            });
            if (hasContent) {
              dispatch(finalizeTransientMessageOnError({
                id: segment2.messageId,
                error: errorText
              }));
            }
          } else {
            dispatch(finalizeTransientMessageOnError({
              id: segment2.messageId,
              error: errorText
            }));
          }
        }
        const durableTools = [];
        for (const toolMsg of activeToolMessages.values()) {
          const content = toolMsg?.content;
          const hasContent = typeof content === "string" ? content.trim().length > 0 : Array.isArray(content) && content.length > 0;
          if (!hasContent) {
            dispatch(removeTransientMessage(toolMsg.id));
            continue;
          }
          const stopped = { ...toolMsg, isStreaming: false };
          dispatch(messageStreaming(stopped));
          durableTools.push(stopped);
        }
        await persistToolMessages(dispatch, durableTools, {
          isStreaming: false,
          soft: true
        });
        remoteTransientMessageFinalized = true;
        setLoopStopReason("error");
      };
      if (streamError) {
        await finalizeDesktopTurnOnError(streamError);
        return rejectWithValue(streamError);
      }
      if (!streamResult) {
        const message = "Local turn stream closed unexpectedly without result";
        await finalizeDesktopTurnOnError(message);
        return rejectWithValue(message);
      }
      const desktopTurnMessages = streamResult.turnMessages || [];
      const hasSegmentWithCallIds = assistantSegments.some(
        (s) => s.toolCallIds.length > 0
      );
      if (!hasSegmentWithCallIds) {
        const doneOnlyAssistantCalls = desktopTurnMessages.filter(
          (m) => m?.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0
        ).flatMap((m) => m.tool_calls.map((tc) => tc?.id)).filter((id) => typeof id === "string");
        if (doneOnlyAssistantCalls.length > 0) {
          ensureAssistantMessageKeys();
          for (const callId of doneOnlyAssistantCalls) {
            attachToolCallIdToSegment(assistantSegments, callId);
          }
          if (currentContent.length === 0) {
            finalizeCurrentAssistantSegmentForTool();
          }
        }
      }
      if (activeToolMessages.size === 0) {
        for (const toolMessage of buildDesktopRuntimeToolMessagesForUi({
          dialogId,
          turnMessages: desktopTurnMessages
        })) {
          dispatch(messageStreaming(toolMessage));
          activeToolMessages.set(
            asTrimmedString(toolMessage.toolCallId) || toolMessage.id,
            toolMessage
          );
        }
      }
      await persistToolMessages(
        dispatch,
        activeToolMessages.values(),
        { isStreaming: false, soft: true }
      );
      const earlierFinalizedSegments = selectPersistableFinalizedSegments(assistantSegments);
      for (const segment2 of earlierFinalizedSegments) {
        const segmentToolCalls = resolveSegmentToolCalls(
          segment2.toolCallIds,
          desktopTurnMessages
        );
        dispatch(write({
          data: {
            id: segment2.messageId,
            dbKey: segment2.key,
            dialogId,
            content: segment2.content,
            role: "assistant",
            isStreaming: false,
            type: "msg" /* MSG */,
            ...segmentToolCalls.length > 0 ? { tool_calls: segmentToolCalls } : {},
            ...desktopMessageMetadata
          },
          customKey: segment2.key
        }));
      }
      const { key: msgKey, messageId } = ensureAssistantMessageKeys();
      const lastSegmentContent = hasInlineExecutedToolCalls(streamResult) ? currentContent || "" : streamResult.content || currentContent || "";
      const segment = assistantSegments[assistantSegments.length - 1];
      segment.content = lastSegmentContent;
      dispatch(messageStreaming({
        id: messageId,
        dialogId,
        dbKey: msgKey,
        content: lastSegmentContent,
        role: "assistant",
        isStreaming: false,
        ...desktopMessageMetadata
      }));
      const lastSegmentToolCalls = segment ? resolveSegmentToolCalls(segment.toolCallIds, desktopTurnMessages) : [];
      await dispatch(messageStreamEnd({
        finalContentBuffer: [
          {
            type: "text",
            text: lastSegmentContent
          }
        ],
        totalUsage: streamResult.usage ?? void 0,
        messageId,
        msgKey,
        agentConfig,
        dialogId,
        dialogKey,
        // 优先用本 turn 累计的 thinking SSE；为空时兜底 streamResult.reasoning_content
        // （provider 在 SSE 流内累计返回的 reasoning_content）。
        reasoningBuffer: reasoningBuffer || (typeof streamResult?.reasoning_content === "string" ? streamResult.reasoning_content : ""),
        toolCalls: lastSegmentToolCalls,
        // 把 provider 报告的 finish_reason 透传给 messageStreamEnd，
        // 由 assembleFinalAssistantMessage 决定是否写进最终 Message。
        finishReason: streamResult.finish_reason ?? void 0,
        messageMetadata: desktopMessageMetadata
      })).unwrap();
      remoteTransientMessageFinalized = true;
      return {
        usage: streamResult.usage ?? void 0
      };
    }
    const userInputText = extractAgentRunUserText(userInput);
    const explicitServerBase = asOptionalTrimmedString(args.serverBase) ?? null;
    const currentServer = selectCurrentServer(state);
    const normalizedRequestedServerBase = explicitServerBase && normalizeServerOrigin(explicitServerBase);
    const normalizedCurrentServer = normalizeServerOrigin(
      currentServer
    );
    const canProxyToExplicitServerBase = !Array.isArray(userInput) && !runtimeOptions?.extraTools?.length && !runtimeOptions?.editingTarget && !runtimeOptions?.imageConfigOverride;
    if (explicitServerBase && canProxyToExplicitServerBase) {
      if (normalizedRequestedServerBase && normalizedCurrentServer && normalizedRequestedServerBase === normalizedCurrentServer) {
      } else {
        const token = selectIdentityToken(state);
        const authHeader = token ? `Bearer ${token}` : "";
        const rawMessages = selectAllMsgs(state, dialogId);
        const visibleMessages = buildAgentViewMessages(
          rawMessages,
          agentConfig.dbKey
        );
        const cleanedMessages = filterAndCleanMessages(visibleMessages);
        const { key: msgKey, messageId } = createDialogMessageKeyAndId(dialogId);
        remoteTransientMessageId = messageId;
        const remoteMessageMetadata = buildMessageMetadata(agentConfig);
        let accumulated = "";
        let totalTurnUsage2 = void 0;
        const buildRemoteAssistantMessage = () => ({
          id: messageId,
          dbKey: msgKey,
          role: "assistant",
          content: accumulated,
          ...remoteMessageMetadata,
          userId: selectIdentityUserId(getState())
        });
        const remoteToolHandlers = createRemoteToolEventHandlers({
          dialogId,
          dispatch,
          messageMetadata: remoteMessageMetadata
        });
        loopKey = `loop:${dialogId}`;
        dispatch(addActiveController({ messageId: loopKey, controller: loopController, dialogKey }));
        dispatch(messageStreaming({
          id: messageId,
          dialogId,
          dbKey: msgKey,
          content: "",
          role: "assistant",
          ...remoteMessageMetadata
        }));
        const rejectRemoteStream = async (message) => {
          if (accumulated.length > 0) {
            await persistMessageWithFixedId(dispatch, buildRemoteAssistantMessage());
          } else {
            dispatch(removeTransientMessage(messageId));
          }
          await persistRemoteToolMessagesAndCleanup(
            dispatch,
            remoteToolHandlers.activeToolMessages
          ).catch(() => {
          });
          setLoopStopReason("error");
          remoteTransientMessageFinalized = true;
          return rejectWithValue(message);
        };
        const remoteRequestBody = JSON.stringify({
          agentKey,
          userInput: agentRunUserInput,
          messages: cleanedMessages,
          stream: true,
          persistDialog: false,
          clientDialogId: dialogId,
          runtimeContext: {
            surface: "web",
            host: "browser",
            runtime: "react",
            entrypoint: "chat-dialog",
            capabilities: ["streaming", "dialog-ui", "tool-cards"]
          },
          ...runtimeOptions?.quickChatReasoningEffort ? {
            runtimeOptions: {
              quickChatReasoningEffort: runtimeOptions.quickChatReasoningEffort
            }
          } : {},
          ...currentDialog?.spaceId ? { spaceId: currentDialog.spaceId } : {}
        });
        const remoteRunUrl = `${explicitServerBase.replace(/\/+$/, "")}/api/agent/run`;
        const remoteResponse = await performServerProxyFetchWithRetry({
          execute: () => fetch(remoteRunUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              ...authHeader ? { Authorization: authHeader } : {}
            },
            body: remoteRequestBody,
            signal: loopController.signal
          }),
          signal: loopController.signal,
          logPrefix: "[streamAgentChatTurn.remoteRun]"
        });
        if (!remoteResponse.ok) {
          const errorText = await remoteResponse.text();
          return await rejectRemoteStream(
            errorText || `Remote agent run failed (${remoteResponse.status})`
          );
        }
        const reader = remoteResponse.body?.getReader();
        if (!reader) {
          return await rejectRemoteStream("\u65E0\u6CD5\u8BFB\u53D6\u8FDC\u7AEF\u6D41\u5F0F\u54CD\u5E94");
        }
        const decoder = new TextDecoder();
        const parseSSE = createSSEParser();
        const abortRemoteStream = async () => {
          if (accumulated.length <= 0) {
            await persistRemoteToolMessagesAndCleanup(
              dispatch,
              remoteToolHandlers.activeToolMessages
            ).catch(() => {
            });
            return;
          }
          await persistMessageWithFixedId(dispatch, buildRemoteAssistantMessage());
          await persistRemoteToolMessagesAndCleanup(
            dispatch,
            remoteToolHandlers.activeToolMessages
          ).catch(() => {
          });
        };
        try {
          const result = await consumeAgentRunStream({
            reader,
            decoder,
            parseChunk: (raw) => parseSSE(raw),
            isAborted: () => loopController.signal.aborted || thunkApi.signal.aborted,
            signal: loopController.signal,
            onAbort: abortRemoteStream,
            isDoneEvent: (payload) => payload?.type === "done",
            onPayload: async (payload) => {
              if (payload.type === "error") {
                return { reject: payload.message || "\u8FDC\u7AEF Agent \u6267\u884C\u5931\u8D25" };
              }
              if (payload.type === "agent_handoff") {
                await patchDialogThreadMetadata(
                  dispatch,
                  dialogKey,
                  payload.threadMetadata
                );
                await patchDialogActiveAgent(
                  dispatch,
                  dialogKey,
                  payload.agentKey
                );
              }
              remoteToolHandlers.handleToolPayload(payload);
              if (payload.type === "text" && typeof payload.content === "string") {
                accumulated += payload.content;
                dispatch(messageStreaming({
                  id: messageId,
                  dialogId,
                  dbKey: msgKey,
                  content: accumulated,
                  role: "assistant",
                  ...remoteMessageMetadata
                }));
              }
              if (payload.type === "done") {
                totalTurnUsage2 = payload.usage;
              }
            }
          });
          if (result.outcome === "rejected") {
            return await rejectRemoteStream(result.message);
          }
          if (result.outcome === "aborted") {
            return { aborted: true };
          }
          if (result.outcome === "streamEnded") {
            if (!result.sawDone) {
              dispatch(finalizeTransientMessageOnError({
                id: messageId,
                error: "\u8FDC\u7AEF Agent \u6D41\u5F0F\u54CD\u5E94\u88AB\u4E2D\u65AD,\u672A\u6536\u5230\u5B8C\u6210\u4FE1\u53F7"
              }));
              await persistRemoteToolMessagesAndCleanup(
                dispatch,
                remoteToolHandlers.activeToolMessages
              ).catch(() => {
              });
              remoteTransientMessageFinalized = true;
              setLoopStopReason("error");
              return rejectWithValue(
                "\u8FDC\u7AEF Agent \u6D41\u5F0F\u54CD\u5E94\u88AB\u4E2D\u65AD,\u672A\u6536\u5230\u5B8C\u6210\u4FE1\u53F7"
              );
            }
            await persistMessageWithFixedId(dispatch, buildRemoteAssistantMessage());
            await persistRemoteToolMessagesAndCleanup(
              dispatch,
              remoteToolHandlers.activeToolMessages
            );
            remoteTransientMessageFinalized = true;
          }
        } finally {
          try {
            await reader.cancel();
          } catch {
          }
          if (remoteToolHandlers.activeToolMessages.size > 0) {
            await persistRemoteToolMessagesAndCleanup(
              dispatch,
              remoteToolHandlers.activeToolMessages
            ).catch(() => {
            });
          }
        }
        return {
          usage: totalTurnUsage2 ?? void 0
        };
      }
    }
    let extractedMentions;
    if (Array.isArray(userInput)) {
      extractedMentions = extractCategorizedMentions(userInput);
    }
    const mentionedTools = extractedMentions?.tools ?? [];
    const {
      references: normalizedReferences,
      contentByKey: referenceContentCache,
      referencedTools: referenceTools,
      recommendedSkillTools: referenceRecommendedSkillTools,
      recommendedSkillHints: referenceRecommendedSkillHints,
      skillPromptPatches: referenceSkillPromptPatches
    } = await resolveReferenceAssets(
      mergeReferences(agentConfig.references, (selectDialogConfigByKey(getState(), explicitDialogKey) ?? selectCurrentDialogConfig(getState()))?.extraReferences),
      dispatch
    );
    logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-references-resolved", {
      referenceCount: normalizedReferences?.length ?? 0,
      referencedToolCount: referenceTools?.length ?? 0
    });
    const agentConfigWithReferences = {
      ...agentConfig,
      references: normalizedReferences,
      referencedTools: referenceTools,
      recommendedSkillTools: referenceRecommendedSkillTools,
      recommendedSkillHints: referenceRecommendedSkillHints,
      skillPromptPatches: referenceSkillPromptPatches
    };
    const initialRawMsgs = selectAllMsgs(state, dialogId);
    const initialHistoryIds = new Set(initialRawMsgs.map((m) => m.id));
    const keySets = await getFullChatContextKeys(
      state,
      dispatch,
      agentConfigWithReferences,
      userInput,
      currentDialog ?? void 0
    );
    const finalKeys = deduplicateContextKeys(keySets);
    const allContextKeys = /* @__PURE__ */ new Set([
      ...finalKeys.botInstructionsContext,
      ...finalKeys.currentInputContext,
      ...finalKeys.historyContext,
      ...finalKeys.botKnowledgeContext
    ]);
    const {
      tools: contextTools,
      contentByKey: contextContentCache,
      recommendedSkillTools: contextRecommendedSkillTools = [],
      recommendedSkillHints: contextRecommendedSkillHints = [],
      skillPromptPatches: contextSkillPromptPatches = []
    } = await resolveToolsFromKeys(
      Array.from(allContextKeys),
      dispatch,
      referenceContentCache
    );
    const mergedContentCache = new Map([
      ...referenceContentCache,
      ...contextContentCache
    ]);
    const agentConfigWithTools = mergeAgentToolsWithRuntime(
      {
        ...agentConfigWithReferences,
        recommendedSkillTools: [
          ...agentConfigWithReferences.recommendedSkillTools ?? [],
          ...contextRecommendedSkillTools
        ],
        recommendedSkillHints: [
          ...agentConfigWithReferences.recommendedSkillHints ?? [],
          ...contextRecommendedSkillHints
        ],
        skillPromptPatches: [
          ...agentConfigWithReferences.skillPromptPatches ?? [],
          ...contextSkillPromptPatches
        ]
      },
      contextTools,
      mentionedTools,
      runtimeOptions,
      state
    );
    const agentConfigForCall = applyImageConfigRuntimeOverride(
      agentConfigWithTools,
      runtimeOptions
    );
    const effectiveAgentConfig = agentConfigForCall;
    const initialImageGenerationState = resolveImageGenerationStreamingState(
      effectiveAgentConfig
    );
    const streamingMessageMetadata = {
      ...buildMessageMetadata(agentConfigForCall),
      ...initialImageGenerationState ? { imageGenerationState: initialImageGenerationState } : {}
    };
    const isRespModel = resolveClientWire(
      resolveAgentCallPlan(agentConfigForCall, {})
    ) === "responses";
    if (isRespModel) {
      const maxExecutionTime2 = selectMaxExecutionTime(state);
      const MAX_TIME_MS2 = maxExecutionTime2 > 0 ? maxExecutionTime2 : 24e4;
      const startTime2 = Date.now();
      const staticContexts2 = await buildStaticContextsWithToolsPrewarm(
        state,
        dispatch,
        agentConfigForCall,
        currentDialog ?? void 0,
        mergedContentCache
      );
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-static-context-ready", {
        model: agentConfigForCall.model,
        responseApi: true
      });
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-post-static-entered", {
        responseApi: true
      });
      let appendTempUserInput2 = true;
      let currentParentMessageId2 = parentMessageId ?? void 0;
      const storedResponsesState = currentDialog?.responsesState;
      let responsesState = selectResponsesConversationState(
        storedResponsesState,
        agentConfigForCall
      );
      if (storedResponsesState != null && !responsesState) {
        dispatch(
          patch({
            dbKey: dialogKey,
            changes: { responsesState: null }
          })
        );
      }
      const w2 = typeof globalThis !== "undefined" && globalThis.window ? globalThis.window : null;
      if (w2) w2.__LOOP_STOP_REASON__ = null;
      loopKey = `loop:${dialogId}`;
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-active-controller-adding", {
        responseApi: true
      });
      dispatch(addActiveController({ messageId: loopKey, controller: loopController, dialogKey }));
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-active-controller-added", {
        responseApi: true
      });
      for (; ; ) {
        logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-loop-entered", {
          responseApi: true
        });
        const requestParentMessageId = currentParentMessageId2;
        if (loopController.signal.aborted || thunkApi.signal.aborted) {
          logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-loop-aborted-before-context", {
            loopControllerAborted: loopController.signal.aborted,
            thunkSignalAborted: thunkApi.signal.aborted,
            responseApi: true
          });
          if (w2) w2.__LOOP_STOP_REASON__ = "aborted";
          return { aborted: true };
        }
        const loopState = getState();
        const now = Date.now();
        if (now - startTime2 > MAX_TIME_MS2) {
          logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-loop-timeout-before-context", {
            maxTimeMs: MAX_TIME_MS2,
            elapsedMs: now - startTime2,
            responseApi: true
          });
          if (w2) w2.__LOOP_STOP_REASON__ = "timeout";
          break;
        }
        const accessError = validateAccessAndBalance(
          agentConfigForCall,
          loopState
        );
        if (accessError) {
          const accessErrorReason = classifyQuickChatAccessError(accessError);
          logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-access-error-before-context", {
            hasAccessError: true,
            reason: accessErrorReason,
            responseApi: true
          });
          if (quickChatPerfStartedAt && runtimeDialogKey && !modelRequestStarted) {
            logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-access-error-finalized", {
              reason: accessErrorReason,
              responseApi: true
            });
            await finalizeQuickChatAgentTurnFailure(
              dispatch,
              runtimeDialogKey,
              agentKey,
              new Error(accessError)
            );
          }
          setLoopStopReason("error");
          return rejectWithValue(accessError);
        }
        const willSkipDynamicContext = canUseQuickChatEmptyDynamicContexts(
          quickChatPerfStartedAt,
          userInput,
          runtimeOptions,
          currentDialog,
          agentConfigForCall
        );
        logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-dynamic-context-decision", {
          hasRuntimeOptions: !!runtimeOptions,
          isSimpleTextInput: isSimpleTextInput(userInput),
          referenceKeyCount: currentDialog?.referenceKeys?.length ?? 0,
          willSkipDynamicContext,
          responseApi: true
        });
        const dynamicContexts = willSkipDynamicContext ? (logQuickChatPerfStage2(
          quickChatPerfStartedAt,
          "stream-agent-dynamic-context-skipped",
          {
            reason: "simple-quick-chat-first-turn",
            responseApi: true
          }
        ), EMPTY_DYNAMIC_CONTEXTS) : await buildDynamicContextsForTurn(
          loopState,
          dispatch,
          agentConfigForCall,
          userInput,
          runtimeOptions,
          mergedContentCache,
          dialogKey,
          quickChatPerfStartedAt
        );
        logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-dynamic-context-ready", {
          responseApi: true
        });
        const contexts = mergeContexts(staticContexts2, dynamicContexts);
        const rawMessages = selectAllMsgs(loopState, dialogId);
        let visibleMessages = buildAgentViewMessages(
          rawMessages,
          agentConfigForCall.dbKey
        );
        if (appendTempUserInput2 && hasAgentRunUserInputContent(agentRunUserInput) && !isLastMessageMatchingUserInput(visibleMessages, agentRunUserInput)) {
          visibleMessages = [
            ...visibleMessages,
            {
              id: `__tmp_user_${Date.now()}`,
              dbKey: "",
              role: "user",
              content: agentRunUserInput,
              thinkContent: "",
              cybotKey: agentConfigForCall.dbKey,
              isStreaming: false
            }
          ];
        }
        const cleanedMessages = filterAndCleanMessages(visibleMessages);
        const ctxWindow = getModelContextWindow(agentConfigForCall.model) || 128e3;
        const summaryTokenCount = contexts.dialogSummary ? estimateTokenCount(contexts.dialogSummary) : 0;
        const processedMessages = trimMessagesWithSummary(
          compressOldToolResults(cleanedMessages),
          ctxWindow,
          summaryTokenCount
        );
        let firstDynamicIdx = processedMessages.findIndex(
          (m) => m.id && !initialHistoryIds.has(m.id)
        );
        if (firstDynamicIdx === -1) firstDynamicIdx = processedMessages.length;
        const stableMessages = processedMessages.slice(0, firstDynamicIdx);
        const dynamicMessages = processedMessages.slice(firstDynamicIdx);
        if (appendTempUserInput2) {
          const rejectReason = shouldRejectImageInputForAgent(
            agentConfigForCall,
            processedMessages
          );
          if (rejectReason) {
            setLoopStopReason("error");
            return rejectWithValue(rejectReason);
          }
        }
        const bodyData = generateRequestBody({
          agentConfig: effectiveAgentConfig,
          messages: dynamicMessages,
          stableMessages,
          userInput: userInputText,
          contexts,
          responsesState
        });
        const fallbackBodyData = responsesState ? generateRequestBody({
          agentConfig: effectiveAgentConfig,
          messages: dynamicMessages,
          stableMessages,
          userInput: userInputText,
          contexts,
          responsesState: null
        }) : void 0;
        logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-model-request-starting", {
          responseApi: true,
          dynamicMessageCount: dynamicMessages.length,
          stableMessageCount: stableMessages.length
        });
        modelRequestStarted = true;
        const meta = await sendOpenAIResponseRequest({
          bodyData,
          agentConfig: agentConfigForCall,
          thunkApi,
          dialogKey,
          parentMessageId: currentParentMessageId2,
          messageMetadata: streamingMessageMetadata,
          quickChatPerfStartedAt,
          fallbackBodyData
        });
        logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-model-request-finished", {
          responseApi: true,
          hasToolCalls: meta.hasToolCalls,
          hasHandedOff: meta.hasHandedOff,
          hasPendingInteraction: meta.hasPendingInteraction
        });
        appendTempUserInput2 = false;
        currentParentMessageId2 = void 0;
        if (meta.responseId) {
          responsesState = updateResponsesConversationState(
            agentConfigForCall,
            meta.responseId
          );
          if (responsesState) {
            dispatch(
              patch({
                dbKey: dialogKey,
                changes: { responsesState }
              })
            );
          } else if (meta.responsesStateFallback) {
            dispatch(
              patch({
                dbKey: dialogKey,
                changes: { responsesState: null }
              })
            );
          }
        } else if (meta.responsesStateFallback) {
          responsesState = null;
          dispatch(
            patch({
              dbKey: dialogKey,
              changes: { responsesState: null }
            })
          );
        }
        totalTurnUsage = updateTotalUsage(totalTurnUsage, meta.usage);
        if (meta.hasHandedOff) {
          if (!requestParentMessageId && meta.messageId) {
            dispatch(removeTransientMessage(meta.messageId));
          }
          if (w2) w2.__LOOP_STOP_REASON__ = "handoff";
          break;
        }
        if (meta.hasPendingInteraction) {
          if (w2) w2.__LOOP_STOP_REASON__ = "pending";
          break;
        }
        const afterTurnState = getState();
        const queuedMessages = selectPendingUserInputQueue(afterTurnState, dialogKey);
        if (queuedMessages.length > 0) {
          const queuedText = queuedMessages[0];
          const currentDialogConfig = selectDialogConfigByKey(afterTurnState, dialogKey) ?? selectCurrentDialogConfig(afterTurnState);
          if (!currentDialogConfig) {
            dispatch(clearPendingUserInputQueue({ dialogKey }));
            break;
          }
          await dispatch(
            prepareAndPersistUserMessage({
              userInput: queuedText,
              dialogConfig: currentDialogConfig
            })
          ).unwrap();
          dispatch(dequeueUserInput({ dialogKey }));
          continue;
        }
        if (!meta.hasToolCalls) {
          if (w2) w2.__LOOP_STOP_REASON__ = "done";
          break;
        }
      }
      return {
        usage: totalTurnUsage ?? void 0
      };
    }
    const maxExecutionTime = selectMaxExecutionTime(state);
    const MAX_TIME_MS = maxExecutionTime > 0 ? maxExecutionTime : 24e4;
    const startTime = Date.now();
    const staticContexts = await buildStaticContextsWithToolsPrewarm(
      state,
      dispatch,
      agentConfigForCall,
      currentDialog ?? void 0,
      mergedContentCache
    );
    logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-static-context-ready", {
      model: agentConfigForCall.model,
      responseApi: false
    });
    logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-post-static-entered", {
      responseApi: false
    });
    let appendTempUserInput = true;
    let currentParentMessageId = parentMessageId ?? void 0;
    const w = typeof globalThis !== "undefined" && globalThis.window ? globalThis.window : null;
    if (w) w.__LOOP_STOP_REASON__ = null;
    if (!isRespModel) {
      loopKey = `loop:${dialogId}`;
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-active-controller-adding", {
        responseApi: false
      });
      dispatch(addActiveController({ messageId: loopKey, controller: loopController, dialogKey }));
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-active-controller-added", {
        responseApi: false
      });
    }
    for (; ; ) {
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-loop-entered", {
        responseApi: false
      });
      const requestParentMessageId = currentParentMessageId;
      if (loopController.signal.aborted || thunkApi.signal.aborted) {
        logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-loop-aborted-before-context", {
          loopControllerAborted: loopController.signal.aborted,
          thunkSignalAborted: thunkApi.signal.aborted,
          responseApi: false
        });
        if (w) w.__LOOP_STOP_REASON__ = "aborted";
        return { aborted: true };
      }
      const loopState = getState();
      const now = Date.now();
      if (now - startTime > MAX_TIME_MS) {
        logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-loop-timeout-before-context", {
          maxTimeMs: MAX_TIME_MS,
          elapsedMs: now - startTime,
          responseApi: false
        });
        if (w) w.__LOOP_STOP_REASON__ = "timeout";
        break;
      }
      const accessError = validateAccessAndBalance(
        agentConfigForCall,
        loopState
      );
      if (accessError) {
        const accessErrorReason = classifyQuickChatAccessError(accessError);
        logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-access-error-before-context", {
          hasAccessError: true,
          reason: accessErrorReason,
          responseApi: false
        });
        if (quickChatPerfStartedAt && runtimeDialogKey && !modelRequestStarted) {
          logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-access-error-finalized", {
            reason: accessErrorReason,
            responseApi: false
          });
          await finalizeQuickChatAgentTurnFailure(
            dispatch,
            runtimeDialogKey,
            agentKey,
            new Error(accessError)
          );
        }
        setLoopStopReason("error");
        return rejectWithValue(accessError);
      }
      const willSkipDynamicContext = canUseQuickChatEmptyDynamicContexts(
        quickChatPerfStartedAt,
        userInput,
        runtimeOptions,
        currentDialog,
        agentConfigForCall
      );
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-dynamic-context-decision", {
        hasRuntimeOptions: !!runtimeOptions,
        isSimpleTextInput: isSimpleTextInput(userInput),
        referenceKeyCount: currentDialog?.referenceKeys?.length ?? 0,
        willSkipDynamicContext,
        responseApi: false
      });
      const dynamicContexts = willSkipDynamicContext ? (logQuickChatPerfStage2(
        quickChatPerfStartedAt,
        "stream-agent-dynamic-context-skipped",
        {
          reason: "simple-quick-chat-first-turn",
          responseApi: false
        }
      ), EMPTY_DYNAMIC_CONTEXTS) : await buildDynamicContextsForTurn(
        loopState,
        dispatch,
        agentConfigForCall,
        userInput,
        runtimeOptions,
        mergedContentCache,
        dialogKey,
        quickChatPerfStartedAt
      );
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-dynamic-context-ready", {
        responseApi: false
      });
      const contexts = mergeContexts(staticContexts, dynamicContexts);
      const rawMessages = selectAllMsgs(loopState, dialogId);
      let visibleMessages = buildAgentViewMessages(
        rawMessages,
        agentConfigForCall.dbKey
      );
      if (appendTempUserInput && hasAgentRunUserInputContent(agentRunUserInput) && !isLastMessageMatchingUserInput(visibleMessages, agentRunUserInput)) {
        visibleMessages = [
          ...visibleMessages,
          {
            id: `__tmp_user_${Date.now()}`,
            dbKey: "",
            role: "user",
            content: agentRunUserInput,
            thinkContent: "",
            cybotKey: agentConfigForCall.dbKey,
            isStreaming: false
          }
        ];
      }
      const cleanedMessages = filterAndCleanMessages(visibleMessages);
      const ctxWindow = getModelContextWindow(agentConfigForCall.model) || 128e3;
      const summaryTokenCount = contexts.dialogSummary ? estimateTokenCount(contexts.dialogSummary) : 0;
      const processedMessages = trimMessagesWithSummary(
        compressOldToolResults(cleanedMessages),
        ctxWindow,
        summaryTokenCount
      );
      let firstDynamicIdx = processedMessages.findIndex(
        (m) => m.id && !initialHistoryIds.has(m.id)
      );
      if (firstDynamicIdx === -1) firstDynamicIdx = processedMessages.length;
      const stableMessages = processedMessages.slice(0, firstDynamicIdx);
      const dynamicMessages = processedMessages.slice(firstDynamicIdx);
      if (appendTempUserInput) {
        const rejectReason = shouldRejectImageInputForAgent(
          agentConfigForCall,
          processedMessages
        );
        if (rejectReason) {
          setLoopStopReason("error");
          return rejectWithValue(rejectReason);
        }
      }
      const bodyData = generateRequestBody({
        agentConfig: effectiveAgentConfig,
        messages: dynamicMessages,
        stableMessages,
        userInput: userInputText,
        contexts
      });
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-model-request-starting", {
        responseApi: false,
        dynamicMessageCount: dynamicMessages.length,
        stableMessageCount: stableMessages.length
      });
      modelRequestStarted = true;
      const disableToolsForThisRequest = shouldDisableQuickChatToolsForDirectAnswer(
        quickChatPerfStartedAt,
        userInput,
        runtimeOptions,
        currentDialog
      );
      if (disableToolsForThisRequest) {
        logQuickChatPerfStage2(
          quickChatPerfStartedAt,
          "stream-agent-tools-disabled-for-direct-answer",
          {
            responseApi: false,
            toolCount: Array.isArray(agentConfigForCall.tools) ? agentConfigForCall.tools.length : 0
          }
        );
      }
      const meta = await sendOpenAICompletionsRequest({
        bodyData,
        agentConfig: agentConfigForCall,
        thunkApi,
        dialogKey,
        parentMessageId: currentParentMessageId,
        messageMetadata: streamingMessageMetadata,
        disableToolsForThisRequest,
        quickChatPerfStartedAt
      });
      logQuickChatPerfStage2(quickChatPerfStartedAt, "stream-agent-model-request-finished", {
        responseApi: false,
        hasToolCalls: meta.hasToolCalls,
        hasHandedOff: meta.hasHandedOff,
        hasPendingInteraction: meta.hasPendingInteraction
      });
      appendTempUserInput = false;
      currentParentMessageId = void 0;
      totalTurnUsage = updateTotalUsage(totalTurnUsage, meta.usage);
      if (meta.hasHandedOff) {
        if (!requestParentMessageId && meta.messageId) {
          dispatch(removeTransientMessage(meta.messageId));
        }
        if (w) w.__LOOP_STOP_REASON__ = "handoff";
        break;
      }
      if (meta.hasPendingInteraction) {
        if (w) w.__LOOP_STOP_REASON__ = "pending";
        break;
      }
      const afterTurnState = getState();
      const queuedMessages = selectPendingUserInputQueue(afterTurnState, dialogKey);
      if (queuedMessages.length > 0) {
        const queuedText = queuedMessages[0];
        const currentDialogConfig = selectDialogConfigByKey(afterTurnState, dialogKey) ?? selectCurrentDialogConfig(afterTurnState);
        if (!currentDialogConfig) {
          dispatch(clearPendingUserInputQueue({ dialogKey }));
          break;
        }
        await dispatch(
          prepareAndPersistUserMessage({
            userInput: queuedText,
            dialogConfig: currentDialogConfig
          })
        ).unwrap();
        dispatch(dequeueUserInput({ dialogKey }));
        continue;
      }
      if (!meta.hasToolCalls) {
        if (w) w.__LOOP_STOP_REASON__ = "done";
        break;
      }
    }
    return {
      usage: totalTurnUsage ?? void 0
    };
  } catch (error) {
    if (isTurnAborted(error)) {
      turnAborted = true;
      if (remoteTransientMessageId && !remoteTransientMessageFinalized) {
        dispatch(removeTransientMessage(remoteTransientMessageId));
        remoteTransientMessageFinalized = true;
      }
      const w = typeof globalThis !== "undefined" && globalThis.window ? globalThis.window : null;
      if (w) w.__LOOP_STOP_REASON__ = "aborted";
      return { aborted: true };
    }
    console.error(
      `Error in streamAgentChatTurn for [${agentKey}]:`,
      error
    );
    if (remoteTransientMessageId && !remoteTransientMessageFinalized) {
      dispatch(finalizeTransientMessageOnError({
        id: remoteTransientMessageId,
        error: toErrorMessage(error)
      }));
      remoteTransientMessageFinalized = true;
      setLoopStopReason("error");
    }
    if (quickChatPerfStartedAt && runtimeDialogKey && !modelRequestStarted && !remoteTransientMessageId) {
      await finalizeQuickChatAgentTurnFailure(
        dispatch,
        runtimeDialogKey,
        agentKey,
        error
      );
    } else if (!isTurnAborted(error)) {
      setLoopStopReason("error");
    }
    return rejectWithValue(
      error?.message || "An unexpected error occurred in streamAgentChatTurn."
    );
  } finally {
    if (loopKey && runtimeDialogKey) {
      dispatch(removeActiveController({ messageId: loopKey, dialogKey: runtimeDialogKey }));
    } else if (loopKey) {
      dispatch(removeActiveController(loopKey));
    }
    if (turnAborted) {
      dispatch(clearPendingUserInputQueue(runtimeDialogKey ? { dialogKey: runtimeDialogKey } : void 0));
    }
    if (runtimeDialogKey) {
      dispatch(runChatQueueTurnEnd({
        dialogKey: runtimeDialogKey,
        ok: !turnAborted,
        aborted: turnAborted
      }));
    }
    thunkApi.signal.removeEventListener("abort", onAbort);
  }
};
export {
  streamAgentChatTurnHandler
};
