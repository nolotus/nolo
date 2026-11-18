export const turnStrings = {
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
  turnStopped: {
    en: "Stopped this reply.",
    zh: "已停止本次回复。",
  },
  turnStoppedToolPending: {
    en: "Stopped waiting. {0} may still be finishing in the background — its result won't be added to this conversation.",
    zh: "已停止等待。{0} 可能仍在后台完成，其结果不会计入本次对话。",
  },
  wakeQueuedWhileStopped: {
    en: "Stopped. {0} queued background result(s) are waiting — press Enter to continue (Ctrl+S sends all at once).",
    zh: "已停止。还有 {0} 项后台结果在队列里等着——按 Enter 继续（Ctrl+S 合并发送）。",
  },
  turnStopping: {
    en: "Stopping… press Esc again to force",
    zh: "正在停止…再按一次 Esc 强制停止",
  },
  activityThinking: {
    en: "Thinking",
    zh: "思考中",
  },
  turnFailed: {
    en: "This reply failed. Queued messages are kept — press Enter to resend.",
    zh: "本次回复出错。已排队的消息仍保留，按 Enter 可重新发送。",
  },
  wakePausedOnErrorHint: {
    en: "Background task wake paused due to an error — send any message to continue.",
    zh: "后台任务唤醒因错误暂停，发送任意消息即可继续。",
  },
  statusPendingProcesses: {
    en: "↪ {0} pending",
    zh: "↪ {0} 项待汇入",
  },
  // --- Ask choice (ask_user) ------------------------------------------
  askChoiceHintMove: {
    en: "↑↓ select",
    zh: "↑↓ 选择",
  },
  askChoiceHintPick: {
    en: "Enter pick",
    zh: "Enter 选择",
  },
  askChoiceHintToggle: {
    en: "Enter toggle",
    zh: "Enter 切换",
  },
  askChoiceHintSkip: {
    en: "skip",
    zh: "可跳过",
  },
  askChoiceHintSend: {
    en: "↓ Done sends",
    zh: "↓ 完成发送",
  },
  askChoiceHintOther: {
    en: "Other: text",
    zh: "其他可输入",
  },
  askChoiceHintTab: {
    en: "Tab",
    zh: "Tab 切换",
  },
  askChoiceHintCancel: {
    en: "Esc cancels",
    zh: "Esc 取消",
  },
  askChoiceHintWheelHistory: {
    en: "wheel: history",
    zh: "滚轮看上文",
  },
  askChoiceHintWheelSelect: {
    en: "wheel: list",
    zh: "滚轮选择",
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
} as const;
