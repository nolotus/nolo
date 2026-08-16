import { describe, expect, test } from "bun:test";
import { resolveStreamEndFinalMetadata } from "./messageStreamEndFinalMetadata";

const baseMessages: unknown[] = [];

describe("resolveStreamEndFinalMetadata", () => {
  test("keeps persisted metadata when activity already present (no infer)", () => {
    const persisted = { activity: { phase: { id: "p1", status: "success" } } };
    const { finalMetadata } = resolveStreamEndFinalMetadata({
      persistedMetadata: persisted as any,
      toolCalls: null,
      messages: baseMessages,
      finalContent: "done",
    });
    expect(finalMetadata).toEqual(persisted);
    // Should not have invoked inference (no merge markers).
    expect(finalMetadata).toBe(persisted);
  });

  test("keeps persisted metadata when toolCalls present (no infer)", () => {
    const persisted = { foo: "bar" };
    const { finalMetadata } = resolveStreamEndFinalMetadata({
      persistedMetadata: persisted as any,
      toolCalls: [{ id: "t1" }],
      messages: baseMessages,
      finalContent: "ran a tool",
    });
    expect(finalMetadata).toEqual(persisted);
    expect(finalMetadata).toBe(persisted);
  });

  test("merges inferred metadata over persisted when no activity and no tools", () => {
    const persisted = { keep: "me" };
    const plan = {
      phases: [
        { id: "inspect", title: "查找数据源" },
        { id: "fetch", title: "获取数据" },
        { id: "report", title: "生成可视化图表并向用户汇报结果" },
      ],
    };
    const messagesWithPendingPhase = [
      {
        id: "tool-inspect",
        role: "tool",
        metadata: {
          activity: {
            plan,
            phase: { id: "inspect", title: "查找数据源" },
            action: { title: "查找 API" },
          },
        },
      },
      {
        id: "tool-fetch",
        role: "tool",
        metadata: {
          activity: {
            phase: { id: "fetch", title: "获取数据" },
            action: { title: "执行获取" },
          },
        },
      },
    ];
    const { finalMetadata } = resolveStreamEndFinalMetadata({
      persistedMetadata: persisted as any,
      toolCalls: [],
      messages: messagesWithPendingPhase,
      finalContent: "结论：以下是增长最快国家的可视化图表。",
    });
    // Inferred metadata present (activity.phase) merged over persisted.
    expect(finalMetadata).toBeDefined();
    expect((finalMetadata as any).keep).toBe("me");
    expect((finalMetadata as any).activity).toBeDefined();
    expect((finalMetadata as any).activity.phase.status).toBe("success");
  });

  test("returns persisted metadata when inference yields nothing", () => {
    const persisted = { foo: "bar" };
    const { finalMetadata } = resolveStreamEndFinalMetadata({
      persistedMetadata: persisted as any,
      toolCalls: null,
      messages: baseMessages,
      finalContent: "no structured phases here",
    });
    expect(finalMetadata).toEqual(persisted);
    expect(finalMetadata).toBe(persisted);
  });
});