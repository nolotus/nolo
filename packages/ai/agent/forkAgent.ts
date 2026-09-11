/**
 * Agent cloning policy shared by every "create from existing Agent" caller.
 *
 * Provider/runtime settings follow the source by default. Credentials are references only:
 * raw secrets are always removed, and apiKeyRef may cross the clone boundary only when the
 * authenticated target user owns the source record too.
 */

/** Behaviour/capability fields copied when the source defines them. */
const COPY_KEYS = [
  "prompt",
  "introduction",
  "greeting",
  "tools",
  "hasVision",
  "hasImageOutput",
  "imageModel",
  "imageConfig",
  "imageWorkflow",
  "defaultInteractionMode",
] as const;

/** Provider/API fields whose defaults must come from the source rather than the platform. */
const PROVIDER_CONFIG_KEYS = [
  "provider",
  "apiSource",
  "customProviderUrl",
  "useServerProxy",
  "apiKeyHeader",
  "cliProvider",
] as const;

/** Reasoning controls are a unit: copying only one can materially change model behaviour. */
const REASONING_CONFIG_KEYS = [
  "enableThinking",
  "thinkingBudget",
  "reasoning_effort",
] as const;

/** Optional generation parameters are copied only when present. */
const OPTIONAL_GENERATION_KEYS = [
  "temperature",
  "top_p",
  "max_tokens",
  "frequency_penalty",
  "presence_penalty",
] as const;

const FORCED_SAFE_DEFAULTS: Record<string, unknown> = {
  isPublic: false,
  allowFork: false,
  whitelist: [],
  references: [],
  inputPrice: 0,
  outputPrice: 0,
  // Never clone a plaintext secret or another Agent's local credential-broker reference.
  apiKey: "",
  credentialRef: "",
  apiKeyFromAgentKey: "",
  credentialSynced: false,
  // Machine bindings are owner/runtime specific even when the account is the same.
  machineId: "",
};

const NAME_MAX_LENGTH = 50;
const API_SOURCES = new Set(["platform", "custom", "cli"]);

const trimmed = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export interface BuildForkAgentFormDataOptions {
  /** Authenticated owner of the new Agent. Required for credential-ref inheritance. */
  targetUserId?: string;
  /** Name suffix used when no explicit name override is supplied. */
  nameSuffix?: string;
  /** Explicit create-time overrides. Provider/API settings otherwise always come from source. */
  overrides?: {
    name?: string;
    model?: string;
    apiSource?: "platform" | "custom" | "cli";
  };
}

export interface ForkedAgentProviderExpectation {
  model: unknown;
  apiSource: unknown;
  provider: unknown;
  credentialConfigured: boolean;
  apiKeyRef: string;
}

/** Build the externally observable provider contract used for post-create verification. */
export function getForkedAgentProviderExpectation(
  formData: Record<string, any>,
): ForkedAgentProviderExpectation {
  const apiKeyRef = trimmed(formData.apiKeyRef);
  const apiSource = formData.apiSource;
  return {
    model: formData.model,
    apiSource,
    provider: formData.provider,
    credentialConfigured: apiKeyRef.length > 0,
    apiKeyRef,
  };
}

/**
 * Verify the persisted create result before reporting cloning success.
 * Throws with a field list so callers cannot silently accept normalization drift.
 */
export function assertForkedAgentProviderConfig(
  created: Record<string, any>,
  expected: ForkedAgentProviderExpectation,
): void {
  const actualApiKeyRef = trimmed(created.apiKeyRef);
  const actualCredentialConfigured =
    typeof created.credentialConfigured === "boolean"
      ? created.credentialConfigured
      : actualApiKeyRef.length > 0;
  const mismatches: string[] = [];
  if (created.model !== expected.model) mismatches.push("model");
  if (created.apiSource !== expected.apiSource) mismatches.push("apiSource");
  if (created.provider !== expected.provider) mismatches.push("provider");
  if (actualCredentialConfigured !== expected.credentialConfigured) {
    mismatches.push("credentialConfigured");
  }
  if (actualApiKeyRef !== expected.apiKeyRef) mismatches.push("apiKeyRef");
  if (mismatches.length) {
    throw new Error(`Agent 创建后配置校验失败：${mismatches.join(", ")}`);
  }
}

/** Convert a source Agent into createAgent form data, or null when cloning is forbidden. */
export function buildForkAgentFormData(
  source: any,
  options?: BuildForkAgentFormDataOptions,
): Record<string, any> | null {
  if (!source || source.allowFork !== true) return null;

  const result: Record<string, any> = {};
  for (const key of [
    ...COPY_KEYS,
    ...PROVIDER_CONFIG_KEYS,
    ...REASONING_CONFIG_KEYS,
    ...OPTIONAL_GENERATION_KEYS,
  ]) {
    if (source[key] !== undefined) result[key] = source[key];
  }

  // model is inherited unless the caller supplies a non-empty override.
  if (source.model !== undefined) result.model = source.model;
  const modelOverride = trimmed(options?.overrides?.model);
  if (modelOverride) result.model = modelOverride;

  const explicitApiSource = options?.overrides?.apiSource;
  if (explicitApiSource) {
    result.apiSource = explicitApiSource;
  } else if (!API_SOURCES.has(source.apiSource)) {
    // An absent/unknown legacy source must not silently opt into platform billing.
    delete result.apiSource;
  }

  const sourceOwner = trimmed(source.userId);
  const targetOwner = trimmed(options?.targetUserId);
  result.apiKeyRef =
    sourceOwner && targetOwner && sourceOwner === targetOwner
      ? trimmed(source.apiKeyRef)
      : "";

  if (result.apiSource === "platform") {
    // Platform execution must not retain fields that take precedence in runtime
    // provider resolution or refer to custom-provider credentials.
    result.customProviderUrl = "";
    result.cliProvider = "";
    result.apiKeyRef = "";
    result.apiKeyHeader = "";
    result.useServerProxy = true;
  }

  const explicitName = options?.overrides && "name" in options.overrides
    ? trimmed(options.overrides.name)
    : "";
  const sourceName = trimmed(source.name);
  const suffix = options?.nameSuffix ?? " 副本";
  result.name = (
    explicitName || (sourceName ? `${sourceName}${suffix}`.trim() : "新 AI")
  ).slice(0, NAME_MAX_LENGTH);

  const rawTags = source.tags;
  if (Array.isArray(rawTags)) {
    result.tags = rawTags
      .map((tag: unknown) => String(tag ?? "").trim())
      .filter(Boolean)
      .join(",");
  } else {
    result.tags = typeof rawTags === "string" ? rawTags.trim() : "";
  }

  Object.assign(result, FORCED_SAFE_DEFAULTS);
  return result;
}
