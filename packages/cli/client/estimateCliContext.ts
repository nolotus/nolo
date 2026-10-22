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
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveToolGuidedSections } from "../../ai/agent/toolGuidedSections";
import { estimateTokenCount } from "../../ai/context/tokenUtils";
import { estimateMessagesTokens } from "../../ai/context/contextOccupancy";
import { prepareTools } from "../../ai/tools/prepareTools";
import { expandEnabledPacks } from "../../ai/tools/toolPacks";
import { buildIdentityBlock } from "../../agent-runtime/identityBlock";
import { DELETE_SAFETY_RED_LINE } from "../../agent-runtime/deleteSafety";
import { CREDENTIAL_HYGIENE_RULE } from "../../agent-runtime/credentialHygiene";
import { PARALLEL_DISPATCH_DEFAULT_RULE } from "../../agent-runtime/parallelDispatchDefault";
import { PLATFORM_RISK_CONTROL_RULE } from "../../agent-runtime/platformRiskControl";
import { buildConsultationModeBlock } from "../../agent-runtime/consultationMode";
import {
  resolveResponseGuidelines,
  type ResponseViewport,
} from "../../agent-runtime/responseGuidelines";
import { buildUserResponseLanguageContext } from "../../agent-runtime/userResponseLanguage";
import {
  buildLocalWorkspaceOpenAiTools,
  buildLocalWorkspaceToolset,
} from "../../agent-runtime/localWorkspaceTools";
import { buildRuntimeGuidanceBlocks } from "../../agent-runtime/runtimeGuidance";
import { buildSkillDiscoveryContextBlock } from "../../agent-runtime/skillDiscovery";
import { canonicalizeToolNames } from "../../agent-runtime/toolNameAliases";

/** Default CLI packs when an agent does not declare enabledPacks. */
const DEFAULT_CLI_PACKS = ["code", "agent-orchestration", "skills"] as const;

/** Default CLI light-web tools (ask_user 已移出默认面，不再计入估算)。 */
const DEFAULT_CLI_PLATFORM_TOOLS = [
  "exa_search",
  "fetchWebpage",
] as const;

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
  for (const name of ["AGENTS.md", "agents.md"]) {
    const path = join(cwd, name);
    if (!existsSync(path)) continue;
    try {
      return readFileSync(path, "utf8");
    } catch {
      return "";
    }
  }
  return "";
}

function estimateToolSchemas(toolNames: string[]): number {
  const toolset = buildLocalWorkspaceToolset({
    declaredToolNames: toolNames,
    exposeShellTools: true,
  });
  const workspaceTools = buildLocalWorkspaceOpenAiTools({
    toolNames: toolset.toolNames,
    exposeShellTools: true,
  });
  const platformNames = DEFAULT_CLI_PLATFORM_TOOLS.filter((name) =>
    toolNames.includes(name),
  );
  const platformTools =
    platformNames.length > 0 ? prepareTools([...platformNames]) : [];
  return estimateTokenCount(JSON.stringify([...workspaceTools, ...platformTools]));
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

  const packTools = canonicalizeToolNames(
    expandEnabledPacks([...DEFAULT_CLI_PACKS], []),
  );
  const toolNames = canonicalizeToolNames([
    ...packTools,
    ...DEFAULT_CLI_PLATFORM_TOOLS,
  ]);

  const guidance = buildRuntimeGuidanceBlocks(toolNames);
  // Same table the runtimes inject, so the estimate tracks the orchestration /
  // review-gate sections too.
  const toolSections = resolveToolGuidedSections(toolNames);

  // 回复准则：与装配线同一个入口（resolveResponseGuidelines），按宿主能力取。
  // 默认 unknown 只计行为段；显式 narrow/wide 时另计一份对应排版段，与相同能力的
  // local 装配一致。远端 server 当前固定 unknown，TUI 使用 narrow 估算时会多计一份
  // 排版段；本函数不保证最终请求 token 精确相等。
  const responseGuidelines = resolveResponseGuidelines(
    opts.responseViewport ?? "unknown",
  );

  const systemParts = [
    // 与实际装配线一致：删除安全红线是系统提示词的最顶层块。
    DELETE_SAFETY_RED_LINE,
    CREDENTIAL_HYGIENE_RULE,
    PARALLEL_DISPATCH_DEFAULT_RULE,
    PLATFORM_RISK_CONTROL_RULE,
    buildConsultationModeBlock(),
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
    ...Object.values(toolSections),
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
  const toolNames = canonicalizeToolNames([
    ...canonicalizeToolNames(expandEnabledPacks([...DEFAULT_CLI_PACKS], [])),
    ...DEFAULT_CLI_PLATFORM_TOOLS,
  ]);

  const systemTokens = estimateTokenCount(buildCliEstimateSystemText(opts));
  const toolTokens = estimateToolSchemas(toolNames);
  // 守卫：若同时传入 messages 与 historyText，优先使用结构化的 messages（estimateMessagesTokens），避免双计历史。
  const historyTokens =
    opts.messages && opts.messages.length > 0
      ? estimateMessagesTokens(opts.messages)
      : opts.historyText
        ? estimateTokenCount(opts.historyText)
        : 0;
  return Math.max(0, systemTokens + toolTokens + historyTokens);
}
