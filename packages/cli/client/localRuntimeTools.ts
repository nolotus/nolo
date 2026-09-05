import type {
  AgentRuntimeAgentConfig,
} from "../agentRuntimeLocal";
import type { EnvLike } from "./localRuntimeHelpers";
import {
  summarizeOpenAiToolNames,
} from "./localRuntimeDiagnostics";
import {
  shouldUseDeclaredOnlyLocalWorkspaceTools,
} from "./cliWorkspaceToolVariants";
import {
  buildLocalWorkspaceOpenAiTools,
  buildLocalWorkspaceToolset,
} from "../agentRuntimeLocal";
import {
  LOCAL_SERVER_TABLE_TOOL_NAME_SET,
  LOCAL_SERVER_WEB_TOOL_NAME_SET,
} from "./cliToolClassification";
import {
  FORCED_TOOLS,
  applyDisabledTools,
  expandEnabledPacks,
  resolveEffectiveEnabledPacks,
  addDefaultSystemCapabilityTools,
  applySystemBuiltinSkillFilter,
  appendEnabledPackPromptPatches,
  addDefaultLightWebToolsForConfiguredAgents,
} from "../../ai/tools/toolPacks";
import { resolveAgentRequiredPackIds } from "../../ai/tools/agentSkillConfig";
import { prepareTools } from "../../ai/tools/prepareTools";
import {
  filterToolNamesForRunKind,
  hasRunWakeChannel,
  isSubtaskRun,
} from "../../agent-runtime/agentRunIsolation";
import {
  CONTROL_AGENT_RUN_ACTIONS,
  buildControlAgentRunFunctionSchema,
} from "../../ai/tools/agent/controlAgentRunTool";
import { buildStartAgentRunFunctionSchema } from "../../ai/tools/agent/startAgentRunTool";
import { canonicalizeToolNames } from "../../ai/tools/toolNameAliases";
import {
  buildNoloWorkspaceOpenAiTools,
} from "../../agent-runtime/noloWorkspaceTools";
import { readXhsProfileFunctionSchema } from "../../ai/tools/readXhsProfileTool";
import { readXPostFunctionSchema } from "../../ai/tools/readXPostTool";
import { rememberMemoryFunctionSchema } from "../../ai/tools/rememberMemoryToolSchema";
import { queryMemoryFunctionSchema } from "../../ai/tools/queryMemoryToolSchema";
import { deleteMemoryFunctionSchema } from "../../ai/tools/deleteMemoryToolSchema";
import {
  parseJsonObject,
  buildDelegatedTaskContent,
} from "./cliProviderHelpers";
import { resolveRequestedRuntimeToolNames } from "../agentRuntimeLocal";

export function buildOpenAiTools(args: {
  agentKey?: string;
  toolNames?: string[];
  env: EnvLike;
}) {
  const toolset = buildLocalWorkspaceToolsetForEnv(args);
  const toolNameSet = new Set(args.toolNames ?? []);
  const uiAskChoiceTools = toolNameSet.has("ask_user")
    ? prepareTools(["ask_user"])
    : [];
  const readPastedTextTools = toolNameSet.has("readPastedText")
    ? [
        {
          type: "function",
          function: {
            name: "readPastedText",
            description:
              "Read a chunk of a large TUI paste by pasteId. Use startLine and endLine to page through the full content. " +
              "A truncated read appends the exact next startLine; a range already delivered earlier in this session " +
              "answers with a short notice instead of resending (pass force:true to refetch after context compaction).",
            parameters: {
              type: "object",
              properties: {
                pasteId: {
                  type: "integer",
                  minimum: 1,
                  description: "The paste id from the user message reference.",
                },
                startLine: {
                  type: "integer",
                  minimum: 1,
                  description: "First 1-based line to return; defaults to 1.",
                },
                endLine: {
                  type: "integer",
                  minimum: 1,
                  description:
                    "Last 1-based line to return; each call is bounded to a 200-line chunk (a slightly larger explicit range is honored in one call).",
                },
                force: {
                  type: "boolean",
                  description:
                    "Refetch even when the requested range was already delivered earlier in this session.",
                },
              },
              required: ["pasteId"],
              additionalProperties: false,
            },
          },
        },
      ]
    : [];
  return [
    ...uiAskChoiceTools,
    ...readPastedTextTools,
    ...buildLocalWorkspaceOpenAiTools({
      toolNames: toolset.toolNames,
      exposeShellTools: toolset.exposeShellTools,
    }),
    ...buildServerPlatformOpenAiTools({ toolNames: args.toolNames }),
    ...buildNoloWorkspaceOpenAiTools({ toolNames: args.toolNames }),
    ...buildOrchestrationOpenAiTools({
      toolNameSet,
      env: args.env,
    }),
  ];
}

/**
 * 编排工具（startAgentRun / controlAgentRun）的 cli-local 投影。
 *
 * 两处裁剪，动机不同，别合并：
 *
 * - startAgentRun 的 `wait` / `resultMode` **无条件**去掉。cli-local 的执行器
 *   （createCliStartAgentRunExecutor）永远 spawn 后立即返回，从不读这两个参数。
 *   留着就是 schema 在替执行器撒谎。这不是策略，是对齐事实。
 * - controlAgentRun 的 `wait` 动作**按唤醒通道**去掉。执行器是支持它的，但有
 *   终态唤醒时它是纯冗余：唤醒会把对话接回来。留着的实际代价是模型拿连续
 *   `wait` 当轮询用，而 wait 超时与 run 进程超时在返回载荷里共用 `status`
 *   字段，于是「我等超时了」被渲染成「它失败了」。有唤醒时同时把 status 收缩
 *   成诊断语义（wakeEnabled），顶层「跟进度」affordance 一并移除。
 */
function buildOrchestrationOpenAiTools(args: {
  toolNameSet: Set<string>;
  env: EnvLike;
}) {
  const names = ["startAgentRun", "controlAgentRun"].filter((name) =>
    args.toolNameSet.has(name),
  );
  if (names.length === 0) return [];
  const waitCapableActions = CONTROL_AGENT_RUN_ACTIONS.filter(
    (action) => action !== "wait",
  );
  const wakeChannel = hasRunWakeChannel(args.env);
  const controlSchema = buildControlAgentRunFunctionSchema({
    ...(wakeChannel ? { actions: waitCapableActions } : {}),
    wakeEnabled: wakeChannel,
  });
  const startSchema = buildStartAgentRunFunctionSchema({
    supportsWait: false,
    wakeEnabled: wakeChannel,
  });
  // prepareTools 的返回值与其内部缓存共享对象，只能替换不能就地改写。
  return prepareTools(names).map((tool: any) => {
    if (tool?.function?.name === "controlAgentRun") {
      return { ...tool, function: controlSchema };
    }
    if (tool?.function?.name === "startAgentRun") {
      return { ...tool, function: startSchema };
    }
    return tool;
  });
}

const CLI_DEFAULT_TOOLS = ["exa_search", "fetchWebpage", "ask_user"] as const;

function addDefaultCliCoreTools(
  toolNames: string[],
  env?: EnvLike,
  args?: { skipHostDefaults?: boolean },
): string[] {
  // FORCED_TOOLS 当前为空。ask_user 走 CLI_DEFAULT_TOOLS 默认注入（TUI 有
  // AskChoice dialog 交互通道）；headless/declared-only 模式仍不注入
  // （ask_user 需要交互，headless 无 requestUserChoice 通道）。
  // subtask（skipHostDefaults）同样跳过——exa_search/fetchWebpage/ask_user 是
  // 交互便利默认，叶子任务只保留显式声明（见 agentRunIsolation.ts 裁剪契约）。
  const declaredOnly =
    args?.skipHostDefaults === true ||
    (env ? shouldUseDeclaredOnlyLocalWorkspaceTools(env) : false);
  const injected = declaredOnly
    ? [...FORCED_TOOLS]
    : [...FORCED_TOOLS, ...CLI_DEFAULT_TOOLS];
  return [...new Set([...toolNames, ...injected])];
}

export function resolveCliEffectiveEnabledPacks(args: {
  enabledPacks?: string[] | null;
  /** 新三态字段；存在时以它为准，缺失则回落 enabledPacks。 */
  skills?: Record<string, unknown> | null;
  declaredOnly?: boolean;
  /** Subtask/leaf run：跳过 ALWAYS_ON（memory/skills）交互默认包。 */
  isSubtask?: boolean;
}): string[] {
  return resolveEffectiveEnabledPacks({
    enabledPacks: resolveAgentRequiredPackIds(args),
    declaredOnly: args.declaredOnly,
    // 子任务不继承 ALWAYS_ON 交互默认（memory/skills）——agent 显式声明
    // （enabledPacks / required skill packs）的包照常展开；code 兜底是
    // host-required，子任务保留（否则零声明叶子上没有任何文件/shell 工具）。
    includeAlwaysOnPacks: args.isSubtask !== true,
    emptyFallbackPacks: ["code"],
  });
}

export function withRuntimeEnabledPacksAndPrompt(
  config: AgentRuntimeAgentConfig,
): AgentRuntimeAgentConfig {
  const rawRecord = (config as unknown as { rawRecord?: Record<string, unknown> })
    .rawRecord ?? {};
  const enabledPacks =
    (config as unknown as { enabledPacks?: string[] }).enabledPacks ??
    (rawRecord.enabledPacks as string[] | undefined);
  const prompt = appendEnabledPackPromptPatches(
    (config as { prompt?: string }).prompt,
    enabledPacks,
  );
  if (
    prompt === (config as { prompt?: string }).prompt &&
    !enabledPacks?.length
  ) {
    return config;
  }
  return {
    ...config,
    ...(enabledPacks?.length ? { enabledPacks } : {}),
    ...(prompt ? { prompt } : {}),
  };
}

export function resolveCliRequestedToolNames(
  agentConfig: AgentRuntimeAgentConfig,
  env: EnvLike,
  systemBuiltinSkills?: Record<string, boolean> | null,
): string[] {
  const declaredOnly = shouldUseDeclaredOnlyLocalWorkspaceTools(env);
  const isSubtask = isSubtaskRun(env);
  // Subtask capability-surface trimming（契约见 agentRunIsolation.ts）：
  // 子任务跳过隐式交互便利默认——ALWAYS_ON memory/skills 包、CLI 默认
  // web/ask_user 工具、默认挂载的系统能力（agent-orchestration，反正最后
  // 也会被 run-kind 过滤剥掉，源头跳过避免先加后减）、LIGHT_WEB 同包伴随注入。
  // 显式 enabledPacks/direct tools、host-required 的 code 兜底、disabledTools
  // 最终优先、declared-only 语义、末尾的 run-kind 隔离过滤全部不变。
  const coreExpanded = addDefaultCliCoreTools(
    canonicalizeToolNames(
      expandEnabledPacks(
        resolveCliEffectiveEnabledPacks({
          enabledPacks: (agentConfig as any)?.enabledPacks,
          skills: (agentConfig as any)?.skills,
          declaredOnly,
          isSubtask,
        }),
        resolveRequestedRuntimeToolNames({ agentConfig }),
      ),
    ),
    env,
    { skipHostDefaults: isSubtask },
  );
  // 子任务不做 LIGHT_WEB 伴随注入：显式声明的 web 工具本身照常保留，
  // 只是隐式补齐的同包伙伴（如只声明 fetchWebpage 时的 exa_search）不再出现。
  const expanded = isSubtask
    ? coreExpanded
    : addDefaultLightWebToolsForConfiguredAgents(coreExpanded, agentConfig);
  const filtered = applySystemBuiltinSkillFilter(
    // Default-on system capabilities (agent-orchestration) are mounted for
    // every non-declared-only interactive agent before the global filter runs,
    // so the user's global "off" still wins. declared-only (ablation) and
    // subtask runs keep their strict surface.
    declaredOnly || isSubtask ? expanded : addDefaultSystemCapabilityTools(expanded),
    systemBuiltinSkills,
  );
  const afterDisabled = applyDisabledTools(
    filtered,
    (agentConfig as any)?.disabledTools,
  );
  // Agent-run isolation: dispatched subtasks (NOLO_AGENT_RUN_CHILD=1) lose
  // orchestration tools (startAgentRun/controlAgentRun/listAgents/... ) and
  // interaction tools (ask_user). The subtask keeps all "干活" tools.
  // Interactive runs unchanged. Applied at the tool-NAME layer so the
  // prepareTools cache key (built from this final list) stays coherent across
  // run kinds.
  return filterToolNamesForRunKind(afterDisabled, isSubtask);
}

export function resolveProviderOpenAiToolBundle(
  agentConfig: AgentRuntimeAgentConfig,
  env: EnvLike,
  buildTools: typeof buildOpenAiTools = buildOpenAiTools,
  additionalToolNames: string[] = [],
) {
  const requestedToolNames = [
    ...new Set([
      ...resolveCliRequestedToolNames(agentConfig, env, null),
      ...additionalToolNames,
    ]),
  ];
  const tools = buildTools({
    agentKey: agentConfig.key,
    toolNames: requestedToolNames,
    env,
  });
  return { requestedToolNames, tools };
}

export function buildLocalWorkspaceToolsetForEnv(args: {
  toolNames?: string[];
  env: EnvLike;
}) {
  const toolset = buildLocalWorkspaceToolset({
    declaredToolNames: args.toolNames,
    exposeShellTools: true,
    useDeclaredToolNamesOnly: shouldUseDeclaredOnlyLocalWorkspaceTools(
      args.env,
    ),
  });
  return toolset;
}

export function buildLocalPolicyToolNames(args: {
  agentKey?: string;
  toolNames?: string[];
  env: EnvLike;
  buildProviderOpenAiTools?: typeof buildOpenAiTools;
}) {
  const schemaBuilder = args.buildProviderOpenAiTools ?? buildOpenAiTools;
  const tools = schemaBuilder({
    agentKey: args.agentKey,
    toolNames: args.toolNames,
    env: args.env,
  });
  const policyNames = summarizeOpenAiToolNames(
    tools as Array<Record<string, unknown>>,
  );
  return [...new Set(policyNames)];
}

export function buildServerPlatformOpenAiTools(args: { toolNames?: string[] }) {
  const toolNameSet = new Set(args.toolNames ?? []);
  const tableTools = prepareTools(
    Array.from(toolNameSet).filter((name) =>
      LOCAL_SERVER_TABLE_TOOL_NAME_SET.has(name),
    ),
  );
  const webTools = prepareTools(
    Array.from(toolNameSet).filter((name) =>
      LOCAL_SERVER_WEB_TOOL_NAME_SET.has(name),
    ),
  );
  return [
    ...(toolNameSet.has("rememberMemory")
      ? [
          {
            type: "function",
            function: rememberMemoryFunctionSchema,
          },
        ]
      : []),
    ...(toolNameSet.has("queryMemory")
      ? [
          {
            type: "function",
            function: queryMemoryFunctionSchema,
          },
        ]
      : []),
    ...(toolNameSet.has("deleteMemory")
      ? [
          {
            type: "function",
            function: deleteMemoryFunctionSchema,
          },
        ]
      : []),
    ...(toolNameSet.has("read_xhs_profile")
      ? [
          {
            type: "function",
            function: readXhsProfileFunctionSchema,
          },
        ]
      : []),
    ...(toolNameSet.has("read_x_post")
      ? [
          {
            type: "function",
            function: readXPostFunctionSchema,
          },
        ]
      : []),
    ...tableTools,
    ...webTools,
  ];
}
