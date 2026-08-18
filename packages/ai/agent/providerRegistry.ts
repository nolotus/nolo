// 路径: ai/agent/providerRegistry.ts
import { ANTIGRAVITY_CLOUD_CODE_BASE_URL } from "../../agent-runtime/antigravityOAuth";
import { qwenModels, qwenTokenPlanModels } from "../../integrations/qwen/models";
import { moonshotModels, kimiCodeModels } from "../../integrations/moonshot/models";
import { opencodeGoModels } from "../../integrations/opencode/models";
import type { ReasoningEffort } from "./createAgentSchema";
// 统一维护 agent 创建时可选择的 provider：
// - subscription OAuth 提供商（如 ChatGPT Plus/Pro、SuperGrok、Antigravity）
// - 自定义 API-key 模板（如 OpenCode Go、OpenAI API、Anthropic、Gemini API 等）

/**
 * 千问 AI 平台（DashScope）OpenAI 兼容模式下的可选模型，
 * 由 integrations/qwen/models 的清单派生，避免两处重复维护。
 * 第一项标记为推荐默认。
 */
const QWEN_MODEL_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
  recommended?: boolean;
  hasVision?: boolean;
}> = qwenModels.map((m, i) => ({
  id: m.name,
  label: (m as { displayName?: string }).displayName ?? m.name,
  hasVision: m.hasVision,
  ...(i === 0 ? { recommended: true } : {}),
}));

/**
 * 千问 Token Plan 订阅支持的可选模型，由 qwenTokenPlanModels 派生。
 * 与 QWEN_MODEL_OPTIONS（DashScope API 按量计费）区分——两者模型范围不同。
 */
const QWEN_TOKEN_PLAN_MODEL_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
  recommended?: boolean;
  hasVision?: boolean;
}> = qwenTokenPlanModels.map((m, i) => ({
  id: m.name,
  label: (m as { displayName?: string }).displayName ?? m.name,
  hasVision: m.hasVision,
  ...(i === 0 ? { recommended: true } : {}),
}));

/**
 * Moonshot AI 开放平台（按量计费）可选模型，由 integrations/moonshot/models 派生。
 * 第一项标记为推荐默认。
 */
const MOONSHOT_MODEL_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
  recommended?: boolean;
  hasVision?: boolean;
}> = moonshotModels.map((m, i) => ({
  id: m.name,
  label: m.displayName ?? m.name,
  hasVision: m.hasVision,
  ...(i === 0 ? { recommended: true } : {}),
}));

/**
 * Kimi Code 会员订阅可选模型，由 kimiCodeModels 派生。
 * 与 MOONSHOT_MODEL_OPTIONS（开放平台按量计费）区分——两者 Base URL、模型 ID、
 * 计费模式都不同：订阅走 api.kimi.com/coding/v1，模型 ID 为 k3 /
 * kimi-for-coding / kimi-for-coding-highspeed，不是 kimi-k3。
 */
const KIMI_CODE_MODEL_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
  recommended?: boolean;
  hasVision?: boolean;
}> = kimiCodeModels.map((m, i) => ({
  id: m.name,
  label: m.displayName ?? m.name,
  hasVision: m.hasVision,
  ...(i === 0 ? { recommended: true } : {}),
}));

/**
 * OpenCode Go 订阅可选模型，由 opencodeGoModels 派生。
 */
const OPENCODE_GO_MODEL_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
  recommended?: boolean;
  hasVision?: boolean;
}> = opencodeGoModels.map((m, i) => ({
  id: m.name,
  label: m.displayName ?? m.name,
  hasVision: m.hasVision,
  ...(i === 0 ? { recommended: true } : {}),
}));

export type OAuthProviderConfig = {
  kind: "oauth";
  id: string;
  label: string;
  description?: string;
  /** 登录后 apiKeyRef 写入的值，通常等于 id */
  apiKeyRef: string;
  /** OAuth 完成后使用的 provider 字段值 */
  provider: string;
  defaultModel?: string;
  /** Curated models shown by create/edit UI. First item is the recommended default. */
  modelOptions: ReadonlyArray<{
    id: string;
    label: string;
    recommended?: boolean;
    hasVision?: boolean;
  }>;
  /** Cloud Code Assist base URL for direct HTTP (Antigravity) */
  cloudCodeBaseUrl?: string;
  /**
   * 订阅场景下的默认推理强度（reasoning_effort）。
   * 订阅已付费、不按 token 计费，可按订阅定位/模型能力给出更激进的默认值。
   * 不传时由上层 schema 兜底为 "medium"。
   */
  defaultReasoningEffort?: ReasoningEffort;
};

/**
 * Commercial taxonomy for API-key templates (authoritative on the registry entry).
 * - subscription + token_plan_endpoint: Coding/Token Plan style access (subscription variant, still apiSource custom)
 * - api + metered_key: pure metered API keys
 */
export type ApiKeyTemplateCommercialKind = "subscription" | "api";
export type ApiKeyTemplateAccessVariant =
  | "token_plan_endpoint"
  | "metered_key";

export type ApiKeyTemplateConfig = {
  kind: "api_key_template";
  id: string;
  label: string;
  description?: string;
  /** 对应 custom provider 的 provider 字段 */
  provider: string;
  /** 预填的 customProviderUrl */
  baseUrl: string;
  /** 默认模型 */
  defaultModel?: string;
  /** Curated model options shown as a dropdown when non-empty (otherwise free text). */
  modelOptions?: ReadonlyArray<{
    id: string;
    label: string;
    recommended?: boolean;
    hasVision?: boolean;
  }>;
  /** 显式 auth header；不传则按 endpoint 自动推断 */
  apiKeyHeader?: string;
  /**
   * API Key 格式提示（展示在 API Key 输入框下方）。
   * 帮助用户填对 key——例如 Ollama Cloud 的 key 是 `xxx.xxx` 格式，
   * 只填前半段会被 /v1/chat/completions 拒为 401。
   */
  keyFormatHint?: string;
  /** Product commercial class — do not re-infer from id downstream. */
  commercialKind: ApiKeyTemplateCommercialKind;
  /** Access variant for Agent-source descriptors / create UI grouping. */
  accessVariant: ApiKeyTemplateAccessVariant;
  /**
   * 默认推理强度（reasoning_effort）。
   * subscription + token_plan_endpoint 类按订阅定位给值（与 OAuth 订阅同策略）；
   * api + metered_key 类按量计费，统一 "medium" 偏保守。
   * 不传时由上层 schema 兜底为 "medium"。
   */
  defaultReasoningEffort?: ReasoningEffort;
};

export type ProviderRegistryEntry = OAuthProviderConfig | ApiKeyTemplateConfig;

// Subscription OAuth 提供商（需要用户先登录）
export const SUBSCRIPTION_OAUTH_PROVIDERS: OAuthProviderConfig[] = [
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
      { id: "gpt-5.6-luna", label: "GPT-5.6 Luna", hasVision: true },
    ],
  },
  {
    kind: "oauth",
    id: "xai-oauth",
    label: "xAI Grok OAuth",
    description: "SuperGrok Subscription",
    apiKeyRef: "xai",
    provider: "xai",
    defaultModel: "grok-4.6",
    defaultReasoningEffort: "high",
    modelOptions: [
      { id: "grok-4.6", label: "Grok 4.6", hasVision: true, recommended: true },
    ],
  },
  {
    kind: "oauth",
    id: "antigravity",
    label: "Antigravity",
    description: "Gemini 3, Claude, GPT-OSS",
    apiKeyRef: "antigravity",
    provider: "google-antigravity",
    defaultModel: "gemini-3.7-flash",
    defaultReasoningEffort: "medium",
    modelOptions: [
      { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", hasVision: true, recommended: true },
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", hasVision: true },
      { id: "claude-sonnet-5", label: "Claude Sonnet 5", hasVision: true },
      { id: "claude-opus-4-6-thinking", label: "Claude Opus 4.6 Thinking", hasVision: true },
    ],
    cloudCodeBaseUrl: ANTIGRAVITY_CLOUD_CODE_BASE_URL,
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
      { id: "claude-fable-5", label: "Claude Fable 5", hasVision: true },
    ],
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
      { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro", hasVision: true },
    ],
  },
];

// 直接调用 API key 的 provider 模板，归入「自定义」
// Token Plan 优先：中国常见订阅（API Key + Base URL），运行时仍走 apiSource:"custom"
export const CUSTOM_API_KEY_TEMPLATES: ApiKeyTemplateConfig[] = [
  {
    kind: "api_key_template",
    id: "token-plan",
    label: "MiMo Token Plan",
    description: "小米 MiMo 订阅（API Key + Base URL）",
    provider: "mimo",
    baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
    defaultModel: "mimo-v2.5-pro",
    commercialKind: "subscription",
    accessVariant: "token_plan_endpoint",
  },
  {
    kind: "api_key_template",
    id: "ollama-cloud",
    label: "Ollama Cloud",
    description: "Ollama Cloud 订阅（API Key + Base URL）",
    provider: "ollama-cloud",
    baseUrl: "https://ollama.com/v1",
    keyFormatHint: "Key 形如 xxx.xxx（在 ollama.com/settings/api-keys 获取完整 Key，含点号后半段）",
    defaultModel: "deepseek-v4-flash:cloud",
    modelOptions: [
      { id: "glm-5.2:cloud", label: "GLM 5.2" },
      { id: "deepseek-v4-flash:cloud", label: "DeepSeek V4 Flash", recommended: true },
      { id: "deepseek-v4-pro:cloud", label: "DeepSeek V4 Pro" },
      { id: "kimi-k3:cloud", label: "Kimi K3" },
    ],
    commercialKind: "subscription",
    accessVariant: "token_plan_endpoint",
  },
  {
    kind: "api_key_template",
    id: "qwen-token-plan",
    label: "千问 Token Plan",
    description: "千问 Token Plan 订阅（Key 须为 Token Plan 专属，非按量 API Key）",
    provider: "qwen",
    baseUrl: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen3.8-max",
    modelOptions: QWEN_TOKEN_PLAN_MODEL_OPTIONS,
    commercialKind: "subscription",
    accessVariant: "token_plan_endpoint",
  },
  {
    kind: "api_key_template",
    id: "opencode-go",
    label: "OpenCode Go",
    description: "OpenCode Go 订阅（$5 首月 / $10 月，聚合 Grok/Kimi/Qwen/GLM/MiMo/MiniMax/DeepSeek）",
    provider: "opencode-go",
    baseUrl: "https://opencode.ai/zen/go/v1",
    defaultModel: "qwen3.8-max",
    modelOptions: OPENCODE_GO_MODEL_OPTIONS,
    commercialKind: "subscription",
    accessVariant: "token_plan_endpoint",
  },
  {
    kind: "api_key_template",
    id: "kimi-code-key",
    label: "Kimi Code",
    description: "Kimi 会员订阅（Kimi Code 控制台 API Key，最多 5 个）",
    provider: "kimi-code",
    baseUrl: "https://api.kimi.com/coding/v1",
    defaultModel: "kimi-for-coding",
    modelOptions: KIMI_CODE_MODEL_OPTIONS,
    commercialKind: "subscription",
    accessVariant: "token_plan_endpoint",
  },
  {
    kind: "api_key_template",
    id: "openai-api",
    label: "OpenAI API",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.6-sol",
    commercialKind: "api",
    accessVariant: "metered_key",
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
    accessVariant: "metered_key",
  },
  {
    kind: "api_key_template",
    id: "gemini-api",
    label: "Gemini API",
    provider: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-3.7-flash",
    apiKeyHeader: "x-goog-api-key",
    commercialKind: "api",
    accessVariant: "metered_key",
  },
  {
    kind: "api_key_template",
    id: "xai-api",
    label: "xAI API",
    provider: "xai",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4.6",
    commercialKind: "api",
    accessVariant: "metered_key",
  },
  // DeepSeek official API provider removed — all DeepSeek models now route
  // through the nolo provider (Ollama Cloud). The "deepseek-api" template
  // was retired on 2026-08-08 after benchmarks showed Ollama Cloud is
  // 28-49% faster with thinking=max enabled.
  {
    kind: "api_key_template",
    id: "qwen-api",
    label: "千问 API 用量计费",
    description: "Qwen / DashScope（OpenAI 兼容，按量计费）",
    provider: "qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen3-max",
    modelOptions: QWEN_MODEL_OPTIONS,
    commercialKind: "api",
    accessVariant: "metered_key",
  },
  {
    kind: "api_key_template",
    id: "kimi-api",
    label: "Kimi API 用量计费",
    description: "Moonshot 开放平台（Key 须为开放平台生成，非 Kimi Code 控制台 key）",
    provider: "moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "kimi-k3",
    modelOptions: MOONSHOT_MODEL_OPTIONS,
    commercialKind: "api",
    accessVariant: "metered_key",
  },
  {
    kind: "api_key_template",
    id: "minimax-api",
    label: "MiniMax API",
    provider: "minimax",
    baseUrl: "https://api.minimaxi.com/v1",
    defaultModel: "MiniMax-Text-01",
    commercialKind: "api",
    accessVariant: "metered_key",
  },
];

export const ALL_PROVIDER_REGISTRY: ProviderRegistryEntry[] = [
  ...SUBSCRIPTION_OAUTH_PROVIDERS,
  ...CUSTOM_API_KEY_TEMPLATES,
];

export function findProviderById(id: string): ProviderRegistryEntry | undefined {
  return ALL_PROVIDER_REGISTRY.find((p) => p.id === id);
}

export function isSubscriptionOAuthProvider(id?: string | null): boolean {
  if (!id) return false;
  return SUBSCRIPTION_OAUTH_PROVIDERS.some((p) => p.id === id);
}

export function isCustomApiKeyTemplate(id?: string | null): boolean {
  if (!id) return false;
  return CUSTOM_API_KEY_TEMPLATES.some((p) => p.id === id);
}
