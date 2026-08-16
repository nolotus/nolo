// packages/ai/tools/agent/agentOrchestrationScenario.test.ts
//
// 端到端用户故事与场景测试：模拟编排器通过 startAgentRun + controlAgentRun
// 控制后台 Agent Run。所有网络调用均打 POST /api/agent/runs/control。

import { describe, expect, it, mock, beforeEach } from "bun:test";
import {
  callToolApiMock,
  getToolRequestContextMock,
  lastApiCalls,
  lastListenToDialogEventsCalls,
  lastRunAgentBackgroundCalls,
  listenToDialogEventsMock,
  resetAgentTestMocks,
  runAgentBackgroundMock,
  setApiHandler,
  setRunAgentBackgroundImpl,
  setToolRequestContextConfig,
} from "./agentTestMocks";

let mockResponseHandler: (body: any) => any = () => ({});
let bgResultOverride: any = null;

// 与 controlAgentRunTool / startAgentRunTool 合并执行（同一进程，不带
// --isolate）时，mock.module 的替换先注册者生效；这里注册与其它两个文件
// 完全相同的工厂（同一组共享 mock 函数），确保无论哪份注册生效，导入与
// 行为都一致（见 agentTestMocks.ts 顶部注释）。
mock.module("../toolApiClient", () => ({
  callToolApi: callToolApiMock,
  getToolRequestContext: getToolRequestContextMock,
}));

mock.module("ai/agent/runAgentBackground", () => ({
  runAgentBackground: runAgentBackgroundMock,
  listenToDialogEvents: listenToDialogEventsMock,
}));

const { startAgentRunFunc } = await import("./startAgentRunTool");
const { controlAgentRunFunc } = await import("./controlAgentRunTool");

function makeThunkApi() {
  return {
    dispatch: mock((action: any) => action),
    getState: mock(() => ({})),
  };
}

describe("agent-orchestration 用户故事与控制端点场景测试", () => {
  beforeEach(() => {
    resetAgentTestMocks();
    setToolRequestContextConfig({
      currentServer: "https://scenario.test",
      token: null,
      baseUrl: "https://scenario.test",
    });
    setApiHandler((body) => mockResponseHandler(body));
    setRunAgentBackgroundImpl((args: any) => ({
      type: "agent/runBackground/pending",
      meta: { arg: args },
      unwrap: () =>
        Promise.resolve(bgResultOverride ?? { dialogId: "run-scenario-1", status: "pending" }),
    }));
    bgResultOverride = null;
    mockResponseHandler = () => ({});
  });

  it("正常编排：startAgentRun 派发 → controlAgentRun(list/status/stop) 观察与叫停", async () => {
    const thunkApi = makeThunkApi();

    // 1. 启动
    const startRes = await startAgentRunFunc(
      { agentKey: "agent-scraper", task: "抓取数据" },
      thunkApi
    );
    expect(startRes.rawData.runId).toBe("run-scenario-1");
    expect(startRes.rawData.status).toBe("pending");
    expect(lastRunAgentBackgroundCalls.at(-1)?.waitForCompletion).toBe(false);

    // 2. list 查全局
    mockResponseHandler = (body) => {
      expect(body.action).toBe("list");
      return {
        ok: true,
        data: {
          action: "list",
          runs: [
            { runId: "run-scenario-1", status: "running", agentKey: "agent-scraper" },
            { runId: "run-other", status: "done", agentKey: "agent-writer" },
          ],
          count: 2,
        },
      };
    };

    const listRes = await controlAgentRunFunc({ action: "list" }, thunkApi);
    expect(lastApiCalls.at(-1)?.path).toBe("/api/agent/runs/control");
    expect(listRes.rawData.count).toBe(2);
    // The card shows readable names, not runIds (c88e918d0). runId stays
    // available to callers via rawData.
    expect(listRes.displayData).toContain("agent-scraper");
    expect(listRes.rawData.runs[0].runId).toBe("run-scenario-1");

    // 3. status 查单条 + 日志
    mockResponseHandler = (body) => {
      expect(body.action).toBe("status");
      expect(body.runId).toBe("run-scenario-1");
      expect(body.tailLines).toBe(5);
      return {
        ok: true,
        data: {
          action: "status",
          found: true,
          run: {
            runId: "run-scenario-1",
            status: "running",
            agentKey: "agent-scraper",
            toolCallCount: 5,
            lastToolNames: ["fetchWebpage"],
            lastAssistantText: "已抓取 10 条",
          },
          logLines: ["[user] 抓取数据", "[assistant] 已抓取 10 条"],
        },
      };
    };

    const statusRes = await controlAgentRunFunc(
      { action: "status", runId: "run-scenario-1", tailLines: 5 },
      thunkApi
    );
    expect(lastApiCalls.at(-1)?.path).toBe("/api/agent/runs/control");
    expect(statusRes.rawData.status).toBe("running");
    expect(statusRes.rawData.logLines?.length).toBe(2);
    expect(statusRes.displayData).toContain("fetchWebpage");

    // 4. stop 叫停
    mockResponseHandler = (body) => {
      expect(body.action).toBe("stop");
      expect(body.runId).toBe("run-scenario-1");
      return {
        ok: true,
        data: {
          action: "stop",
          runId: "run-scenario-1",
          wasActive: true,
          status: "cancelling",
        },
      };
    };

    const stopRes = await controlAgentRunFunc({ action: "stop", runId: "run-scenario-1" }, thunkApi);
    expect(lastApiCalls.at(-1)?.path).toBe("/api/agent/runs/control");
    expect(stopRes.rawData.status).toBe("cancelling");
    expect(stopRes.rawData.wasActive).toBe(true);
    expect(stopRes.displayData).toContain("Run stopped");
  });

  it("状态分支：status 发现 failed 任务与 errorMessage", async () => {
    const thunkApi = makeThunkApi();
    mockResponseHandler = () => ({
      ok: true,
      data: {
        action: "status",
        found: true,
        run: {
          runId: "run-failed-1",
          status: "failed",
          agentKey: "agent-scraper",
          errorMessage: "API key expired",
        },
      },
    });

    const res = await controlAgentRunFunc({ action: "status", runId: "run-failed-1" }, thunkApi);
    expect(lastApiCalls.at(-1)?.path).toBe("/api/agent/runs/control");
    expect(lastApiCalls.at(-1)?.body).toEqual({ action: "status", runId: "run-failed-1", tailLines: 0 });
    expect(res.rawData.status).toBe("failed");
    expect(res.rawData.errorMessage).toBe("API key expired");
    expect(res.displayData).toContain("API key expired");
  });

  it("状态分支：status 查询不存在的 runId 返回 found: false", async () => {
    const thunkApi = makeThunkApi();
    mockResponseHandler = () => ({
      ok: true,
      data: {
        action: "status",
        found: false,
      },
    });

    const res = await controlAgentRunFunc({ action: "status", runId: "run-ghost" }, thunkApi);
    expect(lastApiCalls.at(-1)?.path).toBe("/api/agent/runs/control");
    expect(res.rawData.found).toBe(false);
    expect(res.displayData).toContain("not_found");
  });

  it("状态分支：stop 取消已是终态的 run（wasActive: false, status: done）", async () => {
    const thunkApi = makeThunkApi();
    mockResponseHandler = () => ({
      ok: true,
      data: {
        action: "stop",
        runId: "run-done-1",
        wasActive: false,
        status: "done",
      },
    });

    const res = await controlAgentRunFunc({ action: "stop", runId: "run-done-1" }, thunkApi);
    expect(lastApiCalls.at(-1)?.path).toBe("/api/agent/runs/control");
    expect(res.rawData.status).toBe("done");
    expect(res.rawData.wasActive).toBe(false);
    expect(res.displayData).toContain("Run stopped");
  });
});
