// packages/ai/tools/agent/startAgentRunTool.test.ts
import { describe, expect, it, mock, beforeEach } from "bun:test";
import {
  lastRunAgentBackgroundCalls,
  listenToDialogEventsMock,
  resetAgentTestMocks,
  runAgentBackgroundMock,
  setRunAgentBackgroundImpl,
} from "./agentTestMocks";

// 与 controlAgentRunTool / agentOrchestrationScenario 合并执行（同一进程，不带
// --isolate）时，mock.module 的替换先注册者生效；这里注册与其它两个文件
// 完全相同的工厂（同一组共享 mock 函数），确保无论哪份注册生效，导入与
// 行为都一致（见 agentTestMocks.ts 顶部注释）。
mock.module("ai/agent/runAgentBackground", () => ({
  runAgentBackground: runAgentBackgroundMock,
  listenToDialogEvents: listenToDialogEventsMock,
}));

const { startAgentRunFunc } = await import("./startAgentRunTool");

function makeThunkApi() {
  return {
    dispatch: mock((action: any) => action),
    getState: mock(() => ({})),
  };
}

describe("startAgentRunFunc", () => {
  beforeEach(() => {
    resetAgentTestMocks();
    // runAgentBackground 作为 thunk creator 返回 { unwrap }：
    // waitForCompletion:true 时走 SSE 同步路径返回 { dialogId, content, usage }；
    // false 时返回 { dialogId, status }。
    setRunAgentBackgroundImpl((args: any) => ({
      type: "agent/runBackground/pending",
      meta: { arg: args },
      unwrap: () =>
        Promise.resolve(
          args.waitForCompletion === true
            ? { dialogId: "dialog-test-1", content: "子任务完成结果" }
            : { dialogId: "dialog-test-1", status: "pending" }
        ),
    }));
  });

  it("starts a background run and returns runId + status", async () => {
    const result = await startAgentRunFunc(
      { agentKey: "agent-1", task: "抓取 50 个商品" },
      makeThunkApi()
    );
    expect(result.rawData.runId).toBe("dialog-test-1");
    expect(result.rawData.status).toBe("pending");
    expect(result.displayData).toContain("Run started");
    expect(result.displayData).not.toContain("dialog-test-1");
    expect(result.displayData).toContain("⏳ pending");
    expect(lastRunAgentBackgroundCalls.at(-1)?.waitForCompletion).toBe(false);
  });

  it("uses the provided agentName in the display card", async () => {
    const result = await startAgentRunFunc(
      { agentKey: "agent-1", agentName: "页面生成助手", task: "生成页面" },
      makeThunkApi()
    );
    expect(result.rawData.agentName).toBe("页面生成助手");
    expect(result.displayData).toContain("页面生成助手");
  });

  it("passes waitForCompletion:true when wait:true and returns child content directly", async () => {
    const result = await startAgentRunFunc(
      { agentKey: "agent-1", task: "算一下总数", wait: true },
      makeThunkApi()
    );
    expect(lastRunAgentBackgroundCalls.at(-1)?.waitForCompletion).toBe(true);
    // wait=true 同步模式：rawData 直接是子任务 content，不返回 runId 让调用方轮询。
    expect(result.rawData).toBe("子任务完成结果");
    expect(result.rawData.runId).toBeUndefined();
    expect(result.displayData).toContain("同步完成");
    expect(result.displayData).toContain("dialog-test-1");
  });

  it("wait:true + resultMode=summary truncates long child content to head+tail", async () => {
    const longContent = "A".repeat(3000);
    setRunAgentBackgroundImpl((args: any) => ({
      type: "agent/runBackground/pending",
      meta: { arg: args },
      unwrap: () =>
        Promise.resolve(
          args.waitForCompletion === true
            ? { dialogId: "dialog-test-1", content: longContent }
            : { dialogId: "dialog-test-1", status: "pending" }
        ),
    }));
    const result = await startAgentRunFunc(
      { agentKey: "agent-1", task: "task", wait: true, resultMode: "summary" },
      makeThunkApi()
    );
    // 截断：保留开头 1500 字符 + 结尾 500 字符，中间省略，并带（summary）标记。
    expect(typeof result.rawData).toBe("string");
    expect(result.rawData.length).toBeLessThan(3000);
    expect(result.rawData.startsWith("A".repeat(1500))).toBe(true);
    expect(result.rawData.endsWith("A".repeat(500))).toBe(true);
    expect(result.rawData).toContain("中间部分已省略");
    expect(result.displayData).toContain("（summary）");
  });

  it("wait:true + resultMode=summary keeps short content unchanged", async () => {
    // 默认 mock 的 content 是短串「子任务完成结果」，低于截断阈值时不截断，
    // 但 displayData 仍带（summary）标记（与 callAgent 原行为一致：按请求的
    // 模式标注，而非按是否真发生了截断）。
    const result = await startAgentRunFunc(
      { agentKey: "agent-1", task: "task", wait: true, resultMode: "summary" },
      makeThunkApi()
    );
    expect(result.rawData).toBe("子任务完成结果");
    expect(result.displayData).toContain("（summary）");
  });

  it("wait:true defaults to full content when resultMode is omitted or full", async () => {
    const longContent = "A".repeat(3000);
    setRunAgentBackgroundImpl((args: any) => ({
      type: "agent/runBackground/pending",
      meta: { arg: args },
      unwrap: () =>
        Promise.resolve(
          args.waitForCompletion === true
            ? { dialogId: "dialog-test-1", content: longContent }
            : { dialogId: "dialog-test-1", status: "pending" }
        ),
    }));
    const omitted = await startAgentRunFunc(
      { agentKey: "agent-1", task: "task", wait: true },
      makeThunkApi()
    );
    expect(omitted.rawData).toBe(longContent);
    const explicit = await startAgentRunFunc(
      { agentKey: "agent-1", task: "task", wait: true, resultMode: "full" },
      makeThunkApi()
    );
    expect(explicit.rawData).toBe(longContent);
  });

  it("keeps waitForCompletion:false when wait is explicitly false", async () => {
    await startAgentRunFunc(
      { agentKey: "agent-1", task: "task", wait: false },
      makeThunkApi()
    );
    expect(lastRunAgentBackgroundCalls.at(-1)?.waitForCompletion).toBe(false);
  });

  it("throws on missing agentKey", async () => {
    await expect(
      startAgentRunFunc({ agentKey: "", task: "do something" }, makeThunkApi())
    ).rejects.toThrow("agentKey");
  });

  it("throws on missing task", async () => {
    await expect(
      startAgentRunFunc({ agentKey: "agent-1", task: "" }, makeThunkApi())
    ).rejects.toThrow("task");
  });

  it("packs input into content as JSON", async () => {
    await startAgentRunFunc(
      { agentKey: "agent-1", task: "process data", input: { items: [1, 2] } },
      makeThunkApi()
    );
    expect(lastRunAgentBackgroundCalls.length).toBeGreaterThan(0);
    const lastBgArgs = lastRunAgentBackgroundCalls.at(-1);
    expect(lastBgArgs.userInput).toContain("process data");
    expect(lastBgArgs.userInput).toContain("--- INPUT (json) ---");
    expect(lastBgArgs.userInput).toContain('"items"');
  });

  it("packs string input as text", async () => {
    await startAgentRunFunc(
      { agentKey: "agent-1", task: "process data", input: "raw text here" },
      makeThunkApi()
    );
    const lastBgArgs = lastRunAgentBackgroundCalls.at(-1);
    expect(lastBgArgs.userInput).toContain("--- INPUT (text) ---");
    expect(lastBgArgs.userInput).toContain("raw text here");
  });
});
