import {
  markRecentlyCreated
} from "/public/assets/chunks/chunk-HOEAUVHJ.js";
import {
  ANTIGRAVITY_CLOUD_CODE_BASE_URL
} from "/public/assets/chunks/chunk-CD3MPOQP.js";
import {
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  createDialog
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  buildDialogUrl
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  kimiCodeModels,
  moonshotModels,
  qwenModels,
  qwenTokenPlanModels
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/dialog/useCreateDialog.ts
var import_react = __toESM(require_react());
var useCreateDialog = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = (0, import_react.useState)(false);
  const [isSuccess, setIsSuccess] = (0, import_react.useState)(false);
  const createNewDialog = async ({
    agents = [],
    agentMode,
    spaceId,
    preferredServerOrigin,
    category
  }) => {
    setIsLoading(true);
    setIsSuccess(false);
    const resolvedAgentMode = agentMode ?? (agents.length > 0 ? "fixed" : "auto");
    try {
      const result = await dispatch(
        createDialog({
          agentMode: resolvedAgentMode,
          cybots: resolvedAgentMode === "auto" ? [] : agents,
          spaceId,
          preferredServerOrigin,
          category
        })
      ).unwrap();
      if (result?.dbKey) {
        markRecentlyCreated(result.dbKey);
      }
      navigate(buildDialogUrl(result.dbKey, result.spaceId), {
        state: { isNew: true }
      });
      setIsSuccess(true);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  return { createNewDialog, isLoading, isSuccess };
};

// packages/integrations/opencode/models.ts
var opencodeGoModels = [
  // ── OpenAI ──
  {
    name: "gpt-5.6-luna",
    displayName: "GPT-5.6 Luna (Fast)",
    hasVision: true,
    contextWindow: 272e3,
    maxOutputTokens: 128e3,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "opencode-go",
    description: "OpenAI GPT-5.6 Luna \u5FEB\u901F\u6A21\u578B\uFF0COpenCode Go \u8BA2\u9605\u542B\u3002"
  },
  // gpt-5.6-sol 不在 Go 订阅内：GET /models 不返回它，直接调用返回
  // 401 "Model gpt-5.6-sol is not supported"（实测 2026-08-03）。
  // ── Grok ──
  {
    name: "grok-4.5",
    displayName: "Grok 4.5",
    hasVision: true,
    contextWindow: 5e5,
    maxOutputTokens: 262144,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "opencode-go",
    description: "xAI Grok 4.5\uFF0COpenCode Go \u8BA2\u9605\u542B\u3002"
  },
  // ── Kimi ──
  {
    name: "kimi-k3",
    displayName: "Kimi K3",
    hasVision: true,
    contextWindow: 1e6,
    maxOutputTokens: 262144,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "opencode-go",
    description: "Kimi K3 \u65D7\u8230\uFF0COpenCode Go \u8BA2\u9605\u542B\u3002"
  },
  // ── Qwen ──
  {
    name: "qwen3.8-max",
    displayName: "Qwen3.8 Max",
    hasVision: true,
    contextWindow: 262144,
    maxOutputTokens: 32768,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "opencode-go",
    description: "\u5343\u95EE 3.8 Max \u65D7\u8230\uFF0COpenCode Go \u8BA2\u9605\u542B\u3002"
  },
  {
    name: "qwen3.7-max",
    displayName: "Qwen3.7 Max",
    hasVision: false,
    contextWindow: 262144,
    maxOutputTokens: 32768,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "opencode-go",
    description: "\u5343\u95EE 3.7 Max\uFF0COpenCode Go \u8BA2\u9605\u542B\u3002"
  },
  // ── GLM ──
  {
    name: "glm-5.2",
    displayName: "GLM 5.2",
    hasVision: false,
    contextWindow: 1e6,
    maxOutputTokens: 16384,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "opencode-go",
    description: "\u667A\u8C31 GLM 5.2\uFF0COpenCode Go \u8BA2\u9605\u542B\u3002"
  },
  // ── MiMo ──
  {
    name: "mimo-v2.5-pro",
    displayName: "MiMo V2.5 Pro",
    hasVision: false,
    contextWindow: 131072,
    maxOutputTokens: 16384,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "opencode-go",
    description: "\u5C0F\u7C73 MiMo V2.5 Pro\uFF0COpenCode Go \u8BA2\u9605\u542B\u3002"
  },
  // ── MiniMax ──
  {
    name: "minimax-m3",
    displayName: "MiniMax M3",
    hasVision: true,
    contextWindow: 1e6,
    maxOutputTokens: 262144,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "opencode-go",
    description: "MiniMax M3\uFF0COpenCode Go \u8BA2\u9605\u542B\u3002"
  },
  // ── DeepSeek ──
  {
    name: "deepseek-v4-pro",
    displayName: "DeepSeek V4 Pro",
    hasVision: false,
    contextWindow: 1e6,
    maxOutputTokens: 384e3,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "opencode-go",
    description: "DeepSeek V4 Pro\uFF0COpenCode Go \u8BA2\u9605\u542B\u3002"
  },
  {
    name: "deepseek-v4-flash",
    displayName: "DeepSeek V4 Flash",
    hasVision: false,
    contextWindow: 1e6,
    maxOutputTokens: 384e3,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "opencode-go",
    description: "DeepSeek V4 Flash\uFF0COpenCode Go \u8BA2\u9605\u542B\u3002"
  }
];

// packages/ai/agent/providerRegistry.ts
var QWEN_MODEL_OPTIONS = qwenModels.map((m, i) => ({
  id: m.name,
  label: m.displayName ?? m.name,
  hasVision: m.hasVision,
  ...i === 0 ? { recommended: true } : {}
}));
var QWEN_TOKEN_PLAN_MODEL_OPTIONS = qwenTokenPlanModels.map((m, i) => ({
  id: m.name,
  label: m.displayName ?? m.name,
  hasVision: m.hasVision,
  ...i === 0 ? { recommended: true } : {}
}));
var MOONSHOT_MODEL_OPTIONS = moonshotModels.map((m, i) => ({
  id: m.name,
  label: m.displayName ?? m.name,
  hasVision: m.hasVision,
  ...i === 0 ? { recommended: true } : {}
}));
var KIMI_CODE_MODEL_OPTIONS = kimiCodeModels.map((m, i) => ({
  id: m.name,
  label: m.displayName ?? m.name,
  hasVision: m.hasVision,
  ...i === 0 ? { recommended: true } : {}
}));
var OPENCODE_GO_MODEL_OPTIONS = opencodeGoModels.map((m, i) => ({
  id: m.name,
  label: m.displayName ?? m.name,
  hasVision: m.hasVision,
  ...i === 0 ? { recommended: true } : {}
}));
var SUBSCRIPTION_OAUTH_PROVIDERS = [
  {
    kind: "oauth",
    id: "chatgpt",
    label: "ChatGPT Plus/Pro",
    description: "Codex Subscription",
    apiKeyRef: "chatgpt",
    provider: "openai",
    defaultModel: "gpt-5.6-sol",
    defaultReasoningEffort: "medium",
    modelOptions: [
      { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", hasVision: true, recommended: true },
      { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", hasVision: true },
      { id: "gpt-5.6-luna", label: "GPT-5.6 Luna", hasVision: true }
    ]
  },
  {
    kind: "oauth",
    id: "xai-oauth",
    label: "xAI Grok OAuth",
    description: "SuperGrok Subscription",
    apiKeyRef: "xai",
    provider: "xai",
    defaultModel: "grok-4.5",
    defaultReasoningEffort: "high",
    modelOptions: [
      { id: "grok-4.5", label: "Grok 4.5", hasVision: true, recommended: true }
    ]
  },
  {
    kind: "oauth",
    id: "antigravity",
    label: "Antigravity",
    description: "Gemini 3, Claude, GPT-OSS",
    apiKeyRef: "antigravity",
    provider: "google-antigravity",
    defaultModel: "gemini-3.6-flash",
    defaultReasoningEffort: "medium",
    modelOptions: [
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", hasVision: true, recommended: true },
      { id: "claude-sonnet-5", label: "Claude Sonnet 5", hasVision: true },
      { id: "claude-opus-4-6-thinking", label: "Claude Opus 4.6 Thinking", hasVision: true }
    ],
    cloudCodeBaseUrl: ANTIGRAVITY_CLOUD_CODE_BASE_URL
  },
  {
    kind: "oauth",
    id: "claude-oauth",
    label: "Claude Pro/Max",
    description: "Anthropic Subscription",
    apiKeyRef: "claude",
    provider: "anthropic",
    defaultModel: "claude-sonnet-5",
    defaultReasoningEffort: "high",
    modelOptions: [
      { id: "claude-sonnet-5", label: "Claude Sonnet 5", hasVision: true },
      { id: "claude-opus-5", label: "Claude Opus 5", hasVision: true, recommended: true },
      { id: "claude-opus-4-8", label: "Claude Opus 4.8", hasVision: true },
      { id: "claude-fable-5", label: "Claude Fable 5", hasVision: true }
    ]
  },
  {
    kind: "oauth",
    id: "cursor-oauth",
    label: "Cursor Pro",
    description: "Cursor Subscription",
    apiKeyRef: "cursor",
    provider: "cursor",
    // Wire ids must match GetUsableModels. First-party Grok/Composer draw from
    // the Cursor Models pool; everything else draws from Other Models.
    defaultModel: "cursor-grok-4.5-high",
    // Cursor 的 model id 已带 effort 后缀（-high/-medium/-fast），推理强度隐含在模型选择里；
    // 这里给 medium 作为面板默认，避免与模型 id 里的后缀语义冲突。
    defaultReasoningEffort: "medium",
    modelOptions: [
      { id: "cursor-grok-4.5-high", label: "Grok 4.5", hasVision: true, recommended: true },
      { id: "cursor-grok-4.5-high-fast", label: "Grok 4.5 Fast", hasVision: true },
      { id: "composer-2.5-fast", label: "Composer 2.5 Fast", hasVision: false },
      { id: "composer-2.5", label: "Composer 2.5", hasVision: false },
      { id: "gpt-5.3-codex", label: "GPT-5.3 Codex", hasVision: true },
      { id: "gpt-5.3-codex-high", label: "GPT-5.3 Codex High", hasVision: true },
      { id: "gpt-5.4-medium", label: "GPT-5.4 Medium", hasVision: true },
      { id: "claude-4.6-sonnet-medium", label: "Claude 4.6 Sonnet", hasVision: true },
      { id: "claude-4.6-opus-high", label: "Claude 4.6 Opus", hasVision: true },
      { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro", hasVision: true }
    ]
  }
];
var CUSTOM_API_KEY_TEMPLATES = [
  {
    kind: "api_key_template",
    id: "token-plan",
    label: "MiMo Token Plan",
    description: "\u5C0F\u7C73 MiMo \u8BA2\u9605\uFF08API Key + Base URL\uFF09",
    provider: "mimo",
    baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
    defaultModel: "mimo-v2.5-pro",
    commercialKind: "subscription",
    accessVariant: "token_plan_endpoint"
  },
  {
    kind: "api_key_template",
    id: "qwen-token-plan",
    label: "\u5343\u95EE Token Plan",
    description: "\u5343\u95EE Token Plan \u8BA2\u9605\uFF08Key \u987B\u4E3A Token Plan \u4E13\u5C5E\uFF0C\u975E\u6309\u91CF API Key\uFF09",
    provider: "qwen",
    baseUrl: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen3.8-max",
    modelOptions: QWEN_TOKEN_PLAN_MODEL_OPTIONS,
    commercialKind: "subscription",
    accessVariant: "token_plan_endpoint"
  },
  {
    kind: "api_key_template",
    id: "opencode-go",
    label: "OpenCode Go",
    description: "OpenCode Go \u8BA2\u9605\uFF08$5 \u9996\u6708 / $10 \u6708\uFF0C\u805A\u5408 Grok/Kimi/Qwen/GLM/MiMo/MiniMax/DeepSeek\uFF09",
    provider: "opencode-go",
    baseUrl: "https://opencode.ai/zen/go/v1",
    defaultModel: "qwen3.8-max",
    modelOptions: OPENCODE_GO_MODEL_OPTIONS,
    commercialKind: "subscription",
    accessVariant: "token_plan_endpoint"
  },
  {
    kind: "api_key_template",
    id: "kimi-code-key",
    label: "Kimi Code",
    description: "Kimi \u4F1A\u5458\u8BA2\u9605\uFF08Kimi Code \u63A7\u5236\u53F0 API Key\uFF0C\u6700\u591A 5 \u4E2A\uFF09",
    provider: "kimi-code",
    baseUrl: "https://api.kimi.com/coding/v1",
    defaultModel: "kimi-for-coding",
    modelOptions: KIMI_CODE_MODEL_OPTIONS,
    commercialKind: "subscription",
    accessVariant: "token_plan_endpoint"
  },
  {
    kind: "api_key_template",
    id: "openai-api",
    label: "OpenAI API",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.6-sol",
    commercialKind: "api",
    accessVariant: "metered_key"
  },
  {
    kind: "api_key_template",
    id: "anthropic-api",
    label: "Anthropic API",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-sonnet-5",
    apiKeyHeader: "x-api-key",
    commercialKind: "api",
    accessVariant: "metered_key"
  },
  {
    kind: "api_key_template",
    id: "gemini-api",
    label: "Gemini API",
    provider: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-3.6-flash",
    apiKeyHeader: "x-goog-api-key",
    commercialKind: "api",
    accessVariant: "metered_key"
  },
  {
    kind: "api_key_template",
    id: "xai-api",
    label: "xAI API",
    provider: "xai",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4.5",
    commercialKind: "api",
    accessVariant: "metered_key"
  },
  // DeepSeek official API provider removed — all DeepSeek models now route
  // through the nolo provider (Ollama Cloud). The "deepseek-api" template
  // was retired on 2026-08-08 after benchmarks showed Ollama Cloud is
  // 28-49% faster with thinking=max enabled.
  {
    kind: "api_key_template",
    id: "qwen-api",
    label: "\u5343\u95EE API \u7528\u91CF\u8BA1\u8D39",
    description: "Qwen / DashScope\uFF08OpenAI \u517C\u5BB9\uFF0C\u6309\u91CF\u8BA1\u8D39\uFF09",
    provider: "qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen3-max",
    modelOptions: QWEN_MODEL_OPTIONS,
    commercialKind: "api",
    accessVariant: "metered_key"
  },
  {
    kind: "api_key_template",
    id: "kimi-api",
    label: "Kimi API \u7528\u91CF\u8BA1\u8D39",
    description: "Moonshot \u5F00\u653E\u5E73\u53F0\uFF08Key \u987B\u4E3A\u5F00\u653E\u5E73\u53F0\u751F\u6210\uFF0C\u975E Kimi Code \u63A7\u5236\u53F0 key\uFF09",
    provider: "moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "kimi-k3",
    modelOptions: MOONSHOT_MODEL_OPTIONS,
    commercialKind: "api",
    accessVariant: "metered_key"
  },
  {
    kind: "api_key_template",
    id: "minimax-api",
    label: "MiniMax API",
    provider: "minimax",
    baseUrl: "https://api.minimaxi.com/v1",
    defaultModel: "MiniMax-Text-01",
    commercialKind: "api",
    accessVariant: "metered_key"
  }
];
var ALL_PROVIDER_REGISTRY = [
  ...SUBSCRIPTION_OAUTH_PROVIDERS,
  ...CUSTOM_API_KEY_TEMPLATES
];
function findProviderById(id) {
  return ALL_PROVIDER_REGISTRY.find((p) => p.id === id);
}

export {
  useCreateDialog,
  SUBSCRIPTION_OAUTH_PROVIDERS,
  CUSTOM_API_KEY_TEMPLATES,
  findProviderById
};
