// packages/app/settings/web/dataSourcePluginsClient.ts
//
// 数据源插件开关的服务端通道（对齐 mediaAllowanceClient.ts 的「单一职责：请求 +
// 响应归一化，不含 UI」划分）。
//
// 端点（packages/server/plugins/dataSourceRoutes.ts 定义，两者都要鉴权）：
//   GET  /api/plugins/data-sources              → { plugins: [{ id, displayName, requiresCredential, enabled }] }
//   POST /api/plugins/data-sources/preferences  ← { pluginId, enabled } → { plugins: [...最新状态] }
//
// 列表的唯一真源是服务端注册表（DATA_SOURCE_PLUGIN_SPECS）：这里不硬编码任何
// 插件 id 或数量，后端新增数据源时前端自动出现一行。

export const DATA_SOURCES_ENDPOINT = "/api/plugins/data-sources";
export const DATA_SOURCES_PREFERENCES_ENDPOINT = "/api/plugins/data-sources/preferences";

export type DataSourcePlugin = {
  id: string;
  displayName: string;
  requiresCredential: boolean;
  enabled: boolean;
};

export type DataSourcePluginsResult =
  | { ok: true; plugins: DataSourcePlugin[] }
  | { ok: false; error: string };

const isDataSourcePlugin = (value: unknown): value is DataSourcePlugin => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const plugin = value as Record<string, unknown>;
  return (
    typeof plugin.id === "string" &&
    plugin.id.length > 0 &&
    typeof plugin.displayName === "string" &&
    typeof plugin.requiresCredential === "boolean" &&
    typeof plugin.enabled === "boolean"
  );
};

/**
 * 解析 `{ plugins: [...] }`。形状不符返回 null，由调用方按失败处理——
 * 不静默把坏数据当成空列表，否则「服务端坏了」会显示成「没有数据源」。
 */
export function parseDataSourcePlugins(payload: unknown): DataSourcePlugin[] | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const plugins = (payload as { plugins?: unknown }).plugins;
  if (!Array.isArray(plugins)) return null;
  if (!plugins.every(isDataSourcePlugin)) return null;
  return plugins.map((plugin) => ({
    id: plugin.id,
    displayName: plugin.displayName,
    requiresCredential: plugin.requiresCredential,
    enabled: plugin.enabled,
  }));
}

const errorTextFromPayload = (payload: unknown, status: number): string => {
  if (payload && typeof payload === "object") {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error) return error;
    // 鉴权失败的形状是 { error: { code, message, ... } }
    if (error && typeof error === "object") {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message) return message;
      const code = (error as { code?: unknown }).code;
      if (typeof code === "string" && code) return code;
    }
  }
  return `HTTP ${status}`;
};

async function callDataSourceEndpoint(args: {
  server: string;
  token: string;
  init?: { pluginId: string; enabled: boolean };
  fetchImpl?: typeof fetch;
}): Promise<DataSourcePluginsResult> {
  const { server, token, init, fetchImpl = fetch } = args;
  const isWrite = init !== undefined;
  try {
    const response = await fetchImpl(
      `${server}${isWrite ? DATA_SOURCES_PREFERENCES_ENDPOINT : DATA_SOURCES_ENDPOINT}`,
      {
        method: isWrite ? "POST" : "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(isWrite ? { "Content-Type": "application/json" } : {}),
        },
        body: isWrite ? JSON.stringify(init) : undefined,
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, error: errorTextFromPayload(payload, response.status) };
    }
    const plugins = parseDataSourcePlugins(payload);
    if (!plugins) return { ok: false, error: "invalid_response" };
    return { ok: true, plugins };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** 读取全部数据源与当前用户的开关状态。 */
export function loadDataSourcePlugins(args: {
  server: string;
  token: string;
  fetchImpl?: typeof fetch;
}): Promise<DataSourcePluginsResult> {
  return callDataSourceEndpoint(args);
}

/** 打开/关闭一个数据源，返回服务端的最新列表（权威）。 */
export function saveDataSourcePluginPreference(args: {
  server: string;
  token: string;
  pluginId: string;
  enabled: boolean;
  fetchImpl?: typeof fetch;
}): Promise<DataSourcePluginsResult> {
  return callDataSourceEndpoint({
    server: args.server,
    token: args.token,
    init: { pluginId: args.pluginId, enabled: args.enabled },
    fetchImpl: args.fetchImpl,
  });
}
