import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const mockToolExecutors: Record<string, (args: any) => Promise<any>> = {};
const actualTools = await import("ai/tools");

mock.module("ai/tools", () => ({
  ...actualTools,
  toolExecutors: mockToolExecutors,
}));

mock.module("ai/agent/agentSlice", () => ({
  runLlm: (args: any) => ({ type: "runLlm/mock", payload: args }),
}));

const { configureStore } = await import("@reduxjs/toolkit");
const {
  getWorkflowStats,
  getWorkflowSteps,
  resetWorkflowStoreForTests,
} = await import("./workflowStore");
const { runWorkflow } = await import("./workflowExecutor");

function createStore() {
  return configureStore({
    reducer: {
      _noop: (s = null) => s,
    },
  });
}

describe("workflowExecutor", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockToolExecutors)) {
      delete mockToolExecutors[key];
    }
    resetWorkflowStoreForTests();
  });

  afterEach(() => {
    resetWorkflowStoreForTests();
  });

  it("retries a tool step and succeeds within retryCount", async () => {
    let attempts = 0;
    mockToolExecutors.flakyTool = async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error("temporary failure");
      }
      return { rawData: "done" };
    };

    const store = createStore();

    const result = await store.dispatch(
      runWorkflow({
        definition: {
          title: "Retry workflow",
          steps: [
            {
              id: "retry-step",
              type: "tool",
              tool: "flakyTool",
              args: {},
              onError: "retry",
              retryCount: 1,
            },
          ],
        },
      }) as any
    ).unwrap();

    expect(attempts).toBe(2);
    expect(result).toEqual({
      success: true,
      results: {
        "retry-step": "done",
      },
    });

    expect(getWorkflowSteps()).toEqual([
      expect.objectContaining({
        id: "retry-step",
        status: "completed",
        result: "done",
      }),
    ]);
    expect(getWorkflowStats()).toEqual(
      expect.objectContaining({
        totalStepsExecuted: 1,
        failedSteps: 0,
      })
    );
  });

  it("registers parallel sub-step results for later template resolution", async () => {
    mockToolExecutors.firstTool = async () => ({ rawData: "alpha" });
    mockToolExecutors.secondTool = async () => ({ rawData: "beta" });
    mockToolExecutors.combineTool = async (args) => ({
      rawData: `${args.left}-${args.right}`,
    });

    const store = createStore();

    const result = await store.dispatch(
      runWorkflow({
        definition: {
          title: "Parallel workflow",
          steps: [
            {
              id: "parallel-step",
              type: "parallel",
              steps: [
                {
                  id: "sub-a",
                  type: "tool",
                  tool: "firstTool",
                  args: {},
                },
                {
                  id: "sub-b",
                  type: "tool",
                  tool: "secondTool",
                  args: {},
                },
              ],
            },
            {
              id: "combine",
              type: "tool",
              tool: "combineTool",
              args: {
                left: "{{steps.sub-a.result}}",
                right: "{{steps.sub-b.result}}",
              },
            },
          ],
        },
      }) as any
    ).unwrap();

    expect(result).toEqual({
      success: true,
      results: {
        "sub-a": "alpha",
        "sub-b": "beta",
        "parallel-step": {
          "sub-a": "alpha",
          "sub-b": "beta",
        },
        combine: "alpha-beta",
      },
    });

    expect(getWorkflowSteps()).toEqual([
      expect.objectContaining({
        id: "parallel-step",
        status: "completed",
      }),
      expect.objectContaining({
        id: "combine",
        status: "completed",
        result: "alpha-beta",
      }),
    ]);
  });

  it("evaluates safe condition expressions with dotted step paths", async () => {
    mockToolExecutors.validateTool = async () => ({
      rawData: { isValid: true, kind: "safe" },
    });
    mockToolExecutors.successTool = async () => ({ rawData: "approved" });
    mockToolExecutors.failureTool = async () => ({ rawData: "rejected" });

    const store = createStore();

    const result = await store.dispatch(
      runWorkflow({
        definition: {
          title: "Condition workflow",
          steps: [
            {
              id: "validate",
              type: "tool",
              tool: "validateTool",
              args: {},
            },
            {
              id: "gate",
              type: "condition",
              check: "steps.validate.isValid === true && steps.validate.kind === \"safe\"",
              ifTrue: ["approved"],
              ifFalse: ["rejected"],
            },
            {
              id: "approved",
              type: "tool",
              tool: "successTool",
              args: {},
            },
            {
              id: "rejected",
              type: "tool",
              tool: "failureTool",
              args: {},
            },
          ],
        },
      }) as any
    ).unwrap();

    expect(result.success).toBe(true);
    expect(result.results).toMatchObject({
      validate: { isValid: true, kind: "safe" },
      gate: {
        passed: true,
      },
      approved: "approved",
    });

    expect(getWorkflowSteps()).toEqual([
      expect.objectContaining({ id: "validate", status: "completed" }),
      expect.objectContaining({
        id: "gate",
        status: "completed",
        result: expect.objectContaining({ passed: true }),
      }),
      expect.objectContaining({ id: "approved", status: "completed" }),
      expect.objectContaining({ id: "rejected", status: "skipped" }),
    ]);
  });

  it("rejects unsafe condition expressions instead of executing them", async () => {
    mockToolExecutors.flagTool = async () => ({ rawData: { ok: true } });
    mockToolExecutors.safeFallback = async () => ({ rawData: "fallback" });

    const store = createStore();

    const result = await store.dispatch(
      runWorkflow({
        definition: {
          title: "Unsafe condition workflow",
          steps: [
            {
              id: "flag",
              type: "tool",
              tool: "flagTool",
              args: {},
            },
            {
              id: "gate",
              type: "condition",
              check: "steps.flag.ok === true && process.exit(1)",
              ifTrue: ["should-not-run"],
              ifFalse: ["fallback"],
            },
            {
              id: "should-not-run",
              type: "tool",
              tool: "missingTool",
              args: {},
            },
            {
              id: "fallback",
              type: "tool",
              tool: "safeFallback",
              args: {},
            },
          ],
        },
      }) as any
    ).unwrap();

    expect(result.success).toBe(true);
    expect(result.results.gate).toEqual({
      passed: false,
      check: "steps.flag.ok === true && process.exit(1)",
    });
    expect(result.results.fallback).toBe("fallback");
    expect(result.results["should-not-run"]).toBeUndefined();
  });
});
