import { describe, expect, test } from "bun:test";

import {
  applyRunOverlayEvent,
  initialRunOverlayState,
  reduceRunOverlay,
  type RunInfo,
  type RunOverlayState,
} from "./runOverlayMachine";
import { buildOverlayPresentation, groupByStatus, statusLabel } from "./runOverlayPresentation";

// ---- helpers --------------------------------------------------------------

function run(over: Partial<RunInfo> & { runId: string }): RunInfo {
  return {
    name: over.name ?? "unnamed",
    status: over.status ?? "running",
    summary: over.summary,
    batchId: over.batchId,
    parentDialogId: over.parentDialogId,
    errorMessage: over.errorMessage,
    updatedAt: over.updatedAt ?? 0,
    runId: over.runId,
  };
}

function stateOf(...runs: RunInfo[]): RunOverlayState {
  return { runs: new Map(runs.map((r) => [r.runId, r] as const)) };
}

// ---- reduceRunOverlay: run-state-chg -------------------------------------

describe("reduceRunOverlay / run-state-chg", () => {
  test("inserts a new run with defaults for omitted required fields", () => {
    const next = reduceRunOverlay(initialRunOverlayState, {
      type: "run-state-chg",
      runId: "run-001",
      info: { name: "评审文件A", status: "running" },
    });
    expect(next.runs.size).toBe(1);
    const got = next.runs.get("run-001")!;
    expect(got.runId).toBe("run-001");
    expect(got.name).toBe("评审文件A");
    expect(got.status).toBe("running");
    expect(typeof got.updatedAt).toBe("number");
    expect(got.updatedAt).toBeGreaterThan(0);
  });

  test("defaults status to running when omitted on insert", () => {
    const next = reduceRunOverlay(initialRunOverlayState, {
      type: "run-state-chg",
      runId: "run-x",
      info: { name: "x" },
    });
    expect(next.runs.get("run-x")!.status).toBe("running");
  });

  test("merges partial updates onto an existing run without losing other fields", () => {
    const start = stateOf(run({ runId: "run-1", name: "A", status: "running", batchId: "b1" }));
    const next = reduceRunOverlay(start, {
      type: "run-state-chg",
      runId: "run-1",
      info: { status: "reviewing", summary: "需要确认" },
    });
    const got = next.runs.get("run-1")!;
    expect(got.status).toBe("reviewing");
    expect(got.summary).toBe("需要确认");
    expect(got.name).toBe("A"); // unchanged
    expect(got.batchId).toBe("b1"); // unchanged
  });

  test("updates summary independently of status", () => {
    const start = stateOf(run({ runId: "run-1", name: "A", status: "running" }));
    const next = reduceRunOverlay(start, {
      type: "run-state-chg",
      runId: "run-1",
      info: { summary: "进度 50%" },
    });
    expect(next.runs.get("run-1")!.summary).toBe("进度 50%");
    expect(next.runs.get("run-1")!.status).toBe("running");
  });

  test("does not mutate the input state", () => {
    const start = stateOf(run({ runId: "run-1", name: "A", status: "running" }));
    const snapshot = start.runs.get("run-1")!;
    reduceRunOverlay(start, { type: "run-state-chg", runId: "run-1", info: { status: "done" } });
    expect(start.runs.get("run-1")!).toBe(snapshot); // same reference, untouched
    expect(start.runs.size).toBe(1);
  });
});

// ---- reduceRunOverlay: run-removed ---------------------------------------

describe("reduceRunOverlay / run-removed", () => {
  test("removes an existing run", () => {
    const start = stateOf(
      run({ runId: "run-1", name: "A", status: "running" }),
      run({ runId: "run-2", name: "B", status: "running" })
    );
    const next = reduceRunOverlay(start, { type: "run-removed", runId: "run-1" });
    expect(next.runs.has("run-1")).toBe(false);
    expect(next.runs.has("run-2")).toBe(true);
  });

  test("is a no-op (same ref) for an unknown runId", () => {
    const start = stateOf(run({ runId: "run-1", name: "A", status: "running" }));
    const next = reduceRunOverlay(start, { type: "run-removed", runId: "nope" });
    expect(next).toBe(start);
  });
});

// ---- reduceRunOverlay: clear-all -----------------------------------------

describe("reduceRunOverlay / clear-all", () => {
  test("empties a non-empty map", () => {
    const start = stateOf(run({ runId: "run-1", name: "A", status: "running" }));
    const next = reduceRunOverlay(start, { type: "clear-all" });
    expect(next.runs.size).toBe(0);
  });

  test("is a no-op (same ref) when already empty", () => {
    const next = reduceRunOverlay(initialRunOverlayState, { type: "clear-all" });
    expect(next).toBe(initialRunOverlayState);
  });
});

// ---- applyRunOverlayEvent: outgoing events -------------------------------

describe("applyRunOverlayEvent / outgoing", () => {
  test("emits overlay-changed on insert with runCount", () => {
    const { state, outgoing } = applyRunOverlayEvent(initialRunOverlayState, {
      type: "run-state-chg",
      runId: "run-1",
      info: { name: "A", status: "running" },
    });
    expect(state.runs.size).toBe(1);
    expect(outgoing).toEqual([{ type: "overlay-changed", runCount: 1 }]);
  });

  test("emits overlay-changed on update", () => {
    const start = stateOf(run({ runId: "run-1", name: "A", status: "running" }));
    const { outgoing } = applyRunOverlayEvent(start, {
      type: "run-state-chg",
      runId: "run-1",
      info: { status: "done" },
    });
    expect(outgoing).toEqual([{ type: "overlay-changed", runCount: 1 }]);
  });

  test("emits nothing for an empty-info no-op update", () => {
    const start = stateOf(run({ runId: "run-1", name: "A", status: "running" }));
    const { state, outgoing } = applyRunOverlayEvent(start, {
      type: "run-state-chg",
      runId: "run-1",
      info: {},
    });
    expect(state).toBe(start);
    expect(outgoing).toEqual([]);
  });

  test("emits overlay-changed on run-removed", () => {
    const start = stateOf(
      run({ runId: "run-1", name: "A", status: "running" }),
      run({ runId: "run-2", name: "B", status: "running" })
    );
    const { outgoing } = applyRunOverlayEvent(start, { type: "run-removed", runId: "run-1" });
    expect(outgoing).toEqual([{ type: "overlay-changed", runCount: 1 }]);
  });

  test("emits overlay-changed(0) + all-cleared on clear-all of non-empty state", () => {
    const start = stateOf(run({ runId: "run-1", name: "A", status: "running" }));
    const { state, outgoing } = applyRunOverlayEvent(start, { type: "clear-all" });
    expect(state.runs.size).toBe(0);
    expect(outgoing).toEqual([
      { type: "overlay-changed", runCount: 0 },
      { type: "all-cleared" },
    ]);
  });

  test("emits nothing on clear-all of already-empty state", () => {
    const { state, outgoing } = applyRunOverlayEvent(initialRunOverlayState, { type: "clear-all" });
    expect(state).toBe(initialRunOverlayState);
    expect(outgoing).toEqual([]);
  });
});

// ---- concurrent multi-run aggregation ------------------------------------

describe("multiple runs aggregated concurrently", () => {
  test("preserves per-run status across interleaved updates", () => {
    // Simulate 5 running / 3 reviewing / 2 testing arriving in interleaved order.
    let s = initialRunOverlayState;
    const chg = (runId: string, info: Partial<RunInfo>) => {
      s = reduceRunOverlay(s, { type: "run-state-chg", runId, info });
    };

    chg("r1", { name: "A", status: "running" });
    chg("r2", { name: "B", status: "running" });
    chg("r3", { name: "C", status: "reviewing" });
    chg("r4", { name: "D", status: "running" });
    chg("r5", { name: "E", status: "reviewing" });
    chg("r6", { name: "F", status: "testing" });
    chg("r7", { name: "G", status: "running" });
    chg("r8", { name: "H", status: "reviewing" });
    chg("r9", { name: "I", status: "testing" });
    chg("r10", { name: "J", status: "running" });

    const byStatus = groupByStatus(s.runs);
    const counts = Object.fromEntries(byStatus.map((g) => [g.status, g.runs.length])) as Record<string, number>;
    expect(counts.running).toBe(5);
    expect(counts.reviewing).toBe(3);
    expect(counts.testing).toBe(2);
    expect(s.runs.size).toBe(10);
  });

  test("a run transitioning running->done->failed keeps a single entry", () => {
    let s = initialRunOverlayState;
    s = reduceRunOverlay(s, { type: "run-state-chg", runId: "r1", info: { name: "A", status: "running" } });
    s = reduceRunOverlay(s, { type: "run-state-chg", runId: "r1", info: { status: "done" } });
    s = reduceRunOverlay(s, { type: "run-state-chg", runId: "r1", info: { status: "failed", errorMessage: "boom" } });
    expect(s.runs.size).toBe(1);
    const got = s.runs.get("r1")!;
    expect(got.status).toBe("failed");
    expect(got.errorMessage).toBe("boom");
    expect(got.name).toBe("A");
  });

  test("removing one run does not disturb others", () => {
    let s = initialRunOverlayState;
    for (const id of ["a", "b", "c"]) {
      s = reduceRunOverlay(s, { type: "run-state-chg", runId: id, info: { name: id, status: "running" } });
    }
    s = reduceRunOverlay(s, { type: "run-removed", runId: "b" });
    expect([...s.runs.keys()]).toEqual(["a", "c"]);
  });
});

// ---- presentation ---------------------------------------------------------

describe("buildOverlayPresentation", () => {
  test("returns null when empty", () => {
    expect(buildOverlayPresentation(initialRunOverlayState)).toBeNull();
  });

  test("renders grouped headers in canonical order + detail lines", () => {
    const s = stateOf(
      run({ runId: "run-001", name: "评审文件A", status: "running" }),
      run({ runId: "run-002", name: "评审文件B", status: "reviewing", summary: "需要确认 API 变更" }),
      run({ runId: "run-003", name: "测试模块C", status: "testing" })
    );
    const out = buildOverlayPresentation(s);
    expect(out).not.toBeNull();
    const text = out as string;

    // Group headers appear before the detail separator, in canonical order.
    const detailIdx = text.indexOf("--- 详情 ---");
    expect(detailIdx).toBeGreaterThan(0);
    const headerBlock = text.slice(0, detailIdx);
    const headers = headerBlock.split("\n").filter((l) => l.trim().length > 0);
    expect(headers[0]).toBe("▶ 1 个正在运行");
    expect(headers[1]).toBe("👁 1 个待 review");
    expect(headers[2]).toBe("🧪 1 个在测试");

    // Detail lines: one per run, in group-then-insertion order.
    const detailBlock = text.slice(detailIdx);
    expect(detailBlock).toContain("• run-001 (评审文件A): 运行中");
    expect(detailBlock).toContain("• run-002 (评审文件B): 待 review — 需要确认 API 变更");
    expect(detailBlock).toContain("• run-003 (测试模块C): 测试中");
    // running group detail precedes reviewing group detail
    expect(detailBlock.indexOf("run-001")).toBeLessThan(detailBlock.indexOf("run-002"));
  });

  test("omits status groups with zero runs", () => {
    const s = stateOf(run({ runId: "r1", name: "A", status: "running" }));
    const text = buildOverlayPresentation(s) as string;
    expect(text).toContain("▶ 1 个正在运行");
    expect(text).not.toContain("待 review");
    expect(text).not.toContain("在测试");
    expect(text).not.toContain("已完成");
  });

  test("uses errorMessage as the suffix for a failed run without summary", () => {
    const s = stateOf(run({ runId: "r1", name: "A", status: "failed", errorMessage: "boom" }));
    const text = buildOverlayPresentation(s) as string;
    expect(text).toContain("• r1 (A): 失败 — boom");
  });

  test("matches the spec example shape with multiple runs per group", () => {
    const s = stateOf(
      run({ runId: "run-001", name: "评审文件A", status: "running" }),
      run({ runId: "run-002", name: "评审文件B", status: "running" }),
      run({ runId: "run-003", name: "评审文件C", status: "running" }),
      run({ runId: "run-004", name: "测试D", status: "testing" })
    );
    const text = buildOverlayPresentation(s) as string;
    expect(text).toContain("▶ 3 个正在运行");
    expect(text).toContain("🧪 1 个在测试");
    expect(text).toContain("--- 详情 ---");
    // each run has a detail line
    for (const id of ["run-001", "run-002", "run-003", "run-004"]) {
      expect(text).toContain(`• ${id} `);
    }
  });
});

// ---- presentation helpers -------------------------------------------------

describe("statusLabel", () => {
  test("maps known statuses to Chinese labels", () => {
    expect(statusLabel("running")).toBe("正在运行");
    expect(statusLabel("reviewing")).toBe("待 review");
    expect(statusLabel("testing")).toBe("在测试");
    expect(statusLabel("done")).toBe("已完成");
    expect(statusLabel("failed")).toBe("失败");
  });

  test("falls back to the raw status for unknown values", () => {
    expect(statusLabel("weird")).toBe("weird");
  });
});

describe("groupByStatus", () => {
  test("returns groups in canonical order and preserves insertion order within a group", () => {
    const s = stateOf(
      run({ runId: "b", name: "B", status: "testing" }),
      run({ runId: "a", name: "A", status: "running" }),
      run({ runId: "c", name: "C", status: "running" })
    );
    const grouped = groupByStatus(s.runs);
    expect(grouped.map((g) => g.status)).toEqual(["running", "testing"]);
    expect(grouped[0].runs.map((r) => r.runId)).toEqual(["a", "c"]);
    expect(grouped[1].runs.map((r) => r.runId)).toEqual(["b"]);
  });

  test("skips statuses with no runs", () => {
    const s = stateOf(run({ runId: "a", name: "A", status: "done" }));
    const grouped = groupByStatus(s.runs);
    expect(grouped.map((g) => g.status)).toEqual(["done"]);
  });
});