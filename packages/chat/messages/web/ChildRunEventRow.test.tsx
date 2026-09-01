import { describe, expect, it } from "bun:test";
import React from "react";
import { renderInDom } from "../../../testing/domRender";
import ChildRunEventRow, {
  mergeWakeEventsIntoEntries,
  type WakeEvent,
} from "./ChildRunEventRow";
import type { GroupedRenderEntry } from "./groupToolEntries";

const makeEvent = (
  overrides: Partial<WakeEvent> & { createdAt: string }
): WakeEvent => ({
  type: "child-run-completed",
  childDialogKey: "dialog-u-1",
  terminalStatus: "done",
  text: "full summary for the model",
  displayText: "子任务已完成",
  ...overrides,
});

const makeMessage = (
  id: string,
  role: string,
  createdAt?: string
): any => ({
  id,
  role,
  content: role === "user" ? "hi" : "reply",
  ...(createdAt ? { createdAt } : {}),
});

const single = (message: any): GroupedRenderEntry => ({
  type: "single",
  key: message.id,
  message,
});

describe("mergeWakeEventsIntoEntries", () => {
  it("renders wake events as compact rows showing displayText", async () => {
    const view = await renderInDom(
      <ChildRunEventRow
        event={makeEvent({
          createdAt: "2026-09-01T10:00:00.000Z",
          displayText: "后台子任务已完成",
        })}
      />
    );
    try {
      const html = view.container.innerHTML;
      expect(html).toContain('data-testid="child-run-event-row"');
      expect(html).toContain("后台子任务已完成");
      // 完整摘要（text）不得上屏
      expect(html).not.toContain("full summary for the model");
      // 单行紧凑：无 action 按钮、无折叠控件
      expect(html).not.toContain("<button");
    } finally {
      await view.cleanup();
    }
  });

  it("merges wake events by createdAt into the correct relative position between two messages", () => {
    const entries: GroupedRenderEntry[] = [
      single(makeMessage("m1", "user", "2026-09-01T09:00:00.000Z")),
      single(makeMessage("m2", "assistant", "2026-09-01T11:00:00.000Z")),
    ];
    const events: WakeEvent[] = [
      makeEvent({
        childDialogKey: "dialog-u-child-2",
        createdAt: "2026-09-01T12:00:00.000Z",
        displayText: "第二个子任务完成",
      }),
      makeEvent({
        childDialogKey: "dialog-u-child-1",
        createdAt: "2026-09-01T10:00:00.000Z",
        displayText: "第一个子任务完成",
      }),
    ];

    const result = mergeWakeEventsIntoEntries(entries, events);
    expect(result).toHaveLength(4);
    // 事件按 createdAt 升序归并：child-1 夹在 m1 与 m2 之间，child-2 在末尾
    expect(result[0]).toBe(entries[0]);
    expect(result[1]).toMatchObject({
      type: "wake-event",
      event: { childDialogKey: "dialog-u-child-1" },
    });
    expect(result[2]).toBe(entries[1]);
    expect(result[3]).toMatchObject({
      type: "wake-event",
      event: { childDialogKey: "dialog-u-child-2" },
    });
  });

  it("returns the exact same entries when wakeEvents is empty or undefined", () => {
    const entries: GroupedRenderEntry[] = [
      single(makeMessage("m1", "user", "2026-09-01T09:00:00.000Z")),
      single(makeMessage("m2", "assistant", "2026-09-01T11:00:00.000Z")),
    ];
    expect(mergeWakeEventsIntoEntries(entries, undefined)).toBe(entries);
    expect(mergeWakeEventsIntoEntries(entries, [])).toBe(entries);
    expect(mergeWakeEventsIntoEntries(entries, null)).toBe(entries);
  });

  it("applies warning styling for failed terminal status", async () => {
    const view = await renderInDom(
      <ChildRunEventRow
        event={makeEvent({
          createdAt: "2026-09-01T10:00:00.000Z",
          terminalStatus: "failed",
          displayText: "子任务执行失败",
        })}
      />
    );
    try {
      const row = view.container.querySelector(
        '[data-testid="child-run-event-row"]'
      );
      expect(row).not.toBeNull();
      expect(row?.getAttribute("data-terminal-status")).toBe("failed");
      expect(row?.className).toContain("child-run-event-row--failed");
      expect(view.container.innerHTML).toContain("子任务执行失败");
    } finally {
      await view.cleanup();
    }
  });

  it("falls back to message ULID id time when createdAt is missing", () => {
    // 26 位 ULID：encodeTime 前缀（10 字符）+ 16 位随机后缀；无 createdAt 时
    // 用 id 内嵌时间参与归并。这里 ulid 时间 09:15 夹在 m1(09:00) 与事件(09:30) 之间。
    const { encodeTime } = require("ulid") as typeof import("ulid");
    const ulidAt0915 = encodeTime(Date.UTC(2026, 8, 1, 9, 15), 10) + "A".repeat(16);
    const entries: GroupedRenderEntry[] = [
      single(makeMessage("m1", "user", "2026-09-01T09:00:00.000Z")),
      // 无 createdAt，id 内嵌时间 09:15
      single({ id: ulidAt0915, role: "assistant", content: "mid" }),
    ];
    const events: WakeEvent[] = [
      makeEvent({
        childDialogKey: "dialog-u-child-1",
        createdAt: "2026-09-01T09:30:00.000Z",
        displayText: "子任务完成",
      }),
    ];
    const result = mergeWakeEventsIntoEntries(entries, events);
    expect(result[0]).toBe(entries[0]);
    expect(result[1]).toBe(entries[1]);
    expect(result[2]).toMatchObject({ type: "wake-event" });
  });
});
