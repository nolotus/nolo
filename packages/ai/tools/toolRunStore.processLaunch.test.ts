import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { ProcessLaunchInfo } from "chat/messages/types";

// Value-copy snapshot — incomplete spaceSlice mocks poison sibling suites
// (fetchUserSpaceMemberships.pending) and later files that spread live modules.
const realSpaceSlice = { ...(await import("create/space/spaceSlice")) };

const executorMock = mock();
const fetchUserSpaceMembershipsMock = mock((userId: string) => ({
  type: "space/fetchUserSpaceMemberships",
  payload: userId,
}));

let moduleVersion = 0;

const restoreLeakedModuleMocks = () => {
  mock.module("create/space/spaceSlice", () => realSpaceSlice);
};

async function loadToolRunStore() {
  mock.module(".", () => ({
    findToolExecutor: () => ({
      executor: executorMock,
    }),
  }));
  mock.module("create/space/spaceSlice", () => ({
    ...realSpaceSlice,
    fetchUserSpaceMemberships: fetchUserSpaceMembershipsMock,
  }));
  mock.module("./toolResultError", () => ({
    getToolResultErrorData: () => undefined,
  }));

  const mod = await import(`./toolRunStore.ts`);
  return mod;
}

function makeProcessLaunch(
  overrides: Partial<ProcessLaunchInfo> = {}
): ProcessLaunchInfo {
  return {
    pid: 1234,
    label: "dev",
    command: "bun run dev",
    status: "running",
    startedAt: 1000,
    ...overrides,
  };
}

describe("updateProcessLaunchStatus", () => {
  beforeEach(() => {
    executorMock.mockReset();
    fetchUserSpaceMembershipsMock.mockClear();
  });

  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("transitions running → stopped while leaving toolRun.status untouched", async () => {
    const {
      toolRunStarted,
      toolRunSucceeded,
      setProcessLaunch,
      updateProcessLaunchStatus,
      getToolRunById,
      resetToolRunStoreForTests,
    } = await loadToolRunStore();
    resetToolRunStoreForTests();
    toolRunStarted({
      id: "run-1",
      messageId: "msg-1",
      toolName: "launchProcess",
      input: { command: "bun run dev" },
      startedAt: 1000,
    });
    toolRunSucceeded({ id: "run-1", finishedAt: 1001 });
    setProcessLaunch({
      toolRunId: "run-1",
      processLaunch: makeProcessLaunch({ status: "running" }),
    });

    updateProcessLaunchStatus({ toolRunId: "run-1", status: "stopped" });

    const run = getToolRunById("run-1")!;
    expect(run.status).toBe("succeeded");
    expect(run.processLaunch?.status).toBe("stopped");
    expect(run.processLaunch?.pid).toBe(1234);
    expect(run.processLaunch?.exitCode).toBeUndefined();
  });

  it("writes exitCode when provided", async () => {
    const {
      toolRunStarted,
      toolRunSucceeded,
      setProcessLaunch,
      updateProcessLaunchStatus,
      getToolRunById,
      resetToolRunStoreForTests,
    } = await loadToolRunStore();
    resetToolRunStoreForTests();
    toolRunStarted({
      id: "run-1",
      messageId: "msg-1",
      toolName: "launchProcess",
      input: { command: "bun run dev" },
      startedAt: 1000,
    });
    toolRunSucceeded({ id: "run-1", finishedAt: 1001 });
    setProcessLaunch({
      toolRunId: "run-1",
      processLaunch: makeProcessLaunch({ pid: 5678, status: "running" }),
    });

    updateProcessLaunchStatus({
      toolRunId: "run-1",
      status: "exited",
      exitCode: 0,
    });

    const run = getToolRunById("run-1")!;
    expect(run.processLaunch?.status).toBe("exited");
    expect(run.processLaunch?.exitCode).toBe(0);
    expect(run.status).toBe("succeeded");
  });

  it("is a no-op (does not throw) on a toolRun without processLaunch", async () => {
    const {
      toolRunStarted,
      toolRunSucceeded,
      updateProcessLaunchStatus,
      getToolRunById,
      resetToolRunStoreForTests,
    } = await loadToolRunStore();
    resetToolRunStoreForTests();
    toolRunStarted({
      id: "run-1",
      messageId: "msg-1",
      toolName: "launchProcess",
      input: { command: "bun run dev" },
      startedAt: 1000,
    });
    toolRunSucceeded({ id: "run-1", finishedAt: 1001 });

    expect(() =>
      updateProcessLaunchStatus({ toolRunId: "run-1", status: "stopped" })
    ).not.toThrow();

    const run = getToolRunById("run-1")!;
    expect(run.processLaunch).toBeUndefined();
    expect(run.status).toBe("succeeded");
  });

  it("is a no-op when the toolRunId does not exist", async () => {
    const {
      toolRunStarted,
      toolRunSucceeded,
      setProcessLaunch,
      updateProcessLaunchStatus,
      getToolRunById,
      resetToolRunStoreForTests,
    } = await loadToolRunStore();
    resetToolRunStoreForTests();
    toolRunStarted({
      id: "run-1",
      messageId: "msg-1",
      toolName: "launchProcess",
      input: { command: "bun run dev" },
      startedAt: 1000,
    });
    toolRunSucceeded({ id: "run-1", finishedAt: 1001 });
    setProcessLaunch({
      toolRunId: "run-1",
      processLaunch: makeProcessLaunch(),
    });

    expect(() =>
      updateProcessLaunchStatus({
        toolRunId: "does-not-exist",
        status: "exited",
        exitCode: 1,
      })
    ).not.toThrow();

    // existing run untouched
    const run = getToolRunById("run-1")!;
    expect(run.processLaunch?.status).toBe("running");
  });
});

describe("getSnapshot", () => {
  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("bumps when toolRunUpdated only changes outputSummary/steps", async () => {
    const {
      toolRunStarted,
      toolRunUpdated,
      getSnapshot,
      resetToolRunStoreForTests,
    } = await loadToolRunStore();
    resetToolRunStoreForTests();
    toolRunStarted({
      id: "run-deploy",
      messageId: "msg-1",
      toolName: "appDeploy",
      startedAt: 1000,
    });
    const before = getSnapshot();
    toolRunUpdated({
      id: "run-deploy",
      outputSummary: "building…",
      steps: [{ id: "s1", label: "build", status: "running" }],
    });
    expect(getSnapshot()).not.toBe(before);
  });
});