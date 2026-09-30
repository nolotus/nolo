// packages/ai/agent/modelReasoningCapability.ts
//
// 统一的「模型推理强度能力」解析层（单一真值来源）。
//
// 背景：此前 UI 只按 provider 静态映射给选项（PROVIDER_REASONING_EFFORT_VALUES），
// 同一 provider 下不同模型的真实能力差异被抹平（典型：gpt-5-pro 只有 high、
// grok-3-mini 没有 medium、gpt-4o 根本不支持推理），用户在高级设置里看到
// 「全都一样的低中高」。
//
// 解析优先级（自上而下，命中即返回）：
//      异步路径 queryModelReasoningCapability）；
//   2. model-override：下方 MODEL_REASONING_OVERRIDES 维护的按模型精确/前缀匹配表；
//   3. provider-map：PROVIDER_REASONING_EFFORT_VALUES（provider 级静态真值）；
//   4. provider-fallback：未知 provider 的保守默认 low/medium/high。
//
// 维护约定：
// - override 只收录「与 provider 级映射不同」且有可靠来源（官方文档/实测）的模型；
//   拿不准的不要写，让 provider-map 兜底。每条必须写 note 注明依据。
// - 匹配对完整 model id 与其 basename（最后一个 / 之后）同时生效，

import {
  PROVIDER_REASONING_EFFORT_VALUES,
  type ReasoningEffort,
} from "./createAgentSchema";
import {
  getCachedOpenRouterModelReasoning,
  queryOpenRouterModelReasoning,
  type OpenRouterModelReasoningInfo,
} from "./openrouterModelCapability";

export type ModelReasoningSource =
  | "openrouter-live"
  | "model-override"
  | "provider-map"
  | "provider-fallback";

export type ModelReasoningCapability = {
  /** 是否有模型级精确证据（live 查询命中或 override 命中）；provider 级映射为 false */
  found: boolean;
  /** false = 该模型不走任何推理强度通道（非推理模型或 Thinking 机制），UI 应隐藏/提示 */
  supportsReasoning: boolean;
  /** 实际可选的 effort 档位（已按真实能力过滤） */
  efforts: ReasoningEffort[];
  defaultEffort?: ReasoningEffort;
  mandatory?: boolean;
  source: ModelReasoningSource;
};

type ModelReasoningOverride = {
  /** 命中的 provider（小写）；网关 provider 自动复用全部 override */
  providers: string[];
  /** model id（或其 basename）前缀匹配；exact=true 时只匹配完整名称 */
  prefix: string;
  /** true = 不做前缀匹配（避免误伤 deepseek-chat-v3.1 / grok-3-fast 这类更长名称） */
  exact?: boolean;
  /** 可选：额外要求 model id 包含该子串（如 gpt-5*-pro） */
  includes?: string;
  supportsReasoning?: boolean;
  efforts?: ReasoningEffort[];
  /** 依据来源（官方文档/实测），必填 */
  note: string;
};

/** 网关类 provider：上游模型与直连同源，通用 override 同样适用 */
const GATEWAY_PROVIDERS = new Set(["openrouter", "nolo"]);

/** 这些 provider 走 Thinking 机制而非 reasoning_effort，UI 隐藏下拉（与既有行为一致） */
export const THINKING_MECHANISM_PROVIDERS = new Set(["anthropic", "google"]);

/**
 * 模型级 override 表。只收录与 provider 级映射不同的、有可靠依据的条目。
 * 匹配规则：prefix 越长越优先；同长度按声明顺序。
 */
const MODEL_REASONING_OVERRIDES: ModelReasoningOverride[] = [
  // ---- OpenAI ----
  {
    providers: ["openai"],
    prefix: "gpt-5",
    includes: "-pro",
    efforts: ["high"],
    note: "gpt-5-pro 系列只暴露 high 档（OpenAI 文档：pro 变体不可调低）",
  },
  {
    providers: ["openai"],
    prefix: "o1-preview",
    supportsReasoning: false,
    note: "o1-preview 不接受 reasoning_effort 参数",
  },
  {
    providers: ["openai"],
    prefix: "o1-mini",
    supportsReasoning: false,
    note: "o1-mini 不接受 reasoning_effort 参数",
  },
  {
    providers: ["openai"],
    prefix: "o1",
    efforts: ["low", "medium", "high"],
    note: "o1 支持 low/medium/high，无 none/minimal/xhigh/max",
  },
  {
    providers: ["openai"],
    prefix: "o3",
    efforts: ["low", "medium", "high"],
    note: "o3 / o3-mini 支持 low/medium/high",
  },
  {
    providers: ["openai"],
    prefix: "o4-mini",
    efforts: ["low", "medium", "high"],
    note: "o4-mini 支持 low/medium/high",
  },
  {
    providers: ["openai"],
    prefix: "gpt-4o",
    supportsReasoning: false,
    note: "gpt-4o 系列非推理模型",
  },
  {
    providers: ["openai"],
    prefix: "gpt-4.1",
    supportsReasoning: false,
    note: "gpt-4.1 系列非推理模型",
  },
  {
    providers: ["openai"],
    prefix: "chatgpt-4o",
    supportsReasoning: false,
    note: "chatgpt-4o 非推理模型",
  },
  // ---- xAI / Grok ----
  {
    providers: ["xai", "grok"],
    prefix: "grok-3-mini",
    efforts: ["low", "high"],
    note: "grok-3-mini 仅 low/high，无 medium（xAI 文档）",
  },
  {
    providers: ["xai", "grok"],
    prefix: "grok-3",
    exact: true, // 只匹配 grok-3 本体；grok-3-fast 等变体不被误伤
    supportsReasoning: false,
    note: "grok-3（非 mini）不支持 reasoning_effort",
  },
  {
    providers: ["xai", "grok"],
    prefix: "grok-2",
    supportsReasoning: false,
    note: "grok-2 系列非推理模型",
  },
  // ---- DeepSeek ----
  {
    providers: ["deepseek"],
    prefix: "deepseek-chat",
    exact: true, // 只匹配 deepseek-chat 本体；deepseek-chat-v3.1 是混合推理模型
    supportsReasoning: false,
    note: "deepseek-chat（V3 非推理线）无推理强度",
  },
  // ---- Kimi / Moonshot ----
  {
    providers: ["kimi", "moonshot"],
    prefix: "moonshot-v1",
    supportsReasoning: false,
    note: "moonshot-v1 系列非推理模型",
  },
  {
    providers: ["kimi", "moonshot"],
    prefix: "kimi-k2-instruct",
    supportsReasoning: false,
    note: "kimi-k2-instruct 非 thinking 变体",
  },
  {
    providers: ["kimi", "moonshot"],
    prefix: "kimi-latest",
    supportsReasoning: false,
    note: "kimi-latest 指向非推理快照",
  },
];

function modelBasename(model: string): string {
  const idx = model.lastIndexOf("/");
  return idx === -1 ? model : model.slice(idx + 1);
}

function matchOverride(
  provider: string,
  model: string,
): ModelReasoningOverride | null {
  const m = model.toLowerCase();
  const base = modelBasename(m);
  const isGateway = GATEWAY_PROVIDERS.has(provider);

  let best: ModelReasoningOverride | null = null;
  let bestPrefixLen = -1;
  for (const o of MODEL_REASONING_OVERRIDES) {
    if (!isGateway && !o.providers.includes(provider)) continue;
    const hit = o.exact
      ? m === o.prefix || base === o.prefix
      : m.startsWith(o.prefix) || base.startsWith(o.prefix);
    if (!hit) continue;
    if (o.includes && !m.includes(o.includes) && !base.includes(o.includes)) {
      continue;
    }
    if (o.prefix.length > bestPrefixLen) {
      best = o;
      bestPrefixLen = o.prefix.length;
    }
  }
  return best;
}

function capabilityFromOpenRouterLive(
  live: OpenRouterModelReasoningInfo,
): ModelReasoningCapability {
  return {
    found: true,
    supportsReasoning: live.supportsReasoning,
    efforts: live.supportedEfforts,
    defaultEffort: live.defaultEffort,
    mandatory: live.mandatory,
    source: "openrouter-live",
  };
}

/**
 * 同步解析（无网络）：override → provider-map → fallback。
 */
export function resolveModelReasoningCapability(
  provider: string | null | undefined,
  model: string | null | undefined,
): ModelReasoningCapability {
  const p = (provider ?? "").toLowerCase();
  const m = (model ?? "").trim();

  if (THINKING_MECHANISM_PROVIDERS.has(p)) {
    return {
      found: false,
      supportsReasoning: true, // 有推理能力，只是走 Thinking 机制而非 effort
      efforts: [],
      source: "provider-map",
    };
  }

  if (m) {
    const override = matchOverride(p, m);
    if (override) {
      const supportsReasoning = override.supportsReasoning ?? true;
      const efforts =
        supportsReasoning === false
          ? []
          : (override.efforts ??
            PROVIDER_REASONING_EFFORT_VALUES[p] ?? [
              "low",
              "medium",
              "high",
            ]);
      return {
        found: true,
        supportsReasoning,
        efforts,
        defaultEffort: efforts.includes("medium") ? "medium" : efforts[0],
        source: "model-override",
      };
    }
  }

  const providerEfforts = PROVIDER_REASONING_EFFORT_VALUES[p];
  if (providerEfforts) {
    return {
      found: false,
      supportsReasoning: providerEfforts.length > 0,
      efforts: providerEfforts,
      source: "provider-map",
    };
  }

  return {
    found: false,
    supportsReasoning: true,
    efforts: ["low", "medium", "high"],
    source: "provider-fallback",
  };
}

/**
 * 查询失败或未收录时回退到同步解析；其他 provider 直接同步解析。
 */
export async function queryModelReasoningCapability(
  provider: string | null | undefined,
  model: string | null | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<ModelReasoningCapability> {
  const p = (provider ?? "").toLowerCase();
  const m = (model ?? "").trim();

  if (p === "openrouter" && m) {
    const live = await queryOpenRouterModelReasoning(m, fetchImpl);
    if (live?.found) {
      return capabilityFromOpenRouterLive(live);
    }
    // live 未命中（新模型未收录 / 拼写差异）→ 落回同步解析（override 仍可能命中）
  }

  return resolveModelReasoningCapability(provider, model);
}

/**
 * 否则与 resolveModelReasoningCapability 相同。
 * 供发送链路 clamp / 工具校准等同步代码路径使用（不能 await 网络请求）。
 */
export function resolveModelReasoningCapabilityWithCache(
  provider: string | null | undefined,
  model: string | null | undefined,
): ModelReasoningCapability {
  const p = (provider ?? "").toLowerCase();
  const m = (model ?? "").trim();

  if (p === "openrouter" && m) {
    const live = getCachedOpenRouterModelReasoning(m);
    if (live?.found) {
      return capabilityFromOpenRouterLive(live);
    }
  }

  return resolveModelReasoningCapability(provider, model);
}
