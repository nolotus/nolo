import { describe, expect, it } from "bun:test";
import {
  shortRunId,
  formatDuration,
  formatFinishedRunCard,
  formatListRunsCard,
  formatNotFoundRunCard,
  formatRunAge,
  formatStartRunCard,
  formatStatusRunCard,
  formatStopRunCard,
  getAgentRunStatusIcon,
  isAgentNameFallback,
  isAgentRunTerminalStatus,
  resolveRunLabel,
} from "./agentRunDisplayHelpers";

describe("agentRunDisplayHelpers", () => {
  it("getAgentRunStatusIcon maps statuses to clean icons", () => {
    expect(getAgentRunStatusIcon("running")).toBe("⏳");
    expect(getAgentRunStatusIcon("pending")).toBe("⏳");
    expect(getAgentRunStatusIcon("done")).toBe("✓");
    expect(getAgentRunStatusIcon("failed")).toBe("✗");
    expect(getAgentRunStatusIcon("killed")).toBe("🛑");
    expect(getAgentRunStatusIcon("orphaned")).toBe("👻");
    expect(getAgentRunStatusIcon("unknown")).toBe("?");
  });

  it("formatStartRunCard produces clean started card", () => {
    const card = formatStartRunCard("Grok 4.5", "running");
    expect(card).toBe("Run started\n  agent   Grok 4.5\n  status  ⏳ running");
  });

  it("formatStartRunCard omits agent row on fallback name", () => {
    expect(formatStartRunCard("agent", "running")).toBe("Run started\n  status  ⏳ running");
  });

  it("formatStartRunCard carries the task and a short runId", () => {
    const card = formatStartRunCard("Worker", "running", {
      task: "核对三端 prompt cache 命中率，按 entry_path 验证 token 记录",
      runId: "a3f21c04-9b2e-4d11-8c7a-0f5e6d7c8b9a",
    });
    expect(card).toContain("agent   Worker  #6d7c8b9a");
    expect(card).toContain("task    核对三端 prompt cache 命中率");
    // The full uuid never reaches the card — it is chrome, not content.
    expect(card).not.toContain("9b2e-4d11");
  });

  it("formatStartRunCard still identifies an unnamed run by its runId", () => {
    const card = formatStartRunCard("agent", "running", { runId: "run-abcdef12345" });
    expect(card).toContain("agent   #def12345");
    expect(card).not.toContain("agent   agent");
  });

  it("formatStatusRunCard renders a partial progress row", () => {
    expect(formatStatusRunCard("Worker", "running", { toolCallCount: 4 })).toContain(
      "tools   4 tools"
    );
    expect(formatStatusRunCard("Worker", "running", { lastToolNames: ["grep"] })).toContain(
      "tools   grep"
    );
    // No activity reported yet — no empty row.
    expect(formatStatusRunCard("Worker", "running")).not.toContain("tools");
  });

  it("formatStatusRunCard reports no observer detail", () => {
    // Poll count and poll round-trip describe the watcher, not the run; the
    // round-trip in particular used to read as the run's own duration.
    const card = formatStatusRunCard("Worker", "running", { toolCallCount: 4 });
    expect(card).not.toContain("polls");
    expect(card).not.toMatch(/\bms\b/);
  });

  it("formatStatusRunCard keeps a healthy run's card free of raw stdout", () => {
    // The tail on a running agent is process output, not progress; it used to
    // push the rows that answer "what is it doing" off the card.
    const card = formatStatusRunCard("DeepSeek V4 Flash", "running", {
      logLines: ["step 1", "DATA_CLONE_ERR: 25,"],
    });
    expect(card).toBe("Run status\n  ⏳ running\n  agent   DeepSeek V4 Flash");
    expect(card).not.toContain("Log tail");
  });

  it("formatStatusRunCard shows the log tail once a run fails", () => {
    for (const status of ["failed", "timeout"]) {
      const card = formatStatusRunCard("Worker", status, { logLines: ["boom", "trace"] });
      expect(card).toContain("Log tail:");
      // Unfiltered on purpose: on a failed run these bytes are the evidence.
      expect(card).toContain("boom");
      expect(card).toContain("trace");
    }
  });

  it("formatStatusRunCard omits agent row when name is the agent fallback", () => {
    const card = formatStatusRunCard("agent", "failed", { logLines: ["x"] });
    expect(card).toBe("Run status\n  ✗ failed\n\nLog tail:\n  x");
    expect(card).not.toContain("agent   agent");
  });

  it("formatStatusRunCard accepts injected labels and progress metadata", () => {
    const card = formatStatusRunCard("Writer", "failed", {
      toolCallCount: 12,
      lastToolNames: ["readFile", "grep"],
      lastAssistantText: "已定位到 adapter 的缓存点",
      errorMessage: "boom",
      logLines: ["done"],
      labels: {
        runStatus: "运行状态",
        logTail: "日志尾部：",
      },
    });
    expect(card).toContain("运行状态");
    expect(card).toContain("tools   12 tools · readFile, grep");
    expect(card).toContain("note    已定位到 adapter 的缓存点");
    expect(card).toContain("error   boom");
    expect(card).toContain("日志尾部：");
    expect(isAgentNameFallback("agent")).toBe(true);
    expect(isAgentNameFallback("Writer")).toBe(false);
    expect(isAgentRunTerminalStatus("done")).toBe(true);
    expect(isAgentRunTerminalStatus("orphaned")).toBe(true);
    expect(isAgentRunTerminalStatus("running")).toBe(false);
  });

  it("formatStatusRunCard can suppress unchanged log tail", () => {
    const card = formatStatusRunCard("Writer", "failed", {
      logLines: ["same"],
      includeLogTail: false,
    });
    expect(card).not.toContain("Log tail");
    expect(card).not.toContain("same");
  });

  it("formatStopRunCard produces clean stop card", () => {
    expect(formatStopRunCard("killed")).toBe("Run stopped\n  🛑 killed");
  });

  it("formatListRunsCard produces clean list card", () => {
    const card = formatListRunsCard([
      { agentName: "Grok 4.5", status: "running" },
      { agentName: "DeepSeek V4 Flash", status: "done" },
    ]);
    expect(card).toBe("Runs (2)\n  ⏳  Grok 4.5\n  ✓  DeepSeek V4 Flash");
  });

  it("formatListRunsCard falls back to agentKey then runId, never bare 'agent'", () => {
    const card = formatListRunsCard([
      { agentKey: "reviewer-01", runId: "run-1", status: "killed" },
      { runId: "run-2", status: "failed" },
      { agentName: "agent", agentKey: "writer-02", runId: "run-3", status: "done" },
    ]);
    expect(card).toBe("Runs (3)\n  🛑  reviewer-01\n  ✗  run-2\n  ✓  writer-02");
  });

  it("resolveRunLabel prefers name over key and rejects the literal fallback", () => {
    expect(resolveRunLabel({ agentName: "Writer", agentKey: "k", runId: "r" })).toBe("Writer");
    expect(resolveRunLabel({ name: "Writer", agentKey: "k" })).toBe("Writer");
    expect(resolveRunLabel({ agentName: "  ", agentKey: "k" })).toBe("k");
    expect(resolveRunLabel({ runId: "run-9" })).toBe("run-9");
    expect(resolveRunLabel({})).toBe("agent");
  });

  it("formatNotFoundRunCard uses default and injected labels", () => {
    expect(formatNotFoundRunCard()).toBe("Run status\n  ? not_found");
    expect(formatNotFoundRunCard({ runStatus: "运行状态" })).toBe("运行状态\n  ? not_found");
  });
});

describe("run age", () => {
  it("formatDuration scales from seconds to hours", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(12_400)).toBe("12s");
    expect(formatDuration(134_000)).toBe("2m14s");
    expect(formatDuration(242_000)).toBe("4m02s");
    // Seconds are dropped past the hour — the row must stay one line.
    expect(formatDuration(3_840_000)).toBe("1h04m");
  });

  it("formatRunAge counts to now while running and freezes once finished", () => {
    const started = 1_000_000;
    expect(formatRunAge({ startedAt: started }, started + 134_000)).toBe("2m14s");
    expect(
      formatRunAge({ startedAt: started, finishedAt: started + 60_000 }, started + 999_000)
    ).toBe("1m00s");
  });

  it("formatRunAge reports nothing rather than something wrong", () => {
    // Older servers do not send startedAt; an epoch-0 clock would otherwise
    // render an age of decades.
    expect(formatRunAge(undefined, 1_000_000)).toBe("");
    expect(formatRunAge({}, 1_000_000)).toBe("");
    expect(formatRunAge({ startedAt: 0 }, 1_000_000)).toBe("");
    expect(formatRunAge({ startedAt: Number.NaN }, 1_000_000)).toBe("");
  });

  it("formatStatusRunCard puts the age on the status line", () => {
    const card = formatStatusRunCard("Worker", "running", {
      timing: { startedAt: 1_000_000 },
      now: 1_000_000 + 134_000,
    });
    expect(card).toContain("⏳ running   2m14s");
  });

  it("cards omit the age entirely when the run reports no start time", () => {
    expect(formatStatusRunCard("Worker", "running")).toContain("⏳ running");
    expect(formatStatusRunCard("Worker", "running")).not.toContain("  0s");
  });
});

describe("formatFinishedRunCard", () => {
  const timing = { startedAt: 1_000_000, finishedAt: 1_000_000 + 242_000 };

  it("summarises outcome, duration and work on one line", () => {
    const card = formatFinishedRunCard("Worker", "done", {
      runId: "a3f21c04-9b2e",
      toolCallCount: 31,
      lastToolNames: ["writeFile"],
      lastAssistantText: "报表已写入 docs/reports/cache-hit.md",
      timing,
    });
    expect(card).toContain("Run finished");
    expect(card).toContain("✓ done · 4m02s · 31 tools · writeFile");
    expect(card).toContain("agent   Worker  #9b2e");
    expect(card).toContain("note    报表已写入 docs/reports/cache-hit.md");
  });

  it("shows the failure reason and the log tail when a run fails", () => {
    const card = formatFinishedRunCard("Worker", "failed", {
      errorMessage: "API key expired",
      logLines: ["boom"],
      timing,
    });
    expect(card).toContain("✗ failed · 4m02s");
    expect(card).toContain("error   API key expired");
    expect(card).toContain("Log tail:");
    expect(card).toContain("boom");
  });

  it("keeps a successful run's stdout off the card", () => {
    const card = formatFinishedRunCard("Worker", "done", { logLines: ["noise"], timing });
    expect(card).not.toContain("Log tail");
  });

  it("degrades to the outcome alone when nothing else is known", () => {
    expect(formatFinishedRunCard("agent", "done")).toBe("Run finished\n  ✓ done");
  });
});

describe("shortRunId", () => {
  it("discriminates ids whose entropy is at the tail", () => {
    // Real CLI local ids are `run-<ISO>-<rand>`: a leading slice made every run
    // started in the same year render identically as `run-2026`.
    const a = shortRunId("run-2026-08-09T04-02-21-008Z-7zezmk");
    const b = shortRunId("run-2026-08-09T04-05-11-100Z-qq31ab");
    expect(a).toBe("7zezmk");
    expect(b).toBe("qq31ab");
    expect(a).not.toBe(b);
  });

  it("discriminates server ULIDs, which are also time-prefixed", () => {
    const a = shortRunId("01KZH0TMT6QD2S712KF3FQEQEB");
    const b = shortRunId("01KZH0TMT6QD2S712KF3ZZZZZZ");
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(8);
  });

  it("leaves ids too short to slice alone", () => {
    expect(shortRunId("run-1")).toBe("run-1");
    expect(shortRunId("")).toBe("");
    expect(shortRunId(undefined)).toBe("");
  });
});
