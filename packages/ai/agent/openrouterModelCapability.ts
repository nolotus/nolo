import type { ReasoningEffort } from "./createAgentSchema";
import { REASONING_EFFORT_OPTIONS } from "./createAgentSchema";

export type OpenRouterModelReasoningInfo = {
  found: boolean;
  supportsReasoning: boolean;
  mandatory?: boolean;
  supportedEfforts: ReasoningEffort[];
  defaultEffort?: ReasoningEffort;
};

export type OpenRouterRawModel = {
  id: string;
  name?: string;
  supported_parameters?: string[];
  reasoning?: {
    mandatory?: boolean;
    default_enabled?: boolean;
    supported_efforts?: string[];
    default_effort?: string;
  };
};

const VALID_EFFORTS_SET = new Set<string>(REASONING_EFFORT_OPTIONS);

/**
 */
export function extractOpenRouterReasoningCapability(
  rawModel: OpenRouterRawModel | null | undefined,
): OpenRouterModelReasoningInfo {
  if (!rawModel) {
    return {
      found: false,
      supportsReasoning: false,
      supportedEfforts: [],
    };
  }

  const supportedParams = rawModel.supported_parameters ?? [];
  const reasoning = rawModel.reasoning;

  // 判据：如果有 reasoning 对象，或者 supported_parameters 里声明了 reasoning 相关的参数
  const hasReasoningSupport =
    Boolean(reasoning) ||
    supportedParams.includes("reasoning") ||
    supportedParams.includes("reasoning_effort") ||
    supportedParams.includes("include_reasoning");

  if (!hasReasoningSupport) {
    return {
      found: true,
      supportsReasoning: false,
      supportedEfforts: [],
    };
  }

  // 映射真实支持的 effort 列表
  const rawEfforts = reasoning?.supported_efforts ?? [];
  const supportedEfforts = rawEfforts.filter((e): e is ReasoningEffort =>
    VALID_EFFORTS_SET.has(e),
  );

  let defaultEffort: ReasoningEffort | undefined;
  if (
    reasoning?.default_effort &&
    VALID_EFFORTS_SET.has(reasoning.default_effort) &&
    supportedEfforts.includes(reasoning.default_effort as ReasoningEffort)
  ) {
    defaultEffort = reasoning.default_effort as ReasoningEffort;
  } else if (supportedEfforts.length > 0) {
    defaultEffort = supportedEfforts.includes("medium")
      ? "medium"
      : supportedEfforts[0];
  }

  return {
    found: true,
    supportsReasoning: true,
    mandatory: reasoning?.mandatory,
    supportedEfforts,
    defaultEffort,
  };
}

let cachedModels: { timestamp: number; data: Map<string, OpenRouterRawModel> } | null = null;
let inFlightPromise: Promise<Map<string, OpenRouterRawModel> | null> | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function resetOpenRouterModelsCache(): void {
  cachedModels = null;
  inFlightPromise = null;
}

export async function fetchAllOpenRouterModels(
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, OpenRouterRawModel> | null> {
  const now = Date.now();
  if (cachedModels && now - cachedModels.timestamp < CACHE_TTL_MS) {
    return cachedModels.data;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const res = await fetchImpl("https://openrouter.ai/api/v1/models", {
        headers: {
          "HTTP-Referer": "https://nolo.chat",
          "X-Title": "nolo",
        },
      });
      if (!res.ok) {
        return cachedModels ? cachedModels.data : null;
      }
      const json = (await res.json()) as { data?: OpenRouterRawModel[] };
      if (!json || !Array.isArray(json.data)) {
        return cachedModels ? cachedModels.data : null;
      }

      const map = new Map<string, OpenRouterRawModel>();
      for (const item of json.data) {
        if (item.id) {
          map.set(item.id.toLowerCase(), item);
        }
      }

      cachedModels = {
        timestamp: Date.now(),
        data: map,
      };
      return map;
    } catch {
      return cachedModels ? cachedModels.data : null;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * 供发送链路（同步代码路径）在缓存已预热时获得模型级真值；
 * 缓存冷/过期/未收录时返回 null，调用方回退到 override/provider 级解析。
 */
export function getCachedOpenRouterModelReasoning(
  modelId: string,
): OpenRouterModelReasoningInfo | null {
  const trimmed = modelId.trim().toLowerCase();
  if (!trimmed) return null;
  if (!cachedModels || Date.now() - cachedModels.timestamp >= CACHE_TTL_MS) {
    return null;
  }
  const rawModel = cachedModels.data.get(trimmed);
  if (!rawModel) return null;
  return extractOpenRouterReasoningCapability(rawModel);
}

/**
 */
export async function queryOpenRouterModelReasoning(
  modelId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OpenRouterModelReasoningInfo | null> {
  const trimmed = modelId.trim().toLowerCase();
  if (!trimmed) return null;

  const modelsMap = await fetchAllOpenRouterModels(fetchImpl);
  if (!modelsMap) return null;

  const rawModel = modelsMap.get(trimmed);
  if (!rawModel) {
    // 找不到该模型（可能是新模型未在列表或拼写错误）
    return {
      found: false,
      supportsReasoning: false,
      supportedEfforts: [],
    };
  }

  return extractOpenRouterReasoningCapability(rawModel);
}
