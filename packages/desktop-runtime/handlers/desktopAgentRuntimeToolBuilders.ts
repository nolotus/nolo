// packages/server/handlers/desktopAgentRuntimeToolBuilders.ts
// Desktop agent runtime tool 构建辅助函数——从 desktopAgentRuntimeTurnService.ts 提取。

import type { AgentRuntimeAgentConfig, AgentRuntimeMessageContent, AgentRuntimeToolCallInput, AgentRuntimeToolResult } from "agent-runtime";
import { resolvePlatformAuthToken } from "agent-runtime/providerResolution";
import type { DesktopAgentRuntimeActions } from "./desktopAgentRuntimeAdapter";
import { inferCaptureIntent } from "ai/policy/runtimePolicy";
import { parseNoloWorkspaceToolArguments } from "agent-runtime/noloWorkspaceTools";
import type { LocalAgentTurnResult } from "agent-runtime/localLoop";
import type { DesktopAgentRuntimeTurnInput } from "./desktopAgentRuntimeTurnService";
import type { DesktopAgentRuntimeEnv } from "./desktopAgentRuntimeHostFacts";
import { CHROME_CONNECTOR_TOOL_NAMES, type ChromeConnectorToolName } from "ai/tools/chromeConnectorTools";
import { buildCodeWorkSkillPrompt, CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS } from "ai/skills/codePlannerSkills";
import { buildLocalWorkspaceToolset, buildLocalWorkspacePolicyToolNames, buildLocalWorkspaceOpenAiTools } from "agent-runtime/localWorkspaceTools";
import { buildExternalOpenAiTools, filterExternalToolNames } from "agent-runtime/externalTools";
import { buildNoloWorkspaceOpenAiTools, filterNoloWorkspaceToolNames } from "agent-runtime/noloWorkspaceTools";
import { TOOL_PACKS, FORCED_TOOLS, applyDisabledTools, expandEnabledPacks, addDefaultLightWebToolsForConfiguredAgents } from "ai/tools/toolPacks";
// Re-export so downstream modules (desktopAgentRuntimeTurnService) keep importing
// from here without needing to know the shared implementation moved to toolPacks.
export { addDefaultLightWebToolsForConfiguredAgents };
import { prepareTools } from "ai/tools/prepareTools";
import { readXPostFunctionSchema } from "ai/tools/readXPostTool";
import { readXhsProfileFunctionSchema } from "ai/tools/readXhsProfileTool";
import { asTrimmedString } from "core/trimmedString";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";
import { asOptionalTrimmedString } from "core/optionalString";
import { normalizeServerOrigin } from "core/serverOrigin";
import { NOLO_CLUSTER_SERVERS, API_ENDPOINTS } from "database/config";
import { resolveDesktopRuntimeEntrypoint } from "agent-runtime/desktopRuntimeEntrypoint";
import { createChromeConnectorClient, createVerifiedChromeConnectorClient, executeChromeConnectorTool, type ChromeConnectorClient } from "desktop-chrome-connector/chromeConnector";
import { PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY } from "core/builtinAgents";

export const DESKTOP_SERVER_TABLE_TOOL_NAMES = ["createTable", "addTableRow", "addTableRows", "updateTableRow", "updateTableRows"] as const;
export const DESKTOP_SERVER_TABLE_TOOL_NAME_SET = new Set<string>(DESKTOP_SERVER_TABLE_TOOL_NAMES);
export const DESKTOP_SERVER_WEB_TOOL_NAMES = ["fetchWebpage", "exa_search", "firecrawl_scrape", "firecrawl_search"] as const;
export const DESKTOP_SERVER_WEB_TOOL_NAME_SET = new Set<string>(DESKTOP_SERVER_WEB_TOOL_NAMES);
export const DESKTOP_SERVER_START_AGENT_RUN_TOOL_NAME = "startAgentRun" as const;
export const DESKTOP_CHROME_CONNECTOR_TOOL_NAME_SET = new Set<string>(CHROME_CONNECTOR_TOOL_NAMES);
export const BUILTIN_NOLO_AGENT_ID = "01NOLOAPPBLD000000019KCKT0";
export const QUICK_CHAT_TIER_AGENT_KEYS = new Set<string>([PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY]);

export function collectAgentIdentityValues(agentConfig?: AgentRuntimeAgentConfig | null): string[] {
  return [
    agentConfig?.key,
    (agentConfig as any)?.id,
    (agentConfig as any)?.dbKey,
    (agentConfig as any)?.agentKey,
    (agentConfig as any)?.rawRecord?.dbKey,
    (agentConfig as any)?.rawRecord?.id,
    (agentConfig as any)?.rawRecord?.agentKey,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

/**
 * 判断 agentConfig 是否为 quick-chat 通用档内置 agent。
 * 同时检查 config.key 与 rawRecord 里的 dbKey，覆盖 record store 命中
 * 与 BUILTIN_PLATFORM_AGENT_CONFIGS 合成两种路径。
 */
export function isQuickChatTierAgent(agentConfig?: AgentRuntimeAgentConfig | null): boolean {
  return collectAgentIdentityValues(agentConfig).some((value) =>
    QUICK_CHAT_TIER_AGENT_KEYS.has(value),
  );
}


/**
 * workspaceToolsHint=true 时，通用档 agent 本轮挂载 code-planning skill：
 * 追加编译好的 skill prompt 协议（search-first / workspace / web / dispatch）。
 * 幂等：prompt 已包含协议时不重复追加。
 */
export function applyCodeWorkSkillPromptToTierAgentConfig(
  agentConfig: AgentRuntimeAgentConfig,
): AgentRuntimeAgentConfig {
  const skillPrompt = buildCodeWorkSkillPrompt();
  const basePrompt = asTrimmedString((agentConfig as any).prompt);
  const prompt = !basePrompt
    ? skillPrompt
    : basePrompt.includes(skillPrompt)
      ? basePrompt
      : `${basePrompt}\n\n${skillPrompt}`;
  return { ...agentConfig, prompt } as AgentRuntimeAgentConfig;
}

/**
 * workspaceToolsHint=true 时包装 loadAgentConfig：命中通用档 agent 则挂载
 * code-planning skill 的 prompt 协议（工具面在 resolveProvider 一侧注入）。
 */
export function wrapDesktopActionsWithCodeWorkSkillPack(
  base: DesktopAgentRuntimeActions,
  workspaceToolsHint: boolean,
): DesktopAgentRuntimeActions {
  if (!workspaceToolsHint) return base;
  return {
    ...base,
    loadAgentConfig: async (agentRef) => {
      const agentConfig = await base.loadAgentConfig(agentRef);
      if (!agentConfig || !isQuickChatTierAgent(agentConfig)) return agentConfig;
      return applyCodeWorkSkillPromptToTierAgentConfig(agentConfig);
    },
  };
}

export function extractDesktopTurnInputText(input: AgentRuntimeMessageContent | undefined) {
  if (typeof input === "string") return input;
  if (!Array.isArray(input)) return "";
  return input
    .flatMap((part) => part?.type === "text" && typeof part.text === "string" ? [part.text] : [])
    .join("\n")
    .trim();
}

export function isBuiltinNoloDesktopAgent(agentConfig?: AgentRuntimeAgentConfig | null) {
  const values = [
    agentConfig?.key,
    (agentConfig as any)?.id,
    (agentConfig as any)?.dbKey,
    (agentConfig as any)?.agentKey,
    (agentConfig as any)?.rawRecord?.id,
    (agentConfig as any)?.rawRecord?.dbKey,
    (agentConfig as any)?.rawRecord?.agentKey,
  ];
  return values.some((value) =>
    typeof value === "string" &&
    (
      value === BUILTIN_NOLO_AGENT_ID ||
      value === `agent-pub-${BUILTIN_NOLO_AGENT_ID}` ||
      value.endsWith(`-${BUILTIN_NOLO_AGENT_ID}`)
    )
  );
}

export function hasBrowserOperationIntent(text: string) {
  return /chrome|browser|浏览器|网页|网站|页面|打开\s*https?:\/\/|https?:\/\/|quick-chat|nolo\.chat/i.test(text);
}

export function hasNonBrowserDesktopIntent(text: string) {
  return /文件|目录|桌面|下载|download|folder|file|代码|code|repo|仓库|shell|命令|terminal|终端|对话|dialog|agent|space|table|表格|文档|doc/i.test(text);
}

export function narrowDesktopNoloToolsForTurn(args: {
  agentConfig?: AgentRuntimeAgentConfig | null;
  toolNames: string[];
  input?: AgentRuntimeMessageContent;
}) {
  if (!isBuiltinNoloDesktopAgent(args.agentConfig)) return args.toolNames;
  const inputText = extractDesktopTurnInputText(args.input);
  if (!inputText || !hasBrowserOperationIntent(inputText)) return args.toolNames;
  if (hasNonBrowserDesktopIntent(inputText)) return args.toolNames;
  const chromeToolNames = filterDesktopChromeConnectorToolNames(args.toolNames);
  return chromeToolNames.length > 0 ? chromeToolNames : args.toolNames;
}

export function resolveDesktopAgentRuntimeServerUrl(env: DesktopAgentRuntimeEnv) {
  return normalizeServerOrigin(env.NOLO_SERVER || env.BASE_URL || "https://nolo.chat");
}

export function resolveDesktopAgentRuntimeAuthToken(env: DesktopAgentRuntimeEnv) {
  // Single source of truth: a machine key (NOLO_MACHINE_API_KEY) is a valid
  // desktop server-proxy bearer, so delegate to resolvePlatformAuthToken.
  return resolvePlatformAuthToken(env);
}

export function createDesktopAgentRuntimeDialogId() {
  return crypto.randomUUID();
}

export function filterDesktopServerWebToolNames(toolNames?: string[]) {
  return (toolNames ?? []).filter((name) => DESKTOP_SERVER_WEB_TOOL_NAME_SET.has(name));
}

export function hasDesktopStartAgentRunTool(toolNames?: string[]) {
  return (toolNames ?? []).includes(DESKTOP_SERVER_START_AGENT_RUN_TOOL_NAME);
}

/**
 * Align userInput with server `buildDelegatedAgentInput` (task + optional INPUT block).
 * Keep inline (do not import agentDelegationServerTools — that module hard-depends on serverDb).
 */
export function buildDesktopDelegatedAgentInput(task: string, input: unknown): string {
  if (input === undefined || input === null) return task;
  if (typeof input === "string") {
    return `${task}\n\n--- INPUT (text) ---\n${input}`;
  }
  return `${task}\n\n--- INPUT (json) ---\n${JSON.stringify(input, null, 2)}`;
}

export function withDesktopDialogId(
  body: Record<string, unknown>,
  dialogId?: string,
): Record<string, unknown> {
  if (!dialogId || "dialogId" in body) return body;
  return { ...body, dialogId };
}

export function buildDesktopServerWebToolBody(
  toolName: (typeof DESKTOP_SERVER_WEB_TOOL_NAMES)[number],
  args: Record<string, any>,
  dialogId?: string,
): Record<string, unknown> {
  switch (toolName) {
    case "fetchWebpage":
      return withDesktopDialogId({ url: args.url }, dialogId);
    case "exa_search":
      return withDesktopDialogId({
        query: args.query,
        numResults: args.numResults ?? 5,
        contents: args.contents,
      }, dialogId);
    case "firecrawl_scrape":
      return withDesktopDialogId({
        url: args.url,
        onlyMainContent: args.onlyMainContent,
        timeout: args.timeout,
      }, dialogId);
    case "firecrawl_search":
      return withDesktopDialogId({
        query: args.query,
        limit: args.limit ?? 5,
        includeContent: args.includeContent,
        categories: args.categories,
        country: args.country,
      }, dialogId);
  }
}

export function buildDesktopServerPlatformOpenAiTools(args: { toolNames?: string[] }) {
  const toolNames = new Set(args.toolNames ?? []);
  const tableTools = prepareTools(
    (args.toolNames ?? []).filter((name) => DESKTOP_SERVER_TABLE_TOOL_NAME_SET.has(name)),
  );
  const webTools = prepareTools(filterDesktopServerWebToolNames(args.toolNames));
  // Prefer prepareTools registry schema over a direct client tool import
  // (that module also pulls Redux thunks unsuitable for the desktop server path).
  const startAgentRunTools = hasDesktopStartAgentRunTool(args.toolNames)
    ? prepareTools(["startAgentRun"])
    : [];
  return [
    ...(toolNames.has("read_xhs_profile")
      ? [{
          type: "function",
          function: readXhsProfileFunctionSchema,
        }]
      : []),
    ...(toolNames.has("read_x_post")
      ? [{
          type: "function",
          function: readXPostFunctionSchema,
        }]
      : []),
    ...startAgentRunTools,
    ...tableTools,
    ...webTools,
  ];
}

export function buildDesktopOpenAiTools(args: {
  toolNames?: string[];
  env: DesktopAgentRuntimeEnv;
  useDeclaredToolNamesOnly?: boolean;
}) {
  const toolset = buildDesktopLocalWorkspaceToolset(args);
  const forcedTools = prepareTools([...FORCED_TOOLS]);
  const tools: any[] = [
    ...forcedTools,
    ...buildLocalWorkspaceOpenAiTools({
      toolNames: toolset.toolNames,
      exposeShellTools: toolset.exposeShellTools,
    }),
    ...buildDesktopChromeConnectorOpenAiTools({
      toolNames: args.toolNames,
    }),
    ...buildDesktopServerPlatformOpenAiTools({ toolNames: args.toolNames }),
    ...buildNoloWorkspaceOpenAiTools({
      toolNames: args.toolNames,
    }),
  ];
  const externalToolNames = filterExternalToolNames(args.toolNames ?? []);
  if (externalToolNames.length > 0) {
    for (const tool of buildExternalOpenAiTools({
      toolNames: externalToolNames,
      authenticatedBillingContext: true,
    })) {
      tools.push(tool as any);
    }
  }
  return tools;
}

export function buildDesktopLocalWorkspaceToolset(args: {
  toolNames?: string[];
  env: DesktopAgentRuntimeEnv;
  useDeclaredToolNamesOnly?: boolean;
}) {
  void args.env;
  const toolNames = args.toolNames ?? [];
  // Exclude FORCED_TOOLS from the "all chrome connector?" check so injecting
  // ask_user doesn't flip a chrome-only agent into full-workspace mode.
  const nonForcedNames = toolNames.filter((n) => !(FORCED_TOOLS as readonly string[]).includes(n));
  const toolset = buildLocalWorkspaceToolset({
    declaredToolNames: toolNames,
    exposeShellTools: true,
    useDeclaredToolNamesOnly:
      args.useDeclaredToolNamesOnly === true
        ? true
        : nonForcedNames.length > 0 &&
          nonForcedNames.every((name) => DESKTOP_CHROME_CONNECTOR_TOOL_NAME_SET.has(name)),
  });
  return toolset;
}

export function buildDesktopLocalPolicyToolNames(args: {
  toolNames?: string[];
  env: DesktopAgentRuntimeEnv;
  useDeclaredToolNamesOnly?: boolean;
}) {
  void args.env;
  return [
    ...buildLocalWorkspacePolicyToolNames({
      declaredToolNames: args.toolNames,
      exposeShellTools: true,
      useDeclaredToolNamesOnly: args.useDeclaredToolNamesOnly === true,
    }),
    ...buildDesktopChromeConnectorPolicyToolNames({
      toolNames: args.toolNames,
    }),
    ...((args.toolNames ?? []).includes("read_x_post") ? ["read_x_post"] : []),
    ...((args.toolNames ?? []).includes("read_xhs_profile") ? ["read_xhs_profile"] : []),
    ...(args.toolNames ?? []).filter((name) => DESKTOP_SERVER_TABLE_TOOL_NAME_SET.has(name)),
    ...filterDesktopServerWebToolNames(args.toolNames),
    ...(hasDesktopStartAgentRunTool(args.toolNames) ? [DESKTOP_SERVER_START_AGENT_RUN_TOOL_NAME] : []),
    ...filterNoloWorkspaceToolNames(args.toolNames),
    ...filterExternalToolNames(args.toolNames),
  ];
}

export function filterDesktopChromeConnectorToolNames(toolNames?: string[]) {
  return (toolNames ?? []).filter((name): name is ChromeConnectorToolName =>
    DESKTOP_CHROME_CONNECTOR_TOOL_NAME_SET.has(name)
  );
}

export function buildDesktopChromeConnectorOpenAiTools(args: {
  toolNames?: string[];
}) {
  return prepareTools(filterDesktopChromeConnectorToolNames(args.toolNames))
    .map(stripActivityMetadataFromTool);
}

export function stripActivityMetadataFromTool(tool: Record<string, any>) {
  const properties = tool?.function?.parameters?.properties;
  if (!properties || typeof properties !== "object" || !("_activity" in properties)) {
    return tool;
  }
  const { _activity, ...nextProperties } = properties;
  void _activity;
  return {
    ...tool,
    function: {
      ...tool.function,
      parameters: {
        ...tool.function.parameters,
        properties: nextProperties,
      },
    },
  };
}

export function buildDesktopChromeConnectorPolicyToolNames(args: {
  toolNames?: string[];
}) {
  return filterDesktopChromeConnectorToolNames(args.toolNames);
}

export function buildDesktopChromeConnectorToolExecutors(args?: {
  client?: ChromeConnectorClient;
}) {
  const client = createVerifiedChromeConnectorClient({
    client: args?.client ?? createChromeConnectorClient(),
  });
  return Object.fromEntries(
    CHROME_CONNECTOR_TOOL_NAMES.map((toolName) => [
      toolName,
      (call: AgentRuntimeToolCallInput) => executeChromeConnectorTool({
        client,
        call,
      }),
    ]),
  ) as Record<ChromeConnectorToolName, (call: AgentRuntimeToolCallInput) => Promise<AgentRuntimeToolResult>>;
}

export type DesktopServerPlatformToolContext = {
  env: DesktopAgentRuntimeEnv;
  fetchImpl: typeof fetch;
  /** Parent turn dialog id (continueDialogId). Injected as dialogId for web tools / startAgentRun parent. */
  dialogId?: string;
  /** Parent dialog spaceId (resolved once even when cwd is explicit). */
  spaceId?: string;
  runtimeContext?: Record<string, any> | null;
  /** Parent agent ref for optional X-Nolo-Agent-Key. */
  parentAgentRef?: string;
};

export function buildDesktopServerPlatformToolExecutors(args: DesktopServerPlatformToolContext) {
  const postServer = async (path: string, body: object) => {
    const serverUrl = resolveDesktopAgentRuntimeServerUrl(args.env);
    const authToken = resolveDesktopAgentRuntimeAuthToken(args.env);
    if (!serverUrl) throw new Error("server platform tools require NOLO_SERVER or BASE_URL.");
    if (!authToken) throw new Error("server platform tools require AUTH_TOKEN.");
    const response = await args.fetchImpl(`${serverUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text().catch(() => "");
    if (!response.ok) {
      throw new Error(`server platform tool bridge failed: HTTP ${response.status} ${text.slice(0, 500)}`);
    }
    return text;
  };
  const guardExplicitTableCapture = (call: any) => {
    if (inferCaptureIntent(String(call.userInput ?? "")) === "strong") return null;
    return JSON.stringify({
      error: "knowledge_capture_requires_confirmation",
      message:
        "当前桌面运行不允许自动写入表格。只有当用户在当前请求里明确要求保存、建表、写入 table 或做成数据集时，才能继续；否则请先询问用户。",
      policy: {
        capability: "knowledge_capture",
        target: "table",
        mode: "explicit-only-desktop",
      },
    });
  };
  const tableExecutors = Object.fromEntries(
    DESKTOP_SERVER_TABLE_TOOL_NAMES.map((toolName) => [
      toolName,
      async (call: any) => {
        const blocked = guardExplicitTableCapture(call);
        if (blocked) {
          return {
            content: blocked,
            metadata: { serverPlatformTool: true, tableWriteBlocked: true },
          };
        }
        const parsed = parseNoloWorkspaceToolArguments(call.arguments);
        const path =
          toolName === "createTable" ? "/api/table/create"
          : toolName === "addTableRow" ? "/api/table/add-row"
          : toolName === "addTableRows" ? "/api/table/add-rows"
          : toolName === "updateTableRow" ? "/api/table/update-row"
          : "/api/table/update-rows";
        const content = await postServer(path, parsed);
        return {
          content,
          metadata: { serverPlatformTool: true, tableWrite: true },
        };
      },
    ]),
  );
  const webExecutors = Object.fromEntries(
    DESKTOP_SERVER_WEB_TOOL_NAMES.map((toolName) => [
      toolName,
      async (call: any) => {
        const parsed = parseNoloWorkspaceToolArguments(call.arguments);
        const path =
          toolName === "fetchWebpage" ? "/api/fetch-webpage"
          : toolName === "exa_search" ? "/api/exa-search"
          : toolName === "firecrawl_scrape" ? "/api/firecrawl-scrape"
          : "/api/firecrawl-search";
        // Body fields/defaults match externalContentServerTools; no local EXA/FIRECRAWL keys or billing.
        const content = await postServer(
          path,
          buildDesktopServerWebToolBody(toolName, parsed, args.dialogId),
        );
        return {
          content,
          metadata: { serverPlatformTool: true, webTool: toolName },
        };
      },
    ]),
  );
  return {
    ...tableExecutors,
    ...webExecutors,
  };
}

export type DesktopStartAgentRunWorkspaceAuthority =
  | { kind: "authorized"; root: string }
  | { kind: "none" };

export type DesktopStartAgentRunChildRunner = (
  input: DesktopAgentRuntimeTurnInput
) => Promise<LocalAgentTurnResult>;

