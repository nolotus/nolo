import {
  getModelConfig
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";

// packages/agent-runtime/platformProviderEndpoints.ts
var OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
var PLATFORM_CHAT_COMPLETIONS_ENDPOINTS = {
  deepinfra: "https://api.deepinfra.com/v1/openai/chat/completions",
  // DeepSeek official API endpoint removed — all DeepSeek models now route
  // through the nolo provider (Ollama Cloud). See providerRegistry.ts.
  // deepseek: "https://api.deepseek.com/chat/completions",
  fireworks: "https://api.fireworks.ai/inference/v1/chat/completions",
  google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  // 千问 AI 平台 OpenAI 兼容模式
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  // Moonshot AI（月之暗面）开放平台 OpenAI 兼容模式（按量计费）
  moonshot: "https://api.moonshot.cn/v1/chat/completions",
  // Open-source default: nolo provider 中转 ollama cloud。
  // 内部多后端组合路由不开源，由内部 provider 路由层接管。
  nolo: "https://ollama.com/v1/chat/completions"
};
function isOpenAiResponsesModel(args) {
  const provider = asTrimmedLowercaseString(args.provider);
  if (provider !== "openai") return false;
  if (args.endpointKey === "responses") return true;
  if (!args.model) return false;
  try {
    return getModelConfig("openai", args.model).endpointKey === "responses";
  } catch {
    return false;
  }
}
function resolvePlatformResponsesEndpoint(provider) {
  return asTrimmedLowercaseString(provider) === "openai" ? OPENAI_RESPONSES_ENDPOINT : void 0;
}
var PLATFORM_PROVIDER_ENDPOINT_ALIASES = {
  "ollama-cloud": "nolo",
  deepseek: "nolo"
};
function resolvePlatformChatCompletionsEndpoint(provider) {
  const key = asTrimmedLowercaseString(provider);
  if (!key) return void 0;
  const aliased = PLATFORM_PROVIDER_ENDPOINT_ALIASES[key] ?? key;
  return PLATFORM_CHAT_COMPLETIONS_ENDPOINTS[aliased];
}

// packages/agent-runtime/providerResolution.ts
function resolveProviderAuthHeaderName(args) {
  const explicitHeader = args.apiKeyHeader?.trim();
  if (explicitHeader) return explicitHeader;
  if (/xiaomimimo\.com/i.test(args.endpoint)) return "api-key";
  return "Authorization";
}
function buildProviderAuthHeaders(args) {
  if (!args.apiKey) return {};
  const headerName = resolveProviderAuthHeaderName(args);
  return headerName.toLowerCase() === "authorization" ? { Authorization: `Bearer ${args.apiKey}` } : { [headerName]: args.apiKey };
}

// packages/agent-runtime/antigravityOAuth.ts
var ANTIGRAVITY_CLOUD_CODE_BASE_URL = "https://daily-cloudcode-pa.googleapis.com";
var ANTIGRAVITY_CLOUD_CODE_HOST = "cloudcode-pa.googleapis.com";
function isAntigravityOAuthAgent(agentConfig) {
  if (!agentConfig) return false;
  const apiKeyRef = asTrimmedLowercaseString(agentConfig.apiKeyRef);
  const provider = asTrimmedLowercaseString(agentConfig.provider);
  const url = asTrimmedLowercaseString(agentConfig.customProviderUrl);
  return apiKeyRef === "antigravity" || provider === "google-antigravity" || url.includes(ANTIGRAVITY_CLOUD_CODE_HOST);
}

export {
  isOpenAiResponsesModel,
  resolvePlatformResponsesEndpoint,
  resolvePlatformChatCompletionsEndpoint,
  buildProviderAuthHeaders,
  ANTIGRAVITY_CLOUD_CODE_BASE_URL,
  isAntigravityOAuthAgent
};
