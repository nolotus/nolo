// packages/ai/agent/web/providerModelDiscoveryClient.ts
//
// 客户端封装：调用服务端 POST /api/agents/providers/discover-models。
// 失败语义：任何异常/非 200/409 都返回 null（调用方保持静态 modelOptions 渲染）。
// key 只出现在请求体里；响应不携带 key（服务端契约保证）。

export type DiscoveredModelOption = {
  id: string;
  label: string;
  recommended?: boolean;
  hasVision?: boolean;
};

export type ProviderDiscoveryClientResult = {
  source: "live" | "static";
  models: DiscoveredModelOption[];
  truncated?: boolean;
  fallbackReason?: string;
};

const DISCOVERABLE_PRESET_IDS = new Set([
  "zai-coding-plan",
  "bigmodel-coding-plan",
  "openai-api",
  "xai-api",
  "qwen-api",
  "kimi-api",
  "minimax-api",
]);

/** 客户端白名单（与服务端 PROVIDER_MODEL_ENDPOINTS 同集；双端各自维护，契约由测试锁定）。 */
export function isDiscoverablePreset(presetId: string | null | undefined): boolean {
  return !!presetId && DISCOVERABLE_PRESET_IDS.has(presetId);
}

export type FetchDiscoveredModelsArgs = {
  serverOrigin: string;
  token: string;
  presetId: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
};

/**
 * 合并静态 modelOptions 与服务端 live 发现结果（纯函数，可单测）：
 * - 静态目录优先保序（用户熟悉的默认项在前），live 新模型按上游顺序追加在尾部；
 * - 同 id 时 live 条目覆盖静态（label/能力位以 live 为准）；
 * - recommended 只保留一个（defaultModel 优先），避免 UI 出现多个「（推荐）」。
 * discovery 为 null/空 → 原样返回静态选项（失败回退语义）。
 */
export type ModelOption = {
  id: string;
  label: string;
  recommended?: boolean;
  hasVision?: boolean;
};

export function mergeModelOptionsWithDiscovery(
  staticOptions: ReadonlyArray<ModelOption>,
  discovery: {
    source: "live" | "static";
    models: ModelOption[];
  } | null,
): ModelOption[] {
  if (!discovery || discovery.models.length === 0) return [...staticOptions];
  const liveById = new Map(discovery.models.map((m) => [m.id, m]));
  const merged: ModelOption[] = [];
  const seen = new Set<string>();
  for (const m of staticOptions) {
    const live = liveById.get(m.id);
    seen.add(m.id);
    merged.push(live ? { ...m, ...live } : { ...m });
  }
  for (const m of discovery.models) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    merged.push({ ...m });
  }
  const recommendedId = merged.find((m) => m.recommended)?.id ?? merged[0]?.id;
  return merged.map((m) =>
    m.id === recommendedId ? { ...m, recommended: true } : { ...m, recommended: undefined },
  );
}

export async function fetchDiscoveredModels(
  args: FetchDiscoveredModelsArgs,
): Promise<ProviderDiscoveryClientResult | null> {
  if (!isDiscoverablePreset(args.presetId)) return null;
  const apiKey = (args.apiKey ?? "").trim();
  if (!apiKey) return null;
  const base = (args.serverOrigin ?? "").replace(/\/+$/, "");
  if (!base) return null;

  const fetchImpl = args.fetchImpl ?? fetch;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    let res: Response;
    try {
      res = await fetchImpl(`${base}/api/agents/providers/discover-models`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(args.token ? { Authorization: `Bearer ${args.token}` } : {}),
        },
        body: JSON.stringify({ presetId: args.presetId, apiKey }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, unknown>;
    if (body.ok !== true) return null;
    const models = Array.isArray(body.models)
      ? (body.models as DiscoveredModelOption[]).filter(
          (m) => m && typeof m.id === "string" && m.id.length > 0,
        )
      : [];
    if (models.length === 0) return null;
    return {
      source: body.source === "live" ? "live" : "static",
      models,
      ...(body.truncated === true ? { truncated: true } : {}),
      ...(typeof body.fallbackReason === "string"
        ? { fallbackReason: body.fallbackReason }
        : {}),
    };
  } catch {
    return null;
  }
}
