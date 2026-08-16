import { describe, expect, it } from "bun:test";
import { projectChatQueueStatus } from "./chatQueueStatus";
import type { ChatQueueState } from "./chatQueueMachine";

const baseState = (queue: any[]): ChatQueueState =>
  ({
    running: true,
    queue,
    drainPaused: false,
    lastDrainError: null,
  }) as ChatQueueState;

describe("projectChatQueueStatus queue preview", () => {
  it("prefers an internal event's displayText over the model-facing summary", () => {
    // 子 run 终态事件的 text 是给模型的完整摘要（几百字），塞进队列预览会把
    // 「你还有什么没发出去」这条信息淹掉。
    const status = projectChatQueueStatus({
      state: baseState([
        {
          text: "【后台 run 终态通知】你派出的 1 条后台 run 已到达终态：\n\nrunId: run-a\nstatus: done",
          event: {
            kind: "child-run-completed",
            runs: [],
            text: "【后台 run 终态通知】…",
            displayText: "1 条后台 run 已完成 · ✓ Worker · 1m00s",
          },
        },
      ]),
    });
    expect(status.queuePreview[0]).toBe("1 条后台 run 已完成 · ✓ Worker · 1m00s");
    expect(status.queuePreview[0]).not.toContain("runId:");
  });

  it("falls back to text for plain user entries and raw strings", () => {
    const status = projectChatQueueStatus({
      state: baseState([
        { text: "hello", event: { kind: "user", text: "hello" } },
        "raw string entry",
      ]),
    });
    expect(status.queuePreview).toEqual(["hello", "raw string entry"]);
  });

  it("still truncates a long displayText to the preview limit", () => {
    const status = projectChatQueueStatus({
      state: baseState([
        {
          text: "full summary",
          event: { kind: "child-run-completed", runs: [], text: "x", displayText: "长".repeat(80) },
        },
      ]),
      previewCharLimit: 10,
    });
    expect(status.queuePreview[0]).toBe(`${"长".repeat(10)}…`);
  });
});
