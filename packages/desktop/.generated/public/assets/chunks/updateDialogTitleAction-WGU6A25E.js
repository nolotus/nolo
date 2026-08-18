import {
  BUILTIN_TITLE_LLM_CONFIG,
  differenceInMinutes,
  format,
  isAssistantToolStub,
  patch,
  runLlm,
  selectAllMsgs,
  selectById,
  selectIdentityUserId,
  serializeMessageContent,
  updateContentTitle
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  normalizeSpaceId
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  compactWhitespace,
  extractCustomId
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

// packages/chat/dialog/actions/updateDialogTitlePolicy.ts
var TITLE_UPDATE_INTERVAL_MINUTES = 30;
var FORCE_UPDATE_FOR_TEST = false;
var shouldUpdateTitle = (createdAt, lastUpdatedAt, now = /* @__PURE__ */ new Date()) => {
  if (FORCE_UPDATE_FOR_TEST) return true;
  const lastUpdate = lastUpdatedAt ? new Date(lastUpdatedAt) : null;
  const creation = createdAt ? new Date(createdAt) : null;
  if (!lastUpdate || !creation || Number.isNaN(lastUpdate.getTime()) || Number.isNaN(creation.getTime())) {
    return true;
  }
  return differenceInMinutes(now, creation) <= TITLE_UPDATE_INTERVAL_MINUTES || differenceInMinutes(now, lastUpdate) >= TITLE_UPDATE_INTERVAL_MINUTES;
};

// packages/chat/dialog/dialogTitle.ts
var GENERATED_DIALOG_TITLE_MAX_CHARS = 28;
var FALLBACK_DIALOG_TITLE_MAX_CHARS = 24;
var WRAPPING_QUOTES_RE = /^[`"'“”‘’「」『』《》]+|[`"'“”‘’「」『』《》]+$/gu;
var TRAILING_TITLE_PUNCTUATION_RE = /[\s。！？!?；;，,、：:\-—–_…/\\|&]+$/u;
var HAS_CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af]/u;
var cleanTrailingPunctuation = (text) => {
  let cleaned = text.trim();
  while (TRAILING_TITLE_PUNCTUATION_RE.test(cleaned)) {
    cleaned = cleaned.replace(TRAILING_TITLE_PUNCTUATION_RE, "").trim();
  }
  return cleaned;
};
var clip = (text, maxChars) => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const isCjk = HAS_CJK_RE.test(trimmed);
  if (isCjk) {
    const chars2 = Array.from(trimmed);
    if (chars2.length <= maxChars) {
      return cleanTrailingPunctuation(trimmed);
    }
    const truncated = chars2.slice(0, Math.max(1, maxChars - 1)).join("");
    const cleaned = cleanTrailingPunctuation(truncated);
    return cleaned ? `${cleaned}\u2026` : "\u2026";
  }
  const words = trimmed.split(/\s+/);
  let isTruncated = false;
  let textToClip = trimmed;
  if (words.length > 6) {
    textToClip = words.slice(0, 6).join(" ");
    isTruncated = true;
  }
  const chars = Array.from(textToClip);
  if (chars.length > maxChars) {
    textToClip = chars.slice(0, Math.max(1, maxChars - 1)).join("");
    isTruncated = true;
  }
  if (isTruncated) {
    const cleaned = cleanTrailingPunctuation(textToClip);
    return cleaned ? `${cleaned}\u2026` : "\u2026";
  }
  return cleanTrailingPunctuation(trimmed);
};
var toSingleLine = (value) => value.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trim()).find(Boolean) ?? "";
var stripTitleFormatting = (value) => value.replace(/^(?:[-*#>]+\s*|\d+\.\s+)/, "").replace(WRAPPING_QUOTES_RE, "").replace(TRAILING_TITLE_PUNCTUATION_RE, "").trim();
var pickLeadingClause = (value) => {
  const firstLine = toSingleLine(value);
  if (!firstLine) return "";
  const separatorIndexes = [firstLine.indexOf("\uFF1A"), firstLine.indexOf(":")].filter((index) => index > 0).sort((left, right) => left - right);
  for (const index of separatorIndexes) {
    const clause = firstLine.slice(0, index).trim();
    if (clause.length >= 4) return clause;
  }
  return firstLine;
};
var normalizeDialogTitle = (rawTitle, maxChars = GENERATED_DIALOG_TITLE_MAX_CHARS) => {
  if (typeof rawTitle !== "string") return "";
  const normalized = stripTitleFormatting(
    compactWhitespace(toSingleLine(rawTitle))
  );
  if (!normalized) return "";
  return clip(normalized, maxChars);
};
var buildDialogFallbackTitleFromUserInput = (userInput, maxChars = FALLBACK_DIALOG_TITLE_MAX_CHARS) => {
  if (typeof userInput !== "string") return "";
  const candidate = pickLeadingClause(userInput);
  return normalizeDialogTitle(candidate || userInput, maxChars);
};
var buildDialogFallbackTitleFromMessages = (messages) => {
  for (const message of messages) {
    if (message?.role !== "user") continue;
    const title = buildDialogFallbackTitleFromUserInput(message?.content);
    if (title) return title;
  }
  return "";
};
var resolveDialogTitle = (generatedTitle, fallbackTitle) => normalizeDialogTitle(generatedTitle) || fallbackTitle.trim();

// packages/chat/dialog/actions/updateDialogTitleAction.ts
var MAX_MESSAGES_FOR_CONTEXT = 20;
var dedupeById = (messages) => {
  const seen = /* @__PURE__ */ new Set();
  return messages.filter((message) => {
    const id = typeof message.id === "string" ? message.id : "";
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
var getMessageContextForTitle = (state, dialogKey, selectAllMessages = selectAllMsgs) => {
  const allMsgs = selectAllMessages(state, extractCustomId(dialogKey));
  const flattened = Array.isArray(allMsgs) ? typeof allMsgs.flat === "function" ? allMsgs.flat() : allMsgs.reduce(
    (acc, cur) => acc.concat(cur),
    []
  ) : [];
  const normalized = flattened.filter((msg) => msg?.role !== "tool" && !isAssistantToolStub(msg)).map((msg) => {
    const textContent = serializeMessageContent(msg?.content, "[\u56FE\u7247]");
    if (!textContent) return null;
    return {
      ...msg,
      content: textContent
      // 之后只会用到 role + content
    };
  }).filter(Boolean);
  const earlyUserTurns = normalized.filter((msg) => msg.role === "user").slice(0, 3);
  const recentTurns = normalized.slice(-12);
  return dedupeById([...earlyUserTurns, ...recentTurns]).slice(
    0,
    MAX_MESSAGES_FOR_CONTEXT
  );
};
var shouldSkipPlatformTitleLlm = (args) => {
  const current = asTrimmedString(args.currentUserId);
  const loggedOut = !current || current === "local";
  if (!loggedOut) return false;
  const dialogUserId = asTrimmedString(args.dialogConfig?.userId);
  const agentUserId = asTrimmedString(args.agentConfig?.userId);
  const hasLocalCredentialRef = typeof args.agentConfig?.credentialRef === "string" && args.agentConfig.credentialRef.trim().length > 0;
  const dialogKey = typeof args.dialogKey === "string" ? args.dialogKey : "";
  return dialogUserId === "local" || agentUserId === "local" || hasLocalCredentialRef || dialogKey.startsWith("dialog-local-");
};
var updateDialogTitleActionWithDeps = async (args, thunkApi, deps = {}) => {
  const {
    runLlmAction = runLlm,
    patchAction = patch,
    selectDialogById = selectById,
    selectAllMessages = selectAllMsgs,
    updateSpaceContentTitle = updateContentTitle,
    selectCurrentUserId = selectIdentityUserId
  } = deps;
  const { dialogKey, agentConfig } = args;
  const { dispatch, getState } = thunkApi;
  const state = getState();
  const dialogConfig = selectDialogById(state, dialogKey);
  if (!dialogConfig || !shouldUpdateTitle(dialogConfig.createdAt, dialogConfig.updatedAt)) {
    return dialogConfig;
  }
  const messageContext = getMessageContextForTitle(state, dialogKey, selectAllMessages);
  if (messageContext.length === 0) {
    return dialogConfig;
  }
  const fallbackTitle = buildDialogFallbackTitleFromMessages(messageContext) || `Conversation on ${format(/* @__PURE__ */ new Date(), "MMM d")}`;
  let generatedTitle = "";
  const currentUserId = selectCurrentUserId(state);
  if (!shouldSkipPlatformTitleLlm({
    currentUserId,
    dialogKey,
    dialogConfig,
    agentConfig
  })) {
    const content = JSON.stringify(
      messageContext.map((msg) => ({ role: msg.role, content: msg.content }))
    );
    generatedTitle = await dispatch(
      runLlmAction({
        llmConfig: BUILTIN_TITLE_LLM_CONFIG,
        content,
        billingDialogKey: dialogKey
      })
    ).unwrap();
  }
  const title = resolveDialogTitle(generatedTitle, fallbackTitle);
  const spaceId = dialogConfig?.spaceId && normalizeSpaceId(dialogConfig.spaceId);
  if (spaceId) {
    dispatch(updateSpaceContentTitle({ spaceId, contentKey: dialogKey, title }));
  }
  return await dispatch(
    patchAction({ dbKey: dialogKey, changes: { title } })
  ).unwrap();
};
var updateDialogTitleAction = async (args, thunkApi) => updateDialogTitleActionWithDeps(args, thunkApi);
export {
  shouldSkipPlatformTitleLlm,
  updateDialogTitleAction,
  updateDialogTitleActionWithDeps
};
