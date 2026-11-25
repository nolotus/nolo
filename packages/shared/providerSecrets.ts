import { asOptionalTrimmedString } from "../core/optionalString";

/** Shared provider-key derivation used by web clients and server handlers. */
export const PROVIDER_KEY_PRESET_IDS = new Set([
  "token-plan",
  "qwen-token-plan",
  "opencode-go",
  "kimi-code-key",
  "commandcode",
  "zai-coding-plan",
  "bigmodel-coding-plan",
  "mistral-plan",
  // open-design.ai 聚合网关（一个 Key 聚合多家模型）。
  "opendesign",
  "openai-api",
  "together-api",
  "anthropic-api",
  "gemini-api",
  "xai-api",
  "openrouter-api",
  "deepseek-api",
  "qwen-api",
  // LithosAI 按量计费 API（api.lithosai.cloud，默认 DeepSeek-V4.1-Flash）。
  "lithosai-api",
  // LongCat 官方 API（api.longcat.chat，默认 LongCat-2.5）。
  "longcat-api",
  // MiMo 官方按量计费 API（与 token-plan 订阅 Key 不同通道）。
  "mimo-api",
  "kimi-api",
  "stepfun-api",
  "step-plan",
  "minimax-api",
  "ollama-cloud",
  "glm-5.2:cloud",
  "deepseek-v4-flash:cloud",
  "deepseek-v4-pro:cloud",
  "kimi-k3:cloud",
]);

export function providerSecretKey(presetId: string): string {
  const normalized = presetId.trim().replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();
  return `${normalized}_KEY`;
}

export function providerCredentialRef(presetId: string): string {
  return `provider-key:${presetId.trim()}`;
}

/** An opaque reference is a lookup identifier, never consent to read the cloud copy. */
export function isAgentCredentialShared(agent?: { credentialSynced?: unknown } | null): boolean {
  return agent?.credentialSynced === true;
}

/** The final nolo proxy body may carry a key only after explicit sharing. */
export function resolveOutboundProxyApiKey(credential: { apiKey?: unknown; credentialSynced?: unknown }): string | undefined {
  const apiKey = asOptionalTrimmedString(credential.apiKey);
  if (apiKey && !isAgentCredentialShared(credential)) {
    throw new Error("未授权将此密钥发送到 nolo 代理。请使用本机直连，或启用跨设备共享后重试。");
  }
  return apiKey;
}
