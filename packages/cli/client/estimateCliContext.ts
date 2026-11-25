/**
 * Estimate the tokens a default CLI coding turn would send before any
 * provider usage report arrives (system layers + tool schemas).
 *
 * This is intentionally measured from the same builders the local runtime
 * uses — not a hardcoded floor — so the TUI context chip stays honest.
 */
import {
  BUILTIN_NOLO_AGENT_KEY,
  BUILTIN_NOLO_AGENT_MODEL,
  BUILTIN_NOLO_AGENT_NAME,
} from "core/builtinAgents";
import {
  resolveToolGuidedSections,
  TOOL_GUIDED_SECTION_ORDER,
} from "../../ai/agent/toolGuidedSections";
import { estimateTokenCount } from "../../ai/context/tokenUtils";
import { estimateMessagesTokens } from "../../ai/context/contextOccupancy";
import { buildIdentityBlock } from "../../agent-runtime/identityBlock";
import { buildPlatformStaticPromptBlocks } from "../../agent-runtime/platformStaticPromptLayers";
import {
  resolveResponseGuidelines,
  type ResponseViewport,
} from "../../agent-runtime/responseGuidelines";
import { buildUserResponseLanguageContext } from "../../agent-runtime/userResponseLanguage";
import { RUN_WAKE_CHANNEL_ENV } from "../../agent-runtime/agentRunIsolation";
import {
  INSTABOX_SCHEMA_EXPOSURE_ENV,
  MCP_EXPOSURE_ENV,
  buildLocalPolicyToolNames,
  buildOpenAiTools,
  resolveCliRequestedToolNames,
} from "./localRuntimeTools";
import { buildRuntimeGuidanceBlocks } from "../../agent-runtime/runtimeGuidance";
import { buildSkillDiscoveryContextBlock } from "../../agent-runtime/skillDiscovery";
import { canonicalizeToolNames } from "../../agent-runtime/toolNameAliases";
import { readAgentsMdLayerFromDisk } from "../../agent-runtime/agentsMd";

/**
 * 估算所依据的宿主环境：TUI 会话（context chip 的唯一调用方）带终态唤醒通道，
 * 与 readlineWorkspace 启动时设置的 `NOLO_RUN_WAKE=1` 同源——它决定 taskWait 与
 * controlAgentRun/startAgentRun 的 wake 形态是否出现在发给 provider 的 schema 里。
 */
const CLI_ESTIMATE_ENV = { [RUN_WAKE_CHANNEL_ENV]: "1" } as const;

/** 估算器入参里的宿主 env（与本地运行时同一份形状，不引入新概念）。 */
export type CliEstimateEnv = Record<string, string | undefined>;

/**
 * 估算所用的 env：**必须是运行时那一份**。
 *
 * 只写死 `{ NOLO_RUN_WAKE: "1" }` 会让估算器与实际装配分叉：运行时按
 * `NOLO_EXPOSE_MCP_TOOLS=1` 补上 3 个 MCP 工具 schema（约 385 token），按
 * `NOLO_EXPOSE_INSTABOX_PARAMS=1` 给 startAgentRun 补上 5 个 `instabox*` 参数
 * schema；估算器看不见这些开关，context chip 就会低报。这里只**透传这两个开关**
 * （不是整份 env：估算只关心影响工具面的变量，其余变量参与进来只会让口径漂移），
 * 缺省读 `process.env` 兜底，与宿主的真实来源一致。
 *
 * 两个开关都未设置时返回值与旧的 `CLI_ESTIMATE_ENV` 逐字相同，既有估算断言不受影响。
 */
function resolveEstimateEnv(env?: CliEstimateEnv): Record<string, string | undefined> {
  const source = env ?? process.env;
  const exposeMcp = String(source[MCP_EXPOSURE_ENV] ?? "").trim();
  const exposeInstaboxParams = String(
    source[INSTABOX_SCHEMA_EXPOSURE_ENV] ?? "",
  ).trim();
  return {
    ...CLI_ESTIMATE_ENV,
    ...(exposeMcp ? { [MCP_EXPOSURE_ENV]: exposeMcp } : {}),
    ...(exposeInstaboxParams
      ? { [INSTABOX_SCHEMA_EXPOSURE_ENV]: exposeInstaboxParams }
      : {}),
  };
}

/**
 * 默认 CLI 会话实际暴露的工具名集合：直接复用本地运行时的解析入口
 * （resolveCliRequestedToolNames：默认 packs + ALWAYS_ON memory/skills +
 * 默认挂载的 agent-orchestration + CLI 默认 web/ask_user/show_interaction 工具），
 * 而不是在估算器里再手抄一份会漂移的清单。
 */
function resolveDefaultCliToolNames(
  env: Record<string, string | undefined>,
): string[] {
  return canonicalizeToolNames(
    resolveCliRequestedToolNames(
      { key: BUILTIN_NOLO_AGENT_KEY } as Parameters<
        typeof resolveCliRequestedToolNames
      >[0],
      env,
      null,
    ),
  );
}

/**
 * 真正暴露给模型的工具名（= 生产 localLoop 里的 `exposedToolNames`）：
 * 请求名经同一个 `buildOpenAiTools` 构造后汇总出的 function 名。
 *
 * 两套名字必须分开：请求面（resolveCliRequestedToolNames）可能含本地 schema
 * 不兑现的条目（如 show_interaction 只在 web/server 投影里落地），拿请求名去
 * 解析工具引导段会白算一段永远不会生效的指引（估算虚高 149 tok，且与生产
 * 实际发给 provider 的 prompt 不一致）。显式声明 show_interaction 时它本就在
 * 暴露面里，行为不变。
 */
function resolveExposedCliToolNames(
  requestedToolNames: string[],
  env: Record<string, string | undefined>,
): string[] {
  return canonicalizeToolNames(
    buildLocalPolicyToolNames({
      agentKey: BUILTIN_NOLO_AGENT_KEY,
      toolNames: requestedToolNames,
      env,
    }),
  );
}

/**
 * 估算用的兜底 prompt——**近似基线，不是默认档的真实 prompt**。
 *
 * 默认档现在是 nolo，它的 prompt 是一段更长的路由人格，存在 agent 记录里；
 * 而本函数是同步纯计算、不读记录。所以调用方没传 agentPrompt 时估算会偏低。
 * 拿得到真实 prompt 的调用方应该显式传 `agentPrompt`。
 */
const DEFAULT_PROMPT_ESTIMATE_BASELINE =
  "你是共享空间里的高性价比通用 AI 助手。优先快速、直接、稳定地完成任务；需要推理时保持步骤清晰。";

function readAgentsMd(cwd: string): string {
  return readAgentsMdLayerFromDisk(cwd)?.content ?? "";
}

/** 与本地运行时同一个 schema 构造器（buildOpenAiTools），不再自拼子集。 */
function estimateToolSchemas(
  toolNames: string[],
  env: Record<string, string | undefined>,
): number {
  const tools = buildOpenAiTools({
    agentKey: BUILTIN_NOLO_AGENT_KEY,
    toolNames,
    env,
  });
  return estimateTokenCount(JSON.stringify(tools));
}

/** 估算器接受的入参（导出是为了让测试与调用方共用同一份形状）。 */
export type CliContextEstimateOptions = {
  cwd?: string;
  agentName?: string;
  agentKey?: string;
  model?: string;
  agentPrompt?: string;
  userLanguage?: string;
  /** 对话历史消息（如 /switch、/compact 之后或 provider 未回 usage 时的估算） */
  messages?: readonly { role?: string; content?: unknown }[];
  /** 纯文本历史或拼接内容 */
  historyText?: string;
  /**
   * 宿主的展示能力：决定是否把「响应展示指南」排版段计入估算。
   *
   * 默认 `"unknown"` 只计行为段；显式 narrow/wide 时另计一份对应排版段，与相同能力的
   * local 装配一致。远端 server 当前固定 unknown，TUI 使用 narrow 估算时会多计一份
   * 排版段；本函数不保证最终请求 token 精确相等。
   *
   * 调用方目前只有 TUI（context chip 的基线估算，见 packages/cli/tui/*），TUI 的
   * 每个调用点都显式传 `TUI_RESPONSE_VIEWPORT`（narrow），与发给 runtime 的能力同源。
   */
  responseViewport?: ResponseViewport;
  /**
   * 可选：宿主已确认「当前模型已是免付费池顶」（池内无更高且免付费的候选）。
   * 仅 true 时估算口径与生产装配一致地换成池顶姿态；缺省 undefined 时逐字不变。
   */
  callerIsPoolTop?: boolean;
  /**
   * 宿主 env（可选）。只为让估算看见**影响工具面**的开关——当前是
   * `NOLO_EXPOSE_MCP_TOOLS=1`（本地运行时据此补上 3 个 MCP 工具 schema）与
   * `NOLO_EXPOSE_INSTABOX_PARAMS=1`（据此给 startAgentRun 补上 5 个 `instabox*`
   * 参数 schema）。
   *
   * 缺省读 `process.env`：TUI 各调用点大多不持有 env，而这两个开关本来就是宿主
   * 进程级开关，兜底读进程环境与真实装配同源。传 `{}` 表示「明确没有宿主开关」，
   * 估算退回只含 wake 开关的默认口径。
   */
  env?: CliEstimateEnv;
};

/**
 * 组装「估算所依据的系统提示词文本」。
 *
 * 与 token 估算拆开，是为了让估算口径可被测试直接断言（哪一段在、哪一段不在），
 * 而不是只对着一个数字猜。`estimateDefaultCliContextTokens` 就是它 + 工具 +
 * 历史的 token 和。
 */
export function buildCliEstimateSystemText(
  opts: CliContextEstimateOptions = {},
): string {
  const cwd = opts.cwd?.trim() || process.cwd();
  // 兜底 = 默认档 nolo，全部从 builtinAgentCatalog 派生。这三行曾手抄
  // "deepseek-v4-flash" / "DeepSeek V4 Flash" / "agent-pub-deepseek-v4-flash"，
  // 前两个随换代过期，第三个还是早已废弃的历史别名（真 key 是确定性 seed id）。
  const model = opts.model?.trim() || BUILTIN_NOLO_AGENT_MODEL;
  const agentName = opts.agentName?.trim() || BUILTIN_NOLO_AGENT_NAME;
  const agentKey = opts.agentKey?.trim() || BUILTIN_NOLO_AGENT_KEY;
  const prompt = opts.agentPrompt?.trim() || DEFAULT_PROMPT_ESTIMATE_BASELINE;

  const toolNames = resolveDefaultCliToolNames(resolveEstimateEnv(opts.env));
  // 引导段按**暴露面**算，与生产 localLoop（agentConfig.exposedToolNames）同口径。
  const guidanceToolNames = resolveExposedCliToolNames(
    toolNames,
    resolveEstimateEnv(opts.env),
  );

  const guidance = buildRuntimeGuidanceBlocks(guidanceToolNames);
  // Same table the runtimes inject, so the estimate tracks the orchestration /
  // review-gate sections too.
  const toolSections = resolveToolGuidedSections(guidanceToolNames, {
    callerModel: opts.model?.trim() || undefined,
    callerIsPoolTop: opts.callerIsPoolTop,
  });

  // 回复准则：与装配线同一个入口（resolveResponseGuidelines），按宿主能力取。
  // 默认 unknown 只计行为段；显式 narrow/wide 时另计一份对应排版段，与相同能力的
  // local 装配一致。远端 server 当前固定 unknown，TUI 使用 narrow 估算时会多计一份
  // 排版段；本函数不保证最终请求 token 精确相等。
  const responseGuidelines = resolveResponseGuidelines(
    opts.responseViewport ?? "unknown",
  );

  const systemParts = [
    // 顶部固定平台层（唯一真源见 agent-runtime/platformStaticPromptLayers.ts）。
    ...buildPlatformStaticPromptBlocks(),
    prompt,
    opts.userLanguage?.trim()
      ? buildUserResponseLanguageContext({ language: opts.userLanguage })
      : "",
    buildIdentityBlock({
      agentName,
      agentId: agentKey,
      model,
    }),
    guidance.startupProtocol,
    guidance.contextLayerContract,
    guidance.emailRegistrationWorkflow,
    // 工具段的顺序以 TOOL_GUIDED_SECTION_ORDER 为准（localLoop 按它注入；
    // buildSystemPrompt 仍是手写层列表，需人工保持同序）；用 Object.values
    // 自行定序会与运行时装配分叉。
    ...TOOL_GUIDED_SECTION_ORDER.map((id) => toolSections[id] ?? ""),
    responseGuidelines.behavior,
    responseGuidelines.presentation,
    readAgentsMd(cwd),
    buildSkillDiscoveryContextBlock(cwd) ?? "",
  ];

  return systemParts.filter((part) => part?.trim()).join("\n\n");
}

/**
 * Estimate built-in context for the default CLI surface (flash tier).
 * Includes identity / guidance / time / AGENTS.md / skill index / tool schemas.
 *
 * 调用方目前只有 TUI（context chip）；TUI 的每个调用点都显式传
 * `responseViewport: TUI_RESPONSE_VIEWPORT`（narrow），与发给 runtime 的能力同源。
 * 未传时按 unknown 口径只计行为段。默认 unknown 只计行为段；显式 narrow/wide 时另计
 * 一份对应排版段，与相同能力的 local 装配一致。远端 server 当前固定 unknown，TUI 使用
 * narrow 估算时会多计一份排版段；本函数不保证最终请求 token 精确相等。
 */
export function estimateDefaultCliContextTokens(
  opts: CliContextEstimateOptions = {},
): number {
  const env = resolveEstimateEnv(opts.env);
  const toolNames = resolveDefaultCliToolNames(env);

  const systemTokens = estimateTokenCount(buildCliEstimateSystemText(opts));
  const toolTokens = estimateToolSchemas(toolNames, env);
  // 守卫：若同时传入 messages 与 historyText，优先使用结构化的 messages（estimateMessagesTokens），避免双计历史。
  const historyTokens =
    opts.messages && opts.messages.length > 0
      ? estimateMessagesTokens(opts.messages)
      : opts.historyText
        ? estimateTokenCount(opts.historyText)
        : 0;
  return Math.max(0, systemTokens + toolTokens + historyTokens);
}
