import { createInterface } from "node:readline";
import { stdin as defaultInput, stdout as defaultOutput } from "node:process";
import type { Readable } from "node:stream";
import { resolvePlatformAuthToken } from "../../agent-runtime/providerResolution";
import { readDbRecord } from "../agentRecordHelpers";
import type { LocalAgentActionGate } from "../../agent-runtime/localLoop";
import type { PermissionRequest } from "../../agent-runtime/actionGate";
import type { AgentRuntimeToolResult } from "../agentRuntimeLocal";
import {
  getAgentSelectionAuditPath,
  getDefaultProfileConfigPath,
  readLastAgentSelectionAudit,
  saveProfileAgentSelection,
} from "../client/profileConfig";
import {
  checkForCliUpdate,
  runSelfUpdateDetailed,
} from "../updateCommands";
import { spawnProcess } from "../processSpawn";
import { runConfirmDialog } from "./confirmDialog";
import { type SelectDialogItem } from "./selectDialog";
import { createDialogHost } from "./dialogHost";
import {
  clearTerminalAttentionProgress,
  runWithInputRequiredAttention,
} from "./terminalNotification";
import {
  createActivityIndicator,
} from "./activityIndicator";
import { createRunRegistryPoller } from "./runRegistryPoller";
import { createRunCompletionWatcher } from "./runCompletionWatcher";
import { RUN_WAKE_CHANNEL_ENV } from "../../agent-runtime/agentRunIsolation";
import {
  createTurnRequest,
  type InternalTurnEvent,
  type TurnRequest,
} from "core/chat/internalTurnEvent";
import { checkStaleRun, listRunRecords, readRunRecord } from "../agentRunControl";
import { prefetchAgentCatalog } from "./agentCatalog";
import {
  formatComposerAttachmentLine,
  mergeAttachedImages,
  popLastAttachedImage,
  summarizeAttachment,
} from "./pasteImage";
import {
  getDefaultClipboardTempDir,
  readClipboardImage,
  sweepStaleClipboardFiles,
} from "./clipboardImage";
import { writeClipboard as writeClipboardEnhanced } from "./clipboard";
import { detectGitStatusAsync } from "./gitStatus";
import { getProcessRegistry } from "../../agent-runtime/processRegistry";
import {
  applyTuiInputKey,
  completeSlashCommand,
  createInitialTuiState,
  handleTuiInput,
  formatElapsedSeconds,
  isBackspaceSequence,
  renderPrompt,
  composeStatusLineWithQueue,
  renderStatusLine,
  renderWelcome,
  DEFAULT_TUI_AGENT_KEY,
  PASTE_TOKEN_PREFIX,
  type TuiState,
} from "./session";
import { dimCliText, resolveCliColorEnabled } from "../client/terminalStyles";
import {
  themeColorSequence,
  themeText,
  resolveTuiThemeMode,
  setActiveThemeMode,
  resetWorkspaceThemeState,
  applyDetectedBackground,
} from "./theme";
import { detectTerminalBackground } from "./detectBackground";
import {
  clearCollapsedPasteStore,
  createCollapsedPasteStore,
  releaseCollapsedPasteReferences,
  replaceCollapsedPastesWithReferences,
} from "../../core/collapsedPaste";
import { toErrorMessage } from "core/errorMessage";
import { getCliLocale, initCliLocale, t } from "./i18n";
import { type ChatQueueTuiBinding } from "./chatQueueTuiBinding";
import { appendStreamSafeNotice } from "./turnInjectionInbox";
// S3 迁移：turn 执行与队列 drain（runOneAgentTurn / ensureChatQueueBinding /
// preemptAndAbortForDrain / AgentTurnContext）及前奏区函数（runAgentChat /
// waitForActionGate / waitForRawActionGate / readAgentsMdLayer）已迁至
// ./tuiTurnRunner。依赖方向单向：本文件 → tuiTurnRunner；后者禁止回指本文件。
import {
  buildGateConfirmedResult,
  ensureChatQueueBinding,
  isAutoConfirmableFileWriteGate,
  isInteractiveInput,
  preemptAndAbortForDrain,
  resolveActionGate,
  runOneAgentTurn,
  waitForActionGate,
  type AgentTurnContext,
  type SelfUpdater,
  type WorkspaceOptions,
} from "./tuiTurnRunner";

// Ctrl+S (0x13): flush all queued follow-ups as one merged message. Named so
// the raw byte is greppable by intent ("Ctrl+S" / "flush") rather than only by
// hex. Node's setRawMode(true) disables IXON flow control, so this byte
// reaches the `data` listener on all supported platforms.
const CTRL_S = "\x13";

// ANSI / 显示宽度 / 换行纯函数已抽到 ./tuiAnsi。
// Turn 历史 / 滚动渲染已抽到 ./tuiHistory（依赖 ./tuiScrollbar）。
// 此处 re-export 保持对外 API 兼容（sessionRender.ts 及若干测试仍从本文件
// import 这些符号），同时 import 供本文件内部使用。
export {
  ANSI_ESCAPE_REGEX,
  stripAnsi,
  applyTerminalOutputToText,
  displayWidth,
  visibleWidth,
  truncateAnsi,
  fitAnsiLine,
  countPhysicalLines,
  takeDisplayWidth,
  padOrTruncateToWidth,
  wrapTranscriptLine,
  wrapTextToLines,
  buildWindowTitle,
} from "./tuiAnsi";
export {
  type Turn,
  type TurnHistory,
  createTurnHistory,
  startTurn,
  appendToCurrentTurn,
  finalizeCurrentTurn,
  appendLocalTurn,
  applyOutputChunkToCurrentTurn,
  renderHistory,
  resetHistoryFrameDiffCache,
  createHistoryOutputStream,
  applyScrollAction,
} from "./tuiHistory";
export { type ScrollAction, parseScrollAction } from "./tuiScrollbar";
import {
  applyTerminalOutputToText,
  buildWindowTitle,
  displayWidth,
  padOrTruncateToWidth,
  stripAnsi,
  truncateAnsi,
  visibleWidth,
  wrapTextToLines,
  wrapTranscriptLine,
} from "./tuiAnsi";
import {
  applyOutputChunkToCurrentTurn,
  applyScrollAction,
  appendToCurrentTurn,
  appendLocalTurn,
  createHistoryOutputStream,
  createTurnHistory,
  finalizeCurrentTurn,
  getAllTurnEntries,
  renderHistory,
  resetHistoryFrameDiffCache,
  startTurn,
  type TurnHistory,
} from "./tuiHistory";
import {
  parseScrollAction,
  type ScrollAction,
  WHEEL_SCROLL_LINES,
  autoScrollStepForTicks,
} from "./tuiScrollbar";
import {
  parseSgrMouseEvent,
  type TuiMouseEvent,
} from "./tuiMouse";
import {
  areSelectionPointsEqual,
  createSelectionState,
  extractSelectedText,
  hitTestHistory,
  type TuiSelectionState,
} from "./tuiSelection";
// S4 迁移：渲染三件套（renderHistoryToOutput / paintSyncedFrame /
// scheduleRender）与共享节流 flushPendingRender 已迁至 ./tuiRender。
// 依赖方向单向：本文件 → tuiRender；后者禁止回指本文件。
import { createTuiRender } from "./tuiRender";
// S5 迁移：runSubmittedLine 的 slash 命令 bus 分发（runSubmittedSlashLine /
// SlashDispatchHost）已迁至 ./tuiSlashRouter。依赖方向单向：
// 本文件 → tuiSlashRouter；后者禁止回指本文件。
import {
  runSubmittedSlashLine,
  type SlashDispatchHost,
} from "./tuiSlashRouter";
export {
  type FixedInputController,
  createNoopFixedInput,
  createFixedInput,
  splitRawInput,
  createRawInputDecoder,
  enterAltScreen,
  leaveAltScreen,
  isAltScreenOn,
} from "./tuiRawInput";
import {
  createFixedInput,
  createNoopFixedInput,
  createRawInputDecoder,
  splitRawInput,
  enterAltScreen,
  leaveAltScreen,
  type FixedInputController,
} from "./tuiRawInput";

/**
 * Alternate-screen restore for non-normal exit paths.
 *
 * `disable()` (the normal exit) restores the terminal itself; but SIGINT /
 * SIGTERM / SIGHUP, an uncaught exception, an unhandled rejection, or a raw
 * `process.exit` can bypass it. Without a restore on those paths the user's
 * terminal stays on the alternate screen and the shell prompt is invisible
 * — they can only recover with a manual `reset`. So every abnormal path
 * leaves the alternate screen *before* the error is surfaced / the process
 * dies, so the message prints on the main screen where the user can see it.
 *
 * Single registration guard: `startTuiWorkspace` may be called more than
 * once (tests, re-entry), and stacking process listeners trips Node's
 * MaxListenersExceededWarning. `altScreenHandlersInstalled` makes the
 * install block idempotent. The handlers themselves are safe to fire
 * repeatedly: `leaveAltScreen` is idempotent, and the signal handler is
 * prepended once (the pre-existing listeners are re-attached after it so
 * each runs exactly once per signal).
 */
let altScreenRestoreOutput: NodeJS.WritableStream | null = null;
let altScreenHandlersInstalled = false;

/**
 * Snapshot of pre-existing signal listeners captured at install time, for
 * which we guarantee exactly-once delivery after our own restore runs. They
 * are detached from the emitter (so Node does not dispatch them itself) and
 * re-attached *after* our restore handler — Node then walks the listener
 * array in order on the signal: restore (once) → each original (once).
 */
const preExistingSignalListeners: Partial<
  Record<NodeJS.Signals, NodeJS.SignalsListener[]>
> = {};

/**
 * Signal → conventional shell exit code (128 + signum). SIGINT=2 → 130,
 * SIGTERM=15 → 143, SIGHUP=1 → 129. Used only when there are no pre-existing
 * listeners for that signal: registering *any* listener suppresses Node's
 * default "terminate on signal", so we must terminate explicitly to avoid a
 * zombie process that `kill` cannot reach.
 */
const SIGNAL_EXIT_CODE: Partial<Record<NodeJS.Signals, number>> = {
  SIGINT: 130,
  SIGTERM: 143,
  SIGHUP: 129,
};

/**
 * Restore the alternate screen to the main screen. Never throws: the output
 * stream may already be destroyed (e.g. after a crash), in which case the
 * write silently fails — the terminal is gone, nothing more to do.
 */
const restoreAltScreen = () => {
  try {
    if (altScreenRestoreOutput) leaveAltScreen(altScreenRestoreOutput);
  } catch {
    // Stream destroyed / write failed: the terminal is already gone.
  }
};

export function installAltScreenRestoreHandlers(
  output: NodeJS.WritableStream,
): void {
  altScreenRestoreOutput = output;
  if (altScreenHandlersInstalled) return;
  altScreenHandlersInstalled = true;

  process.on("exit", restoreAltScreen);

  // For signals: restore the terminal FIRST (so the shell prompt is visible
  // / the error prints on the main screen), then let any pre-existing
  // listeners run. We do not swallow the signal, we only prepend the restore.
  //
  // Design (exactly-once for originals): we PREPEND our handler and leave the
  // pre-existing listeners attached. On the signal Node walks the listener
  // array in order — our restore handler first, then each pre-existing
  // listener exactly once (Node invokes them itself; we never call them
  // manually, so there is no double-fire, which the prior cache-and-replay
  // design suffered: Node fired the original AND our handler fired it again).
  // If there are no pre-existing listeners we must terminate explicitly,
  // because registering *any* listener suppresses Node's default
  // "terminate on signal" behavior — otherwise the process hangs on the main
  // screen and `kill` cannot reach it.
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    const existing = process.listeners(sig) as NodeJS.SignalsListener[];
    preExistingSignalListeners[sig] = [...existing];

    const handler: NodeJS.SignalsListener = () => {
      restoreAltScreen();
      // Query live listenerCount or snapshot: if only this handler is registered,
      // re-terminate explicitly with the conventional 128+signum code.
      const count = process.listenerCount(sig);
      const hasOtherListeners =
        (preExistingSignalListeners[sig]?.length ?? 0) > 0 || count > 1;
      if (!hasOtherListeners) {
        process.exit(SIGNAL_EXIT_CODE[sig] ?? 128 + 1);
        return;
      }
      // Pre-existing listeners present: they remain attached to the emitter
      // and will be invoked by Node itself (once each, after us).
    };
    // Prepend so restore runs before the pre-existing (and any later-attached)
    // listeners.
    process.prependListener(sig, handler);
  }

  // Restore first, then surface the error on the MAIN screen (the alternate
  // screen is about to vanish, so anything printed there is invisible).
  // We do NOT swallow the error: print the original error to stderr so the
  // owner can see the crash reason, then exit non-zero. Registering this
  // listener cancels Node's default "print stack + exit(1)" — so we must
  // re-create it explicitly, otherwise the process hangs on the main screen
  // while the 150ms render timer keeps overwriting it.
  process.on("uncaughtException", (err) => {
    restoreAltScreen();
    try {
      process.stderr.write(
        `uncaughtException: ${err?.stack ?? String(err)}\n`,
      );
    } catch {
      // stderr write failing must not mask the restore.
    }
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    restoreAltScreen();
    try {
      const text = reason instanceof Error
        ? reason.stack ?? String(reason)
        : String(reason);
      process.stderr.write(`unhandledRejection: ${text}\n`);
    } catch {
      // ignore stderr write failures
    }
    process.exit(1);
  });
}


// ── S3 迁移转发：readAgentsMdLayer / runAgentChat / waitForActionGate 及
// SelfUpdater / WorkspaceOptions / RawModeInput 类型已原样迁至 ./tuiTurnRunner
// （类型随 AgentTurnContext 走，本文件经顶部 type-only import 继续消费）。

/**
 * One dim line naming the origin of a non-default startup agent, or "" when
 * the session starts on the default (nothing to explain) or the agent came
 * from an explicit `NOLO_AGENT` in the shell (the user just typed it).
 */
export function renderPinnedAgentNotice(
  state: TuiState,
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  auditPath = getAgentSelectionAuditPath(),
): string {
  if (state.agentKey === DEFAULT_TUI_AGENT_KEY) return "";
  if (env.NOLO_AGENT_SOURCE !== "profile") return "";
  const base = t(
    "agentPinnedFromProfile",
    state.agentName,
    getDefaultProfileConfigPath(),
  );
  // Attribution is the whole point of this line, so keep the two "no record"
  // cases apart: no log at all means a build without the audit trail wrote it,
  // while a log with no matching entry only means the entry aged out.
  const { logExists, last } = readLastAgentSelectionAudit(auditPath);
  const suffix = !logExists
    ? ` ${t("agentPinnedUnaudited")}`
    : last?.agentKey !== state.agentKey
      ? ` ${t("agentPinnedAuditRotated")}`
      : "";
  return `${dimCliText(`${base}${suffix}`, resolveCliColorEnabled())}\n`;
}

function persistAgentSelection(
  state: TuiState,
  env: NodeJS.ProcessEnv | undefined,
  saveSelection: typeof saveProfileAgentSelection = saveProfileAgentSelection,
) {
  // 默认档（nolo）不落盘：profile 里存的是「用户显式选择了哪个 agent」，
  // 存了默认档下次启动就分不清「没选过」和「选了 nolo」，而 NOLO_AGENT 一旦
  // 有值，createInitialTuiState 就再也走不到 DEFAULT_TUI_AGENT_KEY 兜底。
  //
  // 只比对 key。这里曾经附带 `agentName === "auto"` 的条件，但自动路由收敛成
  // 单档后状态行改为始终显示 agent 名（默认 "nolo"），该条件恒为 false，
  // 默认档因此被当成显式选择写进了 profile。
  // 空 key/name = 清除选择；profile 与 env 是同一份意图的两个落点。
  const selection = state.agentKey === DEFAULT_TUI_AGENT_KEY
    ? { agentKey: "", agentName: "" }
    : { agentKey: state.agentKey, agentName: state.agentName };

  try {
    saveSelection(selection);
  } catch {
    // profile persistence is best-effort in the workspace loop
  }

  if (!env) return;
  if (selection.agentKey) {
    env.NOLO_AGENT = selection.agentKey;
    env.NOLO_AGENT_NAME = selection.agentName;
  } else {
    delete env.NOLO_AGENT;
    delete env.NOLO_AGENT_NAME;
  }
}

// ── S3 迁移转发：isInteractiveInput / waitForRawActionGate / S2 turn 执行区
// （AgentTurnContext、runOneAgentTurn、ensureChatQueueBinding、
// preemptAndAbortForDrain）已原样迁至 ./tuiTurnRunner，此处经顶部 import
// 转发使用；依赖方向单向（readlineWorkspace → tuiTurnRunner）。

// The product runs one interactive TUI per process. Tests/embedders can still
// overlap exported calls, so cleanup is latest-owner-wins: an older workspace
// may not reset theme state selected by a newer active workspace. Full nested
// restoration is intentionally unsupported because `/theme` mutates the same
// renderer singleton while a workspace is alive.
let latestWorkspaceThemeOwner = 0;

async function runTuiWorkspace(options: WorkspaceOptions) {
  // Locale detection at module load only sees process.env; the workspace env
  // merges the profile config (NOLO_LANG from /lang) on top.
  initCliLocale(options.env ?? process.env);
  let state = createInitialTuiState(options.env ?? process.env);
  // 启动预热 agent 目录缓存：/agent 打开即命中（SWR，后台失败静默）。
  prefetchAgentCatalog({ env: options.env ?? process.env });
  const input = options.input ?? defaultInput;
  const output = options.output ?? defaultOutput;
  const fetchImpl = options.fetchImpl ?? fetch;
  const spawnRunner = options.spawnRunner ?? spawnProcess;
  const writeClipboard = options.clipboardWriter
    ? async (text: string) => {
        await options.clipboardWriter!(text);
      }
    : (text: string) =>
        writeClipboardEnhanced(text, {
          systemWrite: async (t) => {
            const { default: clipboard } = await import("clipboardy");
            await clipboard.write(t);
          },
          output,
          sendOsc52: isInteractiveInput(input),
        });
  const selfUpdater: SelfUpdater =
    options.selfUpdater ?? ((target) => runSelfUpdateDetailed({
      output: target,
      env: options.env ?? process.env,
    }));

  if ((output as { isTTY?: boolean }).isTTY) {
    // Enter the alternate screen first so the TUI owns a private buffer.
    // The TUI keeps its own scroll state (tuiHistory scrollTop / PgUp / PgDn),
    // so giving up the shared scrollback loses nothing — and it stops the
    // terminal wheel from desyncing the viewport against the TUI's own
    // scroll state (the root cause of the garbled repaint bug). Must happen
    // before the clear so we clear the *alternate* screen, not the shell's.
    enterAltScreen(output);
    // Register the terminal-restore handlers (exit / signals / exceptions)
    // once per process. Installing here (after we know we're on a TTY) keeps
    // the no-op guarantee for non-TTY runs: pipes/redirects/tests never touch
    // the alternate screen, and the handlers short-circuit via leaveAltScreen.
    installAltScreenRestoreHandlers(output);
    // Clear the alternate screen (NOT the scrollback: \x1b[3J is dropped —
    // it wipes the *main* screen's scrollback, which is both pointless here
    // and would erase the user's shell history on terminals that honor it
    // even while switched away). \x1b[2J clears the visible screen, \x1b[H
    // homes the cursor.
    output.write("\x1b[2J\x1b[H");
  }

  // Terminal-native mode needs no background probe: Ghostty owns light/dark
  // switching and the TUI emits only default-background + ANSI indexed colors.
  // Fixed modes still probe once so their optional tinted surfaces can blend
  // against the actual terminal base without delaying the default path.
  // Each workspace starts from the product default. The optional env override
  // belongs to this workspace only; it must not inherit a previous workspace's
  // module-global command state when tests/embedders reuse the process.
  const startupThemeMode = resolveTuiThemeMode(
    options.env ?? process.env,
    "terminal",
  );
  setActiveThemeMode(startupThemeMode);
  if (startupThemeMode !== "terminal") {
    const detected = await detectTerminalBackground({
      stdin: input as NodeJS.ReadStream & { setRawMode?: (mode: boolean) => void },
      stdout: output as NodeJS.WritableStream & { isTTY?: boolean },
      allowSystemFallback: true,
    });
    if (detected) applyDetectedBackground(detected);
  }

  // Paint the welcome banner once, statically. The previous 15-frame animation
  // blocked composer setup for ~1.5s (the input box only appeared after the
  // loop finished) and repainted by moving the cursor up a fixed 8 lines. When
  // any banner line wrapped on a narrow terminal the real on-screen line count
  // exceeded 8, so the cursor never reached the top and each frame's sky row
  // (✦ 🌙  ·) was left behind, stacking into the vertical columns seen in the
  // bug report. A single static frame performs no cursor rewind, so wrapping
  // can never corrupt it, and the composer mounts immediately afterwards. The
  // terminal width is passed through so renderWelcome can drop the wide scene
  // art on narrow terminals instead of letting it wrap.
  const bannerColumns = (output as { columns?: number }).columns;
  // 首帧字符串复用两次：写出 + 行数计算。避免把渲染逻辑（含主题/终端状态
  // 读取）执行两遍，导致首帧与行数计算不一致。
  const initialWelcome = renderWelcome(state, 0, 0, bannerColumns);
  output.write(initialWelcome);
  let initialBannerLineCount = initialWelcome.split("\n").length;

  // Starting on a non-default agent is always the result of a *saved* choice,
  // and the file that holds it can be rewritten by any other session. Name the
  // origin on the first frame so a pinned agent is never a silent surprise;
  // the audit trail (~/.nolo/agent-selection.log) says who wrote it.
  const pinnedAgentNotice = renderPinnedAgentNotice(
    state,
    options.env ?? process.env,
  );
  if (pinnedAgentNotice) {
    output.write(pinnedAgentNotice);
    initialBannerLineCount += pinnedAgentNotice.split("\n").length - 1;
  }

  let lastSentTitle: string | null = null;
  const syncWindowTitle = () => {
    if (!(output as { isTTY?: boolean }).isTTY) return;
    const env = options.env ?? process.env;
    const rawSetting = (env.NOLO_TUI_TITLE ?? "").trim().toLowerCase();
    if (rawSetting === "0" || rawSetting === "false") return;

    const currentTitle = state.dialogLabel?.trim() ?? "";
    if (currentTitle === lastSentTitle) return;
    lastSentTitle = currentTitle;
    output.write(buildWindowTitle(currentTitle));
  };

  syncWindowTitle();

  let fixedInput: FixedInputController = createNoopFixedInput();
  // Composer draft buffer. Hoisted to this scope (rather than the
  // isInteractiveInput block) so that runSubmittedLine's streaming callback
  // can repaint the user's in-progress draft while an agent turn is running.
  let buffer = "";
  // Cursor position is hoisted for the same reason as `buffer`: the streaming
  // and activity repaints defined in this scope call
  // fixedInput.repaint(buffer, cursorPos) so a streaming token that repaints
  // mid-edit keeps the caret where the user left it (e.g. mid-draft after an
  // arrow-key move) instead of the `cursorPos ?? buffer.length` fallback in
  // renderInputArea snapping it to the line end.
  let cursorPos = 0;
  // Oversized bracketed pastes collapse to `[paste #N · L lines]` chips in the
  // draft. Submitted turns carry a compact model reference; the full bodies
  // stay for the current dialog so later local turns can page them through
  // readPastedText. /new and process shutdown clear the store.
  const pasteStore = createCollapsedPasteStore();
  // Cooperative stop for the in-flight agent turn (Esc while busy).
  let activeTurnAbort: AbortController | null = null;
  // 本轮已强制收尾标志：第二次 Esc 直接把 UI 交还用户后置 true。
  // runAgentChat 的 await 仍会在稍后返回，此时 activeTurnAbort 已被强制清空、
  // busyLock 已解除；这段迟到返回值必须被丢弃：不重复打印 turnStopped、
  // 不重新置位 busyLock、不触发收尾重绘（用户可能已开始新一轮输入）。
  // 用 epoch 而非单 boolean：强制停止后用户可能立刻发起新 turn，新 turn
  // 会重置 forcedStop；旧 turn 的 await 稍后返回时靠 epoch 比对识别自己被
  // 强制过，不被新 turn 的重置影响。
  let forcedStop = false;
  let forcedStopEpoch = 0;
  let turnEpoch = 0;
  // 当前正在运行的 turn 的 epoch（activeTurnAbort 非空时有效）。
  // Esc 强制停止时据此设置 forcedStopEpoch，让对应的 runOneAgentTurn
  // await 返回后能识别自己被强制过。
  let activeTurnEpoch = 0;
  // 活动行状态机抽到 activityIndicator.ts：explicit 标签（working locally /
  // 工具标签）优先，静默超过阈值时自动补 working fallback，填补「文本流完模型
  // 在憋 tool_call」「tool-result 到下一轮」这些此前全黑的空窗。
  const activityIndicator = createActivityIndicator({
    isTurnActive: () => activeTurnAbort !== null,
    fallbackLabel: () => `${state.agentName} -> working`,
    stoppingLabel: () => t("turnStopping"),
    onRepaint: () => {
      if (fixedInput.active && !fixedInput.isPaused()) {
        output.write("\x1b[?2026h\x1b[?25l");
        try {
          fixedInput.repaint(buffer, cursorPos);
        } finally {
          output.write("\x1b[?25h\x1b[?2026l");
        }
      }
    },
  });
  const activityReporter = (label: string | null) =>
    activityIndicator.report(label);
  // 停靠区的第二条数据来路：直接读 ~/.nolo/runs 的记录。不经过模型，所以
  // 「面板要动」不再需要编排 agent 每隔几十秒调一次 controlAgentRun（那正是
  // transcript 被状态卡片刷屏的根因）。跑在服务端的 run 本地读不到记录，
  // 轮询器对它们视而不见，仍走模型那条路。
  // 终态唤醒：轮询器每 tick 把读到的 run 记录推给观察器，「活跃→终态」的
  // 转变被合并成一条唤醒消息。投递策略（turn 进行中就排队、空闲就直接开
  // 新 turn）由交互层在下方通过 runWakeHandler 注入；非交互模式没有投递
  // 通道，runWakeHandler 保持 null，消息丢弃。
  let runWakeHandler: ((event: InternalTurnEvent | string) => void) | null = null;
  const runCompletionWatcher = createRunCompletionWatcher({
    getCurrentDialogId: () => state.dialogId ?? null,
    onWake: (text) => runWakeHandler?.(text),
  });
  const effectiveEnv = options.env ? { ...process.env, ...options.env } : process.env;
  const runRegistryPoller = createRunRegistryPoller({
    getDockedRuns: () => activityIndicator.getAgentRuns(),
    update: (snapshot) => activityIndicator.updateAgentRun(snapshot),
    // 显式传 env：resolveNoloHome 只认传入 env 的 NOLO_HOME，不传则永远读
    // ~/.nolo——设了 NOLO_HOME 的环境（dev、测试）会读错目录。run 记录读取
    // 与 reconcile 的调用点也是同样写法。
    readRecord: (runId) => readRunRecord(runId, { env: effectiveEnv }),
    discoverRuns: () => listRunRecords({ env: effectiveEnv }),
    getCurrentDialogId: () => state.dialogId ?? null,
    reconcile: (runId) => checkStaleRun(runId, { env: effectiveEnv }),
    onRecordsPolled: (records) => runCompletionWatcher.observe(records),
  });
  const history = createTurnHistory();
  // `fixedInput` is reassigned once the interactive composer is installed, so
  // the host delegates through the binding rather than capturing the noop.
  const dialogHost = createDialogHost({
    composer: {
      pause: () => fixedInput.pause(),
      resumeFromDialog: () => {
        fixedInput.resumeFromDialog();
        // If the terminal was resized while the dialog owned the screen, the
        // composer is still parked at the pre-resize rows (onResize skips
        // repainting while paused). Repaint so it re-docks at the new bottom.
        flushPendingRender();
        renderHistoryToOutput();
        fixedInput.repaint(buffer, cursorPos);
      },
      getInputLines: () => fixedInput.getInputLines(),
      isPaused: () => fixedInput.isPaused(),
      isMouseEnabled: () => fixedInput.isMouseEnabled(),
    },
    inputPolicy: { wheel: "modal", pageKeys: "transcript" },
    renderUnderlay: () => {
      renderHistoryToOutput();
      fixedInput.repaint(buffer, cursorPos);
    },
    onTranscriptScroll: (action) => {
      applyScrollAction(history, action as import("./tuiScrollbar").ScrollAction, output, fixedInput.getInputLines());
    },
    output: output as NodeJS.WritableStream,
    // The decoder-drain hook is only bound once the interactive raw-mode
    // composer installs its decoder (inside the `isInteractiveInput` block
    // below); the non-raw readline path never binds it, so this stays a
    // no-op there — which is correct, that path has no raw decoder to drain.
    drainDecoder: () => {
      if (composerDecoderDrain) composerDecoderDrain();
    },
  });
  // ── Render coalescing + terminal sync ──────────────────────────────────
  // Streaming chunks arrive faster than the terminal can paint without
  // flicker. Coalesce multiple onUpdate calls in the same macrotask into a
  // single render frame, and wrap each frame in BSU/ESU (2026h/l) + cursor
  // hide/show so the terminal never shows a half-painted intermediate state.
  // Set true by finish() once the interactive session has exited. Lives in the
  // outer scope (alongside refreshGitStatus) so the async git callback can drop
  // a stale repaint that would land after /exit. `done` is block-scoped inside
  // the interactive branch below and is not visible here.
  let sessionEnded = false;

  // ── S4 迁移：渲染三件套（renderHistoryToOutput / paintSyncedFrame /
  // scheduleRender）与共享节流状态 flushPendingRender 已迁至 ./tuiRender。
  // 此处以 getter 直通注入可变绑定（fixedInput 会被 composer 安装整体替换、
  // buffer/cursorPos 随草稿改写），保持可变引用语义（禁止快照）；稳定引用
  // （output / history / selectionState）直接传值。解构保持原函数名，全部
  // 渲染调用点零改动。渲染是输出字节序列敏感区，函数体逐行搬移未动。
  const selectionState = createSelectionState();
  const { renderHistoryToOutput, scheduleRender, flushPendingRender } =
    createTuiRender({
      output,
      history,
      selectionState,
      get fixedInput() {
        return fixedInput;
      },
      get buffer() {
        return buffer;
      },
      get cursorPos() {
        return cursorPos;
      },
    });

  const refreshGitStatus = (): void => {
    // Per-key fallback: an explicit options.env that omits the key still
    // inherits the process-level kill switch (workspace tests pass env: {}).
    if ((options.env?.NOLO_CLI_GIT_STATUS ?? process.env.NOLO_CLI_GIT_STATUS) === "0") return;
    void detectGitStatusAsync(state.cwd).then((gitStatus) => {
      if (sessionEnded) return; // session exited while git ran — skip the stale repaint
      state = { ...state, gitStatus };
      scheduleRender();
    });
  };

  // 版本发布快（AI 辅助开发每次合入即发版）：启动时异步查一次 npm registry
  // 当前通道的最新版。检查永远不阻塞启动、失败静默（离线/超时/registry 抖动
  // 都当无更新），NOLO_CLI_NO_UPDATE_CHECK=1 可整体禁用。结果到达时若用户还
  // 停在欢迎页（未开始对话），从顶部重绘 banner 把 /update 提示带出来；已
  // 在对话中则只更新 state，不打断当前画面。
  const repaintBanner = () => {
    if (!(output as { isTTY?: boolean }).isTTY) return;
    // modal / dialog 拥有屏幕（如 /help、confirm）时不重绘，否则会擦掉弹层。
    if (fixedInput.isPaused()) return;
    if (dialogHost.isKeyboardClaimed()) return; // picker / confirm 弹层持有键盘时不重绘
    // 终端可能已 resize：重绘时实时读宽度，让 renderWelcome 重新决定是否
    // 保留 scene，避免旧宽度下画的 banner 在新宽度 wrap 出残留。
    const currentColumns = (output as { columns?: number }).columns ?? 80;
    const welcome = renderWelcome(state, 0, 0, currentColumns);
    const lines = welcome.split("\n");
    // 窄终端下 update hint / welcome hint 这类长行会物理换行，破坏"逻辑行数 =
    // 物理行数"的逐行定位；写入前按列宽截断，保证每行正好占一行。
    const safeWidth = Math.max(1, currentColumns);
    const safeLines = lines.map((line) => padOrTruncateToWidth(line, safeWidth));
    const clearLines = Math.max(initialBannerLineCount, safeLines.length);
    // 与 paintSyncedFrame 一致的 BSU/ESU + 光标隐藏包裹，避免清行与写入
    // 之间的中间帧闪烁；composer 重绘也在同一帧内完成。
    output.write("\x1b[?2026h\x1b[?25l");
    try {
      let frame = "";
      // 先清掉旧 banner 区域（含窄终端无 scene 的短 banner），再逐行定位写入
      // 新 banner。注意不能只 \x1b[H 一次后拼接多行文本：清行循环会把光标停在
      // 最后清的那行，welcome 会从那里开始画（banner 掉到屏幕中部）。
      for (let i = 0; i < clearLines; i++) frame += `\x1b[${i + 1};1H\x1b[2K`;
      safeLines.forEach((line, i) => {
        frame += `\x1b[${i + 1};1H${line}`;
      });
      output.write(frame);
      // 顶部 banner 区域重绘不影响底部 composer，但活动输入行的绘制状态需要
      // 恢复，否则光标/缓冲行与终端实际内容脱节。
      if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
    } finally {
      output.write("\x1b[?25h\x1b[?2026l");
    }
  };
  void checkForCliUpdate(state.cliVersion, state.serverUrl, {
    fetchImpl,
    env: options.env ?? process.env,
  }).then((updateAvailable) => {
    if (sessionEnded || !updateAvailable) return;
    state = { ...state, updateAvailable };
    // 欢迎页仍在屏幕上才重绘 banner：turns 为空且没有正在流式输出的 turn。
    // 第一轮 turn 开始后（currentRole 非空）transcript 已接管顶部，此时只
    // 更新 state，不打断画面。
    if (history.turns.length === 0 && history.currentRole === null) {
      repaintBanner();
    } else {
      scheduleRender();
    }
  });

  let autoScrollTimer: ReturnType<typeof setInterval> | null = null;
  let lastDragMouseX = 1;
  // 边缘拖拽动态加速的 tick 计数：持续按住边缘的 tick 数决定单步行数，
  // 阶梯加速 1 → 3 → 6（封顶），stopAutoScroll（鼠标移开）时重置。
  let autoScrollTicks = 0;
  // 双击 Ctrl+C 退出：第一次按下记录时间戳，1000ms 内第二次才退出。
  let lastCtrlCDoublePress: number | null = null;

  const stopAutoScroll = () => {
    if (autoScrollTimer) {
      clearInterval(autoScrollTimer);
      autoScrollTimer = null;
    }
    autoScrollTicks = 0;
  };
  const clearSelection = () => {
    stopAutoScroll();
    selectionState.dragging = false;
    selectionState.anchor = null;
    selectionState.head = null;
  };

  // readLatestAssistantReply / buildConversationMarkdown（/copy last|all 取材）
  // 已随 S5 迁至 ./tuiSlashRouter。
  // Whether a modal (any `dialogHost.run()`/`withKeyboard()` caller — confirm
  // dialogs, action gates, ask_choice, the agent/dialog pickers) currently
  // owns the keyboard now lives entirely in `dialogHost` (`isKeyboardClaimed()`)
  // — see dialogHost.ts's file docstring. The modal's own `data` listener
  // handles its keys (Enter/Esc/Ctrl+C/arrow keys), so the main loop must not
  // let stray keys leak into the composer draft buffer — otherwise a key
  // typed while the modal is open gets prepended to the next submitted line
  // (e.g. `x` before `/exit` yields `x/exit`, which is not recognized as
  // /exit and the process never exits), or — for ask_choice — Esc meant to
  // cancel the popup also aborts the whole turn (activeTurnAbort). Mirrors
  // how the non-raw gate path uses rl.pause() to give the gate exclusive
  // keyboard access.
  // rawActionGateTokenHandler is still workspace-local: it's how the
  // handoff-gate raw prompt (which has no dialog frame, so it never goes
  // through `dialogHost.run()`) routes decoded tokens to itself while
  // `dialogHost.withKeyboard()` holds the claim. Hoisted above
  // runOneAgentTurn so handleInputToken (below) can read it without a
  // forward-reference.
  let rawActionGateTokenHandler: ((token: string) => void) | null = null;

  // --- 对话积分基数 seed helper（workspace 闭包顶层，attach 已有对话时用） ---
  //
  // 状态行的积分显示 = 本次会话本地累加（accumulateSessionCredits，精确且无延迟）
  // + 本对话在此之前的历史累计（这里从服务端 dialog 记录的 totalCost 读）。
  //
  // 为什么服务端值只能当 seed、不能当每轮的主显示源：CLI 本地 loop 的 token 明细
  // 先落本地库、再远端同步，服务端据同步过来的明细才累加 totalCost。turn 一结束
  // 就去读，读到的基本是上一轮的数——这正是「积分有时不显示 / 数值不准」的来源。
  // 因此只在 attach 一个已有对话时读一次，且仅当本会话尚未在该对话上累计过
  // （sessionCredits 为空）才写入，避免把本会话的消费重复计一遍。
  // 用 readDbRecord（/api/v1/db/read，只读单条 record，不含 messages）而非
  // readDialogSnapshot，避免拉全量消息的额外开销。
  const seedDialogCreditsBase = (dialogId: string, dialogKey: string) => {
    const env = options.env ?? process.env;
    const authToken = resolvePlatformAuthToken(env);
    if (!authToken) return;
    void readDbRecord({
      dbKey: dialogKey,
      authToken,
      serverUrl: state.serverUrl,
      fetchImpl,
    })
      .then((record) => {
        if (sessionEnded) return;
        if (state.dialogId !== dialogId) return;
        // 异步返回期间用户已经在这个对话里跑过 turn：本会话的量已被本地累加，
        // 此时服务端 totalCost 可能已含同一笔，写入就是重复计数。放弃 seed。
        if (state.sessionCredits !== undefined) return;
        const recordObj =
          record && typeof record === "object"
            ? (record as Record<string, unknown>)
            : null;
        const totalCost = recordObj ? Number(recordObj?.totalCost) : NaN;
        if (Number.isFinite(totalCost) && totalCost >= 0) {
          state = { ...state, dialogCreditsBase: totalCost };
        }
      })
      .catch(() => {
        // 读取失败不打断 turn：状态行退化成只显示本会话累加值。
      });
  };

  // 每轮结束把本轮平台积分累加进会话累计。runResult.turnCredits 已是「本轮全部
  // provider 调用之和」（见 client/tokenUsage.ts 的 sumPlatformCredits），且在
  // 中断 / 失败的 turn 上同样有值——那些轮次的 provider 调用照样扣了费。
  // 只在平台计费时有值：自有 API / 订阅制为 undefined，累计保持不变。
  const accumulateSessionCredits = (credits: number | undefined) => {
    if (credits === undefined || !Number.isFinite(credits)) return;
    state = { ...state, sessionCredits: (state.sessionCredits ?? 0) + credits };
  };

  // --- Chat queue (TUI binding, no Redux) ---
  //
  // runOneAgentTurn executes a single agent turn end-to-end: records the user
  // message into the transcript, runs runAgentChat, finalizes the assistant
  // turn, and folds dialog/token state back. Extracted from runSubmittedLine's
  // chat branch so the queue drain path can reuse the exact same rendering +
  // execution + state-update logic as a direct send.
  // Composer decoder drain hook, read by `dialogHost`'s injected
  // `drainDecoder` (see the createDialogHost call above). Every dialog and
  // the composer's raw input decoder are parallel `data` listeners on the
  // same stdin; a dialog's confirm Enter can sit debounced ~40ms in the
  // composer decoder and would otherwise leak into the next submit once the
  // dialog closes. `dialogHost.run()`/`withKeyboard()` calls this on every
  // close (before releasing the keyboard claim) to discard those deferred
  // bytes (and any partial ESC/CSI tail). The decoder binding only exists
  // once the interactive composer is installed (inside the
  // `isInteractiveInput` block below), so this stays a workspace-scope hook
  // rather than a direct reference — referencing the block-scoped decoder
  // directly used to throw `ReferenceError: onData is not defined` and leave
  // the keyboard claim stuck, which froze all input after an ask_user
  // question (fixed by routing through this hook instead).
  let composerDecoderDrain: (() => void) | null = null;

  const emitCommandOutput = (text: string, command = "") => {
    if (!text) return;
    if (!isInteractiveInput(input)) {
      output.write(`${text}\n`);
      return;
    }
    history.followBottom = true;
    appendLocalTurn(history, command, text);
    renderHistoryToOutput();
    if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
  };

  // The TUI chat queue binding drives drain via runOneAgentTurn. It is created
  // on demand so the drain callback can capture history/state/fixedInput/runAgentChat.
  let chatQueueBinding: ChatQueueTuiBinding | null = null;

  // 当前进行中 turn 的注入收件箱（runOneAgentTurn 创建/清理）。busy 时后台 run
  // 终态唤醒直投这里注入正在跑的 loop，不再走 chat 队列。见 turnInjectionInbox.ts。
  let turnInjectionInbox: AgentTurnContext["turnInjectionInbox"] = null;

  // ── S2：turnCtx 装配（通过 getter/setter 严格保持可变引用语义） ──────────
  const turnCtx: AgentTurnContext = {
    get state() { return state; },
    set state(v) { state = v; },
    get forcedStop() { return forcedStop; },
    set forcedStop(v) { forcedStop = v; },
    get forcedStopEpoch() { return forcedStopEpoch; },
    set forcedStopEpoch(v) { forcedStopEpoch = v; },
    get turnEpoch() { return turnEpoch; },
    set turnEpoch(v) { turnEpoch = v; },
    get activeTurnAbort() { return activeTurnAbort; },
    set activeTurnAbort(v) { activeTurnAbort = v; },
    get activeTurnEpoch() { return activeTurnEpoch; },
    set activeTurnEpoch(v) { activeTurnEpoch = v; },
    get chatQueueBinding() { return chatQueueBinding; },
    set chatQueueBinding(v) { chatQueueBinding = v; },
    get turnInjectionInbox() { return turnInjectionInbox; },
    set turnInjectionInbox(v) { turnInjectionInbox = v; },

    get sessionEnded() { return sessionEnded; },
    get buffer() { return buffer; },
    get cursorPos() { return cursorPos; },

    get fixedInput() { return fixedInput; },

    options,
    effectiveEnv,
    history,
    activityIndicator,
    activityReporter,
    runRegistryPoller,
    runCompletionWatcher,
    pasteStore,
    dialogHost,
    input,
    output,

    syncWindowTitle,
    renderHistoryToOutput,
    scheduleRender,
    flushPendingRender,
    seedDialogCreditsBase,
    accumulateSessionCredits,
    emitCommandOutput,
  };

  const persistExplicitAgentSwitch = (previousAgentKey: string) => {
    if (state.agentKey === previousAgentKey) return false;
    persistAgentSelection(
      state,
      options.env ?? process.env,
      options.saveAgentSelection,
    );
    return true;
  };

  // ── S5 迁移：runSubmittedLine 的 slash 命令 bus 分发已迁至 ./tuiSlashRouter
  // （runSubmittedSlashLine）。此处仅装配 host：可变绑定（state / buffer /
  // cursorPos / fixedInput）以 getter/setter 直通保持可变引用语义（禁止快照），
  // 稳定实例与编排回调按原引用注入。本文件调用点与函数签名保持不变。
  const slashHost: SlashDispatchHost = {
    get state() {
      return state;
    },
    set state(v) {
      state = v;
    },
    get buffer() {
      return buffer;
    },
    get cursorPos() {
      return cursorPos;
    },
    get fixedInput() {
      return fixedInput;
    },
    history,
    pasteStore,
    dialogHost,
    input,
    output,
    options,
    fetchImpl,
    turnCtx,
    emitCommandOutput,
    renderHistoryToOutput,
    scheduleRender,
    seedDialogCreditsBase,
    persistExplicitAgentSwitch,
    persistAgentSelection,
    writeClipboard,
    selfUpdater,
    spawnRunner,
    installAltScreenRestoreHandlers,
  };

  const runSubmittedLine = async (
    line: string,
    actionGateHandler: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>,
    confirmDestructiveAction?: (request: PermissionRequest) => Promise<boolean>,
  ): Promise<boolean> =>
    runSubmittedSlashLine(line, slashHost, actionGateHandler, confirmDestructiveAction);

  if (isInteractiveInput(input)) {
    input.setRawMode(true);
    output.write("\x1b[?2004h");
    let busy = false;
    let done = false;
    let resolveDone: (() => void) | null = null;
    // NOTE: do NOT redeclare `buffer` here. The composer draft lives in the
    // outer scope (hoisted above) on purpose: runSubmittedLine's streaming
    // callback and the activity spinner timer repaint the composer from that
    // binding while a turn runs. Shadowing it with a block-local `let buffer`
    // (as this used to do) decoupled the two: onKey wrote the draft into the
    // inner binding while every streaming/activity repaint read the outer one,
    // which stayed "" forever — so during a loop the composer kept snapping
    // back to the placeholder and hid what the user was typing (the submit
    // path still read the inner buffer, so input "worked" but was invisible).
    const baseFixedInput = createFixedInput(output, {
      getStatusLine: (maxWidth) => {
        // Show the queued-input count while a turn is running so the user can
        // see their follow-ups are staged, not lost. Mirrors the Web/RN
        // queue badge via the shared projectChatQueueStatus contract.
        // composeStatusLineWithQueue treats the badge as optional chrome: it
        // reserves the badge width only while the degraded status (auto
        // confirm / running / dirty) still fits beside it, and drops the
        // badge entirely when it alone would overflow the budget.
        const queueSuffix =
          chatQueueBinding && chatQueueBinding.queueLength() > 0
            ? dimCliText(
                ` · ${chatQueueBinding.queueLength()} ${t("queuedHint")}`,
                resolveCliColorEnabled(),
              )
            : "";
        return composeStatusLineWithQueue(state, queueSuffix, maxWidth);
      },
      getActivityLines: () =>
        activityIndicator.getActivityLines(resolveCliColorEnabled()),
      getQueueLines: () => {
        if (!chatQueueBinding || chatQueueBinding.queueLength() === 0) return [];
        const colorEnabled = resolveCliColorEnabled();
        // queuePreview is the shared projection: up to 3 entries, each already
        // truncated to 40 chars. Render each as a dim "⤷ <text>" line so the
        // staged follow-ups are visible above the composer. Newlines in a
        // queued paste must be collapsed to a single-line marker: each entry is
        // one `sections` row, and an embedded "\n" would emit extra physical
        // lines that headerRows doesn't count, drifting the input cursor.
        return chatQueueBinding
          .getStatus()
          .queuePreview.map((text, i) => {
            const oneLine = text.replace(/\r?\n/g, " ⏎ ");
            return dimCliText(`  ⤷ ${i + 1}. ${oneLine}`, colorEnabled);
          });
      },
      getAttachmentLine: () => {
        // 附件条：Ctrl+V 贴图成功后实时显示当前草稿的附件列表（≤2 张全列，
        // 更多 +N）。附件是「下一条消息」的草稿态：提交时由 sessionDispatch
        // 派发层清零，/clear、/new 同样清零 → 返回 null → 行消失（高度回落
        // 走 onInputLinesChange 既有路径）。dim 以匹配 composer chrome。
        const line = formatComposerAttachmentLine(state.attachedImages);
        return line ? dimCliText(line, resolveCliColorEnabled()) : null;
      },
      onInputLinesChange: () => {
        // composer 高度变化（活动行首次出现：3→4 行）时补一次历史重绘。
        // renderHistoryToOutput 内部有 syncingLayout 卫兵防重入。
        renderHistoryToOutput();
      },
      // /cd 路径补全候选行渲染需要当前 cwd（读 state 而非入参，保证
      // /cd 切换后立即以新 cwd 渲染，composer 不必重建）。
      getCwd: () => state.cwd,
    });
    fixedInput = {
      ...baseFixedInput,
      repaint(draft, cursorPos) {
        syncWindowTitle();
        return baseFixedInput.repaint(draft, cursorPos);
      },
      pause() {
        clearSelection();
        return baseFixedInput.pause();
      },
    };
    fixedInput.init();
    const paintFrame = (draft: string) => {
      output.write("\x1b[?2026h\x1b[?25l");
      try {
        renderHistoryToOutput();
        fixedInput.repaint(draft, cursorPos);
      } finally {
        output.write("\x1b[?25h\x1b[?2026l");
      }
    };
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const performResizePaint = () => {
      if (done) return;
      if (fixedInput.isPaused()) {
        // DialogHost owns this repaint transaction: underlay first, modal
        // foreground last. This is independent of listener registration order.
        dialogHost.repaint();
        return;
      }
      flushPendingRender();
      paintFrame(buffer);
    };
    const onResize = () => {
      if (done) return;
      clearSelection();
      // 在持续拖拽 resize 期间做 20ms Coalescing，合并高频 SIGWINCH 信号
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        performResizePaint();
      }, 20);
    };
    const resizeTarget = output as NodeJS.WritableStream & {
      on?: (event: string, listener: () => void) => void;
      off?: (event: string, listener: () => void) => void;
    };
    resizeTarget.on?.("resize", onResize);
    const finish = () => {
      if (done) return;
      done = true;
      sessionEnded = true; // signal in-flight async git refresh to drop its repaint
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
        resizeTimer = null;
      }
      clearSelection();
      // Session teardown is the last-resort owner of Windows Terminal progress
      // cleanup. It is intentionally best-effort and idempotent: an interaction
      // normally clears in runWithInputRequiredAttention's finally, while this
      // path also covers teardown racing an unsettled interaction.
      clearTerminalAttentionProgress({ output, env: effectiveEnv });
      // run 停靠区的 timer 跨 turn 存活，只有会话退出才该停——否则 /exit 之后
      // 它还在往一个已经不归自己管的终端上重绘。
      runRegistryPoller.dispose();
      runCompletionWatcher.dispose();
      activityIndicator.dispose();
      resolveDone?.();
      clearCollapsedPasteStore(pasteStore);
      resizeTarget.off?.("resize", onResize);
      input.off("data", onData);
      input.off("end", finish);
      input.off("close", finish);
      onData.destroy();
      output.write("\x1b[?2004l");
      output.write("\x1b[?25h\x1b[?2026l");
      input.setRawMode?.(false);
    };
    // actionGate / 破坏性操作确认的交互处理器曾内联在三处（busy 提交、空闲
    // 手动 drain、直接发送），逐字重复。抽成一份三条路径共用：行为完全一致，
    // 改一处即三处生效。键盘认领/释放 + decoder 排空现在完全由 dialogHost
    // 自己负责（见 dialogHost.ts 文件注释），这两个处理器不用再手工管理。
    const buildInteractiveTurnHandlers = () => {
      const actionGateHandler = async (gate: LocalAgentActionGate) => {
        // /auto on（会话级权限自动化）：只放行写文件确认门（file_write 的
        // confirm gate）。handoff / input 类 gate 需要真人接管终端，不是
        // 权限确认，绝不能被 /auto 短路——这是安全边界，见
        // isAutoConfirmableFileWriteGate 的文档。与 confirmDestructiveAction
        // 的 state.autoConfirm 先例同款：state 是 runTuiWorkspace 的可变绑定，
        // 这里在调用时读取，拿到的总是最新值。
        if (state.autoConfirm && isAutoConfirmableFileWriteGate(gate)) {
          return buildGateConfirmedResult(gate);
        }
        // `confirm` gates route through dialogHost.run() + a framed dialog;
        // `handoff` gates keep the raw text-prompt wait (dialogHost.withKeyboard()),
        // now pausing the composer for its full wait window instead of only
        // around the subprocess. See resolveActionGate's docstring in
        // tuiTurnRunner.ts for why (activity-indicator repaint erasure) and
        // for which of the two dialogHost entry points each kind uses.
        // Agent 自主运行中被 gate 拦下等用户接管终端：input-required
        // attention。confirm / cancel / exception / Ctrl+C / turn abort 无论
        // 从哪条路退出，finally 都保证清掉 Windows Terminal progress。
        return await runWithInputRequiredAttention({ output, env: effectiveEnv }, () =>
          resolveActionGate(gate, {
            dialogHost,
            input,
            output,
            spawnRunner,
            registerToken: (handler) => { rawActionGateTokenHandler = handler; },
            pauseComposer: () => fixedInput.pause(),
            resumeComposerFromSubprocess: () => fixedInput.resumeFromSubprocess(),
            resumeComposerFromDialog: () => fixedInput.resumeFromDialog(),
          }),
        );
      };
      const confirmDestructiveAction = async (request: PermissionRequest) => {
        // /auto on（会话级权限自动化）：跳过确认弹窗直接放行。state 是
        // runTuiWorkspace 的可变绑定（busy 期间 /auto 走 isBusyLocalSlash
        // 本地处理并回写），这里在调用时读取，拿到的总是最新值。
        // 只短路破坏性操作确认；actionGate（handoff/input 类）不走这里。
        if (state.autoConfirm) return true;
        // 破坏性操作确认同属「Agent 等用户决定」：立即提醒，任何应答路径
        // （approve / cancel / Esc / 异常）都由 finally 清掉 progress。
        return await runWithInputRequiredAttention({ output, env: effectiveEnv }, () =>
          dialogHost.run((anchor) =>
            runConfirmDialog({
              request,
              input: input as any,
              output: output as any,
              ...anchor,
            }),
          ),
        );
      };
      return { actionGateHandler, confirmDestructiveAction };
    };
    // 空闲时把一段文本作为新 turn 直接跑。两个调用方：Enter 键的空闲手动
    // drain（空 Enter / Ctrl+S 落到这里的队首）和 run 终态唤醒。busy 标志、
    // enterOutputMode、notifyTurnEnd、失败时 emitCommandOutput(turnFailed)
    // 与直接发送路径保持同一份实现，不复制漂移。调用方必须保证当前空闲。
    const runIdleTextTurn = async (inputMsg: TurnRequest | InternalTurnEvent | string): Promise<void> => {
      const req = createTurnRequest(inputMsg);
      const { actionGateHandler, confirmDestructiveAction } = buildInteractiveTurnHandlers();
      const binding = ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction);
      binding.notifyTurnStart();
      busy = true;
      fixedInput.enterOutputMode(req.text);
      try {
        const outcome = await runOneAgentTurn(
          turnCtx,
          req,
          [],
          actionGateHandler,
          confirmDestructiveAction,
        );
        await binding.notifyTurnEnd(outcome);
      } catch (err) {
        await binding.notifyTurnEnd({ ok: false, aborted: false });
        emitCommandOutput(
          `${t("turnFailed")}${err instanceof Error && err.message ? `\n${err.message}` : ""}`,
        );
      } finally {
        busy = false;
      }
      refreshGitStatus();
      flushPendingRender();
      fixedInput.exitOutputMode(buffer, cursorPos);
    };
    // 唤醒通道在这一行才真正接上——非交互模式（管道 / print）走同一份代码但
    // 永远到不了这里。工具表靠这个标记决定要不要给出 controlAgentRun 的 wait
    // 动作：有人能把对话接回来，就不需要冻结对话去等。写在赋值点而不是模块
    // 顶层，是因为「是不是 TUI」和「有没有投递通道」不是一回事。
    //
    // 写进 turn 路径实际读的那个 env 对象（tuiTurnRunner 用
    // `ctx.options.env ?? process.env`），别写进 effectiveEnv——那是 run 记录
    // 读取用的快照，构造得更早，也不流向工具表。
    (options.env ?? process.env)[RUN_WAKE_CHANNEL_ENV] = "1";
    runWakeHandler = (event: InternalTurnEvent | string) => {
      if (done) return;
      if (busy || fixedInput.isPaused()) {
        // 直投当前进行中的 agent loop：唤醒不再挂进 chat 消息队列等整个 turn
        // 跑完，而是作为 user 消息在下一轮 provider 调用注入本 turn，模型当场
        // 消化。收件箱不可用（无进行中 turn / 已关闭）时才落回 chat 队列。
        const text = typeof event === "string" ? event : event.text;
        const injected =
          !!turnInjectionInbox && turnInjectionInbox.push({ text, fallback: event });
        if (injected) {
          // 立即在 transcript 印一行紧凑 dim 状态行，让用户马上看到唤醒已被
          // 本轮吸收（不再出现在队列 UI）。
          //
          // 注意：这里不能用 emitCommandOutput。它走 appendLocalTurn，而
          // appendLocalTurn 会 finalizeCurrentTurn 把 currentRole 置 null；
          // createHistoryOutputStream.write 只调 applyOutputChunkToCurrentTurn，
          // 不会把 currentRole 设回 assistant —— 注入发生在流式输出中途时，
          // 之后模型继续流出的文本会被静默吞掉（不保存也不渲染）。
          // appendStreamSafeNotice 会在插入状态行后重开 assistant 流式段。
          const displayText =
            typeof event !== "string" && event.kind === "child-run-completed"
              ? (event.displayText ?? event.text)
              : text;
          const noticeLine = dimCliText(displayText, resolveCliColorEnabled());
          if (!isInteractiveInput(input)) {
            // 非交互模式本来就不碰 TurnHistory，直写即可（与 emitCommandOutput 一致）。
            output.write(`${noticeLine}\n`);
          } else {
            history.followBottom = true;
            appendStreamSafeNotice(history, noticeLine, {
              appendLocalTurn,
              startTurn,
            });
            renderHistoryToOutput();
          }
        } else {
          const { actionGateHandler, confirmDestructiveAction } = buildInteractiveTurnHandlers();
          ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction)
            .enqueue(event);
        }
        if (fixedInput.active && !fixedInput.isPaused()) {
          fixedInput.repaint(buffer, cursorPos);
        }
        return;
      }
      void runIdleTextTurn(event).catch((err) => {
        emitCommandOutput(
          `${t("turnFailed")}${err instanceof Error && err.message ? `\n${err.message}` : ""}`,
        );
      });
    };

    let autoScrollDirection: "up" | "down" = "up";
    // autoScrollTicks 声明在外层，stopAutoScroll（鼠标移开）时重置。
    const autoScrollStep = () => autoScrollStepForTicks(++autoScrollTicks);
    const startAutoScroll = (direction: "up" | "down", mouseX: number) => {
      autoScrollDirection = direction;
      lastDragMouseX = mouseX;
      if (autoScrollTimer) return;
      autoScrollTimer = setInterval(() => {
        if (!selectionState.dragging || !selectionState.anchor || fixedInput.isPaused()) {
          stopAutoScroll();
          return;
        }
        const tty = output as { rows?: number; columns?: number };
        const rows = tty.rows ?? 24;
        const columns = tty.columns ?? 80;
        const visibleHeight = Math.max(1, rows - fixedInput.getInputLines());
        const contentWidth = Math.max(1, columns - 1);
        const step = autoScrollStep();

        if (autoScrollDirection === "up") {
          if (history.scrollTop > 0) {
            history.scrollTop = Math.max(0, history.scrollTop - step);
            history.followBottom = false;
          } else {
            stopAutoScroll();
          }
        } else {
          const { totalLines } = getAllTurnEntries(history, contentWidth);
          const maxScroll = Math.max(0, totalLines - visibleHeight);
          if (history.scrollTop < maxScroll) {
            history.scrollTop = Math.min(maxScroll, history.scrollTop + step);
          } else {
            stopAutoScroll();
          }
        }

        const screenRow = autoScrollDirection === "up" ? 0 : visibleHeight - 1;
        const hit = hitTestHistory(
          history,
          screenRow,
          lastDragMouseX - 1,
          contentWidth,
          history.scrollTop,
        );
        if (hit) {
          selectionState.head = hit;
        }
        paintFrame(buffer);
      }, 60);
    };

    // ── S1：Ctrl+C 分支抽为 runTuiWorkspace 内部具名闭包（逐行搬移，行为等价） ──
    // 原内联于 handleInputToken 的 `if (sequence === "\u0003")` 整块，职责清晰
    // （防误退键盘语义），搬到这里保持纯搬移：不改逻辑、不改输出字节序列。
    // 依赖（busyLock 之外的闭包变量）在交互块作用域内全部可及。
    const handleCtrlCKey = async (busyLock: boolean): Promise<void> => {
      // Ctrl+C（\u0003）：防误退。必须放在 generic clearSelection() 之前，
      // 否则会先清掉鼠标选区，导致"Ctrl+C 提取选区"失效。
      // - Busy：中止当前 Turn（保持原有 abort 语义），绝不退出。
      // - Idle + 有鼠标选区：提取选区文本写入剪贴板，清除高亮，绝不退出。
      // - Idle + 输入草稿非空：仅清空草稿（同 Bash/Zsh），绝不退出。
      // - Idle + 草稿空且无选区：第一次记录时间戳 + 提示；1000ms 内第二次才退出。
      if (busyLock && activeTurnAbort) {
        // 中止当前 Turn（保持原有行为）：与 Esc 的协作停止一致。
        const stopBinding = chatQueueBinding;
        if (stopBinding && stopBinding.queueLength() > 0) {
          stopBinding.preemptForStop();
        }
        activityIndicator.markStopping();
        activeTurnAbort.abort();
        return;
      }
      // Idle 分支。
      const now = Date.now();
      const hasSelection =
        selectionState.anchor !== null &&
        selectionState.head !== null &&
        !areSelectionPointsEqual(selectionState.anchor, selectionState.head);
      if (hasSelection) {
        // 提取选区文本写入剪贴板，清除选区高亮。
        const tty = output as { rows?: number; columns?: number };
        const columns = tty.columns ?? 80;
        const contentWidth = Math.max(1, columns - 1);
        const textToCopy = extractSelectedText(
          history,
          selectionState.anchor!,
          selectionState.head!,
          contentWidth,
        );
        clearSelection();
        if (textToCopy.length > 0) {
          try {
            await writeClipboard(textToCopy);
            emitCommandOutput(t("copiedSelection"));
          } catch (error) {
            emitCommandOutput(
              `[nolo] ${t("copyFailed")}: ${toErrorMessage(error)}`,
            );
          }
        }
        paintFrame(buffer);
        return;
      }
      if (selectionState.anchor) {
        clearSelection();
      }
      if (buffer.length > 0) {
        // 仅清空输入草稿。
        buffer = "";
        cursorPos = 0;
        if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
        emitCommandOutput(t("ctrlCClearedDraft"));
        return;
      }
      // 草稿空且无选区：双击退出。
      if (lastCtrlCDoublePress !== null && now - lastCtrlCDoublePress <= 1000) {
        lastCtrlCDoublePress = null;
        fixedInput.disable();
        finish();
        return;
      }
      lastCtrlCDoublePress = now;
      emitCommandOutput(t("ctrlCExitHint"));
    };

    // ── S1：busy 本地 slash 处理抽为 runTuiWorkspace 内部具名闭包（逐行搬移） ──
    // 原内联于 handleInputToken 的 `if (isBusyLocalSlash) { ... }` 整块。该分支
    // 在 turn 进行中把 /context /switch 等本地命令经 handleTuiInput 走瞬时渲染
    // 通道（见下），搬移不改逻辑与输出字节序列。
    const handleBusyLocalSlash = async (
      submittedText: string,
      busySlashCommand: string,
    ): Promise<void> => {
      releaseCollapsedPasteReferences(submittedText, pasteStore);
      buffer = "";
      cursorPos = 0;
      if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);

      const beforeAgentKey = state.agentKey;
      const res = handleTuiInput(submittedText, state);
      if (res.action?.type === "theme-refresh") {
        state = res.nextState;
        const detected = await detectTerminalBackground({
          stdin: input as NodeJS.ReadStream & { setRawMode?: (mode: boolean) => void },
          stdout: output as NodeJS.WritableStream & { isTTY?: boolean },
          allowSystemFallback: true,
        });
        let refreshMsg = "";
        if (detected && applyDetectedBackground(detected)) {
          refreshMsg = t("themeRefreshed", detected.brightness);
        } else if (detected) {
          refreshMsg = t("themeRefreshed", detected.brightness);
        } else {
          refreshMsg = t("themeRefreshFailed");
        }
        if (refreshMsg) {
          output.write(`${refreshMsg}\n`);
        }
      } else if (res.action?.type === "cwd-refresh") {
        // /cd 在 turn 运行中允许切换：立即应用新 cwd（下个 turn 生效），
        // 回显确认文案，并用新 cwd 重测 gitStatus 后重绘状态行/composer。
        state = res.nextState;
        if (res.output) {
          output.write(`${res.output}\n`);
        }
        // 与 refreshGitStatus 相同的 kill switch：测试/禁用场景不 spawn git。
        if ((options.env?.NOLO_CLI_GIT_STATUS ?? process.env.NOLO_CLI_GIT_STATUS) !== "0") {
          const gitStatus = await detectGitStatusAsync(state.cwd);
          if (gitStatus !== undefined) {
            state = { ...state, gitStatus };
          }
        }
        scheduleRender();
      } else if (res.action) {
        // `/switch` with no target (interactive picker) and `/switch
        // list` need to take over the screen, which races the in-flight
        // streaming repaint. Don't open them while busy and don't queue
        // them either: surface a one-line notice telling the user how
        // to switch without the picker (the change takes effect on the
        // next turn, not the in-flight one).
        output.write(
          "Model picker isn't available while a reply is running. " +
            "Use `/switch <name>` to switch now (takes effect on the " +
            "next turn), or wait for the reply to finish.\n",
        );
      } else {
        state = res.nextState;
        let msg = res.output;
        if (
          busySlashCommand === "/switch" &&
          persistExplicitAgentSwitch(beforeAgentKey)
        ) {
          // The switch succeeded. It can't affect the in-flight turn
          // (its model/provider were captured at turn start), so it
          // takes effect on the next turn / loop iteration. Warn that
          // switching mid-conversation re-sends the context to the new
          // model and therefore may burn extra tokens.
          const hint =
            "Note: the new model takes effect on the next turn. " +
            "Switching models may consume more tokens because the " +
            "conversation context is re-sent to the new model.";
          msg = msg ? `${msg}\n${hint}` : hint;
        }
        if (msg) {
          output.write(`${msg}\n`);
        }
      }
      if (busySlashCommand === "/theme") {
        // Theme commands mutate process-wide render state. Repaint both
        // the transcript and composer immediately even while a reply is
        // streaming; otherwise old truecolor cells linger until the
        // next stream chunk happens to arrive.
        renderHistoryToOutput();
        if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
      }
    };

    const handleInputToken = async (sequence: string) => {
      if (done) return;
      // While a modal (any dialogHost.run()/withKeyboard() caller — confirm,
      // action gate, ask_choice, agent/dialog picker) owns the keyboard, that
      // modal's own `data` listener owns the keyboard. Drop everything else
      // so random keys do not accumulate in the composer draft buffer and
      // corrupt the next submitted line, and so Esc meant to cancel a popup
      // does not also abort the running turn.
      if (dialogHost.isKeyboardClaimed()) {
        rawActionGateTokenHandler?.(sequence);
        return;
      }
      // While an agent turn is running we let the user keep typing into the
      // docked composer (draft buffer) but ignore submit so a second turn
      // cannot race the in-flight one. The draft is preserved and shown
      // once the turn finishes via fixedInput.exitOutputMode(buffer).
      // Ctrl+S flushes every queued follow-up as one merged message. The raw
      // byte is always swallowed here (even with an empty queue) so it never
      // falls through to applyTuiInputKey and gets typed into the draft as a
      // literal control char (review finding: empty-queue Ctrl+S leaked into
      // the composer buffer).
      //   - busy: snapshot+clear the queue, re-enqueue the merged text as the
      //     sole head, preempt the in-flight turn so the drain cascade sends
      //     it immediately. The draft is kept (the turn owns the screen).
      //   - idle: the composer draft is folded into the merge too (it is
      //     unsent content just like the queue), then the empty-Enter manual
      //     drain path sends the merged text as a fresh turn. Folding the
      //     draft here — instead of recursing with a possibly-non-empty
      //     buffer — avoids the trap where a stray draft would be submitted
      //     by the synthetic Enter while the merge stayed stranded in the
      //     queue.
      if (sequence === CTRL_S) {
        if (!chatQueueBinding || chatQueueBinding.queueLength() === 0) {
          // Nothing to flush: swallow the key so \x13 is never typed into the
          // draft as a literal control character.
          return;
        }
        const flushCount = chatQueueBinding.queueLength();
        const merged = chatQueueBinding.snapshotAndClearQueue();
        if (!merged) return;
        // Idle: fold the composer draft into the merge so "Ctrl+S = send
        // everything pending right now" holds even when the user is mid-type.
        // Busy keeps the draft (the turn owns the screen; the draft is
        // preserved and editable once the turn ends).
        const draftIncluded = !busy && buffer.trim() !== "";
        const fullText = draftIncluded ? `${buffer}\n${merged}` : merged;
        chatQueueBinding.enqueue(fullText);
        // Use a busy-aware message so the busy path does not contradict the
        // subsequent "Stopped this reply." line (review finding: two
        // contradictory toasts). The idle path is plain "flushed N as one".
        const totalCount = flushCount + (draftIncluded ? 1 : 0);
        emitCommandOutput(
          t(busy ? "flushQueuedBusyHint" : "flushQueuedIdleHint", String(totalCount)),
        );
        if (busy) {
          preemptAndAbortForDrain(chatQueueBinding, activeTurnAbort);
          return;
        }
        // Idle: clear the now-merged draft, then reuse the empty-Enter
        // manual-drain path below to send it as a fresh turn.
        buffer = "";
        cursorPos = 0;
        if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
        return handleInputToken("\r");
      }
      const busyLock = busy;

      const mouseEvent = parseSgrMouseEvent(sequence);
      if (mouseEvent) {
        if (fixedInput.isPaused()) return;
        if (mouseEvent.kind === "wheel") {
          const scrollAction =
            mouseEvent.wheelDirection === "down" ? "wheel-down" : "wheel-up";
          applyScrollAction(history, scrollAction, output, fixedInput.getInputLines());
          // One trackpad swipe delivers dozens of wheel reports. Painting each
          // one synchronously means dozens of full unsynced transcript
          // repaints that also fight the streaming render frames — the scroll
          // visibly tears and lags. Fold them into the same throttled, BSU/ESU
          // wrapped frame pipeline the stream uses: scrollTop is already
          // updated, only the paint is coalesced.
          scheduleRender();
          return;
        }

        const tty = output as { rows?: number; columns?: number };
        const rows = tty.rows ?? 24;
        const columns = tty.columns ?? 80;
        const visibleHeight = Math.max(1, rows - fixedInput.getInputLines());
        const contentWidth = Math.max(1, columns - 1);
        const screenRow = mouseEvent.y - 1;
        const screenCol = mouseEvent.x - 1;

        if (mouseEvent.kind === "press" && mouseEvent.button === "left") {
          stopAutoScroll();
          if (screenRow < visibleHeight && screenCol < contentWidth) {
            const hit = hitTestHistory(
              history,
              screenRow,
              screenCol,
              contentWidth,
              history.scrollTop,
            );
            selectionState.anchor = hit;
            selectionState.head = hit;
            selectionState.dragging = false;
            // A previous selection may still be painted in the frame buffer.
            // Repaint immediately even when this click never becomes a drag.
            paintFrame(buffer);
          } else {
            clearSelection();
            paintFrame(buffer);
          }
          return;
        }

        if (mouseEvent.kind === "drag" && mouseEvent.button === "left") {
          if (!selectionState.anchor) return;
          selectionState.dragging = true;
          lastDragMouseX = mouseEvent.x;
          const clampedRow = Math.max(0, Math.min(visibleHeight - 1, screenRow));
          const hit = hitTestHistory(
            history,
            clampedRow,
            screenCol,
            contentWidth,
            history.scrollTop,
          );
          if (hit) {
            selectionState.head = hit;
          }

          if (screenRow <= 1 && history.scrollTop > 0) {
            startAutoScroll("up", mouseEvent.x);
          } else if (screenRow >= visibleHeight - 2) {
            startAutoScroll("down", mouseEvent.x);
          } else {
            stopAutoScroll();
          }

          paintFrame(buffer);
          return;
        }

        if (mouseEvent.kind === "release") {
          stopAutoScroll();
          if (selectionState.dragging && selectionState.anchor) {
            // Some terminals coalesce the last motion report, so the release
            // coordinates are the only reliable final drag endpoint.
            const clampedRow = Math.max(0, Math.min(visibleHeight - 1, screenRow));
            const releaseHit = hitTestHistory(
              history,
              clampedRow,
              screenCol,
              contentWidth,
              history.scrollTop,
            );
            if (releaseHit) selectionState.head = releaseHit;
          }
          if (
            selectionState.dragging &&
            selectionState.anchor &&
            selectionState.head &&
            !areSelectionPointsEqual(selectionState.anchor, selectionState.head)
          ) {
            const textToCopy = extractSelectedText(
              history,
              selectionState.anchor,
              selectionState.head,
              contentWidth,
            );
            if (textToCopy.length > 0) {
              writeClipboard(textToCopy)
                .catch((error) => {
                  emitCommandOutput(
                    `[nolo] ${t("copyFailed")}: ${toErrorMessage(error)}`,
                  );
                });
            }
            selectionState.dragging = false;
          } else {
            clearSelection();
          }
          paintFrame(buffer);
          return;
        }

        return;
      }

      // ── S1：Ctrl+C 分支已抽为上方 handleCtrlCKey 具名闭包，此处仅转发。
      if (sequence === "\u0003") {
        await handleCtrlCKey(busyLock);
        return;
      }

      if (selectionState.anchor) {
        clearSelection();
      }

      const scrollAction = parseScrollAction(sequence);
      if (scrollAction) {
        // Scrolling only reads history state, so it stays available during an
        // agent turn; block it only while a picker/confirm dialog or
        // subprocess owns the screen (repainting would corrupt their UI).
        if (fixedInput.isPaused()) return;
        applyScrollAction(history, scrollAction, output, fixedInput.getInputLines());
        paintFrame(buffer);
        return;
      }
      // Esc while a turn is running = cooperative stop. A lone \x1b token is
      // only produced for a real Esc press (arrow keys arrive as full CSI
      // sequences), so this cannot swallow other keys. When the queue has
      // staged follow-ups, arm stop-preempt so the abort preserves them
      // (instead of the normal "abort abandons follow-ups" contract); the
      // user stopped the current reply but did not abandon what they queued.
      //
      // 两次 Esc：
      // 1) 第一次：abort 协作停止，同帧把活动行切到「停止中」文案让用户立刻
      //    看到反馈（owner 报的 bug：按了没反应、要按好几次）。链路 unwind 需
      //    要时间，turnStopped 要等 await 返回才打印。
      // 2) 第二次（已 isStopping）：不再等链路，直接把 UI 交还用户——
      //    activityIndicator.stop()、forcedStop=true、activeTurnAbort=null、
      //    打印 forceStopped 提示、busyLock 解除、重绘 composer。迟到的
      //    runAgentChat 返回值由 runOneAgentTurn 里的 forcedStop 分支丢弃。
      if (busyLock && sequence === "\x1b" && activeTurnAbort) {
        if (activityIndicator.isStopping()) {
          // 第二次 Esc = 强制收尾。
          forcedStop = true;
          forcedStopEpoch = activeTurnEpoch;
          activityIndicator.stop();
          activeTurnAbort.abort();
          activeTurnAbort = null;
          activeTurnEpoch = 0;
          busy = false;
          emitCommandOutput(t("forceStopped"));
          flushPendingRender();
          renderHistoryToOutput();
          if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
          return;
        }
        // 第一次 Esc = 协作停止 + 即时反馈。
        const stopBinding = chatQueueBinding;
        if (stopBinding && stopBinding.queueLength() > 0) {
          stopBinding.preemptForStop();
        }
        activityIndicator.markStopping();
        activeTurnAbort.abort();
        return;
      }
      // 粘贴快捷键（Ctrl+V / \x16）或空 bracketed-paste 触发且 stdin 无有效文本时，主动向系统剪贴板索取图像
      const isPasteToken = sequence.startsWith(PASTE_TOKEN_PREFIX);
      const isPasteShortcut =
        sequence === "\x16" ||
        (isPasteToken && sequence.slice(PASTE_TOKEN_PREFIX.length).trim() === "");

      if (isPasteShortcut) {
        try {
          const image = await readClipboardImage({
            env: options.env ?? process.env,
          });
          state = {
            ...state,
            attachedImages: mergeAttachedImages(state.attachedImages, [image]),
          };
          emitCommandOutput(summarizeAttachment(image));
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          emitCommandOutput(
            themeText(`[nolo] ${msg}`, "warning", resolveCliColorEnabled()),
          );
        }
        if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
        return;
      }
      // Backspace 撤销附件：空草稿 + 有附件时，逐个撤销（最新贴的先撤）。
      // 拦截点在普通字符处理之前；buffer 非空时完全不触发，普通退格语义
      // 不变（回执卡片仍留在 scrollback 作历史记录）。
      if (
        isBackspaceSequence(sequence, {}) &&
        buffer === "" &&
        state.attachedImages.length > 0
      ) {
        const undo = popLastAttachedImage(state.attachedImages);
        if (undo.handled && undo.removed) {
          state = { ...state, attachedImages: undo.images };
          emitCommandOutput(
            `[nolo] ${t("attachmentRemovedHint", undo.removed.filename, String(undo.images.length))}`,
          );
          if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
          return;
        }
      }
      const result = applyTuiInputKey(buffer, sequence, {}, cursorPos, {
        pasteStore,
        cwd: state.cwd,
      });
      if (result.redraw) {
        resetHistoryFrameDiffCache(output);
        renderHistoryToOutput();
        if (fixedInput.active) fixedInput.repaint(buffer, cursorPos, true);
        return;
      }
      if (result.abort) {
        fixedInput.disable();
        finish();
        return;
      }
      if (result.submit !== undefined) {
        // Replace UI-only paste chips with compact model references. The full
        // body is expanded only at an HTTP/persistence boundary or on demand
        // through readPastedText, so every provider round avoids replaying it.
        const submittedText = replaceCollapsedPastesWithReferences(
          result.submit,
          pasteStore,
        );
        const submittedTrimmed = submittedText.trim();
        // `busy` means an agent turn is occupying the composer. Slash/shell
        // commands (including /history) may await a picker or subprocess, but
        // they must not make a later /exit look like a queued chat message.
        const startsChatTurn =
          submittedTrimmed.length > 0 &&
          !submittedTrimmed.startsWith("/") &&
          !submittedTrimmed.startsWith("!");
        if (busyLock) {
          // While an agent turn is running, Enter does not start a new turn.
          // Instead, route the draft through the shared queue resolver: pure
          // text is enqueued for auto-send after the turn; slash commands and
          // attachments are surfaced as a brief notice (the user can retry
          // once the turn ends). The draft is cleared only on a successful
          // enqueue.
          const trimmedText = submittedText.trim();
          // While a turn runs, a few slash commands are handled locally right
          // now instead of being queued. Queuing them is wrong: the queue
          // drains its head by feeding the raw text to the agent runner as a
          // chat message, so a queued `/switch foo` would be sent to the model
          // as conversation text instead of switching the model. These
          // commands also MUST NOT touch the shared history state machine:
          // while a turn runs the assistant stream owns currentRole /
          // currentContent, and calling startTurn("user") here would
          // prematurely finalize the half-streamed reply (its tail chunks
          // would land under currentRole===null and be dropped by
          // finalizeCurrentTurn). So we route them through the transient
          // render channel: run handleTuiInput (which only mutates local TUI
          // state + returns output for these commands, never a chat action)
          // and write straight to the output stream. The next streaming
          // repaint overwrites it, which is fine for an ephemeral notice.
          const busySlashCommand = trimmedText.split(/\s+/)[0]?.toLowerCase();
          const isBusyLocalSlash =
            busySlashCommand === "/context" ||
            busySlashCommand === "/ctx" ||
            busySlashCommand === "/cd" ||
            busySlashCommand === "/switch" ||
            busySlashCommand === "/theme" ||
            busySlashCommand === "/runtime" ||
            busySlashCommand === "/tools" ||
            busySlashCommand === "/thinking" ||
            busySlashCommand === "/auto" ||
            busySlashCommand === "/tasks" ||
            busySlashCommand === "/jobs" ||
            busySlashCommand === "/procs" ||
            busySlashCommand === "/agents" ||
            busySlashCommand === "/doc" ||
            busySlashCommand === "/skill" ||
            busySlashCommand === "/customize" ||
            busySlashCommand === "/login" ||
            busySlashCommand === "/profile" ||
            busySlashCommand === "/version";
          if (isBusyLocalSlash) {
            // ── S1：busy 本地 slash 处理已抽为上方 handleBusyLocalSlash 具名
            // 闭包，此处仅转发（保持原 return 语义：处理完即结束本轮 handleInputToken）。
            await handleBusyLocalSlash(submittedText, busySlashCommand);
            return;
          }
          const { actionGateHandler, confirmDestructiveAction } =
            buildInteractiveTurnHandlers();
          const binding = ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction);
          const decision = binding.resolveSubmit({
            text: submittedText,
            isRunning: true,
          });
          if (decision.kind === "queue-text") {
            binding.enqueue(decision.text);
            buffer = "";
            cursorPos = 0;
            fixedInput.repaint(buffer, cursorPos);
          } else if (decision.kind === "queue-blocked") {
            // Attachments / mentions can't be queued yet; keep the draft so
            // the user can resend after the turn. No destructive action.
          } else if (
            decision.kind === "noop" &&
            !submittedText.trim() &&
            binding.queueLength() > 0
          ) {
            // Empty Enter while busy with a non-empty queue: preempt the
            // in-flight turn so the queued head drains immediately instead
            // of waiting for the turn to finish. Arm the binding's preempt
            // flag (so the upcoming aborted turn-end is reinterpreted as a
            // clean end and drains rather than clearing the queue), then
            // abort the current turn. The turn's own finally will call
            // notifyTurnEnd, which drives the drain cascade.
            preemptAndAbortForDrain(binding, activeTurnAbort);
          }
          // arm-fresh-dialog / compact-blocked / noop / multi-image-blocked
          // are all intentionally no-ops while busy: the draft is preserved
          // and the user can act on it once the turn completes.
          return;
        }
        // Empty Enter while idle with a residual queue (e.g. a previous turn
        // failed and kept the queue): manually drain the head as a fresh
        // turn. Reuses the same runOneAgentTurn + notifyTurnEnd path as a
        // direct send so the queue core stays consistent. Non-empty drafts
        // fall through to runSubmittedLine as before.
        if (!submittedText.trim() && chatQueueBinding && chatQueueBinding.queueLength() > 0) {
          const { actionGateHandler, confirmDestructiveAction } = buildInteractiveTurnHandlers();
          const manualBinding = ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction);
          const drainedText = manualBinding.drainHeadForManualTurn();
          if (drainedText !== null) {
            // 空 Enter 进来的，草稿本来就是空的/纯空白，清掉再进 output 模式。
            // turn 执行本体走共享的 runIdleTextTurn（与 run 终态唤醒同一份）。
            buffer = "";
            cursorPos = 0;
            await runIdleTextTurn(drainedText);
            return;
          }
        }
        busy = startsChatTurn;
        buffer = "";
        cursorPos = 0;
        // Note: we intentionally keep the `data` listener attached. During the
        // agent turn the user can still type into the composer; submit is
        // gated by `busy` above. This avoids tearing the input chrome down
        // and lets the draft persist across the turn.
        // `submittedText` contains compact paste references; the selected
        // runtime expands or reads the full body at the appropriate boundary.
        fixedInput.enterOutputMode(submittedText);
        // `busy` gates whether Enter starts a turn or queues. It MUST be
        // released no matter how runSubmittedLine settles; leaving it stuck
        // (an unhandled throw used to do exactly that) silently routes every
        // later Enter into the queue with no way to drain. The finally is the
        // last-resort guard; runSubmittedLine also handles turn errors itself.
        let shouldExit = false;
        try {
          const { actionGateHandler, confirmDestructiveAction } = buildInteractiveTurnHandlers();
          shouldExit = await runSubmittedLine(
            submittedText,
            actionGateHandler,
            confirmDestructiveAction,
          );
        } finally {
          busy = false;
        }
        if (shouldExit) {
          fixedInput.disable();
          finish();
          return;
        }
        // Status may have picked up token usage during the turn — repaint chips.
        // Restore the user's draft (which may have been edited while busy).
        // Refresh git branch/dirty counts after a turn: the agent may have
        // checked out a branch, committed, or written files during the run, so
        // the snapshot taken at session start (createInitialTuiState) is stale.
        // Mirrors the init gate (NOLO_CLI_GIT_STATUS === "0" disables).
        // Async so we don't block the event loop (chip updates one tick later).
        refreshGitStatus();
        flushPendingRender();
        fixedInput.exitOutputMode(buffer, cursorPos);
        return;
      }
      buffer = result.buffer;
      cursorPos = result.cursorPos ?? buffer.length;
      fixedInput.repaint(buffer, cursorPos);
    };
    const onData = createRawInputDecoder((token) => {
      void handleInputToken(token);
    });
    composerDecoderDrain = () => onData.destroy();
    try {
      input.on("data", onData);
      // Input shutdown can race an unsettled dialog/gate. Route stream end
      // through the same idempotent teardown so terminal progress is cleared
      // even when the interaction promise never gets a chance to settle.
      input.once("end", finish);
      input.once("close", finish);
      fixedInput.repaint(buffer, cursorPos);
      refreshGitStatus();
      await new Promise<void>((resolve) => {
        resolveDone = resolve;
        if (done) resolve(); // finish() may have run before we started waiting
      });
    } finally {
      finish();
    }
    return;
  }

  const rl = createInterface({ input, output });
  rl.setPrompt(renderPrompt(state));
  rl.prompt();

  try {
    for await (const line of rl) {
      const shouldExit = await runSubmittedLine(
        line,
        (gate) =>
          // /auto on 同款短路，见上方交互路径的 actionGateHandler 注释：
          // 只放行 file_write 的 confirm gate，handoff/input 类仍要求真人操作。
          state.autoConfirm && isAutoConfirmableFileWriteGate(gate)
            ? Promise.resolve(buildGateConfirmedResult(gate))
            : waitForActionGate(rl, input, output, gate, spawnRunner),
        async (request) => {
          // /auto on（会话级权限自动化）：跳过确认弹窗直接放行。state 是
          // runTuiWorkspace 的可变绑定（runSubmittedLine 会把 handleTuiInput
          // 的 nextState 回写），这里在调用时读取，拿到的总是最新值。
          if (state.autoConfirm) return true;
          rl.pause();
          try {
            return await dialogHost.run((anchor) =>
              runConfirmDialog({
                request,
                input: input as any,
                output: output as any,
                ...anchor,
              }),
            );
          } finally {
            rl.resume();
          }
        },
      );
      if (shouldExit) break;
      output.write(`\n${renderStatusLine(state)}\n`);
      rl.setPrompt(renderPrompt(state));
      rl.prompt();
    }
  } finally {
    const registry = getProcessRegistry();
    // Full-truth list() is correct here: only launchProcess registrations ever
    // set persist, and transient foreground envelopes (workspaceShell
    // pre-registration) always have persist=false, so they can't inflate this
    // exit-path count. The stopAll() below is the process-exit fallback and
    // must keep killing everything, transient envelopes included.
    const persistentCount = registry.list().filter((p) => p.persist && p.status === "running").length;
    registry.stopAll();
    if (persistentCount > 0) {
      output.write(`[nolo] ${t("persistentProcessesLeft", String(persistentCount))}\n`);
    }
    // 非交互（readline）路径结束时不走 interactive 的 finish()，这里同样
    // 标记 session 结束，让迟到的异步回调（如更新检查）不再触发渲染写入
    // 已关闭的 stdout/pipe。
    sessionEnded = true;
    rl.close();
  }
}

export async function startTuiWorkspace(options: WorkspaceOptions) {
  const themeOwner = ++latestWorkspaceThemeOwner;
  // TUI 启动时清扫过期的 clip-* 临时文件。fire-and-forget + 吞错——
  // 清理永不阻塞/影响 TUI 运行。
  void sweepStaleClipboardFiles(getDefaultClipboardTempDir()).catch(() => {});
  try {
    return await runTuiWorkspace(options);
  } finally {
    // Renderer theme state is module-global for compatibility, but belongs to
    // exactly one workspace lifecycle. This outer boundary covers interactive
    // finish(), readline/non-interactive exit, and startup/render exceptions.
    if (themeOwner === latestWorkspaceThemeOwner) {
      resetWorkspaceThemeState();
    }
    // 正常退出路径的第二次清扫（本 finally 是全部退出路径的唯一汇聚点）。
    // 同样 fire-and-forget：进程可能在 unlink 完成前退出，残留留给下次启动清扫。
    void sweepStaleClipboardFiles(getDefaultClipboardTempDir()).catch(() => {});
  }
}
