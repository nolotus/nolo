export type CliLocale = "zh" | "en";

const ZH_PATTERNS = /^zh/i;

type EnvLike = Record<string, string | undefined>;

export function parseCliLocale(raw: string | undefined): CliLocale | null {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) return null;
  if (ZH_PATTERNS.test(normalized)) return "zh";
  if (normalized === "en" || normalized.startsWith("en")) return "en";
  return null;
}

function detectLocaleFromEnv(env: EnvLike): CliLocale | null {
  // Explicit override first: profile config surfaces the saved /lang choice
  // through NOLO_LANG, and users can also export it directly.
  const explicit = parseCliLocale(env.NOLO_LANG);
  if (explicit) return explicit;
  const candidates = [env.LC_ALL, env.LC_CTYPE, env.LANG].filter(Boolean);
  for (const candidate of candidates) {
    if (ZH_PATTERNS.test(candidate!)) return "zh";
    if (candidate && !candidate.startsWith("C.") && !candidate.startsWith("POSIX")) {
      return "en";
    }
  }
  return null;
}

function detectLocale(env: EnvLike): CliLocale {
  return detectLocaleFromEnv(env) ?? "zh";
}

let currentLocale: CliLocale = detectLocale(process.env);

export function getCliLocale(): CliLocale {
  return currentLocale;
}

export function setCliLocale(locale: CliLocale) {
  currentLocale = locale;
}

/**
 * Re-detect the locale from a specific env (the TUI passes its merged
 * profile+process env, which module-load detection cannot see).
 */
export function initCliLocale(env: EnvLike = process.env) {
  currentLocale = detectLocale(env);
}

/**
 * Windows terminals (conhost / Windows Terminal default mode) send the same
 * bare \r for Shift+Enter as for plain Enter, so the TUI cannot distinguish
 * the two. Ctrl+J (LF) is supported as newline on every platform/terminal.
 */
export function newlineHint(platform: string = process.platform): string {
  return platform === "win32" ? "Ctrl+J" : "Shift+Enter";
}

/**
 * Rotating welcome-screen tips, one per day. The composer placeholder already
 * covers "type / for commands", so these spend the welcome screen's one hint
 * line on capability discovery instead of repeating it. Day-seeded (not
 * random) so the tip is stable across restarts within a day.
 */
const WELCOME_TIPS: Record<CliLocale, string[]> = {
  en: [
    `Tip: ${newlineHint()} for a newline; /help lists all commands.`,
    "Tip: drag an image file into the terminal — nolo sees it. A plain path works too.",
    "Tip: /doc attach <doc> brings a doc into this conversation's context.",
    "Tip: /theme switches colors; terminal mode follows your terminal's day/night.",
    "Tip: /history resumes a recent dialog; /agents lists your agents.",
  ],
  zh: [
    `提示：${newlineHint()} 换行；/help 列出全部命令。`,
    "提示：把图片文件拖进终端最省事；也能直接输入图片路径。",
    "提示：/doc attach <doc> 把文档挂进当前对话上下文。",
    "提示：/theme 切换配色；日夜间跟随终端主题。",
    "提示：/history 恢复最近对话；/agents 列出你的智能体。",
  ],
};

export function dailyWelcomeTip(now: number = Date.now()): string {
  const tips = WELCOME_TIPS[currentLocale];
  const day = Math.floor(now / 86_400_000);
  return tips[day % tips.length];
}

const STRINGS = {
  // Welcome hint lives in WELCOME_TIPS + dailyWelcomeTip() (rotating daily
  // tips); the composer placeholder already covers "type / for commands".
  promptLabel: {
    en: "❯ ",
    zh: "❯ ",
  },
  continueLabel: {
    en: "│ ",
    zh: "│ ",
  },
  placeholder: {
    en: "Type a message or / for commands...",
    zh: "输入消息，或用 / 查看命令…",
  },
  newDialog: {
    en: "new dialog",
    zh: "新对话",
  },
  startedFreshDialog: {
    en: "Started a fresh dialog.",
    zh: "已开始新对话。",
  },
  clearingDialog: {
    en: "Clearing current dialog messages...",
    zh: "正在清除当前对话消息…",
  },
  clearedDialog: {
    en: "Cleared current dialog messages.",
    zh: "已清除当前对话消息。",
  },
  persistentProcessesLeft: {
    en: "{0} persistent process(es) left running in the background.",
    zh: "仍有 {0} 个常驻后台进程在后台继续运行。",
  },
  clearNoDialog: {
    en: "No current dialog messages to clear.",
    zh: "当前没有可清除的对话消息。",
  },
  clearUsage: {
    en: "Usage: /clear",
    zh: "用法：/clear",
  },
  contextNextClear: {
    en: "clear current dialog messages",
    zh: "清除当前对话消息",
  },
  bye: {
    en: "Bye.",
    zh: "再见。",
  },
  resumedDialogPrefix: {
    en: "Resumed dialog",
    zh: "已恢复对话",
  },
  resumeInvalidId: {
    en: "does not look like a dialog id. Use /history to pick one.",
    zh: "看起来不是 dialog id。用 /history 从列表里选一个。",
  },
  dialogResumeCancelled: {
    en: "Dialog resume cancelled.",
    zh: "已取消恢复对话。",
  },
  agentSwitchCancelled: {
    en: "Agent switch cancelled.",
    zh: "已取消切换 agent。",
  },
  agentPickerLoading: {
    en: "Loading agents…",
    zh: "正在加载 agent 列表…",
  },
  historyPickerTitle: {
    en: "Resume dialog (↑↓ Enter Esc)",
    zh: "恢复对话（↑↓ 移动 · Enter 选择 · Esc 取消）",
  },
  noDialogsYet: {
    en: "No dialogs yet.",
    zh: "还没有历史对话。",
  },
  langUsage: {
    en: "Usage: /lang <zh|en>",
    zh: "用法：/lang <zh|en>",
  },
  stopHint: {
    en: "Esc to stop",
    zh: "Esc 停止回复",
  },
  flushQueuedIdleHint: {
    en: "Flushed {0} queued messages as one.",
    zh: "已把 {0} 条排队消息合并发送。",
  },
  flushQueuedBusyHint: {
    en: "Stopped this reply and flushed {0} queued messages as one.",
    zh: "已停止当前回复，并把 {0} 条排队消息合并发送。",
  },
  turnStopped: {
    en: "Stopped this reply.",
    zh: "已停止本次回复。",
  },
  turnStoppedToolPending: {
    en: "Stopped waiting. {0} may still be finishing in the background — its result won't be added to this conversation.",
    zh: "已停止等待。{0} 可能仍在后台完成，其结果不会计入本次对话。",
  },
  turnStopping: {
    en: "Stopping… press Esc again to force",
    zh: "正在停止…再按一次 Esc 强制停止",
  },
  forceStopped: {
    en: "Force stopped. Background tasks may still be finishing.",
    zh: "已强制停止，后台任务可能仍在收尾。",
  },
  turnFailed: {
    en: "This reply failed. Queued messages are kept — press Enter to resend.",
    zh: "本次回复出错。已排队的消息仍保留，按 Enter 可重新发送。",
  },
  quotaExhaustedHint: {
    en: "This agent seems to have hit a quota/rate limit (HTTP 429).\nUse /agent to switch to another agent and keep going — the dialog context is preserved.",
    zh: "当前 agent 似乎额度/速率受限（429）。\n可以用 /agent 切换到其他 agent 后继续，同一对话会保留上下文。",
  },
  balanceExhaustedHint: {
    en: "Your message is saved in this dialog — top up, then send again or say \"continue\" to pick up where you left off.",
    zh: "你刚发的话已保存在当前对话里——充值后直接再说一句或说「继续」即可接着聊，不会丢上下文。",
  },
  balanceInsufficientReason: {
    en: "Insufficient balance: requires > {required}, current balance {current}.",
    zh: "余额不足：需要余额 > {required}，当前 {current}。",
  },
  dialogPreservedHint: {
    en: "This turn failed, but the dialog is kept. Send another message (or say \"continue\") to keep going in the same conversation.",
    zh: "本轮失败了，但对话已保留。直接再说一句（或说「继续」）即可在同一对话里接着聊。",
  },
  dialogNotSavedHint: {
    en: "This turn did not create a dialog. Your next message will start a new conversation — restate what you need.",
    zh: "本轮没有建成对话。下一句会是新对话——请把你想做的事再说一遍。",
  },
  copiedLastReply: {
    en: "Copied the last reply to the clipboard.",
    zh: "已复制最后一条回复到剪贴板。",
  },
  copyNothing: {
    en: "Nothing to copy yet.",
    zh: "还没有可复制的内容。",
  },
  copyFailed: {
    en: "Copy failed",
    zh: "复制失败",
  },
  copyUnavailable: {
    en: "Clipboard is unavailable in this environment. The last reply was printed above for manual copy.",
    zh: "当前环境没有可用的剪贴板。最后一条回复已打印在上方，可手动复制。",
  },
  copyUsage: {
    en: "Usage: /copy",
    zh: "用法：/copy",
  },
  copiedToClipboard: {
    en: "✓ Copied to clipboard.",
    zh: "✓ 已复制到剪贴板。",
  },
  copiedSelection: {
    en: "✓ Copied the selection to the clipboard.",
    zh: "✓ 已复制选区到剪贴板。",
  },
  copiedSelectionBusy: {
    en: "✓ Copied the selection to the clipboard. Press Esc to stop generating.",
    zh: "✓ 已复制选区到剪贴板。按 Esc 停止生成。",
  },
  copiedAllHistory: {
    en: "✓ Copied the full conversation to the clipboard.",
    zh: "✓ 已复制完整对话到剪贴板。",
  },
  copyAllNothing: {
    en: "No conversation to copy yet.",
    zh: "还没有可复制的对话内容。",
  },
  ctrlCExitHint: {
    en: "[提示] 再按一次 Ctrl+C 退出 | 输入 /copy 可复制最新回复",
    zh: "[提示] 再按一次 Ctrl+C 退出 | 输入 /copy 可复制最新回复",
  },
  ctrlCClearedDraft: {
    en: "Draft cleared.",
    zh: "输入草稿已清空。",
  },
  // 空草稿按 Backspace 逐个撤销附件（composer 附件条）。
  attachmentRemovedHint: {
    en: "Removed attachment {0}, {1} remaining",
    zh: "已移除附件 {0}，剩余 {1} 张",
  },
  historyNoToken: {
    en: "History requires an auth token. Run `nolo login` or set AUTH_TOKEN.",
    zh: "查看历史对话需要登录凭证。请运行 `nolo login` 或设置 AUTH_TOKEN。",
  },
  historyBadToken: {
    en: "Could not read a user id from AUTH_TOKEN. Run `nolo login` again.",
    zh: "无法从 AUTH_TOKEN 解析出用户 id，请重新运行 `nolo login`。",
  },
  mouseOn: {
    en: "Mouse mode on: wheel scrolls the transcript; hold Shift (or Option/Fn) to select text.",
    zh: "鼠标模式已开启：滚轮滚动对话记录；按住 Shift（或 Option/Fn）可拖选复制。",
  },
  mouseOff: {
    en: "Mouse mode off: drag to select/copy freely; scroll with PageUp/PageDown.",
    zh: "鼠标模式已关闭：可直接拖选复制；用 PageUp/PageDown 滚动对话记录。",
  },
  mouseUsage: {
    en: "Usage: /mouse <on|off>",
    zh: "用法：/mouse <on|off>",
  },
  mathOn: {
    en: "Math rendering on: LaTeX formulas rendered with Unicode symbols.",
    zh: "数学公式渲染已开启：LaTeX 公式将转写为 Unicode 符号。",
  },
  mathOff: {
    en: "Math rendering off: raw LaTeX formulas preserved.",
    zh: "数学公式渲染已关闭：保留原始 LaTeX 公式。",
  },
  mathUsage: {
    en: "Usage: /math <on|off>",
    zh: "用法：/math <on|off>",
  },
  altscreenOn: {
    en: "Alternate screen on: the TUI uses a private buffer so the terminal wheel no longer fights its own scroll state.",
    zh: "备用屏已开启：TUI 使用独立缓冲区，终端滚轮不再与自身滚动状态互相打架。",
  },
  altscreenOff: {
    en: "Alternate screen off: the TUI shares the shell scrollback (wheel may desync the viewport).",
    zh: "备用屏已关闭：TUI 与 shell 共用回滚缓冲区（滚轮可能让视口错位）。",
  },
  altscreenUsage: {
    en: "Usage: /altscreen <on|off>",
    zh: "用法：/altscreen <on|off>",
  },
  autoCurrent: {
    en: "Permission auto-approve: {0}",
    zh: "权限自动化：{0}",
  },
  autoUsage: {
    en: "Usage: /auto <on|off>",
    zh: "用法：/auto <on|off>",
  },
  autoOn: {
    en: "Permission auto-approve ON — destructive shell and external-file confirmations will be skipped for this session.",
    zh: "权限自动化已开启：本会话内破坏性 shell 与外部文件访问确认将自动放行。",
  },
  autoOff: {
    en: "Permission auto-approve OFF — confirmations will ask again.",
    zh: "权限自动化已关闭：恢复逐次确认。",
  },
  langSwitched: {
    en: "Language switched to English.",
    zh: "已切换为中文。",
  },
  // --- Tool trace copy ------------------------------------------------------
  // The compact trace shows only status, never timing or output size: a line
  // count told the user nothing actionable and the ms figure read as noise.
  workingFallback: {
    en: "Working…",
    zh: "处理中…",
  },
  // 回合结束的淡色收尾行：耗时 · 输出 token · 积分（后两段可缺省）。
  turnSummaryOutput: {
    en: "{0} out",
    zh: "输出 {0}",
  },
  thinkingActive: {
    en: "Thinking…",
    zh: "思考中…",
  },
  thinkingActivePreview: {
    en: "Thinking: {0}",
    zh: "思考中：{0}",
  },
  // --- Pre-delta turn phase labels (ctx-overflow-feedback batch 3) ----------
  // Rendered on the spinner / activity line while the local runtime checks the
  // context window, compacts history, or waits for the first model delta —
  // the previously silent pre-delta window (batch 1/2a 修好 runtime 与 SSE，
  // 这里补齐 CLI/TUI 的状态行投影)。compacting 行附带可取消提示：Esc /
  // Ctrl+C 即 abort，语义与 localLoop 的 abortSignal 一致。
  contextChecking: {
    en: "Checking this model's context window…",
    zh: "正在检查当前模型的上下文窗口…",
  },
  contextCompacting: {
    en: "Compacting history… (Esc/Ctrl+C to cancel)",
    zh: "正在压缩历史记录…（Esc/Ctrl+C 取消）",
  },
  waitingForModel: {
    en: "Waiting for the model…",
    zh: "正在等待模型响应…",
  },
  // --- Local turn deadline failure (single actionable line) -----------------
  // localLoop 主请求 idle deadline（DEFAULT_LLM_REQUEST_TIMEOUT_MS 兜底或调用方
  // timeoutMs）到达后抛 code=LLM_REQUEST_TIMEOUT；generic 分支的「修本地
  // 凭据」文案在这里是错误指引（请求已发出，问题在上游无响应）。
  // 语义是 idle（静默窗）：{0} 内没有任何新输出才放弃，不是说模型「完全没
  // 响应」——文案必须与这个语义一致，否则会把正在生成的用户推向重复发送
  // （2026-10 ctx-overflow-feedback review 修复 1）。
  llmRequestTimedOut: {
    en: "No new model output for {0}, so this turn was stopped. Your message was kept. Retry in this conversation, switch to another model, or run /compact first.",
    zh: "模型已 {0} 没有新输出，本轮已停止等待（可能仍在生成）。你的消息已保留。可在本对话重试、切换到其他模型，或先 /compact 压缩对话。",
  },
  thinkingTraceLine: {
    en: "✻ Thought for {0}",
    zh: "✻ 思考 {0}",
  },
  toolNeedsAction: {
    en: "needs action",
    zh: "待确认",
  },
  toolTimedOut: {
    en: "timed out",
    zh: "已超时",
  },
  toolExitCode: {
    en: "exit",
    zh: "退出码",
  },
  toolFailed: {
    en: "failed",
    zh: "失败",
  },
  usedSkillLabel: {
    en: "Used Skill",
    zh: "已加载技能",
  },
  // --- Agent-run orchestration cards (injected into packages/ai helpers) ---
  runStatusLabel: {
    en: "Run status",
    zh: "运行状态",
  },
  runStartedLabel: {
    en: "Run started",
    zh: "运行已启动",
  },
  runStoppedLabel: {
    en: "Run stopped",
    zh: "运行已停止",
  },
  runFinishedLabel: {
    en: "Run finished",
    zh: "运行已结束",
  },
  runLogTailLabel: {
    en: "Log tail:",
    zh: "日志尾部：",
  },
  // Normal-mode safe projection: the raw errorMessage/logLines of a failed run
  // stay in pro/verbose; normal mode names the failure and points at pro.
  runsListLabel: {
    en: "Runs ({0})",
    zh: "运行 ({0})",
  },
  // Tool-count fact on run rows/cards/panel (`12 tools` / `12 个工具`).
  runToolsCount: {
    en: "{0} tools",
    zh: "{0} 个工具",
  },
  // Card-body status words / row labels. Display labels only: raw log lines,
  // protocol params and tool ids stay untranslated.
  runStatusNotFound: { en: "not_found", zh: "未找到" },
  runRowAgent: { en: "agent", zh: "执行者" },
  runRowStatus: { en: "status", zh: "状态" },
  runRowTools: { en: "tools", zh: "工具" },
  runRowNote: { en: "note", zh: "备注" },
  runRowError: { en: "error", zh: "错误" },
  runRowTask: { en: "task", zh: "任务" },
  // listAgents card header (`Agents (3)` / `智能体 (3)`). The shared ai
  // renderer keeps the English default; the CLI relabels the header line.
  agentsListLabel: { en: "Agents ({0})", zh: "智能体 ({0})" },
  // Fallback identity for auto-generated agent ids (run zone / dock / panel).
  subAgentName: {
    en: "Sub-agent",
    zh: "子智能体",
  },
  // Status vocabulary the fixed run zone does not label (running shows only its
  // elapsed time there). `en` must stay equal to the raw store status so a
  // switch of locale never changes what an English reader already understood.
  runZoneRunning: { en: "running", zh: "运行中" },
  runZonePending: { en: "pending", zh: "等待中" },
  runZoneCancelling: { en: "cancelling", zh: "正在取消" },
  // controlAgentRun displayData: wait timeout and stop-not-confirmed outcomes.
  agentRunWaitTimeout: {
    en: "⏳ wait timed out after {0}s — the run is still running: wait again later, or use status/stop",
    zh: "⏳ wait 超时（{0}s），run 仍在运行：可稍后再 wait，或改用 status/stop",
  },
  agentRunStopFailedAlive: {
    en: "stop failed: process {0} still alive after SIGKILL",
    zh: "停止失败：进程 {0} 在 SIGKILL 后仍然存活",
  },
  agentRunPendingReconcile: {
    en: "{0} (pending reconcile)",
    zh: "{0}（待对账）",
  },
  // --- Fixed run zone (top of composer, replaces the ⚙ running status chip) --
  // Each active run renders as `⚙ <title> · <agent> · <elapsed> · N tools`.
  // runZoneFor is the elapsed-time fact for a *running* run (`for 1m23s` /
  // `已运行 1m23s`); terminal runs print `<status> <age>` instead and don't use it.
  runZoneFor: {
    en: "for {0}",
    zh: "已运行 {0}",
  },
  // Terminal linger line: `✓ <run> · done · took 12m03s`.
  runZoneDone: { en: "done", zh: "完成" },
  runZoneFailed: { en: "failed", zh: "失败" },
  runZoneCancelled: { en: "cancelled", zh: "已取消" },
  runZoneTook: { en: "took {0}", zh: "用时 {0}" },
  // Overflow marker when more runs are active than the zone shows at once.
  runZoneMore: {
    en: "+{0} more",
    zh: "还有 {0} 个",
  },
  // --- Dialog (picker / confirm) copy --------------------------------------
  // Key-hint wording is unified across select / multi-select / confirm so the
  // three dialogs read as one family: "<Label>  <↑↓ move · Enter choose ·
  // Esc cancel>  <count>". Connectors are "·" between keys, two spaces between
  // the label, hint, and count. zh uses full-width parentheses to match the
  // existing historyPickerTitle; en uses ASCII parentheses.
  dialogSelectLabel: {
    en: "Select",
    zh: "选择",
  },
  dialogSelectHint: {
    en: "(↑↓ move · Enter choose · Esc cancel)",
    zh: "（↑↓ 移动 · Enter 选择 · Esc 取消）",
  },
  dialogMultiSelectLabel: {
    en: "Select",
    zh: "选择",
  },
  dialogMultiSelectHint: {
    en: "(↑↓ move · Space toggle · Enter submit · Esc cancel)",
    zh: "（↑↓ 移动 · Space 切换 · Enter 提交 · Esc 取消）",
  },
  dialogMultiSelectSelected: {
    en: "selected",
    zh: "已选",
  },
  dialogMultiSelectRequired: {
    en: "Pick at least one option to submit",
    zh: "至少选择一项才能提交",
  },
  dialogConfirmHint: {
    en: "(↑↓ move · Enter choose · Esc cancel)",
    zh: "（↑↓ 移动 · Enter 选择 · Esc 取消）",
  },
  dialogConfirmTitle: {
    en: "Confirm destructive shell command",
    zh: "确认执行破坏性 shell 命令",
  },
  dialogConfirmBody: {
    en: "This command may delete or reset user content and needs explicit confirmation before it runs.",
    zh: "该命令可能删除或重置用户内容，需要用户明确确认后才能执行。",
  },
  dialogConfirmExternalFileTitle: {
    en: "Confirm reading a file outside the workspace",
    zh: "确认读取工作区外部文件",
  },
  dialogConfirmExternalFileBody: {
    en: "This path is outside the current workspace. Allow this one-time access, or deny it.",
    zh: "该路径位于当前工作区之外。确认后本次访问放行，否则拒绝。",
  },
  dialogConfirmCommandTruncated: {
    en: "(truncated)",
    zh: "（已截断）",
  },
  dialogConfirmAllowLabel: {
    en: "Allow",
    zh: "允许",
  },
  dialogConfirmAllowDetail: {
    en: "execute this time",
    zh: "本次执行",
  },
  dialogConfirmCancelLabel: {
    en: "Cancel",
    zh: "取消",
  },
  dialogConfirmCancelDetail: {
    en: "abort the operation",
    zh: "中止操作",
  },
  // --- Ask choice (ask_user) ------------------------------------------
  askChoiceTitle: {
    en: "question",
    zh: "问题",
  },
  askChoiceScrollHint: {
    en: "↑ Shift+wheel scrolls back terminal history",
    zh: "↑ Shift+滚轮可回看上方消息",
  },
  askChoiceSubmit: {
    en: "submit ↓",
    zh: "提交 ↓",
  },
  askChoiceSubmitRow: {
    en: "Done",
    zh: "完成",
  },
  askChoiceSkipRow: {
    en: "Skip",
    zh: "跳过",
  },
  askChoiceOtherLabel: {
    en: "Other",
    zh: "其他",
  },
  askChoiceHintSingle: {
    en: "Enter/Space picks · single question sends · multi-question jumps to the next unanswered · Enter in Other confirms and continues",
    zh: "Enter/空格 选择：单题直接发送、多题跳到下一未答题 · 其他输入后 Enter 确认并继续",
  },
  askChoiceHintOptional: {
    en: "Optional question — Enter/Space picks (one step) · skip if you don't want to answer",
    zh: "可选题 — Enter/空格 选择即完成 · 不想回答可跳过",
  },
  askChoiceHintMulti: {
    en: "Enter/Space toggles · ↓ to Done row, Enter sends",
    zh: "Enter/空格 切换选中 · ↓ 到完成行 Enter 发送",
  },
  askChoiceFooterSingle: {
    en: "↵ pick/send · tab switch · esc cancel",
    zh: "↵ 选择/发送 · tab 切换 · esc 取消",
  },
  askChoiceFooterSkip: {
    en: "↵ pick/send · ↓ skip row ↵ skip · tab switch · esc cancel",
    zh: "↵ 选择/发送 · ↓ 跳过行 ↵ 跳过 · tab 切换 · esc 取消",
  },
  askChoiceFooterMulti: {
    en: "↵ toggle · ↓ done row ↵ send · ctrl+s send · tab switch · esc cancel",
    zh: "↵ 切换 · ↓ 完成行 ↵ 发送 · ctrl+s 发送 · tab 切换 · esc 取消",
  },
  askChoiceValidationRequired: {
    en: "Required questions are unanswered — jumped to the first one.",
    zh: "必填问题尚未回答 — 已跳转到第一个未答题。",
  },
  askChoiceHistoryHint: {
    en: "Type a number to choose, or reply directly:",
    zh: "请输入序号选择，或直接回复：",
  },
  askChoiceHistorySelected: {
    en: "selected",
    zh: "已选",
  },
  askChoiceHistoryCancelled: {
    en: "cancelled",
    zh: "已取消",
  },
  contextTitle: {
    en: "Workspace context",
    zh: "工作区上下文",
  },
  contextNext: {
    en: "Next:",
    zh: "下一步：",
  },
  contextFieldAgent: {
    en: "agent",
    zh: "智能体",
  },
  contextFieldTokens: {
    en: "tokens",
    zh: "令牌",
  },
  contextFieldDialog: {
    en: "dialog",
    zh: "对话",
  },
  contextFieldDocs: {
    en: "docs",
    zh: "文档",
  },
  contextFieldSkills: {
    en: "skills",
    zh: "技能",
  },
  contextFieldProfile: {
    en: "profile",
    zh: "配置",
  },
  contextFieldRuntime: {
    en: "runtime",
    zh: "运行时",
  },
  contextFieldServer: {
    en: "server",
    zh: "服务端",
  },
  contextNextAgents: {
    en: "see specialist shortcuts",
    zh: "查看专用智能体快捷方式",
  },
  contextNextDoc: {
    en: "add working context",
    zh: "添加工作上下文",
  },
  contextNextSkill: {
    en: "attach a skill to this workspace",
    zh: "为该工作区挂载技能",
  },
  contextNextNew: {
    en: "start a clean dialog",
    zh: "开始一个干净的对话",
  },
  agentsTitle: {
    en: "Agents:",
    zh: "智能体：",
  },
  // --- Paste / clipboard ------------------------------------------------
  pasteUsage: {
    en: "Usage: /paste (no arguments). Reads your clipboard now: an image becomes an attachment, text lands in the draft. Tip: dragging an image file onto the terminal is the most reliable way to attach a picture.",
    zh: "用法：/paste（无参数）。立即读取剪贴板：图片变附件，文本进草稿。提示：把图片文件拖进终端是附上图片最可靠的方式。",
  },
  pasteTextInserted: {
    en: "Pasted {0} characters from the clipboard into the draft.",
    zh: "已从剪贴板粘贴 {0} 个字符到草稿。",
  },
  pasteStaleDropped: {
    en: "Discarded a clipboard read that finished after the draft changed.",
    zh: "剪贴板读取完成时草稿已变化，结果已丢弃。",
  },
  pasteFilePathHint: {
    en: "file reference (path only, content not read): {0}",
    zh: "文件引用（仅路径，未读取内容）：{0}",
  },
  busyAttachmentsBlocked: {
    en: "can't queue a message with {0} clipboard image(s) while a turn is running — draft kept. Send again after this turn ends, or press Backspace to drop the attachment and send text only.",
    zh: "忙碌中无法排队带 {0} 张剪贴板图片的消息，草稿已保留；等本轮结束后再按 Enter 发送，或 Backspace 撤销附件后改发纯文字。",
  },
  agentsTip: {
    en: "Tip: run /switch for the full picker, or /switch list for your private agents too.",
    zh: "提示：用 /switch 打开完整选择器，或 /switch list 连你的私有智能体一起列出。",
  },
  helpText: {
    en: [
      "Commands:",
      "  /help                 Show this help",
      "  /new                  Clear screen and start a fresh dialog",
      "  /compact              Compact current dialog and fork a new one",
      "  /context              Show workspace context and next actions",
      "  /cd <path>            Change the working directory (takes effect on the next turn)",
      "  /runtime <mode>       Use auto, local, or server runtime",
      "  /switch               Pick an agent interactively (↑↓, Enter)",
      "  /switch list          List agents as text",
      "  /switch <name>        Switch directly by name, alias, or key (alias: /agent)",
      "  /agents               List platform agent shortcuts",
      "  /history              Pick a recent dialog to resume (↑↓, Enter)",
      "  /resume <dialogId>    Resume a dialog directly by id",
      "  /lang <zh|en>         Switch interface language",
      "  /copy [all]           Copy the last reply (or the full conversation with \"all\") to the clipboard",
      "  /paste                Read the clipboard now (image → attachment, text → draft)",
      "  Drag a file in        Drop an image file on the terminal to attach it; other files stay paths",
      "  Shift+Enter / Ctrl+J  Insert a newline in the draft",
      "  /mouse <on|off>       Toggle mouse mode (off = drag to select text)",
      "  /auto <on|off>        Toggle permission auto-approve (skip destructive-shell, external-file & file-write confirms)",
      "  /math <on|off>        Toggle math formula rendering (Unicode transcription)",
      "  /altscreen <on|off>   Toggle the terminal alternate screen (default on; off shares shell scrollback)",
      "  Shift+drag            Select text natively even while mouse mode is on (terminal bypass)",
      "  /doc                  List attached docs",
      "  /doc attach <doc>     Attach a doc to this workspace",
      "  /skill                List attached skills",
      "  /skill attach <ref>   Attach a skill (dbKey, name, or SKILL.md path)",
      "  /skill detach <ref>   Detach a skill",
      "  /skill clear          Detach all skills",
      "  /customize            Describe how you want to tune nolo",
      "  /tasks                List background process tasks (aliases: /jobs, /procs)",
      "  /stop <pid|all>       Stop background process tasks",
      "  /login                Show login/profile hint (/login --server <url> to log in here)",
      "  /profile              Show active profile",
      "  /update               Update the nolo CLI install",
      "  /version              Show version/update hint",
      "  /logs                 Show recent diagnostics and the log file path",
      "  /learn                Review this dialog for reusable tool/prompt improvements",
      "  /exit                 Leave the workspace",
      "",
      "You can also type normally. nolo routes simple read/status requests to CLI commands and sends the rest to the current agent.",
    ].join("\n"),
    zh: [
      "命令：",
      "  /help                 显示本帮助",
      "  /new                  清屏并开始新对话",
      "  /compact              压缩当前对话并分叉出新对话",
      "  /context              查看工作区上下文与后续操作",
      "  /cd <path>           切换工作目录（下个 turn 生效）",
      "  /runtime <mode>       切换 runtime：auto、local、server",
      "  /switch               交互式选择 agent（↑↓ 移动，Enter 确认）",
      "  /switch list          以文本列出全部 agent",
      "  /switch <name>        按名称、别名或 key 直接切换（别名：/agent）",
      "  /agents               列出平台 agent 快捷方式",
      "  /history              从最近对话中选择并恢复（↑↓，Enter）",
      "  /resume <dialogId>    按 id 直接恢复对话",
      "  /lang <zh|en>         切换界面语言",
      "  /copy [all]           复制最后一条回复到剪贴板（加 all 复制完整对话）",
      "  /paste                立即读剪贴板（图片→附件，文本→草稿）",
      "  拖入文件              把图片文件拖进终端即成为附件；其他文件只留路径",
      "  Shift+Enter / Ctrl+J  在草稿里换行",
      "  /mouse <on|off>       切换鼠标模式（off 后可直接拖选文本）",
      "  /auto <on|off>        切换权限自动化（自动放行破坏性 shell、外部文件与写文件确认）",
      "  /math <on|off>        切换数学公式渲染（Unicode 转写）",
      "  /altscreen <on|off>   切换终端备用屏（默认 on；off 改为与 shell 共用回滚）",
      "  Shift+拖拽            鼠标模式开启时也可原生选中文本（终端绕过修饰键）",
      "  /doc                  列出已挂载的文档",
      "  /doc attach <doc>     挂载文档到当前工作区",
      "  /skill                列出已挂载的技能",
      "  /skill attach <ref>   挂载技能（dbKey、名称或 SKILL.md 路径）",
      "  /skill detach <ref>   卸载指定技能",
      "  /skill clear          卸载全部技能",
      "  /customize            描述你想怎么调教 nolo",
      "  /tasks                列出后台子进程任务（别名：/jobs, /procs）",
      "  /stop <pid|all>       停止指定的后台任务",
      "  /login                查看登录 / 配置提示（/login --server <url> 可在本会话内登录）",
      "  /profile              查看当前配置环境",
      "  /update               更新 nolo CLI",
      "  /version              查看版本与更新提示",
      "  /logs                 查看最近诊断记录与日志文件位置",
      "  /learn                从当前对话复盘可复用的工具/提示词改进",
      "  /exit                 退出工作区",
      "",
      "也可以直接输入自然语言。简单的读取/状态请求会走 CLI 命令，其余交给当前 agent。",
    ].join("\n"),
  },
  // --- Slash-command output ---------------------------------------------
  // Command results that used to be hardcoded English. Usage lines keep the
  // command literal untouched; only the surrounding words are translated.
  unknownCommand: {
    en: "Unknown command: {0}\n\n",
    zh: "未知命令：{0}\n\n",
  },
  noConversationLinks: {
    en: "No links in this conversation yet.",
    zh: "本会话还没有出现链接。",
  },
  conversationLinksCopyHint: {
    en: "Open one by copying its URL (Cmd/Ctrl + click, or select and copy).",
    zh: "复制对应 URL 即可打开（Cmd/Ctrl + 点击，或选中复制）。",
  },
  conversationLinksShowing: {
    en: "Links in this conversation (showing first {0} of {1}):",
    zh: "本会话出现的链接（显示前 {0} 个，共 {1} 个）：",
  },
  runtimeUsage: { en: "Usage: /runtime <auto|local|server>", zh: "用法：/runtime <auto|local|server>" },
  runtimeSet: { en: "Runtime: {0}", zh: "运行模式：{0}" },
  logsEmpty: {
    en: "No diagnostics recorded in this session.",
    zh: "本次会话还没有诊断记录。",
  },
  logsHeader: {
    en: "Recent diagnostics ({0} of {1}) · full log: {2}",
    zh: "最近诊断（{0}/{1} 条）· 完整日志：{2}",
  },
  tasksRunning: { en: "Running processes ({0}):", zh: "运行中的进程（{0}）：" },
  tasksStopped: { en: "Stopped/exited ({0}):", zh: "已停止/已退出（{0}）：" },
  tasksNone: { en: "No processes.", zh: "没有运行中的进程。" },
  stopUsage: { en: "Usage: /stop <pid|label|all>", zh: "用法：/stop <pid|label|all>" },
  stopAllDone: { en: "Stopped {0} processes", zh: "已停止 {0} 个进程" },
  stopNoPid: { en: "No running process with pid {0}", zh: "没有 pid 为 {0} 的运行中进程" },
  stopPidDone: { en: "Stopped pid {0} ({1})", zh: "已停止 pid {0}（{1}）" },
  stopNoLabel: { en: "No running process labeled '{0}'", zh: "没有名为“{0}”的运行中进程" },
  stopLabelsDone: { en: "Stopped {0}", zh: "已停止 {0}" },
  compactNothing: {
    en: "Current dialog: new (nothing to compact yet)",
    zh: "当前对话还是新的（还没有可压缩的内容）",
  },
  compactingDialog: {
    en: "Compacting current dialog...",
    zh: "正在压缩当前对话…",
  },
  compactPhaseReading: {
    en: "Reading dialog messages…",
    zh: "正在读取对话消息…",
  },
  compactPhaseSummarizing: {
    en: "Generating summary…",
    zh: "正在生成总结…",
  },
  compactPhaseForking: {
    en: "Forking dialog…",
    zh: "正在分叉新对话…",
  },
  compactFailed: {
    en: "Compact failed: {0}",
    zh: "压缩失败：{0}",
  },
  contextLengthExceeded: {
    en: "Model context limit reached (requested {0} tokens / limit {1}). Suggest using /compact to compact current dialog, or /new to start a fresh dialog.",
    zh: "已达模型上下文上限（请求 {0} tokens / 上限 {1}）。建议使用 /compact 压缩当前对话，或使用 /new 开始新对话。",
  },
  contextLengthExceededLimitOnly: {
    en: "Model context limit reached (limit {0}). Suggest using /compact to compact current dialog, or /new to start a fresh dialog.",
    zh: "已达模型上下文上限（上限 {0}）。建议使用 /compact 压缩当前对话，或使用 /new 开始新对话。",
  },
  contextLengthExceededGeneric: {
    en: "Model context limit reached. Suggest using /compact to compact current dialog, or /new to start a fresh dialog.",
    zh: "已达模型上下文上限。建议使用 /compact 压缩当前对话，或使用 /new 开始新对话。",
  },
  compactDone: {
    en: "Compacted dialog {0} → {1}.",
    zh: "已压缩对话 {0} → {1}。",
  },
  compactDoneNoSummary: {
    en: "Forked dialog {0} → {1} (no summary needed).",
    zh: "已分叉对话 {0} → {1}（无需压缩）。",
  },
  compactSuccess: {
    en: "✓ Compacted dialog {0} → {1} in {2}.",
    zh: "✓ 已压缩对话 {0} → {1}，耗时 {2}。",
  },
  compactSuccessWithCount: {
    en: "✓ Compacted dialog {0} → {1} in {2} ({3} messages compressed).",
    zh: "✓ 已压缩对话 {0} → {1}，耗时 {2}（压缩 {3} 条消息）。",
  },
  compactForked: {
    en: "✓ Forked dialog {0} → {1} in {2} (no summary needed).",
    zh: "✓ 已分叉对话 {0} → {1}，耗时 {2}（无需压缩）。",
  },
  agentCurrent: { en: "Current agent: {0} ({1})", zh: "当前 agent：{0}（{1}）" },
  agentPinnedUnaudited: {
    en: "No audit record for it — an older build wrote it; see agent-selection.log.",
    zh: "这条记录没有审计记录，是旧版本写的；详见 agent-selection.log。",
  },
  agentPinnedAuditRotated: {
    en: "The audit log has no entry for it — it aged out, or another session wrote it.",
    zh: "审计日志里没有它的记录——可能已被轮转，或是别的会话写的。",
  },
  agentPinnedFromProfile: {
    en: 'Agent "{0}" restored from {1} (saved selection). /switch nolo to go back to the default.',
    zh: "agent“{0}”来自 {1} 里保存的选择。/switch nolo 可切回默认档。",
  },
  agentUnknown: {
    en: "I don't know agent \"{0}\" yet.\nUse /switch, /switch list, /switch minimax-m3, or a full agent key.",
    zh: "还不认识 agent“{0}”。\n可以用 /switch、/switch list、/switch minimax-m3 或完整的 agent key 来切换。",
  },
  themeCurrent: { en: "Current theme: {0} · {1}", zh: "当前主题：{0} · {1}" },
  themeUsage: {
    en: "Usage: /theme <name> | /theme terminal | /theme light | /theme dark | /theme refresh",
    zh: "用法：/theme <name> | /theme terminal | /theme light | /theme dark | /theme refresh",
  },
  themeAvailable: { en: "Available themes: {0}", zh: "可用主题：{0}" },
  themeBrightnessSwitched: { en: "Switched to {0} background colors.", zh: "已切换到 {0} 背景色。" },
  themeBrightnessAuto: {
    en: "Theme now follows terminal colors (/theme auto is an alias).",
    zh: "主题已跟随终端配色（/theme auto 为兼容别名）。",
  },
  themeRefreshed: {
    en: "Re-detected terminal background: {0}.",
    zh: "已重新检测终端背景：{0}。",
  },
  themeRefreshFailed: {
    en: "Could not detect terminal background (not a TTY or no response).",
    zh: "无法检测终端背景（非 TTY 或终端无响应）。",
  },
  themeSwitched: { en: "Switched to theme: {0}", zh: "已切换到主题：{0}" },
  themeUnknown: { en: "Unknown theme: {0}. Available themes: {1}", zh: "未知主题：{0}。可用主题：{1}" },
  cdUsage: {
    en: "Usage: /cd <path>  (relative, absolute, ~, or -; takes effect on the next turn)",
    zh: "用法：/cd <path>（相对、绝对、~ 或 - 路径；下个 turn 生效）",
  },
  cdCurrent: { en: "Current directory: {0}", zh: "当前目录：{0}" },
  cdSwitched: { en: "Working directory: {0}", zh: "工作目录：{0}" },
  cdNotFound: { en: "Directory not found: {0}", zh: "目录不存在：{0}" },
  cdNotDir: { en: "Not a directory: {0}", zh: "不是目录：{0}" },
  cdNoPrevious: { en: "No previous directory.", zh: "没有上一个目录。" },
  cdSwitchedMessage: {
    en: "Working directory changed: {0} → {1}. Subsequent tool execution and file operations use the new directory.",
    zh: "工作目录已切换：{0} → {1}。后续工具执行与文件操作以新目录为准。",
  },
  docAttachUsage: { en: "Usage: /doc attach <doc>", zh: "用法：/doc attach <doc>" },
  docList: { en: "Attached docs: {0}", zh: "已挂载文档：{0}" },
  docNone: { en: "No docs attached. Use /doc attach <doc>.", zh: "还没有挂载文档。用 /doc attach <doc> 挂载。" },
  skillAttachUsage: { en: "Usage: /skill attach <skill-ref>", zh: "用法：/skill attach <skill-ref>" },
  skillAttached: { en: "Attached skill: {0}", zh: "已挂载技能：{0}" },
  skillDetachUsage: { en: "Usage: /skill detach <skill-ref>", zh: "用法：/skill detach <skill-ref>" },
  skillDetached: { en: "Detached skill: {0}", zh: "已卸载技能：{0}" },
  skillNotAttached: { en: "Skill not attached: {0}", zh: "技能未挂载：{0}" },
  skillNone: { en: "No skills attached.", zh: "还没有挂载技能。" },
  skillCleared: { en: "Cleared {0} skill(s).", zh: "已清空 {0} 个技能。" },
  skillList: {
    en: "Attached skills: {0}\nUsage: /skill attach <ref> | /skill detach <ref> | /skill clear",
    zh: "已挂载技能：{0}\n用法：/skill attach <ref> | /skill detach <ref> | /skill clear",
  },
  skillNoneHint: {
    en: "No skills attached. Use /skill attach <skill-ref> to attach a skill.\nSkill refs can be a dbKey (page-xxx), a skill name (searched in .agents/skills/), or a direct path.",
    zh: "还没有挂载技能。用 /skill attach <skill-ref> 挂载技能。\n技能引用可以是 dbKey（page-xxx）、技能名（会在 .agents/skills/ 中查找）或直接路径。",
  },
  customizeHint: {
    en: "Tell nolo what to change, for example: /customize make my default agent more concise.",
    zh: "告诉 nolo 你想改什么，例如：/customize make my default agent more concise。",
  },
  /** @deprecated No longer used by `/login` (now runs the in-TUI login flow). Kept to avoid structural churn. */
  loginHint: {
    en: "MVP login uses profile/env auth. Set AUTH_TOKEN, NOLO_SERVER, or NOLO_PROFILE before starting nolo.",
    zh: "MVP 登录走 profile/环境变量认证。启动 nolo 前请设置 AUTH_TOKEN、NOLO_SERVER 或 NOLO_PROFILE。",
  },
  /** @deprecated No longer used by `/login` (now runs the in-TUI login flow). Kept to avoid structural churn. */
  loginTuiStart: {
    en: "Or run `/login --server <url>` to log in right here (opens a browser authorization URL), or exit and run `nolo login`.",
    zh: "也可以执行 /login --server <url> 直接在这里登录（会给出浏览器授权链接），或退出后运行 `nolo login`。",
  },
  loginUsage: {
    en: "Usage: /login [--server <url>]. Unsupported flags: {0}",
    zh: "用法：/login [--server <url>]。不支持的参数：{0}",
  },
  loginStarted: {
    en: "Open this URL to authorize nolo-cli:\n{0}\nCode: {1}",
    zh: "打开这个链接授权 nolo-cli：\n{0}\n授权码：{1}",
  },
  loginBrowserFailed: {
    en: "Could not open a browser automatically. Paste the URL above into a browser.",
    zh: "无法自动打开浏览器，请把上面的链接粘贴到浏览器里。",
  },
  loginWaiting: {
    en: "Waiting for browser authorization ({0} remaining)... (Ctrl+C to cancel)",
    zh: "等待浏览器授权（剩余 {0}）……按 Ctrl+C 取消",
  },
  loginStillWaiting: {
    en: "Still waiting... ({0} remaining)",
    zh: "仍在等待……（剩余 {0}）",
  },
  loginSuccess: {
    en: "Logged in. Token saved to profile; this session now uses it immediately.",
    zh: "登录成功。Token 已写入 profile，当前会话立即生效。",
  },
  loginFailed: {
    en: "Login failed: {0}",
    zh: "登录失败：{0}",
  },
  loginTimeout: {
    en: "Login timed out. Run /login again, or use `nolo login --token <jwt>` in a shell.",
    zh: "登录超时。请重新执行 /login，或在 shell 里用 nolo login --token <jwt>。",
  },
  loginCancelled: {
    en: "Login cancelled.",
    zh: "已取消登录。",
  },
  welcomeAuthGuidance: {
    en: "Not logged in to Nolo — three ways to get going:\n  · Run a task on local Codex: nolo run \"<task>\" (no login needed)\n  · Bind your own model subscription: nolo auth antigravity | claude | chatgpt | xai\n  · Use the Nolo platform: type /login (gives you a browser authorization link)",
    zh: "未登录 Nolo —— 三条路都能用：\n  · 用本地 Codex 跑任务：nolo run \"<任务>\"（不需要登录）\n  · 绑定你自己的模型订阅：nolo auth antigravity | claude | chatgpt | xai\n  · 用 Nolo 平台：直接输入 /login（会给出浏览器授权链接）",
  },
  versionInfo: {
    en: "nolo {0}\nUpdate this install with: nolo update\nIf repo-local output differs, publish/install the latest npm package first.",
    zh: "nolo {0}\n用 nolo update 更新当前安装。\n如果本地仓库输出的版本不同，请先发布/安装最新的 npm 包。",
  },
  versionUnknown: { en: "unknown version", zh: "未知版本" },
  updateAvailable: {
    // 保持短：这行在窄终端物理换行会破坏 banner 重绘的行数计算。当前版本
    // 号上一行 version line 已有，不重复。
    en: "↑ nolo {0} available — /update to upgrade",
    zh: "↑ nolo {0} 可用 — /update 升级",
  },
  // --- Dialog list / timestamps -----------------------------------------
  recentDialogs: { en: "Recent dialogs:", zh: "最近对话：" },
  dialogListTip: {
    en: "Tip: run /history to pick one interactively, or paste an id after /resume.",
    zh: "提示：用 /history 交互式选择，或把 id 粘到 /resume 后面。",
  },
  timeJustNow: { en: "just now", zh: "刚刚" },
  timeMinutesAgo: { en: "{0}m ago", zh: "{0} 分钟前" },
  timeHoursAgo: { en: "{0}h ago", zh: "{0} 小时前" },
  timeDaysAgo: { en: "{0}d ago", zh: "{0} 天前" },
  // Overflow hints shared by select / multi-select / ask-choice. The arrows
  // and count are part of the copy so each locale can order them naturally.
  dialogMoreAbove: { en: "↑ {0} more", zh: "↑ {0} 更多" },
  dialogMoreBelow: { en: "↓ {0} more", zh: "↓ {0} 更多" },
  // Action gate handoff
  actionGateNeeded: {
    en: "Action needed in your terminal",
    zh: "终端需要你的操作",
  },
  actionGateEnterHint: {
    en: "Press Enter to run it now. Follow any prompts below, or Ctrl+C to cancel.",
    zh: "按 Enter 立即执行，按下方提示操作，或按 Ctrl+C 取消。",
  },
  actionGateConfirmHint: { en: "Enter=approve, n=cancel (or type y/yes).", zh: "Enter=批准，n=取消（也可输入 y/yes）。" },
  actionGateInteractiveTitle: {
    en: "This command requires an interactive terminal.",
    zh: "该命令需要交互式终端",
  },
  actionGateInteractiveBody: {
    en: "Complete it in the terminal, then nolo will continue.",
    zh: "在终端中完成操作后，nolo 将继续。",
  },
  // Compact memory-tool trace
  memoryDeleteRequestedCount: {
    en: "requested deletion of {0}",
    zh: "已请求删除 {0} 条",
  },
  // Agent catalog sources
  agentSourcePlatform: {
    en: "Platform",
    zh: "平台",
  },
  agentSourceSubscription: {
    en: "Subscription",
    zh: "订阅",
  },
  agentSourceApi: {
    en: "API",
    zh: "API",
  },
  // ── Non-TUI CLI output: shared command-group help ─────────────────────────
  // `nolo <group> --help` renders from the command registry; the frame lines
  // are localized here while per-command copy lives in cliCommandDescription().
  "cli.groupCommandsTitle": {
    en: "nolo {0} commands",
    zh: "nolo {0} 命令",
  },
  "cli.usageLabel": {
    en: "Usage:",
    zh: "用法：",
  },
  // ── Non-TUI CLI output: nolo auth ─────────────────────────────────────────
  // User-visible copy of `nolo auth <provider>`. Params follow each en string:
  // {0}=provider, {1}=server origin / saved account / raw detail,
  // {2}=zone or HTTP status, {3}=optional trailing fragment.
  "auth.authorizationSaved": {
    en: "[nolo] {0} authorization saved{1}.",
    zh: "[nolo] 已保存 {0} 授权{1}。",
  },
  // Optional account suffix for authorizationSaved (empty when the provider
  // reports no account label).
  "auth.authorizationSavedForAccount": {
    en: " for {0}",
    zh: "（账号 {0}）",
  },
  "auth.noLocalCredential": {
    en: "[nolo] No local {0} credential. Run: nolo auth {0}",
    zh: "[nolo] 本地没有 {0} 凭据。请运行：nolo auth {0}",
  },
  "auth.credentialServerManaged": {
    en:
      "[nolo] The {0} credential is already server-managed by {1} (no local refresh token).\n" +
      "To sync it again, run: nolo auth {0} --sync-to-server",
    zh:
      "[nolo] {0} 凭据已由 {1} 服务端托管（本地无 refreshToken）。\n" +
      "如需重新同步，请运行: nolo auth {0} --sync-to-server",
  },
  "auth.verifyUnsupported": {
    en: '[nolo] --verify is only supported for "nolo auth antigravity".',
    zh: '[nolo] --verify 仅支持 "nolo auth antigravity"。',
  },
  "auth.checkingVerificationChallenge": {
    en: "[nolo] Checking the current verification challenge (one lightweight request)...",
    zh: "[nolo] 正在检查当前验证挑战（一次轻量请求）…",
  },
  "auth.refreshTokenInvalid": {
    en:
      "[nolo] The antigravity refresh token is no longer valid ({0}). " +
      "Re-run `nolo auth antigravity` to re-authorize this account.",
    zh:
      "[nolo] antigravity 的 refresh token 已失效（{0}）。" +
      "请重新运行 `nolo auth antigravity` 重新授权该账号。",
  },
  "auth.credentialIncomplete": {
    en:
      "[nolo] The stored antigravity credential is incomplete ({0}). " +
      "Re-run `nolo auth antigravity` to re-authorize.",
    zh:
      "[nolo] 本地保存的 antigravity 凭据不完整（{0}）。" +
      "请重新运行 `nolo auth antigravity` 重新授权。",
  },
  "auth.providerUnreachable": {
    en: "[nolo] Could not reach the antigravity provider: {0}. Check your network and retry.",
    zh: "[nolo] 无法访问 antigravity provider：{0}。请检查网络后重试。",
  },
  "auth.credentialWorking": {
    en:
      "[nolo] ✓ The credential is working — no verification is required right now. " +
      "You can retry your agent.",
    zh: "[nolo] ✓ 凭据可用——当前无需验证。可以重试你的 agent。",
  },
  "auth.googleVerificationRequired": {
    en: "[nolo] Google requires a one-time account verification for {0}.",
    zh: "[nolo] Google 需要对 {0} 做一次性账号验证。",
  },
  "auth.verificationOpened": {
    en:
      "[nolo] ✓ Opened it in your browser — complete the verification there " +
      "(sign in with the same Google account), then retry your agent.",
    zh:
      "[nolo] ✓ 已在浏览器中打开——请在那里完成验证" +
      "（用同一个 Google 账号登录），然后重试你的 agent。",
  },
  "auth.verificationCopyUrl": {
    en:
      "[nolo] Copy the URL above into a browser signed into {0}, " +
      "complete the verification, then retry your agent.",
    zh:
      "[nolo] 请把上面的 URL 复制到已登录 {0} 的浏览器中，" +
      "完成验证后重试你的 agent。",
  },
  "auth.httpWithoutVerificationLink": {
    en:
      "[nolo] The provider returned HTTP {0} without a verification link — " +
      "this is not the one-time-verification case --verify handles.{1}" +
      " Response detail: {2}",
    zh:
      "[nolo] provider 返回 HTTP {0}，但没有任何验证链接——" +
      "这不属于 --verify 处理的一次性验证场景。{1}响应详情：{2}",
  },
  // Optional trailing fragment spliced into httpWithoutVerificationLink when a
  // token refresh also failed earlier. English keeps the leading space.
  "auth.httpWithoutVerificationLink.refreshSuffix": {
    en: " (token refresh also failed earlier: {0})",
    zh: "（此前 token 刷新也失败：{0}）",
  },
  "auth.localRefreshTokenDropped": {
    en: "[nolo] No local refresh token is kept: {0} is refreshed by {1} (fetched on demand).",
    zh: "[nolo] 本地不再保存 refresh token：{0} 由 {1} 统一刷新（用完即取）。",
  },
  "auth.localStateUpdateFailed": {
    en: "[nolo] Warning: failed to update the local credential state ({0}).",
    zh: "[nolo] Warning: 本地凭据状态更新失败（{0}）。",
  },
  "auth.syncMissingConfig": {
    en:
      "[nolo] Warning: server sync needs NOLO_SERVER and AUTH_TOKEN env vars, " +
      "or a configured profile. Skipping server sync.",
    zh:
      "[nolo] 警告：服务端同步需要 NOLO_SERVER 和 AUTH_TOKEN 环境变量，" +
      "或已配置的 profile。已跳过同步。",
  },
  "auth.syncedTo": {
    en: "[nolo] Synced to {0}",
    zh: "[nolo] 已同步到 {0}",
  },
  "auth.syncDoneWebUsable": {
    en: "[nolo] The web app can now use this subscription.",
    zh: "[nolo] 网页端现在可以使用该订阅了。",
  },
  "auth.syncFailed": {
    en: "[nolo] Warning: server sync failed ({0}). Token saved locally.",
    zh: "[nolo] 警告：服务端同步失败（{0}）。Token 已保存在本地。",
  },
  "auth.noServerConfigured": {
    en:
      "[nolo] No server configured. To use this on the web, run nolo login first, " +
      "then nolo auth {0} --sync-only",
    zh:
      "[nolo] 未配置服务器。如需在网页端使用，请先运行 nolo login，" +
      "再运行 nolo auth {0} --sync-only",
  },
  // {1} is the provider name again so the --no-sync-to-server hint names the
  // exact command the user would run; keep [Y/n] as the literal answer hint.
  "auth.syncPrompt": {
    en:
      "Sync to {0} so the web app can also use this {1} subscription? " +
      "The credential is stored encrypted; run nolo auth {1} --no-sync-to-server " +
      "to turn it off later. [Y/n] ",
    zh:
      "同步到 {0}，让网页端也能使用这个 {1} 订阅？" +
      "凭证加密存储，可随时 nolo auth {1} --no-sync-to-server 关闭 [Y/n] ",
  },
  "auth.notSyncedToServer": {
    en:
      "[nolo] Not synced to the server. For web use, run: " +
      "nolo auth {0} --sync-to-server (or --sync-only)",
    zh:
      "[nolo] 未同步凭据到服务器。如需网页端使用，请运行: " +
      "nolo auth {0} --sync-to-server（或 --sync-only）",
  },
  "auth.markFailed": {
    en:
      "[nolo] The credential was uploaded to the server, but marking it " +
      "server-managed locally failed. Re-authorize so both sides cannot race " +
      "each other's refresh.",
    zh:
      "[nolo] 凭据已成功上传服务器，但本地打上托管标记失败。" +
      "为防双方竞态刷新导致失效，请重新授权。",
  },
  "auth.commandFailed": {
    en: "nolo auth {0} failed: {1}",
    zh: "nolo auth {0} 失败：{1}",
  },
  "auth.cloudflareTokenGenerated": {
    en:
      "[nolo] Generated Cloudflare API token for zone {0} ({1}).\n" +
      "Store it as CLOUDFLARE_EMAIL_ROUTING_API_TOKEN:\n  {2}\n",
    zh:
      "[nolo] 已为 zone {0}（{1}）生成 Cloudflare API token。\n" +
      "请保存为 CLOUDFLARE_EMAIL_ROUTING_API_TOKEN：\n  {2}\n",
  },
  "auth.envUpdated": {
    en: "[nolo] Updated {0} with CLOUDFLARE_EMAIL_ROUTING_API_TOKEN.",
    zh: "[nolo] 已更新 {0} 里的 CLOUDFLARE_EMAIL_ROUTING_API_TOKEN。",
  },
  // ── Non-TUI CLI output: nolo app ──────────────────────────────────────────
  "app.noApps": {
    en: "No apps\n",
    zh: "没有应用\n",
  },
  "app.listTitle": {
    en: "App list ({0})\n\n",
    zh: "应用列表 ({0})\n\n",
  },
  "app.unnamed": {
    en: "(unnamed)",
    zh: "(未命名)",
  },
  "app.detailsTitle": {
    en: "App details\n\n",
    zh: "应用详情\n\n",
  },
  "app.errorNameRequired": {
    en: "\nError: provide one of --name / --app-id / --app-key\n",
    zh: "\n错误: 必须提供 --name / --app-id / --app-key 之一\n",
  },
  "app.errorJobIdRequired": {
    en: "\nError: --job-id is required\n",
    zh: "\n错误: 必须提供 --job-id\n",
  },
  "app.errorNameOrAppId": {
    en: "\nError: provide --name or --app-id\n",
    zh: "\n错误: 必须提供 --name 或 --app-id\n",
  },
  "app.errorWithDetail": {
    en: "\nError: {0}\n",
    zh: "\n错误: {0}\n",
  },
  "app.deploySucceeded": {
    en: "Deploy succeeded\n",
    zh: "部署成功\n",
  },
  "app.deployStatusTitle": {
    en: "Deploy status\n\n",
    zh: "部署状态\n\n",
  },
  "app.deleteConfirm": {
    en: "About to delete app ({0}) — this cannot be undone. Confirm? [y/N] ",
    zh: "即将删除应用 ({0})，此操作不可撤销。确认？[y/N] ",
  },
  "app.deleteCancelled": {
    en: "Cancelled\n",
    zh: "已取消\n",
  },
  "app.deleteDone": {
    en: "Deleted app ({0})\n",
    zh: "已删除应用 ({0})\n",
  },
  "app.deploy.error.nameOrAppIdRequired": {
    en: "provide --name or --app-id",
    zh: "必须提供 --name 或 --app-id",
  },
  "app.deploy.error.codeFileUnreadable": {
    en: "cannot read --code-file: {0}",
    zh: "无法读取 --code-file: {0}",
  },
  "app.deploy.error.filesMustBeArray": {
    en: "--files must be a JSON array",
    zh: "--files 必须是 JSON 数组",
  },
  "app.deploy.error.filesParseFailed": {
    en: "--files parse failed: {0}",
    zh: "--files 解析失败: {0}",
  },
  "app.deploy.error.codeRequired": {
    en: "provide one of --code / --code-file / --files",
    zh: "必须提供 --code / --code-file / --files 之一",
  },
  // ── Non-TUI CLI output: nolo agent / nolo run ─────────────────────────────
  "agent.unavailableHidden": {
    en: "⛔ {0} agent(s) temporarily unavailable (429) hidden. Use --show-unavailable to list them.\n",
    zh: "⛔ 已隐藏 {0} 个暂时不可用的 agent（429）。用 --show-unavailable 列出它们。\n",
  },
  "agent.rateLimitedRecovery": {
    en: "   - [429 rate-limited] {0} (id: {1}) recovers in {2}s{3}\n",
    zh: "   - [429 限流] {0} (id: {1}) 预计 {2} 秒后恢复{3}\n",
  },
  "agentRun.autoRouteOverrideFailed": {
    en: "[nolo] auto-route: could not read the source agent, running the selected agent as-is.\n",
    zh: "[nolo] auto-route: 覆盖源 agent 读取失败，按原样直跑所选 agent。\n",
  },
  "agentRun.autoRouteModelOverride": {
    en: "[nolo] auto-route: model override is now {0}\n",
    zh: "[nolo] auto-route: model 层覆盖为 {0}\n",
  },
  // ── Non-TUI CLI output: nolo agent delete ─────────────────────────────────
  // Flag descriptions for `nolo agent delete --help`; the Chinese copy is the
  // original wording, kept verbatim so existing users lose no information.
  "agentDelete.description": {
    en:
      "Deletes an agent's private record (agent-{userId}-{id}) and public record (agent-pub-{id}).\n",
    zh:
      "删除一个 agent 的私有记录 (agent-{userId}-{id}) 与公开记录 (agent-pub-{id})。\n",
  },
  "agentDelete.tombstoneNote": {
    en: "The server side is a tombstone soft delete: read after DELETE returns 404.\n",
    zh: "服务器端为 tombstone 软删除，DELETE 后再次 read 会返回 404。\n",
  },
  "agentDelete.flagYes": {
    en: "  --yes            Actually delete; without it only the dry-run target summary is printed.\n",
    zh: "  --yes            真正执行删除；缺省时仅 dry-run 输出目标摘要。\n",
  },
  "agentDelete.flagJson": {
    en: "  --json           Print the JSON result.\n",
    zh: "  --json           输出 JSON 结果。\n",
  },
  "agentDelete.flagId": {
    en: "  --id <agent>     Same as the positional argument: alias / dbKey / URL / 26-char id.\n",
    zh: "  --id <agent>     与位置参数等价，传入 alias / dbKey / URL / 26-char id。\n",
  },
  "agentDelete.flagServer": {
    en: "  --server / --server-url  Delete only on the given server (replicas outside the fan-out are kept).\n",
    zh: "  --server / --server-url  仅删除指定服务器（仍保留集群 fan-out 之外的副本）。\n",
  },
  "agentDelete.flagUser": {
    en: "  --user <userId>  Explicitly override userId (errors when it differs from AUTH_TOKEN).\n",
    zh: "  --user <userId>  显式覆盖 userId（与 AUTH_TOKEN 不一致则报错）。\n",
  },
  "agentDelete.flagToken": {
    en: "  --token / --machine-key  Temporarily override AUTH_TOKEN.\n",
    zh: "  --token / --machine-key  临时覆盖 AUTH_TOKEN。\n",
  },
  // ── Non-TUI CLI output: shared API error printing ─────────────────────────
  "api.requestFailed": {
    en: "Request failed: {0}",
    zh: "请求失败: {0}",
  },
  "api.requestFailedHttp": {
    en: "Request failed (HTTP {0})",
    zh: "请求失败 (HTTP {0})",
  },
  "api.nonJsonResponse": {
    en: "Server returned a non-JSON response (HTTP {0})",
    zh: "服务端返回非 JSON 响应 (HTTP {0})",
  },
  "api.errorWithCode": {
    en: "Error [{0}]: {1}",
    zh: "错误 [{0}]: {1}",
  },
  "api.error": {
    en: "Error: {0}",
    zh: "错误: {0}",
  },
  // ── Non-TUI CLI output: local ChatGPT web image job ───────────────────────
  "chatgptWebImage.jobInProgress": {
    en: "A ChatGPT web image job is already running, try again later (lock file held).",
    zh: "ChatGPT 网页生图任务正在进行中，请稍后再试（锁文件占用）",
  },
  "chatgptWebImage.noOutputFile": {
    en: "ChatGPT web image generation produced no file: {0}",
    zh: "ChatGPT 网页生图未产出文件：{0}",
  },
  "chatgptWebImage.outputFileInvalid": {
    en: "ChatGPT web image file is invalid or empty: {0}",
    zh: "ChatGPT 网页生图文件无效或为空：{0}",
  },
  "chatgptWebImage.uploadFailed": {
    en: "Uploading the generated image to Nolo FS failed: {0}",
    zh: "上传生图结果到 Nolo FS 失败：{0}",
  },
  "chatgptWebImage.missingUploadFileId": {
    en: "Upload succeeded but the response has no fileId",
    zh: "上传生图结果成功但响应缺少 fileId",
  },
  "chatgptWebImage.missingPrompt": {
    en: "Missing image prompt (payload.meta.prompt is required)",
    zh: "缺少生图 prompt（payload.meta.prompt 必填）",
  },
  // ── Non-TUI CLI output: agent-run orchestration tool errors ───────────────
  "agentRunTool.missingAgentKey": {
    en: "startAgentRun: missing agentKey, and the current agent cannot be identified.",
    zh: "startAgentRun: 缺少 agentKey 参数，且无法识别当前 Agent。",
  },
  "agentRunTool.missingTask": {
    en: "startAgentRun: missing a valid task description.",
    zh: "startAgentRun: 缺少有效的 task 文本描述。",
  },
  "agentRunTool.noDialogToContinue": {
    en: "This run has no linked dialog and cannot be continued.",
    zh: "该 run 无关联 dialog，无法续跑。",
  },
  "agentRunTool.appendMissingRunId": {
    en: 'controlAgentRun(action:"append"): missing runId.',
    zh: 'controlAgentRun(action:"append"): 缺少 runId。',
  },
  "agentRunTool.appendMissingUserInput": {
    en: 'controlAgentRun(action:"append"): missing a valid userInput text.',
    zh: 'controlAgentRun(action:"append"): 缺少有效的 userInput 文本。',
  },
  "agentRunTool.appendQueueUnsupported": {
    en: "This run did not start with a queue channel; append while running is not supported. Wait for a terminal state first.",
    zh: "该 run 启动时不支持运行中入队（无队列通道），请等终态后再 append",
  },
  "agentRunTool.unknownAction": {
    en: 'controlAgentRun: unknown action "{0}".',
    zh: 'controlAgentRun: 未知 action "{0}"。',
  },
  "agentRunTool.missingRunId": {
    en: 'controlAgentRun(action:"{0}"): missing runId.',
    zh: 'controlAgentRun(action:"{0}"): 缺少 runId。',
  },
  "agentRunTool.waitAborted": {
    en: "controlAgentRun(wait) was aborted.",
    zh: "controlAgentRun(wait) 已被中止。",
  },
} as const;

export type CliStringKey = keyof typeof STRINGS;

export function t(key: CliStringKey, ...params: string[]): string {
  const text = STRINGS[key][currentLocale];
  if (params.length === 0) return text;
  // Optional {0}/{1}/... and named interpolation; missing params keep the placeholder.
  return text.replace(/\{(\d+|required|current)\}/g, (match, name) => {
    const index = name === "required" ? 0 : name === "current" ? 1 : Number(name);
    const replacement = params[index];
    return replacement === undefined ? match : replacement;
  });
}

/**
 * Human-readable tool labels for the compact tool trace.
 *
 * The trace reads as a running narration of what nolo is doing ("读取
 * packages/cli/x.ts"), so labels are action verbs rather than the raw tool
 * identifier. Only the tools a workspace user actually sees are listed —
 * anything else falls back to the raw name, which keeps the platform tool
 * registry (packages/ai/tools/index.ts, 100+ entries) out of this file.
 */
const TOOL_LABELS: Record<string, { en: string; zh: string }> = {
  // Local workspace tools (packages/agent-runtime/localWorkspaceTools.ts)
  readFile: { en: "Read", zh: "读取" },
  writeFile: { en: "Write", zh: "写入" },
  editFile: { en: "Edit", zh: "编辑" },
  codeSearch: { en: "Search", zh: "搜索" },
  globFiles: { en: "Glob", zh: "匹配" },
  execShell: { en: "Run", zh: "执行" },
  runCommand: { en: "Run", zh: "执行" },
  captureVisualState: { en: "Capture", zh: "截屏" },
  // Memory tools
  rememberMemory: { en: "Remember", zh: "记住" },
  queryMemory: { en: "Recall", zh: "查记忆" },
  deleteMemory: { en: "Forget", zh: "删记忆" },
  // Workspace / diagnostics
  searchWorkspace: { en: "Search workspace", zh: "搜索工作区" },
  // 同一工具在 web/server 工具面用 snake_case 命名（packages/ai/tools/index.ts）。
  search_workspace: { en: "Search workspace", zh: "搜索工作区" },
  // 全空间搜索：内置 skill search-all-spaces 声明的工作区工具，loadSkill 后进入
  // 工具面；同样需要中英文标签，避免回退成裸工具名。
  search_all_spaces: { en: "Search all spaces", zh: "搜索全部空间" },
  cliDoctor: { en: "Doctor", zh: "自检" },
  cliWhoami: { en: "Whoami", zh: "查看身份" },
  checkEnv: { en: "Check env", zh: "检查环境" },
  configure: { en: "Configure", zh: "配置" },
  notifyUser: { en: "Notify", zh: "通知" },
  // Docs / dialogs / spaces
  readDoc: { en: "Read doc", zh: "读取文档" },
  createDoc: { en: "Create doc", zh: "新建文档" },
  updateDoc: { en: "Update doc", zh: "更新文档" },
  readDialog: { en: "Read dialog", zh: "读取对话" },
  listDialogs: { en: "List dialogs", zh: "列出对话" },
  queryDialogsBySubjectRef: { en: "Query dialogs", zh: "查询对话" },
  searchDialogMessages: { en: "Search messages", zh: "搜索消息" },
  listSpaces: { en: "List spaces", zh: "列出空间" },
  readSpace: { en: "Read space", zh: "读取空间" },
  // Tables
  createTable: { en: "Create table", zh: "创建表" },
  queryTableRows: { en: "Query rows", zh: "查询表行" },
  addTableRow: { en: "Add row", zh: "新增表行" },
  addTableRows: { en: "Add rows", zh: "新增表行" },
  updateTableRow: { en: "Update row", zh: "更新表行" },
  deleteTableRow: { en: "Delete row", zh: "删除表行" },
  // Web
  // Tree group header uses the same short category noun as Read/Search/Run
  // ("Fetch" / "抓取网页"), not a longer "Fetch page" phrase.
  fetchWebpage: { en: "Fetch", zh: "抓取网页" },
  readPage: { en: "Read page", zh: "读取网页" },
  exa_search: { en: "Web search", zh: "联网搜索" },
  // Skill loading
  loadSkill: { en: "Used Skill", zh: "使用技能" },
  // Agent orchestration
  listAgents: { en: "List agents", zh: "列出智能体" },
  readAgent: { en: "Read agent", zh: "读取智能体" },
  startAgentRun: { en: "Start agent", zh: "启动智能体" },
  controlAgentRun: { en: "Control agent", zh: "控制智能体" },
};

/** Localized action label for a tool, falling back to the raw tool name. */
export function toolLabel(name: string): string {
  return TOOL_LABELS[name]?.[currentLocale] ?? name;
}

/**
 * Localized one-line description for a registered CLI subcommand, keyed by
 * `path.join(" ")` (e.g. "auth chatgpt"). Returns null when no localized copy
 * exists so `nolo <group> --help` falls back to the registry's English
 * description instead of inventing one.
 */
export const COMMAND_DESCRIPTIONS: Record<string, Record<CliLocale, string>> = {
  "auth cooldown": {
    en: "List / clear credential availability cooldowns",
    zh: "列出 / 清除凭证可用性冷却",
  },
  "auth cloudflare": {
    en: "Authorize Cloudflare OAuth",
    zh: "授权 Cloudflare OAuth",
  },
  "auth chatgpt": {
    en: "Authorize ChatGPT / OpenAI Codex OAuth",
    zh: "授权 ChatGPT / OpenAI Codex OAuth",
  },
  "auth xai": {
    en: "Authorize xAI Grok OAuth (SuperGrok subscription)",
    zh: "授权 xAI Grok OAuth（SuperGrok 订阅）",
  },
  "auth antigravity": {
    en: "Authorize Google Antigravity OAuth",
    zh: "授权 Google Antigravity OAuth",
  },
  "auth claude": {
    en: "Authorize Claude Pro/Max OAuth",
    zh: "授权 Claude Pro/Max OAuth",
  },
  "auth cursor": {
    en: "Authorize Cursor Pro OAuth",
    zh: "授权 Cursor Pro OAuth",
  },
  "auth devin": {
    en: "Authorize Devin OAuth (Free SWE-2)",
    zh: "授权 Devin OAuth（免费 SWE-2）",
  },
};

export function cliCommandDescription(commandPath: string): string | null {
  return COMMAND_DESCRIPTIONS[commandPath]?.[currentLocale] ?? null;
}

/**
 * Every localized spelling of a tool label.
 *
 * Readers that RECOGNIZE a tool row in existing text must not depend on the
 * locale that happens to be active at paint time: a transcript row keeps the
 * spelling it was written with, and `/lang` can switch mid-session (the
 * transcript is then repainted under the new locale). Matching the current
 * locale only would silently demote those rows to ordinary prose.
 */
export function toolLabelVariants(name: string): string[] {
  const entry = TOOL_LABELS[name];
  if (!entry) return [name];
  return [...new Set(Object.values(entry))];
}

/**
 * Localized short status word for a run row (panel / dock).
 *
 * Terminal mapping mirrors the fixed run zone (`timeout`/`orphaned` read as
 * failure, `killed`/`cancelled` read as cancelled) so every run surface says
 * the same thing about the same state. Unknown future statuses fall through
 * verbatim: an unfamiliar word beats a blank.
 */
export function agentRunStatusWord(status: string): string {
  switch (status) {
    case "running":
      return t("runZoneRunning");
    case "pending":
      return t("runZonePending");
    case "cancelling":
      return t("runZoneCancelling");
    case "done":
      return t("runZoneDone");
    case "killed":
    case "cancelled":
      return t("runZoneCancelled");
    case "failed":
    case "timeout":
    case "orphaned":
      return t("runZoneFailed");
    case "not_found":
      return t("runStatusNotFound");
    default:
      return status;
  }
}

/** Labels injected into `packages/ai` agent-run card helpers (no cli→ai reverse dep). */
export function agentRunCardLabels(): {
  runStatus: string;
  runStarted: string;
  runStopped: string;
  runFinished: string;
  logTail: string;
  runs: (count: number) => string;
  toolCount: (count: number) => string;
  statusWord: (status: string) => string;
  /** Placeholder shown when a run's only name is a machine key (agent-pub-…). */
  unnamedAgent: string;
  rows: {
    agent: string;
    status: string;
    tools: string;
    note: string;
    error: string;
    task: string;
  };
} {
  return {
    runStatus: t("runStatusLabel"),
    runStarted: t("runStartedLabel"),
    runStopped: t("runStoppedLabel"),
    runFinished: t("runFinishedLabel"),
    logTail: t("runLogTailLabel"),
    runs: (count: number) => t("runsListLabel", String(count)),
    toolCount: (count: number) => t("runToolsCount", String(count)),
    statusWord: agentRunStatusWord,
    // Same folding rule as the run zone/panel: an unnamed run's machine key
    // collapses to the kind-of-actor word, never the key itself.
    unnamedAgent: t("subAgentName"),
    // Padding rides on the value so the default English layout is unchanged.
    rows: {
      agent: `${t("runRowAgent")}   `,
      status: `${t("runRowStatus")}  `,
      tools: `${t("runRowTools")}   `,
      note: `${t("runRowNote")}    `,
      error: `${t("runRowError")}   `,
      task: `${t("runRowTask")}    `,
    },
  };
}
