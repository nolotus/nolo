import { YAHOO_FINANCE_TOOLS_SCHEMA, getYahooFinanceQuote, getYahooFinanceHistorical } from "../integrations/yahoo-finance";
import { ARXIV_TOOLS_SCHEMA, searchArxivPapers } from "../integrations/arxiv";
import { WORLD_BANK_TOOLS_SCHEMA, getWorldBankIndicator } from "../integrations/world-bank";
import { SERPAPI_TOOLS_SCHEMA, searchGoogleScholar, searchGoogleWeb } from "../integrations/serpapi";
import type { AgentRuntimeToolCallInput, AgentRuntimeToolResult } from "./hostAdapter";
import { filterExternalToolNamesByDataSourcePlugins } from "./dataSourcePluginSpecs";

export const EXTERNAL_TOOL_NAMES = [
  "getYahooFinanceQuote",
  "getYahooFinanceHistorical",
  "searchArxivPapers",
  "getWorldBankIndicator",
  "searchGoogleScholar",
  "searchGoogleWeb",
] as const;

export type ExternalToolName = typeof EXTERNAL_TOOL_NAMES[number];

export function isExternalToolName(toolName: unknown): toolName is ExternalToolName {
  return typeof toolName === "string" && EXTERNAL_TOOL_NAMES.includes(toolName as ExternalToolName);
}

export function filterExternalToolNames(toolNames?: string[]) {
  return (toolNames ?? []).filter(isExternalToolName);
}

/**
 * 桌面端（desktop-runtime 本地嵌入式 server）当前**拿不到**用户的数据源开关：
 *
 * - 偏好只落在 server 侧 KV `data-source-pref:<userId>`（`packages/server/plugins/dataSourcePreferences`），
 *   写入通道是 `packages/server/coreRoutes` 上的 `/api/plugins/data-sources/preferences`
 *   （authenticateRequest → server 用户 id）。桌面嵌入式 server 只挂 `desktopRuntimeRoutes`，
 *   没有这条路由，也没有 UI 入口能打开数据源。
 * - 桌面身份是 `NOLO_LOCAL_USER_ID || NOLO_USER_ID || "local"`，与 server 的登录 userId 不是同一个键空间。
 * - desktop-runtime 不允许 import `packages/server/*`（见 `packages/desktop-runtime/entry.ts`
 *   顶部约定：不依赖云端私有模块，`dataSourceRoutes` 又依赖 `auth/utils`）。
 *
 * 结论：桌面端**默认不放行**数据源工具（fail-closed），并复用 server 同一个判定函数
 * `filterExternalToolNamesByDataSourcePlugins`，只是把「已启用集合」传成空集合——
 * 不是另一套判定逻辑，因此不可能出现「server 关了、desktop 还能用」。
 *
 * 将来桌面端若打通偏好读取（例如注入 enabled ids 或新增本地偏好通道），
 * 只改这一个常量/参数即可，不要在桌面侧另写过滤逻辑。
 */
export const DESKTOP_ENABLED_DATA_SOURCE_PLUGIN_IDS: readonly string[] = Object.freeze([]);

export function filterExternalToolNamesForDesktop(toolNames?: string[]) {
  return filterExternalToolNamesByDataSourcePlugins(
    filterExternalToolNames(toolNames),
    DESKTOP_ENABLED_DATA_SOURCE_PLUGIN_IDS,
  );
}

export function buildExternalOpenAiTools(args: { toolNames?: string[], authenticatedBillingContext?: boolean }) {
  const toolNames = new Set(args.toolNames ?? []);
  const allSchemas: any[] = [
    ...YAHOO_FINANCE_TOOLS_SCHEMA,
    ...ARXIV_TOOLS_SCHEMA,
    ...WORLD_BANK_TOOLS_SCHEMA,
  ];
  if (args.authenticatedBillingContext) {
    allSchemas.push(...SERPAPI_TOOLS_SCHEMA);
  }
  return allSchemas.filter((schema: any) => toolNames.has(schema.function.name));
}

export function buildExternalToolExecutors(args?: {
  toolNames?: string[];
  authenticatedBillingContext?: {
    onPreflight: (toolName: string) => Promise<void>;
    onCharge: (toolName: string) => Promise<void>;
  };
}) {
  const executors: Record<string, (call: AgentRuntimeToolCallInput) => Promise<AgentRuntimeToolResult>> = {};
  const toolNames = args?.toolNames;

  if (!toolNames || toolNames.includes("getYahooFinanceQuote")) {
    executors.getYahooFinanceQuote = async (call) => {
      try {
        const { symbol } = JSON.parse(call.arguments);
        const data = await getYahooFinanceQuote(symbol);
        return {
          id: call.id,
          name: call.name,
          content: JSON.stringify(data, null, 2),
        };
      } catch (e: any) {
        return { id: call.id, name: call.name, content: `Error: ${e.message}`, isError: true };
      }
    };
  }

  if (!toolNames || toolNames.includes("getYahooFinanceHistorical")) {
    executors.getYahooFinanceHistorical = async (call) => {
      try {
        const { symbol, period1, period2 } = JSON.parse(call.arguments);
        const data = await getYahooFinanceHistorical(symbol, period1, period2);
        return {
          id: call.id,
          name: call.name,
          content: JSON.stringify(data, null, 2),
        };
      } catch (e: any) {
        return { id: call.id, name: call.name, content: `Error: ${e.message}`, isError: true };
      }
    };
  }

  if (!toolNames || toolNames.includes("searchArxivPapers")) {
    executors.searchArxivPapers = async (call) => {
      try {
        const { query, maxResults } = JSON.parse(call.arguments);
        const data = await searchArxivPapers(query, maxResults);
        return {
          id: call.id,
          name: call.name,
          content: JSON.stringify(data, null, 2),
        };
      } catch (e: any) {
        return { id: call.id, name: call.name, content: `Error: ${e.message}`, isError: true };
      }
    };
  }

  if (!toolNames || toolNames.includes("getWorldBankIndicator")) {
    executors.getWorldBankIndicator = async (call) => {
      try {
        const { countryCode, indicatorCode } = JSON.parse(call.arguments);
        const data = await getWorldBankIndicator(countryCode, indicatorCode);
        return {
          id: call.id,
          name: call.name,
          content: JSON.stringify(data, null, 2),
        };
      } catch (e: any) {
        return { id: call.id, name: call.name, content: `Error: ${e.message}`, isError: true };
      }
    };
  }

  if (args?.authenticatedBillingContext) {
    if (!toolNames || toolNames.includes("searchGoogleScholar")) {
      executors.searchGoogleScholar = async (call) => {
        try {
          await args.authenticatedBillingContext!.onPreflight(call.name);
          const { query, num } = JSON.parse(call.arguments);
          const data = await searchGoogleScholar(query, num);
          await args.authenticatedBillingContext!.onCharge(call.name);
          return {
            content: JSON.stringify(data, null, 2),
          };
        } catch (e: any) {
          return { content: `Error: ${e.message}`, metadata: { isError: true } };
        }
      };
    }

    if (!toolNames || toolNames.includes("searchGoogleWeb")) {
      executors.searchGoogleWeb = async (call) => {
        try {
          await args.authenticatedBillingContext!.onPreflight(call.name);
          const { query, num } = JSON.parse(call.arguments);
          const data = await searchGoogleWeb(query, num);
          await args.authenticatedBillingContext!.onCharge(call.name);
          return {
            content: JSON.stringify(data, null, 2),
          };
        } catch (e: any) {
          return { content: `Error: ${e.message}`, metadata: { isError: true } };
        }
      };
    }
  }

  return executors;
}
