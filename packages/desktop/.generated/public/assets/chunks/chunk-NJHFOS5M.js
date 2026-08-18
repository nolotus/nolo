import {
  compactWhitespace,
  extractCustomId,
  getActiveDialogKey
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import {
  __publicField
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/tools/toolApiClient.ts
var MAIN_SERVER = "https://nolo.chat";
var getIsDesktopApp = () => typeof window !== "undefined" && Boolean(window.__NOLO_DESKTOP__);
var isLocalServerUrl = (value) => {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
};
var resolveDesktopSafeServer = (value) => {
  if (!getIsDesktopApp()) return value || MAIN_SERVER;
  return isLocalServerUrl(value) ? MAIN_SERVER : value || MAIN_SERVER;
};
var selectCurrentServerFromState = (state) => resolveDesktopSafeServer(state?.settings?.currentServer);
var selectCurrentTokenFromState = (state) => typeof state?.auth?.currentToken === "string" ? state.auth.currentToken : null;
var selectCurrentDialogKeyFromState = (_state) => getActiveDialogKey();
var resolveToolBaseUrl = (currentServer) => {
  const _window = globalThis.window;
  if (!_window) return (currentServer || "").replace(/\/+$/, "");
  const fallbackLocal = _window.location.origin;
  if (!currentServer) return fallbackLocal;
  return currentServer.replace(/\/+$/, "");
};
var DESKTOP_LOCAL_TOOL_PATHS = /* @__PURE__ */ new Set([
  "/api/exec-shell",
  "/api/check-env",
  "/api/read-file",
  "/api/write-file",
  "/api/apply-edit",
  "/api/apply-line-edits",
  "/api/code-search",
  "/api/search-repo",
  "/api/desktop/files/roots",
  "/api/desktop/files/roots/request",
  "/api/desktop/files/list",
  "/api/desktop/files/read",
  "/api/desktop/files/plan",
  "/api/desktop/files/approve",
  "/api/desktop/files/execute",
  "/api/desktop/files/undo",
  "/api/desktop/files/history"
]);
var getWindowOrigin = () => {
  const _window = globalThis.window;
  const origin = _window?.location?.origin;
  return typeof origin === "string" && origin ? origin.replace(/\/+$/, "") : null;
};
var resolveToolApiBaseUrl = (currentServer, path) => {
  if (path && DESKTOP_LOCAL_TOOL_PATHS.has(path) && getIsDesktopApp()) {
    const localOrigin = getWindowOrigin();
    if (localOrigin) return localOrigin;
  }
  return resolveToolBaseUrl(currentServer);
};
var getRequestConfig = (thunkApi) => {
  const state = thunkApi.getState();
  const currentServer = selectCurrentServerFromState(state);
  const token = selectCurrentTokenFromState(state);
  if (!currentServer) throw new Error("\u65E0\u6CD5\u83B7\u53D6\u5F53\u524D\u670D\u52A1\u5668\u5730\u5740\u3002");
  return { currentServer, token };
};
var getToolBaseUrl = (thunkApi) => {
  const { currentServer } = getRequestConfig(thunkApi);
  const baseUrl = resolveToolBaseUrl(currentServer);
  if (!baseUrl) throw new Error("\u65E0\u6CD5\u83B7\u53D6\u5DE5\u5177\u670D\u52A1\u5668\u5730\u5740\u3002");
  return baseUrl;
};
var getToolRequestContext = (thunkApi) => {
  const { currentServer, token } = getRequestConfig(thunkApi);
  const baseUrl = resolveToolBaseUrl(currentServer);
  if (!baseUrl) throw new Error("\u65E0\u6CD5\u83B7\u53D6\u5DE5\u5177\u670D\u52A1\u5668\u5730\u5740\u3002");
  return {
    currentServer,
    token,
    baseUrl
  };
};
var maybeAttachDialogId = (thunkApi, body) => {
  if (!isRecord(body)) return body;
  if ("dialogId" in body) return body;
  const state = thunkApi.getState();
  const currentDialogKey = selectCurrentDialogKeyFromState(state);
  const dialogId = currentDialogKey ? extractCustomId(currentDialogKey) : null;
  if (!dialogId) return body;
  return {
    ...body,
    dialogId
  };
};
var ToolApiError = class extends Error {
  constructor(message, options) {
    super(message);
    __publicField(this, "status");
    __publicField(this, "code");
    __publicField(this, "details");
    this.name = "ToolApiError";
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
};
var buildToolRequestHeaders = (thunkApi, options = {}) => {
  const { withAuth = false, agentKey } = options;
  const { token } = getRequestConfig(thunkApi);
  const headers = { "Content-Type": "application/json" };
  if (withAuth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (agentKey && typeof agentKey === "string" && agentKey.trim()) {
    headers["X-Nolo-Agent-Key"] = agentKey.trim();
  }
  if (typeof window !== "undefined" && window.__NOLO_DESKTOP__) {
    headers["X-Nolo-Desktop-Tool"] = "1";
  }
  return headers;
};
var buildResponsePreview = (text) => compactWhitespace(text).slice(0, 240);
var looksLikeHtmlResponse = (text, contentType) => {
  if (contentType?.toLowerCase().includes("text/html")) return true;
  const trimmed = asTrimmedLowercaseString(text);
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
};
async function callToolApi(thunkApi, path, body, options = {}) {
  const { currentServer } = getRequestConfig(thunkApi);
  const baseUrl = resolveToolApiBaseUrl(currentServer, path);
  if (!baseUrl) throw new Error("\u65E0\u6CD5\u83B7\u53D6\u5DE5\u5177\u670D\u52A1\u5668\u5730\u5740\u3002");
  const url = `${baseUrl}${path}`;
  const headers = buildToolRequestHeaders(thunkApi, options);
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(maybeAttachDialogId(thunkApi, body))
  });
  const contentType = response.headers.get("content-type");
  const responseText = await response.text();
  if (!response.ok) {
    let errorMessage = `API \u8BF7\u6C42\u5931\u8D25\uFF0C\u72B6\u6001\u7801: ${response.status}`;
    let errorCode;
    let errorDetails;
    try {
      const errorData = JSON.parse(responseText);
      const err = errorData?.error;
      if (err) {
        errorMessage += `: ${err.message ?? JSON.stringify(err)}`;
        errorCode = typeof err.code === "string" ? err.code : void 0;
        errorDetails = err.details;
      }
    } catch {
      errorCode = looksLikeHtmlResponse(responseText, contentType) ? "HTML_ERROR_RESPONSE" : "NON_JSON_ERROR_RESPONSE";
      errorDetails = {
        contentType,
        responsePreview: buildResponsePreview(responseText)
      };
      if (typeof errorDetails.responsePreview === "string" && errorDetails.responsePreview) {
        errorMessage += `: ${errorDetails.responsePreview}`;
      }
    }
    throw new ToolApiError(errorMessage, {
      status: response.status,
      code: errorCode,
      details: errorDetails
    });
  }
  try {
    return JSON.parse(responseText);
  } catch {
    throw new ToolApiError("\u670D\u52A1\u7AEF\u8FD4\u56DE\u4E86\u65E0\u6CD5\u89E3\u6790\u7684\u975E JSON \u54CD\u5E94", {
      status: response.status,
      code: looksLikeHtmlResponse(responseText, contentType) ? "HTML_RESPONSE" : "INVALID_JSON_RESPONSE",
      details: {
        contentType,
        responsePreview: buildResponsePreview(responseText)
      }
    });
  }
}

export {
  resolveToolBaseUrl,
  resolveToolApiBaseUrl,
  getRequestConfig,
  getToolBaseUrl,
  getToolRequestContext,
  ToolApiError,
  buildToolRequestHeaders,
  callToolApi
};
