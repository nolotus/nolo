import { resolveAgentCallPlan } from "../../agent-runtime/agentCallPlan";
import { SUBSCRIPTION_OAUTH_PROVIDERS } from "../agent/providerRegistry";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import {
  findModelConfig,
  getProviderByModelName,
} from "./providers";

export type AgentCapabilityConfig = {
  apiSource?: string | null;
  cliProvider?: string | null;
  provider?: string | null;
  model?: string | null;
  hasVision?: boolean | null;
  apiKeyRef?: string | null;
  customProviderUrl?: string | null;
  apiKey?: string | null;
  useServerProxy?: boolean | null;
};

/**
 * 剥离 Antigravity 等 wire 层的 effort 后缀，得到 catalog 基础模型名。
 * 能力检测只看基础模型的多模态能力，与 effort（-low/-medium/-high/-extra-low）无关；
 * record 里存的常是带后缀的 wire id（如 gemini-3.6-flash-high），而 catalog 只收
 * 基础名（gemini-3.6-flash），精确匹配会漏判，故在查 catalog 前先折叠后缀。
 */
const ANTIGRAVITY_EFFORT_SUFFIXES = [
  "-tiered",
  "-extra-low",
  "-low",
  "-medium",
  "-high",
] as const;

function stripEffortSuffix(model: string): string {
  for (const suffix of ANTIGRAVITY_EFFORT_SUFFIXES) {
    if (model.endsWith(suffix) && model.length > suffix.length) {
      return model.slice(0, -suffix.length);
    }
  }
  return model;
}

/**
 * 去掉模型 id 末尾的 `-preview` 后缀，用于把存量「预览版」agent 记录归一化到
 * 已正式上线的同名模型。例如 qwen3.8-max-preview → qwen3.8-max，使能力检测
 * 仍能从 catalog 精确命中，而不是回退到存的 false（导致 CLI 误切 Kimi、chat 拦图）。
 * 与 stripEffortSuffix 同模式；无 -preview 后缀时原样返回。
 */
function stripPreviewSuffix(model: string): string {
  const suffix = "-preview";
  if (model.endsWith(suffix) && model.length > suffix.length) {
    return model.slice(0, -suffix.length);
  }
  return model;
}

const lookupKnownModelVision = (
  provider: string | null,
  model: string,
): boolean | undefined => {
  if (!model) return undefined;

  const candidates = [model];
  const strippedEffort = stripEffortSuffix(model);
  if (strippedEffort !== model) candidates.push(strippedEffort);
  const strippedPreview = stripPreviewSuffix(model);
  if (strippedPreview !== model) candidates.push(strippedPreview);

  for (const candidate of candidates) {
    if (provider && provider !== "custom") {
      const direct = findModelConfig(provider, candidate);
      if (direct && typeof direct.hasVision === "boolean") return direct.hasVision;
    } else {
      // Only infer a provider when the record does not specify a channel.
      const detected = getProviderByModelName(candidate);
      if (detected) {
        const found = findModelConfig(detected, candidate)?.hasVision;
        if (found !== undefined) return found;
      }
    }

    if (candidate.includes("/")) {
      const slash = candidate.indexOf("/");
      const modelProvider = candidate.slice(0, slash).toLowerCase();
      const modelName = candidate.slice(slash + 1);
      // Qualified IDs still work within the explicit channel, never across it.
      if (provider && provider !== "custom" && provider !== modelProvider) continue;
      const nested = findModelConfig(modelProvider, modelName);
      if (nested && typeof nested.hasVision === "boolean") return nested.hasVision;
    }
  }

  return undefined;
};

const resolveCatalogImageSupport = (agent: AgentCapabilityConfig): boolean | undefined => {

  const provider = asTrimmedLowercaseString(agent.provider)
    || asTrimmedLowercaseString(agent.apiSource)
    || null;
  const model = asOptionalTrimmedString(agent.model) ?? "";
  // Use the outbound route's credential precedence, not the display provider:
  // ChatGPT records use provider=openai; an own endpoint + key can override a ref.
  const { authMethod } = resolveAgentCallPlan({
    key: "",
    provider: agent.provider ?? undefined,
    apiSource: agent.apiSource ?? undefined,
    cliProvider: agent.cliProvider ?? undefined,
    model,
    apiKeyRef: agent.apiKeyRef ?? undefined,
    customProviderUrl: agent.customProviderUrl ?? undefined,
    apiKey: agent.apiKey ?? undefined,
    useServerProxy: agent.useServerProxy ?? undefined,
  });
  const catalogHasVision = authMethod.kind === "oauth"
    ? SUBSCRIPTION_OAUTH_PROVIDERS
        .find((entry) => entry.apiKeyRef === authMethod.ref)
        ?.modelOptions.find((entry) =>
          [model, stripEffortSuffix(model), stripPreviewSuffix(model)].includes(entry.id),
        )?.hasVision
    : lookupKnownModelVision(provider, model);

  return catalogHasVision;
};

// User-input vision keeps its historical permissive fallback. Tool images do not.
export const resolveAgentImageInputSupport = (
  agent: AgentCapabilityConfig | null | undefined,
): boolean => {
  if (!agent) return true;
  return resolveCatalogImageSupport(agent) ?? agent.hasVision ?? true;
};

export type ToolImageRouteKind =
  | "openai-compatible" | "responses" | "codex/responses"
  | "gemini-native" | "antigravity" | "platform"
  | "anthropic";

export type ToolImagePolicyInput = AgentCapabilityConfig & {
  /** Actual outbound transport, never the agent's display provider. */
  routeKind: ToolImageRouteKind;
  /** Only for restoring a boundary's historical serializer default. */
  legacySupportsToolImages?: boolean;
};

export const resolveToolImagePolicy = (input: ToolImagePolicyInput): {
  supportsToolImages: boolean;
  maxImagesPerRequest: number;
  reason: string;
} => {
  // 阈值必须来自重复 ≥3 次的观测，不能把单次失败当作硬限制。
  // antigravity 曾因单次 4 张失败被设为 3；随后旧代码两次 4/4 命中，
  // 重复观测证伪了该误判，恢复所有路由默认 4（并非据此宣称新的硬限制）。
  const maxImagesPerRequest = 4;
  const env = typeof process !== "undefined" ? process.env : undefined;
  if (env?.NOLO_TOOL_IMAGE_POLICY === "legacy") {
    return {
      supportsToolImages: input.legacySupportsToolImages
        ?? resolveAgentImageInputSupport({ ...input, hasVision: input.hasVision ?? false }),
      maxImagesPerRequest,
      reason: "legacy",
    };
  }
  const catalog = resolveCatalogImageSupport(input);
  if (catalog !== undefined) return { maxImagesPerRequest, supportsToolImages: catalog, reason: "catalog" };
  if (typeof input.hasVision === "boolean") {
    return { maxImagesPerRequest, supportsToolImages: input.hasVision, reason: "agent-declaration" };
  }
  return { maxImagesPerRequest, supportsToolImages: false, reason: "unknown" };
};
