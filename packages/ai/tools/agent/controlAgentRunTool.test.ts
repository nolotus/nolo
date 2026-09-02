// packages/ai/tools/agent/controlAgentRunTool.test.ts
import { describe, expect, it, mock, beforeEach } from "bun:test";
import {
  callToolApiMock,
  getToolRequestContextMock,
  lastApiCalls,
  lastListenToDialogEventsCalls,
  listenToDialogEventsMock,
  resetAgentTestMocks,
  runAgentBackgroundMock,
  setApiHandler,
  setListenToDialogEventsImpl,
  setToolRequestContextConfig,
} from "./agentTestMocks";

// 默认 callToolApi 响应：list/status/stop 的 canned 数据（keyed by body.action）。
function defaultApiHandler(body: any): any {
  if (body.action === "list") {
    let runs = [
      {
        runId: "run-1",
        status: "running",
        agentKey: "agent-1",
        lastToolNames: ["readFile"],
        toolCallCount: 3,
      },
      {
        runId: "run-2",
        status: "done",
        agentKey: "agent-2",
      },
    ];
    if (body.statusFilter && body.statusFilter !== "all") {
      runs = runs.filter(r => r.status === body.statusFilter);
    }
    if (body.limit) {
      runs = runs.slice(0, body.limit);
    }
    return {
      ok: true,
      data: {
        action: "list",
        runs,
        count: runs.length,
      },
    };
  }

  if (body.action === "status") {
    if (body.runId === "run-1") {
      const logLines = body.tailLines > 0 ? ["do task", "working on it", "done step 1"].slice(-body.tailLines) : undefined;
      return {
        ok: true,
        data: {
          action: "status",
          found: true,
          run: {
            runId: "run-1",
            status: "running",
            agentKey: "agent-1",
            lastToolNames: ["readFile"],
            toolCallCount: 3,
          },
          logLines,
        },
      };
    }
    if (body.runId === "run-done") {
      return {
        ok: true,
        data: {
          action: "status",
          found: true,
          run: {
            runId: "run-done",
            status: "done",
            agentKey: "agent-2",
            lastAssistantText: "已完成的内容",
          },
        },
      };
    }
    return {
      ok: true,
      data: {
        action: "status",
        found: false,
      },
    };
  }

  if (body.action === "stop") {
    return {
      ok: true,
      data: {
        action: "stop",
        runId: body.runId,
        status: "cancelled",
        wasActive: true,
      },
    };
  }

  return { ok: false, error: { code: "NOT_FOUND", message: "Unknown path" } };
}

// 与 startAgentRunTool / agentOrchestrationScenario 合并执行（同一进程，不带
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

const { controlAgentRunFunc } = await import("./controlAgentRunTool");

function makeThunkApi() {
  return {
    dispatch: mock((action: any) => action),
    getState: mock(() => ({})),
  };
}

// 轮询等待 SSE 订阅建立（wait 先走 status 预检，再挂订阅）。
async function waitForSseSubscription(): Promise<void> {
  for (let i = 0; i < 100 && lastListenToDialogEventsCalls.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 1));
  }
  expect(lastListenToDialogEventsCalls.length).toBe(1);
}

describe("controlAgentRunFunc", () => {
  beforeEach(() => {
    resetAgentTestMocks();
    setApiHandler(defaultApiHandler);
    setToolRequestContextConfig({
      currentServer: "https://test.example",
      token: "test-token",
      baseUrl: "https://test.example",
    });
    setListenToDialogEventsImpl(null); // 默认：收到即 onDone + resolve
  });

  it("list hits /api/agent/runs/control POST and returns runs", async () => {
    const result = await controlAgentRunFunc(
      { action: "list" },
      makeThunkApi()
    );
    expect(lastApiCalls.length).toBe(1);
    expect(lastApiCalls[0].path).toBe("/api/agent/runs/control");
    expect(lastApiCalls[0].body).toEqual({ action: "list" });
    expect(result.rawData.count).toBe(2);
    expect(result.displayData).toContain("Runs (2)");
    expect(result.displayData).not.toContain("run-1");
    expect(result.displayData).toContain("⏳");
    expect(result.displayData).toContain("✓");
  });

  it("list passes statusFilter and limit to backend body", async () => {
    const result = await controlAgentRunFunc(
      { action: "list", statusFilter: "running", limit: 1 },
      makeThunkApi()
    );
    expect(lastApiCalls[0].path).toBe("/api/agent/runs/control");
    expect(lastApiCalls[0].body).toEqual({
      action: "list",
      statusFilter: "running",
      limit: 1,
    });
    expect(result.rawData.count).toBe(1);
    expect(result.rawData.runs[0].runId).toBe("run-1");
  });

  it("status passes runId and tailLines to backend", async () => {
    const result = await controlAgentRunFunc(
      { action: "status", runId: "run-1", tailLines: 2 },
      makeThunkApi()
    );
    expect(lastApiCalls[0].path).toBe("/api/agent/runs/control");
    expect(lastApiCalls[0].body).toEqual({
      action: "status",
      runId: "run-1",
      tailLines: 2,
    });
    expect(result.rawData.runId).toBe("run-1");
    expect(result.rawData.status).toBe("running");
    expect(result.rawData.logLines).toBeDefined();
    expect(result.rawData.logLines.length).toBe(2);
    expect(result.displayData).toContain("Run status");
    // The runId is the only thing telling concurrent runs apart on screen.
    expect(result.displayData).toContain("#run-1");
    expect(result.displayData).toContain("readFile");
  });

  it("status returns not-found for unknown runId when backend returns found: false", async () => {
    const result = await controlAgentRunFunc(
      { action: "status", runId: "nonexistent" },
      makeThunkApi()
    );
    expect(lastApiCalls[0].path).toBe("/api/agent/runs/control");
    expect(result.rawData.found).toBe(false);
    expect(result.displayData).toContain("not_found");
  });

  it("stop calls /api/agent/runs/control with action: stop and returns status", async () => {
    const result = await controlAgentRunFunc(
      { action: "stop", runId: "run-1" },
      makeThunkApi()
    );
    expect(lastApiCalls[0].path).toBe("/api/agent/runs/control");
    expect(lastApiCalls[0].body).toEqual({
      action: "stop",
      runId: "run-1",
    });
    expect(result.rawData.runId).toBe("run-1");
    expect(result.rawData.status).toBe("cancelled");
    expect(result.rawData.wasActive).toBe(true);
    expect(result.displayData).toContain("Run stopped");
    expect(result.displayData).toContain("🛑 cancelled");
  });

  it("wait pre-checks status then subscribes the dialog SSE stream for a running run", async () => {
    const result = await controlAgentRunFunc(
      { action: "wait", runId: "run-1" },
      makeThunkApi()
    );
    // 1) 先 status 预检（run-1 是 running，非终态）
    expect(lastApiCalls[0].path).toBe("/api/agent/runs/control");
    expect(lastApiCalls[0].body).toEqual({ action: "status", runId: "run-1" });
    // 2) 再订阅 SSE：dialogId=runId，server/token 来自 getToolRequestContext
    expect(lastListenToDialogEventsCalls.length).toBe(1);
    expect(lastListenToDialogEventsCalls[0][0]).toBe("run-1");
    expect(lastListenToDialogEventsCalls[0][1]).toBe("https://test.example");
    expect(lastListenToDialogEventsCalls[0][2]).toBe("Bearer test-token");
    expect(result.rawData.runId).toBe("run-1");
    expect(result.rawData.status).toBe("done");
    expect(result.rawData.content).toBe("子任务完成结果");
    expect(result.displayData).toContain("完成");
    // 正常 done 路径不需要 abort 信号（事件流已由监听器关闭），连接不泄漏。
    expect(lastListenToDialogEventsCalls[0][3].aborted).toBe(false);
  });

  it("wait returns immediately for an already-terminal run without subscribing SSE", async () => {
    const result = await controlAgentRunFunc(
      { action: "wait", runId: "run-done" },
      makeThunkApi()
    );
    expect(lastApiCalls[0].body).toEqual({ action: "status", runId: "run-done" });
    expect(result.rawData.status).toBe("done");
    expect(result.rawData.content).toBe("已完成的内容");
    expect(lastListenToDialogEventsCalls.length).toBe(0);
  });

  it("wait 超时返回 timeout 状态（不是 done），并 abort 底层 SSE 订阅", async () => {
    // 模拟事件流挂起：永不 resolve/reject（run 一直 running）。
    setListenToDialogEventsImpl(() => new Promise<any>(() => {}));

    const result = await controlAgentRunFunc(
      { action: "wait", runId: "run-1", timeoutMs: 50 },
      makeThunkApi()
    );
    expect(result.rawData.status).toBe("timeout");
    expect(result.rawData.waitedMs).toBe(50);
    expect(result.rawData.content).toBeUndefined();
    expect(result.displayData).toContain("已等待");
    expect(result.displayData).toContain("未达终态");
    // 超时后必须 abort 底层 SSE 的 AbortSignal（关闭连接，防资源泄漏）。
    expect(lastListenToDialogEventsCalls.length).toBe(1);
    expect(lastListenToDialogEventsCalls[0][3].aborted).toBe(true);
  });

  it("wait 超时后再次等待不残留已订阅的 SSE（第二次调用重新订阅）", async () => {
    setListenToDialogEventsImpl(() => new Promise<any>(() => {}));
    await controlAgentRunFunc(
      { action: "wait", runId: "run-1", timeoutMs: 30 },
      makeThunkApi()
    );
    const firstSignal = lastListenToDialogEventsCalls[0][3];
    expect(firstSignal.aborted).toBe(true);

    // 第二次 wait：重新走预检 + 新建订阅（每次都是新 AbortSignal，互不干扰）。
    await controlAgentRunFunc(
      { action: "wait", runId: "run-1", timeoutMs: 30 },
      makeThunkApi()
    );
    expect(lastListenToDialogEventsCalls.length).toBe(2);
    expect(lastListenToDialogEventsCalls[1][3]).not.toBe(firstSignal);
    expect(lastListenToDialogEventsCalls[1][3].aborted).toBe(true);
  });

  it("wait 支持外部 AbortSignal：中止后按中断抛出，不误报 done", async () => {
    // 模拟真实 listener（修复后）：信号中止时 reject AbortError。
    setListenToDialogEventsImpl((_dialogId, _server, _auth, signal) =>
      new Promise<any>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            const err = new Error("SSE 订阅被外部中止");
            err.name = "AbortError";
            reject(err);
          },
          { once: true }
        );
      })
    );

    const controller = new AbortController();
    const waitPromise = controlAgentRunFunc(
      { action: "wait", runId: "run-1", timeoutMs: 5000 },
      makeThunkApi(),
      { signal: controller.signal }
    );

    await waitForSseSubscription();
    controller.abort();

    let resolved: any = null;
    let rejected: any = null;
    await waitPromise.then(
      (r) => { resolved = r; },
      (e) => { rejected = e; }
    );
    // 绝不返回 done；作为中断错误抛出（AbortError 原样透传）。
    expect(resolved).toBeNull();
    expect(rejected).not.toBeNull();
    expect(rejected.name).toBe("AbortError");
    expect(lastListenToDialogEventsCalls[0][3].aborted).toBe(true);
  });

  it("wait 收到 SSE failed 事件时返回结构化 failed 状态与 errorMessage，不抛异常", async () => {
    setListenToDialogEventsImpl(async (...args: any[]) => {
      const onFailed = args[6];
      onFailed?.("API key expired");
      const err = new Error("API key expired");
      err.name = "AgentRunFailedError";
      throw err;
    });

    const result = await controlAgentRunFunc(
      { action: "wait", runId: "run-1", timeoutMs: 2000 },
      makeThunkApi()
    );

    expect(result.rawData).toEqual({
      runId: "run-1",
      found: true,
      status: "failed",
      errorMessage: "API key expired",
    });
    expect(result.displayData).toContain("failed");
    expect(result.displayData).toContain("API key expired");
  });

  it("wait 遇到底层连接/网络错误时仍抛出异常", async () => {
    setListenToDialogEventsImpl(async () => {
      throw new Error("事件流连接失败: ECONNREFUSED");
    });

    await expect(
      controlAgentRunFunc({ action: "wait", runId: "run-1", timeoutMs: 2000 }, makeThunkApi())
    ).rejects.toThrow("controlAgentRun(wait) 失败: 事件流连接失败: ECONNREFUSED");
  });

  it("wait 结束后清理外部 AbortSignal listener，防止长生命周期 signal 泄漏", async () => {
    const controller = new AbortController();
    let removed = false;
    const origRemove = controller.signal.removeEventListener.bind(controller.signal);
    controller.signal.removeEventListener = ((type: string, listener: any, options: any) => {
      if (type === "abort") removed = true;
      return origRemove(type, listener, options);
    }) as any;

    await controlAgentRunFunc(
      { action: "wait", runId: "run-1", timeoutMs: 2000 },
      makeThunkApi(),
      { signal: controller.signal }
    );

    expect(removed).toBe(true);
  });

  it("SSE 订阅被 abort（监听器把 AbortError 吞成 resolve）也不误判为 done", async () => {
    // 模拟旧版/外部监听器行为：信号中止时 resolve({dialogId})——即使监听器把
    // abort 伪装成「结束」，wait 也必须识别为中断而不是成功。
    setListenToDialogEventsImpl((_dialogId, _server, _auth, signal) =>
      new Promise<any>((resolve) => {
        signal.addEventListener("abort", () => resolve({ dialogId: "run-1" }), { once: true });
      })
    );

    const controller = new AbortController();
    const waitPromise = controlAgentRunFunc(
      { action: "wait", runId: "run-1", timeoutMs: 5000 },
      makeThunkApi(),
      { signal: controller.signal }
    );

    await waitForSseSubscription();
    controller.abort();

    let resolved: any = null;
    let rejected: any = null;
    await waitPromise.then(
      (r) => { resolved = r; },
      (e) => { rejected = e; }
    );
    // 绝不 resolve 成 done（即使监听器 resolve 了 {dialogId}）；按中断错误抛出。
    expect(resolved).toBeNull();
    expect(rejected).not.toBeNull();
    expect(rejected.name).toBe("AgentWaitInterruptedError");
  });

  it("wait 在外部 signal 已被中止时直接中断，不订阅 SSE", async () => {
    const controller = new AbortController();
    controller.abort();
    let resolved: any = null;
    await controlAgentRunFunc(
      { action: "wait", runId: "run-1", timeoutMs: 5000 },
      makeThunkApi(),
      { signal: controller.signal }
    ).then((r) => { resolved = r; }, () => {});
    expect(resolved).toBeNull();
    expect(lastListenToDialogEventsCalls.length).toBe(0);
  });

  it("throws on missing runId for wait", async () => {
    await expect(
      controlAgentRunFunc({ action: "wait" }, makeThunkApi())
    ).rejects.toThrow("runId");
  });

  it("throws when waiting on a nonexistent run", async () => {
    await expect(
      controlAgentRunFunc({ action: "wait", runId: "nonexistent" }, makeThunkApi())
    ).rejects.toThrow("不存在");
    expect(lastListenToDialogEventsCalls.length).toBe(0);
  });

  it("throws on missing runId for status", async () => {
    await expect(
      controlAgentRunFunc({ action: "status" }, makeThunkApi())
    ).rejects.toThrow("runId");
  });

  it("throws on missing runId for stop", async () => {
    await expect(
      controlAgentRunFunc({ action: "stop" }, makeThunkApi())
    ).rejects.toThrow("runId");
  });

  it("throws on unknown action", async () => {
    await expect(
      controlAgentRunFunc({ action: "invalid" as any }, makeThunkApi())
    ).rejects.toThrow("未知 action");
  });
});
