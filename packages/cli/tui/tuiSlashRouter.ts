// ── S5 迁移：runSubmittedLine 的 slash 命令 bus 分发已从 readlineWorkspace.ts
// 原样迁入本模块。handleTuiInput（解析 + 路由，产出 action）仍在
// sessionDispatch.ts 不动；本模块承接的是 readlineWorkspace 侧的「命令后执行
// 编排」：按 action 类型分发到 /clear /new /compact /self-update /theme-refresh
// /pick-* /copy-* /! shell /chat 等分支，覆盖 emitCommandOutput、历史写入、
// exit 处理等。函数体为逐行搬移，仅把闭包可变绑定（state / buffer / cursorPos /
// fixedInput）改写为 host 上的 getter/setter 直通（S2 模式可变引用语义，禁止
// 快照），分支顺序、输出文本、错误处理路径零改动。
// 依赖方向单向：本模块 → tuiTurnRunner / session / tuiHistory 等叶子模块；
// 本模块禁止回指 readlineWorkspace.ts。
import { handleTuiInput, type TuiState } from "./session";
import {
  ensureChatQueueBinding,
  isInteractiveInput,
  runOneAgentTurn,
  type AgentTurnContext,
  type SelfUpdater,
  type WorkspaceOptions,
} from "./tuiTurnRunner";
import type { LocalAgentActionGate } from "../../agent-runtime/localLoop";
import type { PermissionRequest } from "../../agent-runtime/actionGate";
import type { AgentRuntimeToolResult } from "../agentRuntimeLocal";
import { resolvePlatformAuthToken } from "../../agent-runtime/providerResolution";
import { deleteDbRecord } from "../agentRecordHelpers";
import {
  resolveAgentContextWindow,
  resolveAgentModelIdentity,
} from "../client/tokenUsage";
import { estimateDefaultCliContextTokens } from "../client/estimateCliContext";
import { compactDialog } from "../client/compactDialog";
import {
  saveProfileLocale,
} from "../client/profileConfig";
import { setMathRenderingEnabled } from "../client/mathText";
import { readPipeText, spawnProcess } from "../processSpawn";
import {
  clearCollapsedPasteStore,
  type CollapsedPasteStore,
} from "../../core/collapsedPaste";
import { toErrorMessage } from "core/errorMessage";
import { t } from "./i18n";
import { stripAnsi } from "./tuiAnsi";
import { detectGitStatusAsync } from "./gitStatus";
import {
  MAX_TUI_HISTORY_TURNS,
  resetHistoryFrameDiffCache,
  type TurnHistory,
} from "./tuiHistory";
import { formatAgentSwitchMessage, runAgentPicker } from "./agentPicker";
import { loadDialogHistoryForDisplay, runDialogPicker } from "./dialogPicker";
import { resolveAttachmentImageUrls } from "./pasteImage";
import { themeText, applyDetectedBackground } from "./theme";
import { detectTerminalBackground } from "./detectBackground";
import { resolveCliColorEnabled } from "../client/terminalStyles";
import {
  enterAltScreen,
  leaveAltScreen,
  type FixedInputController,
} from "./tuiRawInput";
import type { DialogHost } from "./dialogHost";

/**
 * slash 分发的宿主依赖。`state` 在 runTuiWorkspace 作用域内是可变 let 绑定
 * （分支内反复以 `state = { ...state, ... }` 折叠状态回写），必须以
 * getter/setter 直通保持可变引用语义；`buffer` / `cursorPos` / `fixedInput`
 * 为只读直通（分支内仅读取并以 fixedInput.repaint 重绘 composer）。
 * `installAltScreenRestoreHandlers` 是 readlineWorkspace 的模块级导出，为避免
 * 反向依赖经 host 注入。
 */
export interface SlashDispatchHost {
  state: TuiState;
  readonly buffer: string;
  readonly cursorPos: number;
  readonly fixedInput: FixedInputController;

  readonly history: TurnHistory;
  readonly pasteStore: CollapsedPasteStore;
  readonly dialogHost: DialogHost;
  readonly input: NodeJS.ReadableStream;
  readonly output: NodeJS.WritableStream;
  readonly options: WorkspaceOptions;
  readonly fetchImpl: typeof fetch;
  readonly turnCtx: AgentTurnContext;

  readonly emitCommandOutput: (text: string, command?: string) => void;
  readonly renderHistoryToOutput: () => void;
  readonly scheduleRender: () => void;
  readonly seedDialogCreditsBase: (dialogId: string, dialogKey: string) => void;
  readonly persistExplicitAgentSwitch: (previousAgentKey: string) => boolean;
  // readlineWorkspace 模块级函数（默认档不落盘的 agent 选择持久化），
  // pick-agent 分支与 persistExplicitAgentSwitch 共用；为避免反向依赖经 host 注入。
  readonly persistAgentSelection: (
    state: TuiState,
    env: NodeJS.ProcessEnv | undefined,
  ) => void;
  readonly writeClipboard: (text: string) => Promise<void>;
  readonly selfUpdater: SelfUpdater;
  readonly spawnRunner: typeof spawnProcess;
  readonly installAltScreenRestoreHandlers: (output: NodeJS.WritableStream) => void;
}

// 最近一条 assistant 回复（/copy last 用）。原为 runTuiWorkspace 闭包函数，
// 迁移时把唯一的闭包依赖 history 提升为参数，函数体逐行未动。
const readLatestAssistantReply = (history: TurnHistory): string | null => {
  const lastReply = [...history.turns]
    .reverse()
    .find((turn) => turn.role === "assistant")?.content;
  const text = lastReply ? stripAnsi(lastReply).trim() : "";
  return text || null;
};
// Build a full Markdown transcript of the conversation (User + Assistant),
// including the currently streaming turn if any. Used by /copy all.
const buildConversationMarkdown = (h: TurnHistory): string => {
  const parts: string[] = [];
  for (const turn of h.turns) {
    const role = turn.role === "user" ? "User" : "Assistant";
    const content = stripAnsi(turn.content).trim();
    if (!content) continue;
    parts.push(`## ${role}\n\n${content}`);
  }
  if (h.currentRole && h.currentContent) {
    const role = h.currentRole === "user" ? "User" : "Assistant";
    const content = stripAnsi(h.currentContent).trim();
    if (content) {
      parts.push(`## ${role}\n\n${content}`);
    }
  }
  return parts.join("\n\n");
};

/**
 * 处理一条已提交输入行：经 handleTuiInput 解析出 action 后执行对应的
 * slash 编排分支。返回 true 表示会话应退出（/exit、/update scheduled）。
 * actionGateHandler / confirmDestructiveAction 仅由 chat 分支透传给
 * runOneAgentTurn，与原 runSubmittedLine 签名语义一致。
 */
export async function runSubmittedSlashLine(
  line: string,
  host: SlashDispatchHost,
  actionGateHandler: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>,
  confirmDestructiveAction?: (request: PermissionRequest) => Promise<boolean>,
): Promise<boolean> {
  const {
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
  } = host;
  const result = handleTuiInput(line, host.state);
  const previousAgentKey = host.state.agentKey;
  host.state = result.nextState;

  // In interactive mode the transcript pane is owned by renderHistory; a raw
  // output.write lands inside the scroll region and is wiped by the next
  // composer repaint (\x1b[J), which made /context et al invisible. Route
  // command echo + output through history instead.
  //
  // 非 chat 的 slash 命令统一走 local turn：命令行 + 输出合并成一条
  // role="local" 的回显，与 user/assistant 对话视觉区分，翻历史不再
  // 把 /switch 这类命令伪装成一轮对话。action 类命令（pick-agent 等）
  // 无 output 时不写 history。/exit 的 "bye" 也不进 history——退出后
  // 历史立即销毁，写 local turn 纯浪费且可能被清屏前闪烁。
  //
  // 非交互模式（管道/脚本）下仍需输出 result.output，但走 emitCommandOutput
  // 内部的 output.write 分支（不写 history），command 传空因为非交互模式
  // 没有"命令回显"的视觉概念。
  const interactive = isInteractiveInput(input);

  if (result.action?.type !== "exit" && result.output) {
    // 交互模式下 chat 的图片预览（"found image: ..."）不在此 raw write：
    // renderHistory 拥有 transcript pane，raw write 会落进滚动区、被下一条
    // composer 重绘（\x1b[J）抹掉——交互模式的 preview 本就走 local turn /
    // history 渲染通道。但非交互（管道/脚本）模式下没有 composer 重绘问题，
    // 预览对脚本用户有价值（确认图片被检测到），因此仅当（非 chat）或
    // （非交互时 chat）才 emit。exit 走下方独立分支，不在此 emit。
    const shouldEmit = result.action?.type !== "chat" || !interactive;
    if (shouldEmit) emitCommandOutput(result.output, interactive ? line.trim() : "");
  }

  if (host.state.agentKey !== previousAgentKey) {
    // 用户显式切换 agent（/agent <name>、/switch <name> 或 picker）：
    // 清掉这条对话首轮 auto-route 的缓存，否则下一轮会被缓存切回原
    // agent（典型场景：原 agent 429 后想换一个）。判定只看 agentKey 是否
    // 变化，不耦合 "Switched to " 这类输出文案——文案一旦 i18n 化或调整，
    // 字符串前缀判定就会漏掉切换、导致缓存不清、切换「不生效」回归。
    persistExplicitAgentSwitch(previousAgentKey);
  }

  if (result.action?.type === "exit") {
    // "bye" 作为退出前最后一帧的视觉确认，直接 output.write 而不进
    // history——退出后 history 立即销毁，写 local turn 没有意义。
    if (result.output) output.write(`${result.output}\n`);
    return true;
  }

  if (result.action?.type === "clear") {
    if (result.action.dialogId) {
      const authToken = resolvePlatformAuthToken(options.env ?? {});
      try {
        await deleteDbRecord({
          // The messages delete endpoint expects the bare dialogId; dialogKey
          // is the persisted dialog record key and has a different prefix.
          dbKey: result.action.dialogId,
          deleteOptions: { type: "messages" },
          authToken,
          fetchImpl,
          serverUrl: host.state.serverUrl,
        });
        emitCommandOutput(t("clearedDialog"));
      } catch (error) {
        emitCommandOutput(`[nolo] Clear failed: ${toErrorMessage(error)}\n`);
        return false;
      }
    }
    clearCollapsedPasteStore(pasteStore);
    // Clear removes the persisted messages and clears the dialog identity
    // (like /new), so the next turn starts a fresh dialog instead of
    // continuing the cleared one.
    // Drop usage-derived context immediately so the composer reflects the
    // empty dialog before the next turn starts.
    host.state = {
      ...host.state,
      turnTokens: undefined,
      // 新对话的积分累计从 0 重新开始：既清掉旧对话的本会话累加，也清掉旧对话
      // 的历史基数（新对话没有历史）。
      sessionCredits: undefined,
      dialogCreditsBase: undefined,
      cachedMemoryOverlay: undefined, // 新对话重新加载记忆
      estimatedContextTokens: estimateDefaultCliContextTokens({
        cwd: host.state.cwd,
        agentKey: host.state.agentKey,
        userLanguage: host.state.userLanguage,
        ...resolveAgentModelIdentity({
          agentKey: host.state.agentKey,
          agentName: host.state.agentName,
        }),
      }),
    };
    history.turns.length = 0;
    history.currentRole = null;
    history.currentContent = "";
    history.scrollTop = 0;
    history.followBottom = true;
    renderHistoryToOutput();
    // Re-emit after the wipe: the pre-clear echo of /new was just discarded
    // along with the rest of the transcript.
    const sparkle = [
      "",
      `     🏔  ${t("startedFreshDialog")}`,
      "     ────────────────────────────",
      "",
    ].join("\n");
    emitCommandOutput(themeText(sparkle, "chrome", resolveCliColorEnabled()));
  }
  if (result.action?.type === "compact") {
    const runner = options.compactRunner ?? compactDialog;
    const authToken = resolvePlatformAuthToken(options.env ?? {});
    const compactStart = Date.now();
    try {
      const compactResult = await runner({
        serverUrl: host.state.serverUrl,
        authToken,
        dialogId: result.action.dialogId,
        summaryLlmCaller: options.summaryLlmCaller,
      });
      const elapsedSec = ((Date.now() - compactStart) / 1000).toFixed(1);
      host.state = {
        ...host.state,
        dialogId: compactResult.dialogId,
        dialogKey: compactResult.dialogKey,
        dialogLabel: compactResult.dialogId,
        dialogTitle: host.state.dialogTitle,
        // Compact forks into a fresh dialog that only inherits the summary,
        // not the full message history. Drop usage-derived context so the
        // composer chip falls back to the default CLI surface estimate and
        // the context percentage visibly drops. Mirrors the /clear reset.
        turnTokens: undefined,
        // compact fork 出新的官方 dialog，计费从新记录开始累计；新 dialog 没有
        // 历史基数，本会话累加也随之归零。
        sessionCredits: undefined,
        dialogCreditsBase: undefined,
        cachedMemoryOverlay: undefined, // compact 创建新 dialog，重新加载记忆
        estimatedContextTokens: estimateDefaultCliContextTokens({
          cwd: host.state.cwd,
          agentKey: host.state.agentKey,
          userLanguage: host.state.userLanguage,
          ...resolveAgentModelIdentity({
            agentKey: host.state.agentKey,
            agentName: host.state.agentName,
          }),
        }),
      };
      const elapsed = `${elapsedSec}s`;
      const message = compactResult.summaryGenerated
        ? compactResult.compactedMessageCount > 0
          ? t(
              "compactSuccessWithCount",
              result.action.dialogId,
              compactResult.dialogId,
              elapsed,
              String(compactResult.compactedMessageCount),
            )
          : t(
              "compactSuccess",
              result.action.dialogId,
              compactResult.dialogId,
              elapsed,
            )
        : t(
            "compactForked",
            result.action.dialogId,
            compactResult.dialogId,
            elapsed,
          );
      output.write(`${message}\n`);
    } catch (error: any) {
      output.write(
        `[nolo] Compact failed: ${toErrorMessage(error)}\n`
      );
    }
  }

  if (result.action?.type === "self-update") {
    try {
      const update = await selfUpdater(output);
      if (update.exitCode === 0 && update.disposition === "scheduled") {
        output.write("Update is ready. Nolo will now exit safely; installation starts after shutdown.\n");
        return true;
      }
      if (update.exitCode === 0) {
        output.write("Update finished. Restart nolo to use the new version.\n");
      } else {
        output.write("Update failed. Check the error above, then run /update again or use nolo update.\n");
      }
    } catch (error) {
      output.write(`${toErrorMessage(error)}\n`);
      output.write("Update failed. Check the error above, then run /update again or use nolo update.\n");
    }
  }

  if (result.action?.type === "theme-refresh") {
    // Re-probe the terminal background on demand (OSC 11) so a runtime
    // theme switch in Ghostty et al. is picked up by the internal palette.
    // emitCommandOutput renders the history and repaints the composer with
    // the updated brightness, so no extra repaint is needed here.
    const detected = await detectTerminalBackground({
      stdin: input as NodeJS.ReadStream & { setRawMode?: (mode: boolean) => void },
      stdout: output as NodeJS.WritableStream & { isTTY?: boolean },
      allowSystemFallback: true,
    });
    if (detected && applyDetectedBackground(detected)) {
      emitCommandOutput(t("themeRefreshed", detected.brightness));
    } else if (detected) {
      // Already matched — still echo the current brightness for the user.
      emitCommandOutput(t("themeRefreshed", detected.brightness));
    } else {
      emitCommandOutput(t("themeRefreshFailed"));
    }
  }

  if (result.action?.type === "cwd-refresh") {
    // /cd 已把 state.cwd 切到新目录：用新 cwd 重测 gitStatus（与 turn 结束
    // 后 refreshGitStatus 的检测时机一致），写回 state 后重绘状态行/composer。
    // 异步检测不阻塞；结果到达时若会话已退出则丢弃（与 readlineWorkspace 的
    // sessionEnded 卫兵语义一致）。与 refreshGitStatus 相同的 kill switch：
    // 测试/禁用场景不 spawn git。
    if ((options.env?.NOLO_CLI_GIT_STATUS ?? process.env.NOLO_CLI_GIT_STATUS) !== "0") {
      const gitStatus = await detectGitStatusAsync(host.state.cwd);
      if (gitStatus !== undefined) {
        host.state = { ...host.state, gitStatus };
      }
    }
    // 切换消息写入对话历史（role="local"，与 /switch 的消息同通道），
    // 用户可见且 agent 后续 turn 能读到（见 runAgentChat 的上下文组装）。
    if (result.action.switchMessage) {
      emitCommandOutput(result.action.switchMessage);
    }
    scheduleRender();
  }

  if (result.action?.type === "pick-agent") {
    try {
      const pickResult = await dialogHost.run((anchor) =>
        runAgentPicker({
          currentKey: host.state.agentKey,
          env: options.env ?? process.env,
          input: input as NodeJS.ReadStream,
          output: output as NodeJS.WritableStream,
          ...anchor,
        }),
      );
      if (pickResult.kind === "list") {
        output.write(`${pickResult.output}\n`);
      } else if (pickResult.kind === "selected") {
        host.state = {
          ...host.state,
          agentName: pickResult.name,
          agentKey: pickResult.key,
          contextWindow: resolveAgentContextWindow({
            agentKey: pickResult.key,
            agentName: pickResult.name,
            model: pickResult.model,
          }),
          estimatedContextTokens: estimateDefaultCliContextTokens({
            cwd: host.state.cwd,
            agentKey: pickResult.key,
            agentName: pickResult.name,
            model: pickResult.model,
            userLanguage: host.state.userLanguage,
          }),
          ...(pickResult.apiSource ? { apiSource: pickResult.apiSource } : {}),
          cachedMemoryOverlay: undefined, // 切换 agent 后重新加载记忆
        };
        persistAgentSelection(host.state, options.env ?? process.env);
        output.write(
          `${formatAgentSwitchMessage({
            name: pickResult.name,
            dialogId: host.state.dialogId,
          })}\n`
        );
      } else {
        output.write(`${t("agentSwitchCancelled")}\n`);
      }
    } catch (error) {
      output.write(
        `[nolo] Agent picker failed: ${toErrorMessage(error)}\n`
      );
    }
  }

  if (result.action?.type === "set-locale") {
    try {
      saveProfileLocale(result.action.locale);
    } catch {
      // Locale still applies for this session; persistence is best-effort.
    }
  }

  if (result.action?.type === "set-mouse") {
    host.fixedInput.setMouseEnabled(result.action.enabled);
  }

  if (result.action?.type === "set-math") {
    setMathRenderingEnabled(result.action.enabled);
  }

  if (result.action?.type === "set-altscreen") {
    // Both helpers are idempotent and no-op on non-TTY, so a repeated
    // /altscreen on|off costs nothing. Re-installing the restore handlers on
    // re-entry keeps the exit/signal path pointed at the current output.
    if (result.action.enabled) {
      enterAltScreen(output);
      installAltScreenRestoreHandlers(output);
    } else {
      leaveAltScreen(output);
    }
    // The freshly switched host.buffer is blank — repaint or the user stares at
    // an empty screen until the next event.
    resetHistoryFrameDiffCache(output);
    renderHistoryToOutput();
    host.fixedInput.repaint(host.buffer, host.cursorPos);
  }

  if (result.action?.type === "copy-last") {
    const text = readLatestAssistantReply(history) ?? "";
    if (!text) {
      emitCommandOutput(t("copyNothing"));
    } else {
      try {
        await writeClipboard(text);
        emitCommandOutput(t("copiedLastReply"));
      } catch (error) {
        // Headless / container shells often lack xclip/pbcopy; surface the
        // reply text so the user can still copy it manually instead of only
        // seeing a raw "spawn xclip ENOENT".
        const message = toErrorMessage(error);
        const missingClipboard =
          /ENOENT|not found|no such file|clipboard|spawn|EPIPE|EACCES/i.test(message) ||
          /clipboard/i.test(String(error?.constructor?.name ?? ""));
        if (missingClipboard) {
          emitCommandOutput(t("copyUnavailable"));
          emitCommandOutput(text);
        } else {
          emitCommandOutput(`[nolo] ${t("copyFailed")}: ${message}`);
        }
      }
    }
  }

  if (result.action?.type === "copy-all") {
    const text = buildConversationMarkdown(history);
    if (!text) {
      emitCommandOutput(t("copyAllNothing"));
    } else {
      try {
        await writeClipboard(text);
        emitCommandOutput(t("copiedAllHistory"));
      } catch (error) {
        const message = toErrorMessage(error);
        const missingClipboard =
          /ENOENT|not found|no such file|clipboard|spawn|EPIPE|EACCES/i.test(message) ||
          /clipboard/i.test(String(error?.constructor?.name ?? ""));
        if (missingClipboard) {
          emitCommandOutput(t("copyUnavailable"));
        } else {
          emitCommandOutput(`[nolo] ${t("copyFailed")}: ${message}`);
        }
      }
    }
  }

  if (result.action?.type === "pick-dialog") {
    const interactivePicker = isInteractiveInput(input);
    try {
      const pickResult = await dialogHost.run((anchor) =>
        (options.dialogPickerRunner ?? runDialogPicker)({
          env: options.env ?? process.env,
          input: input as NodeJS.ReadStream,
          output: output as NodeJS.WritableStream,
          interactive: interactivePicker,
          ...anchor,
          bottomAnchored: interactivePicker,
        }),
      );
      if (pickResult.kind === "selected") {
        const loadedTurns = await (
          options.dialogHistoryLoader ?? loadDialogHistoryForDisplay
        )({
          dialog: pickResult.dialog,
          env: options.env ?? process.env,
        });
        const restored = loadedTurns.slice(-MAX_TUI_HISTORY_TURNS);
        history.turns.length = 0;
        history.turns.push(...restored);
        history.currentRole = null;
        history.currentContent = "";
        history.scrollTop = 0;
        history.followBottom = true;
        host.state = {
          ...host.state,
          dialogId: pickResult.dialog.id,
          dialogKey: pickResult.dialog.dbKey,
          dialogLabel: pickResult.dialog.title || pickResult.dialog.id,
          dialogTitle: pickResult.dialog.title,
          turnTokens: undefined,
          // 切换对话先清空上一个对话的积分，等下面异步 seed 成功后回填历史基数；
          // 若读取失败也不至于把旧对话的累计值残留显示在状态行。
          sessionCredits: undefined,
          dialogCreditsBase: undefined,
          cachedMemoryOverlay: undefined, // 切换对话后重新加载记忆
        };
        // 切到已有对话：读一次 dialog 记录的 totalCost 当历史基数，之后本会话
        // 的消费由每轮本地累加叠加在它上面。
        seedDialogCreditsBase(pickResult.dialog.id, pickResult.dialog.dbKey);
        clearCollapsedPasteStore(pasteStore);
        emitCommandOutput(
          `${t("resumedDialogPrefix")}: ${pickResult.dialog.title} (${pickResult.dialog.id})`,
        );
      } else if (pickResult.kind === "list") {
        emitCommandOutput(pickResult.output);
      } else if (pickResult.kind === "error") {
        emitCommandOutput(`[nolo] ${pickResult.message}`);
      } else {
        emitCommandOutput(t("dialogResumeCancelled"));
      }
    } catch (error) {
      emitCommandOutput(
        `[nolo] History failed: ${toErrorMessage(error)}`,
      );
    }
  }

  if (result.action?.type === "list-agents") {
    try {
      const pickResult = await runAgentPicker({
        currentKey: host.state.agentKey,
        env: options.env ?? process.env,
        input: input as NodeJS.ReadStream,
        output: output as NodeJS.WritableStream,
        interactive: false,
      });
      if (pickResult.kind === "list") {
        output.write(`${pickResult.output}\n`);
      }
    } catch (error) {
      output.write(
        `[nolo] Agent list failed: ${toErrorMessage(error)}\n`
      );
    }
  }

  if (result.action?.type === "shell-command") {
    const shellCmd = result.action.command;
    if (!shellCmd) {
      emitCommandOutput("[nolo] Error: No command specified after !");
    } else {
      emitCommandOutput(`Executing: ${shellCmd}`);
      try {
        const shellInvocation =
          process.platform === "win32"
            ? [process.env.ComSpec || "cmd.exe", "/d", "/s", "/c", shellCmd]
            : ["/bin/sh", "-c", shellCmd];
        const proc = spawnRunner({
          cmd: shellInvocation,
          cwd: host.state.cwd,
          env: options.env ?? process.env,
          stdout: "pipe",
          stderr: "pipe",
        });

        const [stdoutText, stderrText] = await Promise.all([
          readPipeText(proc.stdout),
          readPipeText(proc.stderr),
        ]);

        const exitCode = await proc.exited;

        if (stdoutText) {
          emitCommandOutput(`\`\`\`\n${stdoutText.trim()}\n\`\`\``);
        }
        if (stderrText) {
          emitCommandOutput(themeText(`\`\`\`\nError:\n${stderrText.trim()}\n\`\`\``, "danger", resolveCliColorEnabled()));
        }
        if (exitCode !== 0) {
          emitCommandOutput(themeText(`[nolo] Command exited with code ${exitCode}.`, "warning", resolveCliColorEnabled()));
        }
      } catch (error) {
        emitCommandOutput(
          themeText(`[nolo] Command execution failed: ${toErrorMessage(error)}`, "danger", resolveCliColorEnabled())
        );
      }
    }
  }

  if (result.action?.type === "chat") {
    // 读取本轮待发送附件为 dataUrl（chat action 内联路径 + host.state 暂存附件）。
    // 失败回调直接写 output。清空动作留在调用点，与下方"发送即消费"注释一起。
    const { imageUrls } = await resolveAttachmentImageUrls({
      actionImagePaths: result.action.imagePaths,
      attachedImages: host.state.attachedImages,
      onFailure: (_path, err) =>
        output.write(`[nolo] image skipped: ${err.message}\n`),
    });
    // 本轮待发送暂存区：发送即消费。imageUrls 已在上面确定，这里立即清空，
    // 避免纯文字轮把上一轮附件残留重读重发给上游（累积至 ~9 轮撞 8 张
    // 上限报 UPSTREAM_400）。必须在异步 turn 开始前同步清空：若等 turn 成功
    // 后才清，会误删用户在 busy 期间为下一条消息粘贴的新图。历史消息里的
    // 图片不动（模型仍可经历史回放引用旧图）。
    host.state = {
      ...host.state,
      attachedImages: [],
    };

    history.followBottom = true;
    // Notify the queue core that a direct (non-drained) turn is starting,
    // then execute it via the shared runOneAgentTurn helper. After it ends,
    // notifyTurnEnd drives the drain cascade for any messages the user
    // queued while this turn was running.
    const binding = ensureChatQueueBinding(turnCtx, actionGateHandler, confirmDestructiveAction);
    binding.notifyTurnStart();
    try {
      const outcome = await runOneAgentTurn(
        turnCtx,
        result.action.message,
        imageUrls,
        actionGateHandler,
        confirmDestructiveAction,
      );
      await binding.notifyTurnEnd(outcome);
    } catch (err) {
      // A throw here (e.g. a post-stream persistence / server-replication
      // failure inside the agent runner) must NOT leave the queue machine
      // stuck in `running`. That was the root cause of "the reply finished
      // but every later message silently goes to the queue and never
      // drains": notifyTurnEnd was never reached, so `running` stayed true
      // and no future turn-end drove a drain. Report a failed (non-aborted)
      // turn-end — chatQueueMachine keeps the queue on failure — and surface
      // the error instead of swallowing it.
      await binding.notifyTurnEnd({ ok: false, aborted: false });
      emitCommandOutput(
        `${t("turnFailed")}${err instanceof Error && err.message ? `\n${err.message}` : ""}`,
      );
    }
    if (host.fixedInput.active) host.fixedInput.repaint(host.buffer, host.cursorPos);
  }

  return false;
}
