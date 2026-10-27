export const commonStrings = {
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
  persistentProcessesLeft: {
    en: "{0} persistent process(es) left running in the background.",
    zh: "仍有 {0} 个常驻后台进程在后台继续运行。",
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
  noDialogsYet: {
    en: "No dialogs yet.",
    zh: "还没有历史对话。",
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
  forceStopped: {
    en: "Force stopped. Background tasks may still be finishing.",
    zh: "已强制停止，后台任务可能仍在收尾。",
  },
  quotaExhaustedHint: {
    en: "This agent is temporarily unavailable (HTTP 429).\nUse /agent to switch to another agent and keep going — the dialog context is preserved.",
    zh: "当前 agent 暂时不可用（HTTP 429）。\n可以用 /agent 切换到其他 agent 后继续，同一对话会保留上下文。",
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
    en: "[hint] Press Ctrl+C again to exit | Type /copy to copy the latest reply",
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
  // --- Tool trace copy ------------------------------------------------------
  // The compact trace shows only status, never timing or output size: a line
  // count told the user nothing actionable and the ms figure read as noise.
  workingFallback: {
    en: "Working…",
    zh: "处理中…",
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
  // --- Local run 429/rate-limit display (compact 3-line block) --------------
  // 旧 429 文案是一条巨长英文 + 结尾拼接中文冷却说明（又长又中英混排）。现在按
  // locale 渲染 3 行：headline（含上游 tag 与清洗后的详情）+ 冷却/探测 + 出口。
  // {0} = 上游标签（antigravity · gemini-3.8-flash-tiered；取不到回退 transport 名）
  // {1} = 清洗后的上游原文（去 details= / 传输前缀 / 结尾复位句，折叠空白，≤140 字符）
  localRunRateLimitQuota: {
    en: "[nolo] Upstream quota exhausted ({0}): {1}",
    zh: "[nolo] 上游额度已用尽（{0}）：{1}",
  },
  localRunRateLimitThrottled: {
    en: "[nolo] Upstream rate limit ({0}): {1}",
    zh: "[nolo] 上游限流（{0}）：{1}",
  },
  // 上游明确表示「服务容量饱和」（如 Codex 的 "is at capacity"）。这与账号额度
  // 无关，用「额度」措辞会让人误以为是自己配额用完了。单独一档。
  localRunRateLimitCapacity: {
    en: "[nolo] Upstream service at capacity ({0}): {1}",
    zh: "[nolo] 上游服务容量饱和（{0}）：{1}",
  },
  // 第 2 行复位提示：沿用 extractRateLimitResetHint 抓到的上游原文（不换算），
  // 只作括号补充；没抓到就没有这段括号。
  localRunRateLimitResetNote: {
    en: " (upstream reset in {0})",
    zh: "（上游约 {0}后复位）",
  },
  // 第 2 行：{0} = 冷却截止（本地时间，当天 HH:MM / 跨天 MM-DD HH:MM），
  // {1} = 复位提示或空串，{2} = 自动探测间隔（分钟）。无 cooldownUntil 时整行省略。
  localRunRateLimitCooldown: {
    en: " Cooldown until {0}{1}; auto-probing every {2} min meanwhile (the upstream may not be restored by then).",
    zh: " 冷却至 {0}{1}；期间每 {2} 分钟自动试探一次（上游未必届时恢复）。",
  },
  // 第 3 行：三个出口（换 agent / 强制走服务器 / 已充值清冷却）。
  localRunRateLimitExits: {
    en: " Switch agent: nolo agent list; force server: --server; topped up: nolo auth cooldown, then --clear <credential>",
    zh: " 换 agent：nolo agent list；强制走服务器：--server；已充值：nolo auth cooldown 查凭证名后 --clear <凭证名>",
  },
  // --- Local run 402/余额不足 display (compact 3-line block) ----------------
  // 与 429 同结构：headline（余额不足 / Coding Plan 额度用尽 + 上游 tag）+ 复位
  // 时刻（仅当报文确实给了 reset_at）+ 出口。{0} = 上游标签（provider · model，
  // 取不到回退 transport 名），{1} = 清洗后的原因（或定量原因）。
  localRunBalanceExhausted: {
    en: "[nolo] Insufficient balance, cannot continue ({0}): {1}",
    zh: "[nolo] 余额不足，无法继续（{0}）：{1}",
  },
  // 报文带 coding_plan_exhausted 时的措辞：计划额度与钱包余额是两笔要分别充的账。
  localRunBalanceCodingPlan: {
    en: "[nolo] Coding Plan quota exhausted and the wallet balance is insufficient ({0}): {1}",
    zh: "[nolo] Coding Plan 额度已用尽且钱包余额不足（{0}）：{1}",
  },
  // 第 2 行：{0} = 计划额度复位时刻（本地时间）。报文没给复位时刻时整行省略。
  localRunBalanceReset: {
    en: " Plan quota resets at {0} — this restores the plan quota only; it does not top up your wallet.",
    zh: " 计划额度 {0} 复位——只恢复计划额度，不会给钱包充值。",
  },
  // 清洗后仍取不到原因（报文只有 `{"error":{}}` 这类空壳）时的兜底：避免悬空冒号。
  localRunBalanceUnknownReason: {
    en: "the provider returned a payment-required error without a reason line",
    zh: "上游只返回了「需要付款」错误，没有给出原因",
  },
  // 第 3 行：出口（充值后重发 / 换 agent / 强制走服务器）。刻意不重复 TUI 那句
  //「你刚发的话已保存在当前对话里」。
  localRunBalanceExits: {
    en: " Top up and send again; or switch agent: nolo agent list; force server: --server",
    zh: " 充值后重发即可；或换 agent：nolo agent list；强制走服务器：--server",
  },
  thinkingTraceLine: {
    en: "✻ Thought for {0}",
    zh: "✻ 思考 {0}",
  },
  usedSkillLabel: {
    en: "Used Skill",
    zh: "已加载技能",
  },
  // Background-process rows in the same zone (`❯ npm run dev · 已运行 3m · pid 123`).
  // The pid is how the user targets /stop, so it is a fact, not decoration.
  procZonePid: { en: "pid {0}", zh: "pid {0}" },
  // 残留行（进程已退出）：running 用 `已运行`，退出的说「用时」，因为它不再走秒。
  procZoneTook: { en: "took {0}", zh: "用时 {0}" },
  procZoneExit: { en: "exit {0}", zh: "exit {0}" },
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
    en: "Allow destructive shell commands from local runs?",
    zh: "允许本机 run 执行破坏性 shell 命令吗？",
  },
  dialogConfirmBody: {
    en: "This command may delete or reset user content — a local-run destructive shell command.",
    zh: "该命令可能删除或重置用户内容，属于本机 run 的破坏性 shell 命令。",
  },
  dialogConfirmExternalFileTitle: {
    en: "Allow reading files outside the workspace?",
    zh: "允许读取工作区外部文件吗？",
  },
  dialogConfirmExternalFileBody: {
    en: "This path is outside the current workspace — a local-run outside-workspace file access.",
    zh: "该路径位于当前工作区之外，属于本机 run 的工作区外文件访问。",
  },
  dialogConfirmFileWriteTitle: {
    en: "Allow writing files from local runs?",
    zh: "允许本机 run 写入文件吗？",
  },
  dialogConfirmFileWriteBody: {
    en: "This action writes into the workspace — a local-run file-write confirmation.",
    zh: "该操作会写入工作区文件，属于本机 run 的写文件确认。",
  },
  dialogConfirmRememberLocal: {
    en: "Approving covers all three local-run classes (destructive shell / outside-workspace files / file writes) and is saved, so they stop asking — this session and future starts. Undo with /auto local off or /auto reset.",
    zh: "批准后本机 run 的三类确认（破坏性命令 / 工作区外文件 / 写文件）都不再询问，并保存到配置（本次与后续启动都生效）。撤销用 /auto local off 或 /auto reset。",
  },
  dialogConfirmCommandTruncated: {
    en: "(truncated)",
    zh: "（已截断）",
  },
  dialogConfirmAllowLabel: {
    en: "Approve & remember",
    zh: "批准并记住",
  },
  dialogConfirmAllowDetail: {
    en: "stop asking for this class (saved)",
    zh: "同类确认不再询问（已保存）",
  },
  dialogConfirmCancelLabel: {
    en: "Reject",
    zh: "拒绝",
  },
  dialogConfirmCancelDetail: {
    en: "do not run it; ask again next time",
    zh: "不执行，下次仍会询问",
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
  mediaFoundHint: {
    en: "🎧 found media (will transcribe): {0}",
    zh: "🎧 识别到音视频（将转写）：{0}",
  },
  mediaPreprocessStart: {
    en: "🎧 {0} preprocessing…",
    zh: "🎧 {0} 预处理中…",
  },
  mediaTranscribeProgress: {
    en: "🎧 {0} transcribing… {1}",
    zh: "🎧 {0} 转写中… {1}",
  },
  mediaTranscribeDone: {
    en: "🎧 {0} transcribed — saved: {1}",
    zh: "🎧 {0} 转写完成——已保存：{1}",
  },
  mediaTranscribeDoneAttach: {
    en: "🎧 {0} transcribed — txt: {1}\n   srt: {2}\n   transcript will be attached to your next message.",
    zh: "🎧 {0} 转写完成——txt：{1}\n   srt：{2}\n   转写内容将随你下一条消息发送给模型。",
  },
  mediaTranscribeFailed: {
    en: "{0} transcription failed: {1}",
    zh: "{0} 转写失败：{1}",
  },
  mediaSilenceTrimScanning: {
    en: "🎧 {0} checking for trailing silence…",
    zh: "🎧 {0} 检查尾部静音…",
  },
  mediaSilenceTrimNotice: {    en: "🎧 {0}: about {1} min of trailing silence — suggesting cut to {2} (saves ~{1} min).",
    zh: "🎧 {0}：尾部约 {1} 分钟基本无人声，建议截到 {2}（可省约 {1} 分钟）。",
  },
  mediaSilenceTrimTitle: {
    en: "Transcribe range — trailing silence detected",
    zh: "转写范围——检测到尾部静音",
  },
  mediaSilenceTrimDetail: {
    en: "Suggestion: keep everything before {0} (saves ~{1} min of upload/transcription).",
    zh: "建议：只处理 {0} 之前的内容（省约 {1} 分钟的预处理与转写）。",
  },
  mediaSilenceTrimOptionAll: {
    en: "Transcribe everything",
    zh: "全部（不裁剪）",
  },
  mediaSilenceTrimOptionTrim: {
    en: "Follow the suggestion: cut to {0} (saves ~{1} min)",
    zh: "按建议：截到 {0}（省约 {1} 分钟）",
  },
  mediaSilenceTrimApplied: {
    en: "🎧 following the suggestion — transcribing up to {0}.",
    zh: "🎧 已按建议裁剪——只转写 {0} 之前的内容。",
  },
  mediaSilenceTrimHintOnly: {
    en: "🎧 keeping the full file (can't ask right now). To trim, rerun /transcribe with --to {0}.",
    zh: "🎧 当前无法交互，按全片转写；如需裁剪，请用 --to {0} 重跑 /transcribe。",
  },
  transcribeUsage: {
    en: "Usage: /transcribe <path> [--from ss|mm:ss|hh:mm:ss] [--to ss|mm:ss|hh:mm:ss] [--lang zh|en|...] [--denoise off|light|strong]",
    zh: "用法：/transcribe <路径> [--from 秒|分:秒|时:分:秒] [--to 秒|分:秒|时:分:秒] [--lang zh|en|...] [--denoise off|light|strong]",
  },
  transcribeArgError: {
    en: "Invalid /transcribe argument: {0}",
    zh: "/transcribe 参数错误：{0}",
  },
  transcribeNotMedia: {
    en: "Not a media file: {0}",
    zh: "不是音视频文件：{0}",
  },
  transcribeBusyHint: {
    en: "/transcribe is unavailable while a reply is running — it attaches to your next message. Wait for the reply to finish, then run it.",
    zh: "回复进行中不能执行 /transcribe——转写产物要随下一条消息发送。等本轮回复结束后再执行。",
  },
  busyAttachmentsBlocked: {
    en: "can't queue a message with {0} clipboard image(s) while a turn is running — draft kept. Send again after this turn ends, or press Backspace to drop the attachment and send text only.",
    zh: "忙碌中无法排队带 {0} 张剪贴板图片的消息，草稿已保留；等本轮结束后再按 Enter 发送，或 Backspace 撤销附件后改发纯文字。",
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
} as const;
