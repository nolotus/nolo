// packages/cli/tui/processTerminalNotice.ts
//
// 后台进程任务（launchProcess / 超时 detach 的 execShell）终态通知的共享格式化：
//  - 订阅侧（readlineWorkspace 的 onProcessTerminal 回调）用它生成单行通知；
//  - 注入侧（tuiTurnRunner 的 turn-scope context block）与状态栏 chip
//    （sessionRender 的 "⚙ N finished"）共用同一文案来源。
//
// 与 run 终态唤醒（runCompletionWatcher → child-run-completed）刻意分开：
// 进程任务没有 run 记录、没有子 dialog；promoted execShell 的可恢复输出由
// result capsule 直接随 terminal notice 携带，taskLogs 只保留 lifecycle 事实。

import type { ProcessTerminalNotice } from "../../agent-runtime/processRegistry";
import type { ProcessTaskResultCapsule } from "../../agent-runtime/processTaskResult";
import type { BackgroundTaskCompletedTurnEvent } from "core/chat/internalTurnEvent";

/**
 * 送进模型的通知全文（一条任务一段）。与 run wake 的 ContextualFragment
 * 标记不同：进程终态是轻量事实，不携带日志游标等结构，直接用稳定标记，
 * 供模型识别这是系统事件而非用户发言。
 *
 * promoted execShell 的终态会携带 result capsule（bounded stdout/stderr
 * tail，大输出/任何 inline 截断时附 full-output spill 指引）。没有 capsule 的
 * 通知只说明 terminal 事实；taskLogs 只能查看 lifecycle，不能拿 stdout/stderr。
 */
export function formatProcessTerminalWakeMessage(
  notices: ProcessTerminalNotice[],
): string {
  const missingCapsule = notices.some((notice) => !notice.resultCapsule);
  return [
    `<background_task_completion count="${notices.length}">`,
    ...notices.flatMap((notice) => [
      formatProcessTerminalNoticeLine(notice),
      ...(notice.resultCapsule
        ? formatProcessResultCapsuleLines(notice.resultCapsule)
        : []),
    ]),
    ...(missingCapsule ? ["生命周期详情可用 taskLogs(taskId)"] : []),
    `</background_task_completion>`,
  ].join("\n");
}

/** capsule → 通知块里的多行正文（bounded tail + 可选 spill 指引）。 */
export function formatProcessResultCapsuleLines(
  capsule: ProcessTaskResultCapsule,
): string[] {
  const meta: string[] = [];
  if (capsule.durationMs !== undefined) meta.push(`duration=${capsule.durationMs}ms`);
  meta.push(capsule.truncated ? "tail-only" : "full");
  const stream = (name: string, value: string) => [
    `--- ${name} ---`,
    ...(value.trim() ? value.replace(/\n+$/, "").split("\n") : ["(empty)"]),
  ];
  return [
    `result capsule (${meta.join(", ")})${capsule.spill ? `, full output: ${capsule.spill.displayPath} (${capsule.spill.totalChars} chars, ${capsule.spill.totalLines} lines)` : ""}:`,
    ...(capsule.captureError ? [`capture error: ${capsule.captureError}`] : []),
    ...stream("stdout", capsule.stdout),
    ...stream("stderr", capsule.stderr),
  ];
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
 * 终态通知 → 内部 turn 事件（自动续跑用）。
 *
 * 与 child-run-completed 同形：`text` 是给模型的完整事实——promoted execShell
 * 的通知在这里直接携带 result capsule（bounded stdout/stderr），不再指向
 * taskLogs 查输出；`displayText` 是屏幕上的紧凑单行，永远不含 capsule 正文。
 * 进程任务没有 run 记录可查询，所以 status / exitCode 直接进事件载荷，不借道
 * run 轴。
 */
export function buildProcessTaskCompletedTurnEvent(
  notice: ProcessTerminalNotice,
): BackgroundTaskCompletedTurnEvent {
  return {
    kind: "background-task-completed",
    taskId: notice.taskId,
    status: notice.status,
    ...(notice.exitCode !== undefined ? { exitCode: notice.exitCode } : {}),
    text: buildProcessTerminalTurnMessage([notice]),
    displayText: formatProcessTerminalNoticeLine(notice),
  };
}

/**
 * 把 pendingProcessNotices 里存的格式化单行解析回结构化通知。
 *
 * state 里存的是已格式化的单行（订阅侧不保留结构对象，避免 TuiState 挂
 * 引用类型）：注入时把每行还原成 Notice 再进同一 formatter，保证「存的
 * 行」与「注入的行」永远一致。行格式见 formatProcessTerminalNoticeLine。
 */
const PENDING_NOTICE_PREFIX = "process-notice-v1:";

/** Persist the full model payload only when a capsule exists; legacy notices
 * keep their compact line representation for backwards compatibility. */
export function serializePendingProcessNotice(notice: ProcessTerminalNotice): string {
  return notice.resultCapsule
    ? `${PENDING_NOTICE_PREFIX}${JSON.stringify(notice)}`
    : formatProcessTerminalNoticeLine(notice);
}

export function parsePendingProcessNoticeLine(
  line: string,
): ProcessTerminalNotice {
  if (line.startsWith(PENDING_NOTICE_PREFIX)) {
    try {
      const parsed = JSON.parse(line.slice(PENDING_NOTICE_PREFIX.length)) as ProcessTerminalNotice;
      if (parsed && typeof parsed.taskId === "string" && parsed.resultCapsule) {
        return parsed;
      }
    } catch {
      // Fall through to the legacy line parser.
    }
  }
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
