import { describe, expect, it } from "bun:test";
import {
  aggregateBatch,
  formatBatchSummary,
  DEFAULT_BATCH_TIMEOUT_MS,
  MAX_ERROR_SUMMARY_CHARS,
  MAX_FAILURE_LINES,
} from "./batchAggregation";
import type { BatchRunSummary } from "./batchAggregation";

// ── 测试基座：固定时钟（模块禁止读取系统时钟，所有时间由入参驱动）──────
const BASE = "2026-08-09T00:00:00.000Z";
const NOW = "2026-08-09T01:00:00.000Z"; // 距 BASE 1h > 默认 30min 阈值

function run(
  runId: string,
  status: string,
  extra: Partial<BatchRunSummary> = {}
): BatchRunSummary {
  return { runId, status, startedAt: BASE, ...extra };
}

const done = (id: string) => run(id, "done");
const failedRun = (id: string, err?: string) =>
  run(id, "failed", { errorSummary: err });

describe("aggregateBatch — 全部成功 → 收敛唤醒一次", () => {
  it("全部 done：触发 converged，带汇总", () => {
    const res = aggregateBatch({
      batchId: "b-1",
      runs: [done("impl-1"), done("impl-2"), done("impl-3")],
      now: NOW,
    });
    expect(res.converged).toBe(true);
    expect(res.timedOut).toBe(false);
    expect(res.newWakeReasons).toEqual(["converged"]);
    expect(res.counts).toEqual({
      total: 3,
      success: 3,
      failed: 0,
      orphaned: 0,
      running: 0,
    });
    expect(res.summary).toContain("3/3 完成 — 3 成功, 0 失败");
    expect(res.summary).not.toContain("\u001b"); // 无色纯文本
  });

  it("收敛后重复调用不重复唤醒（幂等）", () => {
    const input = {
      batchId: "b-1",
      runs: [done("impl-1"), done("impl-2")],
      now: NOW,
    };
    const first = aggregateBatch(input);
    expect(first.newWakeReasons).toEqual(["converged"]);
    // 调用方把 converged 并入已通知集合后再 poll
    const second = aggregateBatch({
      ...input,
      notifiedReasons: ["converged"],
    });
    expect(second.newWakeReasons).toEqual([]);
    expect(second.summary).toBe("");
    // 但状态本身仍然稳定：已收敛
    expect(second.converged).toBe(true);
  });
});

describe("aggregateBatch — 首个失败 → 立即唤醒且幂等", () => {
  it("批次里有失败即触发 failure 快报，止损优先", () => {
    const res = aggregateBatch({
      batchId: "b-2",
      runs: [failedRun("impl-2", "测试未过"), done("impl-1"), run("impl-3", "running")],
      now: NOW,
    });
    expect(res.newWakeReasons).toEqual(["failure"]);
    expect(res.summary).toContain("失败: impl-2 — 测试未过");
    expect(res.summary).toContain("1 成功, 1 失败");
    expect(res.summary).toContain("1 仍在跑");
  });

  it("同一失败重复调用不重复唤醒（幂等）", () => {
    const input = {
      batchId: "b-2",
      runs: [failedRun("impl-2", "测试未过"), done("impl-1"), run("impl-3", "running")],
      // now 与 startedAt 同时刻：隔离超时因素，专测 failure 幂等
      now: BASE,
    };
    const first = aggregateBatch(input);
    expect(first.newWakeReasons).toEqual(["failure"]);
    // 失败仍在，但已通知过 failure → 不再唤醒
    const second = aggregateBatch({
      ...input,
      notifiedReasons: ["failure"],
    });
    expect(second.newWakeReasons).toEqual([]);
    // 未收敛（impl-3 还在跑）→ 也不触发 converged
    expect(second.converged).toBe(false);
  });
});

describe("aggregateBatch — 先失败后其余完成 → 共两次", () => {
  it("failure 一次 + converged 一次，各自不重复", () => {
    const base = {
      batchId: "b-3",
      runs: [failedRun("impl-1"), run("impl-2", "running"), run("impl-3", "running")],
      now: NOW,
    };
    // 第 1 次 poll：发现失败 → 快报
    const t1 = aggregateBatch(base);
    expect(t1.newWakeReasons).toEqual(["failure"]);

    // 其余完成：converged 触发（failure 已通知不重复）
    const t2 = aggregateBatch({
      ...base,
      runs: [failedRun("impl-1"), done("impl-2"), done("impl-3")],
      notifiedReasons: ["failure"],
    });
    expect(t2.newWakeReasons).toEqual(["converged"]);
    expect(t2.summary).toContain("3/3 完成 — 2 成功, 1 失败");

    // 再次调用：都通知过 → 静默
    const t3 = aggregateBatch({
      ...base,
      runs: [failedRun("impl-1"), done("impl-2"), done("impl-3")],
      notifiedReasons: ["failure", "converged"],
    });
    expect(t3.newWakeReasons).toEqual([]);
    expect(t3.summary).toBe("");
  });

  it("单元素失败：failure 一次 + 随后的 converged 一次", () => {
    const input = { batchId: "b-solo", runs: [failedRun("only", "boom")], now: NOW };
    const t1 = aggregateBatch(input);
    expect(t1.newWakeReasons).toEqual(["failure"]);
    expect(t1.converged).toBe(true); // 状态上已收敛，只是 failure 优先级更高
    const t2 = aggregateBatch({ ...input, notifiedReasons: ["failure"] });
    expect(t2.newWakeReasons).toEqual(["converged"]);
    expect(t2.summary).toContain("1/1 完成 — 0 成功, 1 失败");
  });
});

describe("aggregateBatch — 含 orphaned → 视为失败类触发快报", () => {
  it("orphaned 触发 failure 快报并单独计数", () => {
    const res = aggregateBatch({
      batchId: "b-4",
      runs: [run("ghost-1", "orphaned"), done("impl-1")],
      now: NOW,
    });
    expect(res.newWakeReasons).toEqual(["failure"]);
    expect(res.counts.failed).toBe(1);
    expect(res.counts.orphaned).toBe(1);
    expect(res.summary).toContain("失败: ghost-1");
  });

  it("killed/cancelled 同样属于失败类（非 done 终态）", () => {
    const res = aggregateBatch({
      batchId: "b-5",
      runs: [run("k-1", "killed"), run("c-1", "cancelled")],
      now: NOW,
    });
    expect(res.newWakeReasons).toEqual(["failure"]);
    expect(res.counts.failed).toBe(2);
    expect(res.summary).toContain("0 成功, 2 失败");
  });
});

describe("aggregateBatch — 超时未收敛 → 超时唤醒并标记未完成者", () => {
  it("超过阈值仍未终态：触发 timeout，unfinished 标记未完成者", () => {
    const res = aggregateBatch({
      batchId: "b-6",
      // 全部未终态，且距 startedAt 已 1h > 30min
      runs: [run("slow-1", "running"), run("slow-2", "running")],
      now: NOW,
    });
    expect(res.newWakeReasons).toEqual(["timeout"]);
    expect(res.timedOut).toBe(true);
    expect(res.converged).toBe(false);
    expect(res.unfinished).toEqual(["slow-1", "slow-2"]);
    expect(res.summary).toContain("超时未收敛 — 2 个未完成");
    expect(res.summary).toContain("未完成: slow-1");
  });

  it("超时阈值可入参覆盖，未超时不触发", () => {
    // 1h > 自定义 10min → 触发
    const hit = aggregateBatch({
      batchId: "b-7",
      runs: [run("slow-1", "running")],
      now: NOW,
      timeoutMs: 10 * 60 * 1000,
    });
    expect(hit.newWakeReasons).toEqual(["timeout"]);

    // 1h < 自定义 2h → 不触发（即使超过默认 30min）
    const miss = aggregateBatch({
      batchId: "b-7",
      runs: [run("slow-1", "running")],
      now: NOW,
      timeoutMs: 2 * 60 * 60 * 1000,
    });
    expect(miss.newWakeReasons).toEqual([]);
    expect(miss.timedOut).toBe(false);
    expect(miss.converged).toBe(false);
  });

  it("超时原因幂等：通知后不再触发", () => {
    const input = {
      batchId: "b-8",
      runs: [run("slow-1", "running")],
      now: NOW,
    };
    expect(aggregateBatch(input).newWakeReasons).toEqual(["timeout"]);
    expect(
      aggregateBatch({ ...input, notifiedReasons: ["timeout"] }).newWakeReasons
    ).toEqual([]);
  });

  it("缺 startedAt 的 run 不参与超时判定（不误报）", () => {
    const res = aggregateBatch({
      batchId: "b-9",
      runs: [run("no-start", "running", { startedAt: undefined })],
      now: NOW,
    });
    expect(res.timedOut).toBe(false);
    expect(res.newWakeReasons).toEqual([]);
  });

  it("超时之后才收敛：timeout + converged 各一次", () => {
    const t1 = aggregateBatch({
      batchId: "b-10",
      runs: [run("slow-1", "running")],
      now: NOW,
    });
    expect(t1.newWakeReasons).toEqual(["timeout"]);
    const t2 = aggregateBatch({
      batchId: "b-10",
      runs: [done("slow-1")],
      now: NOW,
      notifiedReasons: ["timeout"],
    });
    expect(t2.newWakeReasons).toEqual(["converged"]);
  });
});

describe("aggregateBatch — 空批次 / 单元素边界", () => {
  it("空批次：vacuously 收敛，触发一次 converged", () => {
    const res = aggregateBatch({ batchId: "b-empty", runs: [], now: NOW });
    expect(res.converged).toBe(true);
    expect(res.timedOut).toBe(false);
    expect(res.counts).toEqual({ total: 0, success: 0, failed: 0, orphaned: 0, running: 0 });
    expect(res.newWakeReasons).toEqual(["converged"]);
    expect(res.summary).toContain("0/0 完成");
    // 幂等
    expect(
      aggregateBatch({ batchId: "b-empty", runs: [], now: NOW, notifiedReasons: ["converged"] })
        .newWakeReasons
    ).toEqual([]);
  });

  it("单元素成功：converged 一次", () => {
    const res = aggregateBatch({ batchId: "b-single", runs: [done("only")], now: NOW });
    expect(res.newWakeReasons).toEqual(["converged"]);
    expect(res.summary).toContain("1/1 完成 — 1 成功, 0 失败");
  });

  it("单元素 running 未超时：不唤醒", () => {
    const res = aggregateBatch({
      batchId: "b-single",
      runs: [run("only", "running")],
      now: BASE, // 与 startedAt 同时刻，未超时
    });
    expect(res.newWakeReasons).toEqual([]);
    expect(res.summary).toBe("");
  });
});

describe("摘要 — 长度上限与不含完整日志", () => {
  it("错误摘要被折叠空白并截断到 MAX_ERROR_SUMMARY_CHARS", () => {
    const longError = "x".repeat(500);
    const res = aggregateBatch({
      batchId: "b-long",
      runs: [failedRun("impl-9", longError)],
      now: NOW,
    });
    expect(res.summary).not.toContain(longError); // 不拼完整内容
    // 失败行 = "失败: impl-9 — " + 截断后内容
    const failureLine = res.summary.split("\n")[1];
    expect(failureLine.length).toBeLessThanOrEqual(
      "失败: impl-9 — ".length + MAX_ERROR_SUMMARY_CHARS + 1 // 省略号 1 字符
    );
    expect(res.summary).toContain("…"); // 已截断标记
  });

  it("多行错误被折叠为单行", () => {
    const res = aggregateBatch({
      batchId: "b-multi",
      runs: [failedRun("impl-9", "line1\nline2\n  line3")],
      now: NOW,
    });
    const failureLine = res.summary.split("\n")[1];
    expect(failureLine).toBe("失败: impl-9 — line1 line2 line3");
    expect(failureLine.split("\n").length).toBe(1);
  });

  it("失败者超过 MAX_FAILURE_LINES 时只逐行列出前 N 个", () => {
    const many = Array.from({ length: MAX_FAILURE_LINES + 5 }, (_, i) =>
      failedRun(`f-${i}`)
    );
    const res = aggregateBatch({ batchId: "b-many", runs: many, now: NOW });
    const failureLines = res.summary.split("\n").filter((l) => l.startsWith("失败:"));
    expect(failureLines.length).toBe(MAX_FAILURE_LINES);
    expect(res.summary).toContain("… 及另外 5 个失败");
  });

  it("无错误摘要的失败者不输出空破折号段", () => {
    const res = aggregateBatch({
      batchId: "b-noerr",
      runs: [failedRun("impl-9"), done("impl-1")],
      now: NOW,
    });
    expect(res.summary).toContain("失败: impl-9");
    // 汇总行含破折号是格式本身；失败行不带空错误段
    expect(res.summary.split("\n")[1]).not.toContain("—");
  });

  it("成功者不逐行展开，只出现在汇总计数", () => {
    const res = aggregateBatch({
      batchId: "b-ok",
      runs: [done("impl-a"), done("impl-b"), failedRun("impl-c")],
      now: NOW,
    });
    const lines = res.summary.split("\n");
    expect(lines.length).toBe(2); // 汇总行 + 1 个失败行
    expect(res.summary).not.toContain("impl-a");
    expect(res.summary).toContain("2 成功, 1 失败");
  });
});

describe("formatBatchSummary — 纯函数直接测试", () => {
  it("timeout 形态标记未完成者", () => {
    const summary = formatBatchSummary(
      "b-x",
      { total: 2, success: 0, failed: 0, orphaned: 0, running: 2 },
      [run("slow-1", "running"), run("slow-2", "running")],
      "timeout"
    );
    expect(summary).toContain("超时未收敛 — 2 个未完成");
    expect(summary).toContain("未完成: slow-1");
    expect(summary).toContain("未完成: slow-2");
  });

  it("agentName 出现在失败行括号内", () => {
    const summary = formatBatchSummary(
      "b-x",
      { total: 1, success: 0, failed: 1, orphaned: 0, running: 0 },
      [run("impl-2", "failed", { agentName: "GLM 5.2", errorSummary: "测试未过" })],
      "failure"
    );
    expect(summary).toBe("批次 b-x: 1/1 完成 — 0 成功, 1 失败\n失败: impl-2 (GLM 5.2) — 测试未过");
  });
});

describe("aggregateBatch — 时钟由入参驱动（不依赖系统时钟）", () => {
  it("同样的 run，now 不同结论不同", () => {
    const running = [run("slow-1", "running")];
    // startedAt 起 1 分钟内：未超时 → 不唤醒
    const early = aggregateBatch({ batchId: "b-clock", runs: running, now: BASE });
    expect(early.newWakeReasons).toEqual([]);
    // 1 小时后：超时
    const late = aggregateBatch({ batchId: "b-clock", runs: running, now: NOW });
    expect(late.newWakeReasons).toEqual(["timeout"]);
    expect(DEFAULT_BATCH_TIMEOUT_MS).toBe(30 * 60 * 1000);
  });
});
