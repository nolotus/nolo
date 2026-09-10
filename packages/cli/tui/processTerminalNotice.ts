// packages/cli/tui/processTerminalNotice.ts
//
// 后台进程任务（launchProcess / 超时 detach 的 execShell）终态通知的共享格式化：
//  - 订阅侧（readlineWorkspace 的 onProcessTerminal 回调）用它生成单行通知；
//  - 注入侧（tuiTurnRunner 的 turn-scope context block）与状态栏 chip
//    （sessionRender 的 "⚙ N finished"）共用同一文案来源。
//
// 与 run 终态唤醒（runCompletionWatcher → child-run-completed）刻意分开：
// 进程任务没有 run 记录、没有 dialog 归属、没有可恢复的输出（taskLogs 已是
// 独立工具），所以通知是纯摘要 + 提示行，不走 child-run-completed 事件轴。

import type { ProcessTerminalNotice } from "../../agent-runtime/processRegistry";

/**
 * 送进模型的通知全文（一条任务一段）。与 run wake 的 ContextualFragment
 * 标记不同：进程终态是轻量事实，不携带日志游标等结构，直接用稳定标记，
 * 供模型识别这是系统事件而非用户发言。
 */
export function formatProcessTerminalWakeMessage(
  notices: ProcessTerminalNotice[],
): string {
  return [
    `<background_task_completion count="${notices.length}">`,
    ...notices.map(formatProcessTerminalNoticeLine),
    `需要输出/详情时: taskLogs(taskId) 或 tasks`,
    `</background_task_completion>`,
  ].join("\n");
}

/** 单行摘要（注入块与屏幕显示共用的最小事实）。 */
export function formatProcessTerminalNoticeLine(
  notice: ProcessTerminalNotice,
): string {
  // label 只在它有信息量（不同于 command/缺省）时出现；内嵌引号/反斜杠
  // 转义，保证 parsePendingProcessNoticeLine 能无损还原。
  const informative =
    notice.label && notice.label.trim() !== "" && notice.label !== notice.command;
  const label = informative
    ? ` (label: "${notice.label.replace(/(["\\])/g, "\\$1")}")`
    : "";
  const exit = notice.exitCode !== undefined ? ` exitCode=${notice.exitCode}` : "";
  return `[Background task ${notice.taskId}${label} finished: status=${notice.status}${exit}]`;
}

/** 下一轮 turn 的注入文本（多条合并为一条事件消息）。 */
export function buildProcessTerminalTurnMessage(
  notices: ProcessTerminalNotice[],
): string {
  if (notices.length === 0) return "";
  return formatProcessTerminalWakeMessage(notices);
}

/**
 * 把 pendingProcessNotices 里存的格式化单行解析回结构化通知。
 *
 * state 里存的是已格式化的单行（订阅侧不保留结构对象，避免 TuiState 挂
 * 引用类型）：注入时把每行还原成 Notice 再进同一 formatter，保证「存的
 * 行」与「注入的行」永远一致。行格式见 formatProcessTerminalNoticeLine。
 */
export function parsePendingProcessNoticeLine(
  line: string,
): ProcessTerminalNotice {
  const taskMatch = line.match(
    /^\[Background task ([^ \]]+?)(?:\s+\(label: "((?:[^"\\]|\\.)*)"\))? finished: status=(\w+)(?: exitCode=(-?\d+))?\]$/,
  );
  if (!taskMatch) {
    // 不认识的行（理论上不可能：行只由 formatProcessTerminalNoticeLine
    // 产生）原样透传为 command，让模型至少能看到原始事实。
    return {
      taskId: line,
      pid: 0,
      label: "",
      command: line,
      status: "failed",
    };
  }
  const [, taskId, rawLabel, status, rawExit] = taskMatch;
  const label = rawLabel ? unescapeLabel(rawLabel) : "";
  return {
    taskId,
    pid: 0,
    label,
    command: "",
    status: normalizeStatus(status),
    ...(rawExit !== undefined ? { exitCode: Number(rawExit) } : {}),
  };
}

function unescapeLabel(raw: string): string {
  return raw.replace(/\\(["\\])/g, "$1");
}

function normalizeStatus(raw: string): "stopped" | "exited" | "failed" {
  if (raw === "stopped" || raw === "exited") return raw;
  return "failed";
}