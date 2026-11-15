import { contextRefusalDiagnostics, describeContextRefusal } from "../client/contextRefusal";
import { prepareChildRunConsumption } from "./childRunConsumption";
import { traceChildRunWake, queueWakeFields } from "./runWakeDiagnostics";
import { getOrCreateSharedStore } from "../client/localRuntimeDialog";
import { saveCliPendingUserMessages, readCliPendingUserMessages, resolveCliUnknownBatchWithoutResend, markCliUserBatchPhase, rollbackCliUserBatchPhase } from "../client/localDialogRecords";
import { resolveLocalUserId } from "../client/cliAgentConfigHelpers";
import { hostTaskEventsRoot, readHostTask } from "../client/hostTaskEvents";
import { runAutoReviewDrainedTurn, isHostAutoReviewContinuationEvent } from "./autoReviewContinuationWake";
import { resolveTuiLearnOperatorUserId } from "./learnPrompt";
import { randomUUID as mintTaskUserMessageId, createHash as hashTaskUserMessage } from "node:crypto";
import { collectHostTaskWorkspace } from "../client/hostTaskWorkspace";
import { currentAutoReviewTask } from "./autoReviewControl";
import type { ShellApprovalSession } from "../client/originShellApprovalTransport";
/**
 * tuiTurnRunner — TUI turn 执行与队列 drain 的独立模块（S3 迁移）。
 *
 * 从 readlineWorkspace.ts 原样迁入（语义不变，仅文件级函数形态搬运）：
 *   - AgentTurnContext 类型 + 文件级 runOneAgentTurn / ensureChatQueueBinding /
 *     preemptAndAbortForDrain（S2 产物，双 Esc 回归测试保护的核心）；
 *   - 前奏区中型函数：runAgentChat、waitForActionGate、waitForRawActionGate、
 *     readAgentsMdLayer；
 *   - 随迁共享小件：WorkspaceOptions / SelfUpdater / RawModeInput 类型、
 *     isInteractiveInput、AGENTS_MD_MAX_BYTES。
 *
 * 依赖方向约束：本模块禁止 import readlineWorkspace.ts。所有可变状态
 * （forcedStop / forcedStopEpoch / turnEpoch / activeTurnAbort / activeTurnEpoch
 * 及 fixedInput 等闭包绑定）一律经 AgentTurnContext 的 getter/setter 双向代理，
 * 由调用方 runTuiWorkspace 装配，本模块不做任何模块级可变单例。
 */
import type { createInterface } from "node:readline";
import { scrubSecrets } from "agent-runtime/secretScrubber";
import { setSecret } from "core/secretsStore";
import { defaultPromptReader } from "../secretCommands";
import {
  runAgentTurn,
  isLocalContextCoverageFailure,
  OWNER_OAUTH_UNAVAILABLE_HINT,
  isOwnerOAuthUnavailableError,
  isInvalidGrantError,
  type RunAgentTurnResult,
} from "../client/agentRun";
import { appendTurnBillingAudit } from "../client/turnBillingAudit";
import {
  createCliLocalRuntimeAdapter,
  type UserChoiceRequest,
  type UserChoiceResult,
} from "../client/localRuntimeAdapter";
import { resolveSkillReference, buildSkillContextBlocks } from "../agentRunPrompts";
import {
  parseSkillSlashReference,
  resolveSkillSlashUserPrompt,
} from "../../agent-runtime/skillSlashReference";
import { buildLoadSkillExecutor } from "../../agent-runtime";
import { parseExternalSkillMarkdown } from "../../ai/skills/skillDocProtocol";
import { buildSkillDiscoveryContextLayer } from "../../agent-runtime/skillDiscovery";
import { buildHostEnvironmentLayer } from "../../agent-runtime/hostEnvironment";
import { readAgentsMdLayerFromDisk } from "../../agent-runtime/agentsMd";
import {
  buildMemoryOverlayLayer,
  buildMemoryUseGuidanceLayer,
  partitionScopedBlocks,
  renderTurnContextBlocksWithScope,
  type TurnContextLayer,
} from "../../agent-runtime/turnContext";
import { resolvePlatformAuthToken } from "../../agent-runtime/providerResolution";
import { resolveCliMemory } from "../memoryRecall";
import { readDbRecord } from "../agentRecordHelpers";
import { estimateTokenCount } from "../../ai/context/tokenUtils";
import {
  estimateMessagesTokens,
  historyTokensBeforeLatestAssistant,
} from "../../ai/context/contextOccupancy";
import { estimateDefaultCliContextTokens } from "../client/estimateCliContext";
import {
  resolveAgentContextWindow,
  platformCreditsFromUsage,
  resolveAgentModelIdentity,
  computeBaselineContextTokens,
  preserveContextUsageWithoutReceipt,
  resolveAuthorityTurnCount,
} from "../client/tokenUsage";
import { createLiveTurnTracker } from "./liveTurnTracker";
import type { LocalAgentActionGate, LocalAgentLoopEvent } from "../../agent-runtime/localLoop";
import type { ContextBlockScope } from "../../agent-runtime/contextBlockScope";
import {
  readCommandActionGatePayload,
  type PermissionRequest,
} from "../../agent-runtime/actionGate";
import type { AgentRuntimeToolResult } from "../agentRuntimeLocal";
import type { OriginShellGrant } from "../client/originShellGrant";
import type { ToolExecutionLocation } from "../../agent-runtime/ownerOriginExecution";
import type { CompactDialogResult } from "../client/compactDialog";
import { isBalanceExhaustedError, isQuotaExhaustedError } from "../agentRunCommand";
import { backfillRunRecordParentDialog } from "../agentRunControl";
import type { SelfUpdateExecution } from "../updateCommands";
import type { SpawnFn, spawnProcess } from "../processSpawn";
import type { loadDialogHistoryForDisplay, runDialogPicker } from "./dialogPicker";
import type { saveProfileAgentSelection } from "../client/profileConfig";
import { runAskChoiceDialog } from "./askChoiceDialog";
import type { DialogHost } from "./dialogHost";
import { runConfirmDialog } from "./confirmDialog";
import type { ActivityIndicator, AgentRunStatusSnapshot } from "./activityIndicator";
import type { RemoteTaskSource, RunRegistryPoller } from "./runRegistryPoller";
import {
  buildWakeMessage,
  type RunCompletionWatcher,
} from "./runCompletionWatcher";
import { matchContextualFragment } from "../../chat/messages/contextualFragment";
import {
  createTurnRequest,
  type ChildRunCompletedTurnEvent,
  type InternalTurnEvent,
  type TurnRequest,
} from "core/chat/internalTurnEvent";
import { DEFAULT_TUI_AGENT_KEY, type TuiState } from "./session";
// TUI 是窄屏终端：context chip 的估算按窄屏口径计一份排版段，才不会低估。
// 取值与 runtime 调用点共用 TUI_RESPONSE_VIEWPORT（见 ./responseViewport），
// 不在这里另立字面量——两处必须始终是同一个能力，否则估算与注入对不上。
import { TUI_RESPONSE_VIEWPORT } from "./responseViewport";
import type { AttachedImage } from "./pasteImage";
import type { ClipboardImageDeps } from "./clipboardImage";
import { dimCliText, resolveCliColorEnabled } from "../client/terminalStyles";
import {
  buildNoticeTasksFromRuns,
  mergeNoticeGroup,
  setTurnNoticeMeta,
} from "./completionNoticeDisplay";
import type { CollapsedPasteStore } from "../../core/collapsedPaste";
import { toErrorMessage } from "core/errorMessage";
import { t } from "./i18n";
import { createChatQueueTuiBinding, type ChatQueueTuiBinding } from "./chatQueueTuiBinding";
import { attachDialogNotifyReceiver, type DialogNotifyReceiver } from "./dialogNotifyReceiver";
import { prepareQueuedUserRequest } from "./queuedUserAttachments";
// 附件延迟解析的旧导出面保持不变（实现已迁至 ./queuedUserAttachments）。
export { prepareQueuedUserRequest };
import { createTurnInjectionInbox, type TurnInjectionInbox } from "./turnInjectionInbox";
import {
  annotatePendingProcessNoticeOrigin,
  buildProcessTerminalTurnMessage,
  parsePendingProcessNoticeLine,
  serializePendingProcessNotice,
  type ProcessTerminalNotice,
} from "./processTerminalNotice";
import type { AgentRunCompletionShape } from "./runCompletionWatcher";
import { emitTerminalProgramStatus } from "../client/terminalProgramStatus";
import {
  isRunResultStalledOrTruncated,
  resolveTerminalProgramStatusState,
} from "../client/terminalRunStatus";
import {
  emitTerminalAttention,
  runWithInputRequiredAttention,
  shouldEmitTerminalBell,
  TURN_COMPLETION_ATTENTION_THRESHOLD_MS,
} from "./terminalNotification";
import {
  createHistoryOutputStream,
  startTurn,
  appendToCurrentTurn,
  finalizeCurrentTurn,
  type TurnHistory,
} from "./tuiHistory";
import type { FixedInputController } from "./tuiRawInput";
import type { IdleHeapReleaser } from "../idleHeapRelease";
import { withSuspendedRenderer } from "./suspendedRenderer";

/** Max bytes of AGENTS.md/CLAUDE.md to inject — prevents context window overflow. */
// AGENTS.md 读取已收敛到 agent-runtime/agentsMd 的 readAgentsMdLayerFromDisk
//（TUI / CLI / desktop 三 host 共享同一实现，含 8KB 截断与 CLAUDE.md 回退）。

export type SelfUpdater = (
  output: NodeJS.WritableStream
) => Promise<SelfUpdateExecution>;

export type WorkspaceOptions = {
  scriptDir: string;
  env?: NodeJS.ProcessEnv;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  agentRunner?: typeof runAgentTurn;
  compactRunner?: (options: {
    serverUrl: string;
    authToken: string;
    dialogId: string;
    summaryLlmCaller?: (content: string) => Promise<string | null>;
  }) => Promise<CompactDialogResult>;
  dialogPickerRunner?: typeof runDialogPicker;
  dialogHistoryLoader?: typeof loadDialogHistoryForDisplay;
  selfUpdater?: SelfUpdater;
  /**
   * Spawn seam for the default selfUpdater's `runSelfUpdateDetailed` call
   * (test-only; production falls back to `resolveDefaultSpawn()`).
   * Not forwarded to `spawnRunner` — that one drives TUI gates/watchers.
   */
  selfUpdateSpawn?: SpawnFn;
  spawnRunner?: typeof spawnProcess;
  /** Injected summary LLM caller for /compact compression. Wired by localRuntimeAdapter. */
  summaryLlmCaller?: (content: string) => Promise<string | null>;
  fetchImpl?: typeof fetch;
  saveAgentSelection?: typeof saveProfileAgentSelection;
  clipboardWriter?: (text: string) => Promise<void>;
  clipboardReader?: () => Promise<string>;
  clipboardImageReader?: (deps?: ClipboardImageDeps) => Promise<AttachedImage>;
  /** 外部注入的远程任务取数源（测试/特定宿主自定义取数时使用，未传入时回退默认实现） */
  remoteTasks?: RemoteTaskSource;
};


export type RawModeInput = NodeJS.ReadableStream & {
  isRaw?: boolean;
  setRawMode: (mode: boolean) => unknown;
};


async function runAgentChat(
  scriptDir: string,
  state: TuiState,
  message: string,
  env: NodeJS.ProcessEnv,
  output: NodeJS.WritableStream,
  agentRunner: typeof runAgentTurn = runAgentTurn,
  options: {
    freshDialog?: boolean;
    userMessages?: import("../client/agentRunTypes").RunAgentTurnOptions["userMessages"];
    /** Explicit stable queued-batch tail id; forwarded to agentRunner. */
    cliBatchId?: string;
    accountTaskUserSource?: { messageId: string; contentSha256: string; originalText: string };
    imageUrls?: string[];
    /**
     * 本机原件路径（图片 / 音视频）→ 只产出给模型的安全附件卡（name/mime/size/kind），
     * 绝不把 path / machineId 上行（见 packages/cli/tui/localAttachmentParts.ts）。
     */
    localAttachmentPaths?: readonly string[];
    actionGateHandler?: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>;
    confirmDestructiveAction?: (
      request: PermissionRequest,
    ) => Promise<boolean | { approved: boolean; hostResult?: AgentRuntimeToolResult }>;
    requestUserChoice?: (request: UserChoiceRequest) => Promise<UserChoiceResult>;
    abortSignal?: AbortSignal;
    pastedTextStore?: CollapsedPasteStore;
    activityReporter?: (label: string | null) => void;
    /**
     * 后台 run 状态快照的接收者（dock 面板）。曾经在本签名里声明缺失、调用
     * 处传了却被静默丢弃，导致模型轮询那条面板上料链路整根断掉；补上声明
     * 后会在下面转发给 agentRunner。
     */
    onAgentRunStatus?: (snapshot: AgentRunStatusSnapshot | null) => void;
    /**
     * 回合内注入收件箱 drain（后台 run 终态唤醒直投当前 loop）。
     * 原样透传给 agentRunner → runAgentTurn → local loop。
     * 兼容同步 string[] 与结构化 user 消息（排队批次），可返回 Promise。
     */
    drainInjections?: () =>
      | import("../../agent-runtime").LocalTurnInjection[]
      | Promise<import("../../agent-runtime").LocalTurnInjection[]>;
    /** 本轮注入的用户批次收集器；由注入回调写入，saveTurn 原子标 completed。 */
    drainInjectedBatches?: Array<{ batchId: string; messageIds: string[] }>;
    getProcessCausalDepth?: () => number;
    /**
     * 轮内实时平台计费帧：每次 provider 调用结束（llm-end 带平台 billing
     * usage）回调一次，参数为该帧折算的积分。实现方负责累加进
     * state.liveTurnCredits 并 scheduleRender；轮末由 finally 统一清零，
     * 权威 turnCredits 经 accumulateSessionCredits 接管，不双计。
     */
    onLiveTurnCredits?: (credits: number) => void;
    /**
     * 分享 OAuth agent 的 shell 会话授权（块 D）：宿主装配的会话级 grant
     * 对象；owner-required 场景 adapter 在首次命令执行类调用前弹确认。
     * 非 owner 场景该字段存在也不会被触发。
     */
    shellGrant?: OriginShellGrant;
    shellApprovalSession?: ShellApprovalSession;
    /**
     * 工具执行位置消费者（块 D）：owner-required 场景 adapter 回调一次；
     * 本模块渲染一行「工具在 <deviceName>(<deviceId>) · <workspaceRoot>
     * 执行 · <status>」。非 owner 场景不回调。
     */
    onToolExecutionLocation?: (location: ToolExecutionLocation) => void;
  } = {}
) {
  // 用户选中的 agent 就是要跑的 agent —— 不再做首轮自动改写，也不再按对话
  // 缓存路由结果。旧实现只在「新对话第一轮」把默认 agent 拨到 flash 档，续聊
  // （-c / 重启 TUI）时缓存已失效、分支也不进，于是原样落回默认 agent；默认
  // agent 的模型一旦变贵，用户在毫无提示的情况下按新价计费。
  const effectiveAgentKey = state.agentKey;
  const effectiveAgentName = state.agentName;
  const continueId = state.dialogId;
  // 图片输入：图片档已移除，不再自动切换到 Kimi K2.6。
  // 纯文本模型收到图片时，会剥离 image_url part 为占位文本（见
  // imagePreprocessing.ts），避免上游 400。用户如需完整视觉可手动 /switch 到支持视觉的模型。
  // Resolve attached skill references (dbKey, .agents/skills/<name>/SKILL.md)
  // and inject as system context blocks — same
  // mechanism as `nolo agent run --skill <ref>`.
  let effectiveMessage = message;
  let skillAllowedTools: string[] | undefined;
  let skillContextBlocks: string[] | undefined;

  // 行首 /skill@ 精确引用的首轮预加载：
  // 1. 复用 parseSkillSlashReference 解析行首定位；
  // 2. 复用 buildLoadSkillExecutor 执行项目绑定与路径验证；
  // 3. 验证失败阻止发送模型（抛出异常中断执行）；
  // 4. 保留原用户参数与工具授权，不添加持续会话挂载（不修改 state.attachedSkills）。
  const parsedSlashSkill = parseSkillSlashReference(message);
  let slashSkillPreloadResult:
    | {
        content: string;
        allowedTools?: string[];
      }
    | undefined;

  if (parsedSlashSkill) {
    const executor = buildLoadSkillExecutor({ cwd: state.cwd });
    let loadArgs: Record<string, unknown>;
    if (parsedSlashSkill.reference.source === "builtin") {
      loadArgs = { source: "builtin", slug: parsedSlashSkill.reference.id };
    } else if (parsedSlashSkill.reference.source === "project") {
      loadArgs = {
        source: "project",
        projectBinding: parsedSlashSkill.reference.projectBinding,
        relativePath: parsedSlashSkill.reference.relativePath,
      };
    } else {
      loadArgs = {
        source: "space",
        dbKey: (parsedSlashSkill.reference as { dbKey: string }).dbKey,
      };
    }
    const loadResult = await executor({
      name: "loadSkill",
      arguments: JSON.stringify(loadArgs),
    });
    if (!loadResult.metadata?.resolved) {
      output.write(`[nolo] skill preload failed: ${loadResult.content}\n`);
      throw new Error(`Skill preload failed: ${loadResult.content}`);
    }

    effectiveMessage = resolveSkillSlashUserPrompt(parsedSlashSkill.args);

    let preloadTools: string[] | undefined;
    if (
      Array.isArray(loadResult.metadata?.toolNames) &&
      loadResult.metadata.toolNames.length > 0
    ) {
      preloadTools = (loadResult.metadata.toolNames as unknown[]).filter(
        (t): t is string => typeof t === "string" && t.length > 0,
      );
    }
    let skillMarkdown = loadResult.content;
    const inlinePrefix = /^Skill\s+"[^"]*"\s+loaded inline\.\s+Follow its instructions\.\s*\n+/i;
    if (inlinePrefix.test(skillMarkdown)) {
      skillMarkdown = skillMarkdown.replace(inlinePrefix, "");
    } else {
      const frontmatterIndex = skillMarkdown.search(/(?:^|\n)---\s*\n/);
      if (frontmatterIndex !== -1) {
        const dashIndex = skillMarkdown.indexOf("---", frontmatterIndex);
        if (dashIndex !== -1) {
          skillMarkdown = skillMarkdown.slice(dashIndex);
        }
      }
    }
    const external = parseExternalSkillMarkdown(skillMarkdown);
    if (external.allowedTools && external.allowedTools.length > 0) {
      preloadTools = preloadTools
        ? preloadTools.filter((t) => external.allowedTools!.includes(t))
        : external.allowedTools;
    }

    slashSkillPreloadResult = {
      content: loadResult.content,
      allowedTools: preloadTools,
    };
  }
  // 记忆召回只依赖此刻已固定的 agent 与用户输入（`effectiveMessage` 之后不再
  // 改写），而 attached-skill 解析是与之相互独立的等待；因此在这里就发起召回，
  // 让两条 I/O 重叠，再在首次模型请求前 await 同一个 promise。远端优先 /
  // 本地 fallback / 5000ms 超时语义完全不变（仍走 resolveCliMemory）。
  // 立即将召回结算为 outcome：skill 等待期间没有悬空 reject promise，
  // 汇合点再恢复非取消错误的 null fallback 与用户取消语义。
  const memoryPromptOutcomePromise =
    state.cachedMemoryOverlay === undefined
      ? resolveCliMemory({
          serverUrl: state.serverUrl,
          authToken: resolvePlatformAuthToken(env),
          agentKey: effectiveAgentKey,
          userInput: effectiveMessage,
          env,
          ...(options.abortSignal ? { signal: options.abortSignal } : {}),
        }).then(
          (promptBlock) => ({ status: "fulfilled" as const, promptBlock }),
          (error: unknown) => ({ status: "rejected" as const, error }),
        )
      : null;
  if (state.attachedSkills.length > 0) {
    const authToken = resolvePlatformAuthToken(env);
    const resolvedSkills = [];
    for (const ref of state.attachedSkills) {
      try {
        const resolved = await resolveSkillReference(ref, {
          cwd: state.cwd,
          readDbRecord: async (dbKey: string) => {
            return readDbRecord({
              dbKey,
              authToken,
              serverUrl: state.serverUrl,
              fetchImpl: fetch,
            });
          },
        });
        resolvedSkills.push(resolved);
      } catch (error) {
        output.write(`[nolo] skill "${ref}" skipped: ${toErrorMessage(error)}\n`);
      }
    }
    if (resolvedSkills.length > 0) {
      // Build skill content as context blocks (system prompt) instead of
      // prepending to user message — preserves LLM prefix-cache on the
      // system+history prefix across turns.
      skillContextBlocks = buildSkillContextBlocks(resolvedSkills);
      // P3: collect allowed-tools from all skills and intersect
      const toolLists = resolvedSkills
        .map((s) => s.allowedTools)
        .filter((t): t is string[] => !!t && t.length > 0);
      if (toolLists.length > 0) {
        skillAllowedTools = toolLists.reduce((acc, tools) =>
          acc.filter((t) => tools.includes(t))
        );
        if (skillAllowedTools.length === 0) {
          output.write(`[nolo] warning: attached skills declare incompatible allowed-tools; no tool restriction enforced\n`);
        }
      }
    }
  }
  if (slashSkillPreloadResult) {
    skillContextBlocks = [
      ...(skillContextBlocks ?? []),
      slashSkillPreloadResult.content,
    ];
    if (
      slashSkillPreloadResult.allowedTools &&
      slashSkillPreloadResult.allowedTools.length > 0
    ) {
      if (skillAllowedTools !== undefined) {
        const intersected = skillAllowedTools.filter((t) =>
          slashSkillPreloadResult!.allowedTools!.includes(t),
        );
        if (intersected.length === 0) {
          throw new Error(
            "Cannot preserve skill tool authorization: incompatible tool restrictions",
          );
        }
        skillAllowedTools = intersected;
      } else {
        skillAllowedTools = slashSkillPreloadResult.allowedTools;
      }
    }
  }
  // Assemble the turn's context layers. Each builder stamps its own cacheScope
  // (session = stable prefix, cached; turn = dynamic suffix, recomputed), so
  // this host never has to infer scope by string-matching block markers.
  const layers: Array<TurnContextLayer | null> = [
    readAgentsMdLayerFromDisk(state.cwd),
    // Skill discovery: scan conventional skill dirs for SKILL.md and inject an
    // index layer so the model knows what skills exist and can readFile them
    // on-demand. Mirrors agentRunCommand.ts and desktopAgentRuntimeTurnService.
    buildSkillDiscoveryContextLayer(state.cwd),
    // 宿主环境层（session-scope 稳定前缀）：快速注入当前系统发行版、架构与桌面环境
    buildHostEnvironmentLayer(),
  ];

  // 响应展示指南（窄屏/TUI 版）不再由宿主自拼：宿主只声明展示能力
  // （下方传给 runtime 的 responseViewport = TUI_RESPONSE_VIEWPORT），行为段与
  // 排版段都由 localLoop 这个最终装配边界经 resolveResponseGuidelines 统一注入，各一份。

  // Memory overlay: session-scoped — load once per dialog, reuse across turns.
  // New memories written via rememberMemory tool are for FUTURE dialogs, not
  // the current one (the model already has the context from the conversation).
  // /new or dialog switch clears cachedMemoryOverlay so the next dialog reloads.
  let memoryPromptBlock = state.cachedMemoryOverlay;
  if (options.abortSignal?.aborted) {
    throw options.abortSignal.reason ?? new DOMException("Aborted", "AbortError");
  }
  if (memoryPromptBlock === undefined && memoryPromptOutcomePromise) {
    // 等待已提前启动的召回；首次模型请求仍须拿到这个结果。
    const outcome = await memoryPromptOutcomePromise;
    if (options.abortSignal?.aborted) {
      throw options.abortSignal.reason ?? new DOMException("Aborted", "AbortError");
    }
    memoryPromptBlock = outcome.status === "fulfilled" ? outcome.promptBlock : null;
    // Cache will be propagated to TUI state by the caller via runResult.cachedMemoryOverlay.
  }
  const memoryOverlayLayer = buildMemoryOverlayLayer({ promptBlock: memoryPromptBlock });
  const memoryUseGuidanceLayer = buildMemoryUseGuidanceLayer({ promptBlock: memoryPromptBlock });

  // 最近一次 /cd 切换通知：作为 turn-scope 上下文注入本轮，agent 与用户
  // 同时知情（与 /switch 消息「用户可见 + agent 可知」的语义对齐）。消费
  // 时机在 runOneAgentTurn 的状态折叠处（发起过真实 turn 后清空）。
  const cwdNoticeBlocks = state.pendingCwdNotice
    ? [{ content: state.pendingCwdNotice, cacheScope: "turn" as const }]
    : [];

  // 后台进程任务终态通知：与 cwdNotice 同一注入模式（turn-scope context
  // block）。关键差异：通知可能在 turn 运行中继续到达（后台任务随时终态），
  // 所以组装时先快照本轮要注入的行，消费点只清掉快照里的行——清空若用
  // 整体覆盖（= []），会把 turn 运行期间新到达、还没注入过的通知一并吞掉，
  // 造成「任务终了 agent 永远不知情」。生命周期红线仍然满足：快照里的行
  // 在全部 turn 终态（成功/失败/取消/强制停止/无 dialogId 异常）都会被移除。
  const injectedProcessNoticeLines = state.pendingProcessNotices
    ? [...state.pendingProcessNotices]
    : [];
  const processNoticeBlocks =
    injectedProcessNoticeLines.length > 0
      ? [{
          content: buildProcessTerminalTurnMessage(
            injectedProcessNoticeLines.map((line) =>
              annotatePendingProcessNoticeOrigin(
                parsePendingProcessNoticeLine(line),
                // 本函数的 state 即当前 session 状态；首轮尚未回填 dialogId
                // 时为 undefined（标注侧按「不冒充当前任务」处理）。
                state.dialogId,
              ),
            ),
          ),
          cacheScope: "turn" as const,
        }]
      : [];

  const injectedChildRunNoticeItems = (state.pendingChildRunNotices ?? []).filter(
    (r) => !!r.parentDialogId && r.parentDialogId === state.dialogId,
  );
  const childRunNoticeBlocks =
    injectedChildRunNoticeItems.length > 0
      ? [{
          content: buildWakeMessage(injectedChildRunNoticeItems, Date.now()),
          cacheScope: "turn" as const,
        }]
      : [];

  const contextBlockScopes: ContextBlockScope[] = partitionScopedBlocks([
    ...renderTurnContextBlocksWithScope(layers),
    ...renderTurnContextBlocksWithScope([memoryUseGuidanceLayer]),
    // Attached skill bodies are already self-contained sections built by
    // buildSkillContextBlocks; they stay turn-scope because the user can
    // attach/detach skills between turns.
    ...(skillContextBlocks ?? [])
      .map((content) => content.trim())
      .filter((content) => content.length > 0)
      .map((content) => ({ content, cacheScope: "turn" as const })),
    ...renderTurnContextBlocksWithScope([memoryOverlayLayer]),
    ...cwdNoticeBlocks,
    ...processNoticeBlocks,
    ...childRunNoticeBlocks,
  ]);
  // 新会话首轮 state.dialogId 尚未生成（turn 结束后才从 result 回填），
  // 该轮派发的后台 run 无法注入 parentDialogId——adapter 通过
  // onBackgroundRunSpawned 把这些 runId 报到这里，turn 结束统一回填归属。
  const spawnedRunsMissingParent: string[] = [];
  const taskRef = currentAutoReviewTask(state, env);
  const taskWorkspaceEvidence = taskRef ? await collectHostTaskWorkspace(taskRef, env) : undefined;
  // Evidence production is distinct from selecting a typed-review dispatch.
  // Do NOT set hostReviewDispatch here: that would classify all children as review.
  const taskEvidenceInput = taskWorkspaceEvidence ? { hostTaskWorkspaceEvidence: taskWorkspaceEvidence } : {};
  if (taskWorkspaceEvidence?.status === "blocked") output.write(`[auto-review] blocked：${taskWorkspaceEvidence.reason}\n`);
  const result: RunAgentTurnResult = await agentRunner({
    ...taskEvidenceInput,
    interactiveHost: true,
    agentName: effectiveAgentName,
    agentKey: effectiveAgentKey,
    serverUrl: state.serverUrl,
    message: effectiveMessage,
    getProcessCausalDepth: options.getProcessCausalDepth,
    continueDialogId: state.dialogId,
    freshDialog: options.freshDialog,
    hostTaskRef: currentAutoReviewTask(state, env),
    userMessages: options.userMessages,
    ...(options.cliBatchId ? { cliBatchId: options.cliBatchId } : {}),
    accountTaskUserSource: options.accountTaskUserSource ? {
      ...options.accountTaskUserSource,
      projectedContentSha256: hashTaskUserMessage("sha256").update(effectiveMessage).digest("hex"),
    } : undefined,
    ...(state.dialogId ? { parentDialogId: state.dialogId } : {}),
    // 显式注入 TUI 真实会话身份（createInitialTuiState mint、跨轮稳定），
    // owner-required 契约不再从 parentDialogId/workspaceRoot 派生会话身份。
    // 兜底 `session-ephemeral`：测试/外部构造的 partial TuiState 缺 sessionId
    // 时给稳定占位（adapter 内仍按 originSession → parentDialogId → ephemeral
    // 的顺序回退，不会把 undefined 写进契约）。
    originSession: { sessionId: state.sessionId ?? "session-ephemeral" },
    // 分享 OAuth agent 的 shell 会话授权（块 D）：会话级 grant 透传；
    // 非 owner 场景 adapter 不触发该路径。
    ...(options.shellGrant ? { shellGrant: options.shellGrant } : {}),
        ...(options.shellApprovalSession ? { shellApprovalSession: options.shellApprovalSession } : {}),
    // 运行位置展示（块 D）：owner-required 场景 adapter 回调一次。
    ...(options.onToolExecutionLocation
      ? { onToolExecutionLocation: options.onToolExecutionLocation }
      : {}),
    ...(state.agentKey === DEFAULT_TUI_AGENT_KEY && env.NOLO_AUTO_ROUTE !== "0"
      ? { dialogAgentMode: "auto" as const }
      : { dialogAgentMode: "fixed" as const }),
    runtimeMode: state.runtimeMode,
    // TUI 是窄屏终端：只声明展示能力，不自拼准则文本。行为段与窄屏排版段
    // 都由 localLoop（local 线的最终装配边界）经 resolveResponseGuidelines 注入。
    // 若该轮走远端 server 线，local 线不参与装配，此字段被忽略（server 线自己注入行为段）。
    responseViewport: TUI_RESPONSE_VIEWPORT,
    // `/lang` updates the in-memory TUI state immediately. Pass that state
    // explicitly so the next real turn cannot keep using the workspace's
    // launch-time NOLO_LANG value while the estimator already uses the new one.
    userLanguage: state.userLanguage,
    localRuntimeCwd: state.cwd,
    scriptDir,
    env: {
      ...env,
      NOLO_LANG: state.userLanguage,
    },
    output: {
      ...(output as unknown as { write: (chunk: string) => void }),
      tuiTrees:
        (output as unknown as { tuiTrees?: boolean }).tuiTrees === true &&
        typeof (output as unknown as { writeToolBlock?: unknown }).writeToolBlock === "function",
    },
    showThinking: state.thinkingDisplay === "show",
    ...(options.imageUrls && options.imageUrls.length > 0
      ? { imageUrls: options.imageUrls }
      : {}),
    ...(options.localAttachmentPaths && options.localAttachmentPaths.length > 0
      ? { localAttachmentPaths: options.localAttachmentPaths }
      : {}),
    ...(options.actionGateHandler ? { actionGateHandler: options.actionGateHandler } : {}),
    ...(options.confirmDestructiveAction
      ? { confirmDestructiveAction: options.confirmDestructiveAction }
      : {}),
    ...(options.requestUserChoice
      ? { requestUserChoice: options.requestUserChoice }
      : {}),
    ...(options.abortSignal ? { abortSignal: options.abortSignal } : {}),
    // Always inject a local adapter factory so background run delegations from
    // inside a TUI turn are stamped with the current conversation. Previously
    // this factory only existed when pasted text was present, which meant a
    // plain (no-paste) turn had no injection point for parentDialogId and the
    // run-completion watcher could never attribute runs spawned this turn.
    ...(options.pastedTextStore?.items.size
      ? { pastedTextStore: options.pastedTextStore }
      : {}),
    localRuntimeAdapterFactory: (
      factoryEnv: Record<string, string | undefined>,
      factoryOptions?: { cwd?: string },
    ) =>
      createCliLocalRuntimeAdapter({
        env: factoryEnv,
        cwd: factoryOptions?.cwd ?? state.cwd,
        output,
        // 与 RunAgentTurnOptions.originSession 同源：TUI 真实会话身份显式注入，
        // owner-required 契约取它为 origin.sessionId 权威来源（同样兜底
        // session-ephemeral，防 partial TuiState）。
        originSession: { sessionId: state.sessionId ?? "session-ephemeral" },
        // shell 会话授权同一对象透传给 adapter factory 路径——两个接线点共用
        // 同一份 granted 状态，撤销对两条路径同时生效。
        ...(options.shellGrant ? { shellGrant: options.shellGrant } : {}),
        ...(options.shellApprovalSession ? { shellApprovalSession: options.shellApprovalSession } : {}),
        // 运行位置展示同一回调（块 D）：与 RunAgentTurnOptions 同源。
        ...(options.onToolExecutionLocation
          ? { onToolExecutionLocation: options.onToolExecutionLocation }
          : {}),
        ...(options.confirmDestructiveAction
          ? { confirmDestructiveAction: options.confirmDestructiveAction }
          : {}),
        ...(options.requestUserChoice
          ? { requestUserChoice: options.requestUserChoice }
          : {}),
        ...(options.pastedTextStore?.items.size
          ? { pastedTextStore: options.pastedTextStore }
          : {}),
        // Stamp spawned background runs with the current TUI dialog so the
        // run-completion watcher can attribute terminal-state wakes to this
        // conversation.
        ...(state.dialogId ? { parentDialogId: state.dialogId } : {}),
        // 首轮无 dialogId 时的兜底：收集失归属的 spawn，turn 结束回填。
        onBackgroundRunSpawned: (runId) => {
          spawnedRunsMissingParent.push(runId);
        },
        ...(options.activityReporter
          ? { activityReporter: options.activityReporter }
          : {}),
      }),
    ...(options.activityReporter ? { activityReporter: options.activityReporter } : {}),
    // 转发 dock 订阅：runAgentTurn 的输出层靠它判断「有面板」从而抑制
    // transcript 的进展卡片；dock 本身也靠它接收模型轮询带回来的快照。
    ...(options.onAgentRunStatus ? { onAgentRunStatus: options.onAgentRunStatus } : {}),
    ...(options.drainInjections ? { drainInjections: options.drainInjections } : {}),
    ...(options.drainInjectedBatches ? { drainInjectedBatches: options.drainInjectedBatches } : {}),
    // 轮内实时积分：llm-end 带原始 usage 时按平台计费口径逐帧折算上报。
    // 口径与轮末 sumPlatformCredits 同源（platformCreditsFromUsage），
    // 只认 billing_unit === "credits" 的帧；非平台计费不产生回调。
    ...(options.onLiveTurnCredits
      ? {
          onLoopEvent: (event: LocalAgentLoopEvent) => {
            if (event.kind !== "llm-end" || !event.usage) return;
            const credits = platformCreditsFromUsage(event.usage);
            if (credits !== undefined) options.onLiveTurnCredits!(credits);
          },
        }
      : {}),
    ...(skillAllowedTools !== undefined
      ? { allowedToolNames: skillAllowedTools }
      : {}),
    ...(contextBlockScopes.length > 0
      ? { contextBlockScopes }
      : {}),
  });
  // 回填本轮失归属的后台 run：纯数据修复（读-改-写 registry JSON，带记录锁），
  // 不碰 UI 锁，abort/force-stop 路径同样安全。单条失败不带走 turn。
  if (result.dialogId && spawnedRunsMissingParent.length > 0) {
    for (const runId of spawnedRunsMissingParent) {
      try {
        // 必须传 env：resolveNoloHome 只认传入 env 的 NOLO_HOME，不传则永远
        // 读 ~/.nolo——设了 NOLO_HOME 的环境（dev、测试）会静默回填错目录
        // （与 readlineWorkspace.ts 轮询器注入 env 的约定同源）。
        backfillRunRecordParentDialog(runId, result.dialogId, { env });
      } catch {
        // 显示层兜底：归回失败只影响 dock 可见性，不影响 turn 本身。
      }
    }
  }
  return {
    ...result,
    contextWindow: resolveAgentContextWindow({
      agentKey: effectiveAgentKey,
      agentName: effectiveAgentName,
    }),
    cachedMemoryOverlay: memoryPromptBlock,
  };
}

const ESC = "\u001b";
const CTRL_C = "\u0003";

function isApprovedConfirmationInput(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return normalized === "" || normalized === "y" || normalized === "yes" || normalized === "确认";
}

export function buildGateConfirmedResult(gate: LocalAgentActionGate): AgentRuntimeToolResult {
  return {
    content: `action gate completed: ${gate.title}`,
    metadata: { actionGateResult: { gateId: gate.id, status: "completed", output: "confirmed" } },
  };
}

function buildGateCancelledResult(gate: LocalAgentActionGate, reason: string): AgentRuntimeToolResult {
  return {
    content: `action gate cancelled: ${gate.title}`,
    metadata: {
      exitCode: 130,
      actionGateResult: { gateId: gate.id, status: "cancelled", output: reason },
    },
  };
}

function buildGateFailedResult(gate: LocalAgentActionGate, message: string): AgentRuntimeToolResult {
  return {
    content: `action gate failed: ${gate.title}`,
    metadata: {
      exitCode: 1,
      actionGateResult: { gateId: gate.id, status: "failed", output: message },
    },
  };
}

function deriveGateMeta(gate: LocalAgentActionGate) {
  const commandPayload = gate.kind === "handoff"
    ? readCommandActionGatePayload(gate.payload)
    : null;
  const isConfirmation = gate.kind === "confirm";
  const displayCommand = commandPayload?.displayCommand ?? commandPayload?.command.join(" ") ?? gate.title;
  const isInteractiveHandoff =
    gate.kind === "handoff" &&
    gate.title === "This command requires an interactive terminal.";
  const title = isInteractiveHandoff
    ? t("actionGateInteractiveTitle")
    : gate.title;
  const body = isInteractiveHandoff
    ? t("actionGateInteractiveBody")
    : gate.body;
  return { commandPayload, isConfirmation, displayCommand, isInteractiveHandoff, title, body };
}

/**
 * Bare-text gate prompt. Still used by:
 *   - `waitForActionGate` (non-raw fallback, confirm + handoff) — not affected
 *     by the invisibility bug, see that function's docstring.
 *   - `waitForRawActionGate` (raw TTY) — now only reached for `handoff` gates
 *     (`resolveActionGate` routes `confirm` gates to `dialogHost` + a real
 *     framed dialog instead). The raw handoff caller now pauses the composer
 *     for this prompt's entire wait window, so it survives the
 *     activity-indicator repaint tick that used to erase it.
 */
function writeGatePrompt(output: NodeJS.WritableStream, meta: ReturnType<typeof deriveGateMeta>): void {
  const { title, body, displayCommand, isConfirmation } = meta;
  output.write(`\n[nolo] ${t("actionGateNeeded")}\n`);
  output.write(`[nolo] ${title}\n`);
  if (body) output.write(`[nolo] ${body}\n`);
  output.write(`  ${displayCommand}\n`);
  output.write(`[nolo] ${isConfirmation ? t("actionGateConfirmHint") : t("actionGateEnterHint")}\n`);
}

/**
 * Non-raw (plain `readline`) action gate wait. Used only on the
 * `!isInteractiveInput(input)` fallback path in `readlineWorkspace.ts` (no
 * TTY / no raw mode — e.g. piped stdin). That path never installs the raw
 * `fixedInput` composer (it stays the `createNoopFixedInput()` stub, whose
 * `active` flag is `false`), and `activityIndicator`'s `onRepaint` short-circuits
 * whenever `fixedInput.active` is false — so the 150ms activity-indicator tick
 * that erases `waitForRawActionGate`'s prompt in the raw path never fires a
 * repaint here at all. This prompt is not subject to the invisibility bug
 * this file fixes; it is left as `output.write()` + `rl.question()` and does
 * not need to route through `dialogHost`.
 */
export function waitForActionGate(
  rl: ReturnType<typeof createInterface>,
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  gate: LocalAgentActionGate,
  spawnRunner: typeof spawnProcess,
): Promise<AgentRuntimeToolResult> {
  const meta = deriveGateMeta(gate);
  const { commandPayload, isConfirmation, displayCommand } = meta;
  writeGatePrompt(output, meta);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: AgentRuntimeToolResult) => {
      if (settled) return;
      settled = true;
      rl.off("close", onClose);
      rl.off("SIGINT", onSigint);
      resolve(result);
    };
    const cancelResult = (reason: string): AgentRuntimeToolResult =>
      buildGateCancelledResult(gate, reason);
    const failResult = (message: string): AgentRuntimeToolResult =>
      buildGateFailedResult(gate, message);
    const onClose = () => finish(cancelResult("readline closed"));
    const onSigint = () => finish(cancelResult("interrupted"));
    rl.once("close", onClose);
    rl.once("SIGINT", onSigint);
    rl.question("", async (answer) => {
      if (settled) return;
      if (isConfirmation) {
        finish(isApprovedConfirmationInput(answer)
          ? buildGateConfirmedResult(gate)
          : cancelResult("confirmation declined"));
        return;
      }
      if (!commandPayload) {
        finish(failResult("unsupported gate payload"));
        return;
      }
      const rawInput = input as RawModeInput;
      const restoreRawMode = Boolean(rawInput.isRaw);
      rl.pause();
      rawInput.setRawMode?.(false);
      let exitCode = 1;
      let errorMessage = "";
      try {
        // The subprocess inherits our stdio — yield the alt screen for its
        // duration so its bytes land on the main screen instead of the TUI's
        // private buffer. This path owns no composer, so no repaint callback.
        exitCode = await withSuspendedRenderer(output, async () => {
          const proc = spawnRunner({
            cmd: commandPayload.command,
            stdin: "inherit",
            stdout: "inherit",
            stderr: "inherit",
          });
          return await proc.exited;
        });
      } catch (error) {
        errorMessage = toErrorMessage(error);
      } finally {
        if (restoreRawMode) rawInput.setRawMode?.(true);
        rl.resume();
      }
      finish({
        content: exitCode === 0 && !errorMessage
          ? `action gate completed: ${displayCommand}`
          : errorMessage
            ? `action gate failed: ${errorMessage}`
            : `action gate failed with exit code ${exitCode}: ${displayCommand}`,
        metadata: {
          exitCode,
          actionGateResult: {
            gateId: gate.id,
            status: exitCode === 0 && !errorMessage ? "completed" : "failed",
            output: errorMessage || displayCommand,
          },
          argv: commandPayload.command,
          displayCommand,
        },
      });
    });
  });
}

export function isInteractiveInput(input: NodeJS.ReadableStream): input is RawModeInput & { isTTY: true } {
  const candidate = input as RawModeInput & { isTTY?: boolean };
  return Boolean(candidate.isTTY) && typeof candidate.setRawMode === "function";
}

export function waitForRawActionGate(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  gate: LocalAgentActionGate,
  spawnRunner: typeof spawnProcess,
  hooks?: {
    beforeSubprocess?: () => void;
    afterSubprocess?: () => void;
    /** Route decoded TTY tokens through the workspace decoder. */
    registerToken?: (handler: ((token: string) => void) | null) => void;
  },
): Promise<AgentRuntimeToolResult> {
  const meta = deriveGateMeta(gate);
  const { commandPayload, isConfirmation, displayCommand } = meta;
  writeGatePrompt(output, meta);

  return new Promise((resolve) => {
    const rawInput = input as RawModeInput;
    let settled = false;
    let commandRunning = false;
    let confirmationLine = "";
    const finish = (result: AgentRuntimeToolResult) => {
      if (settled) return;
      settled = true;
      hooks?.registerToken?.(null);
      input.off("data", onData);
      input.off?.("end", onEnd);
      input.off?.("close", onEnd);
      resolve(result);
    };
    const cancel = (reason: string) => finish(buildGateCancelledResult(gate, reason));
    const fail = (message: string) => finish(buildGateFailedResult(gate, message));
    const onEnd = () => {
      cancel("interrupted");
    };
    const runCommand = async () => {
      if (settled || commandRunning) return;
      commandRunning = true;
      if (!commandPayload) {
        fail("unsupported gate payload");
        return;
      }
      const wasRaw = Boolean(rawInput.isRaw);
      rawInput.setRawMode?.(false);
      hooks?.beforeSubprocess?.();
      let exitCode = 1;
      let errorMessage = "";
      try {
        // Hand the terminal to the subprocess: leaveAltScreen yields the
        // private buffer, the suspended flag blocks resize→repaint writes,
        // and onResume (afterSubprocess → resumeFromSubprocess) repaints on
        // the way back in. See suspendedRenderer.ts.
        exitCode = await withSuspendedRenderer(output, async () => {
          const proc = spawnRunner({
            cmd: commandPayload.command,
            stdin: "inherit",
            stdout: "inherit",
            stderr: "inherit",
          });
          return await proc.exited;
        }, { onResume: () => hooks?.afterSubprocess?.() });
      } catch (error) {
        errorMessage = toErrorMessage(error);
      } finally {
        if (wasRaw) rawInput.setRawMode?.(true);
      }
      finish({
        content: exitCode === 0 && !errorMessage
          ? `action gate completed: ${displayCommand}`
          : errorMessage
            ? `action gate failed: ${errorMessage}`
            : `action gate failed with exit code ${exitCode}: ${displayCommand}`,
        metadata: {
          exitCode,
          actionGateResult: {
            gateId: gate.id,
            status: exitCode === 0 && !errorMessage ? "completed" : "failed",
            output: errorMessage || displayCommand,
          },
          argv: commandPayload.command,
          displayCommand,
        },
      });
    };
    const handleToken = (text: string) => {
      if (settled || commandRunning) return;
      if (text.includes(CTRL_C) || text.includes("\x04") || (isConfirmation && text === ESC)) {
        cancel("interrupted");
        return;
      }
      if (isConfirmation) {
        const newline = text.search(/[\r\n]/);
        confirmationLine += newline >= 0 ? text.slice(0, newline) : text;
        if (newline >= 0) {
          const normalized = confirmationLine.trim().toLowerCase();
          confirmationLine = "";
          if (!isApprovedConfirmationInput(normalized)) {
            cancel("confirmation declined");
            return;
          }
          finish(buildGateConfirmedResult(gate));
        }
        return;
      }
      if (text.includes("\r") || text.includes("\n")) {
        void runCommand();
      }
    };
    const onData = (chunk: Buffer | string) => {
      const text = String(chunk);
      handleToken(text);
    };
    input.on?.("end", onEnd);
    input.on?.("close", onEnd);
    if (hooks?.registerToken) {
      hooks.registerToken(handleToken);
    } else {
      input.on("data", onData);
    }
  });
}

/**
 * `confirm` 类 gate 在 `localLoop.ts:1697` 由
 * `{ ...policy.permissionRequest, id, kind: "confirm", toolName, toolCallId }`
 * 构造，运行期字段是 `PermissionRequest` 的超集；`ActionGate`/`LocalAgentActionGate`
 * 类型本身不声明 `tool`/`action`/`command`/`suggestedRule`，这里按上述构造契约
 * 断言回 `PermissionRequest`，只在 `gate.kind === "confirm"` 分支使用。
 */
function asConfirmPermissionRequest(gate: LocalAgentActionGate): PermissionRequest {
  return gate as unknown as PermissionRequest;
}

/**
 * `/auto on` escape hatch for the write-gate: true only for the session
 * first-write `confirm` gate (`action: "file_write"`, constructed at
 * `localLoop.ts:1697`). Deliberately narrow — `handoff`/`input` gates need a
 * real human at the terminal (subprocess handoff, interactive command), not
 * a permission confirmation, so `/auto` must never short-circuit those. See
 * `asConfirmPermissionRequest`'s docstring for why the `action` field is only
 * safe to read on `kind === "confirm"` gates.
 */
export function isAutoConfirmableFileWriteGate(gate: LocalAgentActionGate): boolean {
  return gate.kind === "confirm" && asConfirmPermissionRequest(gate).action === "file_write";
}

/**
 * Confirm gates whose approval must NOT persist as a session-wide permission
 * grant. `runConfirmDialog`'s `onApprove` callback is wired (at
 * `readlineWorkspace.ts`) to `createSnapshotGuardedApproval(...)` ->
 * `createPermissionGrantEnabler`, which does `setGrants({ local: true })` and
 * `saveProfilePermissionGrant` — i.e. approving any confirm gate currently
 * persists the local bucket and later short-circuits
 * `confirmDestructiveAction`. That is fine for gates whose dialog copy admits
 * the scope ("always for this session"), but the credential gate
 * (`action: "credential_unwrap_tool_use"`, built by
 * `buildCredentialSinkPermissionRequest`) promises "this call only" — persisting
 * the grant would silently contradict that contract. We deliberately do NOT
 * fold it into `confirmDialog.ts`'s `localRunClass` copy groups: relabeling the
 * dialog to admit session-wide persistence would acknowledge the spill, not
 * remove it. Instead `resolveActionGate` simply omits `onApprove` for these
 * gates, so the approval stays call-scoped. `handoff`/`input` gates are never
 * permission confirms and always return false; a confirm gate with no readable
 * `action` also returns false — meaning it is treated as persistable. The real
 * invariant is an explicit allowlist: ONLY actions registered in
 * `NON_PERSISTING_APPROVAL_GATE_ACTIONS` keep their approval call-scoped;
 * any newly added call-scoped confirm gate MUST be registered here, otherwise
 * `onApprove` is passed through and the approval is persisted by default.
 */
export const NON_PERSISTING_APPROVAL_GATE_ACTIONS: ReadonlySet<string> = new Set([
  "credential_unwrap_tool_use",
]);

export function isNonPersistingApprovalGate(gate: LocalAgentActionGate): boolean {
  if (gate.kind !== "confirm") return false;
  return NON_PERSISTING_APPROVAL_GATE_ACTIONS.has(asConfirmPermissionRequest(gate).action ?? "");
}

/**
 * 交互式 (raw TTY) action gate 的统一入口。
 *
 * 根因（见 docs/plans/2026-08-31-action-gate-invisible.md）：`confirm` 类 gate
 * 曾经和 `handoff` 类 gate 一起走 `waitForRawActionGate` 的裸 `output.write()`
 * 提示，从不 pause composer；活动行指示器每 150ms 触发一次 `fixedInput.repaint`，
 * 从 `history` 重建屏幕，gate 提示从未进 `history`，于是 ~150ms 内被擦掉——
 * turn 看起来卡死，实则 gate 在静默占着键盘。
 *
 * 修复：
 *   - `confirm` gate 改走 `dialogHost.run()` + `runConfirmDialog`，与破坏性操作
 *     确认同款带框弹窗（同一 `run()` 负责 anchor + composer pause/resume +
 *     重绘抑制 + 键盘认领/释放 + decoder 排空——五件事一次到位，见
 *     dialogHost.ts 文件注释），不再可能被活动行 tick 擦掉。返回值经
 *     `buildGateConfirmedResult` / `buildGateCancelledResult` 折回既有形状，
 *     取消原因固定为 "confirmation declined"（与 `confirmDestructiveAction`
 *     现有的 approve/cancel 二元语义一致——`runConfirmDialog` 不区分 Esc 与
 *     显式选 Cancel，两者都是用户主动取消）。
 *   - `handoff` gate 仍走 `waitForRawActionGate`（裸文本提示更贴近"复制命令
 *     到终端跑"的场景，不需要 select-dialog 框架，所以不走 `dialogHost.run()`
 *     的带框路径），但现在从等待 Enter 的那一刻起就 `pauseComposer()`，而不是
 *     像原来那样只在 `beforeSubprocess` 才 pause——等待提示同样要扛住活动行
 *     tick。子进程真正跑起来后 `afterSubprocess` 钩子照旧负责
 *     `resumeFromSubprocess`；若用户在按 Enter 之前就取消（Ctrl+C/Esc），子
 *     进程从未启动，改由 `resumeComposerFromDialog()` 收尾，避免误发只有子
 *     进程退出后才需要的全屏滚动区重置序列。整段等待包在
 *     `dialogHost.withKeyboard()` 里，拿到与 `run()` 同一份键盘认领 +
 *     关闭时排空 decoder 的保证，只是没有 anchor/composer pause（那两件事
 *     `pauseComposer`/`resumeComposer*` 参数已经手动做了）。
 */
export async function resolveActionGate(
  gate: LocalAgentActionGate,
  deps: {
    dialogHost: DialogHost;
    input: NodeJS.ReadableStream;
    output: NodeJS.WritableStream;
    spawnRunner: typeof spawnProcess;
    /** Route decoded TTY tokens through the workspace decoder (handoff only). */
    registerToken: (handler: ((token: string) => void) | null) => void;
    pauseComposer: () => void;
    resumeComposerFromSubprocess: () => void;
    resumeComposerFromDialog: () => void;
    /**
     * Approve hook for the local-run bucket: approving a `confirm` gate
     * remembers + persists that bucket (see permissionGrantPersist). Omitted
     * by callers that must keep a per-call decision.
     */
    onApprove?: () => void;
    /**
     * 用户在该 `confirm` gate 上确认之后调用（宿主侧物化授权，例如签发凭据使用
     * grant）。只在 approved 分支触发。**返回结果即视为宿主已代为执行**：
     * 该结果会替换本次工具结果、且原工具不再执行；抛错则明确判 failed。
     * 宿主不处理时必须能返回 `null` / `undefined`（既有语义：交回原流程）。
     */
    onApproved?: (
      gate: LocalAgentActionGate,
    ) =>
      | import("agent-runtime/actionGate").HostConfirmDecision
      | null
      | void
      | Promise<import("agent-runtime/actionGate").HostConfirmDecision | null | void>;
    /**
     * Reads the secret value for an `input` gate with
     * `payload.action === "secret_request"`. Defaults to `defaultPromptReader`
     * (TTY-only masked prompt; non-TTY throws `secret.promptNonTtyNotSupported`).
     * Injectable so tests never need a real TTY — and so the plaintext value
     * exists only in this one call path, never in tool results or logs.
     */
    readSecretValue?: (label: string) => Promise<string>;
  },
): Promise<AgentRuntimeToolResult> {
  if (gate.kind === "confirm") {
    // Credential gates (and future members of NON_PERSISTING_APPROVAL_GATE_ACTIONS)
    // promise call-scoped approval; `deps.onApprove` persists the local permission
    // bucket, so it must not be handed to the dialog for these gates. All other
    // confirm gates keep the existing behavior unchanged.
    const omitOnApprove = isNonPersistingApprovalGate(gate);
    const approved = await deps.dialogHost.run((anchor) =>
      runConfirmDialog({
        request: asConfirmPermissionRequest(gate),
        input: deps.input as NodeJS.ReadStream,
        output: deps.output,
        onApprove: omitOnApprove ? undefined : deps.onApprove,
        ...anchor,
      }),
    );
    if (approved && deps.onApproved) {
      // 不再吞错：宿主执行失败必须是 failed，而不是伪装成"已确认"再跑一遍原工具。
      let decision: import("agent-runtime/actionGate").HostConfirmDecision | null | void;
      try {
        decision = await deps.onApproved(gate);
      } catch (error) {
        // 失败原因必须真实透出（否则只剩 gate 标题，排障和断言都无据），
        // 但先过 scrubSecrets：错误文案不能成为凭据泄露通道。
        const reason = scrubSecrets(
          `host execution failed: ${String((error as Error)?.message ?? error)}`,
        ).cleaned;
        return {
          content: `action gate failed: ${gate.title} — ${reason}`,
          metadata: {
            exitCode: 1,
            actionGateResult: { gateId: gate.id, status: "failed", output: reason },
          },
        };
      }
      // 宿主动作的结果（HostConfirmDecision）在这里落成 resolvable 的工具结果：
      // 带 hostResult → 直接替换；显式 approved:false → 视为取消；其余落到确认结果。
      if (decision && typeof decision === "object") {
        if (decision.hostResult) return decision.hostResult;
        if (decision.approved === false) {
          return buildGateCancelledResult(gate, "host action declined");
        }
      } else if (decision === false) {
        return buildGateCancelledResult(gate, "host action declined");
      }
    }
    return approved
      ? buildGateConfirmedResult(gate)
      : buildGateCancelledResult(gate, "confirmation declined");
  }
  if (gate.kind === "input") {
    // Fail closed: an `input` gate only has a host implementation for the
    // secret-request payload. Anything else must NOT fall through to the
    // handoff branch below — that would misroute an unknown input gate into
    // terminal takeover (`waitForRawActionGate`). Return a structured cancel
    // instead. (Read `action`/`name` from `gate.payload` only: `readActionGate`
    // drops top-level custom fields.)
    const payload = gate.payload;
    const fields =
      typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    if (fields.action !== "secret_request") {
      return buildGateCancelledResult(
        gate,
        "input gate has no host implementation for this action",
      );
    }
    const secretName = typeof fields.name === "string" ? fields.name : "";
    if (!secretName) {
      return buildGateCancelledResult(
        gate,
        "secret_request input gate is missing a secret name",
      );
    }
    // Same keyboard claim + composer pause/resume contract as the handoff
    // branch: the masked prompt must exclusively own the terminal. No
    // `onApprove` here — an `input` gate is not a permission confirm and must
    // never persist an approval bucket. The plaintext value lives only in the
    // `setSecret` argument; it never enters the tool result, transcript, or
    // logs (error copy is scrubbed before it lands in the result).
    return deps.dialogHost.withKeyboard(async () => {
      deps.pauseComposer();
      try {
        const label = typeof fields.prompt === "string" ? fields.prompt : secretName;
        const value = await (deps.readSecretValue ?? defaultPromptReader)(label);
        setSecret(secretName, value);
        return {
          content: `action gate completed: ${gate.title}`,
          metadata: {
            actionGateResult: { gateId: gate.id, status: "completed", output: "stored" },
            stored: true,
            name: secretName,
          },
        };
      } catch (error) {
        const reason = scrubSecrets(
          `secret input failed: ${String((error as Error)?.message ?? error)}`,
        ).cleaned;
        return buildGateCancelledResult(gate, reason);
      } finally {
        deps.resumeComposerFromDialog();
      }
    });
  }
  // handoff gate: no dialog frame, so `dialogHost.run()` doesn't apply — but
  // it still needs the same keyboard claim + drain-on-close guarantee `run()`
  // gives framed dialogs, so it goes through `withKeyboard()` instead.
  // Composer pause/resume stays this function's own job (there is no anchor
  // to compute and the subprocess-vs-dialog resume split below is specific
  // to this gate kind).
  return deps.dialogHost.withKeyboard(async () => {
    let subprocessResumed = false;
    deps.pauseComposer();
    try {
      return await waitForRawActionGate(deps.input, deps.output, gate, deps.spawnRunner, {
        beforeSubprocess: () => {
          // Subprocess starting
        },
        afterSubprocess: () => {
          subprocessResumed = true;
          deps.resumeComposerFromSubprocess();
        },
        registerToken: deps.registerToken,
      });
    } finally {
      if (!subprocessResumed) deps.resumeComposerFromDialog();
    }
  });
}

// ── S2：Turn 执行与队列 drain 的显式上下文容器与文件级函数 ──────────────────

/**
 * AgentTurnContext
 *
 * 显式传递给文件级 turn 执行与队列 drain 函数的上下文容器。
 * 遵循硬约束：turn 侧经 ctx 代理、输入循环侧同闭包直读；可变状态一律通过 getter/setter 提供双向读写引用语义，
 * 绝不进行单向展开拷贝或传值快照。
 */
export interface AgentTurnContext {
  /** Identity reserved by this host, not an existing history continuation. */
  pendingFreshDialogId?: string;
  // ── 可变引用语义字段（通过 getter/setter 代理到 runTuiWorkspace 闭包中的原始 let 绑定） ──
  state: TuiState;
  forcedStop: boolean;
  forcedStopEpoch: number;
  turnEpoch: number;
  activeTurnAbort: AbortController | null;
  activeTurnEpoch: number;
  chatQueueBinding: ChatQueueTuiBinding | null;
  /**
   * Dialog identity the current `chatQueueBinding` persists against (set by
   * `ensureChatQueueBinding` right before it installs the binding). Pending user
   * messages are saved under this id while the turn writes its provider receipt
   * under `state.dialogId`; the two must be the same dialog, so a recorded id
   * that no longer matches `state.dialogId` means the binding is stale and has
   * to be replaced. Undefined = unknown (host-supplied binding), treated as
   * "reuse" so pre-wired hosts keep their binding.
   */
  chatQueueBindingDialogId?: string;
  /**
   * `nolo dialog notify` receiver for the dialog this workspace currently has
   * open. Bound to the same lifetime as `chatQueueBinding`: it admits external
   * notifications through that binding's queue and nothing else. Null until the
   * binding exists, and stopped+cleared when the bound dialog changes.
   */
  dialogNotifyReceiver?: DialogNotifyReceiver | null;
  /**
   * 当前进行中 turn 的注入收件箱。runOneAgentTurn 开始时创建、结束时关闭清空；
   * 非 null 即表示「有 turn 正在跑，可直投当前 loop」。
   * 见 turnInjectionInbox.ts。
   */
  turnInjectionInbox: TurnInjectionInbox<TurnRequest | InternalTurnEvent | string> | null;
  /** 用户 turn 已准确建档；仅宿主可附加 TUI 展示元数据。 */
  onUserTurnFinalized?: (turn: import("./tuiHistory").Turn, imageUrls: readonly string[]) => void;

  // ── 外部只读 / 动态读取字段 ──
  readonly sessionEnded: boolean;
  /**
   * 分享 OAuth agent 的 shell 会话授权（块 D）：宿主在 runTuiWorkspace 启动时
   * 装配；owner-required 场景 adapter 在首次 execShell/launchProcess 前弹确认。
   * 会话级单例——dialogId 变化（/new、picker）不重置 granted；用户撤销经
   * `shellGrant.revoke()` 立即生效。
   */
  readonly shellGrant?: OriginShellGrant;
  readonly shellApprovalSession?: ShellApprovalSession;
  /**
   * 工具执行位置消费者（块 D）：宿主装配；owner-required 场景 adapter 回调
   * 一次，宿主渲染运行位置行。Web/桌面/RN 按同一契约后续接。
   */
  readonly onToolExecutionLocation?: (location: ToolExecutionLocation) => void;
  readonly buffer: string;
  readonly cursorPos: number;

  // ── 稳定实例与配置（fixedInput 具有运行期替换特性，经 getter 动态直通） ──
  readonly options: WorkspaceOptions;
  readonly effectiveEnv: Record<string, string | undefined>;
  readonly history: TurnHistory;
  readonly fixedInput: FixedInputController;
  readonly activityIndicator: ActivityIndicator;
  readonly activityReporter: (label: string | null) => void;
  readonly runRegistryPoller: RunRegistryPoller;
  /** 轮末空闲时把释放的 JS 堆页还给 OS（见 idleHeapRelease.ts）。 */
  readonly idleHeapReleaser: IdleHeapReleaser;
  readonly runCompletionWatcher: RunCompletionWatcher;
  readonly pasteStore: CollapsedPasteStore;
  readonly dialogHost: DialogHost | null;
  readonly input: NodeJS.ReadableStream;
  readonly output: NodeJS.WritableStream;

  // ── 渲染与状态回调 ──
  syncWindowTitle: () => void;
  renderHistoryToOutput: () => void;
  scheduleRender: () => void;
  flushPendingRender: () => void;
  /** attach 已有对话时读一次服务端历史累计，作为状态行积分的基数。 */
  seedDialogCreditsBase: (dialogId: string, dialogKey: string) => void;
  /** 把本轮平台积分累加进会话累计（undefined = 本轮无平台计费，不动累计）。 */
  accumulateSessionCredits: (credits: number | undefined) => void;
  emitCommandOutput: (text: string, command?: string) => void;
}

/**
 * S2: 文件级 runOneAgentTurn 函数
 *
 * 执行单轮 agent turn：记录用户发言到 transcript、调用 runAgentChat、
 * 处理终态/abort/强制停止、折叠 dialog 与 token 状态回 ctx。
 */
export async function runOneAgentTurn(
  ctx: AgentTurnContext,
  inputMsg: TurnRequest | InternalTurnEvent | string,
  imageUrls: string[],
  actionGateHandler: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>,
  confirmDestructiveAction?: (
    request: PermissionRequest,
  ) => Promise<boolean | { approved: boolean; hostResult?: AgentRuntimeToolResult }>,
  /**
   * 本机原件路径（图片 / 音视频）：client 侧转成安全附件卡（只含 name/mime/size/kind），
   * 不把 path / machineId 发给 provider。缺省 = 无附件卡（行为不变）。
   */
  localAttachmentPaths?: readonly string[],
): Promise<{ ok: boolean; aborted: boolean }> {
  // LLM 总结标题是 fire-and-forget 后台 patch：saveTurn 返回的 title 是
  // fallback（不阻塞 turn），真正标题 patch 完成后把最终标题同步到
  // dialogLabel + OSC 窗口标题，避免窗口标题停留在 fallback 直到下一轮
  // turn 才刷新（title 节流 30 分钟，可能很久看不到总结标题）。
  // 校验 dialogId 仍是当前 dialog：patch 是异步的，用户可能已 /new 或
  // /pick 切走，不能把旧 dialog 的标题盖到新 dialog 上。
  const scheduleTitlePatchSync = (runResult: RunAgentTurnResult) => {
    if (!runResult.titlePatchPromise || !runResult.dialogId) return;
    const patchDialogId = runResult.dialogId;
    runResult.titlePatchPromise
      .then((patchedTitle) => {
        if (!patchedTitle || ctx.sessionEnded) return;
        if (ctx.state.dialogId !== patchDialogId) return;
        if (ctx.state.dialogLabel === patchedTitle) return;
        ctx.state = {
          ...ctx.state,
          dialogLabel: patchedTitle,
          dialogTitle: patchedTitle,
        };
        ctx.syncWindowTitle();
      })
      .catch(() => {
        // 静默：patch 失败下一轮节流会重试，不值得打扰用户。
      });
  };
  let req = createTurnRequest(inputMsg);
  if (req.event.kind === "auto-review-continuation") {
    const scope = currentAutoReviewTask(ctx.state, ctx.effectiveEnv);
    if (!isHostAutoReviewContinuationEvent(req.event) || JSON.stringify(scope) !== JSON.stringify(req.event.scope)) return { ok: false, aborted: true };
    const task = readHostTask(hostTaskEventsRoot(ctx.effectiveEnv), scope!);
    if (task.authorization !== "active" || task.contract.acceptance === "pending" || task.contract.acceptance === "unknown") return { ok: false, aborted: true };
  }
  if (req.event.kind === "child-run-completed") {
    traceChildRunWake("turn-consume", req.event, ctx.state.dialogId ?? null, queueWakeFields(ctx.chatQueueBinding?.getStatus?.()));
    const event = prepareChildRunConsumption(req.event, {
      env: ctx.effectiveEnv, currentDialogId: ctx.state.dialogId ?? null,
      deferRuns: runs => ctx.runCompletionWatcher?.deferRuns?.(runs),
    });
    if (!event) return { ok: true, aborted: false };
    req = { ...req, text: event.text, event };
  }
  const message = req.text;
  // Allocate before the first provider call so busy submissions share this turn's dialog.
  const freshDialog = !ctx.state.dialogId || ctx.pendingFreshDialogId === ctx.state.dialogId;
  ctx.pendingFreshDialogId = undefined;
  if (!ctx.state.dialogId) ctx.state = { ...ctx.state, dialogId: mintTaskUserMessageId() };
  // 每轮 turn 开始时重置强制收尾标志，确保上一轮的强制停止不会泄漏到本轮。
  ctx.forcedStop = false;
  ctx.turnEpoch += 1;
  const myEpoch = ctx.turnEpoch;
  const emitStatus = (report: Parameters<typeof emitTerminalProgramStatus>[1]) =>
    emitTerminalProgramStatus(ctx.output, report);
  // 迟到的回调不许写回状态，判据有两条：
  // 1) 本 turn 必须仍是当前 turn：强制收尾（第二次 Esc）把屏幕交还用户后用户
  //    可能已经开了新一轮，旧 turn 的 done/error/working 会覆盖新一轮的状态。
  // 2) 「等真人」相关的上报（blocked、等完回来的 working，以及迟到异常）还要
  //    求本 turn 没被强制收尾过：强停那一下屏幕已交还用户并报过 idle，gate
  //    回调随后才返回时不许把 idle 覆盖成「在等你」/「出错了」。
  // 终态上报（强停自己的 idle、正常路径的 done/error）只走第一条：强停那次
  // forcedStopEpoch 就等于 myEpoch，走第二条反而发不出去。
  const emitStatusIfCurrentTurn = (report: Parameters<typeof emitTerminalProgramStatus>[1]) => {
    if (myEpoch === ctx.turnEpoch) emitStatus(report);
  };
  const emitStatusUnlessForceStopped = (report: Parameters<typeof emitTerminalProgramStatus>[1]) => {
    if (myEpoch === ctx.turnEpoch && ctx.forcedStopEpoch !== myEpoch) emitStatus(report);
  };
  // turn 开始只报 working。会话启动的那条 idle 由 readlineWorkspace 在开局发
  // 一次；这里再补一条 idle 会把上一轮还没被用户看到的 done 抹掉（协议：
  // done/error 持续到有新工作或用户确认，没有自动清除）。
  emitStatus({ state: "working" });
  // Agent 被 gate 拦下 = 在等真人操作：`confirm`（写文件 / 破坏性操作确认）报
  // permission；`handoff`（把命令交给用户自己的终端跑）与 `input`（Agent 提问）
  // 报 question —— 三者都是「等你」，kind 只区分等待的原因。gate 关掉后回到
  // working，之后正常走 done/error。整段包在 epoch 守卫里，旧 turn 迟到的 gate
  // 回调不会把新一轮的 blocked/working 写回去。
  const gateHandlerWithStatus = async (
    gate: LocalAgentActionGate,
  ): Promise<AgentRuntimeToolResult | void> => {
    // /auto on 的自动放行不是「在等你」：handler 会立刻返回 confirmed，不会有人
    // 来解除这个等待，报 blocked 就是把「在跑」谎报成「卡在等确认」。判据与
    // readlineWorkspace 的 actionGateHandler 短路同源（`state` 是可变绑定，
    // 这里读到的永远是最新值，busy 期间 /auto 也生效）；权限决定仍由 handler
    // 自己做，这里只决定报不报 blocked。
    if (ctx.state.permissionGrants?.local === true && isAutoConfirmableFileWriteGate(gate)) {
      return await actionGateHandler(gate);
    }
    emitStatusUnlessForceStopped({
      state: "blocked",
      kind: gate.kind === "confirm" ? "permission" : "question",
    });
    try {
      return await actionGateHandler(gate);
    } finally {
      emitStatusUnlessForceStopped({ state: "working" });
    }
  };
  // 破坏性操作确认走的是另一条输入路径（confirmDestructiveAction，不经
  // actionGateHandler）：真人得在弹窗里批准/拒绝，这就是「在等权限」。同样跳过
  // /auto on 的自动放行——readlineWorkspace 侧那个 handler 开头就 `return true`，
  // 没有等待可言。权限决定本身不变，这里只加状态包装。
  // 输出不是 TTY（管道 / 日志 / JSON）时连包装都不做：状态根本发不出去
  // （emitTerminalProgramStatus 自己也有同一条 isTTY 闸门），转发的回调保持原样。
  const confirmDestructiveActionWithStatus =
    // 真实流（process.stdout 等）在运行期带可选 isTTY 旗标，但
    // NodeJS.WritableStream 类型不声明它（terminalProgramStatus.ts 的
    // TerminalProgramStatusOutput 同一口径）——这里只做类型收窄，不改值。
    confirmDestructiveAction && (ctx.output as NodeJS.WritableStream & { isTTY?: boolean }).isTTY === true
      ? async (
          request: PermissionRequest,
        ): Promise<boolean | { approved: boolean; hostResult?: AgentRuntimeToolResult }> => {
          if (ctx.state.permissionGrants?.local === true) return await confirmDestructiveAction(request);
          emitStatusUnlessForceStopped({ state: "blocked", kind: "permission" });
          try {
            const approved = await confirmDestructiveAction(request);
            if (!approved) return false;
            // 执行前确认点：用户批准后，若这条命令属于「贴入 key 建 agent」的受限
            // 场景，由宿主进程内执行并把真实结果带回，spawn 侧会跳过原命令。
            // 必须走 runApprovedCredentialCommand（内含命令哈希幂等去重 + 失败可重试），
            // 否则同一已批准命令重复进入回调会二次 create / 二次向固定 origin 探活。
            const commandText = typeof request.command === "string" ? request.command : "";
            if (commandText) {
              const { runApprovedCredentialCommand } = await import("./hostCredentialCreate");
              const hostResult = await runApprovedCredentialCommand({
                commandText,
                approvalEventId: request.id,
                env: (process.env ?? {}) as Record<string, string | undefined>,
              });
              if (hostResult) return { approved: true, hostResult };
            }
            return true;
          } finally {
            emitStatusUnlessForceStopped({ state: "working" });
          }
        }
      : confirmDestructiveAction;
  ctx.history.followBottom = true;
  // 屏幕上印什么 ≠ 送进模型的是什么。终态唤醒是系统事件，不是用户发言：
  // 模型仍收完整摘要（message），transcript 只留一行紧凑状态，且不套用户
  // 气泡——否则每条 run 完成都在对话里伪造一条几百字的「用户消息」。
  // 片段识别统一走 chat/messages/contextualFragment.ts 注册表：wake 文案
  // 标记化后格式来源单一，这里不再自行猜文本形态。
  const isInternalEvent = req.event.kind !== "user";
  const isContextualFragment = matchContextualFragment(message) !== null;
  // Keep image bytes out of visible history; use the direct-send attachment callback.
  const batchDisplay = (req as TuiBatchTurnRequest).userMessages?.map(user => ({
    text: typeof user.content === "string" ? user.content : (user.content ?? [])
      .filter(part => part.type === "text").map(part => part.text).join("\n"),
    imageUrls: typeof user.content === "string" ? [] : (user.content ?? [])
      .filter(part => part.type === "image_url").map(part => part.image_url.url),
  }));
  const batchLast = batchDisplay?.at(-1);
  const transcriptText = batchLast ? batchLast.text : req.event.kind === "auto-review-continuation" ? req.event.displayText :
    isContextualFragment
    && (req.event.kind === "child-run-completed" || req.event.kind === "background-task-completed")
      ? (req.event.displayText ?? req.event.text)
      : message;
  // 跨事件相邻的后台完成通知在屏幕上是**一个通知组**：一个组头 + 每条任务
  // 一行完整标题与耗时。纯显示层的事——模型消息 / 持久消息 / ack / 调度 /
  // 事件顺序都不动，wake 也不因此延后。
  // 任务数据来自结构化终态（run 记录 + 共享展示模型），不解析格式化文案。
  const noticeTasks =
    req.event.kind === "child-run-completed"
      ? buildNoticeTasksFromRuns(req.event.runs, Date.now())
      : null;
  // 先收掉进行中的流式轮（口径与 startTurn 一致）：它吐出的可见输出
  // 应当准确打断通知组。
  if (ctx.history.currentRole !== null && ctx.history.currentContent) {
    finalizeCurrentTurn(ctx.history);
  }
  // 并入上一条通知轮：命中则屏幕上是「一个组头 + 每条任务一行」的通知组，
  // 没命中就按原样新建一轮。
  const merged = noticeTasks
    ? mergeNoticeGroup(ctx.history.turns, noticeTasks, (text) =>
        dimCliText(text, resolveCliColorEnabled()),
      )
    : null;
  if (!merged) {
    for (const prior of batchDisplay?.slice(0, -1) ?? []) {
      startTurn(ctx.history, "user");
      appendToCurrentTurn(ctx.history, prior.text);
      finalizeCurrentTurn(ctx.history);
      const turn = ctx.history.turns[ctx.history.turns.length - 1];
      if (turn?.role === "user") ctx.onUserTurnFinalized?.(turn, prior.imageUrls);
    }
    startTurn(ctx.history, isInternalEvent ? "assistant" : "user");
    appendToCurrentTurn(
      ctx.history,
      isInternalEvent
        ? dimCliText(transcriptText, resolveCliColorEnabled())
        : transcriptText,
    );
    finalizeCurrentTurn(ctx.history);
    if (noticeTasks) {
      setTurnNoticeMeta(ctx.history.turns[ctx.history.turns.length - 1]!, {
        tasks: noticeTasks,
      });
    }
  }
  const finalizedUserTurn = ctx.history.turns[ctx.history.turns.length - 1];
  if (!isInternalEvent && finalizedUserTurn?.role === "user" && finalizedUserTurn.content === transcriptText) {
    ctx.onUserTurnFinalized?.(finalizedUserTurn, batchLast?.imageUrls ?? imageUrls);
  }
  ctx.renderHistoryToOutput();
  if (ctx.fixedInput.active) ctx.fixedInput.repaint(ctx.buffer, ctx.cursorPos);

  // 统一基线定义：最近一次权威 input + 自那之后所有新增内容（assistant 输出 / user 消息 / tool 结果）的估算增量。
  // turn 开始时用共享 estimateMessagesTokens 估出新增内容并入基线，并清空上一轮的 turnTokens（避免
  // 上下文 chip 残留上一轮未包含回答的 provider input）。
  // 分支判定：只有当存在真实权威 input 且 authTurnCount 有效时才走切片分支；无真权威时必须走估算分支。
  const previousContextUsage = { turnTokens: ctx.state.turnTokens, lastAuthorityTurnCount: ctx.state.lastAuthorityTurnCount };
  const nextBaseline = computeBaselineContextTokens({
    authoritativeInput: ctx.state.turnTokens?.input,
    lastAuthorityTurnCount: ctx.state.lastAuthorityTurnCount,
    turns: ctx.history.turns,
    fallbackEstimate: () =>
      estimateDefaultCliContextTokens({
        cwd: ctx.state.cwd,
        agentKey: ctx.state.agentKey,
        agentName: ctx.state.agentName,
        userLanguage: ctx.state.userLanguage,
        responseViewport: TUI_RESPONSE_VIEWPORT,
        messages: ctx.history.turns,
        ...resolveAgentModelIdentity({
          agentKey: ctx.state.agentKey,
          agentName: ctx.state.agentName,
        }),
      }),
  });

  // 轮内实时积分与估算推进从 0 开始：上一轮若经异常路径退出，这里兜底清掉残留；
  // 同时重置 turnTokens 为 undefined，由并入新增内容的基线接管展示。
  ctx.state = {
    ...ctx.state,
    turnTokens: undefined,
    estimatedContextTokens: nextBaseline,
    liveTurnCredits: undefined,
    liveTurnEstimatedTokens: undefined,
  };

  startTurn(ctx.history, "assistant");
  const liveTracker = createLiveTurnTracker();
  const agentOutput = isInteractiveInput(ctx.input)
    ? createHistoryOutputStream(ctx.history, () => {
        const { updated, liveTokens } = liveTracker.onStreamChunk(ctx.history.currentContent);
        if (updated) {
          ctx.state = {
            ...ctx.state,
            liveTurnEstimatedTokens: liveTokens,
          };
        }
        ctx.scheduleRender();
      }, {
        visibleRunIds: () => ctx.activityIndicator.getVisibleRunIds?.() ?? new Set<string>(),
      })
    : ctx.output;
  // Interactive ask_user: dock an arrow-key select dialog above the
  // composer (same dialogHost + runSelectDialog as the /agent picker) and
  // resolve the user's pick into the userMessage that continues the turn.
  // Only wired in interactive TUI mode; headless/CI falls back to text menu.
  //
  // The ask_choice popup installs its own raw-key reader on stdin; without a
  // keyboard claim the same `data` event fans out to both it and the
  // composer's decoder, so every key (Esc/Enter/printable) is handled twice
  // — once by the popup and once by handleInputToken, which aborts the turn
  // on Esc and pollutes the composer draft/queue on Enter.
  // `dialogHost.run()` now claims the keyboard for the popup's full lifetime
  // and drains the composer's decoder (a debounced Enter, a partial ESC/CSI
  // tail) before releasing it on close, so this call site no longer needs to
  // manage any of that by hand — see dialogHost.ts's file docstring.
  const requestUserChoice =
    isInteractiveInput(ctx.input) && ctx.dialogHost
      ? async (choiceReq: UserChoiceRequest): Promise<UserChoiceResult> => {
          // ask_user 把 Agent 从自主运行切成等用户选择：立即提醒（BEL +
          // Windows Terminal indeterminate progress，无时长门槛——等待本身
          // 就值得提醒）；作答 / 取消 / 异常任何退出路径都由 finally 清掉
          // progress（见 runWithInputRequiredAttention）。
          return await runWithInputRequiredAttention(
            {
              output: ctx.output,
              env: ctx.effectiveEnv,
              onWaiting: () => emitStatusUnlessForceStopped({ state: "blocked", kind: "question" }),
              onResumed: () => emitStatusUnlessForceStopped({ state: "working" }),
            },
            async () => {
              try {
                return await ctx.dialogHost!.run((anchor) =>
                  runAskChoiceDialog({
                    request: choiceReq,
                    input: ctx.input as NodeJS.ReadStream,
                    output: ctx.output as NodeJS.WritableStream,
                    ...anchor,
                    // ask_user hosted: the wheel scrolls the transcript above the
                    // dialog; the option list is navigated with ↑↓ only.
                    inputPolicy: { ...anchor.inputPolicy, wheel: "transcript" },
                  }),
                );
              } catch {
                return { kind: "cancelled" };
              }
            },
          );
        }
      : undefined;
  ctx.idleHeapReleaser.cancel();
  ctx.runRegistryPoller.beginHold();
  // 本轮的注入收件箱：runWakeHandler 在 busy 时把后台 run 终态唤醒直投这里，
  // 由 local loop 的 drainInjections 在轮边界取走注入当前 loop。
  const injectionInbox = createTurnInjectionInbox<
    TurnRequest | InternalTurnEvent | string
  >();
  ctx.turnInjectionInbox = injectionInbox;
  // 本轮通过 drainInjections 接入的用户批次：saveTurn 在同一 store.batch 里
  // 标 completed（见 agentRun.ts / writeDialog cliBatchCompletion）。
  const drainInjectedBatches: Array<{ batchId: string; messageIds: string[] }> = [];
  let processCausalDepth = req.event.kind === "background-task-completed" ? (req.event.processCausalDepth ?? 0) : 0;
  // 后台进程任务终态通知：组装前先快照本轮要注入的行，消费点只清掉快照里的行。
  const injectedProcessNoticeLines = ctx.state.pendingProcessNotices
    ? [...ctx.state.pendingProcessNotices]
    : [];
  const consumeInjectedProcessNotices = (keepAll = false): string[] => {
    if (keepAll || injectedProcessNoticeLines.length === 0) {
      return ctx.state.pendingProcessNotices ?? [];
    }
    const injected = new Set(injectedProcessNoticeLines);
    return (ctx.state.pendingProcessNotices ?? []).filter(
      (line) => !injected.has(line),
    );
  };
  // 后台子 agent run 终态通知：组装前快照本轮要注入的条目，消费点只清掉快照里的条目。
  const injectedChildRunNoticeItems = (ctx.state.pendingChildRunNotices ?? []).filter(r => !!r.parentDialogId && r.parentDialogId === ctx.state.dialogId);
  const consumeInjectedChildRunNotices = (keepAll = false): AgentRunCompletionShape[] => {
    if (keepAll || injectedChildRunNoticeItems.length === 0) {
      return ctx.state.pendingChildRunNotices ?? [];
    }
    const injectedIds = new Set(injectedChildRunNoticeItems.map((r) => r.runId));
    return (ctx.state.pendingChildRunNotices ?? []).filter(
      (r) => !injectedIds.has(r.runId),
    );
  };
  const originDialogId = ctx.state.dialogId;
  const terminalEvents: InternalTurnEvent[] = [req.event];
  const settleNotices = (persisted: boolean) => {
    const keepPending = !persisted;
    if (persisted) {
      for (const run of injectedChildRunNoticeItems) ctx.runCompletionWatcher?.markAcknowledged(run.runId);
      for (const event of terminalEvents) {
        if (event.kind === "child-run-completed") for (const run of event.runs) ctx.runCompletionWatcher?.markAcknowledged(run.runId);
      }
    }
    for (const event of terminalEvents) traceChildRunWake("turn-notice-settle", event, ctx.state.dialogId ?? null, { persisted, ...queueWakeFields(ctx.chatQueueBinding?.getStatus?.()) });
    let nextProcessNotices = consumeInjectedProcessNotices(keepPending);
    let nextChildRunNotices = consumeInjectedChildRunNotices(keepPending);
    for (const event of terminalEvents) {
      if (keepPending && event.kind === "background-task-completed") {
        const ownerDialogId = originDialogId ?? null;
        const noticeToStore: ProcessTerminalNotice = event.notice ?? {
          taskId: event.taskId,
          pid: 0,
          label: event.text,
          command: event.taskId,
          status: event.status,
          exitCode: event.exitCode,
        };
        const line = serializePendingProcessNotice(noticeToStore, ownerDialogId);
        if (!nextProcessNotices.includes(line)) {
          nextProcessNotices = [...nextProcessNotices, line];
        }
      }
      if (keepPending && event.kind === "child-run-completed" && event.runs.length > 0) {
        const existingIds = new Set(nextChildRunNotices.map((r) => r.runId));
        const newItems = event.runs
          .filter((r) => !existingIds.has(r.runId))
          .map((r) => ({ ...r }));
        if (newItems.length > 0) {
          nextChildRunNotices = [...nextChildRunNotices, ...newItems];
        }
      }
    }
    return {
      pendingProcessNotices: nextProcessNotices.length ? nextProcessNotices : undefined,
      pendingChildRunNotices: nextChildRunNotices.length ? nextChildRunNotices : undefined,
    };
  };
  let turnOutcomeSettled = false;
  try {
    ctx.activeTurnAbort = new AbortController();
    ctx.activeTurnEpoch = myEpoch;
    const turnStartedAtMs = Date.now();
    const runResult = await runAgentChat(
      ctx.options.scriptDir,
      ctx.state,
      message,
      ctx.options.env ?? process.env,
      agentOutput,
      ctx.options.agentRunner,
      {
        freshDialog,
        userMessages: (req as TuiBatchTurnRequest).userMessages,
        ...((req as TuiBatchTurnRequest).cliBatchId
          ? { cliBatchId: (req as TuiBatchTurnRequest).cliBatchId }
          : {}),
        ...(req.event.kind === "user" ? { accountTaskUserSource: {
          ...((req as TuiBatchTurnRequest).batchUserSource ?? {
            messageId: req.messageId ?? mintTaskUserMessageId(),
            originalText: message,
            contentSha256: hashTaskUserMessage("sha256").update(message).digest("hex"),
          }),
        } } : {}),
        ...(imageUrls.length > 0 ? { imageUrls } : {}),
        ...(localAttachmentPaths && localAttachmentPaths.length > 0
          ? { localAttachmentPaths }
          : {}),
        actionGateHandler: gateHandlerWithStatus,
        ...(confirmDestructiveActionWithStatus
          ? { confirmDestructiveAction: confirmDestructiveActionWithStatus }
          : {}),
        ...(requestUserChoice ? { requestUserChoice } : {}),
        abortSignal: ctx.activeTurnAbort.signal,
        getProcessCausalDepth: () => processCausalDepth,
        drainInjections: async () => {
          const entries: import("../../agent-runtime").LocalTurnInjection[] = [];
          // 1) 内部通知（后台 run 终态唤醒）：保持既有行为，逐条转文本。
          for (const text of injectionInbox.drain(({ fallback }) => {
            let event = typeof fallback === "object" && fallback !== null && "event" in fallback ? fallback.event : fallback;
            if (typeof event === "object" && event !== null && event.kind === "child-run-completed") {
              const prepared = prepareChildRunConsumption(event, { env: ctx.effectiveEnv, currentDialogId: ctx.state.dialogId ?? null, deferRuns: runs => ctx.runCompletionWatcher?.deferRuns?.(runs) });
              if (!prepared) return false;
              event = prepared;
            }
            if (typeof event === "object" && event !== null && (event.kind === "background-task-completed" || event.kind === "child-run-completed")) {
              traceChildRunWake("inbox-drain", event, ctx.state.dialogId ?? null, queueWakeFields(ctx.chatQueueBinding?.getStatus?.()));
              terminalEvents.push(event);
            }
            if (typeof event === "object" && event !== null && event.kind === "background-task-completed") {
              processCausalDepth = Math.max(processCausalDepth, event.processCausalDepth ?? 0);
            }
            if (typeof event === "object" && event !== null && event.kind === "child-run-completed") return event.text;
          })) {
            entries.push(text);
          }
          // 2) 排队用户批次：在当前模型响应/工具组安全结束后、下一次 provider
          //    调用前集中接入。这里只 claim + 准备附件，真正的 requested 回执由
          //    localLoop 在请求边界（provider dispatch 前）提交：abort/失败时
          //    回滚为 pending 并留队，绝不留下「已 requested 但从未发送」的假戳。
          const binding = ctx.chatQueueBinding;
          const claimed = binding?.claimBatchForInjection?.() ?? null;
          if (claimed) {
            const dialogId = ctx.state.dialogId;
            const batchId = claimed.requests.at(-1)?.messageId;
            const messageIds = claimed.requests.map(request => request.messageId).filter((id): id is string => Boolean(id));
            let store: any;
            try {
              if (!dialogId) throw new Error("Cannot inject queued user batch without a dialog id");
              if (!batchId) throw new Error("Queued user batch requires a stable tail messageId");
              store = await getOrCreateSharedStore({ env: ctx.effectiveEnv, cwd: ctx.state.cwd, fetchImpl: ctx.options.fetchImpl });
              // 与 runQueuedUserBatch 同构（含 cliSource/cliImagePaths 等扩展字段）。
              const userMessages: any[] = [];
              const displayMessages: Array<{ text: string; imageUrls: string[] }> = [];
              for (const original of claimed.requests) {
                if (!original.messageId) throw new Error("Queued user batch requires stable message ids");
                const { request, imageUrls } = await prepareQueuedUserRequest(ctx, original);
                displayMessages.push({ text: request.text, imageUrls });
                userMessages.push({ role: "user", cliMessageId: original.messageId,
                  cliSource: original.source, cliImagePaths: original.imagePaths, cliMediaPaths: original.mediaPaths,
                  content: imageUrls.length ? [{ type: "text" as const, text: request.text },
                    ...imageUrls.map(url => ({ type: "image_url" as const, image_url: { url } }))] : request.text });
                if (ctx.activeTurnAbort?.signal.aborted) throw new Error("Turn aborted during injection preparation");
              }
              // The loop normally commits once, but a repeated commit must not
              // accept the claim or append visible user messages a second time.
              let commitPromise: Promise<void> | undefined;
              let rolledBack = false;
              const displayedTurns: typeof ctx.history.turns = [];
              entries.push({
                messages: userMessages,
                commit: () => commitPromise ??= (async () => {
                  if (rolledBack) return;
                  await markCliUserBatchPhase(store, dialogId, batchId, "requested", messageIds, userMessages);
                  if (rolledBack) return;
                  binding!.acceptClaimedBatch(claimed.batchId);
                  drainInjectedBatches.push({ batchId, messageIds });
                  // Split the live assistant at this boundary, then resume it
                  // after the original user messages (never their image bytes).
                  ctx.history.followBottom = true;
                  for (const user of displayMessages) {
                    startTurn(ctx.history, "user");
                    appendToCurrentTurn(ctx.history, user.text);
                    finalizeCurrentTurn(ctx.history);
                    const turn = ctx.history.turns[ctx.history.turns.length - 1]!;
                    displayedTurns.push(turn);
                    ctx.onUserTurnFinalized?.(turn, user.imageUrls);
                  }
                  startTurn(ctx.history, "assistant");
                  ctx.renderHistoryToOutput();
                  if (ctx.fixedInput.active) ctx.fixedInput.repaint(ctx.buffer, ctx.cursorPos);
                })(),
                rollback: async () => {
                  rolledBack = true;
                  // Serialize a rollback with an in-progress receipt write.
                  // A failed commit still needs its durable/visible rollback.
                  await commitPromise?.catch(() => {});
                  await rollbackCliUserBatchPhase(store, dialogId, batchId, messageIds);
                  binding!.rollbackClaimedBatch(claimed.batchId, claimed.requests);
                  // Abort may land during the receipt write, after commit has
                  // painted. Remove only this transaction's visible user turns.
                  for (const turn of displayedTurns) {
                    const index = ctx.history.turns.indexOf(turn);
                    if (index >= 0) ctx.history.turns.splice(index, 1);
                  }
                  if (displayedTurns.length > 0) {
                    ctx.renderHistoryToOutput();
                    if (ctx.fixedInput.active) ctx.fixedInput.repaint(ctx.buffer, ctx.cursorPos);
                  }
                  // Never let a rolled-back batch reach the completion path.
                  const index = drainInjectedBatches.findIndex(batch => batch.batchId === batchId);
                  if (index >= 0) drainInjectedBatches.splice(index, 1);
                },
              });
            } catch (error) {
              binding!.rollbackClaimedBatch(claimed.batchId, claimed.requests);
              throw error;
            }
          }
          return entries;
        },
        drainInjectedBatches,
        pastedTextStore: ctx.pasteStore,
        activityReporter: ctx.activityReporter,
        // 分享 OAuth agent 的 shell 会话授权（块 D）：宿主装配的会话级对象；
        // 非 owner-required 场景 adapter 不触发。
        ...(ctx.shellGrant ? { shellGrant: ctx.shellGrant } : {}),
        ...(ctx.shellApprovalSession ? { shellApprovalSession: ctx.shellApprovalSession } : {}),
        // 运行位置展示（块 D）：宿主装配的渲染回调；adapter 只在
        // owner-required 场景回调一次。
        ...(ctx.onToolExecutionLocation
          ? { onToolExecutionLocation: ctx.onToolExecutionLocation }
          : {}),
        onAgentRunStatus: (snapshot) => {
          if (snapshot) {
            ctx.activityIndicator.updateAgentRun(snapshot);
            // onAgentRunStatus 为活跃 run 更新指示器并确保轮询器运行；
            // runRegistryPoller 也会独立扫描本地 registry 发现新 run。
            ctx.runRegistryPoller.ensureRunning();
          } else {
            ctx.activityIndicator.clearAgentRun();
          }
        },
        // 轮内实时积分：每帧即累加进 liveTurnCredits 并节流重绘，让 ⚡ 在
        // provider 调用完成时就跳一下，而不是等整轮结束才出现。轮末由
        // accumulateSessionCredits 用权威 turnCredits 结算（readlineWorkspace
        // 侧清零 live 值），本会话三条退出路径（正常 / abort / forceStop）
        // 都汇聚在那里，live 残留不会跨轮泄漏。
        onLiveTurnCredits: (credits) => {
          if (ctx.sessionEnded) return;
          ctx.state = {
            ...ctx.state,
            liveTurnCredits: (ctx.state.liveTurnCredits ?? 0) + credits,
          };
          ctx.scheduleRender();
        },
      },
    );
    // 强制收尾保护：第二次 Esc 已把 activeTurnAbort 置 null、busyLock 解除、
    // 打印过 forceStopped 提示。runAgentChat 现在才返回 —— 这段迟到返回值
    // 必须整体丢弃：不读已 null 的 activeTurnAbort（会 NPE）、不重复打印
    // turnStopped、不重绘（用户可能已在输入新一轮）。用 epoch 比对而非全局
    // forcedStop：强制停止后用户可能已发起新 turn 并重置 forcedStop=false，
    // 旧 turn 靠 myEpoch === forcedStopEpoch 识别自己被强制过。
    // dialogId/turnTokens 的状态折叠仍可安全执行（纯数据，不碰 UI 锁）。
    if (runResult.hostTaskRef) {
      ctx.state = { ...ctx.state, autoReviewTask: {
        userId: resolveTuiLearnOperatorUserId(ctx.effectiveEnv) ?? "local",
        reference: runResult.hostTaskRef,
      } };
    }
    const wasForceStopped = ctx.forcedStopEpoch === myEpoch;
    if (wasForceStopped) {
      emitStatusIfCurrentTurn({ state: "idle" });
      const nextDialogKey = runResult.dialogId
        ? runResult.dialogId === ctx.state.dialogId && ctx.state.dialogKey
          ? ctx.state.dialogKey
          : ctx.state.dialogOwnerId
            ? `dialog-${ctx.state.dialogOwnerId}-${runResult.dialogId}`
            : undefined
        : ctx.state.dialogKey;
      ctx.state = {
        ...ctx.state,
        ...(runResult.dialogId
          ? {
              dialogId: runResult.dialogId,
              dialogKey: nextDialogKey,
              dialogLabel: runResult.title || runResult.dialogId,
              ...(runResult.title ? { dialogTitle: runResult.title } : {}),
            }
          : {}),
        ...(runResult.turnTokens ? { turnTokens: runResult.turnTokens } : {}),
        ...(runResult.turnTokens && runResult.turnTokens.input > 0
          ? (() => {
              const assistantDelta = Math.max(
                0,
                estimateMessagesTokens(ctx.history.turns) -
                  historyTokensBeforeLatestAssistant(ctx.history.turns),
              );
              return {
                estimatedContextTokens: runResult.turnTokens.input + assistantDelta,
                lastAuthorityTurnCount: resolveAuthorityTurnCount(ctx.history.turns),
                liveTurnEstimatedTokens: assistantDelta > 0 ? assistantDelta : undefined,
              };
            })()
          : preserveContextUsageWithoutReceipt(previousContextUsage, nextBaseline)),
        ...(runResult.cachedMemoryOverlay !== undefined ? { cachedMemoryOverlay: runResult.cachedMemoryOverlay } : {}),
        // Cwd notices are independent; terminal notices require a save receipt.
        pendingCwdNotice: undefined,
        // 只移除本轮注入过的行（见 processNoticeBlocks 的快照注释）。
        ...settleNotices(runResult.savedTurnPersisted === true),
      };
      turnOutcomeSettled = true;
      // 记账不挂在「有 dialogId / turnTokens」这个条件上：中断的 turn 常常
      // 两者都没有，但前面已经跑掉的 provider 调用照样扣了费。
      ctx.accumulateSessionCredits(runResult.turnCredits);
      appendTurnBillingAudit({
        dialogId: runResult.dialogId ?? null,
        turnCredits: runResult.turnCredits ?? null,
        usageRecords: runResult.usageRecords,
        aborted: true,
      });
      scheduleTitlePatchSync(runResult);
      return { ok: false, aborted: true };
    }
    const wasAborted = ctx.activeTurnAbort.signal.aborted;
    if (runResult.businessCompletion) {
      const completion = runResult.businessCompletion;
      const label = { completed: "任务完成", incomplete: "任务未完整完成", blocked: "任务受阻", waiting: "等待用户验收" }[completion.status];
      ctx.emitCommandOutput(`[auto-review] ${label}${completion.reasons.length ? `：${completion.reasons.join(", ")}` : ""}`);
    }
    ctx.activeTurnAbort = null;
    // turn-completed attention 只对「跑了足够久的成功长任务」响：300ms 的
    // 普通聊天每句都响会非常烦（门槛见 TURN_COMPLETION_ATTENTION_THRESHOLD_MS）。
    // Windows Terminal 下附带一条 OSC 9;4 clear，防御性清掉任何残留 progress。
    if (
      shouldEmitTerminalBell({
        wasAborted,
        streamInterrupted: runResult.streamInterrupted,
        exitCode: runResult.exitCode,
        interactive: isInteractiveInput(ctx.input),
        durationMs: Date.now() - turnStartedAtMs,
      })
    ) {
      emitTerminalAttention({
        output: ctx.output,
        env: ctx.effectiveEnv,
        reason: "turn-completed",
      });
    }
    if (isInteractiveInput(ctx.input)) {
      finalizeCurrentTurn(ctx.history);
      ctx.flushPendingRender();
      ctx.renderHistoryToOutput();
      if (ctx.fixedInput.active) ctx.fixedInput.repaint(ctx.buffer, ctx.cursorPos);
    }
    // 终态判定与后台结算共用同一份真值（client/terminalRunStatus）：停滞/截断的
    // run 会带着 exitCode 0 返回，只看 exitCode 会把它报成 done，而 registry 记的
    // 是 failed。中断同理有两张面孔 —— 用户按 Esc（wasAborted）与流中途被中断
    // （provider 报错，runResult.streamInterrupted，此时并未 abort，对话可能仍在
    // 服务端继续）—— 两者都该报 idle；只看 wasAborted 会把后者报成 done，与
    // 一次性 CLI 对同一个 run 的结论相反。epoch 守卫与强停那条 idle 路径不变。
    emitStatusIfCurrentTurn({
      state: resolveTerminalProgramStatusState({
        exitCode: runResult.exitCode,
        interrupted: wasAborted || runResult.streamInterrupted === true,
        // Business completion is a task-scoped outcome, not a runtime fault: an
        // unfinished or still-pending task must not fabricate a stalled/truncated
        // signal (and therefore not an error terminal state). The task status is
        // reported on its own line above; runtime faults stay with
        // isRunResultStalledOrTruncated, which the one-shot CLI settlement shares.
        stalledOrTruncated: isRunResultStalledOrTruncated(runResult),
      }),
    });
    if (wasAborted) {
      if (runResult.pendingToolName) {
        // 协作式中止时工具仍在跑：localLoop 放弃等待但工具可能已在后台
        // 完成，其结果不会进入本次对话历史。告知工具名，语气正常。
        ctx.emitCommandOutput(t("turnStoppedToolPending", runResult.pendingToolName));
      } else {
        ctx.emitCommandOutput(t("turnStopped"));
      }
    }
    const nextDialogKey = runResult.dialogId
      ? runResult.dialogId === ctx.state.dialogId && ctx.state.dialogKey
        ? ctx.state.dialogKey
        : ctx.state.dialogOwnerId
          ? `dialog-${ctx.state.dialogOwnerId}-${runResult.dialogId}`
          : undefined
      : ctx.state.dialogKey;
    const { pendingProcessNotices: nextProcessNotices, pendingChildRunNotices: nextChildRunNotices } = settleNotices(runResult.savedTurnPersisted === true);
    ctx.state = {
      ...ctx.state,
      ...(runResult.dialogId
        ? {
            dialogId: runResult.dialogId,
            dialogKey: nextDialogKey,
            dialogLabel: runResult.title || runResult.dialogId,
            ...(runResult.title ? { dialogTitle: runResult.title } : {}),
          }
        : {}),
      ...(runResult.turnTokens ? { turnTokens: runResult.turnTokens } : {}),
      ...(runResult.contextWindow
        ? { contextWindow: runResult.contextWindow }
        : {}),
      // input_tokens 是累计上下文输入（含历史消息），用本轮权威 input 重置基线；无 usage 时使用对话历史消息估算兜底。
      // 权威 input 是该次回答生成前的快照，不含最后一轮 assistant 输出；与 Web 侧对齐，用共享
      // historyTokensBeforeLatestAssistant 将回答本身作为权威增量带入，避免权威到达瞬间 chip 少一条回答。
      ...(runResult.turnTokens && runResult.turnTokens.input > 0
        ? (() => {
            const assistantDelta = Math.max(
              0,
              estimateMessagesTokens(ctx.history.turns) -
                historyTokensBeforeLatestAssistant(ctx.history.turns),
            );
            return {
              estimatedContextTokens: runResult.turnTokens.input + assistantDelta,
              lastAuthorityTurnCount: resolveAuthorityTurnCount(ctx.history.turns),
              liveTurnEstimatedTokens: assistantDelta > 0 ? assistantDelta : undefined,
            };
          })()
        : previousContextUsage.turnTokens
          ? preserveContextUsageWithoutReceipt(previousContextUsage, nextBaseline)
          : {
            estimatedContextTokens: estimateDefaultCliContextTokens({
              cwd: ctx.state.cwd,
              agentKey: ctx.state.agentKey,
              agentName: ctx.state.agentName,
              userLanguage: ctx.state.userLanguage,
              responseViewport: TUI_RESPONSE_VIEWPORT,
              messages: ctx.history.turns,
            }),
            lastAuthorityTurnCount: undefined,
            liveTurnEstimatedTokens: undefined,
          }),
      ...(runResult.cachedMemoryOverlay !== undefined ? { cachedMemoryOverlay: runResult.cachedMemoryOverlay } : {}),
      // 切换消息/进程终态通知本轮已注入 agent 上下文（runAgentChat 已读），
      // 消费掉，避免下轮重复注入。仅当确实发起了 agent 调用（本轮是真实
      // turn、而非纯 child-run-completed 事件短路）时才清除。
      pendingCwdNotice: undefined,
      // 若本轮因 preflightBlocked 拒发（如上下文超限），主请求未送出，模型
      // 尚未消费后台事件，通知保留在 pending 中；当主请求成功发出且未被拦截时，
      // 才消费掉本轮注入项（settle）。若本轮直接作为 completion turn 拒发，则将事件
      // 沉淀进 pending，供用户紧接着发起的下一个 turn 注入，防止丢失与重复重放。
      pendingProcessNotices: nextProcessNotices,
      pendingChildRunNotices: (nextChildRunNotices?.length ?? 0) > 0 ? nextChildRunNotices : undefined,
    };
    turnOutcomeSettled = true;
    // 同上：失败 / 中断的 turn 也要计进会话累计。
    ctx.accumulateSessionCredits(runResult.turnCredits);
    appendTurnBillingAudit({
      dialogId: runResult.dialogId ?? null,
      turnCredits: runResult.turnCredits ?? null,
      usageRecords: runResult.usageRecords,
      // 普通中断（Esc）同样属于「账照记、轮未正常收尾」，审计行标注出来，
      // 与 1028 行 forceStop 路径及正常完成轮区分开。
      ...(wasAborted || runResult.streamInterrupted ? { aborted: true } : {}),
    });
    scheduleTitlePatchSync(runResult);
    // 把失败原因翻成人话：余额 / 额度 / 「对话已保留」/ 「本轮未入档」。
    // 用户预期是：屏幕上看得见的上一句，下一句「继续」不能变成失忆新开场。
    if (!wasAborted && runResult.exitCode !== 0) {
      if (runResult.preflightBlocked || isLocalContextCoverageFailure(runResult.localError)) {
        ctx.emitCommandOutput(describeContextRefusal(runResult.preflightBlocked?.refusal
          ?? contextRefusalDiagnostics(runResult.localError)));
      } else if (isOwnerOAuthUnavailableError(runResult.localError)) {
        ctx.emitCommandOutput(OWNER_OAUTH_UNAVAILABLE_HINT);
      } else if (isInvalidGrantError(runResult.localError)) {
        const provider = "claude";
        ctx.emitCommandOutput(t("auth.grantExpiredHint", provider));
        ctx.state = {
          ...ctx.state,
          suggestedAuthCommand: `/auth ${provider}`,
        };
      } else if (isBalanceExhaustedError(runResult.localError) && runResult.dialogId) {
        ctx.emitCommandOutput(t("balanceExhaustedHint"));
      } else if (isQuotaExhaustedError(runResult.localError)) {
        ctx.emitCommandOutput(t("quotaExhaustedHint"));
      } else if (runResult.dialogId) {
        ctx.emitCommandOutput(t("dialogPreservedHint"));
      } else {
        ctx.emitCommandOutput(t("dialogNotSavedHint"));
      }
    }
    return { ok: !wasAborted, aborted: wasAborted };
  } catch (error) {
    if (ctx.activeTurnAbort?.signal.aborted) return { ok: false, aborted: true };
    // 迟到的异常：强停已经把屏幕交还用户并报过 idle，这条属于被丢弃的 turn，
    // 不许把 idle 改写成 error。
    emitStatusUnlessForceStopped({ state: "error" });
    throw error;
  } finally {
    ctx.runRegistryPoller.endHold();
    ctx.idleHeapReleaser.schedule();
    ctx.activityIndicator.stop();
    ctx.activeTurnAbort = null;
    // Without a successful save receipt, preserve both the injected snapshot and
    // this terminal event. A thrown runner is not proof of persistence.
    if (!turnOutcomeSettled) {
      ctx.state = {
        ...ctx.state,
        ...settleNotices(false),
      };
    }
    // 兜底不丢唤醒：turn 结束（正常/abort/异常/preemptAndAbortForDrain）时，
    // 收件箱里还有 loop 没来得及消化的条目，就逐条落回 chat 队列，走既有的
    // 排队 + markAcknowledged 过滤路径，在下一个 turn 被消费。
    // （这条 enqueue 是允许的兜底路径，不是被移除的 busy 分支排队路径。）
    if (ctx.turnInjectionInbox === injectionInbox) ctx.turnInjectionInbox = null;
    const leftover = injectionInbox.close();
    if (leftover.length > 0) {
      const binding = ensureChatQueueBinding(
        ctx,
        actionGateHandler,
        confirmDestructiveAction,
      );
      for (const entry of leftover) {
        try {
          const status = binding.enqueue(entry.fallback);
          const event = typeof entry.fallback === "object" && "event" in entry.fallback ? entry.fallback.event : entry.fallback;
          traceChildRunWake("inbox-leftover-queue", event, ctx.state.dialogId ?? null, queueWakeFields(status));
        } catch {
          const event = typeof entry.fallback === "object" && "event" in entry.fallback ? entry.fallback.event : entry.fallback;
          traceChildRunWake("inbox-leftover-enqueue-failed", event, ctx.state.dialogId ?? null);
          // 队列已关闭等极端情况：吞掉，避免 finally 抛出盖掉真实 turn 结果。
        }
      }
    }
  }
}

// 排队消息的附件延迟解析（图片 dataURL / 音视频 transcript）已迁至
// ./queuedUserAttachments：纯职责搬移，签名与失败语义不变。

export async function runDrainedQueueTurn(
  ctx: AgentTurnContext,
  req: TurnRequest,
  actionGateHandler: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>,
  confirmDestructiveAction?: (
    request: PermissionRequest,
  ) => Promise<boolean | { approved: boolean; hostResult?: AgentRuntimeToolResult }>,
  /** 测试注入点：缺省即 runOneAgentTurn。 */
  runTurn: typeof runOneAgentTurn = runOneAgentTurn,
): Promise<{ ok: boolean; aborted: boolean }> {
  const prepared = await prepareQueuedUserRequest(ctx, req);
  return runTurn(ctx, prepared.request, prepared.imageUrls, actionGateHandler, confirmDestructiveAction,
    [...(req.imagePaths ?? []), ...(req.mediaPaths ?? [])]);
}

/**
 * S2: 文件级 ensureChatQueueBinding 函数
 *
 * 获取或延迟初始化 TUI chat 队列绑定，并把 drain 执行委托给 runOneAgentTurn。
 */
type TuiBatchTurnRequest = TurnRequest & {
  batchUserSource?: { messageId: string; originalText: string; contentSha256: string };
  userMessages?: import("../client/agentRunTypes").RunAgentTurnOptions["userMessages"];
  /** Explicit stable tail message id; validated centrally in agentRun.ts. */
  cliBatchId?: string;
};

export function ensureChatQueueBinding(
  ctx: AgentTurnContext,
  actionGateHandler: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>,
  confirmDestructiveAction?: (
    request: PermissionRequest,
  ) => Promise<boolean | { approved: boolean; hostResult?: AgentRuntimeToolResult }>,
): ChatQueueTuiBinding {
  if (ctx.chatQueueBinding) {
    const dialogIdentityHeld = ctx.chatQueueBindingDialogId === undefined
      || ctx.chatQueueBindingDialogId === ctx.state.dialogId;
    if (dialogIdentityHeld) return ctx.chatQueueBinding;
    // The dialog id is the durable key for queued user messages: `savePending`
    // writes them under the bound dialog, while the turn writes its provider
    // receipt under the *current* dialog (/compact forks a new dialog, /resume,
    // /new and /clear switch it). A binding left over from the previous dialog
    // would persist follow-ups into a dialog the turn never runs in — the
    // receipt lookup then fails ("Missing durable batch receipt") and the
    // message is stranded in the dialog the session already left. Replace the
    // binding instead; the previous dialog's pending rows stay durable, neither
    // migrated nor resent.
    const stale = ctx.chatQueueBinding;
    ctx.chatQueueBinding = null;
    ctx.dialogNotifyReceiver?.stop();
    ctx.dialogNotifyReceiver = null;
    stale.dispose();
  }
  const getStore = () => getOrCreateSharedStore({ env: ctx.effectiveEnv, cwd: ctx.state.cwd, fetchImpl: ctx.options.fetchImpl });
  // Reserve on the shared workspace state BEFORE either the first turn or
  // async pending storage starts. The binding must never mint a second id
  // from an undefined snapshot captured before runOneAgentTurn allocates it.
  const boundDialogId = ctx.state.dialogId ?? mintTaskUserMessageId();
  if (!ctx.state.dialogId) {
    ctx.pendingFreshDialogId = boundDialogId;
    ctx.state = { ...ctx.state, dialogId: boundDialogId };
  }
  ctx.chatQueueBindingDialogId = boundDialogId;
  const dialogId = () => boundDialogId;
  const run = (req: TurnRequest) => runAutoReviewDrainedTurn(ctx.chatQueueBinding!, () => runDrainedQueueTurn(ctx, req, actionGateHandler, confirmDestructiveAction));
  ctx.chatQueueBinding = createChatQueueTuiBinding(run, {
    savePending: async (requests) => saveCliPendingUserMessages({ store: await getStore(),
      userId: resolveLocalUserId(ctx.effectiveEnv), dialogId: dialogId(),
      agentKey: ctx.state.agentKey ?? "nolo", requests }),
    // Required named result preserves recovery evidence across host boundaries.
    loadPending: async () => readCliPendingUserMessages(await getStore(), boundDialogId),
    resolveUnknownWithoutResend: async batchId => resolveCliUnknownBatchWithoutResend(await getStore(), boundDialogId, batchId),
    runBatch: async (requests, canStart) => runQueuedUserBatch(ctx, requests, actionGateHandler, confirmDestructiveAction, runOneAgentTurn, canStart),
  });
  void ctx.chatQueueBinding.restorePending().catch(error => ctx.emitCommandOutput(`[nolo] pending restore failed: ${String(error)}`));
  // The notify receiver lives exactly as long as this binding: it is the only
  // process allowed to admit externally delivered messages into this dialog's
  // queue, and it disappears when the dialog identity changes or the workspace
  // disposes. Attach is best-effort: an unavailable mailbox (or a second live
  // receiver for the same dialog) disables delivery, it never blocks the turn.
  ctx.dialogNotifyReceiver?.stop();
  ctx.dialogNotifyReceiver = attachDialogNotifyReceiver({
    binding: ctx.chatQueueBinding,
    userId: resolveLocalUserId(ctx.effectiveEnv),
    dialogId: boundDialogId,
    env: ctx.effectiveEnv,
    resolveAdmittedState: async (messageId) => {
      // `requested`/`completed` is written by the turn runner when the batch is
      // dispatched to the provider — the exact point the queue consumed it.
      const record: any = await (await getStore()).read(
        `dialog-${boundDialogId}-msg-${messageId}`,
        { remote: false },
      );
      const phase = record?.metadata?.cliBatchPhase;
      return phase === "requested" || phase === "completed" ? "consumed" : "queued";
    },
    // The durable row is written by `admitExternalRequest` BEFORE the enqueue, so
    // its presence proves the message was already admitted. Without this check a
    // retried admission (receipt write failure, crash before the receipt) would
    // enqueue a second identical user turn in this dialog.
    isMessagePersisted: async (messageId) => {
      const record = await (await getStore()).read(
        `dialog-${boundDialogId}-msg-${messageId}`,
        { remote: false },
      );
      return Boolean(record);
    },
    onEvent: (event) => {
      if (event.type === "failed") {
        ctx.emitCommandOutput(`[nolo] dialog notify failed: ${event.error}`);
      } else if (event.type === "ack-write-failed") {
        // Delivery succeeded; only the receipt is missing. Say so, so this is
        // not read as a lost notification.
        ctx.emitCommandOutput(`[nolo] dialog notify delivered, receipt not written: ${event.error}`);
      }
    },
  });
  // Attach is best-effort, but a silent disable leaves the sender with
  // `unsupported`/`offline` and the user with no explanation of why.
  if (!ctx.dialogNotifyReceiver.active) {
    ctx.emitCommandOutput(
      `[nolo] dialog notify disabled for this dialog: ${ctx.dialogNotifyReceiver.reason ?? "unknown reason"}`,
    );
  }
  return ctx.chatQueueBinding;
}

/**
 * S2: 文件级 preemptAndAbortForDrain 函数
 *
 * 中止正在执行的 in-flight turn，以便队列头部立即 drain。
 */
export function preemptAndAbortForDrain(
  binding: ChatQueueTuiBinding,
  activeTurnAbort: AbortController | null,
): void {
  if (binding.preemptForDrain() && activeTurnAbort) {
    activeTurnAbort.abort();
  }
}

export async function runQueuedUserBatch(
  ctx: AgentTurnContext, requests: readonly TurnRequest[],
  actionGateHandler: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>,
  confirmDestructiveAction?: Parameters<typeof runOneAgentTurn>[4],
  runTurn: typeof runOneAgentTurn = runOneAgentTurn,
  canStart: () => boolean = () => true,
): Promise<{ ok: boolean; aborted: boolean }> {
  const batchId = requests.at(-1)?.messageId;
  if (!batchId) throw new Error("Queued user batch requires a stable tail messageId");
  const userMessages = [];
  for (const original of requests) {
    if (!original.messageId) throw new Error("Queued user batch requires stable message ids");
    const { request, imageUrls } = await prepareQueuedUserRequest(ctx, original);
    userMessages.push({ role: "user" as const, cliMessageId: original.messageId,
      cliSource: original.source, cliImagePaths: original.imagePaths, cliMediaPaths: original.mediaPaths,
      content: imageUrls.length ? [{ type: "text" as const, text: request.text },
        ...imageUrls.map(url => ({ type: "image_url" as const, image_url: { url } }))] : request.text });
  }
  if (!canStart()) return { ok: false, aborted: true };
  // Reuse the single-source dedupe contract with an ordered batch source.
  // Include every ID and payload, but digest image bytes rather than copying
  // base64 into task-source evidence. Provider userMessages remain untouched.
  const originalText = JSON.stringify(userMessages.map(user => ({
    ...user,
    content: typeof user.content === "string" ? user.content : user.content.map(part =>
      part.type === "image_url" ? { type: part.type, sha256: hashTaskUserMessage("sha256").update(part.image_url.url).digest("hex") } : part),
  })));
  const contentSha256 = hashTaskUserMessage("sha256").update(originalText).digest("hex");
  const request: TuiBatchTurnRequest = { ...requests[0]!, userMessages, cliBatchId: batchId,
    batchUserSource: { messageId: `user-batch-${contentSha256}`, originalText, contentSha256 } };
  return runAutoReviewDrainedTurn(ctx.chatQueueBinding!, () => runTurn(ctx, request, [], actionGateHandler,
    confirmDestructiveAction, requests.flatMap(request => [...request.imagePaths ?? [], ...request.mediaPaths ?? []])));
}
