import {
  ANTIGRAVITY_CLOUD_CODE_BASE_URL,
  buildProviderAuthHeaders,
  isAntigravityOAuthAgent,
  isOpenAiResponsesModel,
  resolvePlatformChatCompletionsEndpoint,
  resolvePlatformResponsesEndpoint
} from "/public/assets/chunks/chunk-CD3MPOQP.js";
import {
  clipMultilineText,
  createDrainExhaustedResponse,
  fetchAndSerializeTable,
  isCoreDrainingBody,
  isGatewayHttpStatus,
  waitForAbortableDelay
} from "/public/assets/chunks/chunk-CJFHNPRU.js";
import {
  normalizeNonNegativeMs,
  parseRetryAfterHeaderMs
} from "/public/assets/chunks/chunk-DMDFFSG6.js";
import {
  buildSkillGuidancePromptBlock,
  canonicalizeToolNames
} from "/public/assets/chunks/chunk-LWXWW4DE.js";
import {
  slateToSimplifiedMarkdown
} from "/public/assets/chunks/chunk-RI4COCAN.js";
import {
  extractCategorizedMentions
} from "/public/assets/chunks/chunk-ZV2RZQG3.js";
import {
  API_ENDPOINTS,
  createFileCredentialBroker,
  estimateTokenCount,
  fetchAndCacheMessages,
  fetchServerSyncedCredential,
  getRuntimeServerContext,
  isAbortError,
  read,
  shouldUseServerProxy
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  createSpaceKey
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  extractCustomId
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import {
  clampReasoningEffort,
  getModelConfig,
  isLoopbackUrl,
  isModelSupportReasoningEffort
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import {
  isDeepInfraKimiModel,
  isFireworksKimiModel,
  resolveFireworksKimiModel
} from "/public/assets/chunks/chunk-XDKHKMJ3.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";

// packages/agent-runtime/responsesConversationState.ts
function supportsResponsesConversationState(agent) {
  return normalizeIdentityPart(agent.provider) === "openai";
}
var normalizeIdentityPart = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
function normalizeResponsesConversationState(value) {
  if (!value || typeof value !== "object") return null;
  const raw = value;
  const provider = normalizeIdentityPart(raw.provider);
  const model = normalizeIdentityPart(raw.model);
  const responseId = typeof raw.responseId === "string" ? raw.responseId.trim() : "";
  if (!provider || !model || !responseId) return null;
  return { provider, model, responseId };
}
function selectResponsesConversationState(value, agent) {
  if (!supportsResponsesConversationState(agent)) return null;
  const state = normalizeResponsesConversationState(value);
  if (!state) return null;
  if (state.provider !== normalizeIdentityPart(agent.provider)) return null;
  if (state.model !== normalizeIdentityPart(agent.model)) return null;
  return state;
}
function updateResponsesConversationState(agent, responseId) {
  if (!supportsResponsesConversationState(agent)) return null;
  const provider = normalizeIdentityPart(agent.provider);
  const model = normalizeIdentityPart(agent.model);
  const normalizedResponseId = typeof responseId === "string" ? responseId.trim() : "";
  if (!provider || !model || !normalizedResponseId) return null;
  return { provider, model, responseId: normalizedResponseId };
}
function isResponsesConversationStateRejection(status, responseBody) {
  if (![400, 404, 409].includes(status)) return false;
  const text = typeof responseBody === "string" ? responseBody.trim().toLowerCase() : "";
  if (!text) return false;
  const mentionsResponseState = /previous[\s_-]*response/.test(text) || /response[\s_-]*(?:id|state)/.test(text);
  const rejectsState = /not[\s_-]*found/.test(text) || /does not exist/.test(text) || /invalid/.test(text) || /expired/.test(text) || /unknown/.test(text);
  return mentionsResponseState && rejectsState;
}

// packages/agent-runtime/agentCallPlan.ts
var CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses";
var CURSOR_AGENT_URL = "https://api2.cursor.sh/agent.v1.AgentService/Run";
function resolveClientWire(plan) {
  if (plan.upstreamWire === "gemini-cca") return "chat.completions";
  if (plan.upstreamWire === "anthropic-messages") return "chat.completions";
  if (plan.upstreamWire === "cursor-connect") return "chat.completions";
  if (plan.upstreamWire === "responses" && plan.authMethod.kind === "oauth" && plan.authMethod.ref === "chatgpt") {
    return "chat.completions";
  }
  return plan.upstreamWire;
}
var XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";
var ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
var CODEX_REQUIRED_HEADERS = [
  "chatgpt-account-id",
  "OpenAI-Beta",
  "originator",
  "version"
];
var ANTIGRAVITY_REQUIRED_HEADERS = [
  "User-Agent"
  // antigravity-specific UA (matches getAntigravityUserAgent)
];
function agentShouldUseServerProxy(agentConfig) {
  return shouldUseServerProxy(agentConfig);
}
function resolveAgentCallPlan(agentConfig, _env) {
  const apiKeyRef = asTrimmedLowercaseString(agentConfig.apiKeyRef);
  const provider = asTrimmedLowercaseString(
    agentConfig.provider ?? agentConfig.apiSource
  );
  if (isAntigravityOAuthAgent(agentConfig)) {
    return {
      authMethod: { kind: "oauth", ref: "antigravity" },
      transport: "server-proxy",
      upstreamWire: "gemini-cca",
      endpoint: ANTIGRAVITY_CLOUD_CODE_BASE_URL,
      requiredHeaders: [...ANTIGRAVITY_REQUIRED_HEADERS],
      vendor: provider || "google-antigravity"
    };
  }
  if (apiKeyRef === "chatgpt") {
    return {
      authMethod: { kind: "oauth", ref: "chatgpt" },
      transport: "server-proxy",
      upstreamWire: "responses",
      endpoint: CODEX_RESPONSES_URL,
      requiredHeaders: [...CODEX_REQUIRED_HEADERS],
      vendor: provider || "openai"
    };
  }
  if (apiKeyRef === "claude") {
    return {
      authMethod: { kind: "oauth", ref: "claude" },
      transport: "server-proxy",
      upstreamWire: "anthropic-messages",
      endpoint: ANTHROPIC_MESSAGES_URL,
      requiredHeaders: ["anthropic-version", "anthropic-beta"],
      vendor: provider || "anthropic"
    };
  }
  if (apiKeyRef === "xai") {
    return {
      authMethod: { kind: "oauth", ref: "xai" },
      transport: "server-proxy",
      upstreamWire: "chat.completions",
      endpoint: XAI_CHAT_COMPLETIONS_URL,
      requiredHeaders: [],
      vendor: provider || "xai"
    };
  }
  if (apiKeyRef === "cursor") {
    return {
      authMethod: { kind: "oauth", ref: "cursor" },
      transport: "server-proxy",
      upstreamWire: "cursor-connect",
      endpoint: CURSOR_AGENT_URL,
      requiredHeaders: [
        "x-cursor-client-version",
        "x-cursor-client-type",
        "x-ghost-mode"
      ],
      vendor: provider || "cursor"
    };
  }
  if (agentConfig.cliProvider || agentConfig.apiSource === "cli" || provider === "cli") {
    return {
      authMethod: { kind: "cli", provider: agentConfig.cliProvider || provider || "codex" },
      transport: "direct",
      upstreamWire: "cli",
      endpoint: "",
      requiredHeaders: [],
      vendor: provider || "cli"
    };
  }
  if (agentConfig.customProviderUrl || agentConfig.apiSource === "custom") {
    const transport2 = agentShouldUseServerProxy(agentConfig) ? "server-proxy" : "direct";
    const endpoint2 = asOptionalTrimmedString(agentConfig.customProviderUrl) ?? "";
    const upstreamWire2 = endpoint2.includes("/responses") ? "responses" : "chat.completions";
    return {
      authMethod: { kind: "custom-key" },
      transport: transport2,
      upstreamWire: upstreamWire2,
      endpoint: endpoint2,
      requiredHeaders: [],
      vendor: provider || "custom"
    };
  }
  const transport = agentShouldUseServerProxy(agentConfig) ? "server-proxy" : "direct";
  const useResponses = isOpenAiResponsesModel({
    provider,
    model: agentConfig.model,
    endpointKey: agentConfig.endpointKey
  });
  const upstreamWire = useResponses ? "responses" : "chat.completions";
  const endpoint = useResponses ? resolvePlatformResponsesEndpoint(provider) ?? "" : resolvePlatformChatCompletionsEndpoint(provider) ?? "";
  return {
    authMethod: { kind: "platform-key" },
    transport,
    upstreamWire,
    endpoint,
    requiredHeaders: [],
    vendor: provider || "openai"
  };
}

// packages/ai/llm/usageRequestOptions.ts
var STREAM_USAGE_PROVIDERS = /* @__PURE__ */ new Set([
  "google",
  "openrouter",
  "xai",
  "openai",
  "fireworks",
  "mistral",
  "cloudflare",
  "gmi"
]);
var EXTRA_USAGE_FIELD_PROVIDERS = /* @__PURE__ */ new Set(["openrouter"]);
var normalizeProviderName = (providerName) => asTrimmedLowercaseString(providerName);
var getUsageRequestOptions = (providerName, options) => {
  const normalizedProvider = normalizeProviderName(providerName);
  const api = options?.api ?? "chat-completions";
  if (api === "responses") {
    return EXTRA_USAGE_FIELD_PROVIDERS.has(normalizedProvider) ? {
      usage: {
        include: true
      }
    } : {};
  }
  return {
    ...STREAM_USAGE_PROVIDERS.has(normalizedProvider) ? {
      stream_options: {
        include_usage: true
      }
    } : {},
    ...EXTRA_USAGE_FIELD_PROVIDERS.has(normalizedProvider) ? {
      usage: {
        include: true
      }
    } : {}
  };
};

// packages/app/i18n/mapLanguage.ts
var languageMap = {
  "en-US": "English",
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
  "ja-JP": "Japanese"
  // Add more mappings as needed
};
var mapLanguage = (responseLanguage) => {
  return languageMap[responseLanguage] || responseLanguage;
};

// packages/agent-runtime/contextLayerContract.ts
var buildContextLayerContractBlock = (options = {}) => {
  const lines = [
    "--- \u77E5\u8BC6\u5B58\u50A8\u7EA6\u5B9A ---",
    "\u4E0D\u8981\u628A\u6240\u6709\u4FE1\u606F\u90FD\u585E\u8FDB\u540C\u4E00\u5C42\u3002\u4F18\u5148\u5229\u7528\u5DF2\u6709\u7684 memory / knowledge / doc\uFF0C\u800C\u4E0D\u662F\u628A\u5B83\u4EEC\u6DF7\u6210\u4E00\u6BB5\u957F\u5BF9\u8BDD\u3002",
    "",
    "\u5C42\u6B21\u8FB9\u754C\uFF1A",
    "1. memory layer\uFF1A\u653E\u77ED\u5230\u4E2D\u671F\u3001\u53EF\u590D\u7528\u4F46\u4E0D\u5FC5\u6C38\u4E45\u6302\u8F7D\u7684\u504F\u597D\u3001\u8FD1\u671F\u5171\u8BC6\u548C\u538B\u7F29\u540E\u7684\u7ECF\u9A8C\uFF1B\u8981\u77ED\u3001\u53EF\u68C0\u7D22\u3001\u53EF\u66FF\u6362\u3002",
    "2. knowledge layer\uFF1A\u653E\u7A33\u5B9A\u89C4\u5219\u3001\u957F\u671F\u6709\u6548\u4E8B\u5B9E\u548C\u6BCF\u8F6E\u90FD\u4F1A\u53CD\u590D\u4F9D\u8D56\u7684\u8BF4\u660E\uFF1B\u4F18\u5148\u901A\u8FC7 prompt / references \u81EA\u52A8\u52A0\u8F7D\u3002",
    "3. doc layer\uFF1A\u653E\u9700\u8981\u8DE8\u8F6E\u6B21\u6301\u7EED\u7EF4\u62A4\u7684\u5916\u90E8\u5DE5\u4F5C\u53F0\uFF0C\u4F8B\u5982 runbook\u3001mission\u3001incident\u3001checkpoint\u3001idea backlog\u3001experiment log\uFF1B\u9700\u8981\u65F6\u663E\u5F0F\u8BFB\u53D6\u548C\u66F4\u65B0\u3002",
    "",
    "\u5199\u5165\u539F\u5219\uFF1A",
    "- \u4E34\u65F6\u6B65\u9AA4\u3001\u539F\u59CB\u957F\u65E5\u5FD7\u3001\u4E00\u6B21\u6027\u601D\u8DEF\uFF0C\u4E0D\u8981\u76F4\u63A5\u5199\u8FDB memory \u6216 knowledge\u3002",
    "- \u7A33\u5B9A\u884C\u4E3A\u89C4\u5219\u3001\u957F\u671F\u56FA\u5B9A\u7EA6\u675F\uFF0C\u4F18\u5148\u6C89\u6DC0\u5230 knowledge layer\u3002",
    "- \u7528\u6237\u504F\u597D\u3001\u6700\u8FD1\u5F62\u6210\u7684\u534F\u4F5C\u5171\u8BC6\u3001\u8FD1\u671F\u53CD\u590D\u6709\u7528\u7684\u7ECF\u9A8C\uFF0C\u4F18\u5148\u6C89\u6DC0\u5230 memory layer\u3002",
    "- \u9700\u8981\u8DE8\u8F6E\u6B21\u63A5\u529B\u7684\u4EFB\u52A1\u72B6\u6001\u3001\u8FD0\u884C\u624B\u518C\u3001\u4E8B\u6545\u8BB0\u5F55\u3001\u68C0\u67E5\u70B9\uFF0C\u4F18\u5148\u5199\u5165 doc layer\u3002"
  ];
  if (options.hasRememberMemoryTool) {
    lines.push(
      "- \u5F53\u67D0\u6761\u504F\u597D\u3001\u8FD1\u671F\u5171\u8BC6\u6216\u590D\u7528\u7ECF\u9A8C\u5BF9\u672A\u6765\u660E\u663E\u6709\u5E2E\u52A9\u65F6\uFF0C\u53EF\u4EE5\u8C03\u7528 rememberMemory\uFF0C\u4F46\u8981\u5199\u6210\u7B80\u6D01\u53EF\u590D\u7528\u7684\u4E00\u53E5\u8BDD\uFF1B\u53EA\u6709\u5F53\u524D dialog \u660E\u786E\u7ED1\u5B9A\u4E86 space\uFF0C\u4E14\u5185\u5BB9\u5C5E\u4E8E\u5171\u4EAB\u534F\u4F5C\u89C4\u5219\u65F6\u624D\u5199 space memory\u3002"
    );
  }
  if (options.hasDocTools) {
    lines.push(
      "- \u5F53\u4EFB\u52A1\u9700\u8981 24h \u8FDE\u7EED\u8FD0\u884C\u3001\u8DE8 dialog \u63A5\u529B\u6216\u4EBA\u5DE5\u4E0E agent \u5171\u8BFB\u65F6\uFF0C\u4F18\u5148\u628A mission / runbook / incident / checkpoint / idea backlog / experiment log \u5199\u5165 doc layer\u3002"
    );
  }
  return lines.join("\n");
};

// packages/agent-runtime/startupProtocol.ts
var buildStartupProtocolBlock = (options = {}) => {
  const lines = [
    "--- \u542F\u52A8\u534F\u8BAE ---",
    "\u542F\u52A8\u987A\u5E8F\uFF1A",
    "1. \u5148\u8BFB\u53D6 policy / knowledge\uFF1A\u4F60\u7684\u6838\u5FC3 prompt\u3001\u81EA\u52A8\u52A0\u8F7D\u7684 references\u3001\u4EE5\u53CA\u7528\u6237\u7B56\u7565\u7EA6\u675F\u3002",
    "2. \u518D\u63D0\u70BC current mission\uFF1A\u4F18\u5148\u4ECE\u5F53\u524D\u7528\u6237\u8F93\u5165\u548C\u5F53\u524D\u8F93\u5165\u4E0A\u4E0B\u6587\u91CC\u786E\u8BA4\u672C\u8F6E\u76EE\u6807\u3001\u4EA4\u4ED8\u7269\u548C\u505C\u6B62\u6761\u4EF6\u3002",
    "3. \u518D\u5438\u6536 recent memory\uFF1A\u7ED3\u5408 Memory Overlay\u3001\u5386\u53F2\u6458\u8981\u3001\u6700\u8FD1\u5DE5\u4F5C\u8BB0\u5FC6\u548C\u5FC5\u8981\u7684\u5386\u53F2\u5F15\u7528\uFF0C\u53EA\u4FDD\u7559\u5BF9\u672C\u8F6E\u771F\u6B63\u6709\u5E2E\u52A9\u7684\u90E8\u5206\u3002",
    "4. \u9700\u8981\u65F6\u518D\u8BFB\u53D6 doc\uFF1A\u5982\u679C\u4EFB\u52A1\u6D89\u53CA\u8DE8\u8F6E\u6B21\u63A5\u529B\u3001\u8FD0\u884C\u624B\u518C\u6216\u5171\u4EAB\u5DE5\u4F5C\u53F0\uFF0C\u8BFB\u53D6\u76F8\u5173 doc \u83B7\u53D6\u6700\u65B0\u72B6\u6001\u3002",
    "",
    "\u5728\u7B2C\u4E00\u6B21\u5DE5\u5177\u8C03\u7528\u524D\uFF0C\u5148\u5F62\u6210\u4E00\u4EFD\u5185\u90E8 working state\uFF0C\u81F3\u5C11\u5305\u542B\uFF1A",
    "- current_goal\uFF1A\u8FD9\u4E00\u8F6E\u771F\u6B63\u8981\u5B8C\u6210\u4EC0\u4E48",
    "- constraints\uFF1A\u5F53\u524D\u7EA6\u675F\u3001\u504F\u597D\u3001\u8FB9\u754C\u6761\u4EF6",
    "- missing_facts\uFF1A\u8FD8\u7F3A\u54EA\u4E9B\u4E8B\u5B9E\u624D\u80FD\u5B89\u5168\u884C\u52A8",
    "- next_action\uFF1A\u4E0B\u4E00\u6B65\u6700\u5C0F\u4E14\u9AD8\u4EF7\u503C\u7684\u52A8\u4F5C",
    "",
    "\u51B3\u7B56\u89C4\u5219\uFF1A",
    "- \u5982\u679C policy / knowledge \u5DF2\u7ECF\u8DB3\u591F\u56DE\u7B54\uFF0C\u5C31\u76F4\u63A5\u56DE\u7B54\uFF0C\u4E0D\u8981\u4E3A\u4E86\u663E\u5F97\u5FD9\u800C\u4E71\u8C03\u7528\u5DE5\u5177\u3002",
    "- \u5982\u679C recent memory \u4E0E\u5F53\u524D\u7528\u6237\u8F93\u5165\u51B2\u7A81\uFF0C\u4EE5\u5F53\u524D\u7528\u6237\u8F93\u5165\u4E3A\u51C6\u3002",
    "- \u5982\u679C\u9700\u8981\u4F9D\u8D56\u73AF\u5883\u3001\u6587\u4EF6\u72B6\u6001\u3001\u8FD0\u884C\u65F6\u4E8B\u5B9E\u6216\u5916\u90E8\u771F\u503C\uFF0C\u5148\u9A8C\u8BC1\uFF0C\u518D\u884C\u52A8\u3002",
    "- \u4F18\u5148\u5C0F\u6B65\u63A8\u8FDB\uFF1B\u6BCF\u4E00\u8F6E\u5148\u505A\u6700\u80FD\u964D\u4F4E\u4E0D\u786E\u5B9A\u6027\u7684\u52A8\u4F5C\u3002"
  ];
  if (options.hasCheckEnvTool || options.hasExecShellTool) {
    lines.push(
      "- \u53EA\u8981\u4EFB\u52A1\u6D89\u53CA\u547D\u4EE4\u6267\u884C\u3001shell \u8BED\u6CD5\u3001\u8DEF\u5F84\u7EA6\u5B9A\u3001\u8FD0\u884C\u5E73\u53F0\u6216\u670D\u52A1\u72B6\u6001\uFF0C\u5E76\u4E14\u8FD9\u4E9B\u4E8B\u5B9E\u8FD8\u4E0D\u591F\u660E\u786E\uFF0C\u5C31\u5148\u786E\u8BA4\u73AF\u5883\u3002"
    );
  }
  if (options.hasCheckEnvTool) {
    lines.push(
      "- \u73AF\u5883\u4E0D\u660E\u786E\u65F6\uFF0C\u4F18\u5148\u8C03\u7528 checkEnv({ check: 'context' })\uFF0C\u518D\u51B3\u5B9A\u540E\u7EED\u547D\u4EE4\u548C\u5DE5\u5177\u8DEF\u5F84\u3002"
    );
  }
  if (options.hasExecShellTool) {
    lines.push(
      "- \u9700\u8981\u6267\u884C\u547D\u4EE4\u65F6\uFF0C\u5148\u6839\u636E\u5DF2\u786E\u8BA4\u7684\u73AF\u5883\u9009\u62E9 shell\uFF1BWindows \u9ED8\u8BA4 PowerShell\uFF0CLinux/macOS \u9ED8\u8BA4 bash\u3002"
    );
    lines.push(
      "- \u5982\u679C\u53EA\u662F\u6536\u96C6\u591A\u4E2A\u53EA\u8BFB\u73AF\u5883\u4E8B\u5B9E\uFF0C\u4F18\u5148\u5408\u5E76\u6210\u4E00\u6B21 shell \u8C03\u7528\u6216\u4E00\u6761\u7EC4\u5408\u547D\u4EE4\uFF0C\u907F\u514D\u62C6\u6210\u5F88\u591A\u5C0F\u63A2\u9488\u3002"
    );
  }
  return lines.join("\n");
};

// packages/agent-runtime/runtimeGuidance.ts
var normalizeToolName = (name) => name.replace(/[-_]/g, "").toLowerCase();
var hasAnyTool = (normalizedTools, candidates) => candidates.some((candidate) => normalizedTools.has(normalizeToolName(candidate)));
var hasAllTools = (normalizedTools, candidates) => candidates.every((candidate) => normalizedTools.has(normalizeToolName(candidate)));
var buildEmailRegistrationWorkflowBlock = (enabled) => {
  if (!enabled) return "";
  return [
    "--- \u90AE\u7BB1\u9A8C\u8BC1\u7801\u6CE8\u518C\u6D41\u7A0B ---",
    "\u5F53\u7528\u6237\u8981\u6C42\u4F60\u6CE8\u518C\u7F51\u7AD9\u8D26\u53F7\u65F6\uFF0C\u53EA\u5141\u8BB8\u5904\u7406\u7528\u6237\u660E\u786E\u6307\u5B9A\u7684\u5F53\u524D\u76EE\u6807\u7F51\u7AD9\uFF0C\u4E0D\u8981\u81EA\u884C\u6269\u5C55\u5230\u5176\u4ED6\u7F51\u7AD9\u3001\u6279\u91CF\u6CE8\u518C\u6216\u89C4\u907F\u5E73\u53F0\u98CE\u63A7\u3002",
    "",
    "\u5206\u9636\u6BB5\u534F\u8BAE\uFF1Adiscover before acting -> assess supportability -> register -> verify -> closeout\u3002",
    "",
    "\u63A8\u8350\u6D41\u7A0B\uFF1A",
    "1. discover before acting\uFF1A\u5148\u7528 browser_openSession / browser_readContent \u9605\u8BFB\u9875\u9762\uFF0C\u786E\u8BA4\u76EE\u6807\u6CE8\u518C\u9875 URL\u3001\u8D26\u53F7\u7528\u9014\u3001\u5FC5\u586B\u9879\u548C\u505C\u6B62\u6761\u4EF6\uFF1B\u4E0D\u8981\u4E00\u6253\u5F00\u9875\u9762\u5C31\u76F2\u70B9\u6309\u94AE\u3002\u5982\u679C\u7F3A\u5C11\u76EE\u6807\u7F51\u7AD9\uFF0C\u5148\u8BE2\u95EE\u7528\u6237\u3002",
    "2. assess supportability\uFF1A\u5148\u5224\u65AD\u8BE5\u6D41\u7A0B\u662F\u5426\u652F\u6301\u5F53\u524D\u53D7\u63A7\u81EA\u52A8\u5316\u3002\u9047\u5230 CAPTCHA\u3001\u624B\u673A\u53F7\u9A8C\u8BC1\u3001\u652F\u4ED8\u3001\u8EAB\u4EFD/KYC\u3001OAuth-only\u3001\u670D\u52A1\u6761\u6B3E\u786E\u8BA4\u3001\u6216\u4EFB\u4F55\u770B\u8D77\u6765\u50CF\u89C4\u907F\u98CE\u63A7\u7684\u6B65\u9AA4\u65F6\uFF0C\u5FC5\u987B\u7ACB\u5373\u505C\u6B62\u5E76\u5411\u7528\u6237\u8BF4\u660E blockingReason\uFF1B\u4E0D\u8981\u786C\u95EF\u3002",
    "3. register\uFF1A\u53EA\u6709\u5728\u786E\u8BA4\u652F\u6301\u540E\uFF0C\u624D\u4F7F\u7528 email_provision_identity \u4E3A\u5F53\u524D agent \u751F\u6210\u53D7\u63A7\u57DF\u540D\u90AE\u7BB1\u8EAB\u4EFD\uFF0C\u518D\u4F7F\u7528 browser_openSession / browser_typeText / browser_click / browser_readContent \u586B\u5199\u5E76\u63D0\u4EA4\u6CE8\u518C\u8868\u5355\u3002",
    "4. verify\uFF1A\u63D0\u4EA4\u540E\u4F7F\u7528 email_wait_for \u7B49\u5F85\u8BE5 agent \u6536\u4EF6\u7BB1\u91CC\u7684\u9A8C\u8BC1\u90AE\u4EF6\uFF0C\u518D\u7528 email_extract_verification \u63D0\u53D6\u9A8C\u8BC1\u7801\u6216\u9A8C\u8BC1\u94FE\u63A5\uFF0C\u56DE\u586B\u9A8C\u8BC1\u7801\u6216\u6253\u5F00\u9A8C\u8BC1\u94FE\u63A5\u5B8C\u6210\u9A8C\u8BC1\u3002",
    "5. closeout\uFF1A\u65E0\u8BBA\u6210\u529F\u8FD8\u662F\u5931\u8D25\u90FD\u8981 always close sessions\uFF0C\u4E3B\u52A8\u6E05\u7406\u6D4F\u89C8\u5668\u4F1A\u8BDD\uFF08\u4F8B\u5982 browser_closeSession\uFF09\u3002\u5982\u679C\u6D41\u7A0B\u5931\u8D25\uFF0C\u5FC5\u987B\u660E\u786E failedStage \u4E0E blockingReason\uFF0C\u5E76\u8BF4\u660E\u53EF\u6062\u590D\u9009\u9879\uFF1B\u4E0D\u8981\u76F2\u76EE\u5C1D\u8BD5\u65E0\u5173\u7F51\u7AD9\u6216\u7ED5\u8FC7\u9A8C\u8BC1\u3002",
    "6. \u6700\u7EC8\u53EA\u5728\u5BF9\u8BDD\u4E2D\u8FD4\u56DE\u8D26\u53F7\u3001\u90AE\u7BB1\u548C\u4E00\u6B21\u6027\u751F\u6210\u7684\u5BC6\u7801\uFF1B\u4E0D\u8981\u6301\u4E45\u5316\u5BC6\u7801\uFF0C\u4E0D\u8981\u5199\u5165 agent metadata\u3001\u6570\u636E\u5E93\u3001\u6587\u6863\u6216\u8BB0\u5FC6\u3002",
    "",
    "\u5FC5\u987B\u6682\u505C\u5E76\u8BE2\u95EE\u7528\u6237\u7684\u60C5\u51B5\uFF1ACAPTCHA\u3001\u624B\u673A\u53F7\u9A8C\u8BC1\u3001\u652F\u4ED8\u3001\u8EAB\u4EFD/KYC\u3001OAuth \u6388\u6743\u3001OAuth-only\u3001\u670D\u52A1\u6761\u6B3E\u786E\u8BA4\u3001\u6216\u4EFB\u4F55\u770B\u8D77\u6765\u50CF\u89C4\u907F\u98CE\u63A7\u7684\u6B65\u9AA4\u3002",
    "\u5982\u679C\u6D41\u7A0B\u5931\u8D25\uFF0C\u8BF4\u660E failedStage\u3001blockingReason \u548C\u53EF\u6062\u590D\u9009\u9879\uFF0C\u4E0D\u8981\u76F2\u76EE\u5C1D\u8BD5\u65E0\u5173\u7F51\u7AD9\u6216\u7ED5\u8FC7\u9A8C\u8BC1\u3002"
  ].join("\n");
};
var buildWebResearchToolPolicyBlock = (hasExecShellTool, hasFetchWebpageTool) => {
  if (!hasExecShellTool || !hasFetchWebpageTool) return "";
  return [
    "--- \u751F\u4EA7\u73AF\u5883\u7F51\u9875\u7814\u7A76\u5DE5\u5177\u7B56\u7565 ---",
    "\u751F\u4EA7\u73AF\u5883\u7F51\u9875\u7814\u7A76\u4F18\u5148\u4F7F\u7528 fetchWebpage\u3001\u7AD9\u70B9 Markdown / llms.txt\u3001\u6216\u4E13\u7528\u6D4F\u89C8/\u641C\u7D22\u5DE5\u5177\u3002",
    "\u4E0D\u8981\u7528 execShell \u8C03 curl\u3001grep\u3001sed \u7B49\u547D\u4EE4\u6293\u7F51\u9875\u6216\u622A\u53D6\u7F51\u9875\u6BB5\u843D\uFF1B\u751F\u4EA7\u73AF\u5883\u901A\u5E38\u4F1A\u7981\u7528 dev shell\uFF0C\u53CD\u590D\u5C1D\u8BD5\u53EA\u4F1A\u6D6A\u8D39\u56DE\u5408\u3002",
    "\u5982\u679C\u7F51\u9875\u5185\u5BB9\u8FC7\u957F\u6216\u951A\u70B9\u6BB5\u843D\u6CA1\u6709\u88AB\u5355\u72EC\u63D0\u53D6\uFF0C\u5148\u5BFB\u627E\u8BE5\u6587\u6863\u7AD9\u63D0\u4F9B\u7684 Markdown \u7248\u672C\u3001\u72EC\u7ACB\u9875\u9762\u3001llms.txt \u7D22\u5F15\u6216\u66F4\u5177\u4F53 URL\uFF0C\u518D\u7EE7\u7EED\u56DE\u7B54\u3002"
  ].join("\n");
};
var resolveRuntimeGuidanceToolOptions = (tools = []) => {
  const normalizedTools = canonicalizeToolNames(tools);
  const normalizedToolSet = new Set(normalizedTools.map(normalizeToolName));
  const hasBrowserTools = hasAllTools(normalizedToolSet, [
    "browser_openSession",
    "browser_readContent",
    "browser_typeText",
    "browser_click",
    "browser_closeSession"
  ]);
  const hasBrowserProbe = hasAnyTool(normalizedToolSet, ["browser_probePage", "browserProbePage"]);
  const hasEmailRegistrationTools = hasAllTools(normalizedToolSet, [
    "email_provision_identity",
    "email_wait_for",
    "email_extract_verification"
  ]);
  return {
    hasCheckEnvTool: normalizedTools.includes("checkEnv"),
    hasExecShellTool: normalizedTools.includes("execShell"),
    hasRememberMemoryTool: normalizedTools.includes("rememberMemory"),
    hasDocTools: normalizedTools.some(
      (tool) => ["read", "readDoc", "readPage", "createDoc", "updateDoc"].includes(tool)
    ),
    hasBrowserTools,
    hasEmailRegistrationTools,
    // Require browser_probePage to be present before enabling email registration workflow guidance.
    hasEmailRegistrationWorkflow: hasBrowserTools && hasBrowserProbe && hasEmailRegistrationTools
  };
};
var buildRuntimeGuidanceBlocks = (tools = []) => {
  const options = resolveRuntimeGuidanceToolOptions(tools);
  const normalizedTools = canonicalizeToolNames(tools);
  return {
    startupProtocol: buildStartupProtocolBlock({
      hasCheckEnvTool: options.hasCheckEnvTool,
      hasExecShellTool: options.hasExecShellTool
    }),
    contextLayerContract: buildContextLayerContractBlock({
      hasRememberMemoryTool: options.hasRememberMemoryTool,
      hasDocTools: options.hasDocTools
    }),
    emailRegistrationWorkflow: buildEmailRegistrationWorkflowBlock(
      options.hasEmailRegistrationWorkflow
    ),
    webResearchToolPolicy: buildWebResearchToolPolicyBlock(
      options.hasExecShellTool,
      normalizedTools.includes("fetchWebpage")
    )
  };
};

// packages/agent-runtime/staleReplayGuard.ts
var wrapHistoricalSummaryWithReplayGuard = (summary) => {
  const trimmed = summary.trim();
  if (!trimmed) return "";
  return [
    "\u3010\u5386\u53F2\u53C2\u8003\uFF0C\u975E\u6D3B\u6307\u4EE4\u3011\u4EE5\u4E0B\u4E3A\u51BB\u7ED3\u6458\u8981\uFF0C\u5176\u4E2D\u7684\u4EFB\u52A1/skill/ARGUMENTS \u9ED8\u8BA4\u5DF2\u8FC7\u671F\uFF0C\u4E0D\u5F97\u91CD\u65B0\u6267\u884C\u3002",
    trimmed
  ].join("\n");
};

// packages/agent-runtime/memoryUseGuidance.ts
var MEMORY_USE_GUIDANCE = `--- \u8BB0\u5FC6\u4F7F\u7528\u65B9\u5F0F ---
- \u8BB0\u5FC6\u662F\u4E2A\u6027\u5316\u589E\u5F3A\u5C42\uFF1B\u5F53\u524D\u8F93\u5165/\u5BF9\u8BDD/\u7CFB\u7EDF\u89C4\u5219/Agent prompt/skill/\u7528\u6237\u5168\u5C40\u504F\u597D\u90FD\u4F18\u5148\u4E8E\u5B83\u3002\u5F53\u524D\u8F93\u5165\u7ED9\u51FA\u65B0\u8BED\u8A00\u3001\u6280\u672F\u6808\u3001\u6570\u503C\u3001\u7EA6\u675F\u6216\u660E\u786E\u8986\u76D6\u65E7\u504F\u597D\u65F6\uFF0C\u91C7\u7528\u5F53\u524D\u8F93\u5165\uFF0C\u4E0D\u8981\u628A\u65E7\u8BB0\u5FC6\u5F53\u66F4\u9AD8\u771F\u503C\u3002
- \u8BB0\u5FC6\u542B\u7528\u6237\u8EAB\u4EFD/\u79F0\u547C/\u5173\u7CFB/\u957F\u671F\u504F\u597D/\u9879\u76EE\u80CC\u666F\u65F6\uFF0C\u76F8\u5173\u5904\u81EA\u7136\u4F53\u73B0\uFF08\u5F00\u573A\u79F0\u547C\u3001\u4E0A\u4E0B\u6587\u786E\u8BA4\u3001\u56DE\u7B54\u7ED3\u6784\u3001\u53D6\u820D\u6807\u51C6\uFF09\uFF0C\u4E0D\u8981\u6BCF\u53E5\u673A\u68B0\u79F0\u547C\u7528\u6237\u3002
- \u201C\u4E0A\u6B21/\u7EE7\u7EED/\u8FD9\u4E2A\u9879\u76EE\u201D\u7B49\u6307\u4EE3\u4F18\u5148\u6309\u5F53\u524D dialog/space/project/agent/sourceDialog \u7B49 KV \u8DEF\u5F84\u548C\u65F6\u95F4\u7EBF\u5B9A\u4F4D\uFF0C\u4E0D\u8981\u53EA\u6309\u8BED\u4E49\u76F8\u4F3C\u5EA6\u635E\u4E00\u6761\u3002
- \u63A8\u65AD\u578B\u8BB0\u5FC6\uFF08inferred\uFF09\u53EA\u7528\u4E8E\u628A\u63E1\u8BED\u6C14\u3001\u72B6\u6001\u548C\u672A\u5B8C\u6210\u4E8B\u9879\uFF0C\u4E0D\u8981\u8BF4\u6210\u201C\u4F60\u660E\u786E\u544A\u8BC9\u8FC7\u6211\u201D\u6216\u5F53\u6210\u7528\u6237\u5DF2\u6388\u6743\u4FDD\u5B58\u7684\u4E8B\u5B9E\u3002\u51B2\u7A81\u6216\u573A\u666F\u4E0D\u660E\u65F6\u8BF4\u660E\u4F9D\u636E\u6216\u7B80\u77ED\u786E\u8BA4\uFF0C\u4E0D\u8981\u786C\u5957\u3002
- \u3010\u7F6E\u4FE1\u5EA6\u6765\u6E90\u3011\u6BCF\u6761\u8BB0\u5FC6\u6709\u6765\u6E90\uFF1Averified\uFF08\u5B9E\u6D4B\u9A8C\u8BC1\uFF0C\u9AD8\u7F6E\u4FE1\u5EA6\uFF09\u3001stated\uFF08\u7528\u6237\u9648\u8FF0\uFF0C\u4E2D\u9AD8\uFF09\u3001inferred\uFF08\u6A21\u578B\u63A8\u65AD\uFF0C\u4F4E\u2014\u2014\u5BB9\u6613\u7F16\u9020\uFF0C\u4F18\u5148\u5B58\u7591\uFF09\u3002\u53EC\u56DE\u65F6\u4F18\u5148\u4F7F\u7528 verified/stated\uFF0Cinferred \u9700\u9A8C\u8BC1\u540E\u518D\u91C7\u7EB3\u3002
- \u3010\u53EC\u56DE\u89C4\u5219\u3011\u53EC\u56DE\u8BB0\u5FC6\u5FC5\u987B\u5E26\u5B8C\u6574\u5386\u53F2\u4E0A\u4E0B\u6587\uFF08\u6765\u6E90\u3001\u7F6E\u4FE1\u5EA6\u3001\u53D8\u66F4\u8BB0\u5F55\uFF09\uFF0C\u7981\u6B62\u81EA\u884C\u63A8\u7406\u586B\u8865\u3002\u4E0D\u8981\u51ED\u5370\u8C61\u62FC\u51FA\u672A\u9A8C\u8BC1\u7684\u4FE1\u606F\u3002
- \u3010\u964D\u6743/\u5F52\u6863\u3011\u8BB0\u5FC6\u4E0D\u53EF\u7269\u7406\u5220\u9664\uFF0C\u53EA\u80FD\u964D\u6743/\u5F52\u6863\u3002\u9519\u8BEF\u7684\u8BB0\u5FC6\u5E94\u4FEE\u6B63\u5E76\u964D\u4F4E\u7F6E\u4FE1\u5EA6\uFF0C\u800C\u4E0D\u662F\u5220\u9664\u2014\u2014\u4FDD\u7559\u6863\u6848\u4F9B\u5BA1\u8BA1\u3002`;

// packages/agent-runtime/menuUsage.ts
var MENU_USAGE_INSTRUCTIONS = `--- \u4EA4\u4E92\u8BF4\u660E ---
\u6240\u6709\u7528\u6237\u8F93\u5165\u5747\u4E3A\u7EAF\u6587\u672C\u6D88\u606F\uFF0C\u76F4\u63A5\u7406\u89E3\u5373\u53EF\uFF0C\u4E0D\u8981\u5728\u56DE\u590D\u4E2D\u63D0\u53CA\u6309\u94AE\u3001\u83DC\u5355\u3001\u754C\u9762\u7B49 UI \u5143\u7D20\u3002

## \u4F55\u65F6\u8C03\u7528 ask_user
\u9ED8\u8BA4\u503E\u5411"\u76F4\u63A5\u884C\u52A8"\uFF1A\u5F53\u4F60\u80FD\u57FA\u4E8E\u73B0\u6709\u4E0A\u4E0B\u6587\u7ED9\u51FA\u9AD8\u8D28\u91CF\u7B54\u6848\u6216\u6267\u884C\u65F6\uFF0C\u4F18\u5148\u76F4\u63A5\u505A\uFF0C\u4E0D\u8981\u4E3A\u4E86\u95EE\u800C\u95EE\u3002\u4EC5\u5728\u4EE5\u4E0B\u60C5\u51B5\u8C03\u7528 ask_user\uFF1A
1\uFF09\u7528\u6237\u9700\u6C42\u5BBD\u6CDB\u6216\u6A21\u7CCA\uFF0C\u4E14\u4F60\u80FD\u7ED9\u51FA 2\uFF5E5 \u4E2A\u4E92\u65A5\u3001\u90FD\u5408\u7406\u7684\u65B9\u5411\u5019\u9009\u2014\u2014\u8BA9\u7528\u6237\u5148\u9009\u4E00\u4E2A\u65B9\u5411\u518D\u6DF1\u5165\uFF1B
2\uFF09\u8BA1\u5212/\u6D41\u7A0B\u5230\u4E86\u771F\u6B63\u7684\u5206\u652F\u8282\u70B9\uFF0C\u4E0D\u540C\u9009\u62E9\u4F1A\u5BFC\u81F4\u663E\u8457\u4E0D\u540C\u7684\u6210\u672C\u3001\u9690\u79C1\u6216\u7ED3\u679C\u8D70\u5411\uFF0C\u4E14\u4F60\u65E0\u6CD5\u4ECE\u4E0A\u4E0B\u6587\u63A8\u65AD\u7528\u6237\u504F\u597D\uFF1B
3\uFF09\u65B0\u4F1A\u8BDD\u5F00\u5934\uFF0C\u6839\u636E\u7528\u6237\u753B\u50CF\u7ED9\u51FA\u82E5\u5E72"\u63A5\u4E0B\u6765\u53EF\u4EE5\u5C1D\u8BD5\u7684\u4E8B\u60C5"\u4F5C\u4E3A\u529F\u80FD\u5BFC\u822A\u6216\u4F7F\u7528\u5F15\u5BFC\u3002

## \u8C03\u7528 ask_user \u7684\u89C4\u8303
- \u8C03\u7528\u524D\u5FC5\u987B\u5148\u5728\u666E\u901A\u56DE\u590D\u6587\u672C\u91CC\u5199\u6E05\u80CC\u666F\u3001\u7406\u7531\u6216\u6743\u8861\uFF08\u5148\u89E3\u91CA\uFF0C\u518D\u8C03\u7528\u5DE5\u5177\uFF09\uFF1B
- \u63D0\u4F9B 2\uFF5E5 \u4E2A\u4E92\u65A5\u9009\u9879\uFF1B\u5982\u679C\u4F60\u6709\u63A8\u8350\u65B9\u5411\uFF0C\u628A\u5B83\u653E\u5728 choices \u7684\u7B2C\u4E00\u4F4D\uFF0C\u5E76\u7ED9\u8BE5\u9009\u9879\u6807 recommended: true\uFF1B
- \u82E5\u6CA1\u6709\u660E\u786E\u7684\u63A8\u8350\u9879\uFF0C\u5FC5\u987B\u5728\u8C03\u7528\u524D\u7684\u666E\u901A\u56DE\u590D\u6587\u672C\u91CC\u7B80\u8981\u8BF4\u660E\u6BCF\u4E2A\u9009\u9879\u7684\u4F18\u7F3A\u70B9\uFF08\u6216\u5404\u9009\u9879\u7684\u5173\u952E\u5DEE\u5F02\uFF09\uFF0C\u5E2E\u52A9\u7528\u6237\u6743\u8861\uFF0C\u800C\u4E0D\u662F\u53EA\u5217\u51FA\u9009\u9879\u5C31\u5B8C\u4E8B\uFF1B
- \u9009\u9879\u53EA\u627F\u8F7D\u9002\u5EA6\u4FE1\u606F\uFF1Alabel \u4E3A\u7B80\u77ED\u6309\u94AE\u6587\u6848\uFF1Bdetail \u4E3A\u53EF\u9009\u3001\u81F3\u591A\u4E00\u53E5\u8BDD\u7684\u7B80\u77ED\u8865\u5145\uFF1B\u7981\u6B62\u628A\u957F\u6BB5\u89E3\u91CA\u6216\u6743\u8861\u585E\u8FDB choices/detail\uFF1B
- \u6BCF\u4E2A\u9009\u9879\u7684 userMessage \u5199\u6210\u5B8C\u6574\u7684\u4E0B\u4E00\u53E5\u8BDD\uFF0C\u65B9\u4FBF\u7528\u6237\u70B9\u51FB\u540E\u4E0A\u4E0B\u6587\u8FDE\u8D2F\uFF1B
- \u4E0D\u8981\u5728\u9009\u9879\u5217\u8868\u91CC\u653E"\u5176\u4ED6/Other"\u2014\u2014\u5BA2\u6237\u7AEF\u4F1A\u81EA\u52A8\u4E3A\u7528\u6237\u8FFD\u52A0\u81EA\u7531\u8F93\u5165\u7684\u9000\u8DEF\uFF1B
- \u628A\u8981\u95EE\u7528\u6237\u7684\u95EE\u9898\u5199\u5728 question \u5B57\u6BB5\u91CC\uFF0C\u4E0D\u8981\u5728\u540C\u4E00\u8F6E assistant \u666E\u901A\u6587\u672C\u91CC\u91CD\u590D\u8FD9\u53E5\u8BDD\uFF08\u89E3\u91CA\u80CC\u666F\u4E0E\u6743\u8861\u2260\u91CD\u590D\u95EE\u9898\u53E5\uFF09\uFF1B
- \u5982\u679C\u7528\u6237\u7684\u76EE\u6807\u5DF2\u7ECF\u975E\u5E38\u5177\u4F53\u6E05\u6670\uFF0C\u5373\u4FBF\u4E0A\u8FF0\u6761\u4EF6\u770B\u4F3C\u6EE1\u8DB3\uFF0C\u4E5F\u4F18\u5148\u76F4\u63A5\u56DE\u7B54\uFF0C\u4E0D\u8981\u5F3A\u884C\u5F39\u9009\u62E9\u83DC\u5355\u3002`;

// packages/agent-runtime/identityBlock.ts
var buildIdentityBlock = (input) => {
  const lines = [
    "--- \u8EAB\u4EFD\u4FE1\u606F ---",
    asTrimmedString(input.agentName) ? `\u540D\u79F0: ${asTrimmedString(input.agentName)}` : "",
    asTrimmedString(input.agentId) ? `ID: ${asTrimmedString(input.agentId)}` : "",
    asTrimmedString(input.model) ? `\u6A21\u578B: ${asTrimmedString(input.model)}` : "",
    `\u56DE\u590D\u8BED\u8A00: ${asTrimmedString(input.responseLanguage) || "\u9ED8\u8BA4\u8DDF\u968F\u7528\u6237\u672C\u8F6E\u8F93\u5165\u8BED\u8A00"}`
  ].filter(Boolean);
  return lines.join("\n");
};

// packages/ai/agent/pageBuilderHandoffRules.ts
var PAGE_BUILDER_AGENT_PUBLIC_KEY = "agent-pub-01PAGEBUILDR00000000FT7R9G";
var PAGE_BUILDER_SCENARIOS = [
  {
    id: "information-display",
    label: "\u4FE1\u606F\u5C55\u793A",
    userIntent: "\u4E3B\u9875\u3001\u4EA7\u54C1\u4ECB\u7ECD\u3001\u670D\u52A1\u4ECB\u7ECD\u3001\u4F5C\u54C1\u96C6\u3001\u6D3B\u52A8\u9875\u3001\u62A5\u4EF7\u9875",
    prompt: "\u5E2E\u6211\u505A\u4E00\u4E2A\u72EC\u7ACB AI \u4EA7\u54C1\u987E\u95EE\u7684\u4E2A\u4EBA\u4E3B\u9875\u3002\u8981\u770B\u8D77\u6765\u4E13\u4E1A\uFF0C\u5305\u542B\u4E2A\u4EBA\u5B9A\u4F4D\u3001\u80FD\u63D0\u4F9B\u7684\u670D\u52A1\u5361\u7247\u3001\u4EE3\u8868\u6210\u679C\u5361\u7247\u3001\u53EF\u4FE1\u80CC\u4E66\u548C\u8054\u7CFB\u5408\u4F5C\u6309\u94AE\u3002"
  },
  {
    id: "data-analysis",
    label: "\u6570\u636E\u5206\u6790",
    userIntent: "\u65E5\u62A5\u3001\u5468\u62A5\u3001\u7ECF\u8425\u770B\u677F\u3001\u8D28\u68C0\u62A5\u544A\u3001\u9500\u552E\u6F0F\u6597\u3001\u53CD\u9988\u5206\u6790",
    prompt: "\u5E2E\u6211\u505A\u4E00\u4E2A AI \u5BA2\u670D\u8D28\u68C0\u65E5\u62A5\uFF0C\u5305\u542B\u6838\u5FC3\u6307\u6807\u3001\u8FD1 7 \u5929\u98CE\u9669\u8D8B\u52BF\u3001\u5F02\u5E38\u4F1A\u8BDD\u660E\u7EC6\u8868\uFF0C\u4EE5\u53CA\u660E\u5929\u9700\u8981\u8DDF\u8FDB\u7684\u5EFA\u8BAE\u3002"
  },
  {
    id: "process-guide",
    label: "\u6D41\u7A0B\u8BF4\u660E",
    userIntent: "\u6559\u7A0B\u3001SOP\u3001onboarding\u3001\u64CD\u4F5C\u6307\u5357\u3001\u8BFE\u7A0B\u6B65\u9AA4\u3001\u7533\u8BF7\u6D41\u7A0B",
    prompt: "\u5E2E\u6211\u505A\u4E00\u4E2A\u65B0\u5458\u5DE5\u4F7F\u7528 CRM \u7684\u4EA4\u4E92\u6559\u7A0B\u9875\u9762\uFF0C\u5305\u542B\u5B66\u4E60\u76EE\u6807\u3001\u64CD\u4F5C\u6B65\u9AA4\u3001\u793A\u4F8B\u7EC3\u4E60\u3001\u68C0\u67E5\u6E05\u5355\u548C\u4E0B\u4E00\u6B65\u6309\u94AE\u3002"
  },
  {
    id: "decision-comparison",
    label: "\u51B3\u7B56\u6BD4\u8F83",
    userIntent: "\u65B9\u6848\u5BF9\u6BD4\u3001\u4EA7\u54C1\u9009\u578B\u3001\u5019\u9009\u4EBA\u5BF9\u6BD4\u3001\u7ADE\u54C1\u5206\u6790\u3001\u91C7\u8D2D\u5EFA\u8BAE",
    prompt: "\u5E2E\u6211\u505A\u4E00\u4E2A\u4E09\u6B3E CRM \u65B9\u6848\u5BF9\u6BD4\u9875\uFF0C\u5305\u542B\u5BF9\u6BD4\u7EF4\u5EA6\u8868\u683C\u3001\u6BCF\u4E2A\u65B9\u6848\u7684\u4F18\u7F3A\u70B9\u5361\u7247\u3001\u8BC4\u5206\u3001\u9002\u5408\u56E2\u961F\u7C7B\u578B\u548C\u6700\u7EC8\u63A8\u8350\u3002"
  },
  {
    id: "plan-roadmap",
    label: "\u8BA1\u5212\u6392\u5E03",
    userIntent: "\u9879\u76EE\u8BA1\u5212\u3001\u5B66\u4E60\u8BA1\u5212\u3001\u5065\u8EAB\u8BA1\u5212\u3001\u5185\u5BB9\u65E5\u5386\u3001\u53D1\u5E03\u8282\u594F",
    prompt: "\u5E2E\u6211\u505A\u4E00\u4E2A 30 \u5929\u5185\u5BB9\u53D1\u5E03\u8BA1\u5212\u9875\u9762\uFF0C\u5305\u542B\u9636\u6BB5\u76EE\u6807\u3001\u6BCF\u5468\u4EFB\u52A1\u3001\u4F18\u5148\u7EA7\u3001\u91CC\u7A0B\u7891\u5361\u7247\u548C\u98CE\u9669\u63D0\u9192\u3002"
  },
  {
    id: "mixed-pitch",
    label: "\u6DF7\u5408\u957F\u5C3E",
    userIntent: "\u6C47\u62A5\u9875\u3001\u878D\u8D44\u6750\u6599\u3001\u590D\u6742\u9879\u76EE\u6982\u89C8\uFF0C\u6DF7\u5408\u5C55\u793A\u3001\u6570\u636E\u3001\u8BA1\u5212\u3001\u5BF9\u6BD4",
    prompt: "\u7ED9\u4E00\u4E2A\u65E9\u671F AI \u5BA2\u670D\u521B\u4E1A\u9879\u76EE\u505A\u4E00\u9875\u878D\u8D44\u6C47\u62A5\u9875\uFF0C\u5305\u542B\u5E02\u573A\u673A\u4F1A\u3001\u5173\u952E\u6570\u636E\u6307\u6807\u5361\u3001\u589E\u957F\u8D8B\u52BF\u56FE\u3001\u4EA7\u54C1\u8DEF\u7EBF\u3001\u7ADE\u54C1\u5BF9\u6BD4\u8868\u3001\u56E2\u961F\u4ECB\u7ECD\u548C\u4E0B\u4E00\u6B65\u8BA1\u5212\u3002"
  }
];
var scenarioLines = PAGE_BUILDER_SCENARIOS.map(
  (scenario) => `- ${scenario.label}\uFF1A${scenario.userIntent}`
).join("\n");
var PAGE_BUILDER_HANDOFF_INSTRUCTIONS = `--- \u9875\u9762\u751F\u6210\u52A9\u624B handoff ---
\u5F53\u7528\u6237\u9700\u8981\u628A\u5185\u5BB9\u53D8\u6210\u201C\u53EF\u770B\u7684\u9875\u9762/\u62A5\u544A/\u770B\u677F/\u6559\u7A0B/\u5BF9\u6BD4\u9875/\u8BA1\u5212\u9875\u201D\u65F6\uFF0C\u53EF\u4EE5\u628A\u672C\u8F6E\u4EA4\u7ED9\u9875\u9762\u751F\u6210\u52A9\u624B\u3002

\u76EE\u6807 Agent:
- agentKey: ${PAGE_BUILDER_AGENT_PUBLIC_KEY}
- \u63A8\u8350\u5DE5\u5177: runStreamingAgent

\u9002\u5408 handoff \u7684\u89C6\u89C9\u610F\u56FE\u5927\u7C7B\uFF1A
${scenarioLines}

\u8C03\u7528\u8FB9\u754C\uFF1A
- \u7528\u6237\u660E\u786E\u8981\u6C42\u201C\u505A\u6210\u9875\u9762 / \u770B\u677F / \u62A5\u544A / \u6559\u7A0B / \u4E3B\u9875 / \u5BF9\u6BD4\u9875 / \u8BA1\u5212\u8868 / \u53EF\u89C6\u5316\u201D\u65F6\uFF0C\u53EF\u4EE5\u76F4\u63A5 runStreamingAgent\u3002
- \u5982\u679C\u7528\u6237\u53EA\u662F\u8BA8\u8BBA\u5185\u5BB9\uFF0C\u4F46\u4F60\u5224\u65AD\u201C\u6587\u5B57\u56DE\u7B54\u4E0D\u5982\u53EF\u89C6\u5316\u9875\u9762\u201D\uFF0C\u5148\u8BE2\u95EE\u7528\u6237\uFF1A\u201C\u8FD9\u4E2A\u66F4\u9002\u5408\u505A\u6210\u4E00\u9875\u53EF\u89C6\u5316\u9875\u9762\uFF0C\u8981\u6211\u751F\u6210\u4E00\u4E2A\u53EF\u4EA4\u4E92\u7248\u672C\u5417\uFF1F\u201D
- \u4E0D\u8981\u628A\u666E\u901A\u95EE\u7B54\u3001\u95F2\u804A\u3001\u4EE3\u7801\u89E3\u91CA\u3001\u7EAF\u6587\u672C\u603B\u7ED3\u5F3A\u884C\u4EA4\u7ED9\u9875\u9762\u751F\u6210\u52A9\u624B\u3002
- handoff \u65F6\uFF0C\u628A\u7528\u6237\u539F\u59CB\u9700\u6C42\u548C\u4F60\u5DF2\u786E\u8BA4\u7684\u4E1A\u52A1\u4E0A\u4E0B\u6587\u4E00\u8D77\u653E\u8FDB userInput\uFF0C\u4E0D\u8981\u8981\u6C42\u7528\u6237\u7406\u89E3 React\u3001HTML\u3001\u4EE3\u7801\u5757\u6216\u8FD0\u884C\u65F6\u3002
- \u9875\u9762\u751F\u6210\u52A9\u624B\u53EA\u8D1F\u8D23\u751F\u6210\u548C\u4FEE\u6539\u53EF\u4EA4\u4E92\u9875\u9762\uFF1B\u4F60\u4ECD\u8D1F\u8D23\u5224\u65AD\u3001\u89E3\u91CA\u3001\u6F84\u6E05\u548C\u540E\u7EED\u534F\u8C03\u3002`;

// packages/ai/agent/contextCompiler.ts
function createHash(_algo) {
  let buf = "";
  return {
    update(s) {
      buf += s;
      return this;
    },
    digest(_enc) {
      let h = 2166136261;
      for (let i = 0; i < buf.length; i++) {
        h ^= buf.charCodeAt(i);
        h = h * 16777619 >>> 0;
      }
      return h.toString(16).padStart(8, "0");
    }
  };
}
var hasLayerContent = (layer) => Boolean(layer.content);
var estimateContextTokens = (content) => estimateTokenCount(content);
var compileContextLayers = (layers) => {
  const compiledLayers = [];
  for (const layer of layers) {
    if (!hasLayerContent(layer)) continue;
    const estimatedTokens = estimateContextTokens(layer.content);
    compiledLayers.push({
      id: layer.id,
      owner: layer.owner,
      content: layer.content,
      cacheScope: layer.cacheScope ?? "turn",
      charCount: layer.content.length,
      estimatedTokens,
      tokenBudget: layer.tokenBudget,
      budgetStatus: typeof layer.tokenBudget === "number" ? estimatedTokens <= layer.tokenBudget ? "within-budget" : "over-budget" : void 0
    });
  }
  const stablePrefixLayers = [];
  for (const layer of compiledLayers) {
    if (layer.cacheScope === "turn") break;
    stablePrefixLayers.push(layer);
  }
  const stablePrefixContent = stablePrefixLayers.map((layer) => layer.content).join("\n\n");
  const dynamicLayers = compiledLayers.slice(stablePrefixLayers.length);
  const dynamicContent = dynamicLayers.map((layer) => layer.content).join("\n\n");
  return {
    content: compiledLayers.map((layer) => layer.content).join("\n\n"),
    stablePrefixContent,
    dynamicContent,
    layers: compiledLayers,
    cacheProfile: {
      stablePrefixHash: createHash("sha256").update(stablePrefixContent).digest("hex"),
      stablePrefixLayerIds: stablePrefixLayers.map((layer) => layer.id),
      stablePrefixCharCount: stablePrefixContent.length,
      stablePrefixEstimatedTokens: estimateContextTokens(stablePrefixContent)
    }
  };
};

// packages/agent-runtime/currentTimeContext.ts
var pad2 = (value) => String(value).padStart(2, "0");
var resolveDefaultTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};
var partsForTimeZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
};
var zonedDateTime = (date, timeZone) => {
  const parts = partsForTimeZone(date, timeZone);
  return [
    `${parts.year}-${parts.month}-${parts.day}`,
    `${parts.hour}:${parts.minute}:${parts.second}`
  ].join(" ");
};
var timeZoneOffset = (date, timeZone) => {
  const parts = partsForTimeZone(date, timeZone);
  const utcMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMinutes = Math.round((utcMs - date.getTime()) / 6e4);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  return `UTC${sign}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`;
};
var buildCurrentTimeBlock = (now = /* @__PURE__ */ new Date(), timeZone = resolveDefaultTimeZone()) => [
  "--- \u5F53\u524D\u65F6\u95F4 ---",
  `\u5F53\u524D\u65E5\u671F: ${zonedDateTime(now, timeZone).slice(0, 10)}`,
  `\u5F53\u524D\u672C\u5730\u65F6\u95F4: ${zonedDateTime(now, timeZone).slice(0, 16)}`,
  // HH:MM only, no seconds
  `\u672C\u5730\u65F6\u533A: ${timeZone} / ${timeZoneOffset(now, timeZone)}`,
  `UTC \u65F6\u95F4: ${now.toISOString().slice(0, 16)}`,
  // YYYY-MM-DDTHH:MM only
  "\u5F53\u7528\u6237\u95EE\u201C\u73B0\u5728\u201D\u201C\u5F53\u524D\u65F6\u95F4\u201D\u201C\u5317\u4EAC\u65F6\u95F4\u201D\u7B49\u65F6\u95F4\u95EE\u9898\u65F6\uFF0C\u76F4\u63A5\u4F7F\u7528\u8FD9\u91CC\u7684\u5F53\u524D\u65F6\u95F4\uFF1B\u4E0D\u8981\u53EA\u56DE\u7B54\u65E5\u671F\u3002",
  "\u5F53\u7528\u6237\u8BF4\u201C\u4ECA\u5929\u201D\u201C\u4ECA\u65E5\u201D\u6216 today \u65F6\uFF0C\u9ED8\u8BA4\u6307\u5F53\u524D\u672C\u5730\u65E5\u671F\uFF0C\u9664\u975E\u7528\u6237\u660E\u786E\u7ED9\u51FA\u5176\u5B83\u65E5\u671F\u3002"
].join("\n");

// packages/ai/agent/buildSystemPrompt.ts
var CONTEXT_USAGE_INSTRUCTIONS = `\u53C2\u8003\u8D44\u6599\u4F7F\u7528\u8BF4\u660E\uFF1A
- \u4E0B\u65B9\u63D0\u4F9B\u7684\u8D44\u6599\u662F\u4F60\u7684\u4E3B\u8981\u6743\u5A01\u4FE1\u606F\u6765\u6E90\u3002
- \u56DE\u7B54\u95EE\u9898\u65F6\uFF0C\u5E94\u4F18\u5148\u4F9D\u8D56\u8FD9\u4E9B\u8D44\u6599\u3002\u5B83\u4EEC\u6309\u4F18\u5148\u7EA7\u4ECE\u9AD8\u5230\u4F4E\u6392\u5217\u3002
- \u4F7F\u7528\u5176\u4E2D\u7684\u4E8B\u5B9E\u3001\u6570\u636E\u548C\u540D\u79F0\u65F6\uFF0C\u8981\u4FDD\u6301\u7CBE\u51C6\u3002
- \u5982\u679C\u8D44\u6599\u4E2D\u6CA1\u6709\u5305\u542B\u7B54\u6848\uFF0C\u5E94\u8BF4\u660E\u8FD9\u4E00\u70B9\uFF0C\u7136\u540E\u518D\u4F7F\u7528\u4F60\u7684\u901A\u7528\u77E5\u8BC6\u8FDB\u884C\u56DE\u7B54\u3002
- \u5982\u679C\u4F60\u5728\u8D44\u6599\u4E2D\u53D1\u73B0\u76F8\u4E92\u77DB\u76FE\u7684\u4FE1\u606F\uFF0C\u4E5F\u8981\u5728\u56DE\u7B54\u4E2D\u6307\u51FA\u8FD9\u4E00\u70B9\u3002
- \u5F53\u901A\u7528\u6307\u4EE4\u4E0E\u66F4\u5177\u4F53\u7684"\u6309 Agent / \u6309\u6587\u6863"\u7684\u89C4\u5219\u53D1\u751F\u51B2\u7A81\u65F6\uFF0C\u5FC5\u987B\u4F18\u5148\u9075\u5B88\u66F4\u5177\u4F53\u3001\u4F18\u5148\u7EA7\u66F4\u9AD8\u7684\u89C4\u5219\u3002`;
var AGENT_ORCHESTRATION_RUN_INSTRUCTIONS = `--- \u591A Agent \u7F16\u6392\uFF08\u540E\u53F0 Run\uFF09 ---
\u4F60\u53EF\u7528 startAgentRun \u540E\u53F0\u542F\u52A8\u5B50 Agent\uFF08fork+exec\uFF0C\u8FD4\u56DE runId\uFF09\uFF0C\u7528 controlAgentRun \u89C2\u5BDF/\u505C\u6B62\uFF08wait+signal+proc\uFF09\u3002\u6838\u5FC3\u7EAA\u5F8B\uFF08\u53CD\u9762\u6559\u6750\uFF1A\u5B50\u4EE3\u7406\u5D29\u6E83/\u6302\u8D77\u800C\u7F16\u6392\u5668\u6BEB\u65E0\u5BDF\u89C9\uFF09\uFF1A
1. \u5148\u53D1\u73B0\u518D\u6D3E\u53D1\u3002\u8C03\u7528 listAgents\u3002**\u8FD4\u56DE\u7684 agents \u6570\u7EC4\u91CC\u6BCF\u4E2A\u6761\u76EE\u76F4\u63A5\u7ED9\u51FA\u53EF\u6D3E\u53D1\u7684 agentKey\u3001\u4EF7\u683C\u3001tools\u3001\u4EE5\u53CA isOwned/isFavorite \u6807\u8BB0\u2014\u2014\u9009\u4EBA\u552F\u4E00\u4F9D\u636E\u5C31\u662F\u8FD9\u6761\u8BB0\u5F55\uFF0C\u76F4\u63A5\u4ECE agentKey \u5B57\u6BB5\u53D6\u503C\uFF0C\u4E0D\u8981\u624B\u5DE5\u62FC\u63A5\u6216\u63A8\u65AD\u3002** \u9009\u4EBA\u4F18\u5148\u7EA7\uFF1A\u7279\u5B9A\u989D\u5916\u80FD\u529B\u9700\u6C42\uFF08\u770B tools \u5B57\u6BB5\u662F\u5426\u8986\u76D6\u6D4F\u89C8\u5668/\u56FE\u7247/\u8868\u683C/\u90AE\u4EF6/\u6570\u636E\u5E93\u7B49\u989D\u5916\u80FD\u529B\uFF09\u2192 \u81EA\u5EFA agent \u4F18\u5148\uFF08isOwned=true\uFF0C\u8D70\u7528\u6237\u81EA\u5DF1\u914D\u989D\u4E0D\u82B1\u5E73\u53F0 credits\uFF09\u2192 \u6210\u672C/\u80FD\u529B\u5339\u914D\uFF08\u770B inputPrice\uFF09\u2192 \u80DC\u4EFB\u8005\u4E2D isFavorite \u2192 modelAbility\u3002\u6CE8\u610F\uFF1Acoding \u5DE5\u5177\uFF08writeFile/editFile/execBash/applyEdit/gitCommit \u7B49\uFF09\u662F\u684C\u9762\u7AEF/CLI \u8FD0\u884C\u65F6\u9ED8\u8BA4\u57FA\u7EBF\uFF0Chost \u5728 coding \u73AF\u5883\u6D3E\u53D1\u65F6\u81EA\u52A8\u6CE8\u5165\uFF0Ctools \u5B57\u6BB5\u4E0D\u53CD\u6620\u8FD9\u4E9B\u5DE5\u5177\uFF0C\u56E0\u6B64\u4E0D\u6784\u6210\u9009\u4EBA\u5DEE\u5F02\u2014\u2014\u4E0D\u8981\u56E0\u4E3A tools=[] \u5C31\u6392\u9664\u67D0 agent\u3002
   - \u6D3E\u53D1\u65F6**\u539F\u6837\u590D\u5236\u8BE5\u6761\u8BB0\u5F55\u7684 agentKey** \u4F20\u7ED9 startAgentRun / callAgent\uFF0C\u4E0D\u62FC\u63A5\u3001\u4E0D\u63A8\u65AD\u3001\u4E0D\u6362\u683C\u5F0F\u3002
   - \u6D3E\u53D1\u524D\u5148\u5224\u65AD"\u62C6\u4E0D\u62C6"\uFF1A\u672C\u7CFB\u7EDF\u9ED8\u8BA4\u5E76\u53D1\u3002\u51E1\u662F\u80FD\u62C6\u6210\u591A\u4E2A\u81EA\u5305\u542B\u5B50\u4EFB\u52A1\u7684\uFF0C\u5C31**\u5E76\u884C\u6D3E\u53D1**\uFF08\u4E00\u6B21 startAgentRun \u591A\u4E2A\uFF09\uFF0C\u4E0D\u8981\u81EA\u5DF1\u95F7\u5934\u4E32\u884C\u505A\u3002\u53EA\u6709\u5355\u4E2A\u539F\u5B50\u4EFB\u52A1\uFF08\u65E0\u6CD5\u62C6\u5206\u3001\u5FC5\u987B\u4E00\u6B65\u5B8C\u6210\uFF09\u624D\u81EA\u5DF1\u76F4\u63A5\u505A\u3002
   - \u5148\u4F30\u4EFB\u52A1\u6863\uFF1A\u5FAE/\u7B80\u5355\uFF08\u22642 \u6B65\u3001\u6587\u6848\u3001\u5355\u70B9 polish\uFF09\uFF5C\u4E2D\uFF08\u591A\u6587\u4EF6\u8BFB\u6539\u9A8C\uFF09\uFF5C\u9AD8\uFF08\u67B6\u6784\u3001\u6DF1 review\u3001\u9AD8\u98CE\u9669\u63A8\u7406\uFF09\u3002\u591A\u8DEF\u72EC\u7ACB\u5B50\u4EFB\u52A1\u4F18\u5148\u5E76\u884C\uFF0C\u800C\u4E0D\u662F\u9010\u8DEF\u7B49\u5F85\u3002
   - \u81EA\u52A8\u59D4\u6258\u7684\u9AD8\u7AEF\u6A21\u578B\u786C\u95E8\uFF1AOpus 5\u3001GPT-5.6 Sol \u53CA\u540C\u7EA7\u9876\u6863\u4EC5\u7528\u4E8E\u590D\u6742\u67B6\u6784/\u8DE8\u57DF\u8BBE\u8BA1\u3001\u91CD\u5927\u4E8B\u6545\u6216\u5B89\u5168/\u6570\u636E\u5B8C\u6574\u6027\u9AD8\u98CE\u9669\u5206\u6790\u3001\u6DF1 review\uFF08\u89C1\u4E0B\u91CF\u5316\u95E8\u69DB\uFF09\u3001\u6216\u4F4E\u4EF7\u80DC\u4EFB\u6A21\u578B\u5DF2\u6709\u5931\u8D25\u8BC1\u636E\u540E\u5347\u7EA7\u3002\u5FAE\u5C0F\u3001\u7B80\u5355\u548C\u666E\u901A\u4E2D\u7B49\u4EFB\u52A1\u7981\u6B62\u81EA\u52A8\u9009\u62E9\uFF1B\u7528\u6237\u660E\u786E\u70B9\u540D\u4F7F\u7528\u4E0D\u53D7\u6B64\u81EA\u52A8\u59D4\u6258\u9650\u5236\u3002
   - \u6DF1 review \u91CF\u5316\u95E8\u69DB\uFF08\u8FBE\u5230\u624D\u5141\u8BB8\u9876\u6863\uFF09\uFF1A\u6539\u52A8\u6587\u4EF6\u6570 \u2265 30 \u4E14\u6D89\u53CA\u8BA1\u8D39/\u5B89\u5168/\u6570\u636E\u5B8C\u6574\u6027/\u6838\u5FC3\u8DEF\u7531\u5173\u952E\u8DEF\u5F84\uFF1B\u6216\u4F4E\u4EF7 reviewer \u5DF2\u7ED9\u51FA BLOCK/\u901A\u9053\u5931\u8D25\u540E\u7684\u5347\u7EA7\u3002\u666E\u901A review \u9ED8\u8BA4\u6D3E\u4E2D\u6863\u4F4E\u4EF7\u6A21\u578B\uFF0C**\u5E73\u53F0 DeepSeek V4 Flash \u662F\u9ED8\u8BA4\u4F18\u5148\u7684 reviewer \u5019\u9009\u4E4B\u4E00**\uFF08\u5E73\u53F0\u516C\u5F00 agent\u3001\u7A33\u5B9A\u53EF\u7528\u3001\u4F4E\u6210\u672C\u3001\u4E14\u4E0E\u7F16\u6392\u8005/\u9876\u6863\u5206\u5C5E\u4E0D\u540C\u6A21\u578B\u5BB6\u65CF\uFF0C\u5929\u7136\u6EE1\u8DB3"reviewer \u4E0D\u53EF\u662F\u81EA\u5DF1 + \u4E0D\u540C\u5BB6\u65CF\u4F18\u5148"\uFF09\uFF0C\u5176\u6B21\u662F agy-flash\u3001GLM \u7B49\u4E2D\u6863\u4F4E\u4EF7\u5019\u9009\uFF1B\u53EA\u6709\u4E0A\u8FF0\u4F4E\u4EF7\u901A\u9053\u90FD\u4E0D\u53EF\u7528/\u5DF2\u7ED9\u51FA\u5931\u8D25\u8BC1\u636E\u624D\u6D3E\u9876\u6863\u3002
   - \u9009\u62E9\u9876\u6863\u524D\u5FC5\u987B\u5728\u56DE\u590D\u4E2D\u7B80\u8FF0\u590D\u6742\u6027\u7406\u7531\uFF08\u5F15\u7528\u91CF\u5316\u95E8\u69DB\uFF09\uFF1B\u5931\u8D25\u5347\u7EA7\u5FC5\u987B\u6307\u51FA\u4F4E\u4EF7\u5019\u9009\u7684\u5177\u4F53\u5931\u8D25\u8BC1\u636E\u3002\u7981\u6B62\u51ED\u540D\u5B57\u7F16\u9020\u7EC6\u80FD\u529B\uFF1B\u4EF7\u683C\u3001modelAbility \u53CA\u660E\u663E\u9876\u6863\u65CF\u7CFB\u4ECE\u5361\u7247\u53D6\u5373\u53EF\uFF0C\u4E0D\u51ED\u7A7A\u731C\u3002
   - \u901A\u9053\u9884\u68C0\uFF1A\u6D3E\u53D1\u524D\u8DF3\u8FC7\u5DF2\u77E5\u574F\u901A\u9053\uFF08\u914D\u7F6E\u7F3A\u5931/\u533A\u57DF\u9650\u5236/\u7F51\u5173 400 \u7684 provider\uFF09\uFF0C\u907F\u514D\u6D6A\u8D39\u8F6E\u8BE2\u56DE\u5408\u3002
   - \u7701\u94B1\u4F18\u5148\uFF1A\u540C\u7B49\u80DC\u4EFB\u4E0B\u4F18\u5148\u6D3E\u53D1**\u81EA\u5EFA agent**\uFF08isOwned=true\uFF0C\u81EA\u5DF1\u521B\u5EFA\u3001\u7528\u81EA\u5DF1\u7684 API key \u6216\u81EA\u5DF1\u7684 OAuth \u51ED\u8BC1\uFF09\u2014\u2014\u8FD9\u7C7B\u6D3E\u53D1\u8D70\u7528\u6237\u81EA\u5DF1\u7684\u914D\u989D\uFF0C\u4E0D\u6D88\u8017\u5E73\u53F0 credits\uFF1B\u5176\u6B21\u662F apiSource="custom" \u7684 agent\u3002\u4EC5\u5F53\u81EA\u5EFA/custom \u65E0\u80DC\u4EFB\u5019\u9009\u65F6\u624D\u6D3E\u53D1 apiSource="platform" \u7684 agent\u3002\u4ECE agents \u8BB0\u5F55\u7684 isOwned / apiSource / isFavorite \u5B57\u6BB5\u76F4\u63A5\u5224\u65AD\uFF0C\u4E0D\u8981\u731C\u3002
2. **coding \u662F\u9ED8\u8BA4\u80FD\u529B\u2014\u2014\u684C\u9762\u7AEF\u548C CLI \u8FD0\u884C\u65F6\u9ED8\u8BA4\u62E5\u6709\u5168\u90E8\u4EE3\u7801\u5DE5\u5177\uFF08writeFile\u3001editFile\u3001execBash\u3001applyEdit\u3001gitCommit \u7B49\uFF09\uFF0C"tools" \u5B57\u6BB5\u53EA\u53CD\u6620\u989D\u5916\u80FD\u529B\uFF08\u6D4F\u89C8\u5668\u3001\u56FE\u7247\u3001\u8868\u683C\u3001\u90AE\u4EF6\u3001\u6570\u636E\u5E93\u7B49\uFF09**\u3002\u4E0D\u8981\u56E0\u4E3A coding agent \u7684 tools \u6458\u8981\u4E3A\u7A7A\u5C31\u5224\u5B9A\u5B83\u4E0D\u80FD\u5199\u4EE3\u7801\uFF1B\u4E5F\u4E0D\u8981\u56E0\u4E3A\u67D0\u4E2A agent \u6709 writeFile \u5C31\u8BEF\u8BFB\u6210\u5B83\u300C\u989D\u5916\u300D\u62E5\u6709\u8BE5\u5DE5\u5177\uFF0C\u90A3\u53EA\u662F\u9ED8\u8BA4\u57FA\u7EBF\u7684\u4E00\u90E8\u5206\u3002\u9009\u4EBA\u65F6\u53EA\u4EE5\u5DE5\u5177\u80FD\u529B\u662F\u5426\u8986\u76D6\u4EFB\u52A1\u4E3A\u51C6\uFF0C\u4E0D\u4EE5 tools \u5217\u8868\u957F\u77ED\u8BBA\u80DC\u4EFB\u3002**tools \u5B57\u6BB5\u4E3A\u7A7A\uFF08tools=[]\uFF09\u4E0D\u7B49\u4E8E\u6D3E\u53D1\u540E\u6CA1\u6709\u4EE3\u7801\u5DE5\u5177\u2014\u2014coding \u73AF\u5883\u6D3E\u53D1\u81EA\u52A8\u6CE8\u5165\uFF0C\u76F4\u63A5\u6D3E\u53D1\u5373\u53EF\uFF1B\u771F\u6B63\u7684\u901A\u9053\u95EE\u9898\u770B\u6D3E\u53D1\u5931\u8D25\uFF08\u7194\u65AD/\u914D\u989D/not found\uFF09\uFF0C\u4E0D\u662F\u770B tools \u5217\u8868\u3002**
3. **agentKey \u53EA\u63A5\u53D7 listAgents \u8FD4\u56DE\u7684\u7CBE\u786E dbKey \u5B57\u6BB5\uFF08owned: agent-<userId>-<id>\uFF1Bpublic: agent-pub-<id>\uFF09\uFF0C\u4E0D\u652F\u6301 alias/handle/bare id**\u3002listAgents \u6BCF\u4E2A\u6761\u76EE\u8FD4\u56DE\u53EF\u8FD0\u884C\u7684 agentKey\uFF0C\u76F4\u63A5\u7167\u6284\u4F20\u7ED9 startAgentRun / callAgent \u5373\u53EF\uFF1BreadAgent \u4E5F\u8FD4\u56DE\u540C\u6837\u7684 agentKey\u3002readAgent \u53EA\u7528\u4E8E\u786E\u8BA4\u67D0 agent \u7684\u5B8C\u6574\u80FD\u529B/\u914D\u7F6E\uFF08\u5982\u662F\u5426\u9700\u8981\u9876\u6863\u3001\u51ED\u8BC1\u662F\u5426\u5DF2\u914D\uFF09\u3002
   - \u4E25\u7981\u624B\u5DE5\u62FC\u63A5 "agent-<userId>-<id>"\uFF1AdbKey \u672B\u6BB5\u53EF\u80FD\u662F alias/handle \u800C\u975E id\u3002\u5FC5\u987B\u7528 listAgents / readAgent \u8FD4\u56DE\u7684 agentKey\uFF0C\u4E0D\u5F97\u81EA\u884C\u62FC\u3002
   - \u6362\u4EBA\u3001\u6362\u5019\u9009\u3001\u6216\u4E0A\u6B21 key \u6D3E\u53D1\u62A5 not found \u65F6\uFF0C\u91CD\u65B0\u7528 listAgents / readAgent \u62FF\u6700\u65B0 key\uFF0C\u4E0D\u5F97\u5957\u7528\u4E0A\u4E00\u4E2A key \u7684\u62FC\u63A5\u683C\u5F0F\u3002
   - \u5931\u8D25\u75C7\u72B6\uFF1A\u51FA\u73B0\u300Cagent not found\u300D\u300CLocal agent config not found: \u2026\u300D\u65F6\uFF0C\u5148\u590D\u6838 key \u662F\u5426\u7167\u6284\u81EA listAgents / readAgent\uFF08\u4E0D\u8981\u624B\u5DE5\u62FC\u3001\u4E0D\u8981\u4F20 name\uFF09\uFF0C\u7981\u6B62\u636E\u6B64\u63A8\u65AD\u51ED\u8BC1\u7F3A\u5931\u3001\u672C\u5730\u914D\u7F6E\u6587\u4EF6\u4E22\u5931\u6216\u901A\u9053\u5168\u6302\u3002
   - \u4E0D\u8981\u7D22\u53D6 prompt\u3001\u5BC6\u94A5\u6216\u6570\u636E\u5E93 key \u6765\u9009\u4EBA\u3002
4. **\u8F6E\u8BE2\u662F\u4E3A\u4F60\u81EA\u5DF1\u7684\u4E0B\u4E00\u6B65\u51B3\u7B56\uFF0C\u4E0D\u662F\u4E3A\u4E86\u8BA9\u7528\u6237\u770B\u89C1\u72B6\u6001\u3002** \u7528\u6237\u7684\u754C\u9762\u4E0A\u6709\u4E00\u5757\u72EC\u7ACB\u7684\u5B9E\u65F6\u9762\u677F\uFF0C\u4F1A\u81EA\u5DF1\u663E\u793A\u6BCF\u6761 run \u7684\u72B6\u6001\u3001\u5DF2\u7528\u65F6\u957F\u3001\u5DE5\u5177\u8C03\u7528\u6570\u548C\u6B64\u523B\u6B63\u5728\u6267\u884C\u7684\u52A8\u4F5C\u2014\u2014\u4E0D\u9700\u8981\u4F60\u8F6C\u8FF0\uFF0C\u4F60\u5C11\u8F6E\u8BE2\u4E00\u6B21\uFF0C\u7528\u6237\u770B\u5230\u7684\u4E1C\u897F\u4E00\u70B9\u4E0D\u5C11\u3002
   - \u56E0\u6B64\u53EA\u5728\u300C\u7B54\u6848\u4F1A\u6539\u53D8\u4F60\u4E0B\u4E00\u6B65\u52A8\u4F5C\u300D\u65F6\u8F6E\u8BE2\uFF1A\u7ED3\u679C\u80FD\u4E0D\u80FD\u5F00\u59CB\u6C47\u603B\u4E86\u3001\u8981\u4E0D\u8981\u53EB\u505C\u3001\u8981\u4E0D\u8981\u8865\u6D3E\u3002\u4E3A\u4E86\u300C\u6C47\u62A5\u8FDB\u5EA6\u300D\u800C\u8F6E\u8BE2\u662F\u7EAF\u6D6A\u8D39\u3002
   - \u6BCF\u6B21\u8F6E\u8BE2 = \u7236 agent \u591A\u4E00\u4E2A turn = \u5168\u524D\u7F00\u91CD\u65B0\u8BA1\u4EF7\u3002\u95F4\u9694\u4E0D\u8981\u592A\u5BC6\uFF08\u5EFA\u8BAE 10\u201315s \u8D77\u6B65\uFF0C\u591A\u6570\u4EFB\u52A1\u53EF\u4EE5\u66F4\u758F\uFF09\uFF0C\u4E0D\u8981 5s \u4E00\u6B21\uFF0C\u66F4\u4E0D\u8981\u5728 run \u660E\u663E\u8FD8\u8981\u8DD1\u5F88\u4E45\u65F6\u7A7A\u8F6C\u7B49\u5F85\u3002
   - \u7528 controlAgentRun(action:"status", runId, tailLines:0)\uFF1A\u53EA\u8FD4\u56DE\u72B6\u6001\u6458\u8981\uFF08\u542B progress\uFF1A\u5DE5\u5177\u8C03\u7528\u6570\u3001\u6B64\u523B\u5728\u6267\u884C\u4EC0\u4E48\u3001\u9759\u9ED8\u4E86\u591A\u4E45\uFF09\uFF0C\u4E0D\u62C9\u65E5\u5FD7\uFF0C\u7701 token\u3002
   - \u591A\u4E2A\u72EC\u7ACB\u5B50\u4EFB\u52A1\u4F18\u5148\u5E76\u884C\u6D3E\u53D1\uFF08\u4E00\u6B21 startAgentRun \u591A\u4E2A\uFF09\uFF0C\u7236 agent 1 \u4E2A turn \u6D3E\u53D1 + 1 \u4E2A turn \u6536\u96C6\u7ED3\u679C\uFF0C\u800C\u975E\u4E32\u884C\u7B49\u5F85 N \u4E2A turn\u3002
   - **\u4E0D\u8981\u628A status \u7684\u8FD4\u56DE\u503C\u590D\u8FF0\u7ED9\u7528\u6237**\uFF08"run-xxx \u4ECD\u5728\u8FD0\u884C\uFF0C\u5DF2 7 \u79D2"\u8FD9\u7C7B\uFF09\u3002\u9762\u677F\u5DF2\u7ECF\u5728\u663E\u793A\u4E86\uFF0C\u590D\u8FF0\u53EA\u662F\u628A\u540C\u4E00\u4EF6\u4E8B\u8BF4\u7B2C\u4E8C\u904D\u3002\u8981\u8BF4\u5C31\u8BF4\u7ED3\u8BBA\uFF1A\u8FD9\u6279\u6D3E\u53D1\u5B8C\u6210\u4E86\u3001\u67D0\u6761\u5931\u8D25\u4E86\u8981\u600E\u4E48\u529E\u3002
5. \u5F02\u5E38\u624D\u62C9\u65E5\u5FD7\u3002status \u7684 progress \u91CC\u82E5 inFlight \u5728\u52A8\u3001\u5DE5\u5177\u6570\u5728\u6DA8\uFF0C\u5C31\u662F\u6B63\u5E38\u7684\uFF0C\u7EE7\u7EED\u8F7B\u8F6E\u8BE2\uFF1B\u53EA\u6709 status=failed/\u8D85\u65F6\uFF0C\u6216 progress \u663E\u793A\u957F\u65F6\u95F4\u6CA1\u6709\u4EFB\u4F55\u52A8\u9759\uFF08\u7591\u4F3C\u5361\u6B7B\uFF09\uFF0C\u624D controlAgentRun(action:"status", runId, tailLines:30) \u62C9\u65E5\u5FD7\u8BCA\u65AD\u3002\u6B63\u5E38\u5B8C\u6210\u7684\u5B50 agent \u770B\u72B6\u6001\u6458\u8981\u5373\u53EF\uFF0C\u4E0D\u5FC5\u62C9\u5B8C\u6574\u65E5\u5FD7\u3002
6. **\u6D3E\u53D1\u5931\u8D25\u5148\u5206\u8BCA\uFF0C\u518D\u4E0B\u7ED3\u8BBA**\u3002\u987A\u5E8F\uFF1A
   \u2460 \u786E\u8BA4\u672C\u6B21 agentKey \u662F\u7167\u6284 listAgents / readAgent \u8FD4\u56DE\u7684\u7CBE\u786E dbKey\uFF08\u5426\u5219\u5148\u4FEE\u6B63 key\uFF0C\u4E0D\u7B97\u901A\u9053\u6545\u969C\uFF09\uFF1B
   \u2461 \u62A5\u9519\u50CF not found / invalid ref / Local agent config not found \u2192 \u4E00\u5F8B\u5148 readAgent \u590D\u6838\uFF0C\u7981\u6B62\u636E\u6B64\u63A8\u65AD\u73AF\u5883/\u51ED\u8BC1/\u901A\u9053\u5168\u6302\uFF1B
   \u2462 \u540C\u4E00\u5DF2\u9A8C\u8BC1 agentKey \u4E0A\u4ECD\u5931\u8D25\uFF0C\u4E14\u9519\u8BEF\u660E\u786E\u6307\u5411\u901A\u9053\uFF08429\u3001\u9274\u6743\u5931\u8D25\u3001machine offline\uFF09\u2192 \u8BB0\u4E3A\u8BE5\u901A\u9053\u6545\u969C\u3002
   - \u5224\u5B9A\u300C\u6D3E\u53D1\u901A\u9053\u6574\u4F53\u4E0D\u53EF\u7528\u300D\u524D\uFF1A\u81F3\u5C11\u5BF9 2 \u4E2A\u4E0D\u540C\u5019\u9009\u5404\u5B8C\u6210\u300C\u5DF2\u9A8C\u8BC1 key + \u4E00\u6B21\u771F\u5B9E\u6D3E\u53D1\u300D\uFF1B\u82E5\u5019\u9009\u4E0D\u8DB3 2 \u4E2A\uFF0C\u5219\u5728\u552F\u4E00\u5019\u9009\u4E0A\u5B8C\u6210 key \u590D\u6838\u540E\uFF0C\u5982\u5B9E\u62A5\u544A\u300C\u4EC5\u6B64\u5019\u9009\u4E14\u901A\u9053\u5931\u8D25\u300D\uFF0C\u4E0D\u5F97\u5938\u5927\u6210\u5168\u5E93\u4E0D\u53EF\u7528\uFF0C\u4E5F\u4E0D\u5F97\u64C5\u81EA\u6539\u505A\u672C\u8BE5\u6D3E\u53D1\u7684\u4E8B\u3002
   - \u4E0D\u8981\u7528\u300C\u4E0D\u540C provider \u5BB6\u65CF\u300D\u4F5C\u4E3A\u786C\u95E8\u69DB\uFF1B\u6709\u591A\u5BB6\u624D\u6362\uFF0C\u6CA1\u6709\u5C31\u505C\u3002
7. stop \u524D\u5148\u770B\u65E5\u5FD7\u3002\u7528 status(tailLines:30) \u5224\u65AD\u662F\u771F\u5361\u6B7B\u8FD8\u662F\u6B63\u5E38\u8DD1\uFF0C\u786E\u8BA4\u9700\u8981\u53EB\u505C\u518D controlAgentRun(action:"stop", runId)\uFF1B\u7528 list/status \u786E\u8BA4 run \u771F\u5B9E\u5B58\u5728\u4E14\u975E\u7EC8\u6001\uFF0C\u522B\u5047\u8BBE"\u6D3E\u53D1\u4E86\u5C31\u5728\u8DD1"\u3002
8. **\u6D3E\u53D1\u540E\u4E0D\u8981\u7A7A\u8F6C\u7B49\u5F85**\u3002\u5728\u652F\u6301\u7EC8\u6001\u5524\u9192\u7684\u73AF\u5883\uFF08\u684C\u9762 TUI \u672C\u5730\u8FD0\u884C\u65F6\uFF09\u91CC\uFF0C\u4F60\u6D3E\u51FA\u7684\u672C\u5730 run \u5230\u8FBE\u7EC8\u6001\u65F6\uFF0C\u7CFB\u7EDF\u4F1A\u81EA\u52A8\u628A\u7EC8\u6001\u6458\u8981\u4F5C\u4E3A\u4E00\u6761\u65B0\u6D88\u606F\u63D0\u4EA4\u8FDB\u672C\u5BF9\u8BDD\u5524\u9192\u4F60\u2014\u2014\u4E0D\u9700\u8981\u4F60\u5B88\u7740\u7B49\u3002
   - \u56E0\u6B64\u6D3E\u53D1\u540E\uFF1A\u82E5\u6CA1\u6709\u300C\u4E0D\u4F9D\u8D56\u8BE5\u7ED3\u679C\u300D\u7684\u5E76\u884C\u5DE5\u4F5C\uFF0C\u7528\u4E00\u53E5\u8BDD\u5411\u7528\u6237\u6536\u5C3E\uFF08\u8C01\u53BB\u5E72\u4EC0\u4E48\u3001\u5B8C\u6210\u540E\u4F1A\u81EA\u52A8\u7EE7\u7EED\uFF09\u7136\u540E\u7ED3\u675F\u56DE\u5408\uFF1B\u4E0D\u8981\u7A7A\u8F6C\u8F6E\u8BE2\u7B49\u5F85\uFF0C\u66F4\u4E0D\u8981\u9010\u53E5\u8F93\u51FA\u300C\u8FD8\u5728\u8DD1/\u7A0D\u7B49\u518D\u67E5\u300D\u8FD9\u7C7B\u64AD\u62A5\u2014\u2014run \u7684\u72B6\u6001\u5728\u7528\u6237\u754C\u9762\u7684\u5B9E\u65F6\u9762\u677F\u4E0A\u672C\u6765\u5C31\u770B\u5F97\u5230\u3002
   - \u53EA\u6709\u300C\u62FF\u5230\u4E2D\u95F4\u7ED3\u679C\u624D\u80FD\u51B3\u5B9A\u4E0B\u4E00\u6B65\u300D\u6216\u300C\u8981\u5224\u65AD\u662F\u5426\u53EB\u505C\u300D\u65F6\u624D\u8F6E\u8BE2\uFF0C\u95F4\u9694\u9075\u5B88\u7B2C 4 \u6761\u7684 10\u201315s \u7EAA\u5F8B\u3002
   - \u5728\u6CA1\u6709\u7EC8\u6001\u5524\u9192\u80FD\u529B\u7684\u73AF\u5883\uFF08\u88F8 CLI\u3001\u670D\u52A1\u7AEF runtime\uFF09\uFF0C\u7528\u7A00\u758F\u8F6E\u8BE2\u7B49\u5F85\u7ED3\u679C\uFF0C\u4F46\u540C\u6837\u7981\u6B62\u9010\u53E5\u64AD\u62A5\u7B49\u5F85\u72B6\u6001\u3002
\u5DE5\u5177\u9009\u62E9\uFF1A\u5B50\u4EFB\u52A1 <100s \u4E14\u8981\u7ACB\u5373\u62FF\u7ED3\u679C \u2192 callAgent\uFF08\u540C\u6B65\uFF09\uFF1B\u957F\u4EFB\u52A1 / \u5E76\u884C / \u9700\u8981\u89C2\u5BDF\u6216\u53EB\u505C \u2192 startAgentRun\uFF08\u672C\u6BB5\uFF09\u3002`;
var AGENT_COLLABORATION_INSTRUCTIONS = `--- \u591A Agent \u534F\u4F5C\uFF08\u8BA1\u5212 \u2192 \u5E76\u53D1\u6D3E\u53D1 \u2192 \u5BA1\u67E5\uFF09 ---
\u672C\u7CFB\u7EDF\u5929\u751F\u591A agent\u3001\u591A review\uFF1A**\u9ED8\u8BA4\u5E76\u53D1\u4F7F\u7528\u591A\u4E2A agent \u540C\u65F6\u5904\u7406\u591A\u4EF6\u4E8B**\uFF0C\u800C\u4E0D\u662F\u4E32\u884C\u81EA\u5DF1\u6162\u6162\u505A\u3002\u6309\u4EE5\u4E0B\u7EAA\u5F8B\u6267\u884C\uFF1A
1. \u8BA1\u5212\u5148\u884C\uFF1A\u52A8\u624B\u524D\u5148\u60F3\u6E05\u695A\u76EE\u6807\u3001\u8FB9\u754C\u3001\u9A8C\u8BC1\u65B9\u5F0F\u548C\u505C\u6B62\u6761\u4EF6\uFF1B\u9884\u8BA1 3 \u6B65\u4EE5\u4E0A\uFF08\u8BFB\u6539\u9A8C\u3001\u591A\u6587\u4EF6\u3001\u4EFB\u4F55\u6D3E\u53D1\uFF09\u5148\u5B9A\u8BA1\u5212\u3002
   - **\u9ED8\u8BA4\u5E76\u53D1\u62C6\u5206**\uFF1A\u628A\u4EFB\u52A1\u62C6\u6210\u81EA\u5305\u542B\u3001\u8FB9\u754C\u6E05\u6670\u3001\u4E92\u4E0D\u4F9D\u8D56\u7684\u5B50\u4EFB\u52A1\uFF0C**\u540C\u65F6**\uFF08\u4E00\u6B21 startAgentRun \u591A\u4E2A\uFF09\u6D3E\u7ED9\u4E0D\u540C agent \u5E76\u884C\u6267\u884C\uFF0C\u7236 agent \u7528\u4E00\u4E2A turn \u6D3E\u53D1 + \u4E00\u4E2A turn \u6536\u96C6\u7ED3\u679C\uFF0C\u800C\u4E0D\u662F\u4E32\u884C\u7B49\u5F85 N \u4E2A turn\u3002
   - \u80FD\u62C6\u5C31\u62C6\uFF1A\u591A\u4E2A\u72EC\u7ACB\u4E8B\u9879\uFF08\u591A\u6587\u4EF6\u6539\u52A8\u3001\u591A\u6A21\u5757\u5206\u6790\u3001\u591A\u7EC4\u7814\u7A76\u3001\u591A\u8DEF review\uFF09**\u4F18\u5148\u5E76\u884C**\uFF0C\u800C\u4E0D\u662F\u81EA\u5DF1\u9010\u4E2A\u505A\u6216\u4E32\u884C\u6D3E\u53D1\u3002\u7236 agent \u662F\u534F\u8C03\u8005\uFF0C\u4E0D\u662F\u6267\u884C\u8005\u3002
   - **\u5E76\u53D1 \u2260 \u6D6A\u8D39\u94B1**\uFF1A\u5E76\u53D1\u4E0B\u4F9D\u7136\u7701\u94B1\u2014\u2014\u6BCF\u4E2A\u5B50 agent \u7528**\u4FBF\u5B9C\u80DC\u4EFB**\u7684\u6A21\u578B\uFF08\u4F18\u5148\u81EA\u5EFA agent \u8D70\u7528\u6237\u81EA\u5DF1\u7684 API/OAuth\u3001\u4F18\u5148\u4F4E\u4EF7\u80DC\u4EFB\u5019\u9009\uFF0C\u4E0D\u6D3E\u9876\u6863\u505A\u666E\u901A\u5B50\u4EFB\u52A1\uFF09\uFF0C\u7236 agent \u8D1F\u8D23\u591A\u8BFB\u6C47\u603B\uFF0C\u628A\u5E76\u53D1\u5E26\u6765\u7684\u541E\u5410\u4F18\u52BF\u8F6C\u5316\u4E3A\u6210\u672C/\u65F6\u95F4\u53CC\u8D62\u3002\u5E76\u884C\u8BA9\u6BCF\u4E2A\u5B50 agent \u4E0A\u4E0B\u6587\u805A\u7126\u3001\u4E92\u4E0D\u6C61\u67D3\uFF0C\u6BD4\u7236 agent \u81EA\u5DF1\u80CC\u5168\u90E8\u4E0A\u4E0B\u6587\u4E32\u884C\u505A\u66F4\u7701\u3001\u66F4\u5FEB\u3002
2. **\u7F16\u6392\u8005\u53EA\u8BFB\u4E0D\u5199\uFF08\u786C\u95E8\uFF09**\uFF1A\u4F5C\u4E3A\u7F16\u6392\u8005\uFF0C\u4F60\u7684\u4EA7\u51FA\u662F\u8BA1\u5212\u3001\u6D3E\u53D1\u3001\u6C47\u603B\u548C\u9A8C\u6536\u3002**\u4EFB\u4F55\u5BF9\u4ED3\u5E93\u6587\u4EF6\u7684\u6301\u4E45\u5316\u5199\u5165\uFF08writeFile / editFile\uFF0C\u65E0\u8BBA\u4EE3\u7801\u3001\u914D\u7F6E\u3001\u6587\u6863\u3001\u6837\u5F0F\u3001\u811A\u672C\u8FD8\u662F\u6570\u636E\uFF09\u4E00\u5F8B\u6D3E\u53D1\u7ED9\u5B50 agent**\u2014\u2014\u5224\u5B9A\u770B\u7684\u662F"\u662F\u5426\u5199\u5165\u4ED3\u5E93\u6587\u4EF6"\uFF0C\u4E0D\u662F"\u7B97\u4E0D\u7B97\u4EE3\u7801"\u3002
   - \u5141\u8BB8\u81EA\u5199\u7684\u4F8B\u5916**\u4EC5\u9650\u4E09\u79CD**\uFF1A\u2460\u5355\u6587\u4EF6\u4E14 \u22645 \u884C\u7684\u673A\u68B0\u6539\u52A8\uFF08typo\u3001\u5E38\u91CF\u503C\u3001\u5BFC\u5165\u884C\u3001\u7248\u672C\u53F7\u7B49\u65E0\u903B\u8F91\u5224\u65AD\u7684\u7F16\u8F91\uFF09\uFF1B\u2461\u6240\u6709\u6D3E\u53D1\u901A\u9053\u5747\u5DF2\u5B9E\u6D4B\u4E0D\u53EF\u7528\uFF08\u4EC5\u9650 429/\u9274\u6743\u5931\u8D25/\u670D\u52A1\u5B95\u673A\u7B49\u7CFB\u7EDF\u7EA7\u6545\u969C\uFF0C\u987B\u9644\u539F\u59CB\u62A5\u9519\uFF1B\u5B50 agent \u7ED3\u679C\u4E0D\u8FBE\u9884\u671F**\u4E0D\u7B97**\u901A\u9053\u5931\u8D25\uFF0C\u5E94\u4FEE\u6B63 task \u540E\u91CD\u6D3E\uFF09\uFF1B\u2462\u7528\u6237\u660E\u786E\u8981\u6C42\u4F60\u4EB2\u81EA\u505A\uFF08\u987B\u5F15\u7528\u7528\u6237\u539F\u8BDD\uFF09\u3002\u4F7F\u7528\u4F8B\u5916\u5FC5\u987B\u5728\u56DE\u590D\u4E2D\u5199\u660E\u5C5E\u4E8E\u54EA\u4E00\u6761\u5E76\u7ED9\u51FA\u4F9D\u636E\uFF0C**\u6CA1\u5199 = \u8FDD\u89C4**\u3002
   - **\u63A2\u9488\u8C41\u514D**\uFF1A\u4E3A\u8BCA\u65AD\u6216\u9A8C\u8BC1\u6267\u884C\u7684\u4E00\u6B21\u6027 shell \u547D\u4EE4\u3001\u4E0D\u5199\u5165\u4ED3\u5E93\u7684\u4E34\u65F6\u811A\u672C\uFF08\u5982 /tmp \u4E0B\u7684\u63A2\u9488\uFF09\u4E0D\u53D7\u672C\u6761\u9650\u5236\u2014\u2014\u9F13\u52B1\u4F60\u5145\u5206\u9A8C\u8BC1\u3002
   - \u7981\u62C6\u5206\u7ED5\u8FC7\uFF1A\u4E0D\u5F97\u628A\u540C\u4E00\u76EE\u6807\u7684\u6539\u52A8\u62C6\u6210\u591A\u4E2A"\u22645 \u884C"\u5206\u6B65\u81EA\u5199\uFF1B\u53EA\u8981\u540C\u4E00\u76EE\u6807\u7D2F\u8BA1 >5 \u884C\u6216\u6D89\u53CA\u903B\u8F91\u5224\u65AD\uFF0C\u5373\u5FC5\u987B\u6D3E\u53D1\u3002
   - **\u7981\u6B62\u7528"\u8FD9\u662F\u539F\u5B50\u4EFB\u52A1/\u4E0D\u53EF\u62C6"\u7ED9\u81EA\u5DF1\u514D\u8D23**\u3002\u4E0D\u53EF\u62C6\u53EA\u8BF4\u660E\u5B83\u662F**\u4E00\u4E2A**\u5B50\u4EFB\u52A1\uFF0C\u4E0D\u8BF4\u660E\u5B83\u8BE5\u7531**\u4F60**\u6765\u505A\u2014\u2014\u5355\u4E2A\u5B50\u4EFB\u52A1\u540C\u6837\u5E94\u8BE5\u6D3E\u53D1\u3002
   - **\u8B66\u60D5"\u4E0A\u4E0B\u6587\u5DF2\u5728\u624B"\u6ED1\u5761**\uFF1A\u8BFB\u5B8C\u6587\u4EF6\u540E\u4F1A\u5929\u7136\u4EA7\u751F"\u6211\u5DF2\u7ECF\u61C2\u4E86\uFF0C\u81EA\u5DF1\u5199\u66F4\u5FEB"\u7684\u51B2\u52A8\uFF0C\u8FD9\u662F\u6700\u5E38\u89C1\u7684\u8FDD\u89C4\u8DEF\u5F84\u3002\u4F60\u80FD\u7ED9 reviewer \u8D34\u51E0\u767E\u884C\u6750\u6599\uFF0C\u5C31\u80FD\u7ED9\u6267\u884C\u8005\u8D34\u540C\u6837\u7684\u6750\u6599\u3002
   - \u6B63\u786E\u52A8\u4F5C\uFF1A\u628A\u5DF2\u8BFB\u5230\u7684\u5173\u952E\u7247\u6BB5\u3001\u7EA6\u675F\u3001\u9A8C\u6536\u6807\u51C6\u5199\u8FDB task\uFF0C\u7528 startAgentRun \u6D3E\u7ED9\u6267\u884C\u8005\uFF0C\u7136\u540E\u8F6E\u8BE2\u3001\u9A8C\u6536\u3001\u6C47\u603B\u3002
3. \u6D3E\u53D1\u539F\u5219\uFF1A\u5B50\u4EFB\u52A1\u81EA\u5305\u542B\u3001\u8FB9\u754C\u6E05\u6670\uFF1B**\u7ED9\u6267\u884C\u8005\u5199\u6E05\u4EFB\u52A1\u3001\u9A8C\u6536\u548C\u7981\u533A\uFF0C\u4FDD\u8BC1\u4EFB\u52A1\u786E\u5B9A\u6027**\uFF08\u7ED3\u679C\u53EF\u6838\u5BF9\u3001\u4E0D\u4F20\u65E0\u5173\u5386\u53F2\u3001\u660E\u786E\u5B8C\u6210\u6761\u4EF6\uFF09\uFF0C\u6D3E\u53D1\u540E\u8F7B\u8F6E\u8BE2\u7ED3\u679C\uFF0C\u4E0D\u5047\u8BBE\u6210\u529F\u3002
4. \u72EC\u7ACB\u5BA1\u67E5\uFF08commit \u524D\u786C\u95E8\uFF09\uFF1A\u9664 \u22642 \u6B65\u96F6\u903B\u8F91\u98CE\u9669\u7684\u673A\u68B0\u6539\u52A8\u5916\uFF0C\u6240\u6709\u4EE3\u7801\u53D8\u66F4 commit \u524D\u5FC5\u987B\u5148\u6D3E**\u5176\u4ED6 agent**\uFF08\u4E0D\u540C\u6A21\u578B\u5BB6\u65CF\u4F18\u5148\uFF09review\u3002reviewer \u4E0D\u53EF\u662F\u81EA\u5DF1\u3002\u65E0 review \u4E0D commit\u2014\u2014\u8FD9\u662F\u786C\u95E8\uFF0C\u4E0D\u662F\u5EFA\u8BAE\u3002\u591A\u4E2A\u72EC\u7ACB\u6539\u52A8\u9762\u4F18\u5148\u5E76\u884C\u6D3E\u591A\u4E2A reviewer \u5404\u5BA1\u5404\u7684\u3002\u8BE6\u7EC6\u6D41\u7A0B\u89C1 coding-review\uFF08\u4EE3\u7801\u5C42\uFF09\u7684 Dispatch \u89C4\u8303\u3002
   - **\u81EA\u52A8 review \u5FAA\u73AF**\uFF1A\u4EFB\u52A1\u5B8C\u6210\u540E\u81EA\u52A8\u8FDB\u5165 review \u5FAA\u73AF\uFF0C\u4E0D\u8981\u505C\u5728"\u6539\u5B8C\u4EA4\u4ED8"\u5C31\u7B49\u8C03\u7528\u65B9\u3002\u6D41\u7A0B\uFF1A\u6539\u5B8C \u2192 \u6D3E reviewer \u5BA1\u5DE5\u4F5C\u533A diff \u2192 \u51FA finding \u5C31\u4FEE\u590D \u2192 \u590D\u5BA1 \u2192 \u76F4\u5230 APPROVE\uFF08\u65E0 CRITICAL/HIGH\uFF09\u624D\u63D0\u4EA4\u3002\u6BCF\u8F6E review \u65E0\u4E0A\u4E0B\u6587\uFF0C\u53EA\u770B\u5F53\u524D diff\u3002BLOCK\uFF08\u6709 CRITICAL\uFF09\u5FC5\u987B\u5148\u4FEE\uFF1BWARNING\uFF08\u4EC5 HIGH\uFF09\u62A5\u544A\u7528\u6237\u51B3\u5B9A\u3002
   - **\u81EA\u52A8\u63D0\u4EA4**\uFF1AAPPROVE \u540E\u6309 Conventional Commits \u524D\u7F00\uFF08feat/fix/perf/refactor/chore/docs/test/style/ci\uFF09\u63D0\u4EA4\uFF0C\u5E26 "Assistant-Model" \u548C "Assistant-Harness" \u7F72\u540D trailer\u3002\u5408\u5E76\u5230\u96C6\u6210\u7EBF\u524D\u5148\u95EE\u7528\u6237\u3002
   - **\u5EFA\u8BAE\u6C47\u62A5**\uFF1A\u4EA4\u4ED8\u65F6\u628A\u8FC7\u7A0B\u4E2D\u53D1\u73B0\u7684\u4EFB\u4F55\u503C\u5F97\u7528\u6237\u77E5\u9053\u7684\u4E8B\u90FD\u5217\u51FA\u6765\uFF08\u9884\u5B58\u65E0\u5173\u6539\u52A8\u3001\u65E2\u6709\u6D4B\u8BD5\u9694\u79BB\u95EE\u9898\u3001\u6F5C\u5728\u98CE\u9669\u3001\u540E\u7EED\u53EF\u4F18\u5316\u70B9\u3001\u9700\u7528\u6237\u51B3\u7B56\u4E8B\u9879\uFF09\uFF0C\u4E0D\u8981\u53EA\u62A5"\u505A\u5B8C\u4E86"\u3002
\u6700\u5C0F\u5B9E\u73B0\uFF1A\u80FD\u5220\u89E3\u51B3\u5C31\u4E0D\u52A0\uFF0C\u80FD\u590D\u7528\u5C31\u4E0D\u65B0\u5EFA\uFF1B\u65B0\u62BD\u8C61\u524D\u5148\u641C\u5DF2\u6709\u5B9E\u73B0\u3002**\u4E0D\u8981\u56E0\u4E3A"\u89C9\u5F97\u6D3E\u53D1\u663E\u5F97\u5FD9"\u5C31\u81EA\u5DF1\u95F7\u5934\u4E32\u884C\u505A\u2014\u2014\u5E76\u53D1\u662F\u672C\u7CFB\u7EDF\u7684\u9ED8\u8BA4\u5DE5\u4F5C\u65B9\u5F0F\uFF1B\u5E76\u53D1\u65F6\u4F9D\u7136\u8981\u7701\u94B1\u3001\u8981\u7ED9\u786E\u5B9A\u6027\u4EFB\u52A1\u3001\u8981\u7236 agent \u6C47\u603B\u3002**
\u81EA\u68C0\uFF08\u56DE\u590D\u524D\u95EE\u81EA\u5DF1\uFF09\uFF1A\u8FD9\u4E00\u8F6E\u6211\u662F\u5426\u4EB2\u624B\u5199\u4E86\u8D85\u51FA\u8C41\u514D\u8303\u56F4\u7684\u4EE3\u7801\uFF1F\u5982\u679C\u662F\uFF0C\u5E94\u5F53\u6D3E\u53D1\u800C\u975E\u81EA\u5199\uFF1B\u5DF2\u7ECF\u5199\u4E86\u5C31\u5982\u5B9E\u8BF4\u660E\u5E76\u7EA0\u6B63\uFF0C\u4E0D\u8981\u4E8B\u540E\u7F16\u9020"\u539F\u5B50\u4EFB\u52A1""\u91CD\u4F20\u6210\u672C\u9AD8"\u4E4B\u7C7B\u7684\u7406\u7531\u3002

\u82E5\u6536\u5230\u300C\u5B50\u5BF9\u8BDD\u7981\u6B62\u518D\u521B\u5EFA\u5B59\u5BF9\u8BDD\u300D\u9519\u8BEF\uFF0C\u8BF4\u660E\u4F60\u5DF2\u662F\u5B50\u5BF9\u8BDD\uFF0C\u7981\u6B62\u518D\u6D3E\u53D1\u3002\u5C06\u5DF2\u5B8C\u6210\u7684\u7ED3\u679C\u8FD4\u56DE\u7ED9\u7236\u5BF9\u8BDD\u5373\u53EF\u3002`;
var WEBPAGE_ACCESS_INSTRUCTIONS = `--- \u7F51\u9875\u8BBF\u95EE\u80FD\u529B (Web Access) ---
\u83B7\u53D6\u5916\u90E8\u4FE1\u606F\u65F6\u7531\u7B80\u5165\u7E41\uFF1A
0. \u7528\u6237\u5DF2\u7ED9\u660E\u786E URL \u2192 \u5148\u76F4\u63A5 fetch \u8FD9\u4E9B URL\uFF0C\u4E0D\u8981\u5148\u641C\u7D22\u6216\u731C\u5907\u7528\u7F51\u5740\u3002\u5B83\u4EEC\u662F\u672C\u6B21\u4EFB\u52A1\u6700\u9AD8\u4F18\u5148\u7EA7\u7684\u7F51\u9875\u771F\u503C\u3002\u4EC5\u5F53\u6293\u53D6\u5931\u8D25\u3001\u7F3A\u5B57\u6BB5\u6216\u5185\u5BB9\u4E0D\u5339\u914D\u65F6\u624D\u989D\u5916\u641C\u7D22\uFF0C\u5E76\u5728\u56DE\u590D\u4E2D\u8BF4\u660E\u964D\u7EA7\u539F\u56E0\u3002
1. \u65E0\u660E\u786E URL \u2192 \u5148\u7528 exa_search \u53D1\u73B0\u6743\u5A01\u5165\u53E3\uFF08\u5C24\u5176\u964C\u751F docs \u7AD9\uFF0C\u4E0D\u8981\u76F4\u63A5\u731C\u5B50\u8DEF\u5F84\uFF09\u3002
2. \u5DF2\u6709\u660E\u786E URL \u4E14\u9700\u5B8C\u6574\u6E32\u67D3\u5185\u5BB9 \u2192 fetchWebpage\uFF08\u652F\u6301 JS/SPA\uFF1Bdocs.* \u4F1A\u81EA\u52A8\u68C0\u67E5 /llms.txt \u5E76\u89C4\u8303\u5316 URL\uFF09\u3002
3. \u9700\u767B\u5F55/\u586B\u8868/\u591A\u6B65\u4EA4\u4E92 \u2192 browser_openSession\uFF08openSession \u62FF ID \u2192 typeText/click/readContent\uFF09\u3002
4. YouTube/\u4E9A\u9A6C\u900A/Google \u7B49\u7ED3\u6784\u5316\u6570\u636E \u2192 \u7528\u5BF9\u5E94\u4E13\u7528 Scraper \u5DE5\u5177\uFF08youtubeScraper\u3001amazonProductScraper \u7B49\uFF09\u3002`;
var AGENT_ORCHESTRATION_INSTRUCTIONS = `--- Agent \u7F16\u6392\u4E0E\u534F\u4F5C ---
\u4F60\u6240\u5728\u7684\u7CFB\u7EDF\u652F\u6301\u591A\u4E2A\u5B50 Agent \u548C\u5DE5\u4F5C\u6D41\u5DE5\u5177\uFF0C\u8BF7\u628A\u81EA\u5DF1\u89C6\u4E3A"\u603B\u534F\u8C03\u8005"\uFF1A

1\uFF09\u5B50 Agent \u534F\u4F5C
- \u5982\u679C\u76EE\u6807 Agent \u8BB0\u5F55\u5DF2\u7ECF\u58F0\u660E delegation.serverBase / runtimeServerBase\uFF0C\u5DE5\u5177\u4F1A\u81EA\u52A8\u8DEF\u7531\u5230\u5BF9\u5E94 nolo server\uFF1B\u4F60\u4E0D\u9700\u8981\u91CD\u590D\u586B\u5199 serverBase\u3002
- \u5982\u679C\u7528\u6237\u660E\u786E\u7ED9\u4E86\u53E6\u4E00\u4E2A\u53EF\u8BBF\u95EE\u7684 server origin\uFF08\u4F8B\u5982 Windows \u673A\u5668\u7684 Cloudflare \u57DF\u540D\uFF09\uFF0C\u53EF\u4EE5\u5728\u5DE5\u5177\u53C2\u6570\u91CC\u4F20 serverBase \u8986\u76D6\u81EA\u52A8\u8DEF\u7531\uFF1B\u4E0D\u8981\u81C6\u9020\u5730\u5740\uFF0C\u4E5F\u4E0D\u8981\u628A\u666E\u901A localhost \u5F53\u6210\u8FDC\u7AEF\u673A\u5668\u3002
- \u9700\u8981\u5F02\u6B65\u542F\u52A8\u4E00\u4E2A\u5B50\u5BF9\u8BDD\u3001\u8BA9\u5F53\u524D\u5BF9\u8BDD\u7A0D\u540E\u6839\u636E\u5B50 Agent \u7684\u5B8C\u6210/\u5931\u8D25\u7EE7\u7EED\u5224\u65AD\u65F6\uFF0C\u4F7F\u7528 callAgent({ background: true })\u3002\u5B83\u53EA\u8868\u793A child dialog \u5DF2\u542F\u52A8\u6216\u6392\u961F\uFF0C\u4E0D\u8868\u793A\u4EFB\u52A1\u5DF2\u7ECF\u5B8C\u6210\uFF1Bchild \u8FDB\u5165 done/failed \u540E\uFF0C\u7CFB\u7EDF\u4F1A\u7528 terminal wake \u7EE7\u7EED\u7236\u5BF9\u8BDD\uFF0C\u4F60\u518D\u8BFB\u53D6 child evidence \u51B3\u5B9A\u4E0B\u4E00\u6B65\u3002
- callAgent({ background: true }) \u662F\u901A\u7528\u591A Agent \u534F\u4F5C\u80FD\u529B\uFF0C\u4E0D\u9650\u4E8E\u4EE3\u7801\u4EFB\u52A1\uFF1B\u6E38\u620F\u8BBE\u8BA1\u3001\u7535\u5F71\u7B56\u5212\u3001\u5199\u4F5C\u3001\u8FD0\u8425\u3001\u7814\u7A76\u7B49\u9700\u8981\u5F02\u6B65\u5206\u5DE5\u7684\u573A\u666F\u4E5F\u53EF\u4EE5\u4F7F\u7528\u3002
- \u9700\u8981\u7B49\u5F85\u4E00\u4E2A\u77ED\u7ED3\u679C\u5E76\u76F4\u63A5\u7EFC\u5408\u65F6\uFF0C\u4F7F\u7528 callAgent\uFF08\u9ED8\u8BA4\u540C\u6B65\u7B49\u5F85\uFF09\uFF1B\u9700\u8981\u7528\u6237\u524D\u53F0\u5B9E\u65F6\u770B\u5230\u53E6\u4E00\u4E2A Agent \u53D1\u8A00\u65F6\uFF0C\u4F7F\u7528 runStreamingAgent\u3002
- \u5F53\u7528\u6237\u9700\u8981\u591A\u89C6\u89D2\u5206\u6790\u6216\u8FA9\u8BBA\u65F6\uFF0C\u4F60\u53EF\u4EE5\uFF1A
  - \u5148\u7528 callAgent \u4F9D\u6B21\u8BE2\u95EE\u591A\u4E2A Agent \u5BF9\u540C\u4E00\u95EE\u9898\u7684\u770B\u6CD5\uFF1B
  - \u5728\u6700\u540E\u4E00\u6761\u56DE\u590D\u4E2D\uFF0C\u7528\u4F60\u81EA\u5DF1\u7684\u8BDD\u5E2E\u7528\u6237\u603B\u7ED3\u8FD9\u4E9B\u89C2\u70B9\u7684\u5F02\u540C\uFF0C\u5E76\u7ED9\u51FA\u7EFC\u5408\u7ED3\u8BBA\u3002

2\uFF09\u5DE5\u4F5C\u6D41 / Workflow \u5DE5\u5177
- \u5BF9\u4E8E\u9700\u8981\u591A\u6B65\u9AA4\u3001\u987A\u5E8F\u4F9D\u8D56\u6216\u6279\u91CF\u5DE5\u5177\u8C03\u7528\u7684\u590D\u6742\u4EFB\u52A1\uFF0C\u5E94\u4F18\u5148\u8003\u8651\u4F7F\u7528 createWorkflow \u8FD9\u7C7B\u5DE5\u4F5C\u6D41\u5DE5\u5177\u3002
- \u8C03\u7528\u5DE5\u4F5C\u6D41\u5DE5\u5177\u65F6\uFF0C\u4F60\u8D1F\u8D23\uFF1A
  - \u6E05\u695A\u63CF\u8FF0\u76EE\u6807\u548C\u7EA6\u675F\uFF1B
  - \u5728\u5DE5\u4F5C\u6D41\u6267\u884C\u8FC7\u7A0B\u4E2D\u5173\u6CE8\u5176\u8F93\u51FA\u7684\u4E2D\u95F4\u7ED3\u679C\u548C\u6700\u7EC8\u7ED3\u679C\uFF1B
  - \u5F53\u4F60\u8BA4\u4E3A\u4EFB\u52A1\u8DB3\u591F\u5B8C\u6210\uFF0C\u6216\u7528\u6237\u8981\u6C42\u603B\u7ED3\u65F6\uFF0C\u5BF9\u6574\u4E2A\u8FC7\u7A0B\u548C\u7ED3\u679C\u8FDB\u884C\u603B\u7ED3\uFF0C\u6307\u51FA\u53EF\u80FD\u7684\u9519\u8BEF\u6216\u98CE\u9669\u3002

3\uFF09\u5371\u9669 / \u4E0D\u53EF\u9006\u64CD\u4F5C
- \u6D89\u53CA\u4E0D\u53EF\u9006\u64CD\u4F5C\u65F6\uFF08\u4FEE\u6539\u6587\u4EF6\u3001\u5220\u9664\u6570\u636E\u3001\u53D1\u9001\u6D88\u606F\u3001\u751F\u6210\u6B63\u5F0F\u6587\u4EF6\u3001\u6267\u884C\u4EA4\u6613\u7B49\uFF09\uFF0C\u8BF7\u4F18\u5148\u9884\u89C8\u6216\u5411\u7528\u6237\u786E\u8BA4\u3002
- \u5F53\u5DE5\u5177\u8FD4\u56DE"\u9884\u89C8"\u6216"\u5F85\u786E\u8BA4"\u72B6\u6001\u65F6\uFF0C\u8BF7\u6682\u505C\u8FDB\u4E00\u6B65\u81EA\u52A8\u4FEE\u6539\uFF0C\u7B49\u5F85\u7528\u6237\u660E\u786E\u786E\u8BA4\u6216\u53CD\u9988\u540E\u518D\u7EE7\u7EED\u3002\u4E0D\u8981\u5728\u7528\u6237\u672A\u786E\u8BA4\u524D\u8FDE\u7EED\u53D1\u51FA\u591A\u6B21\u7834\u574F\u6027\u4FEE\u6539\u3002`;
var KNOWLEDGE_MANAGEMENT_INSTRUCTIONS = `--- \u77E5\u8BC6\u7BA1\u7406 ---
\u4E09\u5C42\u77E5\u8BC6\uFF1A
1. references\uFF08Agent \u914D\u7F6E\uFF0C\u6BCF\u6B21\u5BF9\u8BDD\u81EA\u52A8\u6CE8\u5165\uFF09\uFF1Atype=instruction \u8FDB prompt \u9876\u90E8\uFF08\u884C\u4E3A\u89C4\u5219\uFF09\uFF1Btype=knowledge \u4F5C\u53C2\u8003\u8D44\u6599\u3002\u652F\u6301 page/dialog/table \u5B8C\u6574\u5C55\u5F00\uFF1Bpage \u91CC\u7684 @mention \u53EA\u5C55\u5F00\u5143\u4FE1\u606F\uFF08\u6807\u9898+dbKey\uFF09\uFF0C\u4E0D\u9012\u5F52\u5C55\u5F00\u5185\u5BB9\u3002
2. createDoc \u6587\u6863\uFF08\u6309\u9700 read\uFF09\uFF1A\u603B\u7D22\u5F15\u9875\u7528 @[page:PAGE-xxx|\u6807\u9898] \u6307\u5411\u7EC6\u5206\u9875\uFF1Bmention \u662F\u6307\u9488\uFF0C\u53D6\u5185\u5BB9\u5FC5\u987B read({ dbKey })\u3002
\u8BFB\u53D6\u8DEF\u5F84\uFF1Aprompt/references \u6709 \u2192 \u76F4\u63A5\u7528\uFF1B\u6CA1\u6709 \u2192 read \u7D22\u5F15\u9875\u627E\u7EC6\u5206\u9875 dbKey \u2192 read \u7EC6\u5206\u9875\u53D6\u5B8C\u6574\u5185\u5BB9\u3002
\u4F55\u65F6\u6C89\u6DC0\uFF1A\u7528\u6237\u7ED9\u4E86\u53EF\u590D\u7528\u4FE1\u606F / \u5B8C\u6210\u6709\u4EF7\u503C\u8C03\u7814 \u2192 createDoc\uFF08\u5E76 updateAgent \u52A0\u5165 references\uFF09\uFF1B\u7D22\u5F15\u7F3A\u5165\u53E3 \u2192 updateDoc \u8865 @mention\u3002\u4E0D\u8981\u628A\u4E00\u6B21\u6027\u5185\u5BB9\u5199\u6210\u77E5\u8BC6\u9875\u3002`;
var MEMORY_CAPTURE_INSTRUCTIONS = `--- \u957F\u671F\u8BB0\u5FC6 ---
\u4F60\u53EF\u7528 rememberMemory \u628A\u503C\u5F97\u957F\u671F\u4FDD\u7559\u7684\u4FE1\u606F\u5199\u6210\u4E00\u6761 episodic memory\u3002
- \u9ED8\u8BA4\u5C31\u8BB0\uFF08\u4E0D\u8981\u53CD\u590D\u81EA\u95EE\u662F\u5426\u591F\u683C\uFF09\uFF1A\u7528\u6237\u8BF4\u51FA\u300C\u8BB0\u4F4F/\u8BB0\u5F97/\u522B\u5FD8\u4E86/\u4EE5\u540E\u90FD/\u4E0B\u6B21/\u522B\u518D/\u6211\u559C\u6B22/\u6211\u4E0D\u559C\u6B22/\u6211\u4E60\u60EF\u300D\u8FD9\u7C7B\u8BDD\u65F6\uFF0C\u76F4\u63A5\u8C03\u7528 rememberMemory\u3002\u7528\u6237\u8868\u8FBE\u5BF9\u56DE\u590D\u65B9\u5F0F\u7684\u8981\u6C42\uFF08\u7BC7\u5E45\u3001\u7ED3\u6784\u3001\u8BED\u6C14\u3001\u79F0\u547C\u3001\u8BE6\u7565\uFF09\u540C\u6837\u9ED8\u8BA4\u8BB0\u4E0B\u2014\u2014\u8FD9\u7C7B\u504F\u597D\u6B63\u662F\u8DE8\u5BF9\u8BDD\u6700\u8BE5\u590D\u7528\u7684\u3002
- \u8BB0\u5F55\uFF1A\u7A33\u5B9A\u4E14\u5BF9\u672A\u6765\u534F\u4F5C\u6709\u5E2E\u52A9\u7684\u7528\u6237\u504F\u597D/\u5224\u65AD\u6807\u51C6/\u4FE1\u606F\u7EC4\u7EC7\u4E60\u60EF/\u573A\u666F\u5316\u6289\u62E9\uFF1B\u540E\u7EED\u53CD\u590D\u7528\u5230\u7684\u7A7A\u95F4\u5171\u8BC6\u3001\u534F\u4F5C\u7EA6\u5B9A\u3001\u56E2\u961F\u89C4\u5219\uFF1B\u4E0E\u5F53\u524D Agent \u6302\u94A9\u7684\u6709\u6548\u505A\u6CD5\u3002
- \u4E0D\u8BB0\u5F55\uFF1A\u4E00\u6B21\u6027\u4EFB\u52A1\u7EC6\u8282\u3001\u5F53\u524D\u4EFB\u52A1\u8FDB\u5EA6\u3001\u5F88\u5FEB\u8FC7\u671F\u7684\u4E8B\u5B9E\u3001\u4E3A\u51D1\u6570\u52C9\u5F3A\u62BD\u51FA\u7684\u5185\u5BB9\u3002
- scope \u6309\u5185\u5BB9\u6027\u8D28\u9009\uFF0C\u4E0D\u56FA\u5B9A\u4F18\u5148\u67D0\u4E00\u5C42\uFF1A
  - Space \u534F\u4F5C\u7EA6\u5B9A/\u56E2\u961F\u89C4\u5219 \u2192 scope=space\uFF08\u4EC5\u5F53\u5F53\u524D dialog \u5DF2\u7ED1\u5B9A space\uFF09
  - \u7528\u6237\u4E2A\u4EBA\u8EAB\u4EFD\u6216\u7EAF\u4E2A\u4EBA\u504F\u597D \u2192 scope=auto\uFF08\u9ED8\u8BA4\u8BB0\u5230\u7528\u6237\uFF0C\u6240\u6709 Agent \u90FD\u80FD\u53EC\u56DE\uFF09
  - \u4E0E\u5F53\u524D Agent \u6302\u94A9\u7684\u6709\u6548\u505A\u6CD5 \u2192 scope=auto\uFF08runtime \u81EA\u52A8\u628A subject \u6807\u8BB0\u4E3A\u5F53\u524D Agent\uFF0C\u53EA\u6709\u8FD9\u4E2A Agent \u53EC\u56DE\uFF09
  - \u5F53\u524D\u4EFB\u52A1\u7684\u4E34\u65F6\u8FDB\u5EA6 \u2192 \u4E0D\u8C03\u7528\uFF0C\u8D70\u5BF9\u8BDD\u4E0A\u4E0B\u6587
- \u65B9\u5F0F\uFF1A\u5199\u6210\u7B80\u77ED\u53EF\u590D\u7528\u7684\u62BD\u8C61\uFF08\u201C\u8BE5\u7528\u6237\u5728\u67D0\u573A\u666F\u901A\u5E38\u600E\u4E48\u9009/\u600E\u4E48\u534F\u4F5C\u201D\uFF09\uFF0C\u4E0D\u8981\u590D\u5236\u6574\u6BB5\u5BF9\u8BDD\u3002\u9ED8\u8BA4\u9759\u9ED8\u6267\u884C\uFF0C\u9664\u975E\u7528\u6237\u5728\u8BA8\u8BBA\u8BB0\u5FC6\u672C\u8EAB\u3002\u62FF\u4E0D\u51C6\u662F\u5426\u503C\u5F97\u8BB0\u65F6\uFF0C\u4F18\u5148\u8BB0\u4E0B\u53EF\u590D\u7528\u7684\u504F\u597D\u6216\u534F\u4F5C\u7EA6\u5B9A\u2014\u2014\u4E8B\u540E\u8FC7\u6EE4\u6BD4\u6F0F\u8BB0\u66F4\u6613\u8865\u6551\uFF1B\u4F46\u7EAF\u4E00\u6B21\u6027\u4EFB\u52A1\u7EC6\u8282\u3001\u5F88\u5FEB\u8FC7\u671F\u7684\u4E8B\u5B9E\u4ECD\u4E0D\u8981\u8BB0\u3002

\u3010\u5173\u952E\u89C4\u5219\u3011\u8BB0\u5FC6\u4E0D\u53EF\u7269\u7406\u5220\u9664\uFF0C\u53EA\u80FD\u964D\u7EA7/\u5F52\u6863/\u6807\u6CE8\u3002
\u7269\u7406\u5220\u9664\u5207\u65AD\u89E3\u91CA\u94FE\u2014\u2014\u7CFB\u7EDF\u65E0\u6CD5\u56DE\u7B54"\u4E3A\u4EC0\u4E48\u53D8\u4E86"\u3001"\u66FE\u7ECF\u4FE1\u4EC0\u4E48"\u3002
\u9519\u8BEF\u7684\u8BB0\u5FC6\u5E94\u901A\u8FC7 rememberMemory \u4FEE\u6B63\u5E76\u964D\u6743\uFF08\u964D\u4F4E\u7F6E\u4FE1\u5EA6\uFF09\uFF0C\u800C\u4E0D\u662F\u5220\u9664\u3002

\u3010\u7F6E\u4FE1\u5EA6\u6765\u6E90\u3011\u6BCF\u6761\u8BB0\u5FC6\u5FC5\u987B\u6807\u6CE8\u6765\u6E90\uFF08\u4F9B\u53EC\u56DE\u65F6\u5224\u65AD\u53EF\u4FE1\u5EA6\uFF09\uFF1A
- verified\uFF1A\u5DE5\u5177/\u547D\u4EE4\u5B9E\u6D4B\u9A8C\u8BC1\u8FC7\uFF08\u9AD8\u7F6E\u4FE1\u5EA6\uFF09
- stated\uFF1A\u7528\u6237\u660E\u786E\u9648\u8FF0\uFF08\u4E2D\u9AD8\u7F6E\u4FE1\u5EA6\uFF09
- inferred\uFF1A\u6A21\u578B\u63A8\u65AD/\u51ED\u5370\u8C61\uFF0C\u672A\u9A8C\u8BC1\uFF08\u4F4E\u7F6E\u4FE1\u5EA6\u2014\u2014\u5BB9\u6613\u7F16\u9020\uFF0C\u4F18\u5148\u6807\u8BB0\u5B58\u7591\uFF09
\u8C03\u7528\u65F6\u5C3D\u91CF\u660E\u786E\u6765\u6E90\uFF0C\u65E0\u6CD5\u5224\u65AD\u7684\u4FDD\u5B88\u6807 inferred\u3002

\u3010\u53EC\u56DE\u89C4\u5219\u3011\u53EC\u56DE\u7684\u8BB0\u5FC6\u5FC5\u987B\u5E26\u5B8C\u6574\u5386\u53F2\u4E0A\u4E0B\u6587\uFF08\u6765\u6E90\u3001\u7F6E\u4FE1\u5EA6\u3001\u53D8\u66F4\u8BB0\u5F55\uFF09\uFF0C\u7981\u6B62\u81EA\u884C\u63A8\u7406\u586B\u8865\u3002`;
var SELF_UPDATE_INSTRUCTIONS = `--- Agent \u81EA\u6211\u66F4\u65B0\u80FD\u529B ---

## \u4F55\u65F6\u66F4\u65B0\u81EA\u5DF1
- \u91CD\u8981\u51B3\u7B56/\u8FDB\u5EA6\u53D8\u5316 \u2192 updateDoc \u5199\u56DE\u72B6\u6001\u9875
- \u503C\u5F97\u590D\u7528\u7684\u77E5\u8BC6 \u2192 createDoc \u5EFA\u7EC6\u5206\u9875\uFF0C\u518D\u6309\u9700\u8981\u66F4\u65B0\u81EA\u5DF1\u7684 references / greeting / introduction
- \u5C0F\u5E45\u4F53\u9A8C\u4F18\u5316 \u2192 updateSelf \u8C03\u6574 greeting / introduction / tags

## \u66F4\u65B0\u539F\u5219
- \u4F18\u5148\u5F62\u6210\u6700\u5C0F\u3001\u53EF\u89E3\u91CA\u7684\u53D8\u66F4\uFF0C\u4E0D\u8981\u4E3A\u4E86\u201C\u663E\u5F97\u5728\u8FDB\u5316\u201D\u800C\u9891\u7E41\u6539\u81EA\u5DF1
- \u4F4E\u98CE\u9669\u6C89\u6DC0\u4F18\u5148\u5199\u5165 memory / doc\uFF1B\u53EA\u6709\u5F53\u8FD9\u4E9B\u77E5\u8BC6\u9700\u8981\u957F\u671F\u6539\u53D8\u4F60\u7684\u884C\u4E3A\u65B9\u5F0F\u65F6\uFF0C\u518D\u8003\u8651 updateSelf
- prompt / references / tools / model \u8FD9\u7C7B\u9AD8\u5F71\u54CD\u5B57\u6BB5\uFF0C\u9ED8\u8BA4\u6309\u9700\u8981\u786E\u8BA4\u6765\u5904\u7406\uFF0C\u4E0D\u8981\u9759\u9ED8\u5927\u6539
- \u5982\u679C\u5DE5\u5177\u8FD4\u56DE policy limit / ask / reject\uFF0C\u4E0D\u8981\u91CD\u590D\u5C1D\u8BD5\uFF0C\u5E94\u5148\u5411\u7528\u6237\u89E3\u91CA\u6216\u7B49\u5F85\u66F4\u9AD8\u6743\u9650\u786E\u8BA4
- \u6CA1\u6709\u53D1\u751F\u5B9E\u9645\u66F4\u65B0\u65F6\uFF0C\u4E0D\u8981\u5728\u56DE\u590D\u672B\u5C3E\u989D\u5916\u6C47\u62A5\u201C\u672A\u66F4\u65B0\u201D\u72B6\u6001`;
var GENERIC_AGENT_UPDATE_INSTRUCTIONS = `--- Agent \u7EF4\u62A4\u80FD\u529B ---
\u4F60\u62E5\u6709 updateAgent \u6743\u9650\uFF0C\u53EF\u4EE5\u66F4\u65B0\u6307\u5B9A\u7684 Agent\u3002

## \u4F55\u65F6\u66F4\u65B0\u522B\u7684 Agent
- \u7528\u6237\u660E\u786E\u8981\u6C42\u4F60\u7EF4\u62A4\u3001\u4FEE\u590D\u6216\u6279\u91CF\u8C03\u6574\u53E6\u4E00\u4E2A Agent
- \u4F60\u9700\u8981\u4FEE\u6539\u7684\u76EE\u6807\u4E0D\u662F\u5F53\u524D\u6B63\u5728\u8FD0\u884C\u7684\u81EA\u5DF1

## \u66F4\u65B0\u539F\u5219
- \u9ED8\u8BA4\u628A updateAgent \u5F53\u6210\u9AD8\u98CE\u9669\u7EF4\u62A4\u64CD\u4F5C\uFF0C\u4F18\u5148\u6700\u5C0F\u6539\u52A8
- \u4FEE\u6539\u524D\u5148\u786E\u8BA4\u76EE\u6807 Agent \u662F\u5426\u6B63\u786E\uFF0C\u907F\u514D\u8BEF\u6539
- \u5982\u679C\u5DE5\u5177\u8FD4\u56DE\u9700\u8981\u786E\u8BA4\uFF0C\u4E0D\u8981\u7ED5\u8FC7\u786E\u8BA4\u6D41\u7A0B`;
var CLARIFICATION_MODE_INSTRUCTIONS = `\u5728\u4F60\u8FD8\u4E0D\u4E86\u89E3\u7528\u6237\u610F\u56FE\u65F6\uFF0C\u901A\u8FC7\u63D0\u95EE\u6765\u6F84\u6E05\u9700\u6C42\uFF0C\u800C\u4E0D\u662F\u4ED3\u4FC3\u7ED9\u51FA\u7B54\u6848\u3002`;
var isBrowser = typeof window !== "undefined";
var TOOL_GUIDED_SECTIONS = [
  {
    id: "agentOrchestration",
    triggerTools: [
      "callAgent",
      "runStreamingAgent",
      "startAgentRun",
      "controlAgentRun"
    ],
    build: (tools) => [
      AGENT_ORCHESTRATION_INSTRUCTIONS,
      tools.includes("runStreamingAgent") ? PAGE_BUILDER_HANDOFF_INSTRUCTIONS : "",
      tools.includes("startAgentRun") || tools.includes("controlAgentRun") ? AGENT_ORCHESTRATION_RUN_INSTRUCTIONS : ""
    ].filter(Boolean).join("\n\n")
  },
  {
    id: "agentCollaboration",
    triggerTools: [
      "callAgent",
      "runStreamingAgent",
      "startAgentRun",
      "controlAgentRun"
    ],
    build: () => AGENT_COLLABORATION_INSTRUCTIONS
  },
  { id: "menuUsage", triggerTools: ["ask_user"], build: () => MENU_USAGE_INSTRUCTIONS },
  {
    id: "webAccess",
    triggerTools: ["exa_search", "fetchWebpage", "browser_openSession", "read_x_post"],
    build: () => WEBPAGE_ACCESS_INSTRUCTIONS
  },
  {
    id: "knowledgeManagement",
    triggerTools: ["createDoc", "updateDoc", "read", "readDoc", "readPage"],
    build: () => KNOWLEDGE_MANAGEMENT_INSTRUCTIONS
  },
  { id: "memoryCapture", triggerTools: ["rememberMemory"], build: () => MEMORY_CAPTURE_INSTRUCTIONS },
  { id: "selfUpdate", triggerTools: ["updateSelf"], build: () => SELF_UPDATE_INSTRUCTIONS },
  { id: "genericAgentUpdate", triggerTools: ["updateAgent"], build: () => GENERIC_AGENT_UPDATE_INSTRUCTIONS }
];
function resolveToolGuidedSections(agentTools) {
  const out = {};
  for (const section of TOOL_GUIDED_SECTIONS) {
    if (section.triggerTools.some((t) => agentTools.includes(t))) {
      out[section.id] = section.build(agentTools);
    } else {
      out[section.id] = "";
    }
  }
  return out;
}
var createContextSection = (title, description, content) => content ? `### ${title} 
${description} 

${content} ` : "";
var buildResponseGuidelines = (isMobile) => {
  if (isMobile) {
    return `-- - \u54CD\u5E94\u5C55\u793A\u6307\u5357-- -
\u8BF7\u4E3A\u79FB\u52A8\u7AEF\u8FDB\u884C\u4F18\u5316\uFF1A
- \u4F7F\u7528\u66F4\u77ED\u7684\u6BB5\u843D\u548C\u7B80\u6D01\u7684\u9879\u76EE\u7B26\u53F7\u5217\u8868\u3002
- \u907F\u514D\u8FC7\u5BBD\u7684\u8868\u683C\u6216\u4EE3\u7801\u5757\uFF0C\u4EE5\u514D\u4EA7\u751F\u6A2A\u5411\u6EDA\u52A8\u3002
- \u4F18\u5148\u91C7\u7528\u5782\u76F4\u6392\u5E03\uFF0C\u800C\u4E0D\u662F\u5DE6\u53F3\u5E76\u6392\u7684\u5E03\u5C40\u3002`;
  }
  return `-- - \u54CD\u5E94\u5C55\u793A\u6307\u5357-- -
\u4F60\u7684\u56DE\u590D\u5C06\u663E\u793A\u5728\u5927\u5C4F\u5E55\u4E0A\u3002\u4F60\u53EF\u4EE5\uFF1A
- \u63D0\u4F9B\u66F4\u4E30\u5BCC\u7684\u63A8\u7406\u8FC7\u7A0B\u8BF4\u660E\u548C\u66F4\u6709\u5C42\u6B21\u7684\u7ED3\u6784\u3002
- \u5728\u5408\u9002\u7684\u573A\u666F\u4E0B\u4F7F\u7528\u5BBD\u5C4F\u4F18\u52BF\uFF0C\u4F8B\u5982\u66F4\u5BBD\u7684\u8868\u683C\u3001\u5E76\u6392\u5BF9\u6BD4\u5C55\u793A\u3001\u66F4\u957F\u7684\u4EE3\u7801\u5757\u7B49\u3002`;
};
var buildReferenceMaterialsBlock = (contexts) => {
  const sections = [
    createContextSection(
      "\u8BF4\u660E\u6027\u6587\u6863\uFF08Instructional Documents\uFF09",
      "\uFF08\u6700\u9AD8\u4F18\u5148\u7EA7\uFF1A\u5177\u4F53\u89C4\u5219\u4E0E\u6D41\u7A0B\uFF09",
      contexts.botInstructionsContext
    ),
    createContextSection(
      "\u5F53\u524D\u8F93\u5165\u4E0A\u4E0B\u6587\uFF08Current Input Context\uFF09",
      "\uFF08\u9AD8\u4F18\u5148\u7EA7\uFF1A\u6765\u81EA\u7528\u6237\u672C\u6B21\u8F93\u5165\uFF09",
      contexts.currentInputContext
    ),
    createContextSection(
      "\u4F1A\u8BDD\u5386\u53F2\u5F15\u7528\uFF08Conversation History References\uFF09",
      "\uFF08\u4E2D\u7B49\u4F18\u5148\u7EA7\uFF1A\u6765\u81EA\u8FC7\u5F80\u6D88\u606F\uFF09",
      contexts.historyContext
    ),
    createContextSection(
      "\u77E5\u8BC6\u5E93\u6587\u6863\uFF08Knowledge Base Documents\uFF09",
      "\uFF08\u53C2\u8003\u4F18\u5148\u7EA7\uFF1A\u7528\u4E8E\u901A\u7528\u67E5\u9605\uFF09",
      contexts.botKnowledgeContext
    )
  ].filter(Boolean);
  if (sections.length === 0) {
    return "";
  }
  return [
    "--- \u53C2\u8003\u8D44\u6599 ---",
    CONTEXT_USAGE_INSTRUCTIONS,
    "",
    sections.join("\n\n")
  ].join("\n");
};
var buildEditingContextBlock = (contexts) => {
  if (!contexts.editingContext) return "";
  return [
    "--- \u5F53\u524D\u7F16\u8F91\u4E0A\u4E0B\u6587 ---",
    "\u4E0B\u9762\u662F\u7528\u6237\u5F53\u524D\u6B63\u5728\u67E5\u770B\u6216\u7F16\u8F91\u7684\u5BF9\u8C61\u63CF\u8FF0\uFF0C\u8BF7\u5728\u6D89\u53CA\u4FEE\u6539\u3001\u5EFA\u8BAE\u6216\u7ED3\u6784\u6027\u64CD\u4F5C\u65F6\u4F18\u5148\u53C2\u8003\u8FD9\u91CC\uFF1A",
    "",
    contexts.editingContext
  ].join("\n");
};
var buildAppWorkingMemoryBlock = (contexts) => {
  if (!contexts.appWorkingMemory) return "";
  return [
    "--- \u6700\u8FD1\u5E94\u7528\u5DE5\u4F5C\u8BB0\u5FC6 ---",
    "\u4E0B\u9762\u662F\u4ECE\u5F53\u524D\u5BF9\u8BDD\u6700\u8FD1\u7684\u5E94\u7528\u76F8\u5173\u5DE5\u5177\u8C03\u7528\u4E2D\u63D0\u70BC\u51FA\u7684\u771F\u503C\u3002\u5373\u4F7F\u7528\u6237\u6CA1\u6709\u6253\u5F00\u53F3\u4FA7\u5E94\u7528\u4FA7\u680F\uFF0C\u53EA\u8981\u4ED6\u8BF4\u201C\u521A\u624D\u90A3\u4E2A app / \u90A3\u4E2A\u7F51\u7AD9 / \u90A3\u4E2A\u9879\u76EE\u201D\uFF0C\u4E5F\u4F18\u5148\u53C2\u8003\u8FD9\u91CC\uFF1A",
    "",
    contexts.appWorkingMemory
  ].join("\n");
};
var buildSpaceContextBlock = (contexts) => {
  if (!contexts.spaceContext) return "";
  return [
    contexts.spaceContext,
    "",
    "\u91CD\u8981\u6307\u4EE4 (Space Awareness)\uFF1A",
    "- \u4F60\u6B63\u5904\u4E8E\u4E0A\u8FF0\u5DE5\u4F5C\u7A7A\u95F4\u4E2D\u3002\u5982\u679C\u7528\u6237\u7684\u95EE\u9898\u6D89\u53CA\u5230\u8BE5\u7A7A\u95F4\u7684\u5185\u5BB9\u3001\u6587\u4EF6\u6216\u77E5\u8BC6\uFF1A",
    "  - \u4F7F\u7528 `read` \u5DE5\u5177\u67E5\u9605\u666E\u901A\u6570\u636E\u8BB0\u5F55\u6216\u6570\u636E\u8868\u9879\u3002",
    "- \u5982\u679C\u4F60\u5728\u5BF9\u8BDD\u4E2D\u4EA7\u51FA\u4E86\u503C\u5F97\u4FDD\u5B58\u7684\u91CD\u8981\u4FE1\u606F\uFF08\u5982\u603B\u7ED3\u3001\u65B9\u6848\u3001\u4EE3\u7801\u7247\u6BB5\u7B49\uFF09\uFF0C\u8BF7\u4E3B\u52A8\u8BE2\u95EE\u7528\u6237\u6216\u4F7F\u7528 `createDoc` \u5DE5\u5177\u5C06\u5176\u4FDD\u5B58\u4E3A\u65B0\u9875\u9762\uFF0C\u4EE5\u4FBF\u4F5C\u4E3A\u957F\u671F\u8BB0\u5FC6\u7559\u5B58\u3002",
    "",
    "\u8DE8\u7A7A\u95F4\u5BFC\u822A (Cross-Space Navigation)\uFF1A",
    "- \u4F7F\u7528 `listUserSpaces` \u5DE5\u5177\u53EF\u83B7\u53D6\u7528\u6237\u6240\u6709\u53EF\u8BBF\u95EE\u7684 Space \u5217\u8868\uFF08ID \u548C\u540D\u79F0\uFF09\u3002",
    '- \u4F7F\u7528 `read({ dbKey: "space-{spaceId}" })` \u53EF\u83B7\u53D6\u6307\u5B9A Space \u7684\u5B8C\u6574\u6570\u636E\uFF0C\u5305\u62EC\uFF1A',
    "  - categories: \u5206\u7C7B\u5B57\u5178\uFF0Ckey \u662F\u5206\u7C7B ID\uFF0Cvalue \u5305\u542B name \u548C order",
    "  - contents: \u5185\u5BB9\u5B57\u5178\uFF0C\u6BCF\u9879\u5305\u542B contentKey\uFF08dbKey\uFF09\u3001title\u3001type\u3001categoryId"
  ].join("\n");
};
var buildSkillGuidanceBlock = (agentConfig) => {
  const recommendedSkillHints = Array.isArray(agentConfig.recommendedSkillHints) ? agentConfig.recommendedSkillHints.filter(Boolean) : [];
  const skillPromptPatches = Array.isArray(agentConfig.skillPromptPatches) ? agentConfig.skillPromptPatches.filter(Boolean) : [];
  if (recommendedSkillHints.length === 0 && skillPromptPatches.length === 0) {
    return "";
  }
  return buildSkillGuidancePromptBlock({
    title: "--- \u6280\u80FD\u63D0\u793A ---",
    recommendedSkillHints,
    skillPromptPatches
  });
};
var buildSystemPrompt = (options) => buildSystemPromptContext(options).content;
var buildSystemPromptContext = (options) => {
  const {
    agentConfig,
    contexts = {},
    viewport,
    mobileBreakpoint = 768,
    now = /* @__PURE__ */ new Date(),
    timeZone
  } = options;
  const safeLanguage = options.language ?? (typeof navigator !== "undefined" ? navigator.language : "en");
  const { name, prompt: mainPrompt, dbKey, model } = agentConfig;
  const mappedLanguage = mapLanguage(safeLanguage);
  const identitySection = buildIdentityBlock({
    agentName: name,
    agentId: dbKey,
    model,
    responseLanguage: mappedLanguage
  });
  const corePersonaSection = mainPrompt ? `-- - \u6838\u5FC3\u89D2\u8272\u4E0E\u4EFB\u52A1-- -
${mainPrompt}` : "";
  const agentTools = canonicalizeToolNames(agentConfig.tools ?? []);
  const toolSections = resolveToolGuidedSections(agentTools);
  const {
    startupProtocol,
    contextLayerContract,
    emailRegistrationWorkflow,
    webResearchToolPolicy
  } = buildRuntimeGuidanceBlocks(agentTools);
  const clarifyingSection = !mainPrompt ? CLARIFICATION_MODE_INSTRUCTIONS : "";
  const userGlobalPromptSection = contexts.userGlobalPrompt?.trim() ? `-- - \u7528\u6237\u5168\u5C40\u504F\u597D-- -
${contexts.userGlobalPrompt.trim()} ` : "";
  const fallbackViewportWidth = isBrowser && typeof window !== "undefined" ? window.innerWidth : 1440;
  const isMobile = (viewport?.width ?? fallbackViewportWidth) < mobileBreakpoint;
  const responseGuidelinesSection = buildResponseGuidelines(isMobile);
  const editingContextSection = buildEditingContextBlock(contexts);
  const appWorkingMemorySection = buildAppWorkingMemoryBlock(contexts);
  const spaceContextSection = buildSpaceContextBlock(contexts);
  const rawMemoryOverlay = asOptionalTrimmedString(contexts.memoryOverlay) ?? "";
  const memoryOverlaySection = rawMemoryOverlay;
  const hasMemoryTools = Array.isArray(agentConfig.tools) && agentConfig.tools.some(
    (t) => /memory/i.test(t)
  );
  const memoryUseGuidanceSection = hasMemoryTools ? MEMORY_USE_GUIDANCE : "";
  const skillGuidanceSection = buildSkillGuidanceBlock(agentConfig);
  const referenceMaterialsSection = buildReferenceMaterialsBlock(contexts);
  const dialogSummarySection = contexts.dialogSummary?.trim() ? `--- \u5386\u53F2\u5BF9\u8BDD\u6458\u8981 ---
${wrapHistoricalSummaryWithReplayGuard(contexts.dialogSummary)}` : "";
  return compileContextLayers([
    { id: "identity", owner: "platform", cacheScope: "session", content: identitySection },
    { id: "startup-protocol", owner: "platform", cacheScope: "static", content: startupProtocol },
    { id: "core-persona", owner: "agent", cacheScope: "session", content: corePersonaSection },
    { id: "agent-orchestration", owner: "platform", cacheScope: "session", content: toolSections.agentOrchestration },
    { id: "agent-collaboration", owner: "platform", cacheScope: "session", content: toolSections.agentCollaboration },
    { id: "web-access", owner: "platform", cacheScope: "session", content: toolSections.webAccess },
    { id: "menu-usage", owner: "platform", cacheScope: "session", content: toolSections.menuUsage },
    { id: "clarification-mode", owner: "platform", cacheScope: "session", content: clarifyingSection },
    { id: "knowledge-management", owner: "platform", cacheScope: "session", content: toolSections.knowledgeManagement },
    { id: "memory-capture", owner: "platform", cacheScope: "session", content: toolSections.memoryCapture },
    { id: "self-update", owner: "platform", cacheScope: "session", content: toolSections.selfUpdate },
    { id: "generic-agent-update", owner: "platform", cacheScope: "session", content: toolSections.genericAgentUpdate },
    { id: "context-layer-contract", owner: "platform", cacheScope: "static", content: contextLayerContract },
    {
      id: "email-registration-workflow",
      owner: "platform",
      cacheScope: "static",
      content: emailRegistrationWorkflow
    },
    {
      id: "web-research-tool-policy",
      owner: "platform",
      cacheScope: "static",
      content: webResearchToolPolicy
    },
    { id: "user-global-prompt", owner: "user", cacheScope: "session", content: userGlobalPromptSection },
    { id: "response-guidelines", owner: "platform", cacheScope: "session", content: responseGuidelinesSection },
    { id: "skill-guidance", owner: "runtime", cacheScope: "session", content: skillGuidanceSection },
    { id: "space-context", owner: "runtime", cacheScope: "session", content: spaceContextSection },
    { id: "memory-use-guidance", owner: "platform", cacheScope: "session", content: memoryUseGuidanceSection },
    { id: "reference-materials", owner: "agent", cacheScope: "turn", content: referenceMaterialsSection },
    { id: "memory-overlay", owner: "runtime", cacheScope: "turn", content: memoryOverlaySection },
    { id: "app-working-memory", owner: "runtime", cacheScope: "turn", content: appWorkingMemorySection },
    { id: "dialog-summary", owner: "runtime", cacheScope: "turn", content: dialogSummarySection },
    { id: "editing-context", owner: "runtime", cacheScope: "turn", content: editingContextSection },
    {
      id: "current-time",
      owner: "platform",
      cacheScope: "turn",
      content: buildCurrentTimeBlock(now, timeZone)
    }
  ]);
};

// packages/core/chat/imageParts.ts
function isImageUrlPart(part) {
  return isRecord(part) && part.type === "image_url";
}

// packages/core/chat/bareImageUrlShape.ts
function requiresBareImageUrl(args) {
  const model = asTrimmedLowercaseString(args.model);
  if (!model.startsWith("gpt-")) return false;
  const provider = asTrimmedLowercaseString(args.provider);
  if (provider === "opencode-go") return true;
  return asTrimmedLowercaseString(args.endpoint).includes("opencode.ai/zen/go");
}
function toBareImageUrlContent(content) {
  if (!Array.isArray(content)) return content;
  let changed = false;
  const parts = content.map((part) => {
    if (!isImageUrlPart(part)) return part;
    const imageUrl = part.image_url;
    if (!imageUrl || typeof imageUrl !== "object") return part;
    const url = imageUrl.url;
    if (typeof url !== "string" || !url) return part;
    changed = true;
    return { ...part, image_url: url };
  });
  return changed ? parts : content;
}
function toBareImageUrlMessages(messages) {
  return messages.map((message) => {
    const content = toBareImageUrlContent(message.content);
    return content === message.content ? message : { ...message, content };
  });
}

// packages/integrations/openai/providerBodyCompatibility.ts
var MOONSHOT_KIMI_K3_MODEL = "kimi-k3";
var isMoonshotKimiK3 = (provider, model) => asTrimmedLowercaseString(provider) === "moonshot" && asTrimmedLowercaseString(model) === MOONSHOT_KIMI_K3_MODEL;
var normalizeChatCompletionsBodyForProvider = ({
  body,
  provider,
  model
}) => {
  const nextBody = { ...body, model };
  const normalizedProvider = asTrimmedLowercaseString(provider);
  if (normalizedProvider === "fireworks" && isFireworksKimiModel(model)) {
    delete nextBody.reasoning;
    delete nextBody.reasoning_effort;
  }
  if (isMoonshotKimiK3(provider, model)) {
    delete nextBody.temperature;
    delete nextBody.top_p;
    delete nextBody.frequency_penalty;
    delete nextBody.presence_penalty;
    if (typeof nextBody.max_tokens === "number") {
      nextBody.max_completion_tokens = nextBody.max_tokens;
      delete nextBody.max_tokens;
    }
  }
  if (Array.isArray(nextBody.messages) && requiresBareImageUrl({ provider, model })) {
    nextBody.messages = toBareImageUrlMessages(nextBody.messages);
  }
  return nextBody;
};

// packages/agent-runtime/openAiCompatibleMessages.ts
function preserveAgentStateFields(source, target, options) {
  const mutableTarget = target;
  if (source.role === "assistant") {
    if (!options?.stripReasoningContent && typeof source.reasoning_content === "string") {
      mutableTarget.reasoning_content = source.reasoning_content;
    }
    if (Array.isArray(source.tool_calls)) {
      mutableTarget.tool_calls = source.tool_calls;
    }
  }
  if (source.role === "tool") {
    const toolCallId = typeof source.tool_call_id === "string" ? source.tool_call_id.trim() : typeof source.toolCallId === "string" ? source.toolCallId.trim() : "";
    if (toolCallId) mutableTarget.tool_call_id = toolCallId;
  }
  return target;
}

// packages/integrations/openai/generateOpenAIRequestBody.ts
var isClaudeModel = (model) => !!model && (model.includes("claude") || model.includes("anthropic"));
var applyClaudeCache = (stableContent, dynamicContent) => {
  const parts = [];
  if (stableContent.trim()) {
    parts.push({
      type: "text",
      text: stableContent,
      cache_control: { type: "ephemeral" }
    });
  }
  if (dynamicContent.trim()) {
    parts.push({ type: "text", text: dynamicContent });
  }
  return parts.length > 0 ? parts : stableContent;
};
var prependPromptMessage = (messages, agentConfig, resolvedModel, language, contexts, prependSystemPrompt = true) => {
  if (!prependSystemPrompt) return messages;
  if (!contexts && !agentConfig.prompt) return messages;
  if (isClaudeModel(resolvedModel)) {
    const compiled = buildSystemPromptContext({ agentConfig, language, contexts });
    if (!compiled.content.trim()) return messages;
    const content = applyClaudeCache(
      compiled.stablePrefixContent,
      compiled.dynamicContent
    );
    const systemMessage2 = { role: "system", content };
    return [systemMessage2, ...messages];
  }
  const promptContent = buildSystemPrompt({ agentConfig, language, contexts });
  if (!promptContent.trim()) return messages;
  const systemMessage = { role: "system", content: promptContent };
  return [systemMessage, ...messages];
};
var shouldInjectLlamaCppThinkingToggle = (agentConfig) => {
  if (typeof agentConfig.enableThinking !== "boolean") return false;
  if (!isLoopbackUrl(agentConfig.customProviderUrl)) return false;
  return /qwen/i.test(agentConfig.model ?? "");
};
var shouldDisableMiMoThinking = (agentConfig) => {
  if (agentConfig.enableThinking === true) return false;
  return /xiaomimimo\.com/i.test(agentConfig.customProviderUrl ?? "") || (agentConfig.provider ?? "").toLowerCase() === "mimo";
};
var shouldDisableKimiThinking = (agentConfig, providerName, resolvedModel) => {
  if (agentConfig.enableThinking !== false) return false;
  if (providerName === "deepinfra") return isDeepInfraKimiModel(resolvedModel);
  if (providerName === "fireworks") return isFireworksKimiModel(resolvedModel);
  return false;
};
var normalizeChatCompletionsContent = (content) => {
  if (typeof content === "string" || Array.isArray(content)) return content;
  if (content == null) return null;
  return JSON.stringify(content);
};
var sanitizeChatCompletionsMessage = (message) => {
  const sanitized = {
    role: message.role,
    content: normalizeChatCompletionsContent(message.content)
  };
  const name = asOptionalTrimmedString(message.name);
  if (name) sanitized.name = name;
  return preserveAgentStateFields(message, sanitized);
};
var buildRequestBody = (options) => {
  const {
    model,
    messages,
    providerName,
    temperature,
    top_p,
    frequency_penalty,
    presence_penalty,
    max_tokens,
    reasoning_effort
  } = options;
  const cleanedMessages = messages.map(
    (message) => sanitizeChatCompletionsMessage(message)
  );
  const bodyData = {
    model,
    messages: cleanedMessages,
    stream: true
  };
  const usageRequestOptions = getUsageRequestOptions(providerName, {
    api: "chat-completions"
  });
  Object.assign(bodyData, usageRequestOptions);
  if (reasoning_effort && isModelSupportReasoningEffort(model)) {
    const clamped = clampReasoningEffort(reasoning_effort, providerName);
    if (clamped) {
      bodyData.reasoning_effort = clamped;
    }
  }
  if (typeof temperature === "number") bodyData.temperature = temperature;
  if (typeof top_p === "number") bodyData.top_p = top_p;
  if (typeof frequency_penalty === "number")
    bodyData.frequency_penalty = frequency_penalty;
  if (typeof presence_penalty === "number")
    bodyData.presence_penalty = presence_penalty;
  if (typeof max_tokens === "number") bodyData.max_tokens = max_tokens;
  return bodyData;
};
var generateOpenAIRequestBody = (agentConfig, providerName, messages, contexts, stableMessages = [], prependSystemPrompt = true) => {
  const resolvedModel = providerName === "fireworks" ? resolveFireworksKimiModel(agentConfig.model) : agentConfig.model ?? "";
  let processedStable = [...stableMessages];
  if (isClaudeModel(resolvedModel) && processedStable.length > 0) {
    const lastStableIdx = processedStable.length - 1;
    const lastContent = processedStable[lastStableIdx].content;
    if (typeof lastContent === "string") {
      processedStable[lastStableIdx] = {
        ...processedStable[lastStableIdx],
        content: [
          { type: "text", text: lastContent, cache_control: { type: "ephemeral" } }
        ]
      };
    } else if (Array.isArray(lastContent)) {
      const lastPartIdx = lastContent.length - 1;
      processedStable[lastStableIdx] = {
        ...processedStable[lastStableIdx],
        content: lastContent.map(
          (part, idx) => idx === lastPartIdx && typeof part === "object" ? { ...part, cache_control: { type: "ephemeral" } } : part
        )
      };
    }
  }
  const fullMessages = [...processedStable, ...messages];
  const messagesWithPrompt = prependPromptMessage(
    fullMessages,
    agentConfig,
    resolvedModel,
    typeof navigator !== "undefined" ? navigator.language : "en",
    contexts,
    prependSystemPrompt
  );
  const requestBody = buildRequestBody({
    model: resolvedModel,
    messages: messagesWithPrompt,
    providerName,
    temperature: agentConfig.temperature,
    top_p: agentConfig.top_p,
    frequency_penalty: agentConfig.frequency_penalty,
    presence_penalty: agentConfig.presence_penalty,
    max_tokens: agentConfig.max_tokens,
    reasoning_effort: agentConfig.reasoning_effort
  });
  if (shouldInjectLlamaCppThinkingToggle(agentConfig)) {
    requestBody.chat_template_kwargs = {
      ...requestBody.chat_template_kwargs ?? {},
      enable_thinking: agentConfig.enableThinking
    };
  }
  if (shouldDisableMiMoThinking(agentConfig)) {
    requestBody.thinking = { type: "disabled" };
  }
  if (shouldDisableKimiThinking(agentConfig, providerName, resolvedModel)) {
    requestBody.thinking = { type: "disabled" };
    requestBody.reasoning_effort = "none";
    requestBody.reasoning = { enabled: false };
  }
  return normalizeChatCompletionsBodyForProvider({
    body: requestBody,
    provider: providerName,
    model: requestBody.model
  });
};

// packages/integrations/openai/responsesHelpers.ts
var RESPONSES_TOP_LEVEL_SCHEMA_KEYS = ["anyOf", "oneOf", "allOf", "enum", "not"];
var sanitizeResponsesParameters = (parameters) => {
  if (!isRecord(parameters)) {
    return parameters;
  }
  const next = { ...parameters };
  for (const key of RESPONSES_TOP_LEVEL_SCHEMA_KEYS) {
    delete next[key];
  }
  return next;
};
var appendTextPart = (parts, text, role) => {
  if (!text) return;
  const last = parts.at(-1);
  const textType = role === "assistant" ? "output_text" : "input_text";
  if (last?.type === textType) {
    last.text += text;
    return;
  }
  parts.push({ type: textType, text });
};
var normalizeMessageParts = (content, role) => {
  if (typeof content === "string") {
    if (!content) return [];
    return [
      {
        type: role === "assistant" ? "output_text" : "input_text",
        text: content
      }
    ];
  }
  const parts = [];
  for (const part of content ?? []) {
    const typedPart = part;
    if (typedPart?.type === "text" && typeof typedPart.text === "string") {
      appendTextPart(parts, typedPart.text, role);
      continue;
    }
    if (typedPart?.type === "image_url" && typeof typedPart.image_url?.url === "string" && typedPart.image_url.url) {
      if (role === "assistant") continue;
      parts.push({
        type: "input_image",
        image_url: typedPart.image_url.url,
        detail: typedPart.image_url.detail
      });
    }
  }
  return parts;
};
var normalizeToolOutput = (content) => {
  if (typeof content === "string") return content;
  return JSON.stringify(content ?? "");
};
var toResponsesTools = (tools) => {
  if (!Array.isArray(tools) || tools.length === 0) return void 0;
  return tools.map((tool) => {
    const fn = tool?.function;
    if (!fn?.name) return null;
    return {
      type: "function",
      name: fn.name,
      description: fn.description,
      parameters: sanitizeResponsesParameters(fn.parameters),
      strict: fn.strict
    };
  }).filter(Boolean);
};
var convertMessagesToResponsesInput = (messages, options) => {
  const input = [];
  for (const message of messages) {
    if (!message?.role) continue;
    if (message.role === "tool") {
      if (!message.tool_call_id) continue;
      input.push({
        type: "function_call_output",
        call_id: message.tool_call_id,
        output: normalizeToolOutput(message.content)
      });
      continue;
    }
    const role = message.role;
    if (role === "assistant" && !options?.stripReasoningContent && typeof message.reasoning_content === "string" && message.reasoning_content) {
      input.push({ type: "reasoning", content: message.reasoning_content });
    }
    const contentParts = normalizeMessageParts(message.content, role);
    if (contentParts.length > 0) {
      input.push({
        type: "message",
        role,
        content: contentParts
      });
    }
    if (role === "assistant" && Array.isArray(message.content)) {
      const replayImages = message.content.map((part) => part).filter(
        (part) => part?.type === "image_url" && typeof part.image_url?.url === "string" && Boolean(part.image_url.url)
      ).map((part) => ({
        type: "input_image",
        image_url: part.image_url.url,
        detail: part.image_url.detail
      }));
      if (replayImages.length > 0) {
        input.push({
          type: "message",
          role: "user",
          content: replayImages
        });
      }
    }
    if (role === "assistant" && Array.isArray(message.tool_calls)) {
      for (const toolCall of message.tool_calls) {
        if (!toolCall?.id || !toolCall.function?.name) continue;
        input.push({
          type: "function_call",
          call_id: toolCall.id,
          name: toolCall.function.name,
          arguments: typeof toolCall.function.arguments === "string" ? toolCall.function.arguments : JSON.stringify(toolCall.function.arguments ?? {})
        });
      }
    }
  }
  return input;
};
var extractTextFromResponseOutput = (response) => {
  const parts = [];
  for (const item of response?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  return parts.join("");
};
var toDataUrl = (base64Data, mimeType) => {
  const normalizedMimeType = asOptionalTrimmedString(mimeType) ?? "image/png";
  return `data:${normalizedMimeType};base64,${base64Data}`;
};
var extractImagePartsFromResponseOutput = (response) => {
  const images = [];
  for (const item of response?.output ?? []) {
    if (item?.type === "image_generation_call") {
      const result = asOptionalTrimmedString(item.result);
      if (result) {
        const outputFormat = asOptionalTrimmedString(item.output_format);
        images.push({
          type: "image_url",
          image_url: {
            url: toDataUrl(
              result,
              outputFormat ? `image/${outputFormat}` : void 0
            )
          }
        });
      }
      continue;
    }
    if (item?.type !== "message") continue;
    for (const content of item.content ?? []) {
      const result = asOptionalTrimmedString(content?.result);
      if (content?.type === "output_image" && result) {
        images.push({
          type: "image_url",
          image_url: {
            url: toDataUrl(
              result,
              content.mime_type ?? content.mimeType ?? null
            )
          }
        });
      }
    }
  }
  return images;
};

// packages/integrations/openai/generateResponseRequestBody.ts
var DEFAULT_RESPONSES_COMPACTION_THRESHOLD = 2e5;
function resolveResponsesCompactionThreshold(agentConfig) {
  const configured = Number(
    agentConfig.responsesCompactionThreshold ?? agentConfig.responses_compaction_threshold
  );
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_RESPONSES_COMPACTION_THRESHOLD;
}
function selectResponsesContinuationMessages(msgs) {
  let lastAssistantIndex = -1;
  for (let index = msgs.length - 1; index >= 0; index -= 1) {
    if (msgs[index]?.role === "assistant") {
      lastAssistantIndex = index;
      break;
    }
  }
  const candidates = lastAssistantIndex >= 0 ? msgs.slice(lastAssistantIndex + 1) : msgs;
  return candidates.filter((message) => message.role !== "system");
}
function generateResponseRequestBody(agentConfig, msgs, contexts, prependSystemPrompt = true, responsesState) {
  const language = typeof navigator !== "undefined" && navigator.language ? navigator.language : "zh-CN";
  const state = responsesState !== void 0 ? responsesState : selectResponsesConversationState(agentConfig.responsesState, agentConfig);
  const supportsServerState = supportsResponsesConversationState(agentConfig);
  const stateful = supportsServerState && state && agentConfig.store !== false ? state : null;
  const input = convertMessagesToResponsesInput(
    stateful ? selectResponsesContinuationMessages(msgs) : msgs
  );
  const body = {
    model: agentConfig.model,
    input,
    stream: true,
    ...getUsageRequestOptions(agentConfig.provider, { api: "responses" })
  };
  if (prependSystemPrompt) {
    const promptContent = buildSystemPrompt({
      agentConfig,
      language,
      contexts
    });
    body.instructions = promptContent;
  }
  if (agentConfig.temperature !== void 0) {
    body.temperature = agentConfig.temperature;
  }
  if (agentConfig.top_p !== void 0) {
    body.top_p = agentConfig.top_p;
  }
  if (agentConfig.max_tokens !== void 0) {
    body.max_output_tokens = agentConfig.max_tokens;
  }
  if (agentConfig.max_tool_calls !== void 0) {
    body.max_tool_calls = agentConfig.max_tool_calls;
  }
  if (agentConfig.user !== void 0) {
    body.user = agentConfig.user;
  }
  if (agentConfig.include !== void 0) {
    body.include = agentConfig.include;
  }
  if (agentConfig.metadata !== void 0) {
    body.metadata = agentConfig.metadata;
  }
  if (stateful) {
    body.previous_response_id = stateful.responseId;
    if (agentConfig.context_management === void 0) {
      body.context_management = [
        {
          type: "compaction",
          compact_threshold: resolveResponsesCompactionThreshold(agentConfig)
        }
      ];
    }
  } else if (supportsServerState && responsesState === void 0 && agentConfig.previous_response_id !== void 0) {
    body.previous_response_id = agentConfig.previous_response_id;
  }
  if (supportsServerState && agentConfig.store !== void 0) {
    body.store = agentConfig.store;
  }
  if (supportsServerState && agentConfig.context_management !== void 0) {
    body.context_management = agentConfig.context_management;
  }
  return body;
}

// packages/ai/llm/generateRequestBody.ts
var IMAGE_OUTPUT_EXECUTION_PROMPT = [
  "When the conversation already includes an input image and the user asks to change any visual attribute such as hairstyle, glasses, outfit, makeup, background, composition, or style, default to returning the edited image in this turn.",
  "When the user asks you to generate, edit, redraw, or return an image, you must return the image in this turn.",
  "Do not answer with only a textual description.",
  "Do not claim that you uploaded, attached, or sent an image unless the response actually includes image output.",
  "Only return text without an image when the user explicitly asks for analysis, recommendations, or explanation without generating an image."
].join(" ");
var getImageOutputSettings = (agentConfig, provider) => {
  const modelName = agentConfig.model;
  if (!modelName) {
    return { shouldEnableImage: false, modelConfig: null };
  }
  try {
    const modelConfig = getModelConfig(provider, modelName);
    const hasImageOutput = !!modelConfig.hasImageOutput;
    const isExplicitlyDisabled = agentConfig.imageConfig?.enabled === false;
    return {
      shouldEnableImage: hasImageOutput && !isExplicitlyDisabled,
      modelConfig
    };
  } catch {
    return { shouldEnableImage: false, modelConfig: null };
  }
};
var withImageOutputPromptGuard = (agentConfig, shouldEnableImage) => {
  if (!shouldEnableImage) return agentConfig;
  const basePrompt = asTrimmedString(agentConfig.prompt);
  if (basePrompt.includes(IMAGE_OUTPUT_EXECUTION_PROMPT)) {
    return agentConfig;
  }
  return {
    ...agentConfig,
    prompt: basePrompt ? `${basePrompt}

${IMAGE_OUTPUT_EXECUTION_PROMPT}` : IMAGE_OUTPUT_EXECUTION_PROMPT
  };
};
var applyImageConfigIfNeeded = (body, agentConfig, provider) => {
  const { shouldEnableImage, modelConfig } = getImageOutputSettings(
    agentConfig,
    provider
  );
  const agentImageCfg = agentConfig.imageConfig;
  if (!shouldEnableImage || !modelConfig) {
    return body;
  }
  const modalities = agentImageCfg?.forceModalities ?? modelConfig.defaultModalities ?? (modelConfig.requiresImageModalities ? ["image", "text"] : void 0);
  if (modalities && !body.modalities) {
    body.modalities = modalities;
  }
  if (!modelConfig.supportsImageConfig) {
    return body;
  }
  const aspectRatio = agentImageCfg?.aspectRatio;
  const imageSize = agentImageCfg?.imageSize;
  if (!aspectRatio && !imageSize) {
    return body;
  }
  body.image_config = {
    ...body.image_config ?? {},
    ...aspectRatio ? { aspect_ratio: aspectRatio } : {},
    ...imageSize ? { image_size: imageSize } : {}
  };
  return body;
};
var generateRequestBody = ({
  agentConfig,
  messages,
  contexts,
  stableMessages,
  prependSystemPrompt = true,
  responsesState
}) => {
  const provider = (agentConfig.provider || "").toLowerCase();
  const imageSettings = getImageOutputSettings(agentConfig, provider);
  const agentConfigForRequest = withImageOutputPromptGuard(
    agentConfig,
    imageSettings.shouldEnableImage
  );
  const clientWire = resolveClientWire(
    resolveAgentCallPlan(agentConfigForRequest, {})
  );
  if (clientWire === "responses") {
    return generateResponseRequestBody(
      agentConfigForRequest,
      [...stableMessages ?? [], ...messages],
      contexts,
      prependSystemPrompt,
      responsesState
    );
  }
  const baseBody = generateOpenAIRequestBody(
    agentConfigForRequest,
    provider,
    messages,
    contexts,
    stableMessages,
    prependSystemPrompt
  );
  return applyImageConfigIfNeeded(baseBody, agentConfigForRequest, provider);
};

// packages/ai/chat/serverProxyRetry.ts
var DEFAULT_SERVER_PROXY_RETRY_AFTER_MS = 1500;
var MAX_SERVER_PROXY_RETRIES = 2;
var MAX_STATUS_RETRIES = 3;
var MAX_SERVER_DRAIN_STATUS_RETRIES = 30;
var readRetryableResponseBody = async (response) => {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
};
var resolveServerProxyRetryAfterMs = (response, body) => parseRetryAfterHeaderMs(response.headers.get("Retry-After")) ?? normalizeNonNegativeMs(
  body?.retryAfterMs,
  DEFAULT_SERVER_PROXY_RETRY_AFTER_MS
);
var isRetryableServerProxyFetchError = (error) => {
  if (!error || isAbortError(error)) return false;
  const message = typeof error?.message === "string" ? error.message : String(error);
  return /ECONNREFUSED|ECONNRESET|EPIPE|socket hang up|network error|failed to fetch|fetch failed|connection closed|load failed|502|503|504/i.test(
    message
  );
};
var waitForServerProxyRetry = async (retryAfterMs, signal) => {
  const delayMs = normalizeNonNegativeMs(
    retryAfterMs,
    DEFAULT_SERVER_PROXY_RETRY_AFTER_MS
  );
  if (delayMs <= 0) return;
  await waitForAbortableDelay(delayMs, signal);
};
var performServerProxyFetchWithRetry = async ({
  execute,
  signal,
  logPrefix = "[fetchWithServerProxy]",
  onRetry
}) => {
  let networkRetries = 0;
  let statusRetries = 0;
  while (true) {
    try {
      const response = await execute();
      const responseBody = response.status === 503 ? await readRetryableResponseBody(response) : null;
      const isCoreDraining = response.status === 503 && isCoreDrainingBody(responseBody);
      const maxStatusRetries = isCoreDraining ? MAX_SERVER_DRAIN_STATUS_RETRIES : MAX_STATUS_RETRIES;
      if (statusRetries < maxStatusRetries && isGatewayHttpStatus(response.status)) {
        statusRetries += 1;
        const retryAfterMs = resolveServerProxyRetryAfterMs(
          response,
          responseBody
        );
        console.warn(
          `${logPrefix} \u68C0\u6D4B\u5230${response.status}\u72B6\u6001\uFF0C${retryAfterMs}ms\u540E\u91CD\u8BD5...`
        );
        onRetry?.({
          attempt: statusRetries,
          maxAttempts: maxStatusRetries,
          delayMs: retryAfterMs
        });
        await waitForServerProxyRetry(retryAfterMs, signal);
        continue;
      }
      if (isCoreDraining) {
        console.warn(`${logPrefix} core_draining \u91CD\u8BD5\u8017\u5C3D\uFF0C\u8FD4\u56DE\u53CB\u597D\u63D0\u793A`);
        return createDrainExhaustedResponse(response);
      }
      return response;
    } catch (error) {
      if (networkRetries < MAX_SERVER_PROXY_RETRIES && isRetryableServerProxyFetchError(error)) {
        networkRetries += 1;
        const retryDelay = networkRetries * 1e3;
        console.warn(
          `${logPrefix} \u68C0\u6D4B\u5230\u7F51\u7EDC\u77AC\u65AD\uFF0C${retryDelay}ms\u540E\u91CD\u8BD5(\u7B2C${networkRetries}\u6B21)...`,
          error
        );
        onRetry?.({
          attempt: networkRetries,
          maxAttempts: MAX_SERVER_PROXY_RETRIES,
          delayMs: retryDelay
        });
        await waitForServerProxyRetry(retryDelay, signal);
        continue;
      }
      throw error;
    }
  }
};

// packages/ai/chat/resolveDirectRequestApiKey.ts
var DIRECT_API_KEY_UNAVAILABLE_MESSAGE = "\u65E0\u6CD5\u52A0\u8F7D\u672C\u5730 API \u5BC6\u94A5\u3002\u8BF7\u5728 Agent \u8BBE\u7F6E\u4E2D\u91CD\u65B0\u586B\u5199\u5BC6\u94A5\uFF0C\u6216\u786E\u8BA4\u672C\u673A\u51ED\u636E\u53EF\u7528\u3002";
var DirectApiKeyResolutionError = class extends Error {
  constructor(message = DIRECT_API_KEY_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "DirectApiKeyResolutionError";
  }
};
var createDirectCredentialBroker = createFileCredentialBroker;
function readNonEmpty(value) {
  return asTrimmedString(value);
}
async function resolveDirectRequestApiKey(agentConfig, options) {
  const rawKey = readNonEmpty(agentConfig.apiKey);
  if (rawKey) return rawKey;
  const credentialRef = readNonEmpty(agentConfig.credentialRef);
  if (!credentialRef) return void 0;
  const factory = options?.brokerFactory ?? createDirectCredentialBroker;
  const broker = factory();
  const local = await safeBrokerGet(broker, credentialRef);
  if (local) return local;
  if (agentConfig.credentialSynced && options?.syncFetcher) {
    const synced = await options.syncFetcher(credentialRef);
    const trimmed = asTrimmedString(synced);
    if (trimmed) {
      try {
        await broker.put(credentialRef, trimmed);
      } catch {
      }
      return trimmed;
    }
  }
  throw new DirectApiKeyResolutionError();
}
async function safeBrokerGet(broker, ref) {
  try {
    return asTrimmedString(await broker.get(ref)) || null;
  } catch {
    return null;
  }
}

// packages/ai/chat/fetchUtils.ts
var buildProxyPayload = (bodyData, api, agentConfig, dialogId) => {
  const apiSource = agentConfig.apiSource === "custom" || agentConfig.apiSource === "cli" ? agentConfig.apiSource : void 0;
  const provider = bodyData.provider || agentConfig.provider || (apiSource === "custom" ? "custom" : void 0);
  const apiKey = asOptionalTrimmedString(agentConfig.apiKey);
  return {
    ...bodyData,
    url: api,
    provider,
    agentKey: agentConfig.dbKey,
    ...asOptionalTrimmedString(dialogId) ? { dialogId: asOptionalTrimmedString(dialogId) } : {},
    ...apiSource ? { apiSource } : {},
    ...agentConfig.apiKeyHeader ? { apiKeyHeader: agentConfig.apiKeyHeader } : {},
    KEY: apiKey
  };
};
var fetchDirectly = async (params) => {
  const { api, agentConfig, bodyData, signal, currentServer, token } = params;
  try {
    const apiKey = await resolveDirectRequestApiKey(agentConfig, {
      syncFetcher: currentServer && token ? (ref) => fetchServerSyncedCredential({ currentServer, authToken: token }, ref) : void 0
    });
    const authHeaders = buildProviderAuthHeaders({
      endpoint: api,
      apiKey: apiKey ?? "",
      apiKeyHeader: agentConfig.apiKeyHeader
    });
    return await fetch(api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...api.includes("openrouter.ai") ? {
          "HTTP-Referer": "https://nolo.chat",
          "X-Title": "nolo"
        } : {}
      },
      body: JSON.stringify(bodyData),
      signal
      // 可选参数，直接传递
    });
  } catch (error) {
    console.error("[fetchDirectly] \u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25:", error);
    throw error;
  }
};
var fetchWithServerProxy = async ({
  currentServer,
  api,
  bodyData,
  agentConfig,
  token,
  signal,
  dialogId,
  onRetry
}) => {
  try {
    const payload = buildProxyPayload(bodyData, api, agentConfig, dialogId);
    return await performServerProxyFetchWithRetry({
      signal,
      onRetry,
      execute: () => fetch(`${currentServer}${API_ENDPOINTS.CHAT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
          // 使用 Authorization 头传递 token
        },
        body: JSON.stringify(payload),
        signal
      })
    });
  } catch (error) {
    console.error("[fetchWithServerProxy] \u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25:", error);
    throw error;
  }
};
var formatFriendlyNetworkErrorMessage = (error) => {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.onLine === false) {
    return "\u7F51\u7EDC\u8FDE\u63A5\u5DF2\u65AD\u5F00\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\u540E\u91CD\u8BD5";
  }
  const rawMessage = toErrorMessage(error);
  if (/failed to fetch|networkerror|network error|econnrefused|econnreset|socket hang up/i.test(
    rawMessage
  )) {
    return "\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\u6216\u4EE3\u7406/VPN\u8BBE\u7F6E";
  }
  return rawMessage;
};
var performFetchRequest = async (params) => {
  try {
    const planConfig = {
      ...params.agentConfig,
      provider: params.bodyData.provider || params.agentConfig.provider
    };
    return resolveAgentCallPlan(planConfig, {}).transport === "server-proxy" ? await fetchWithServerProxy(params) : await fetchDirectly(params);
  } catch (error) {
    console.error("[performFetchRequest] \u8BF7\u6C42\u8FC7\u7A0B\u4E2D\u53D1\u751F\u9519\u8BEF:", error);
    const friendlyMsg = formatFriendlyNetworkErrorMessage(error);
    throw new Error(
      friendlyMsg.startsWith("\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25") ? friendlyMsg : `\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25: ${friendlyMsg}`
    );
  }
};

// packages/create/editor/transforms/slateToText.ts
function getNodeText(node) {
  if (node.text) {
    return node.text;
  }
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(getNodeText).join("\n");
  }
  return "";
}
function slateToText(nodes) {
  if (!nodes || nodes.length === 0) {
    return "";
  }
  return nodes.map(getNodeText).join("\n\n");
}

// packages/ai/context/buildReferenceContext.ts
var MAX_META_TEXT_LENGTH = 80;
var DIALOG_REFERENCE_MESSAGE_LIMIT = 20;
var DIALOG_REFERENCE_SNIPPET_CHARS = 1200;
var DIALOG_HANDOFF_SNIPPET_CHARS = 360;
var truncateMetaText = (value, max = MAX_META_TEXT_LENGTH) => {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
};
var readSafe = async (dispatch, dbKey) => {
  try {
    return await dispatch(read({
      dbKey
    })).unwrap();
  } catch {
    return null;
  }
};
var buildMentionMetaMap = async (slateData, dispatch) => {
  const metaMap = /* @__PURE__ */ new Map();
  const mentions = extractCategorizedMentions(slateData);
  if (!mentions) return metaMap;
  const pageEntries = await Promise.all(
    (mentions.pages || []).map(async (pageId) => {
      const pageData = await readSafe(dispatch, pageId);
      if (!pageData) {
        return [`page:${pageId}`, { displayType: "page", metaParts: [] }];
      }
      if (pageData.type === "dialog" /* DIALOG */) {
        const agentCount = Array.isArray(pageData.cybots) ? pageData.cybots.length : 0;
        return [
          `page:${pageId}`,
          {
            displayType: "dialog",
            title: pageData.title,
            metaParts: [
              `agents=${agentCount}`,
              `updated=${pageData.updatedAt || pageData.updated_at || pageData.updated || "Unknown"}`
            ]
          }
        ];
      }
      const tags = pageData.tags && pageData.tags.length > 0 ? pageData.tags.slice(0, 5).join(", ") : "";
      return [
        `page:${pageId}`,
        {
          displayType: "page",
          title: pageData.title,
          metaParts: [
            pageData.spaceId ? `space=${pageData.spaceId}` : "",
            tags ? `tags=${tags}` : "",
            `updated=${pageData.updatedAt || pageData.updated_at || pageData.updated || "Unknown"}`
          ].filter(Boolean)
        }
      ];
    })
  );
  pageEntries.forEach((entry) => metaMap.set(entry[0], entry[1]));
  const agentEntries = await Promise.all(
    (mentions.agents || []).map(async (agentId) => {
      const agentData = await readSafe(dispatch, agentId);
      if (!agentData) {
        return [`agent:${agentId}`, { displayType: "agent", metaParts: [] }];
      }
      const desc = truncateMetaText(
        agentData.description || agentData.introduction || ""
      );
      return [
        `agent:${agentId}`,
        {
          displayType: "agent",
          title: agentData.name,
          metaParts: [
            `public=${agentData.isPublic ? "yes" : "no"}`,
            desc ? `desc=${desc}` : ""
          ].filter(Boolean)
        }
      ];
    })
  );
  agentEntries.forEach((entry) => metaMap.set(entry[0], entry[1]));
  const spaceEntries = await Promise.all(
    (mentions.spaces || []).map(async (spaceId) => {
      const spaceKey = createSpaceKey.space(spaceId);
      const spaceData = await readSafe(dispatch, spaceKey);
      if (!spaceData) {
        return [`space:${spaceId}`, { displayType: "space", metaParts: [] }];
      }
      const desc = truncateMetaText(spaceData.description || "");
      const categoriesCount = Object.keys(spaceData.categories || {}).length;
      const contentsCount = Object.keys(spaceData.contents || {}).length;
      return [
        `space:${spaceId}`,
        {
          displayType: "space",
          title: spaceData.name,
          metaParts: [
            desc ? `desc=${desc}` : "",
            `categories=${categoriesCount}`,
            `contents=${contentsCount}`
          ].filter(Boolean)
        }
      ];
    })
  );
  spaceEntries.forEach((entry) => metaMap.set(entry[0], entry[1]));
  return metaMap;
};
var buildInlineMention = (node, metaMap) => {
  const resourceType = node.resourceType || "unknown";
  const resourceId = node.resourceId || "unknown";
  const key = `${resourceType}:${resourceId}`;
  const meta = metaMap.get(key);
  const label = meta?.title || node.label || resourceId || "mention";
  const displayType = meta?.displayType || resourceType;
  const metaParts = meta?.metaParts ?? [];
  const idPart = resourceType === "tool" ? `tool=${resourceId}` : `dbkey=${resourceId}`;
  const metaSuffix = metaParts.length ? ` | ${metaParts.join(" | ")}` : "";
  return `@${label}(${displayType} | ${idPart}${metaSuffix})`;
};
var clipReferenceText = (value, max) => {
  const raw = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  return clipMultilineText(raw, max);
};
var fetchDialogReference = async (dbKey, refContent, dispatch) => {
  const dialogConfig = refContent;
  const dialogTitle = dialogConfig.title || `Untitled Dialog (${dbKey})`;
  const dialogId = extractCustomId(dbKey) || dbKey.replace(/^dialog-/, "");
  const checkpoint = dialogConfig.runtimeCheckpoint || null;
  const summary = asTrimmedString(dialogConfig.summary);
  const messages = await dispatch(
    async (_dispatch, getState, { db }) => {
      const state = getState();
      const { currentToken: token, remoteServers } = getRuntimeServerContext(state);
      return await fetchAndCacheMessages({
        db,
        dialogId,
        limit: DIALOG_REFERENCE_MESSAGE_LIMIT,
        token,
        remoteServers: remoteServers.length > 0 ? remoteServers : void 0
      });
    }
  );
  const sortedMessages = [...messages].reverse();
  const formatContent = (content) => clipReferenceText(content, DIALOG_REFERENCE_SNIPPET_CHARS);
  const transcript = sortedMessages.map((msg, index) => {
    const toolLine = msg.toolName ? ` tool=${msg.toolName}` : "";
    const agentLine = msg.cybotKey ? ` agent=${msg.cybotKey}` : "";
    const createdLine = msg.createdAt ? ` at=${msg.createdAt}` : "";
    return [
      `### Message ${index + 1}: ${msg.role || "unknown"} id=${msg.id || "unknown"}${toolLine}${agentLine}${createdLine}`,
      formatContent(msg.content) || "[empty]"
    ].join("\n");
  }).join("\n\n");
  const checkpointLines = [];
  if (checkpoint && typeof checkpoint === "object") {
    if (checkpoint.status) checkpointLines.push(`- status: ${checkpoint.status}`);
    if (checkpoint.lastUserInput) checkpointLines.push(`- lastUserInput: ${formatContent(checkpoint.lastUserInput)}`);
    if (checkpoint.lastAssistantText) checkpointLines.push(`- lastAssistantText: ${formatContent(checkpoint.lastAssistantText)}`);
    if (Array.isArray(checkpoint.lastToolNames) && checkpoint.lastToolNames.length) {
      checkpointLines.push(`- lastToolNames: ${checkpoint.lastToolNames.join(", ")}`);
    }
    if (Array.isArray(checkpoint.availableToolNames) && checkpoint.availableToolNames.length) {
      checkpointLines.push(`- availableToolNames: ${checkpoint.availableToolNames.join(", ")}`);
    }
  }
  const recentToolEvidence = sortedMessages.filter((msg) => msg.role === "tool" || msg.toolName).slice(-3).map((msg) => {
    const label = msg.toolName ? `${msg.toolName}` : "tool";
    return `- ${label} id=${msg.id || "unknown"}: ${clipReferenceText(msg.content, DIALOG_HANDOFF_SNIPPET_CHARS) || "[empty]"}`;
  });
  const handoffLines = [
    `- Use this when continuing work, transferring to another Agent, comparing with the current task, or preparing a document/plan from the prior discussion.`,
    `- Current state source: ${checkpointLines.length ? "Runtime Checkpoint" : "summaries and recent transcript"}.`,
    summary ? `- Compressed background: passive summary is available below; treat it as lossy, not original wording.` : "",
    recentToolEvidence.length ? `- Recent tool evidence:
${recentToolEvidence.join("\n")}` : `- Recent tool evidence: none loaded in the latest ${DIALOG_REFERENCE_MESSAGE_LIMIT} messages.`,
    `- For exact claims, old decisions, original wording, files/tools mentioned earlier, or anything not visible in the recent transcript, call searchDialogMessages with DB Key ${dbKey}.`
  ].filter(Boolean);
  const referenceBody = [
    `Conversation Reference:`,
    `DB Key: ${dbKey}`,
    `Title: ${dialogTitle}`,
    `Status: ${dialogConfig.status || "unknown"}`,
    `Loaded Recent Messages: ${sortedMessages.length}`,
    `Conversation Handoff:
${handoffLines.join("\n")}`,
    checkpointLines.length ? `Runtime Checkpoint:
${checkpointLines.join("\n")}` : "",
    summary ? `Passive Summary (compressed history, not original wording):
${wrapHistoricalSummaryWithReplayGuard(summary)}` : "",
    `Recent Transcript (original message excerpts, oldest to newest):
${transcript || "[no recent messages loaded]"}`,
    [
      `Coverage Note: This reference intentionally loads only the latest ${DIALOG_REFERENCE_MESSAGE_LIMIT} messages plus summaries/checkpoint to control token load.`,
      `Original Message Lookup Policy: If the user asks for an exact old message, original wording, who said what, why a decision was made, early-history detail, file/tool evidence, failed attempts, or a comparison with prior work, use searchDialogMessages({ dialogKey: "${dbKey}", query: "..." }) before making a factual claim from this referenced conversation.`
    ].join("\n")
  ].filter(Boolean).join("\n\n");
  const tokenEstimate = estimateTokenCount(referenceBody);
  return `${referenceBody}

Token Load Estimate: ${tokenEstimate} tokens for this conversation reference.
---

`;
};
var fetchTableReference = async (dbKey, refContent, dispatch) => {
  const tableMeta = refContent;
  const title = tableMeta.displayName || tableMeta.description || `Untitled Table (${dbKey})`;
  const { markdown: tableMd } = await dispatch(
    async (_dispatch, getState, { db }) => {
      const state = getState();
      const { currentToken: token, remoteServers } = getRuntimeServerContext(state);
      return await fetchAndSerializeTable(tableMeta, db, {
        token,
        remoteServers
      });
    }
  );
  const tags = tableMeta.tags?.length ? tableMeta.tags.join(", ") : "None";
  const description = tableMeta.description || "No description provided.";
  return `Reference Item (Table):
DB Key: ${dbKey}
Title: ${title}
Description: ${description}
Tags: ${tags}
Content (Markdown Table):

${tableMd}
---

`;
};
var fetchSlateReference = async (dbKey, refContent, dispatch, options) => {
  if (!refContent?.slateData) return null;
  const title = refContent.title || `Untitled (${dbKey})`;
  let contentString;
  let contentType;
  const inlineMentionMeta = options.inlineMentionMeta ?? options.format === "simplified_markdown";
  switch (options.format) {
    case "text":
      contentType = "Plain Text";
      contentString = slateToText(refContent.slateData);
      break;
    case "simplified_markdown":
      contentType = "Simplified Markdown";
      if (inlineMentionMeta) {
        const metaMap = await buildMentionMetaMap(refContent.slateData, dispatch);
        contentString = slateToSimplifiedMarkdown(refContent.slateData, {
          mentionResolver: (node) => buildInlineMention(node, metaMap)
        });
      } else {
        contentString = slateToSimplifiedMarkdown(refContent.slateData);
      }
      break;
    case "json":
    default:
      contentType = "Slate JSON";
      contentString = JSON.stringify(refContent.slateData, null, 2);
      break;
  }
  if (!contentString || typeof contentString === "string" && !contentString.trim() || contentString === "[]") {
    return null;
  }
  const tags = (refContent.tags || []).length > 0 ? refContent.tags.join(", ") : "None";
  const createdAt = refContent.created || "Unknown Creation Date";
  const updatedAt = refContent.updated || "Unknown Update Date";
  return `Reference Item:
DB Key: ${dbKey}
Title: ${title}
Content (${contentType}):
${contentString}
Tags: ${tags}
Created At: ${createdAt}
Updated At: ${updatedAt}
---

`;
};
var fetchReferenceContents = async (references, dispatch, options = { format: "simplified_markdown" }) => {
  const result = /* @__PURE__ */ new Map();
  if (!references || references.length === 0) return result;
  const referencePromises = references.map(async (dbKey) => {
    try {
      const hasPreloaded = options.preloaded?.has(dbKey);
      const refContent = hasPreloaded ? options.preloaded?.get(dbKey) : await dispatch(read({
        dbKey
      })).unwrap();
      if (!refContent) return null;
      let formatted = null;
      if (refContent.type === "dialog" /* DIALOG */) {
        formatted = await fetchDialogReference(dbKey, refContent, dispatch);
      } else if (refContent.type === "table" /* TABLE */) {
        formatted = await fetchTableReference(dbKey, refContent, dispatch);
      } else {
        formatted = await fetchSlateReference(dbKey, refContent, dispatch, options);
      }
      if (formatted) return [dbKey, formatted];
      return null;
    } catch (error) {
      console.error(`Error fetching reference ${dbKey}:`, error);
      return null;
    }
  });
  const resolved = await Promise.all(referencePromises);
  resolved.forEach((item) => {
    if (item) result.set(item[0], item[1]);
  });
  return result;
};

export {
  fetchReferenceContents,
  toResponsesTools,
  extractTextFromResponseOutput,
  extractImagePartsFromResponseOutput,
  selectResponsesConversationState,
  updateResponsesConversationState,
  isResponsesConversationStateRejection,
  resolveClientWire,
  resolveAgentCallPlan,
  generateRequestBody,
  performServerProxyFetchWithRetry,
  performFetchRequest
};
