// 后台 run 终态事件（wakeEvents）的紧凑系统行渲染。
// 契约见 docs/plans/2026-09-01-kill-wake-user-message.md「契约」节：
// wakeEvents 挂在 dialog record 上（不落消息表），Web 按 createdAt 归并进
// 消息流，渲染为单行系统提示（非用户气泡、非 assistant 消息）。
import * as stylex from "@stylexjs/stylex";
import React, { memo } from "react";
import { LuCheck, LuX } from "react-icons/lu";
import { decodeTime } from "ulid";
import { messagesStyles as styles } from "./messagesStyles";
import { withLiteralClass } from "./toolMessageShared";
import type { GroupedRenderEntry } from "./groupToolEntries";

/** 契约：dialog record 上的 wakeEvents 条目（不得自行改 shape）。 */
export interface WakeEvent {
  type: "child-run-completed";
  childDialogKey: string; // 幂等去重键（childDialogKey + terminalStatus）
  childDialogId?: string;
  terminalStatus: string; // "done" | "failed" | "cancelled"
  text: string; // 完整摘要（模型用，UI 不显示）
  displayText: string; // 单行（UI 显示这个）
  createdAt: string; // ISO 8601
}

/** 归并后的渲染条目：消息条目 + wake-event 系统行。 */
export type RenderEntry =
  | GroupedRenderEntry
  | { type: "wake-event"; key: string; event: WakeEvent };

const toMillis = (value: unknown): number => {
  if (value == null) return Number.NaN;
  const t = new Date(value as string | number | Date).getTime();
  return Number.isNaN(t) ? Number.NaN : t;
};

/** 消息时间戳：优先 createdAt，缺失时回退到 ULID id 内嵌时间。 */
const messageTimestamp = (message: any): number => {
  if (!message || typeof message !== "object") return 0;
  const created = toMillis(message.createdAt);
  if (!Number.isNaN(created)) return created;
  const id = message.id;
  if (typeof id === "string" && id.length === 26) {
    try {
      const t = decodeTime(id);
      if (Number.isFinite(t)) return t;
    } catch {
      // 非 ULID id（测试/旧数据）→ 落到 0
    }
  }
  return 0;
};

const entryTimestamp = (entry: GroupedRenderEntry): number => {
  if (entry.type === "single") return messageTimestamp(entry.message);
  // tool-group 以组内首条消息为锚点（组不可拆分，也不得改动 ToolMessageGroup）
  return messageTimestamp(entry.messages?.[0]);
};

/**
 * 把 wakeEvents 按 createdAt 升序归并进消息条目流：
 * 事件插到「锚点时间戳严格大于事件时间」的第一条消息之前；无更大者则追加到末尾。
 * wakeEvents 为空/undefined 时原样返回 entries（同一引用 → 零渲染、零布局变化）。
 */
export function mergeWakeEventsIntoEntries(
  entries: GroupedRenderEntry[],
  wakeEvents: WakeEvent[] | null | undefined
): RenderEntry[] {
  if (!Array.isArray(wakeEvents) || wakeEvents.length === 0) return entries;

  const sorted = wakeEvents
    .filter((e) => e && typeof e?.createdAt === "string")
    .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
  if (sorted.length === 0) return entries;

  const result: RenderEntry[] = [];
  let eventIndex = 0;
  for (const entry of entries) {
    const anchor = entryTimestamp(entry);
    while (eventIndex < sorted.length) {
      const ev = sorted[eventIndex];
      if (toMillis(ev.createdAt) <= anchor) {
        result.push({
          type: "wake-event",
          key: `wake-event-${ev.childDialogKey}-${ev.terminalStatus}`,
          event: ev,
        });
        eventIndex += 1;
      } else {
        break;
      }
    }
    result.push(entry);
  }
  while (eventIndex < sorted.length) {
    const ev = sorted[eventIndex];
    result.push({
      type: "wake-event",
      key: `wake-event-${ev.childDialogKey}-${ev.terminalStatus}`,
      event: ev,
    });
    eventIndex += 1;
  }
  return result;
}

const statusModifier = (status: string): string =>
  status === "failed"
    ? "child-run-event-row--failed"
    : status === "cancelled"
      ? "child-run-event-row--cancelled"
      : "child-run-event-row--done";

const statusStyle = (status: string) =>
  status === "failed"
    ? styles.wakeEventStatusFailed
    : status === "cancelled"
      ? styles.wakeEventStatusCancelled
      : styles.wakeEventStatusDone;

/**
 * 单行紧凑系统行：直接显示 displayText（不拼接、不折叠、无 action 按钮）。
 * terminalStatus !== "done" 时给警示色（失败 ✗ 红 / 取消 ✗ 橙；成功 ✓ 弱化绿）。
 */
const ChildRunEventRow: React.FC<{ event: WakeEvent }> = memo(
  function ChildRunEventRow({ event }) {
    const status = event?.terminalStatus ?? "done";
    const isDone = status === "done";
    return (
      <div
        {...withLiteralClass(
          `child-run-event-row ${statusModifier(status)}`,
          styles.wakeEventRow
        )}
        data-testid="child-run-event-row"
        data-terminal-status={status}
      >
        <span
          {...withLiteralClass(
            "child-run-event-icon",
            styles.wakeEventIcon,
            statusStyle(status)
          )}
          aria-hidden="true"
        >
          {isDone ? (
            <LuCheck size={13} aria-hidden="true" />
          ) : (
            <LuX size={13} aria-hidden="true" />
          )}
        </span>
        <span
          {...withLiteralClass("child-run-event-text", styles.wakeEventText)}
          title={event?.displayText}
        >
          {event?.displayText}
        </span>
      </div>
    );
  }
);

export default ChildRunEventRow;
