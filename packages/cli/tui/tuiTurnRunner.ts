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
import { runAgentTurn, type RunAgentTurnResult } from "../client/agentRun";
import { appendTurnBillingAudit } from "../client/turnBillingAudit";
import {
  createCliLocalRuntimeAdapter,
  type UserChoiceRequest,
  type UserChoiceResult,
} from "../client/localRuntimeAdapter";
import { resolveSkillReference, buildSkillContextBlocks } from "../agentRunPrompts";
import { buildSkillDiscoveryContextLayer } from "../../agent-runtime/skillDiscovery";
import { readAgentsMdLayerFromDisk } from "../../agent-runtime/agentsMd";
import { buildResponseGuidelines } from "../../agent-runtime/responseGuidelines";
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
import { resolveAgentContextWindow } from "../client/tokenUsage";
import type { LocalAgentActionGate } from "../../agent-runtime/localLoop";
import type { ContextBlockScope } from "../../agent-runtime/contextBlockScope";
import {
  readCommandActionGatePayload,
  type PermissionRequest,
} from "../../agent-runtime/actionGate";
import type { AgentRuntimeToolResult } from "../agentRuntimeLocal";
import type { CompactDialogResult } from "../client/compactDialog";
import { isBalanceExhaustedError, isQuotaExhaustedError } from "../agentRunCommand";
import { backfillRunRecordParentDialog } from "../agentRunControl";
import type { SelfUpdateExecution } from "../updateCommands";
import type { spawnProcess } from "../processSpawn";
import type { loadDialogHistoryForDisplay, runDialogPicker } from "./dialogPicker";
import type { saveProfileAgentSelection } from "../client/profileConfig";
import { runAskChoiceDialog } from "./askChoiceDialog";
import type { DialogHost } from "./dialogHost";
import { runConfirmDialog } from "./confirmDialog";
import type { ActivityIndicator, AgentRunStatusSnapshot } from "./activityIndicator";
import type { RunRegistryPoller } from "./runRegistryPoller";
import {
  filterUnclaimedChildRuns,
  buildWakeMessage,
  buildWakeDisplayText,
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
import { dimCliText, resolveCliColorEnabled } from "../client/terminalStyles";
import type { CollapsedPasteStore } from "../../core/collapsedPaste";
import { toErrorMessage } from "core/errorMessage";
import { t } from "./i18n";
import { createChatQueueTuiBinding, type ChatQueueTuiBinding } from "./chatQueueTuiBinding";
import { createTurnInjectionInbox, type TurnInjectionInbox } from "./turnInjectionInbox";
import {
  emitTerminalAttention,
  runWithInputRequiredAttention,
  shouldEmitTerminalBell,
} from "./terminalNotification";
import {
  createHistoryOutputStream,
  startTurn,
  appendToCurrentTurn,
  finalizeCurrentTurn,
  type TurnHistory,
} from "./tuiHistory";
import type { FixedInputController } from "./tuiRawInput";

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
  spawnRunner?: typeof spawnProcess;
  /** Injected summary LLM caller for /compact compression. Wired by localRuntimeAdapter. */
  summaryLlmCaller?: (content: string) => Promise<string | null>;
  fetchImpl?: typeof fetch;
  saveAgentSelection?: typeof saveProfileAgentSelection;
  clipboardWriter?: (text: string) => Promise<void>;
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
    imageUrls?: string[];
    actionGateHandler?: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>;
    confirmDestructiveAction?: (request: PermissionRequest) => Promise<boolean>;
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
     */
    drainInjections?: () => string[];
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
  // Assemble the turn's context layers. Each builder stamps its own cacheScope
  // (session = stable prefix, cached; turn = dynamic suffix, recomputed), so
  // this host never has to infer scope by string-matching block markers.
  const layers: Array<TurnContextLayer | null> = [
    readAgentsMdLayerFromDisk(state.cwd),
    // Skill discovery: scan conventional skill dirs for SKILL.md and inject an
    // index layer so the model knows what skills exist and can readFile them
    // on-demand. Mirrors agentRunCommand.ts and desktopAgentRuntimeTurnService.
    buildSkillDiscoveryContextLayer(state.cwd),
  ];

  // 响应展示指南（窄屏/TUI 版）：与 buildSystemPrompt 共享同一 builder
  // （agent-runtime/responseGuidelines），此前只注入 server/web 路径。
  const responseGuidelinesBlock: ContextBlockScope = {
    content: buildResponseGuidelines(true),
    cacheScope: "session",
  };

  // Memory overlay: session-scoped — load once per dialog, reuse across turns.
  // New memories written via rememberMemory tool are for FUTURE dialogs, not
  // the current one (the model already has the context from the conversation).
  // /new or dialog switch clears cachedMemoryOverlay so the next dialog reloads.
  let memoryPromptBlock = state.cachedMemoryOverlay;
  if (memoryPromptBlock === undefined) {
    memoryPromptBlock = await resolveCliMemory({
      serverUrl: state.serverUrl,
      authToken: resolvePlatformAuthToken(env),
      agentKey: effectiveAgentKey,
      userInput: effectiveMessage,
      env,
    }).catch(() => null);
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

  const contextBlockScopes: ContextBlockScope[] = partitionScopedBlocks([
    ...renderTurnContextBlocksWithScope(layers),
    responseGuidelinesBlock,
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
  ]);
  // 新会话首轮 state.dialogId 尚未生成（turn 结束后才从 result 回填），
  // 该轮派发的后台 run 无法注入 parentDialogId——adapter 通过
  // onBackgroundRunSpawned 把这些 runId 报到这里，turn 结束统一回填归属。
  const spawnedRunsMissingParent: string[] = [];
  const result: RunAgentTurnResult = await agentRunner({
    agentName: effectiveAgentName,
    agentKey: effectiveAgentKey,
    serverUrl: state.serverUrl,
    message: effectiveMessage,
    continueDialogId: state.dialogId,
    ...(state.dialogId ? { parentDialogId: state.dialogId } : {}),
    ...(state.agentKey === DEFAULT_TUI_AGENT_KEY && env.NOLO_AUTO_ROUTE !== "0"
      ? { dialogAgentMode: "auto" as const }
      : { dialogAgentMode: "fixed" as const }),
    runtimeMode: state.runtimeMode,
    // `/lang` updates the in-memory TUI state immediately. Pass that state
    // explicitly so the next real turn cannot keep using the workspace's
    // launch-time NOLO_LANG value while the estimator already uses the new one.
    userLanguage: state.userLanguage,
    localRuntimeCwd: process.cwd(),
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
        ...(options.confirmDestructiveAction
          ? { confirmDestructiveAction: options.confirmDestructiveAction }
          : {}),
        ...(options.requestUserChoice
          ? { requestUserChoice: options.requestUserChoice }
          : {}),
        ...(options.pastedTextStore
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
        const proc = spawnRunner({
          cmd: commandPayload.command,
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        });
        exitCode = await proc.exited;
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
        const proc = spawnRunner({
          cmd: commandPayload.command,
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        });
        exitCode = await proc.exited;
      } catch (error) {
        errorMessage = toErrorMessage(error);
      } finally {
        hooks?.afterSubprocess?.();
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
  },
): Promise<AgentRuntimeToolResult> {
  if (gate.kind === "confirm") {
    const approved = await deps.dialogHost.run((anchor) =>
      runConfirmDialog({
        request: asConfirmPermissionRequest(gate),
        input: deps.input as NodeJS.ReadStream,
        output: deps.output,
        ...anchor,
      }),
    );
    return approved
      ? buildGateConfirmedResult(gate)
      : buildGateCancelledResult(gate, "confirmation declined");
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
  // ── 可变引用语义字段（通过 getter/setter 代理到 runTuiWorkspace 闭包中的原始 let 绑定） ──
  state: TuiState;
  forcedStop: boolean;
  forcedStopEpoch: number;
  turnEpoch: number;
  activeTurnAbort: AbortController | null;
  activeTurnEpoch: number;
  chatQueueBinding: ChatQueueTuiBinding | null;
  /**
   * 当前进行中 turn 的注入收件箱。runOneAgentTurn 开始时创建、结束时关闭清空；
   * 非 null 即表示「有 turn 正在跑，可直投当前 loop」。
   * 见 turnInjectionInbox.ts。
   */
  turnInjectionInbox: TurnInjectionInbox<TurnRequest | InternalTurnEvent | string> | null;

  // ── 外部只读 / 动态读取字段 ──
  readonly sessionEnded: boolean;
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
  confirmDestructiveAction?: (request: PermissionRequest) => Promise<boolean>,
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
  if (req.event.kind === "child-run-completed") {
    const nowMs = Date.now();
    const { remainingRuns, claimedRunIds } = filterUnclaimedChildRuns(
      req.event.runs,
      { env: ctx.effectiveEnv, now: () => nowMs },
    );
    for (const runId of claimedRunIds) {
      ctx.runCompletionWatcher.markAcknowledged(runId);
    }
    if (remainingRuns.length === 0) {
      for (const r of req.event.runs) {
        ctx.runCompletionWatcher.markAcknowledged(r.runId);
      }
      return { ok: true, aborted: false };
    }
    for (const r of remainingRuns) {
      ctx.runCompletionWatcher.markAcknowledged(r.runId);
    }
    if (remainingRuns.length !== req.event.runs.length) {
      const text = buildWakeMessage(remainingRuns, nowMs);
      const displayText = buildWakeDisplayText(remainingRuns, nowMs);
      const updatedEvent: ChildRunCompletedTurnEvent = {
        kind: "child-run-completed",
        runs: remainingRuns,
        text,
        displayText,
      };
      req = {
        text,
        event: updatedEvent,
      };
    }
  }
  const message = req.text;
  // 每轮 turn 开始时重置强制收尾标志，确保上一轮的强制停止不会泄漏到本轮。
  ctx.forcedStop = false;
  ctx.turnEpoch += 1;
  const myEpoch = ctx.turnEpoch;
  ctx.history.followBottom = true;
  // 屏幕上印什么 ≠ 送进模型的是什么。终态唤醒是系统事件，不是用户发言：
  // 模型仍收完整摘要（message），transcript 只留一行紧凑状态，且不套用户
  // 气泡——否则每条 run 完成都在对话里伪造一条几百字的「用户消息」。
  // 片段识别统一走 chat/messages/contextualFragment.ts 注册表：wake 文案
  // 标记化后格式来源单一，这里不再自行猜文本形态。
  const isInternalEvent = req.event.kind !== "user";
  const isContextualFragment = matchContextualFragment(message) !== null;
  const transcriptText =
    isContextualFragment && req.event.kind === "child-run-completed"
      ? (req.event.displayText ?? req.event.text)
      : message;
  startTurn(ctx.history, isInternalEvent ? "assistant" : "user");
  appendToCurrentTurn(
    ctx.history,
    isInternalEvent
      ? dimCliText(transcriptText, resolveCliColorEnabled())
      : transcriptText,
  );
  finalizeCurrentTurn(ctx.history);
  ctx.renderHistoryToOutput();
  if (ctx.fixedInput.active) ctx.fixedInput.repaint(ctx.buffer, ctx.cursorPos);

  startTurn(ctx.history, "assistant");
  const agentOutput = isInteractiveInput(ctx.input)
    ? createHistoryOutputStream(ctx.history, () => {
        ctx.scheduleRender();
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
            { output: ctx.output, env: ctx.effectiveEnv },
            async () => {
              try {
                return await ctx.dialogHost!.run((anchor) =>
                  runAskChoiceDialog({
                    request: choiceReq,
                    input: ctx.input as NodeJS.ReadStream,
                    output: ctx.output as NodeJS.WritableStream,
                    ...anchor,
                  }),
                );
              } catch {
                return { kind: "cancelled" };
              }
            },
          );
        }
      : undefined;
  ctx.runRegistryPoller.beginHold();
  // 本轮的注入收件箱：runWakeHandler 在 busy 时把后台 run 终态唤醒直投这里，
  // 由 local loop 的 drainInjections 在轮边界取走注入当前 loop。
  const injectionInbox = createTurnInjectionInbox<
    TurnRequest | InternalTurnEvent | string
  >();
  ctx.turnInjectionInbox = injectionInbox;
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
        ...(imageUrls.length > 0 ? { imageUrls } : {}),
        actionGateHandler,
        ...(confirmDestructiveAction ? { confirmDestructiveAction } : {}),
        ...(requestUserChoice ? { requestUserChoice } : {}),
        abortSignal: ctx.activeTurnAbort.signal,
        drainInjections: () => injectionInbox.drain(),
        pastedTextStore: ctx.pasteStore,
        activityReporter: ctx.activityReporter,
        onAgentRunStatus: (snapshot) => {
          if (snapshot) {
            ctx.activityIndicator.updateAgentRun(snapshot);
            // run 进面板的唯一入口就在这里，所以轮询器也只在这里起表；
            // 它自己在没有活跃 run 时会停。
            ctx.runRegistryPoller.ensureRunning();
          } else {
            ctx.activityIndicator.clearAgentRun();
          }
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
    const wasForceStopped = ctx.forcedStopEpoch === myEpoch;
    if (wasForceStopped) {
      if (runResult.dialogId || runResult.turnTokens) {
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
          ...(runResult.cachedMemoryOverlay !== undefined ? { cachedMemoryOverlay: runResult.cachedMemoryOverlay } : {}),
          // 本轮已发起 agent 调用（消息已注入），消费切换通知。
          pendingCwdNotice: undefined,
        };
      }
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
    if (wasAborted) {
      if (runResult.pendingToolName) {
        // 协作式中止时工具仍在跑：localLoop 放弃等待但工具可能已在后台
        // 完成，其结果不会进入本次对话历史。告知工具名，语气正常。
        ctx.emitCommandOutput(t("turnStoppedToolPending", runResult.pendingToolName));
      } else {
        ctx.emitCommandOutput(t("turnStopped"));
      }
    }
    if (runResult.dialogId || runResult.turnTokens || runResult.contextWindow) {
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
        ...(runResult.contextWindow
          ? { contextWindow: runResult.contextWindow }
          : {}),
        // input_tokens 是累计上下文输入（含历史消息），把它持久化到
        // estimatedContextTokens：下一轮若 provider 不返回 usage，context
        // chip 仍显示真实累计占用而不是回退到启动时的静态估算。
        ...(runResult.turnTokens && runResult.turnTokens.input > 0
          ? { estimatedContextTokens: runResult.turnTokens.input }
          : {}),
        ...(runResult.cachedMemoryOverlay !== undefined ? { cachedMemoryOverlay: runResult.cachedMemoryOverlay } : {}),
        // 切换消息本轮已注入 agent 上下文（runAgentChat 已读），消费掉，
        // 避免下轮重复注入。仅当确实发起了 agent 调用（本轮是真实 turn、
        // 而非纯 child-run-completed 事件短路）时才清除。
        pendingCwdNotice: undefined,
      };
    }
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
      if (isBalanceExhaustedError(runResult.localError) && runResult.dialogId) {
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
  } finally {
    ctx.runRegistryPoller.endHold();
    ctx.activityIndicator.stop();
    ctx.activeTurnAbort = null;
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
          binding.enqueue(entry.fallback);
        } catch {
          // 队列已关闭等极端情况：吞掉，避免 finally 抛出盖掉真实 turn 结果。
        }
      }
    }
  }
}

/**
 * S2: 文件级 ensureChatQueueBinding 函数
 *
 * 获取或延迟初始化 TUI chat 队列绑定，并把 drain 执行委托给 runOneAgentTurn。
 */
export function ensureChatQueueBinding(
  ctx: AgentTurnContext,
  actionGateHandler: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>,
  confirmDestructiveAction?: (request: PermissionRequest) => Promise<boolean>,
): ChatQueueTuiBinding {
  if (ctx.chatQueueBinding) return ctx.chatQueueBinding;
  ctx.chatQueueBinding = createChatQueueTuiBinding(async (text) => {
    return runOneAgentTurn(ctx, text, [], actionGateHandler, confirmDestructiveAction);
  });
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
