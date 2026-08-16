import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  clearWorkflow,
  getCompletedSteps,
  getPendingSteps,
  getSnapshot,
  getWorkflowStats,
  getWorkflowSteps,
  getWorkflowTitle,
  incrementFailedSteps,
  incrementStepsExecuted,
  resetWorkflowStoreForTests,
  setWorkflow,
  subscribe,
  updateStep,
} from "./workflowStore";
import type { WorkflowStepState } from "./workflowTypes";

const baseStep = (overrides: Partial<WorkflowStepState> = {}): WorkflowStepState => ({
  id: overrides.id ?? "s1",
  type: overrides.type ?? "tool",
  status: overrides.status ?? "pending",
  ...overrides,
});

describe("workflowStore", () => {
  beforeEach(() => {
    resetWorkflowStoreForTests();
  });

  afterEach(() => {
    resetWorkflowStoreForTests();
  });

  it("starts empty with zero stats", () => {
    expect(getWorkflowTitle()).toBeNull();
    expect(getWorkflowSteps()).toEqual([]);
    expect(getWorkflowStats()).toEqual({
      startTime: null,
      totalStepsExecuted: 0,
      failedSteps: 0,
    });
    expect(getPendingSteps()).toEqual([]);
    expect(getCompletedSteps()).toEqual([]);
  });

  it("setWorkflow sets title + steps and resets stats with a startTime", () => {
    const before = Date.now();
    setWorkflow({
      title: "demo",
      steps: [baseStep({ id: "a" }), baseStep({ id: "b" })],
    });
    const after = Date.now();

    expect(getWorkflowTitle()).toBe("demo");
    expect(getWorkflowSteps().map((s) => s.id)).toEqual(["a", "b"]);
    const stats = getWorkflowStats();
    expect(stats.totalStepsExecuted).toBe(0);
    expect(stats.failedSteps).toBe(0);
    expect(stats.startTime).not.toBeNull();
    expect(stats.startTime! >= before).toBe(true);
    expect(stats.startTime! <= after).toBe(true);
  });

  it("updateStep merges updates by id and no-ops on missing step", () => {
    setWorkflow({
      title: "demo",
      steps: [baseStep({ id: "a" }), baseStep({ id: "b" })],
    });
    updateStep({ id: "a", updates: { status: "completed", result: 1 } });
    const steps = getWorkflowSteps();
    expect(steps[0]).toMatchObject({ id: "a", status: "completed", result: 1 });
    expect(steps[1].status).toBe("pending");

    // Missing step is a no-op: it must not throw or mutate anything.
    const beforeSteps = getWorkflowSteps();
    updateStep({ id: "nope", updates: { status: "skipped" } });
    expect(getWorkflowSteps()).toBe(beforeSteps);
    expect(getWorkflowSteps().find((s) => s.id === "nope")).toBeUndefined();
  });

  it("incrementStepsExecuted / incrementFailedSteps bump the counters", () => {
    setWorkflow({ title: "demo", steps: [baseStep({ id: "a" })] });
    incrementStepsExecuted();
    incrementStepsExecuted();
    incrementFailedSteps();
    expect(getWorkflowStats()).toMatchObject({
      totalStepsExecuted: 2,
      failedSteps: 1,
    });
  });

  it("clearWorkflow restores the initial empty state", () => {
    setWorkflow({ title: "demo", steps: [baseStep({ id: "a" })] });
    incrementStepsExecuted();
    incrementFailedSteps();
    clearWorkflow();
    expect(getWorkflowTitle()).toBeNull();
    expect(getWorkflowSteps()).toEqual([]);
    expect(getWorkflowStats()).toEqual({
      startTime: null,
      totalStepsExecuted: 0,
      failedSteps: 0,
    });
  });

  it("getPendingSteps / getCompletedSteps filter by status", () => {
    setWorkflow({
      title: "demo",
      steps: [
        baseStep({ id: "a", status: "pending" }),
        baseStep({ id: "b", status: "completed" }),
        baseStep({ id: "c", status: "completed" }),
        baseStep({ id: "d", status: "failed" }),
      ],
    });
    expect(getPendingSteps().map((s) => s.id)).toEqual(["a"]);
    expect(getCompletedSteps().map((s) => s.id)).toEqual(["b", "c"]);
  });

  it("subscribes listeners, notifies on mutation, and unsubscribes", () => {
    const listener = mock(() => {});
    const unsub = subscribe(listener);

    setWorkflow({ title: "demo", steps: [baseStep({ id: "a" })] });
    // setWorkflow bumps version and notifies
    expect(listener).toHaveBeenCalledTimes(1);
    const v1 = getSnapshot();
    expect(v1).toBeGreaterThan(0);

    updateStep({ id: "a", updates: { status: "completed" } });
    expect(listener).toHaveBeenCalledTimes(2);

    // missing-step updateStep is a no-op: no notify
    updateStep({ id: "missing", updates: { status: "skipped" } });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getSnapshot()).toBe(v1 + 1);

    unsub();
    clearWorkflow();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("listener errors do not break other listeners or mutators", () => {
    const broken = mock(() => {
      throw new Error("boom");
    });
    const ok = mock(() => {});
    subscribe(broken);
    subscribe(ok);

    // Must not throw despite a broken subscriber.
    setWorkflow({ title: "demo", steps: [baseStep({ id: "a" })] });
    expect(ok).toHaveBeenCalledTimes(1);
    incrementStepsExecuted();
    expect(ok).toHaveBeenCalledTimes(2);
  });
});