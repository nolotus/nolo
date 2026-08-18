/**
 * buildForkAgentFormData — 把一个公开 Agent 复制成「我自己的 Agent」所需的表单数据。
 *
 * 为什么是纯函数：复制逻辑（字段裁剪、安全脱敏、强制默认值）与 UI / Redux 无关，
 * 单独成模块便于测试，也避免在组件里写一堆分支判断。
 *
 * 设计原则：
 * - 守门先行：不允许复制 / 自定义或 CLI 来源（依赖作者本机凭证）直接返回 null。
 * - 安全第一：作者的私有引用（references）、白名单（whitelist）、凭证类字段一律丢弃或清空，
 *   绝不把别人的私有文档引用或 API Key 复制到当前用户名下。
 * - undefined 字段不出现：高级参数仅在源上「有定义」时才带上，避免用 undefined 覆盖服务端默认值。
 */

/** 复制时要原样带走的「能力/行为」字段。 */
const COPY_KEYS = [
  "prompt",
  "provider",
  "model",
  "introduction",
  "greeting",
  "tools",
  "hasVision",
  "hasImageOutput",
  "imageModel",
  "imageConfig",
  "imageWorkflow",
  "defaultInteractionMode",
  "enableThinking",
] as const;

/** 高级参数：仅当源上「有定义」（!== undefined）时才带上。 */
const OPTIONAL_NUMERIC_KEYS = [
  "temperature",
  "top_p",
  "max_tokens",
  "frequency_penalty",
  "presence_penalty",
  "reasoning_effort",
] as const;

/** 强制覆盖为「安全默认值」的字段：复制出来的副本必须是私有、不可再被复制、无凭证、无引用。 */
const FORCED_DEFAULTS: Record<string, unknown> = {
  isPublic: false,
  allowFork: false,
  whitelist: [],
  references: [],
  inputPrice: 0,
  outputPrice: 0,
  apiSource: "platform",
  useServerProxy: true,
  customProviderUrl: "",
  apiKey: "",
  apiKeyRef: "",
  apiKeyHeader: "",
  cliProvider: "",
  machineId: "",
};

/** 名字上限，与服务端/表单一致，防止超长标题。 */
const NAME_MAX_LENGTH = 50;

export interface BuildForkAgentFormDataOptions {
  /** 追加在源名后的后缀，默认「 副本」。 */
  nameSuffix?: string;
}

/**
 * 把源 Agent 转成可直接交给 `createAgent` 的 formData。
 * 不允许复制时返回 `null`，由调用方决定如何提示用户。
 */
export function buildForkAgentFormData(
  source: any,
  options?: BuildForkAgentFormDataOptions,
): Record<string, any> | null {
  if (!source || source.allowFork !== true) return null;

  // 自定义 / CLI agent 依赖作者本机凭证，复制到别人名下也无法运行，直接拒绝。
  if (source.apiSource && source.apiSource !== "platform") return null;

  const result: Record<string, any> = {};

  // 1) 复制能力/行为字段（仅当源上有定义时才写入，避免 undefined 污染）。
  for (const key of COPY_KEYS) {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }

  // 2) 高级参数：仅当源上 !== undefined 时才带上。
  for (const key of OPTIONAL_NUMERIC_KEYS) {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }

  // 3) 名字：源名为空时直接用「新 AI」；否则源名 + 后缀，trim 后截断到 50 字符。
  // 注意：后缀本身非空（默认「 副本」），若仅靠 baseName.trim() 判空会得到「副本」而非「新 AI」，
  // 因此必须先判断源名是否为空。
  const suffix = options?.nameSuffix ?? " 副本";
  const rawSourceName = source.name ?? "";
  const sourceNameTrimmed = String(rawSourceName).trim();
  const baseName =
    sourceNameTrimmed.length > 0
      ? `${sourceNameTrimmed}${suffix}`.trim()
      : "新 AI";
  result.name = baseName.slice(0, NAME_MAX_LENGTH);

  // 4) tags：源可能是数组或字符串，统一转成逗号分隔字符串（表单/服务端约定 tags 是 string）。
  const rawTags = source.tags;
  if (Array.isArray(rawTags)) {
    result.tags = rawTags.map((t: any) => String(t ?? "").trim()).filter(Boolean).join(",");
  } else if (typeof rawTags === "string") {
    result.tags = rawTags.trim();
  } else {
    result.tags = "";
  }

  // 5) 强制安全默认值，覆盖任何源上的危险字段。
  for (const [key, value] of Object.entries(FORCED_DEFAULTS)) {
    result[key] = value;
  }

  return result;
}