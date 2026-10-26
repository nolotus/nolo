/**
 * 纯数据的数据源插件注册表（data-source plugins）。
 *
 * 与 cloudPlugins/*（云平台执行插件，带凭据与授权模型）是两套东西：
 * 这里只描述「哪些外部数据源工具属于哪个用户级开关」，零 I/O、零依赖，
 * 让 server（注入面 / 执行期强制 / API）、Web、Node 都能安全引用。
 *
 * 语义：数据源默认关闭（defaultEnabled: false）。用户没显式开启时，
 * 工具既不该进 agent 的工具面（surface），也不该被执行（执行期二次强制）。
 */

export type DataSourcePluginId =
  | "yahoo-finance"
  | "arxiv"
  | "world-bank"
  | "serpapi";

export type DataSourcePluginKind = "data-source";

export type DataSourcePluginSpec = {
  readonly id: DataSourcePluginId;
  readonly displayName: string;
  readonly kind: DataSourcePluginKind;
  /**
   * 该数据源是否需要用户侧凭据（目前只有 serpapi 需要 key）。
   * 本轮只管开关，凭据本身仍由既有通道管理。
   */
  readonly requiresCredential: boolean;
  /** 一律 false：任何未显式开启的数据源都视为关闭（fail-closed 的前提）。 */
  readonly defaultEnabled: false;
  /** 归属该数据源的外部工具名（必须与 externalTools.ts 的 EXTERNAL_TOOL_NAMES 全覆盖对齐）。 */
  readonly toolNames: readonly string[];
};

export const DATA_SOURCE_PLUGIN_SPECS: readonly DataSourcePluginSpec[] = Object.freeze([
  Object.freeze({
    id: "yahoo-finance",
    displayName: "Yahoo Finance",
    kind: "data-source",
    requiresCredential: false,
    defaultEnabled: false,
    toolNames: Object.freeze(["getYahooFinanceQuote", "getYahooFinanceHistorical"]),
  }),
  Object.freeze({
    id: "arxiv",
    displayName: "arXiv",
    kind: "data-source",
    requiresCredential: false,
    defaultEnabled: false,
    toolNames: Object.freeze(["searchArxivPapers"]),
  }),
  Object.freeze({
    id: "world-bank",
    displayName: "World Bank",
    kind: "data-source",
    requiresCredential: false,
    defaultEnabled: false,
    toolNames: Object.freeze(["getWorldBankIndicator"]),
  }),
  Object.freeze({
    id: "serpapi",
    displayName: "SerpApi",
    kind: "data-source",
    requiresCredential: true,
    defaultEnabled: false,
    toolNames: Object.freeze(["searchGoogleScholar", "searchGoogleWeb"]),
  }),
] as const);

export const DATA_SOURCE_PLUGIN_IDS: readonly DataSourcePluginId[] = Object.freeze(
  DATA_SOURCE_PLUGIN_SPECS.map((spec) => spec.id),
) as readonly DataSourcePluginId[];

export function isDataSourcePluginId(value: unknown): value is DataSourcePluginId {
  return typeof value === "string" && (DATA_SOURCE_PLUGIN_IDS as readonly string[]).includes(value);
}

export function getDataSourcePluginSpec(value: unknown): DataSourcePluginSpec | undefined {
  return isDataSourcePluginId(value)
    ? DATA_SOURCE_PLUGIN_SPECS.find((spec) => spec.id === value)
    : undefined;
}

/** 工具名 → 所属数据源；未登记的工具名返回 undefined。 */
export function getDataSourcePluginSpecForToolName(
  toolName: unknown,
): DataSourcePluginSpec | undefined {
  if (typeof toolName !== "string") return undefined;
  return DATA_SOURCE_PLUGIN_SPECS.find((spec) => spec.toolNames.includes(toolName));
}

/**
 * 把任意来源的字符串列表收敛成合法 id 列表（去重、保持注册表顺序）。
 * 用于清洗持久化偏好——库里存了旧数据/垃圾值时不能把非法 id 传下去。
 */
export function normalizeDataSourcePluginIds(values: readonly unknown[] | undefined): DataSourcePluginId[] {
  const seen = new Set<DataSourcePluginId>();
  for (const value of values ?? []) {
    if (isDataSourcePluginId(value)) seen.add(value);
  }
  return DATA_SOURCE_PLUGIN_IDS.filter((id) => seen.has(id));
}

/** 已启用数据源覆盖到的工具名集合。 */
export function enabledDataSourceToolNames(
  enabledIds: readonly unknown[] | undefined,
): Set<string> {
  const normalized = new Set(normalizeDataSourcePluginIds(enabledIds));
  const names = new Set<string>();
  for (const spec of DATA_SOURCE_PLUGIN_SPECS) {
    if (!normalized.has(spec.id)) continue;
    for (const toolName of spec.toolNames) names.add(toolName);
  }
  return names;
}

/**
 * 注入面过滤：外部工具名里只保留「用户已启用的数据源」覆盖的那些。
 * 未启用的工具根本不进工具面（不是注入了再在执行期拒绝）。
 * enabledIds 为空 = 全部关闭（fail-closed）。
 */
export function filterExternalToolNamesByDataSourcePlugins(
  toolNames: readonly string[] | undefined,
  enabledIds: readonly unknown[] | undefined,
): string[] {
  const allowed = enabledDataSourceToolNames(enabledIds);
  return (toolNames ?? []).filter((name) => allowed.has(name));
}

export function isDataSourceToolName(toolName: unknown): boolean {
  return getDataSourcePluginSpecForToolName(toolName) !== undefined;
}

/** 执行期拒绝时给用户看的一句话（toolExecutor 与测试共用同一个措辞来源）。 */
export function dataSourcePluginDisabledMessage(pluginId: DataSourcePluginId): string {
  return `data source plugin "${pluginId}" is disabled for this user`;
}
