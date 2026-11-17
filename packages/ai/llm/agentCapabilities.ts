import { resolveAgentCallPlan } from "../../agent-runtime/agentCallPlan";
import { CUSTOM_API_KEY_TEMPLATES, SUBSCRIPTION_OAUTH_PROVIDERS } from "../agent/providerRegistry";
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

/**
 * 自定义端点的通道反查基础设施：`provider` 没填或写成 `custom` 时，能力查表只能
 * 拿到 `custom`，即使端点 baseUrl 与注册表里某个通道完全一致。真实受害形态：
 * `{provider:"custom", customProviderUrl:"https://api.commandcode.ai/provider/v1",
 *   model:"deepseek/deepseek-v4.1-flash"}` —— catalog 已登记该模型 hasVision: true，
 * 却因为查不到通道而落成 unknown，随后被图片闸门 fail-closed 拒绝。
 * 只按 host 相等匹配，不按 path 前缀（同一 host 下不同通道的 path 不能互相代替）。
 */
const endpointHost = (value: string | null | undefined): string | undefined => {
  const raw = asOptionalTrimmedString(value);
  if (!raw) return undefined;
  try {
    return new URL(raw).host || undefined;
  } catch {
    return undefined;
  }
};

/**
 * 通道预设里的模型视觉声明兜底。
 *
 * providerRegistry 的 `modelOptions` 是下拉/编辑页展示能力的同一个真源，但它比
 * providers.ts 的 `MODEL_MAP` 更全：`MODEL_MAP` 只收带 contextWindow 的条目
 * （见 providers.ts 的 commandcode 一行），commandcode 等通道的部分现役模型因此
 * 在 catalog 查不到 hasVision，落到「unknown」。
 *
 * 只在 `lookupKnownModelVision` 落空时兜底，不覆盖 MODEL_MAP 的既有结论。两个条件
 * 同时成立才采信预设声明，否则宁可保持 unknown 交给上层按未知名处理：
 *   1) 记录里的 customProviderUrl 的 host 与预设 baseUrl 的 host 相同（端点确属该通道）；
 *   2) 记录写了具体 provider 时它必须与预设通道一致（写成 `custom`/未填则只用端点判定）。
 * 调用方还须确认实际出站路由就是该自定义端点（`authMethod.kind === "custom-key"`），
 * 这样「自定义 Key 走别的端点」和 CLI 记录里残留的端点都不会借用预设声明（见测试
 * "does not inherit subscription vision declarations when using custom-key routing"
 * 与 "CLI 路由不采信遗留端点"）。
 */
const lookupPresetModelVision = (
  provider: string | null,
  model: string,
  customProviderUrl?: string | null,
): boolean | undefined => {
  if (!model) return undefined;
  const host = endpointHost(customProviderUrl);
  if (!host) return undefined;
  const candidates = [model, stripEffortSuffix(model), stripPreviewSuffix(model)];
  for (const template of CUSTOM_API_KEY_TEMPLATES) {
    if (endpointHost(template.baseUrl) !== host) continue;
    const templateProvider = asTrimmedLowercaseString(template.provider);
    if (provider && provider !== "custom" && templateProvider !== provider) continue;
    const declared = (template.modelOptions ?? [])
      .find((option) => candidates.includes(option.id))?.hasVision;
    if (typeof declared === "boolean") return declared;
  }
  return undefined;
};

export const resolveCatalogImageSupport = (agent: AgentCapabilityConfig): boolean | undefined => {

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
    : lookupKnownModelVision(provider, model)
      // 端点兜底只对「真的往这个自定义端点发请求」的路由生效。CLI 路由、平台 Key
      // 等记录里可能残留 customProviderUrl，但它不参与实际出站，不能据此采信能力。
      ?? (authMethod.kind === "custom-key"
        ? lookupPresetModelVision(provider, model, agent.customProviderUrl)
        : undefined);

  return catalogHasVision;
};

// Runtime-only evidence: symbols cannot be supplied by persisted JSON agent records.
// Bind to the exact model and re-check the call plan on every consumer.
const liveImageSupport = Symbol("liveImageSupport");
type LiveEvidence = { model: string; supported: boolean };
export function withLiveImageSupport<T extends AgentCapabilityConfig>(agent: T, supported: boolean): T {
  return { ...agent, [liveImageSupport]: { model: agent.model, supported } };
}
function readLiveImageSupport(agent: AgentCapabilityConfig): boolean | undefined {
  const evidence = (agent as AgentCapabilityConfig & { [liveImageSupport]?: LiveEvidence })[liveImageSupport];
  if (!evidence || evidence.model !== agent.model) return undefined;
  const plan = resolveAgentCallPlan({ ...agent, key: "" } as Parameters<typeof resolveAgentCallPlan>[0]);
  return plan.authMethod.kind === "oauth" && plan.authMethod.ref === "antigravity"
    ? evidence.supported : undefined;
}

// User-input vision keeps its historical permissive fallback. Tool images do not.
export const resolveAgentImageInputSupport = (
  agent: AgentCapabilityConfig | null | undefined,
): boolean => {
  if (!agent) return true;
  return resolveCatalogImageSupport(agent) ?? readLiveImageSupport(agent) ?? agent.hasVision ?? true;
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
  const live = readLiveImageSupport(input);
  if (live !== undefined) return { maxImagesPerRequest, supportsToolImages: live, reason: "live-discovery" };
  if (typeof input.hasVision === "boolean") {
    return { maxImagesPerRequest, supportsToolImages: input.hasVision, reason: "agent-declaration" };
  }
  return { maxImagesPerRequest, supportsToolImages: false, reason: "unknown" };
};
