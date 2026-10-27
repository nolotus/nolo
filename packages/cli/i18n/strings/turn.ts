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
  turnStopping: {
    en: "Stopping… press Esc again to force",
    zh: "正在停止…再按一次 Esc 强制停止",
  },
  turnFailed: {
    en: "This reply failed. Queued messages are kept — press Enter to resend.",
    zh: "本次回复出错。已排队的消息仍保留，按 Enter 可重新发送。",
  },
  // 回合结束的淡色收尾行：耗时 · 输出 token · 积分（后两段可缺省）。
  turnSummaryOutput: {
    en: "{0} out",
    zh: "输出 {0}",
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
} as const;
