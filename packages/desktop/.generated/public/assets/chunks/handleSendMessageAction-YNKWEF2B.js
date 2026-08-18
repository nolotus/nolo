import {
  createDialogMessageKeyAndId,
  messageStreamEnd,
  prepareAndPersistUserMessage,
  readAndWait,
  resolveHandleSendMessageContext,
  selectById,
  streamAgentChatTurn
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  extractCustomId,
  getActiveDialogKey
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/dialog/actions/parseOAuthError.ts
var PROVIDER_NAMES = {
  antigravity: "Antigravity (Google)",
  claude: "Claude",
  chatgpt: "ChatGPT",
  xai: "xAI Grok",
  cursor: "Cursor",
  cloudflare: "Cloudflare"
};
function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return null;
}
function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function collectValidationFromDetails(details) {
  if (!Array.isArray(details)) return {};
  let url;
  let text;
  let learnMoreUrl;
  for (const detail of details) {
    const rec = asRecord(detail);
    if (!rec) continue;
    const metadata = asRecord(rec.metadata);
    if (metadata) {
      url = url ?? asString(metadata.validation_url);
      text = text ?? asString(metadata.validation_url_link_text);
      learnMoreUrl = learnMoreUrl ?? asString(metadata.validation_learn_more_url);
    }
    const help = asRecord(rec);
    if (Array.isArray(help.links)) {
      for (const link of help.links) {
        const linkRec = asRecord(link);
        if (!linkRec) continue;
        const linkUrl = asString(linkRec.url);
        if (!linkUrl) continue;
        const desc = asString(linkRec.description);
        if (!url && desc && /verify|continue/i.test(desc)) {
          url = linkUrl;
          text = desc;
        } else if (!learnMoreUrl && /learn more/i.test(desc ?? "")) {
          learnMoreUrl = linkUrl;
        }
      }
    }
  }
  return { url, text, learnMoreUrl };
}
function parseSendError(errorMessage) {
  const summary = errorMessage.replace(/^local\s+/, "").split("\n")[0].trim();
  const providerMatch = errorMessage.match(/local\s+(\w+)\s+OAuth provider failed/i);
  const providerName = providerMatch ? PROVIDER_NAMES[providerMatch[1].toLowerCase()] ?? providerMatch[1] : void 0;
  const statusMatch = errorMessage.match(/HTTP\s+(\d{3})/);
  const status = statusMatch?.[1];
  const jsonStart = errorMessage.indexOf("{");
  let payload = null;
  if (jsonStart >= 0) {
    let candidate = errorMessage.slice(jsonStart);
    for (let depth = 0; depth < 3; depth += 1) {
      try {
        const parsed = JSON.parse(candidate);
        payload = parsed;
        const message = asString(parsed?.error?.message);
        if (message && message.trim().startsWith("{")) {
          candidate = message;
          continue;
        }
        break;
      } catch {
        break;
      }
    }
  }
  const errorRec = payload ? asRecord(payload.error) : null;
  const innerMessage = errorRec ? asString(errorRec.message) : void 0;
  const statusFromBody = errorRec ? asString(errorRec.status) : void 0;
  const details = errorRec?.details;
  const { url, text, learnMoreUrl } = collectValidationFromDetails(details);
  let reason = errorRec ? asString(errorRec.reason) : void 0;
  let domain = errorRec ? asString(errorRec.domain) : void 0;
  if (!reason && Array.isArray(details)) {
    const first = asRecord(details[0]);
    reason = first ? asString(first.reason) : void 0;
    domain = first ? asString(first.domain) : void 0;
  }
  const parts = [];
  const head = providerName ? `${providerName} \u8FDE\u63A5\u5931\u8D25` : "\u53D1\u9001\u5931\u8D25";
  parts.push(
    `${head}${status ? ` (HTTP ${status})` : ""}${statusFromBody ? ` ${statusFromBody}` : ""}`
  );
  if (reason) {
    parts.push(`\u539F\u56E0\uFF1A${reason}`);
  }
  if (domain) {
    parts.push(`\u670D\u52A1\uFF1A${domain}`);
  }
  const humanMessage = innerMessage && innerMessage.trim() !== "Verify your account to continue." ? innerMessage : void 0;
  if (humanMessage) {
    parts.push(`\u63D0\u793A\uFF1A${humanMessage}`);
  }
  const extraLinks = [];
  if (learnMoreUrl) {
    extraLinks.push({ text: "\u4E86\u89E3\u66F4\u591A", url: learnMoreUrl });
  }
  if (url) {
    return {
      summary: parts.join("\n"),
      validationUrl: url,
      validationLinkText: text ?? "\u9A8C\u8BC1\u6211\u7684\u8D26\u53F7",
      extraLinks
    };
  }
  const MAX_FALLBACK = 500;
  const fallbackText = errorMessage.length > MAX_FALLBACK ? `${errorMessage.slice(0, MAX_FALLBACK)}\u2026` : errorMessage;
  return { summary: parts.join("\n"), extraLinks, fallbackText };
}
function buildSendErrorMessageMarkdown(parsed) {
  const lines = ["[\u53D1\u9001\u5931\u8D25]", "", parsed.summary];
  if (parsed.validationUrl) {
    lines.push(
      "",
      `\u8BF7\u70B9\u51FB\u94FE\u63A5\u5B8C\u6210\u9A8C\u8BC1\uFF1A`,
      `- [${parsed.validationLinkText ?? "\u9A8C\u8BC1\u6211\u7684\u8D26\u53F7"}](${parsed.validationUrl})`
    );
  }
  for (const link of parsed.extraLinks) {
    lines.push(`- [${link.text}](${link.url})`);
  }
  if (parsed.fallbackText && !parsed.validationUrl) {
    lines.push("", "```", parsed.fallbackText, "```");
  }
  return lines.join("\n");
}

// packages/chat/dialog/actions/handleSendMessageAction.ts
var getDialogConfig = (state, dialogKey) => {
  const resolvedDialogKey = dialogKey ?? getActiveDialogKey();
  if (!resolvedDialogKey) return null;
  const dialog = selectById(state, resolvedDialogKey);
  return dialog ?? null;
};
var ensureDialogConfig = async (dispatch, getState, dialogKey) => {
  const state = getState();
  const resolvedDialogKey = dialogKey ?? getActiveDialogKey();
  if (!resolvedDialogKey) return null;
  try {
    const existingDialog = getDialogConfig(state, resolvedDialogKey);
    if (existingDialog && Array.isArray(existingDialog.cybots) && existingDialog.cybots.length > 0) {
      return existingDialog;
    }
    const persistedDialog = await dispatch(readAndWait(resolvedDialogKey)).unwrap();
    if (persistedDialog) return persistedDialog;
    return existingDialog;
  } catch {
    return getDialogConfig(getState(), resolvedDialogKey);
  }
};
var logQuickChatPerfStage = (startedAt, stage, details = {}) => {
  if (!startedAt) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info("[QuickChatPerf]", {
    stage,
    elapsedMs: now - startedAt,
    ...typeof performance !== "undefined" ? { atMs: now } : {},
    ...details
  });
};
var resolveBrowseContextPrefix = async (message) => {
  try {
    if (typeof window === "undefined" || typeof location === "undefined") return "";
    if (typeof process !== "undefined" && process.env?.BUN_TEST) return "";
    const host = location.hostname;
    if (host !== "127.0.0.1" && host !== "localhost") return "";
    if (typeof fetch !== "function" || typeof AbortSignal?.timeout !== "function") return "";
    const response = await fetch("/api/desktop/browse-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(2e3)
    });
    if (!response.ok) return "";
    const payload = await response.json();
    if (!payload.context || !payload.context.url) return "";
    const ctx = payload.context;
    const parts = [`[\u5F53\u524D\u6D4F\u89C8\u4E0A\u4E0B\u6587]`, `URL: ${ctx.url}`, `\u6807\u9898: ${ctx.title}`];
    if (ctx.textSnippet) parts.push(`\u6458\u8981: ${ctx.textSnippet.slice(0, 2e3)}`);
    return parts.join("\n");
  } catch {
    return "";
  }
};
var finalizeQuickChatStreamStartupFailure = async (dispatch, dialogConfig, agentKey) => {
  const dialogKey = dialogConfig.dbKey;
  const dialogId = dialogConfig.id ?? (dialogKey ? extractCustomId(dialogKey) : "");
  const { key: msgKey, messageId } = createDialogMessageKeyAndId(dialogId);
  await dispatch(
    messageStreamEnd({
      finalContentBuffer: [
        {
          type: "text",
          text: "[\u9519\u8BEF: \u672A\u80FD\u542F\u52A8\u6A21\u578B\u56DE\u590D\uFF0C\u8BF7\u91CD\u8BD5\u3002]"
        }
      ],
      totalUsage: null,
      msgKey,
      agentConfig: {
        dbKey: agentKey
      },
      dialogId,
      dialogKey: dialogKey ?? "",
      messageId,
      reasoningBuffer: ""
    })
  ).unwrap?.();
};
var buildActionableErrorText = (errorMessage) => {
  return buildSendErrorMessageMarkdown(parseSendError(errorMessage));
};
var finalizeSendFailureInDialog = async (dispatch, dialogConfig, agentKey, errorMessage) => {
  const dialogKey = dialogConfig.dbKey;
  const dialogId = dialogConfig.id ?? (dialogKey ? extractCustomId(dialogKey) : "");
  const { key: msgKey, messageId } = createDialogMessageKeyAndId(dialogId);
  await dispatch(
    messageStreamEnd({
      finalContentBuffer: [
        {
          type: "text",
          text: `[\u53D1\u9001\u5931\u8D25]

${buildActionableErrorText(errorMessage)}`
        }
      ],
      totalUsage: null,
      msgKey,
      agentConfig: {
        dbKey: agentKey
      },
      dialogId,
      dialogKey: dialogKey ?? "",
      messageId,
      reasoningBuffer: ""
    })
  ).unwrap?.();
};
var handleSendMessageAction = async (args, { dispatch, getState, rejectWithValue }) => {
  let dialogConfig = null;
  let agentKeyToUse;
  try {
    logQuickChatPerfStage(args.quickChatPerfStartedAt, "handle-send-message-entered", {
      dialogKey: args.dialogKey ?? null
    });
    dialogConfig = await ensureDialogConfig(dispatch, getState, args.dialogKey);
    if (!dialogConfig) {
      throw new Error(
        "handleSendMessage: Dialog configuration is missing."
      );
    }
    logQuickChatPerfStage(args.quickChatPerfStartedAt, "handle-send-message-dialog-ready", {
      dialogKey: dialogConfig.dbKey,
      cybotCount: dialogConfig.cybots?.length ?? 0
    });
    await dispatch(
      prepareAndPersistUserMessage({
        userInput: args.userInput,
        dialogConfig
      })
    ).unwrap();
    logQuickChatPerfStage(args.quickChatPerfStartedAt, "handle-send-message-user-persisted", {
      dialogKey: dialogConfig.dbKey
    });
    const resolvedContext = resolveHandleSendMessageContext({
      dialogConfig,
      targetAgentKey: args.targetAgentKey,
      runtimeOptions: args.runtimeOptions
    });
    agentKeyToUse = resolvedContext.agentKeyToUse;
    const effectiveRuntimeOptions = resolvedContext.effectiveRuntimeOptions;
    if (!agentKeyToUse) {
      return;
    }
    const userInputText = typeof args.userInput === "string" ? args.userInput : "";
    const isDesktopContext = typeof window !== "undefined" && typeof location !== "undefined" && (location.hostname === "127.0.0.1" || location.hostname === "localhost");
    const browseContextPrefix = isDesktopContext ? await resolveBrowseContextPrefix(userInputText) : "";
    const effectiveUserInput = browseContextPrefix ? `${browseContextPrefix}

${userInputText}` : args.userInput;
    const streamResult = await dispatch(
      streamAgentChatTurn({
        agentKey: agentKeyToUse,
        userInput: effectiveUserInput,
        dialogKey: dialogConfig.dbKey,
        parentMessageId: void 0,
        runtimeOptions: effectiveRuntimeOptions,
        quickChatPerfStartedAt: args.quickChatPerfStartedAt
      })
    ).unwrap();
    if (args.quickChatPerfStartedAt && streamResult === void 0) {
      logQuickChatPerfStage(args.quickChatPerfStartedAt, "handle-send-message-stream-empty", {
        dialogKey: dialogConfig.dbKey,
        agentKey: agentKeyToUse
      });
      await finalizeQuickChatStreamStartupFailure(
        dispatch,
        dialogConfig,
        agentKeyToUse
      );
      return;
    }
    logQuickChatPerfStage(args.quickChatPerfStartedAt, "handle-send-message-stream-finished", {
      dialogKey: dialogConfig.dbKey,
      agentKey: agentKeyToUse
    });
    return;
  } catch (error) {
    console.error("handleSendMessage failed:", error);
    const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : error?.message || error?.error || String(error);
    try {
      if (dialogConfig && agentKeyToUse) {
        await finalizeSendFailureInDialog(
          dispatch,
          dialogConfig,
          agentKeyToUse,
          errorMessage
        );
        return rejectWithValue({
          __errorInDialog: true,
          message: errorMessage
        });
      }
    } catch (writeError) {
      console.error("handleSendMessage: failed to write error into dialog:", writeError);
    }
    return rejectWithValue(errorMessage);
  }
};
export {
  handleSendMessageAction
};
