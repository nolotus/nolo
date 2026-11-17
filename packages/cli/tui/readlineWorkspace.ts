import { remoteTaskUnsettled, type RemoteTaskCarrier } from "./runZoneLines";
import { loadDialogHistoryForDisplay } from "./dialogPicker";
import { createRunWakeHandler, deliverChildCompletion } from "./runWakeDelivery";
import { traceChildRunWake } from "./runWakeDiagnostics";
import { createShellApprovalSession } from "./shellApprovalSession";
import { createInterface } from "node:readline";
import { PassThrough } from "node:stream";
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
  permissionGrantList,
  saveProfileAgentSelection,
  type PermissionGrants,
} from "../client/profileConfig";
import {
  createPermissionGrantEnabler,
  createSnapshotGuardedApproval,
  persistPermissionGrantChanges,
} from "./permissionGrantPersist";
import { createTuiAccountSessionRuntime } from "./accountSessionRuntime";
import {
  checkForCliUpdate,
  runSelfUpdateDetailed,
} from "../updateCommands";
import { resolveDefaultSpawn, spawnProcess } from "../processSpawn";
import { runConfirmDialog } from "./confirmDialog";
import { runTaskSlashCommand, type TaskActionView } from "./taskActions";
import { type SelectDialogItem } from "./selectDialog";
import { createDialogHost, resolveDialogBottomRow } from "./dialogHost";
import { createSecretInputCoordinator, runSecretInputDialog } from "./secretInputDialog";
import {
  createInlineHostApprovalPrompt,
  type InlineHostApprovalPrompt,
} from "./hostApprovalCard";
import { registerHostApprovalRenderer } from "../client/hostApprovalFlow";
import {
  clearTerminalAttentionProgress,
  emitTerminalAttention,
  runWithInputRequiredAttention,
} from "./terminalNotification";
import {
  createActivityIndicator,
} from "./activityIndicator";
import { createRunRegistryPoller, createHttpRemoteTaskSource } from "./runRegistryPoller";
import { createIdleHeapReleaser } from "../idleHeapRelease";
import { createRunCompletionWatcher } from "./runCompletionWatcher";
import { RUN_WAKE_CHANNEL_ENV } from "../../agent-runtime/agentRunIsolation";
import {
  createTurnRequest,
  type InternalTurnEvent,
  type TurnRequest,
} from "core/chat/internalTurnEvent";
import { checkStaleRun, listRunRecordsAsync, readRunRecord } from "../agentRunControl";
import { prefetchAgentCatalog } from "./agentCatalog";
import {
  formatComposerAttachmentLine,
  readImagePaths,
  type AttachedImage,
  detectSubmittedImagePaths,
  mergeAttachedImages,
  popLastAttachedImage,
} from "./pasteImage";
import { detectSubmittedMediaPaths } from "./mediaAttachment";
import {
  ClipboardImageError,
  getDefaultClipboardTempDir,
  isRemoteSession,
  readClipboardImage,
  sweepStaleClipboardFiles,
} from "./clipboardImage";
import {
  isTextFallbackEligibleCode,
  resolveClipboardPaste,
  shouldApplyPastedResult,
  type ClipboardPasteOutcome,
  type ClipboardPasteSource,
} from "./pasteFlow";
import { writeClipboard as writeClipboardEnhanced } from "./clipboard";
import { detectGitStatusAsync } from "./gitStatus";
import { fetchCiStatus, summarizeLatest } from "./ciStatus";
import { getProcessRegistry } from "../../agent-runtime/processRegistry";
import {
  applyTuiInputKey,
  completeSlashCommand,
  createInitialTuiState,
  handleTuiInput,
  formatElapsedSeconds,
  isBackspaceSequence,
  renderPrompt,
  renderStatusLine,
  renderWelcome,
  DEFAULT_TUI_AGENT_KEY,
  PASTE_TOKEN_PREFIX,
  type TuiState,
} from "./session";
import { dimCliText, resolveCliColorEnabled } from "../client/terminalStyles";
import { emitTerminalProgramStatus, type TerminalProgramStatusReport } from "../client/terminalProgramStatus";
import { isAgentRunTerminalStatus } from "../../ai/tools/agent/agentRunDisplayHelpers";
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
import { collectConversationTurns } from "./conversationLinks";
import { getCliLocale, initCliLocale, t } from "./i18n";
import { resolveTuiIdentityEnv } from "./learnPrompt";
import { type ChatQueueTuiBinding } from "./chatQueueTuiBinding";
import { appendStreamSafeNotice } from "./turnInjectionInbox";
import {
  createDeployWakeNotifier,
  isDeployWakeDisabled,
  startCiDeployEventStream,
} from "./deployWake";
import { parseUserIdFromAuthToken } from "../cliEnvHelpers";
import { createOriginShellGrant, type OriginShellGrant } from "../client/originShellGrant";
import {
  buildProcessTaskCompletedTurnEvent,
  formatProcessTerminalNoticeLine,
  serializePendingProcessNotice,
} from "./processTerminalNotice";
import type { ProcessTerminalNotice } from "../../agent-runtime/processRegistry";
import { createProcessTerminalAutoResumer } from "../../agent-runtime/processTerminalResume";
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
  takeDisplayWidth,
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
// Ctrl+左键打开正文 http(s) URL：命中判定走 selection 同一套布局行，
// opener 只用 argv 数组 spawn，不拼 shell、不注入 OSC 8。
import { openVisibleUrlAtScreen } from "./tuiLinkHit";
import { openExternalUrl } from "./tuiUrlOpener";
import { createRawKeyReader, runSelectDialog } from "./selectDialog";
import { sanitizeImageLabel } from "./tuiImageLayout";
import { isLikelySlashCommand, stripImageTokens } from "./sessionInput";
import { viewLocalImage } from "./tuiImageActions";
import { getDiagnostics } from "../diagnostics";
// S4 迁移：渲染三件套（renderHistoryToOutput / paintSyncedFrame /
// scheduleRender）与共享节流 flushPendingRender 已迁至 ./tuiRender。
// 依赖方向单向：本文件 → tuiRender；后者禁止回指本文件。
import { createTuiRender } from "./tuiRender";
import { createTerminalGraphicsRuntime } from "./terminalGraphicsRuntime";
import { createImageAttachmentCache } from "./tuiImageAttachments";
import { createTuiImageRenderer } from "./tuiImageRenderer";
import { randomInt, randomUUID } from "node:crypto";
import { createScrollAnimator } from "./tuiScrollAnimation";
import { getTopReservedRows, resolveHistoryViewportHeight, resolveHistoryLayoutGeometry } from "./tuiLayout";
// S5 迁移：runSubmittedLine 的 slash 命令 bus 分发（runSubmittedSlashLine /
// SlashDispatchHost）已迁至 ./tuiSlashRouter。依赖方向单向：
// 本文件 → tuiSlashRouter；后者禁止回指本文件。
import {
  runSubmittedSlashLine,
  type SlashDispatchHost,
} from "./tuiSlashRouter";
import { createTuiLoginSession } from "./tuiLogin";
import { runTuiAuth } from "./tuiAuth";
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
  createWorkspaceInputStream,
  createRawInputDecoder,
  splitRawInput,
  enterAltScreen,
  leaveAltScreen,
  type FixedInputController,
} from "./tuiRawInput";
import { isRendererSuspended } from "./suspendedRenderer";
import { createRendererSink } from "./rendererSink";

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
let restoreWindowTitle: (() => void) | null = null;

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
  restoreWindowTitle?.();
  try {
    if (altScreenRestoreOutput) {
      altScreenRestoreOutput.write("\x1b[?2004l\x1b[?25h\x1b[?2026l\x1b[?1002l\x1b[?1006l\x1b[r");
      leaveAltScreen(altScreenRestoreOutput);
    }
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

// Welcome sweep animation: one static first frame, then this many frames
// replayed after composer setup (~0.6s total). Sweep math lives in
// buildColoredScene (sweepLen reaches full 3 frames before maxFrames, so the
// last frames hold a steady lit wordmark while stars/waves settle).
const WELCOME_ANIM_MAX_FRAME = 8;
const WELCOME_ANIM_INTERVAL_MS = 70;

/**
 * 判断剪贴板图像读取错误是否可回退到系统文本读取。
 *
 * 真值在 pasteFlow.isTextFallbackEligibleCode（唯一的共享剪贴板流程），
 * 这里保留旧导出名以免既有调用点/测试漂移。
 */
export function isClipboardImageFallbackEligible(error: unknown): boolean {
  const code =
    error instanceof ClipboardImageError
      ? error.code
      : typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : undefined;
  return isTextFallbackEligibleCode(code);
}

async function runTuiWorkspace(options: WorkspaceOptions) {
  const startupThemeMode = resolveTuiThemeMode(
    options.env ?? process.env,
    "terminal",
  );
  setActiveThemeMode(startupThemeMode);
  const accountSessionRuntime = createTuiAccountSessionRuntime(options.env ?? process.env);
  try {
  // Locale detection at module load only sees process.env; the workspace env
  // merges the profile config (NOLO_LANG from /lang) on top.
  const runtimeEnv = options.env ?? process.env;
  initCliLocale(runtimeEnv);
  await accountSessionRuntime.initialize();
  let state = createInitialTuiState(runtimeEnv);
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
          // Local sessions have direct access to the user's OS clipboard and
          // must not enqueue a redundant OSC 52 write behind it: that late
          // terminal-side write can overwrite a newer browser copy. Over SSH,
          // OSC 52 remains the only path to the client clipboard; a pipe/non-
          // interactive remote session has no valid client clipboard channel.
          transport: isRemoteSession(runtimeEnv)
            ? isInteractiveInput(input)
              ? "osc52"
              : "unavailable"
            : "system",
        });
  const readClipboardText =
    options.clipboardReader ??
    (async () => {
      const { default: clipboard } = await import("clipboardy");
      return await clipboard.read();
    });
  const readImage = options.clipboardImageReader ?? readClipboardImage;
  const selfUpdater: SelfUpdater =
    options.selfUpdater ?? (async () => {
      // Route update output through the renderer channel, not the raw TTY:
      // the passed-in `output` IS process.stdout, and writing to it directly
      // smears across the composer on the next repaint. The sink buffers to
      // line boundaries and emits via emitCommandOutput (history + repaint).
      // `emitCommandOutput` is declared below but only invoked at call time.
      const sink = createRendererSink((line) => emitCommandOutput(line));
      try {
        return await runSelfUpdateDetailed({
          output: sink,
          env: options.env ?? process.env,
          // Spawn seam for tests: production keeps resolveDefaultSpawn()
          // (Bun.spawn); readlineWorkspace's own spawnRunner is a different
          // shape and deliberately not reused here.
          spawn: options.selfUpdateSpawn ?? resolveDefaultSpawn(),
        });
      } finally {
        // runSelfUpdateDetailed never ends caller-supplied streams, so the
        // sink's final() hook (which flushes any tail line lacking "\n" into
        // emitCommandOutput) would never run without this. We own the sink,
        // so ending it here is safe on every path, including throws.
        sink.end?.();
      }
    });

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

  if (startupThemeMode !== "terminal") {
    const detected = await detectTerminalBackground({
      stdin: input as NodeJS.ReadStream & { setRawMode?: (mode: boolean) => void },
      stdout: output as NodeJS.WritableStream & { isTTY?: boolean },
      allowSystemFallback: true,
    });
    if (detected) applyDetectedBackground(detected);
  }

  // Paint the welcome banner, then animate it AFTER the composer mounts.
  // The old 15-frame loop blocked composer setup for ~1.5s and rewound the
  // cursor by a fixed 8 lines, which wrapped rows corrupted; the current
  // design paints one static first frame (composer mounts right after), then
  // replays the sweep via repaintBanner() — the wrap-safe, BSU/ESU-wrapped
  // path also used for the update hint — so animation never blocks input and
  // can never mis-count wrapped lines. When animation is disabled (non-TTY,
  // tests, NOLO_CLI_NO_WELCOME_ANIM=1) maxFrames=0 keeps the wordmark fully
  // lit on the static frame.
  const welcomeAnimEnabled =
    Boolean((output as { isTTY?: boolean }).isTTY) &&
    process.env.NODE_ENV !== "test" &&
    ((options.env ?? process.env).NOLO_CLI_NO_WELCOME_ANIM ?? "") !== "1";
  const bannerColumns = (output as { columns?: number }).columns;
  const { contentWidth: bannerContentWidth, marginLeft: bannerMarginLeft } =
    typeof bannerColumns === "number"
      ? resolveHistoryLayoutGeometry(bannerColumns)
      : { contentWidth: bannerColumns ?? 80, marginLeft: 0 };
  const bannerLeftPad = bannerMarginLeft > 0 ? " ".repeat(bannerMarginLeft) : "";
  // 首帧字符串复用两次：写出 + 行数计算。避免把渲染逻辑（含主题/终端状态
  // 读取）执行两遍，导致首帧与行数计算不一致。宽度和 TTY 已知时逐行截断到
  // 列宽（与 repaintBanner 同一函数）：长 tip / version 行在窄终端物理换行
  // 会让实际行数超过逻辑行数，后续 repaint 的清行循环对不上，残留碎片。
  const rawWelcome = renderWelcome(
    state,
    0,
    welcomeAnimEnabled ? WELCOME_ANIM_MAX_FRAME : 0,
    bannerContentWidth,
  );
  const initialWelcome =
    typeof bannerColumns === "number"
      ? rawWelcome
          .split("\n")
          .map((line) =>
            padOrTruncateToWidth(
              `${bannerLeftPad}${line}`,
              Math.max(1, bannerColumns),
            ),
          )
          .join("\n")
      : rawWelcome;
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

  // 持久配置里的授权桶：首屏只列已授权的桶（否则用户以为自己仍在逐次确认）。
  // 故意写在 banner 块之后、且不计入 initialBannerLineCount——repaintBanner 只
  // 重画 welcome + pinned notice，把它算进重绘行数却不重画，第一次重绘就会抹掉它。
  const startupGrantKinds = permissionGrantList(state.permissionGrants);
  if (startupGrantKinds.length > 0) {
    output.write(
      `${t(
        "autoPersistedStartup",
        startupGrantKinds
          .map((kind) =>
            kind === "local" ? t("autoKindLocal") : t("autoKindRemote"),
          )
          .join(" + "),
      )}\n\n`,
    );
  }

  let lastSentTitle: string | null = null;
  let terminalStatus: TerminalProgramStatusReport = { state: "idle" };
  let readBackgroundWorking = () => false;
  let lastProtocolReport = "";
  const titleEnv = options.env ?? process.env;
  const titleEnabled = (output as { isTTY?: boolean }).isTTY === true
    && !["0", "false"].includes((titleEnv.NOLO_TUI_TITLE ?? "").trim().toLowerCase());
  let titleRestored = false;
  const restoreTitle = () => {
    if (titleRestored) return;
    titleRestored = true;
    if (titleEnabled) {
      try { output.write("\x1b[23;0t"); } catch { /* output already closed */ }
    }
    if (restoreWindowTitle === restoreTitle) restoreWindowTitle = null;
  };
  if (titleEnabled) {
    output.write("\x1b[22;0t");
    restoreWindowTitle = restoreTitle;
  }
  const syncWindowTitle = () => {
    if (titleRestored) return;
    const backgroundWorking = readBackgroundWorking();
    const protocolReport = (terminalStatus.state === "done" || terminalStatus.state === "idle") && backgroundWorking
      ? { state: "working" as const } : terminalStatus;
    const protocolKey = `${protocolReport.state}:${protocolReport.kind ?? ""}`;
    if (protocolKey !== lastProtocolReport) {
      lastProtocolReport = protocolKey;
      emitTerminalProgramStatus(output, protocolReport);
    }
    if (!titleEnabled) return;
    const phase = terminalStatus.state;
    const suffix = phase === "blocked" ? "·需接管·Nolo"
      : phase === "error" ? "·失败需处理·Nolo"
      : phase === "working" || backgroundWorking ? "·工作中·Nolo" : "·Nolo";
    // Reserve the status suffix before clipping untrusted dialog text.
    const label = stripAnsi(state.dialogLabel?.trim() || "new").replace(/[\x00-\x1f\x7f-\x9f]+/g, " ");
    const currentTitle = takeDisplayWidth(label, 80 - displayWidth(suffix)).prefix + suffix;
    if (currentTitle === lastSentTitle) return;
    lastSentTitle = currentTitle;
    output.write(buildWindowTitle(currentTitle));
  };
  const reportTerminalStatus = (report: TerminalProgramStatusReport) => {
    const wasWaiting = terminalStatus.state === "blocked";
    terminalStatus = report;
    if (report.state === "blocked") emitTerminalAttention({ output, env: titleEnv, reason: "input-required" });
    else if (wasWaiting) clearTerminalAttentionProgress({ output, env: titleEnv });
    syncWindowTitle();
  };
  syncWindowTitle();
  reportTerminalStatus({ state: "idle" });

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
  // Login cancellation is owned separately from the in-flight chat turn.
  const loginSession = createTuiLoginSession();
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
    fallbackLabel: () => t("workingFallback"),
    stoppingLabel: () => t("turnStopping"),
    onRepaint: () => {
      syncWindowTitle();
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
  readBackgroundWorking = () => activityIndicator.getAgentRuns().some((run) =>
    !isAgentRunTerminalStatus(run.status) && run.status !== "not_found")
    || getProcessRegistry().listBackground().some((task) => task.status === "running"
      && !!state.dialogId && task.owner?.dialogId === state.dialogId);
  const unsubscribeBackgroundTitle = getProcessRegistry().onBackgroundChange(syncWindowTitle);
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
  let runWakeHandler: ReturnType<typeof createRunWakeHandler> | null = null;
  // auto-review 续跑状态机已整体移除（2026-11-15 owner 决定）。
  // 原 reconcileAutoReviewWake / onAutoReviewAcceptance 订阅随之删除：
  // 那套「review 完成后自动推进 commit/local-merge」的状态机在任何机器上
  // 都没有产生过运行记录（~/.nolo/auto-review-continuation/ 从未存在），
  // 实际工作方式是 agent 自己派 review、自己判断、自己提交。
  const runCompletionWatcher = createRunCompletionWatcher({
    env: options.env ? { ...process.env, ...options.env } : process.env,
    getCurrentDialogId: () => state.dialogId ?? null,
    onWake: (event) => {
      traceChildRunWake("watcher-delivery", event, state.dialogId ?? null, { handlerInstalled: !!runWakeHandler });
      // 2026-11-15：删除 canConsumeChildCompletion 门（owner 决定）。
      // 「子 run 跑完了」是客观事实，与 auto-review 的 acceptance 无关；
      // 旧门在任务 paused 或 acceptance=unknown 时静默丢弃事件，导致对话
      // 不自动接续。续跑状态机后续也整体下线，现在无额外准入判断。
      return deliverChildCompletion(event, runWakeHandler, () => {});
    },
  });
  // 「部署完成」SSE 订阅的退出开关：只在交互式分支里赋值（见 deployWake.ts），
  // 非交互路径永远是 null，teardown 里调用也是空操作。
  // 用 holder 对象而不是裸 let：赋值点在嵌套闭包里，裸 let 在 teardown 处会被
  // TS 的流程分析窄化成 null（error TS2349），属性访问不受影响。
  const deployWakeLifecycle: { dispose: (() => void) | null } = { dispose: null };
  // ── 进程任务终态通知（pendingProcessNotices）+ 自动续跑 ──
  // 订阅进程 registry 的终态发射：launchProcess / 超时 detach 的 execShell
  // 进入终态（exited/failed/stopped）时，把单行摘要 push 进
  // state.pendingProcessNotices；下一个真实 turn 组装时作为 turn-scope
  // context block 注入 agent（tuiTurnRunner 消费后清空）。补发策略：注册时
  // 点不补发——本会话启动之前已终态的任务（上个会话遗留）不重新打扰；
  // 本会话内每次终态转变（markExited / kill）由 registry 保证至多发射一次。
  // 渲染：状态栏 chip 文案为 "↪ N pending"（极限窄宽压成 "↪N"，语义不消失），
  // 由 sessionRender 决定，到达即 scheduleRender 刷新；非 TTY（readline/管道）
  // 路径没有状态行，直接跳过（与 run 唤醒的 onWake 通道在非交互模式下的
  // 丢弃策略一致）。
  //
  // 通知行写入时带 ownerDialogId（来自 registry 记录，null = 非会话任务）：
  // 注入侧据此区分「同对话 / 另一对话 / 归属未知」，不依赖额外的旁路映射。
  //
  // 有归属的任务（派发时 runtimeContext 里带 dialogId/turnId）额外走自动续跑：
  // 判定在 processTerminalResume.ts（归属匹配 / turn 活跃度 / 链深上限），投递
  // 本体是下方 deliverProcessTerminalNotice——它需要 turn 机器（busy / 收件箱 /
  // runWakeHandler）就绪，所以订阅在这里装（registry 不补发，装得越早越不漏），
  // 投递体在交互区里覆盖式安装。
  const pushPendingProcessNotice = (notice: ProcessTerminalNotice): void => {
    if (sessionEnded) return;
    const ownerDialogId = getProcessRegistry().getByTaskId(notice.taskId)?.owner?.dialogId ?? null;
    const line = serializePendingProcessNotice(notice, ownerDialogId);
    state = {
      ...state,
      pendingProcessNotices: [...(state.pendingProcessNotices ?? []), line],
    };
    // 与 gitStatus 异步回调同样的守卫与节流：会话退出后丢弃陈旧重绘。
    scheduleRender();
  };
  // 投递体尚未安装（工作区启动中）时的兜底：维持既有「只提示」语义。
  let deliverProcessTerminalNotice: (notice: ProcessTerminalNotice) => void =
    pushPendingProcessNotice;
  const unsubscribeProcessTerminal = getProcessRegistry().onProcessTerminal((notice) => {
    deliverProcessTerminalNotice(notice);
  });
  const effectiveEnv = options.env ? { ...process.env, ...options.env } : process.env;
  const idleHeapReleaser = createIdleHeapReleaser({ env: effectiveEnv });
  const remoteTasks = options.remoteTasks ?? createHttpRemoteTaskSource({
    getServerUrl: () => state.serverUrl,
    getAuthToken: () => resolvePlatformAuthToken(effectiveEnv),
    fetchImpl,
  });
  const runRegistryPoller = createRunRegistryPoller({
    getDockedRuns: () => activityIndicator.getAgentRuns(),
    update: (snapshot) => activityIndicator.updateAgentRun(snapshot),
    // 显式传 env：resolveNoloHome 只认传入 env 的 NOLO_HOME，不传则永远读
    // ~/.nolo——设了 NOLO_HOME 的环境（dev、测试）会读错目录。run 记录读取
    // 与 reconcile 的调用点也是同样写法。
    readRecord: (runId) => readRunRecord(runId, { env: effectiveEnv }),
    discoverRuns: () => listRunRecordsAsync({ env: effectiveEnv }),
    getCurrentDialogId: () => state.dialogId ?? null,
    reconcile: (runId) => checkStaleRun(runId, { env: effectiveEnv }),
    onRecordsPolled: (records) => runCompletionWatcher.observe(records),
    remoteTasks,
  });
  const history = createTurnHistory();
  if (runtimeEnv.NOLO_TUI_RESTART === "1") {
    delete runtimeEnv.NOLO_TUI_RESTART;
    delete process.env.NOLO_TUI_RESTART;
    if (state.dialogId && !state.dialogKey) {
      output.write("[nolo] 已保留对话 ID，但缺少可验证的属主/key，无法加载历史；请登录后通过 /history 选择对话。\n");
    }
    if (state.dialogId && state.dialogKey) {
      try {
        const turns = await (options.dialogHistoryLoader ?? loadDialogHistoryForDisplay)({
          dialog: { id: state.dialogId, dbKey: state.dialogKey, title: state.dialogLabel,
            status: null, updatedAt: null, createdAt: null, spaceId: null, triggerType: null,
            parentDialogId: null, primaryAgentKey: state.agentKey, cybots: [] },
          env: runtimeEnv,
          fetchImpl,
        });
        history.turns.push(...turns);
      } catch (error) {
        output.write(`[nolo] 已恢复对话身份，但历史显示加载失败：${String(error)}\n`);
      }
    }
  }
  const imageCache = createImageAttachmentCache();
  // FIFO per payload preserves distinct filenames even for byte-identical images.
  const preparedImages: AttachedImage[] = [];
  let imageGraphicsSupported = false;
  let imagePreviewRequested = false;
  let imageRenderer: ReturnType<typeof createTuiImageRenderer> | undefined;
  const renderNamespace = randomInt(1, 0x10000);
  // 对话框把滚轮/翻页路由回转录区时的统一入口。平滑滚动推进器依赖渲染集群
  // （paintImmediate），要到 createTuiRender 之后才能创建，所以这里先用可变
  // 绑定：创建后替换为推进器版本；替换前的调用（理论上不会发生）回落瞬时滚动。
  let handleTranscriptScroll = (action: ScrollAction): void => {
    applyScrollAction(
      history,
      action,
      output,
      fixedInput.getInputLines(),
      dialogHost.getReservedRows(),
    );
  };
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
      setMouseEnabled: (enabled) => fixedInput.setMouseEnabled(enabled),
    },
    inputPolicy: { wheel: "modal", pageKeys: "transcript" },
    renderUnderlay: () => {
      // While a handoff subprocess owns the terminal (withSuspendedRenderer),
      // a resize lands here via dialogHost.repaint — painting the underlay
      // would inject TUI bytes into the child's screen. Drop it; the resume
      // path repaints in full.
      if (isRendererSuspended(output)) return;
      fixedInput.repaint(buffer, cursorPos);
      if (history.turns.length === 0 && history.currentRole === null) {
        repaintBanner(0, 0, true);
      } else {
        renderHistoryUnderDialog();
      }
    },
    onTranscriptScroll: (action) => {
      handleTranscriptScroll(action as ScrollAction);
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
  const {
    renderHistoryToOutput,
    renderHistoryUnderDialog,
    scheduleRender,
    flushPendingRender,
    paintImmediate,
  } = createTuiRender({
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
      getReservedRows: () => dialogHost.getReservedRows(),
      get imageRenderer() { return imageRenderer; },
    });

  // 模态弹窗占屏期间的同步重绘：BSU/ESU 包裹 underlay（转录区 + 输入栏）与弹窗前景。
  // 弹窗开启时 fixedInput.isPaused() 为 true，paintImmediate 会被拦截，因此
  // 滚轮推进器与键盘翻页在弹窗活跃时必须走 dialogHost.repaint() 才能刷新内容区。
  const paintSyncedModal = () => {
    if (isRendererSuspended(output)) return;
    output.write("\x1b[?2026h\x1b[?25l");
    try {
      dialogHost.repaint();
    } finally {
      output.write("\x1b[?25h\x1b[?2026l");
    }
  };

  // 平滑滚动推进器：滚轮报告只折算成目标位置，16ms/帧逼近（不再单帧瞬移）。
  // 默认按积压比例追赶（单条报告仍 5 行一帧；密集 burst 的单帧步长放大到
  // ≤20 行，缩短停手后的拖尾）；用户显式给 NOLO_TUI_SCROLL_MAX_STEP 时回到
  // 固定限速语义。paintImmediate 内部自带「非弹窗暂停」（如子进程）拦截与 BSU/ESU 包裹；
  // 弹窗激活（dialogHost.isKeyboardClaimed()）时走 paintSyncedModal 重绘内容区与弹窗。
  const scrollAnimator = createScrollAnimator({
    history,
    output,
    getInputLines: () => fixedInput.getInputLines(),
    getReservedRows: () => dialogHost.getReservedRows(),
    onPaint: () => {
      if (dialogHost.isKeyboardClaimed()) {
        paintSyncedModal();
        return;
      }
      paintImmediate();
    },
    env: effectiveEnv,
  });
  handleTranscriptScroll = (action) => {
    if (action === "wheel-up" || action === "wheel-down") {
      scrollAnimator.wheel(action === "wheel-up" ? "up" : "down");
      return;
    }
    // 键盘翻页/首尾仍是瞬跳：先停推进器，避免两套写入打架。
    scrollAnimator.cancel();
    applyScrollAction(
      history,
      action,
      output,
      fixedInput.getInputLines(),
      dialogHost.getReservedRows(),
    );
    if (dialogHost.isKeyboardClaimed()) {
      paintSyncedModal();
    } else {
      paintImmediate();
    }
  };

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

  // 部署状态：启动时异步取一次（只在交互式分支调用）。
  // 与 gitStatus 不同，它不随 cwd 变化，所以不需要在 /cd 后重取。
  // 失败静默：fetchCiStatus 已经保证不抛，这里再守一次 sessionEnded，
  // 避免会话结束后仍用陈旧结果重绘。
  const refreshCiStatus = (): void => {
    if ((options.env?.NOLO_CLI_CI_STATUS ?? process.env.NOLO_CLI_CI_STATUS) === "0") return;
    void fetchCiStatus().then((jobs) => {
      if (sessionEnded) return;
      const ciStatusLine = summarizeLatest(jobs);
      if (!ciStatusLine) return;
      state = { ...state, ciStatusLine };
      scheduleRender();
    });
  };

  // 版本发布快（AI 辅助开发每次合入即发版）：启动时异步查一次 npm registry
  // 当前通道的最新版。检查永远不阻塞启动、失败静默（离线/超时/registry 抖动
  // 都当无更新），NOLO_CLI_NO_UPDATE_CHECK=1 可整体禁用。结果到达时若用户还
  // 停在欢迎页（未开始对话），从顶部重绘 banner 把 /update 提示带出来；已
  // 在对话中则只更新 state，不打断当前画面。
  let repaintingBanner = false;
  const repaintBanner = (frame = 0, maxFrames = 0, underDialog = false) => {
    if (repaintingBanner) return;
    if (!(output as { isTTY?: boolean }).isTTY) return;
    // modal / dialog 拥有屏幕（如 /help、confirm）时不重绘，否则会擦掉弹层。
    if (!underDialog && fixedInput.isPaused()) return;
    if (!underDialog && dialogHost.isKeyboardClaimed()) return; // picker / confirm 弹层持有键盘时不重绘
    repaintingBanner = true;
    try {
      // 终端可能已 resize：重绘时实时读宽度，让 renderWelcome 重新决定是否
      // 保留 scene，避免旧宽度下画的 banner 在新宽度 wrap 出残留。
      // Establish the new top reservation before positioning a resized welcome page.
      if (fixedInput.active && getTopReservedRows(output) > 0) fixedInput.repaint(buffer, cursorPos);
      const currentColumns = (output as { columns?: number }).columns ?? 80;
      const currentRows = (output as { rows?: number }).rows ?? 24;
      const { contentWidth: bannerContentWidth, marginLeft: bannerMarginLeft } =
        resolveHistoryLayoutGeometry(currentColumns);
      const welcome = renderWelcome(state, frame, maxFrames, bannerContentWidth);
      // welcome 以换行结尾，pinned agent notice 当初紧随其后再写一段；重绘时
      // 必须一并重写，否则清行（clearLines 含 notice 行数）会把它从屏幕上抹掉。
      const lines = (welcome + (pinnedAgentNotice ?? "")).split("\n");
      // 窄终端下 update hint / welcome hint 这类长行会物理换行，破坏"逻辑行数 =
      // 物理行数"的逐行定位；写入前按列宽截断，保证每行正好占一行。
      const bannerLeftPad = bannerMarginLeft > 0 ? " ".repeat(bannerMarginLeft) : "";
      const safeLines = lines.map((line) =>
        padOrTruncateToWidth(
          `${bannerLeftPad}${line}`,
          Math.max(1, currentColumns),
        ),
      );
      const topRows = getTopReservedRows(output);
      const historyBottom = Math.max(topRows, currentRows - fixedInput.getInputLines() - dialogHost.getReservedRows());
      const clearLines = Math.min(Math.max(initialBannerLineCount, safeLines.length), historyBottom - topRows);
      // 与 paintSyncedFrame 一致的 BSU/ESU + 光标隐藏包裹，避免清行与写入
      // 之间的中间帧闪烁；composer 重绘也在同一帧内完成。
      output.write("\x1b[?2026h\x1b[?25l");
      try {
        let frame = "";
        // 先清掉旧 banner 区域（含窄终端无 scene 的短 banner），再逐行定位写入
        // 新 banner。注意不能只 \x1b[H 一次后拼接多行文本：清行循环会把光标停在
        // 最后清的那行，welcome 会从那里开始画（banner 掉到屏幕中部）。
        for (let i = 0; i < clearLines; i++) frame += `\x1b[${i + 1 + topRows};1H\x1b[2K`;
        safeLines.slice(0, clearLines).forEach((line, i) => {
          frame += `\x1b[${i + 1 + topRows};1H${line}`;
        });
        output.write(frame);
        // 顶部 banner 区域重绘不影响底部 composer，但活动输入行的绘制状态需要
        // 恢复，否则光标/缓冲行与终端实际内容脱节。
        if (fixedInput.active) {
          fixedInput.repaint(buffer, cursorPos);
          // resize 会把 composer 整体顶高（终端行数变多，或草稿在新列宽下占更多
          // 行），它旧占的行就落到 banner 与 composer 之间：banner 只清自己那几行、
          // composer 的 ED 只从新 startRow 往屏幕底部清，中间这段没人认领 → 旧
          // composer 的 ─── 规则行整条留在屏幕中部（欢迎页 resize 残影的根因）。
          // composer 刚重绘完，startRow 已按新几何更新，此时把 banner 下方到
          // composer 上方的残段补清（逐行 EL 2K）；DECSC/DECRC 包住清行，保证
          // 硬件光标仍旧留在 composer（与 tuiImageRenderer 同一手法）。
          const composerStartRow = Math.max(
            1,
            currentRows - fixedInput.getInputLines() + 1,
          );
          if (composerStartRow > clearLines + 1) {
            let stale = "\x1b7";
            for (let i = topRows + clearLines; i < composerStartRow - 1 - dialogHost.getReservedRows(); i += 1) {
              stale += `\x1b[${i + 1};1H\x1b[2K`;
            }
            output.write(`${stale}\x1b8`);
          }
        }
      } finally {
        output.write("\x1b[?25h\x1b[?2026l");
      }
    } finally { repaintingBanner = false; }
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

  // 欢迎屏 sweep 动画：首帧已静态画出（sweep 未点亮），此处 composer 挂载
  // 完毕后用 repaintBanner 的换行安全路径（padOrTruncateToWidth + BSU/ESU +
  // composer 重绘）异步点亮，绝不阻塞输入。第一轮 turn 开始或播完即停；
  // unref 保证计时器不拖住进程退出。
  if (welcomeAnimEnabled) {
    let animFrame = 0;
    const animTimer = setInterval(() => {
      animFrame += 1;
      if (
        sessionEnded ||
        history.turns.length > 0 ||
        history.currentRole !== null ||
        animFrame >= WELCOME_ANIM_MAX_FRAME
      ) {
        clearInterval(animTimer);
        return;
      }
      repaintBanner(animFrame, WELCOME_ANIM_MAX_FRAME);
    }, WELCOME_ANIM_INTERVAL_MS);
    animTimer.unref?.();
  }

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
  const secretInputCoordinator = createSecretInputCoordinator();
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
    // liveTurnCredits 随权威值结算一并清零：本轮的量已并入 sessionCredits
    // （runResult.turnCredits 是「全轮逐次求和」的权威口径，与 llm-end 逐帧
    // 折算同源），再保留 live 值就是双计。credits 为 undefined（非平台计费）
    // 时同样清——本轮既然没有平台计费帧，live 值也不可能是真实消费。
    // liveTurnEstimatedTokens 同样随本轮结束清零，由权威 turnTokens 接管。
    state = {
      ...state,
      liveTurnCredits: undefined,
      liveTurnEstimatedTokens: undefined,
    };
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

  // 对话内浏览器审批卡（见 ./hostApprovalCard）：连接器动作需要用户批准时，由本宿主在对话流里
  // 渲染一张卡并按 y/n 决定，决定经 submit_approval_decision 直接发给连接器，不经过模型。
  // 未创建（非交互/旧宿主）时工具执行器拿不到 approver，行为与改动前逐字一致。
  let hostApprovalPrompt: InlineHostApprovalPrompt | null = null;
  let unregisterHostApprovalRenderer: (() => void) | null = null;

  // 草稿世代（async 粘贴守卫）：每次草稿被提交/清空时自增。剪贴板读取是异步的，
  // 读回来时若世代已变（用户已提交、已清空、已退出会话），迟到结果必须丢弃而不
  // 是写进一个新草稿。
  let draftEpoch = 0;
  /**
   * 作废在途的异步粘贴。草稿被提交/清空、或换了对话时调用：迟到的剪贴板结果
   * 世代不匹配就被丢弃，不会写进下一个草稿。
   */
  const bumpDraftEpoch = () => {
    draftEpoch += 1;
  };

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

  // 两桶各一个「批准并记住」回调（实现见 permissionGrantPersist）：状态更新 +
  // 写盘 + 失败提示只有一份代码，四处确认弹窗只是绑定到不同的桶。
  const grantEnablerDeps = {
    getGrants: () => state.permissionGrants,
    setGrants: (next: PermissionGrants) => {
      state = { ...state, permissionGrants: next };
    },
    scheduleRender,
    onPersistFailed: () => emitCommandOutput(t("autoPersistFailed")),
  };
  const approveLocalConfirms = createPermissionGrantEnabler("local", grantEnablerDeps);
  const approveRemoteShell = createPermissionGrantEnabler("remote", grantEnablerDeps);

  /**
   * 唯一的「剪贴板内容 → 界面」应用器。`/paste`、Ctrl+V、空 bracketed-paste
   * 三条入口都走这里，读取流程在 pasteFlow.resolveClipboardPaste 里共享。
   *
   * - image：并入待发附件（下一轮随消息发出）
   * - text：以 PASTE token 插进草稿（保留原文空白与换行；超长自动折叠成 chip）
   * - empty：打印图像读取的原始提示（含可执行下一步）
   * - error：保留真实错误（远程会话 / 过大 / 读失败 / 文本读失败），绝不静默
   */
  const applyClipboardPasteResult = (
    outcome: ClipboardPasteOutcome,
    source: ClipboardPasteSource,
  ): void => {
    const colorEnabled = resolveCliColorEnabled();
    if (outcome.kind === "image") {
      state = {
        ...state,
        attachedImages: mergeAttachedImages(state.attachedImages, [outcome.image]),
      };
      // The draft attachment row is the single source of visible attachment state.
      if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
      return;
    }
    if (outcome.kind === "text") {
      const pasteResult = applyTuiInputKey(
        buffer,
        `${PASTE_TOKEN_PREFIX}${outcome.text}`,
        {},
        cursorPos,
        { pasteStore, cwd: state.cwd },
      );
      buffer = pasteResult.buffer;
      cursorPos = pasteResult.cursorPos ?? buffer.length;
      if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
      // 显式 /paste 给出回执；Ctrl+V 与终端空括号兼容路径保持安静（用户看得见
      // 草稿里出现的内容，不需要额外一行 chrome）。
      if (source === "slash") {
        emitCommandOutput(t("pasteTextInserted", String(outcome.text.length)));
      }
      return;
    }
    emitCommandOutput(
      themeText(`[nolo] ${outcome.message}`, "warning", colorEnabled),
    );
    if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
  };

  /**
   * 读剪贴板并把结果应用到界面（共用流程 + async 世代守卫）。
   * 返回 true 表示结果被应用，false 表示因草稿世代变化/会话结束被丢弃。
   */
  const readAndApplyClipboard = async (
    source: ClipboardPasteSource,
  ): Promise<boolean> => {
    const snapshot = { epoch: draftEpoch, sessionEnded };
    const outcome = await resolveClipboardPaste({
      readImage: () => readImage({ env: options.env ?? process.env }),
      readText: () => readClipboardText(),
    });
    if (
      !shouldApplyPastedResult(snapshot, { epoch: draftEpoch, sessionEnded })
    ) {
      // 迟到的粘贴：期间用户已提交草稿 / 开了新对话。会话已结束时连提示都不写
      // （output 可能已关闭，且退出后没人看）。
      if (!sessionEnded) {
        emitCommandOutput(t("pasteStaleDropped"));
      }
      return false;
    }
    applyClipboardPasteResult(outcome, source);
    return true;
  };

  // The TUI chat queue binding drives drain via runOneAgentTurn. It is created
  // on demand so the drain callback can capture history/state/fixedInput/runAgentChat.
  let chatQueueBinding: ChatQueueTuiBinding | null = null;

  // 当前进行中 turn 的注入收件箱（runOneAgentTurn 创建/清理）。busy 时后台 run
  // 终态唤醒直投这里注入正在跑的 loop，不再走 chat 队列。见 turnInjectionInbox.ts。
  let turnInjectionInbox: AgentTurnContext["turnInjectionInbox"] = null;

  // ── S2：turnCtx 装配（通过 getter/setter 严格保持可变引用语义） ──────────
  // 分享 OAuth agent 的 shell 会话授权（块 D）：会话级单例。确认走既有
  // runConfirmDialog + dialogHost 通道；撤销经 shellGrant.revoke() 立即生效
  // （isGranted 同步翻转）。非 owner-required 场景 adapter 不触发该路径。
  const childShellApprovals = createShellApprovalSession(async (request, signal) =>
    runWithInputRequiredAttention({ output, env: effectiveEnv,
      onWaiting: () => reportTerminalStatus({ state: "blocked", kind: "permission" }),
      onResumed: () => reportTerminalStatus({ state: activeTurnAbort ? "working" : "idle" }),
    }, () => {
      if (signal.aborted) return Promise.resolve(false);
      return dialogHost.run((anchor) => runConfirmDialog({
        request: { id: `child-shell-${crypto.randomUUID()}`, tool: "execShell", action: "shell-per-call",
          title: t("shellPerCall.title"),
          body: t(
            "shellPerCall.body",
            request.runId,
            request.agentKey,
            request.ownerUserId,
            request.deviceId,
            request.workspaceRoot,
            request.permissionNotice,
          ),
          command: request.command },
        signal, fullCommand: true, input: input as any, output: output as any,
        onApprove: createSnapshotGuardedApproval("remote", () => state.permissionGrants, approveRemoteShell), ...anchor,
      }), { signal, cancelled: () => false });
    }), () => state.permissionGrants?.remote === true);
  const sessionShellGrant = createOriginShellGrant({
    confirm: async (request) => {
      // auto 已开：这条 shell 直接放行，不弹窗。granted 状态位由
      // shellGrantForTurns.isGranted() 的短路保证不被写入——auto 关掉之后必须
      // 重新逐次询问，不能因为曾经 auto 过就永久授权。这里的守卫兜住直接调用
      // requestGrant 的路径（正常路径下 adapter 连 requestGrant 都不会走到）。
      if (state.permissionGrants?.remote === true) return true;
      return await runWithInputRequiredAttention({ output, env: effectiveEnv,
      onWaiting: () => reportTerminalStatus({ state: "blocked", kind: "permission" }),
      onResumed: () => reportTerminalStatus({ state: activeTurnAbort ? "working" : "idle" }),
    }, () =>
        dialogHost.run((anchor) =>
          runConfirmDialog({
            request: {
              id: `shell-grant-${request.agentKey}`,
              tool: request.toolName,
              action: "shell-session-grant",
              title: t(
                "shellGrant.confirmTitle",
                request.agentName,
                request.ownerUserId,
              ),
              body: t(
                "shellGrant.confirmBody",
                request.agentName,
                request.ownerUserId,
                request.deviceName ?? request.deviceId,
                request.deviceId,
                request.workspaceRoot,
              ),
              ...(request.command ? { command: request.command } : {}),
            },
            input: input as any,
            output: output as any,
            onApprove: createSnapshotGuardedApproval("remote", () => state.permissionGrants, approveRemoteShell),
            ...anchor,
          }),
        ),
      );
    },
  });
  // auto 已开时对 shell 视为已授权，但**不**写 granted：`requestGrant` 一旦返回
  // true 就把 granted 永久置真，之后 /auto off 仍会静默放行。这里用 isGranted()
  // 短路让 adapter 直接跳过 requestGrant（弹窗与状态位都不触碰），auto 关掉后
  // isGranted() 落回真实状态 → 恢复逐次询问。
  const shellGrantForTurns: OriginShellGrant = {
    isGranted: () => state.permissionGrants?.remote === true || sessionShellGrant.isGranted(),
    requestGrant: (request) => sessionShellGrant.requestGrant(request),
    revoke: () => sessionShellGrant.revoke(),
  };
  let turnIdentity = 0;
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
    set chatQueueBinding(v) {
      // auto-review turn-end 绑定已随续跑状态机移除：队列绑定回归朴素赋值。
      chatQueueBinding = v;
    },
    get turnInjectionInbox() { return turnInjectionInbox; },
    set turnInjectionInbox(v) { turnInjectionInbox = v; },
    onUserImagesPrepared: (images) => {
      preparedImages.push(...images);
      if (preparedImages.length > 64) preparedImages.splice(0, preparedImages.length - 64);
    },
    onUserTurnFinalized: (turn, imageUrls) => {
      const attachments = imageUrls.map((dataUrl, index) => {
        const prepared = preparedImages.findIndex(image => image.dataUrl === dataUrl);
        const image = prepared >= 0 ? preparedImages.splice(prepared, 1)[0]! : {
          dataUrl, mime: dataUrl.slice(5, dataUrl.indexOf(";")), filename: "名称未保留", sizeBytes: 0, sourcePath: "",
        };
        return { ...image, filename: `${index + 1} · ${image.filename}` };
      });
      const preview = imageCache.preview(`turn-${turnIdentity++}`, attachments);
      turn.images = preview.images;
      for (const fallback of preview.textFallbacks) turn.content += `\n[附件] ${fallback}`;
    },

    get sessionEnded() { return sessionEnded; },
    // 分享 OAuth agent 的 shell 会话授权（块 D）：会话级单例透传给 turn
    // 执行路径；撤销经 /shell-revoke 或设置面板调 sessionShellGrant.revoke()。
    shellGrant: shellGrantForTurns,
    shellApprovalSession: childShellApprovals.session,
    // 运行位置展示（块 D）：owner-required 场景 adapter 回调一次；渲染一行
    // 「工具在 <deviceName>(<deviceId>) · workspace <root> · status: <s>」。
    // unknown 不猜——直接打印 unknown，不静默标 ready。
    onToolExecutionLocation: (location) => {
      if (location.status === "unknown") {
        output.write(`${t("toolLocation.unknown")}\n`);
        return;
      }
      output.write(
        `${t(
          "toolLocation.line",
          location.deviceName,
          location.deviceId,
          location.workspace.root,
          location.status,
        )}\n`,
      );
    },
    get buffer() { return buffer; },
    get cursorPos() { return cursorPos; },

    get fixedInput() { return fixedInput; },

    options,
    effectiveEnv,
    history,
    activityIndicator,
    activityReporter,
    runRegistryPoller,
    idleHeapReleaser,
    runCompletionWatcher,
    pasteStore,
    dialogHost,
    input,
    output,

    syncWindowTitle,
    reportTerminalStatus,
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
  const confirmTaskStop = async (view: TaskActionView): Promise<boolean> => {
    if (!isInteractiveInput(input)) return false;
    return runWithInputRequiredAttention({ output, env: effectiveEnv,
      onWaiting: () => reportTerminalStatus({ state: "blocked", kind: "permission" }),
      onResumed: () => reportTerminalStatus({ state: activeTurnAbort ? "working" : "idle" }),
    }, () =>
      dialogHost.run(anchor => runConfirmDialog({
        request: { id: `task-stop-${view.id}`, tool: "taskStop", action: "task-stop", title: "Stop task?", body: view.title, command: view.id },
        fullCommand: true, input: input as any, output: output as any, ...anchor,
      })),
    );
  };
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
    revokeRemoteShellGrants: () => { sessionShellGrant.revoke(); childShellApprovals.revoke(); },
    history,
    pasteStore,
    dialogHost,
    input,
    output,
    options,
    taskEnv: effectiveEnv,
    confirmTaskStop,
    runLogin: (args, emit) => loginSession.run(args, emit, { fetchImpl }),
    fetchImpl,
    turnCtx,
    emitCommandOutput,
    renderHistoryToOutput,
    scheduleRender,
    seedDialogCreditsBase,
    persistExplicitAgentSwitch,
    persistAgentSelection,
    writeClipboard,
    readAndApplyClipboard,
    bumpDraftEpoch,
    selfUpdater,
    spawnRunner,
    installAltScreenRestoreHandlers,
  };

  const manageDraftImages = async (confirmSend: boolean): Promise<boolean> => {
    while (state.attachedImages.length > 0) {
      const images = state.attachedImages;
      const selected = await dialogHost.run(anchor => {
        const rawKey = createRawKeyReader(input as NodeJS.ReadStream);
        // A burst of Enter is one confirmation, not an unknown compound key.
        const readKey = Object.assign(async () => {
          const key = await rawKey();
          return typeof key === "string" && /^[\r\n]+$/.test(key) ? "\r" : key;
        }, { dispose: () => rawKey.dispose?.() });
        return runSelectDialog({
          ...anchor, input: input as NodeJS.ReadStream, output, readKey,
          title: confirmSend ? "确认图片附件（尚未发送）" : "图片附件（尚未发送）",
          titleLines: [confirmSend ? "确认图片附件（尚未发送）" : "图片附件（尚未发送）", ...images.map((image, index) =>
            `${index + 1} · ${sanitizeImageLabel(image.filename)} (${image.sizeBytes} B)`)],
          footerLines: ["移除仅取消附件，不删除本机文件。Esc 返回编辑。"],
          items: [
            { label: confirmSend ? `发送 ${images.length} 张图片` : "返回编辑", action: "done", index: -1 },
            ...images.flatMap((image, index) => [
              { label: `查看 ${index + 1} · ${sanitizeImageLabel(image.filename)}`, action: "view", index },
              { label: `移除 ${index + 1} · ${sanitizeImageLabel(image.filename)}`, action: "remove", index },
            ]),
          ],
        });
      });
      if (selected.kind !== "selected") return false;
      if (selected.item.action === "done") return true;
      const image = images[selected.item.index];
      if (!image) continue;
      if (selected.item.action === "remove") {
        state = { ...state, attachedImages: images.filter((_, index) => index !== selected.item.index) };
        fixedInput.repaint(buffer, cursorPos);
      } else {
        const result = await viewLocalImage(image.sourcePath, effectiveEnv);
        emitCommandOutput(`[nolo] ${result}`);
      }
    }
    return !confirmSend;
  };

  const runSubmittedLine = async (
    line: string,
    actionGateHandler: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>,
    confirmDestructiveAction?: (
      request: PermissionRequest,
    ) => Promise<boolean | { approved: boolean; hostResult?: AgentRuntimeToolResult }>,
    directUserSubmission = false,
  ): Promise<boolean> => {
    if (line.trim() === "/tools") {
      emitCommandOutput(history.toolDetails?.join("") || t("noToolDetails"));
      return false;
    }
    if (line.trim().split(/\s+/)[0]?.toLowerCase() === "/restart") {
      if (line.trim() !== "/restart") {
        emitCommandOutput("Usage: /restart"); return false;
      }
      // Restore persisted pending input without draining/replaying it. An idle
      // composer alone does not prove that the durable queue is empty.
      if (state.dialogId) {
        try {
          await ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction).restorePending();
        } catch (error) {
          emitCommandOutput(`[nolo] 无法确认待处理消息，不能重启：${String(error)}`);
          return false;
        }
      }
      if ((chatQueueBinding && chatQueueBinding.getRecovery().status !== "ready") || chatQueueBinding?.getStatus().queueLength || chatQueueBinding?.getStatus().isRunning || chatQueueBinding?.getStatus().drainPaused ||
          activityIndicator.getAgentRuns().some(run => run.status === "running" || remoteTaskUnsettled(run as typeof run & RemoteTaskCarrier))) {
        emitCommandOutput("[nolo] 有排队消息或后台任务，不能重启；请先处理。");
        return false;
      }
      try {
        const remote = await remoteTasks.read(activityIndicator.getAgentRuns().map(run => run.runId), { strict: true });
        if (remote.some(run => remoteTaskUnsettled(run))) {
          emitCommandOutput("[nolo] 远端任务仍在运行或停止未确认，不能重启。");
          return false;
        }
      } catch (error) {
        emitCommandOutput(`[nolo] 无法确认远端任务状态，不能重启：${String(error)}`);
        return false;
      }
    }
    if (line.trim() === "/images preview") {
      if (!imageGraphicsSupported) {
        emitCommandOutput("[nolo] 当前终端未确认支持图片预览，保留图片名称文字。可用 /images 查看待发送附件。");
        return false;
      }
      imagePreviewRequested = !imagePreviewRequested;
      history.graphicsEnabled = imagePreviewRequested;
      if (!imagePreviewRequested) imageRenderer?.suspend();
      emitCommandOutput(`[nolo] 图片预览${imagePreviewRequested ? "已开启" : "已关闭"}。`);
      renderHistoryToOutput();
      return false;
    }
    if (line.trim() === "/images") {
      if (state.attachedImages.length === 0) emitCommandOutput("[nolo] 无待发送图片。/images preview 按需切换消息图片预览（需终端能力确认）。");
      await manageDraftImages(false);
      return false;
    }
    if (line.trim().split(/\s+/)[0]?.toLowerCase() === "/pending") {
      const [, action, batchId, ...extra] = line.trim().split(/\s+/);
      try {
        if (extra.length || (action && action !== "continue-without-resend")) throw new Error("Usage: /pending [continue-without-resend <batchId>]");
        const binding = ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction);
        emitCommandOutput(await binding.handlePendingCommand(action ? "continue-without-resend" : "show", batchId));
      } catch (error) { emitCommandOutput(`[nolo] ${error instanceof Error ? error.message : String(error)}`); }
      return false;
    }
    // /shell-revoke（块 D）：空闲路径直撤——即时翻转 granted 位，不走
    // handleTuiInput（纯函数拿不到 grant）；下一次 shell 调用重新弹确认。
    // 与 busy 分支同一份 grant 单例。
    if (line.trim().split(/\s+/)[0]?.toLowerCase() === "/shell-revoke") {
      const wasGranted = sessionShellGrant.isGranted();
      sessionShellGrant.revoke();
      childShellApprovals.revoke();
      // /shell-revoke 同时清掉持久 remote 桶，否则重启又带着授权回来。
      if (state.permissionGrants?.remote === true) {
        const nextGrants = { ...state.permissionGrants };
        delete nextGrants.remote;
        state = { ...state, permissionGrants: nextGrants };
        if (!persistPermissionGrantChanges({ remote: true }, nextGrants)) {
          emitCommandOutput(t("autoPersistFailed"));
        }
      }
      emitCommandOutput(
        wasGranted ? t("shellGrant.revoked") : t("shellGrant.revokeNone"),
        "/shell-revoke",
      );
      return false;
    }
    const exit = await runSubmittedSlashLine(line, slashHost, actionGateHandler, confirmDestructiveAction, directUserSubmission);
    // Rebind whenever a submitted *command* actually changed the dialog identity
    // (/compact forks a new dialog; /resume, /new, /clear and the dialog picker
    // switch it). Queued user messages are persisted under the binding's dialog
    // while the turn executes — and writes its provider receipt — under the
    // current one, so a stale binding would save follow-ups into the dialog the
    // session just left. Compare identities rather than command names: any
    // future identity switch is covered without extending a command list.
    // Plain chat lines are excluded on purpose: a turn that reports a different
    // dialog id than the reserved one is healed lazily by ensureChatQueueBinding
    // on the next queue interaction, so the turn's own tail stays free of the
    // extra binding/store work (and its output).
    if (chatQueueBinding && line.trim().startsWith("/") && turnCtx.chatQueueBindingDialogId !== state.dialogId) {
      await ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction).restorePending();
    }
    runCompletionWatcher.resumePendingDelivery();
    return exit;
  };

  if (isInteractiveInput(input)) {
    input.setRawMode(true);
    output.write("\x1b[?2004h");
    let busy = false;
    let done = false;
    let unknownReminderShown = false;
    // A provider-outcome unknown batch is retained and never auto-resent, but
    // it must NOT block normal chat. Surface it once in plain language; /pending
    // stays available for diagnostics without being required.
    const maybeShowUnknownReminder = (binding: ChatQueueTuiBinding) => {
      if (unknownReminderShown) return;
      const recovery = binding.getRecovery();
      if (recovery.status !== "unknown") return;
      unknownReminderShown = true;
      emitCommandOutput("[nolo] 有一条较早的回复批次结果未知，已保留但不会自动重发；你可以继续正常聊天，或运行 /pending 查看详情。");
    };
    let resolveDone: (() => void) | null = null;
    let graphicsRuntime: ReturnType<typeof createTerminalGraphicsRuntime> | undefined;
    let onGraphicsData: ((chunk: Buffer | string) => void) | undefined;
    // NOTE: do NOT redeclare `buffer` here. The composer draft lives in the
    // outer scope (hoisted above) on purpose: runSubmittedLine's streaming
    // callback and the activity spinner timer repaint the composer from that
    // binding while a turn runs. Shadowing it with a block-local `let buffer`
    // (as this used to do) decoupled the two: onKey wrote the draft into the
    // inner binding while every streaming/activity repaint read the outer one,
    // which stayed "" forever — so during a loop the composer kept snapping
    // back to the placeholder and hid what the user was typing (the submit
    // path still read the inner buffer, so input "worked" but was invisible).
    let previousTopRows = getTopReservedRows(output);
    const baseFixedInput = createFixedInput(output, {
      getStatusLine: (maxWidth) => {
        // 排队的消息已经由 composer 上方的队列 UI（getQueueLines）逐条呈现，
        // 状态栏不再重复一个「N 排队」计数——那是同一件事的第二份、更差的展示。
        return renderStatusLine(state, maxWidth);
      },
      getActivityLines: (layout) =>
        activityIndicator.getBackgroundLines(resolveCliColorEnabled(), layout),
      getTaskLines: (layout) => activityIndicator.getTaskLines(resolveCliColorEnabled(), layout),
      getReservedRows: () => dialogHost.getReservedRows(),
      getQueueLines: () => {
        if (!chatQueueBinding) return [];
        const queueStatus = chatQueueBinding.getStatus();
        const errorLines = queueStatus.lastDrainError
          ? [`  ⚠ ${queueStatus.lastDrainError.replace(/\r?\n/g, " ")}`] : [];
        const colorEnabled = resolveCliColorEnabled();
        // queuePreview is the shared projection: up to 3 entries, each already
        // truncated to 40 chars. Render each as a dim "⤷ <text>" line so the
        // staged follow-ups are visible above the composer. Newlines in a
        // queued paste must be collapsed to a single-line marker: each entry is
        // one `sections` row, and an embedded "\n" would emit extra physical
        // lines that headerRows doesn't count, drifting the input cursor.
        return [...errorLines, ...queueStatus.queuePreview.map((text, i) => {
            const oneLine = text.replace(/\r?\n/g, " ⏎ ");
            return dimCliText(`  ⤷ ${i + 1}. ${oneLine}`, colorEnabled);
          })];
      },
      getAttachmentLine: () => {
        // 附件条：Ctrl+V 贴图成功后实时显示当前草稿的附件列表（≤2 张全列，
        // 更多 +N）。附件是「下一条消息」的草稿态：提交时由 sessionDispatch
        // 派发层清零，/clear、/new 同样清零 → 返回 null → 行消失（高度回落
        // 走 onInputLinesChange 既有路径）。dim 以匹配 composer chrome。
        const line = formatComposerAttachmentLine(state.attachedImages);
        return line ? dimCliText(`${line} · 待发送 · /images 查看/移除`, resolveCliColorEnabled()) : null;
      },
      onInputLinesChange: () => {
        const topRows = getTopReservedRows(output);
        const topChanged = topRows !== previousTopRows;
        previousTopRows = topRows;
        if (topChanged && history.turns.length === 0 && history.currentRole === null) {
          repaintBanner();
        } else {
          renderHistoryToOutput();
        }
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
      resumeFromDialog() {
        baseFixedInput.resumeFromDialog();
        setImmediate(() => { void runWakeHandler?.resumeAfterInputPause().catch(() => {}); });
      },
      resumeFromSubprocess() {
        baseFixedInput.resumeFromSubprocess();
        setImmediate(() => { void runWakeHandler?.resumeAfterInputPause().catch(() => {}); });
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
      // 欢迎页在位（transcript 为空，renderHistory 让出屏幕）时不能走
      // paintFrame——那只会重 dock composer，banner 会留在旧宽度的排版里、
      // 窄终端甚至 wrap 出残行。按新宽度重绘 banner（repaintBanner 实时读
      // columns 决定 scene 去留），composer 单独重 dock。
      if (history.turns.length === 0 && history.currentRole === null) {
        // repaintBanner 已在同一个 BSU/ESU 帧里按新几何重绘 banner 与 composer
        // （含两者之间残段的补清），这里不再重复 repaint 一次 composer。
        repaintBanner();
        return;
      }
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
      loginSession.cancel();
      if (done) return;
      done = true;
      restoreTitle();
      unsubscribeBackgroundTitle();
      // 会话收尾：注销审批渲染器并放掉仍在等的卡片（一律按拒绝结算，避免工具调用挂死）。
      unregisterHostApprovalRenderer?.();
      unregisterHostApprovalRenderer = null;
      secretInputCoordinator.dispose();
      hostApprovalPrompt?.dispose();
      hostApprovalPrompt = null;
      childShellApprovals.close();
      sessionEnded = true; // signal in-flight async git refresh to drop its repaint
      scrollAnimator.cancel(); // stop any in-flight wheel animation before teardown
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
      idleHeapReleaser.cancel();
      runCompletionWatcher.dispose();
      activityIndicator.dispose();
      // 部署完成 SSE 订阅：交互式路径的**唯一**出口在这里（下面非交互块的
      // dispose 走不到，交互分支 finally 后直接 return）。dispose 本身幂等，
      // finish() 被重复调用（input end/close + finally）不会抛也不会重复副作用。
      deployWakeLifecycle.dispose?.();
      resolveDone?.();
      clearCollapsedPasteStore(pasteStore);
      resizeTarget.off?.("resize", onResize);
      if (onGraphicsData) input.off("data", onGraphicsData);
      graphicsRuntime?.dispose();
      imageRenderer?.dispose();
      imageRenderer = undefined;
      imageCache.clear();
      input.off("end", finish);
      input.off("close", finish);
      onData.destroy();
      fixedInput.disable();
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
        // 本地桶（permissionGrants.local）：只放行写文件确认门（file_write 的
        // confirm gate）。handoff / input 类 gate 需要真人接管终端，不是
        // 权限确认，绝不能被授权短路——这是安全边界，见
        // isAutoConfirmableFileWriteGate 的文档。state 是 runTuiWorkspace 的
        // 可变绑定，这里在调用时读取，拿到的总是最新值。
        if (state.permissionGrants?.local === true && isAutoConfirmableFileWriteGate(gate)) {
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
        return await runWithInputRequiredAttention({ output, env: effectiveEnv,
      onWaiting: () => reportTerminalStatus({ state: "blocked", kind: "permission" }),
      onResumed: () => reportTerminalStatus({ state: activeTurnAbort ? "working" : "idle" }),
    }, () =>
          resolveActionGate(gate, {
            dialogHost,
            input,
            output,
            spawnRunner,
            registerToken: (handler) => { rawActionGateTokenHandler = handler; },
            pauseComposer: () => fixedInput.pause(),
            resumeComposerFromSubprocess: () => fixedInput.resumeFromSubprocess(),
            resumeComposerFromDialog: () => fixedInput.resumeFromDialog(),
            withSecretInput: (start, cancelled) => {
              const signal = activeTurnAbort?.signal;
              const waiting = secretInputCoordinator.enqueue(start, { signal, cancelled });
              emitCommandOutput("需要凭据：Ctrl+G 开始安全输入（保存到本机）；等待期间可继续编辑草稿。");
              return waiting;
            },
            readSecretValue: (label, session, save) => runSecretInputDialog({
              label, input: input as NodeJS.ReadStream, output, ...session, save,
              bottomRow: () => resolveDialogBottomRow({ output, inputLines: fixedInput.getInputLines() }),
            }),
            onApprove: createSnapshotGuardedApproval("local", () => state.permissionGrants, approveLocalConfirms),
            onApproved: async (approvedGate) => {
              // 贴入 key 的 create：用户真实批准后由宿主**进程内**执行受限
              // create/verify（不落授权文件、不经 shell 持 grant 自授权）。
              // 宿主不处理（null）→ 返回 null，交回原流程（既有语义）。
              if (approvedGate.kind !== "confirm") return null;
              const { executeApprovedCredentialCreate } = await import("./hostCredentialCreate");
              const hostResult = await executeApprovedCredentialCreate({
                gate: approvedGate,
                approvalGateId: approvedGate.id,
                env: effectiveEnv as Record<string, string | undefined>,
              });
              if (!hostResult) return null;
              return { approved: true, hostResult };
            },
          }),
        );
      };
      const confirmDestructiveAction = async (request: PermissionRequest) => {
        // 本地桶（permissionGrants.local）：跳过确认弹窗直接放行。state 是
        // runTuiWorkspace 的可变绑定（busy 期间 /auto 走 isBusyLocalSlash
        // 本地处理并回写），这里在调用时读取，拿到的总是最新值。
        // 只短路本机 run 的三类确认；远程来源的 shell 走远程桶，handoff/input
        // 类 gate（要真人接管终端）永远不短路。
        if (state.permissionGrants?.local === true) return true;
        // 破坏性操作确认同属「Agent 等用户决定」：立即提醒，任何应答路径
        // （approve / cancel / Esc / 异常）都由 finally 清掉 progress。
        return await runWithInputRequiredAttention({ output, env: effectiveEnv,
      onWaiting: () => reportTerminalStatus({ state: "blocked", kind: "permission" }),
      onResumed: () => reportTerminalStatus({ state: activeTurnAbort ? "working" : "idle" }),
    }, () =>
          dialogHost.run((anchor) =>
            runConfirmDialog({
              request,
              input: input as any,
              output: output as any,
              onApprove: createSnapshotGuardedApproval("local", () => state.permissionGrants, approveLocalConfirms),
              ...anchor,
            }),
          ),
        );
      };
      return { actionGateHandler, confirmDestructiveAction };
    };
    // 进程任务终态自动续跑的决策器：归属来自 registry 记录（派发时刻写入），
    // 当前 dialog / turn 活跃度取自 UI 事实。只有「有人能把对话接回来」
    // （交互会话 + 已装上唤醒通道）时才允许续跑，否则退回只提示且不消耗
    // once-only 名额。判定规则见 processTerminalResume.ts。
    const processTerminalResumer = createProcessTerminalAutoResumer({
      readOwner: (taskId) => getProcessRegistry().getByTaskId(taskId)?.owner ?? null,
      isPromoted: (taskId) => getProcessRegistry().getByTaskId(taskId)?.promoted ?? false,
      getCurrentDialogId: () => state.dialogId ?? null,
      isTurnActive: () => busy || fixedInput.isPaused(),
      canDeliver: () => !sessionEnded && !done && runWakeHandler !== null,
      onDecision: (decision) => {
        const owner = getProcessRegistry().getByTaskId(decision.taskId)?.owner;
        try {
          // notice-only 是用户可见的结论（任务终态但没人能接回对话），要留 warn 痕迹；
          // 其余只是内部调度细节，留在 debug。字段只允许 id / 枚举 / 计数，
          // 不得写入命令输出、用户内容或凭据。
          const resumeLogger = getDiagnostics()?.logger.child({ component: "process-terminal-resume" });
          const fields = {
            taskId: decision.taskId, kind: decision.kind,
            reason: decision.kind === "notice-only" ? decision.reason : undefined,
            ownerDialogId: owner?.dialogId, currentDialogId: state.dialogId ?? null,
            depth: owner?.processCausalDepth ?? 0,
          };
          if (decision.kind === "notice-only") resumeLogger?.warn("process terminal decision: notice-only", fields);
          else resumeLogger?.debug("process terminal decision", fields);
        } catch { /* Diagnostics must not disrupt delivery. */ }
      },
    });
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
    // 内部事件（后台 run / 进程任务终态唤醒）在 transcript 上的显示：紧凑单行 +
    // 流式安全插入。run 唤醒的 busy 分支与进程任务续跑共用这一份实现，避免两处
    // 漂移（appendStreamSafeNotice 的理由见 turnInjectionInbox.ts）。
    const printInternalEventLine = (
      displayText: string,
      lineOptions: { dim?: boolean } = {},
    ): void => {
      // dim 默认开（后台 run / 进程任务的既有语义）；部署唤醒传 false，
      // 让 ✔/✖ 前缀保持醒目。
      const noticeLine =
        lineOptions.dim === false
          ? displayText
          : dimCliText(displayText, resolveCliColorEnabled());
      if (!isInteractiveInput(input)) {
        // 非交互模式本来就不碰 TurnHistory，直写即可（与 emitCommandOutput 一致）。
        output.write(`${noticeLine}\n`);
        return;
      }
      history.followBottom = true;
      appendStreamSafeNotice(history, noticeLine, {
        appendLocalTurn,
        startTurn,
      });
      renderHistoryToOutput();
    };
    // ── 部署完成唤醒（方案 B 的 TUI 侧，见 tui/deployWake.ts） ──────────────
    // 订阅位置刻意在这里：非交互（管道 / --json / 脚本）永远不会执行到这个分支，
    // 所以 BEL 与提示行在非交互场景是**结构上不可能**发生的；notifier 内部还有
    // interactive 闸门做第二道保险。
    // 降级：401/403 直接放弃、其它错误按退避重连到上限后静默停止，全程不写
    // stderr、不抛错、不刷错误墙（打印一次提示的口子留在 onGiveUp，这里不接，
    // 因为「订阅不上」对用户没有可执行信息量）。
    if (!isDeployWakeDisabled(options.env ?? process.env)) {
      const deployAuthToken = resolvePlatformAuthToken(options.env ?? process.env);
      const deployUserId = parseUserIdFromAuthToken(deployAuthToken);
      // user-{userId} 频道鉴权要求与服务端认证出的 userId 完全一致，
      // 拿不到（未登录 / token 形状不认识）就不订阅——绝不猜。
      if (deployAuthToken && deployUserId) {
        const deployWake = createDeployWakeNotifier({
          output,
          interactive: true,
          printLine: (line) => {
            printInternalEventLine(line, { dim: false });
            if (fixedInput.active && !fixedInput.isPaused()) {
              fixedInput.repaint(buffer, cursorPos);
            }
          },
        });
        const deployStream = startCiDeployEventStream({
          serverUrl: state.serverUrl,
          authToken: deployAuthToken,
          userId: deployUserId,
          fetchImpl,
          onEvent: (raw) => {
            deployWake.handle(raw);
          },
        });
        deployWakeLifecycle.dispose = () => deployStream.dispose();
      }
    }
    // 「后台结果已排队但没有自动续跑」的可见提示（仅停止态）。
    // 停止之后的下一回合，界面上只剩 composer 上方一行 ⤷ 预览，用户不知道
    // 队列里压着的是后台结果、也不知道怎么继续（2026-11-14 实测：停止后
    // 3 分钟没有续跑，用户只看到「停在那」）。同一后台完成计数只提示一次（用 key 去重）；
    // 自动续跑完成（drained: true）时清空 key。
    let resumeSkipNoticeKey: string | null = null;
    const reportInternalResumeSkip = (result: {
      drained: boolean;
      gate: string | null;
    }): void => {
      if (result.drained) {
        resumeSkipNoticeKey = null;
        return;
      }
      if (result.gate !== "resume-stopped") return;
      const count = chatQueueBinding?.countQueuedBackgroundResults() ?? 0;
      if (count === 0) return;
      const key = `resume-stopped:${count}`;
      if (resumeSkipNoticeKey === key) return;
      resumeSkipNoticeKey = key;
      emitCommandOutput(t("wakeQueuedWhileStopped", String(count)));
    };
    runWakeHandler = createRunWakeHandler({
      isDone: () => done,
      isBusy: () => busy,
      getDialogId: () => state.dialogId ?? null,
      fixedInput,
      getInbox: () => turnInjectionInbox,
      getQueueStatus: () => chatQueueBinding?.getStatus(),
      enqueue: (event) => {
        const { actionGateHandler, confirmDestructiveAction } = buildInteractiveTurnHandlers();
        return ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction).enqueue(event);
      },
      printLine: printInternalEventLine,
      repaint: () => fixedInput.repaint(buffer, cursorPos),
      runIdle: runIdleTextTurn,
      drainQueue: async () => {
        if (!chatQueueBinding || busy || fixedInput.isPaused()) return;
        const binding = chatQueueBinding;
        busy = true;
        try {
          reportInternalResumeSkip(
            await binding.resumeInternalCompletions(state.dialogId ?? null)
          );
        } finally { busy = false; }
      },
      onError: (err) => emitCommandOutput(`${t("turnFailed")}${err instanceof Error && err.message ? `\n${err.message}` : ""}`),
    });
    // 进程任务终态投递体（订阅在构造早期已装上，这里补上真正的投递）：
    //   - notice-only：无归属 / dialog 不匹配 / 重复 / 链深触顶 / 无通道 →
    //     维持既有 pending 行（下一轮 context block 让模型知情），不续跑；
    //   - 续跑：同一事实不再进 pendingProcessNotices（busy 尝试直投
    //     收件箱、空闲尝试起 completion turn；决策 claim 不保证实际投递成功），否则模型会在 inbox 文本之外又从下一轮
    //     context block 看到同一行。屏幕上仍留一行 dim 记录。
    deliverProcessTerminalNotice = (notice: ProcessTerminalNotice) => {
      if (done || sessionEnded) return;
      const decision = processTerminalResumer.decide(notice);
      if (decision.kind === "notice-only") {
        pushPendingProcessNotice(notice);
        return;
      }
      // 屏幕记录交给下游各投递路径，deliver 不再自己打印：无条件 print 会让
      // 「busy 直投收件箱」与「空闲 completion turn」两条成功路径都出现连续
      // 两行相同 dim 行（前者由 runWakeHandler 的 injected 分支印、后者由
      // tuiTurnRunner 写 transcript）。inbox 不可用时的 enqueue 兜底同样不打印，
      // 那与 run 终态唤醒共用分支、且队列 UI 已呈现排队事实（见 runWakeHandler）。
      runWakeHandler?.({ ...buildProcessTaskCompletedTurnEvent(notice), processCausalDepth: (decision.owner.processCausalDepth ?? 0) + 1 });
      if (fixedInput.active && !fixedInput.isPaused()) {
        fixedInput.repaint(buffer, cursorPos);
      }
    };

    let autoScrollDirection: "up" | "down" = "up";
    // autoScrollTicks 声明在外层，stopAutoScroll（鼠标移开）时重置。
    const autoScrollStep = () => autoScrollStepForTicks(++autoScrollTicks);
    const startAutoScroll = (direction: "up" | "down", mouseX: number) => {
      autoScrollDirection = direction;
      lastDragMouseX = mouseX;
      // 选区边缘自动滚动与滚轮动画互斥：接管 scrollTop 前先停推进器。
      scrollAnimator.cancel();
      if (autoScrollTimer) return;
      autoScrollTimer = setInterval(() => {
        if (!selectionState.dragging || !selectionState.anchor || fixedInput.isPaused()) {
          stopAutoScroll();
          return;
        }
        const tty = output as { rows?: number; columns?: number };
        const rows = tty.rows ?? 24;
        const columns = tty.columns ?? 80;
        const reservedRows = dialogHost.getReservedRows();
        const visibleHeight = Math.max(
          1,
          resolveHistoryViewportHeight(
            rows,
            fixedInput.getInputLines(),
            reservedRows,
            getTopReservedRows(output),
          ),
        );
        const { contentWidth, marginLeft } = resolveHistoryLayoutGeometry(columns);
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
        const dragCol = Math.max(0, Math.min(contentWidth, lastDragMouseX - 1 - marginLeft));
        const hit = hitTestHistory(
          history,
          screenRow,
          dragCol,
          contentWidth,
          history.scrollTop,
          visibleHeight,
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
    // 选区复制/URL 打开的诊断计时：只在 diagnostics 已初始化时落日志
    // （默认级别会滤掉 debug），绝不写 stderr、不改终端全局配置。
    const reportTuiDiagnostic = (
      component: string,
      level: "debug" | "warn",
      message: string,
      fields: Record<string, unknown>,
    ): void => {
      try {
        const logger = getDiagnostics()?.logger;
        if (!logger) return;
        logger.child({ component })[level](message, fields);
      } catch {
        /* 诊断路径永不抛出、永不影响交互 */
      }
    };

    // 非空鼠标选区判定（idle/busy 两条 Ctrl+C 分支共用）。
    const hasNonEmptySelection = () =>
      selectionState.anchor !== null &&
      selectionState.head !== null &&
      !areSelectionPointsEqual(selectionState.anchor, selectionState.head);

    // 提取选区文本写入剪贴板、清除高亮并重绘。busy 变体改用带 Esc 提示的
    // 成功文案（生成仍在继续，Ctrl+C 已不承担停止语义，告诉用户正确的停止键）。
    const copySelectionToClipboard = async (
      feedbackKey: "copiedSelection" | "copiedSelectionBusy",
    ): Promise<void> => {
      const tty = output as { rows?: number; columns?: number };
      const columns = tty.columns ?? 80;
      const { contentWidth } = resolveHistoryLayoutGeometry(columns);
      // 诊断计时（选区复制卡顿定位用）：拆开「布局+提取」与「剪贴板写入」两段。
      const extractStartedAt = Date.now();
      const textToCopy = extractSelectedText(
        history,
        selectionState.anchor!,
        selectionState.head!,
        contentWidth,
      );
      const extractMs = Date.now() - extractStartedAt;
      clearSelection();
      let writeMs = 0;
      if (textToCopy.length > 0) {
        try {
          const writeStartedAt = Date.now();
          await writeClipboard(textToCopy);
          writeMs = Date.now() - writeStartedAt;
          emitCommandOutput(t(feedbackKey));
        } catch (error) {
          emitCommandOutput(
            `[nolo] ${t("copyFailed")}: ${toErrorMessage(error)}`,
          );
        }
      }
      const totalMs = extractMs + writeMs;
      reportTuiDiagnostic(
        "tui-selection",
        totalMs > 150 ? "warn" : "debug",
        "selection copy timing",
        { extractMs, writeMs, chars: textToCopy.length },
      );
      paintFrame(buffer);
    };

    const handleCtrlCKey = async (busyLock: boolean): Promise<void> => {
      if (!hasNonEmptySelection() && loginSession.cancel()) return;
      // Ctrl+C（\u0003）：防误退。必须放在 generic clearSelection() 之前，
      // 否则会先清掉鼠标选区，导致"Ctrl+C 提取选区"失效。
      // - Busy + 有鼠标选区：只复制选区（用户生成中拖选按 Ctrl+C 的意图是
      //   复制而非中止），提示按 Esc 停止生成。
      // - Busy + 无选区：中止当前 Turn（保持原有 abort 语义），绝不退出。
      // - Idle + 有鼠标选区：提取选区文本写入剪贴板，清除高亮，绝不退出。
      // - Idle + 输入草稿非空：仅清空草稿（同 Bash/Zsh），绝不退出。
      // - Idle + 草稿空且无选区：第一次记录时间戳 + 提示；1000ms 内第二次才退出。
      if (busyLock && activeTurnAbort) {
        if (hasNonEmptySelection()) {
          await copySelectionToClipboard("copiedSelectionBusy");
          return;
        }
        // 中止当前 Turn（保持原有行为）：与 Esc 的协作停止一致。
        const stopBinding = chatQueueBinding;
        if (stopBinding) {
          stopBinding.preemptForStop();
        }
        activityIndicator.markStopping();
        activeTurnAbort.abort();
        return;
      }
      // Idle 分支。
      const now = Date.now();
      if (hasNonEmptySelection()) {
        await copySelectionToClipboard("copiedSelection");
        return;
      }
      if (selectionState.anchor) {
        clearSelection();
      }
      if (buffer.length > 0) {
        // 仅清空输入草稿。世代自增：Ctrl+C 清草稿后在途粘贴结果不得再落进来。
        bumpDraftEpoch();
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
    const stopActiveTurn = (): void => {
      if (loginSession.cancel()) return;
      if (!activeTurnAbort) {
        chatQueueBinding?.preemptForStop();
        return;
      }
      if (activeTurnAbort) {
        if (activityIndicator.isStopping()) {
          // 第二次 Esc = 强制收尾。
          forcedStop = true;
          forcedStopEpoch = activeTurnEpoch;
          activityIndicator.stop();
          activeTurnAbort.abort();
          activeTurnAbort = null;
          activeTurnEpoch = 0;
          busy = false;
          // 强制收尾 = 用户已经把 UI 拿回去了：不等迟到的 runAgentChat 返回，
          // 立刻报 idle（旧 turn 的 done/error 被 epoch 守卫挡掉，见
          // tuiTurnRunner 的 emitStatusIfCurrentTurn）。
          reportTerminalStatus({ state: "idle" });
          emitCommandOutput(t("forceStopped"));
          flushPendingRender();
          renderHistoryToOutput();
          if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
          return;
        }
        // 第一次 Esc = 协作停止 + 即时反馈。
        const stopBinding = chatQueueBinding;
        if (stopBinding) {
          stopBinding.preemptForStop();
        }
        activityIndicator.markStopping();
        activeTurnAbort.abort();
        return;
      }
    };

    const handleBusyLocalSlash = async (
      submittedText: string,
      busySlashCommand: string,
    ): Promise<void> => {
      // /shell-revoke（块 D）：直接翻转会话授权，立即生效——不走 handleTuiInput
      // （纯函数拿不到 grant），下一次 shell 调用即重新弹确认。busy 期间撤销
      // 安全：grant 是同步状态位，不与 in-flight 调用竞争（已放行的那次执行
      // 会跑完——撤销承诺的是「下一次」重新确认，不是中断已开始的命令）。
      if (busySlashCommand === "/shell-revoke") {
        const wasGranted = sessionShellGrant.isGranted();
        sessionShellGrant.revoke();
      childShellApprovals.revoke();
        // /shell-revoke 同时清掉持久 remote 桶（busy 路径同一份语义）。
        if (state.permissionGrants?.remote === true) {
          const nextGrants = { ...state.permissionGrants };
          delete nextGrants.remote;
          state = { ...state, permissionGrants: nextGrants };
          if (!persistPermissionGrantChanges({ remote: true }, nextGrants)) {
            output.write(`[nolo] ${t("autoPersistFailed")}\n`);
          }
        }
        emitCommandOutput(
          wasGranted ? t("shellGrant.revoked") : t("shellGrant.revokeNone"),
          "/shell-revoke",
        );
        return;
      }
      releaseCollapsedPasteReferences(submittedText, pasteStore);
      // 草稿被清空（命令回显不占草稿）：作废在途的异步粘贴结果。
      bumpDraftEpoch();
      buffer = "";
      cursorPos = 0;
      if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);

      const taskOutput = await runTaskSlashCommand(submittedText, { getDialogId: () => state.dialogId, env: effectiveEnv, confirm: confirmTaskStop });
      if (taskOutput !== null) {
        output.write(`${taskOutput}\n`);
        return;
      }
      const beforeAgentKey = state.agentKey;
      const res = handleTuiInput(submittedText, state, collectConversationTurns(history), {
        env: effectiveEnv,
        // Identity only: `effectiveEnv` is the startup snapshot, `options.env`
        // is where a `/login` in this session writes its token.
        authEnv: resolveTuiIdentityEnv(effectiveEnv, options.env ?? process.env),
      });
      if (res.action?.type === "paste-clipboard") {
        // turn 运行中也能 /paste：草稿本来就在 busy 期间保持可编辑，写入草稿安全
        // （不触碰 history 状态机，不排队）。与空闲路径共用同一份读取流程。
        await readAndApplyClipboard("slash");
        return;
      }
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
          state = { ...state, gitStatus };
        }
        scheduleRender();
      } else if (res.action?.type === "login") {
        // busy 期间的 /login：与空闲路径共用 runTuiLogin（同一服务端契约、
        // 同一落盘），但输出走 raw output.write——busy 期间 streaming repaint
        // 拥有 transcript pane，emitCommandOutput 的 history 写入会与流式
        // 渲染竞争（与 handleBusyLocalSlash 其他分支的临时 notice 同形态）。
        // 登录是长等待操作，做完后 token 热写进 env，下一 turn 立即生效。
        const env = options.env ?? process.env;
        state = res.nextState;
        const outcome = await loginSession.run(res.action.args ?? [], (text) => {
          output.write(`${text}\n`);
        }, { fetchImpl });
        if (outcome.status === "success") {
          env.AUTH_TOKEN = outcome.token;
          state = { ...state, showAuthGuidance: false };
        }
      } else if (res.action?.type === "auth") {
        state = res.nextState;
        await runTuiAuth(res.action.args ?? [], (text) => {
          output.write(`${text}\n`);
        }, {
          fetchImpl: options.fetchImpl ?? fetch,
          // 与空闲路径一致：选择器/粘贴码交互要接同一套弹窗宿主与输入输出，
          // 否则 busy 期间 /auth 会拿不到键盘输入，表现为"卡住没反应"。
          dialogHost,
          input: input as any,
          output: output as any,
        });
      } else if (res.action?.type === "transcribe") {
        // /transcribe 要等当前回复结束再跑：转写产物挂在 pendingTranscripts
        // 上、随下一条消息发出，busy 期间执行没有意义（等回复完再发）。
        output.write(
          `[nolo] ${t("transcribeBusyHint")}\n`,
        );
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
        const grantsBefore = state.permissionGrants;
        state = res.nextState;
        if (grantsBefore?.remote === true && state.permissionGrants?.remote !== true) {
          sessionShellGrant.revoke();
          childShellApprovals.revoke();
        }
        let msg = res.output;
        // busy 期间的 /auto … 同样写盘（与空闲路径 tuiSlashRouter 共用同一个
        // helper）：只写真正翻转的桶；失败用 raw output.write 追一行——streaming
        // repaint 拥有 transcript，emitCommandOutput 会与它竞争。
        if (!persistPermissionGrantChanges(grantsBefore, state.permissionGrants)) {
          output.write(`[nolo] ${t("autoPersistFailed")}\n`);
        } else if (state.permissionGrants !== grantsBefore) {
          scheduleRender();
        }
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

    let preparingImageSubmission = false;
    const handleInputToken = async (sequence: string) => {
      if (done) return;
      if (secretInputCoordinator.isActive()) { secretInputCoordinator.handleToken(sequence); return; }
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
      // Only explicit Ctrl+G activates a pending secret request. All other
      // tokens continue through the existing draft/submit/cancel paths.
      if (secretInputCoordinator.handleToken(sequence)) return;
      // Async path reads must not allow a second Enter to start another send.
      // Modal keys still belong to the dialog above, including its confirmation.
      if (preparingImageSubmission) return;
      // 对话内审批卡：y/n/Esc 只在 composer 草稿为空时属于卡片（否则它们只是用户正在输入的字
      // 母）；Esc 在跑轮次时仍保留「停止本轮」的含义，卡片不抢。模态（dialogHost）优先，见上。
      if (hostApprovalPrompt?.handleKey(sequence, {
        draftEmpty: buffer.length === 0,
        busy,
      })) {
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
        // Idle: fold the composer draft into the flush as one more queued
        // message. The queue keeps every message's own text/attachments and
        // the drain sends them all in one provider round — no text merge.
        // Busy keeps the draft (the turn owns the screen; the draft is
        // preserved and editable once the turn ends).
        const draftIncluded = !busy && buffer.trim() !== "";
        if (draftIncluded) {
          const draftImages = detectSubmittedImagePaths(buffer, state.cwd);
          const draftMedia = detectSubmittedMediaPaths(draftImages.message, state.cwd);
          try {
            if (draftImages.imagePaths.length > 0 || draftMedia.mediaPaths.length > 0) {
              const message = draftMedia.message.trim() || draftImages.message.trim();
              await chatQueueBinding.submitPending({
                event: { kind: "user", text: message },
                text: message,
                ...(draftImages.imagePaths.length > 0 ? { imagePaths: draftImages.imagePaths } : {}),
                ...(draftMedia.mediaPaths.length > 0 ? { mediaPaths: draftMedia.mediaPaths } : {}),
              });
            } else {
              await chatQueueBinding.submitPending(buffer);
            }
          } catch (error) {
            emitCommandOutput(`[nolo] Pending save failed: ${error instanceof Error ? error.message : String(error)}; draft and attachments retained; retry Ctrl+S`);
            if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
            return;
          }
          bumpDraftEpoch();
          buffer = "";
          cursorPos = 0;
          if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
        }
        // Use a busy-aware message so the busy path does not contradict the
        // subsequent "Stopped this reply." line (review finding: two
        // contradictory toasts). The idle path is plain "flushed N as one".
        const totalCount = flushCount + (draftIncluded ? 1 : 0);
        emitCommandOutput(
          t(busy ? "flushQueuedBusyHint" : "flushQueuedIdleHint", String(totalCount)),
        );
        if (busy) {
          // Stop the in-flight reply; the drain cascade then sends the queued
          // messages as one batch (one provider round, original order/text/
          // attachments). Messages typed during that round queue for the next.
          preemptAndAbortForDrain(chatQueueBinding, activeTurnAbort);
          return;
        }
        // Idle: drain the queued messages as one batch now.
        busy = true;
        try { await chatQueueBinding.resumePending(); }
        finally { busy = false; if (fixedInput.active) fixedInput.repaint(buffer, cursorPos); }
        return;
      }
      const busyLock = busy;

      const mouseEvent = parseSgrMouseEvent(sequence);
      if (mouseEvent) {
        if (fixedInput.isPaused()) return;
        if (mouseEvent.kind === "wheel") {
          // 平滑滚动：报告只折算成目标位置，推进器按 16ms/帧限速逼近。
          // "一次手势几十条报告 → 单帧跳几十行"的瞬移由推进器消掉
          // （详见 tuiScrollAnimation）。
          scrollAnimator.wheel(
            mouseEvent.wheelDirection === "down" ? "down" : "up",
          );
          return;
        }

        const tty = output as { rows?: number; columns?: number };
        const rows = tty.rows ?? 24;
        const columns = tty.columns ?? 80;
        const reservedRows = dialogHost.getReservedRows();
        const visibleHeight = Math.max(
          1,
          resolveHistoryViewportHeight(
            rows,
            fixedInput.getInputLines(),
            reservedRows,
            getTopReservedRows(output),
          ),
        );
        const { contentWidth, marginLeft } = resolveHistoryLayoutGeometry(columns);
        const screenRow = mouseEvent.y - 1 - getTopReservedRows(output);
        const screenCol = mouseEvent.x - 1;
        const hitContentCol = screenCol - marginLeft;
        const contentCol = Math.max(0, Math.min(contentWidth, screenCol - marginLeft));

        if (mouseEvent.kind === "press" && mouseEvent.button === "left") {
          // The task header rejects new selections, not drag/release cleanup.
          if (screenRow < 0) return;
          stopAutoScroll();
          // 开始选区时冻结滚轮动画：内容不能在选中锚点底下滑走。
          scrollAnimator.cancel();
          // Ctrl+左键：只有坐标精确落在这行**可见**的 http(s) URL 字符区间内才用
          // 系统默认浏览器打开，并消费这次点击（不进入拖选）；未命中原样走下面的
          // 选区逻辑，普通点击/拖选与 Ctrl+C 复制行为不变。
          if (
            mouseEvent.ctrl &&
            screenRow < visibleHeight &&
            hitContentCol >= 0 &&
            hitContentCol < contentWidth &&
            openVisibleUrlAtScreen(
              history,
              contentWidth,
              history.scrollTop,
              screenRow,
              hitContentCol,
              visibleHeight,
              (url) =>
                openExternalUrl(url, {
                  onError: (message) =>
                    reportTuiDiagnostic("tui-link", "warn", "ctrl-click open failed", {
                      message,
                    }),
                }),
            )
          ) {
            clearSelection();
            paintFrame(buffer);
            return;
          }
          if (screenRow < visibleHeight && screenCol < columns) {
            const hit = hitTestHistory(
              history,
              screenRow,
              contentCol,
              contentWidth,
              history.scrollTop,
              visibleHeight,
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
            contentCol,
            contentWidth,
            history.scrollTop,
            visibleHeight,
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
              contentCol,
              contentWidth,
              history.scrollTop,
              visibleHeight,
            );
            if (releaseHit) selectionState.head = releaseHit;
          }
          if (
            selectionState.dragging &&
            selectionState.anchor &&
            selectionState.head &&
            !areSelectionPointsEqual(selectionState.anchor, selectionState.head)
          ) {
            // Releasing a drag only finalizes the TUI selection. Clipboard
            // writes for a mouse selection must remain explicit (Ctrl+C): an asynchronous
            // write here can finish after the user copies newer text in
            // another app and restore stale TUI content over it.
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
        // 键盘翻页/首尾是瞬跳：先停掉可能在跑的滚轮动画，避免两套写入打架。
        scrollAnimator.cancel();
        applyScrollAction(history, scrollAction, output, fixedInput.getInputLines());
        paintFrame(buffer);
        return;
      }
      if (sequence === "\x1b" && loginSession.cancel()) return;

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
      if (busyLock && sequence === "\x1b") {
        stopActiveTurn();
        return;
      }
      // 粘贴来源识别（三条入口，语义不同但共用下方同一个读取流程）：
      // - Ctrl+V / \x16：显式快捷键；
      // - `/paste`：显式命令（走 slash 分发，见 tuiSlashRouter）；
      // - 空 bracketed paste（`\x1b[200~\x1b[201~`，payload 全为空白）：终端
      //   在「粘贴图片」时只发空括号标记，属兼容信号而非用户命令。
      // 非空 bracketed paste 一律只使用终端传来的文本（上一分支已把 payload 写进
      // 草稿），绝不二次读系统剪贴板。
      const isPasteToken = sequence.startsWith(PASTE_TOKEN_PREFIX);
      const isEmptyBracketedPaste =
        isPasteToken && sequence.slice(PASTE_TOKEN_PREFIX.length).trim() === "";
      const isPasteShortcut = sequence === "\x16" || isEmptyBracketedPaste;

      if (isPasteShortcut) {
        await readAndApplyClipboard(isEmptyBracketedPaste ? "bracketed-empty" : "key");
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
        let submittedText = replaceCollapsedPastesWithReferences(
          result.submit,
          pasteStore,
        );
        const submittedTrimmed = submittedText.trim();
        // `busy` means an agent turn is occupying the composer. Slash/shell
        // commands (including /history) may await a picker or subprocess, but
        // they must not make a later /exit look like a queued chat message.
        const startsChatTurn =
          (submittedTrimmed.length > 0 || state.attachedImages.length > 0) &&
          !isLikelySlashCommand(submittedTrimmed) &&
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
          if (busySlashCommand === "/tools") {
            printInternalEventLine(history.toolDetails?.join("") || t("noToolDetails"));
            bumpDraftEpoch();
            buffer = "";
            cursorPos = 0;
            if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
            return;
          }
          if (busySlashCommand === "/restart") {
            output.write("\n[nolo] 当前仍在执行任务，不能重启；请等待任务结束。\n");
            return;
          }
          if (busySlashCommand === "/stop" || busySlashCommand === "/pending") {
            const [, ...args] = trimmedText.split(/\s+/);
            if (busySlashCommand === "/stop" && args.length === 0) {
              stopActiveTurn();
            } else if (busySlashCommand === "/pending") {
              if (args.length > 0) {
                output.write("\n[nolo] Cannot resolve pending batches while a turn is active; stop the turn first, then use /pending.\n");
              } else {
                const { actionGateHandler, confirmDestructiveAction } = buildInteractiveTurnHandlers();
                const binding = ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction);
                try {
                  output.write(`\n${await binding.handlePendingCommand("show")}\n`);
                } catch (error) {
                  output.write(`\n[nolo] ${error instanceof Error ? error.message : String(error)}\n`);
                }
              }
            } else {
              // Targeted /stop retains the existing background job/PID router.
              await handleBusyLocalSlash(submittedText, busySlashCommand);
              return;
            }
            bumpDraftEpoch();
            buffer = "";
            cursorPos = 0;
            if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
            return;
          }
          const isBusyLocalSlash =
            busySlashCommand === "/context" ||
            busySlashCommand === "/ctx" ||
            busySlashCommand === "/cd" ||
            busySlashCommand === "/switch" ||
            busySlashCommand === "/theme" ||
            busySlashCommand === "/runtime" ||
            busySlashCommand === "/logs" ||
            busySlashCommand === "/auto" ||
            busySlashCommand === "/tasks" ||
            busySlashCommand === "/jobs" ||
            busySlashCommand === "/procs" ||
            busySlashCommand === "/agents" ||
            busySlashCommand === "/doc" ||
            busySlashCommand === "/skill" ||
            busySlashCommand === "/customize" ||
            busySlashCommand === "/login" ||
            busySlashCommand === "/auth" ||
            busySlashCommand === "/profile" ||
            busySlashCommand === "/paste" ||
            busySlashCommand === "/version" ||
            busySlashCommand === "/links" ||
            busySlashCommand === "/transcribe" ||
            busySlashCommand === "/shell-revoke";
          if (isBusyLocalSlash) {
            // ── S1：busy 本地 slash 处理已抽为上方 handleBusyLocalSlash 具名
            // 闭包，此处仅转发（保持原 return 语义：处理完即结束本轮 handleInputToken）。
            await handleBusyLocalSlash(submittedText, busySlashCommand);
            return;
          }
          const { actionGateHandler, confirmDestructiveAction } =
            buildInteractiveTurnHandlers();
          const binding = ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction);
          // 附件诚实上报：文本内联的可读图片路径随队列携带（TurnRequest.imagePaths，
          // drain 时才读成 dataURL）；剪贴板暂存图（state.attachedImages）队列带不了，
          // 作为 attachmentCount 交给共享决议器 → queue-blocked（保留草稿 + 提示）。
          const busyImages = detectSubmittedImagePaths(submittedText, state.cwd);
          // 音视频路径同思路剥离：drain 时转写后并入消息体。
          const busyMedia = detectSubmittedMediaPaths(busyImages.message, state.cwd);
          const decision = binding.resolveSubmit({
            text: submittedText,
            isRunning: true,
            attachmentCount: state.attachedImages.length,
          });
          if (decision.kind === "queue-text") {
            try {
            if (busyImages.imagePaths.length > 0 || busyMedia.mediaPaths.length > 0) {
              const message = busyMedia.message.trim() || busyImages.message.trim();
              await binding.submitPending({
                event: { kind: "user", text: message },
                text: message,
                ...(busyImages.imagePaths.length > 0 ? { imagePaths: busyImages.imagePaths } : {}),
                ...(busyMedia.mediaPaths.length > 0 ? { mediaPaths: busyMedia.mediaPaths } : {}),
              });
            } else {
              await binding.submitPending(decision.text);
            }
            } catch (error) {
              emitCommandOutput(`[nolo] Pending save failed: ${error instanceof Error ? error.message : String(error)}; draft and attachments retained; retry Enter`);
              if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
              return;
            }
            bumpDraftEpoch();
            buffer = "";
            cursorPos = 0;
            fixedInput.repaint(buffer, cursorPos);
          } else if (decision.kind === "queue-blocked") {
            // 带剪贴板附件的草稿队列带不了；保留草稿（不销毁），并明确提示，
            // 绝不静默丢图。
            if (state.attachedImages.length > 0) {
              emitCommandOutput(
                `[nolo] ${t("busyAttachmentsBlocked", String(state.attachedImages.length))}`,
              );
              if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
            }
          }
          // Empty Enter is not permission to interrupt the active reply.
          // Explicit stop/flush controls retain their existing handlers.
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
        if (!submittedText.trim() && state.suggestedAuthCommand) {
          const authCmd = state.suggestedAuthCommand;
          state = { ...state, suggestedAuthCommand: undefined };
          buffer = "";
          cursorPos = 0;
          bumpDraftEpoch();
          // 与下方手工 drain / 正常提交同一来源的交互 handler：authCmd 是
          // slash 命令，这些 handler 在 /auth 分支不会被调用，但签名必须
          // 对齐（此前误传 (host, runOneAgentTurn)，类型不符且语义错位）。
          const { actionGateHandler } = buildInteractiveTurnHandlers();
          await runSubmittedLine(authCmd, actionGateHandler);
          return;
        }
        if (state.suggestedAuthCommand) {
          state = { ...state, suggestedAuthCommand: undefined };
        }
        if (!submittedText.trim() && state.attachedImages.length === 0) {
          const { actionGateHandler, confirmDestructiveAction } = buildInteractiveTurnHandlers();
          const pending = ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction);
          await pending.restorePending();
          maybeShowUnknownReminder(pending);
          if (pending.queueLength() > 0) {
            busy = true;
            try { await pending.resumePending(); }
            finally { busy = false; if (fixedInput.active) fixedInput.repaint(buffer, cursorPos); }
            return;
          }
        }
        // Resolve path attachments before consuming the draft. Failure never silently
        // turns an image send into a text-only send; keep the original text for retry.
        if (startsChatTurn) {
          preparingImageSubmission = true;
          try {
            const detected = detectSubmittedImagePaths(submittedText, state.cwd);
            if (detected.hints.length > 0) {
              const read = await readImagePaths(detected.hints.map(hint => hint.resolvedPath), {
                onFailure: (_path, error) => emitCommandOutput(`[nolo] 图片未添加: ${sanitizeImageLabel(error.message)}`),
              });
              state = { ...state, attachedImages: mergeAttachedImages(state.attachedImages, read.images) };
              if (read.failures.length > 0) { fixedInput.repaint(buffer, cursorPos); return; }
            }
            if (state.attachedImages.length > 0) {
              // Once staged, remove path tokens from the editor too: cancelling
              // after Remove must not re-add that file on the next Enter.
              if (detected.hints.length > 0) {
                submittedText = stripImageTokens(submittedText, detected.hints);
                buffer = stripImageTokens(buffer, detected.hints);
                cursorPos = buffer.length;
              }
              if (!await manageDraftImages(true)) { fixedInput.repaint(buffer, cursorPos); return; }
              submittedText ||= "请查看附件图片。";
            }
          } finally { preparingImageSubmission = false; }
        }
        // A real user send explicitly resumes recovered pending inputs in order.
        if (startsChatTurn && state.attachedImages.length === 0 && chatQueueBinding && (chatQueueBinding.queueLength() > 0 || chatQueueBinding.isRecoveryBlocked())) {
          const images = detectSubmittedImagePaths(submittedText, state.cwd);
          const media = detectSubmittedMediaPaths(images.message, state.cwd);
          try {
            await chatQueueBinding.submitPending({ text: media.message, event: { kind: "user", text: media.message },
              imagePaths: images.imagePaths, mediaPaths: media.mediaPaths });
          } catch (error) {
            emitCommandOutput(`[nolo] Pending save failed: ${error instanceof Error ? error.message : String(error)}; draft and attachments retained; retry Enter`);
            if (fixedInput.active) fixedInput.repaint(buffer, cursorPos);
            return;
          }
          bumpDraftEpoch(); buffer = ""; cursorPos = 0;
          busy = true;
          try { await chatQueueBinding.resumePending(); }
          finally { busy = false; if (fixedInput.active) fixedInput.repaint(buffer, cursorPos); }
          maybeShowUnknownReminder(chatQueueBinding);
          return;
        }
        // Stale-running recovery (batch 3): the workspace is idle (busy ===
        // false) but the queue binding can still report a running turn when a
        // turn-end notification was lost (an exception path skipped
        // notifyTurnEnd). Recover before starting the new turn so this message
        // cannot be routed into a phantom queue and the residual queue stays
        // drainable. Idempotent no-op when the binding agrees we're idle.
        chatQueueBinding?.recoverStaleRunning();
        busy = startsChatTurn;
        // 提交即作废旧世代：在途的剪贴板读取回来时草稿已清，结果必须丢弃，
        // 否则会把「上一行的粘贴」塞进新草稿。
        bumpDraftEpoch();
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
            true,
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
    graphicsRuntime = createTerminalGraphicsRuntime({
      output,
      env: effectiveEnv,
      isTTY: isInteractiveInput(input) && Boolean((output as { isTTY?: boolean }).isTTY),
      onForwardInput: (data) => onData(data),
      onCapabilityChanged: (enabled) => {
        if (sessionEnded || done) return;
        imageGraphicsSupported = enabled;
        history.graphicsEnabled = enabled && imagePreviewRequested;
        if (enabled && !imageRenderer) imageRenderer = createTuiImageRenderer({ output, namespace: renderNamespace, graphicsEnabled: true, getPng: (key) => imageCache.getPng(key) });
        scheduleRender();
      },
    });
    composerDecoderDrain = () => onData.destroy();
    // 注册为进程内的宿主审批渲染器：工具表早在本地 runtime 装配时就建好了，这里按调用延迟绑定，
    // 决定由本进程直接投递给连接器（模型既看不到也答不了）。
    hostApprovalPrompt = createInlineHostApprovalPrompt({
      write: (text) => {
        emitCommandOutput(text.replace(/\n$/, ""));
      },
      columns: () => (output as { columns?: number }).columns ?? 80,
    });
    unregisterHostApprovalRenderer = registerHostApprovalRenderer(
      hostApprovalPrompt.awaitHostApproval,
    );
    try {
      onGraphicsData = createWorkspaceInputStream((text) => graphicsRuntime!.filterInput(text), onData);
      input.on("data", onGraphicsData);
      graphicsRuntime.start();
      // Input shutdown can race an unsettled dialog/gate. Route stream end
      // through the same idempotent teardown so terminal progress is cleared
      // even when the interaction promise never gets a chance to settle.
      input.once("end", finish);
      input.once("close", finish);
      if (history.turns.length) renderHistoryToOutput();
      fixedInput.repaint(buffer, cursorPos);
      refreshGitStatus();
      refreshCiStatus();
      await new Promise<void>((resolve) => {
        resolveDone = resolve;
        if (done) resolve(); // finish() may have run before we started waiting
      });
    } finally {
      finish();
    }
    return;
  }

  // Bun 1.4 can lose lines when readline is attached directly to a non-TTY
  // stream that has already been ended. Pipe through a fresh stream so the
  // source's buffered chunks are replayed to readline in normal order.
  const readlineInput = new PassThrough();
  input.pipe(readlineInput);
  const rl = createInterface({ input: readlineInput, output });
  const shouldRenderPrompt = isInteractiveInput(input);
  rl.setPrompt(renderPrompt(state));
  if (shouldRenderPrompt) rl.prompt();

  try {
    for await (const line of rl) {
      const shouldExit = await runSubmittedLine(
        line,
        (gate) =>
          // /auto on 同款短路，见上方交互路径的 actionGateHandler 注释：
          // 只放行 file_write 的 confirm gate，handoff/input 类仍要求真人操作。
          state.permissionGrants?.local === true && isAutoConfirmableFileWriteGate(gate)
            ? Promise.resolve(buildGateConfirmedResult(gate))
            : waitForActionGate(rl, input, output, gate, spawnRunner),
        async (request) => {
          // /auto on（会话级权限自动化）：跳过确认弹窗直接放行。state 是
          // runTuiWorkspace 的可变绑定（runSubmittedLine 会把 handleTuiInput
          // 的 nextState 回写），这里在调用时读取，拿到的总是最新值。
          if (state.permissionGrants?.local === true) return true;
          // Non-TTY input has no interactive confirmation channel. Resolve the
          // request conservatively without calling rl.question(): Bun 1.4
          // closes readline as soon as an ended pipe is consumed, so waiting
          // on that interface would silently drop the current line.
          if (!isInteractiveInput(input)) {
            return false;
          }
          rl.pause();
          try {
            return await dialogHost.run((anchor) =>
              runConfirmDialog({
                request,
                input: input as any,
                output: output as any,
                onApprove: createSnapshotGuardedApproval("local", () => state.permissionGrants, approveLocalConfirms),
                ...anchor,
              }),
            );
          } finally {
            rl.resume();
          }
        },
        true,
      );
      if (shouldExit) break;
      if (shouldRenderPrompt) {
        output.write(`\n${renderStatusLine(state)}\n`);
        rl.setPrompt(renderPrompt(state));
        rl.prompt();
      }
    }
  } finally {
    const registry = getProcessRegistry();
    // 会话退出：摘掉终态订阅，registry 单例继续服务下个生命周期。
    unsubscribeProcessTerminal();
    unsubscribeBackgroundTitle();
    restoreTitle();
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
    childShellApprovals.close();
      sessionEnded = true;
    // 与 interactive 的 finish() 对齐：停靠区/轮询器/活动行的 setInterval 都是
    // ref'd 计时器且非交互路径不走 finish()。缺了这组 dispose，turn 里
    // beginHold()/updateAgentRun() 起的轮询 interval 会一直挂在事件循环上，
    // 让 bun test worker 在文件收尾阶段 98% CPU 空转不退出。
    runRegistryPoller.dispose();
    idleHeapReleaser.cancel();
    runCompletionWatcher.dispose();
    activityIndicator.dispose();
    // 部署完成 SSE 订阅（交互式分支才建立）：中止在途请求 + 停掉重连循环。
    deployWakeLifecycle.dispose?.();
    rl.close();
  }
} finally {
  accountSessionRuntime.dispose();
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
