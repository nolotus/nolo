import { describe, expect, test } from "bun:test";

import { foldLocalResultForTui } from "./agentRun";
import type { RunAgentTurnResult } from "./agentRunTypes";
import { snapshotFromRunRecord } from "../tui/runRegistryPoller";
import type { RunRecord } from "../agentRunControl";
import { formatAgentRunPanelLines } from "../tui/agentRunPanelLines";
import { formatRunDockLines } from "../tui/runDock";
import type { AgentRunSnapshot } from "./agentRunSnapshot";

describe("foldLocalResultForTui（状态行 ⚡ 积分的数据链）", () => {
  test("turnCredits 必须随行——重建丢字段就是「扣了费但 ⚡ 永不显示」的回归", () => {
    // 上游 runLocalAgentTurnForCli 已用 withTurnCredits 把 turnTokens.credits
    // 覆盖成全轮求和值；fold 只负责不再丢字段。
    const local: RunAgentTurnResult = {
      exitCode: 0,
      dialogId: "01DIALOG",
      title: "t",
      turnTokens: { input: 1000, output: 10, credits: 0.038 },
      turnCredits: 0.038,
    };
    const folded = foldLocalResultForTui(local);
    expect(folded.turnCredits).toBe(0.038);
    expect(folded.turnTokens?.credits).toBe(0.038);
    expect(folded.dialogId).toBe("01DIALOG");
  });

  test("usageRecords 必须随行——cli-local 计费审计（逐帧 JSONL）依赖它", () => {
    // fold 白名单历史上漏过 turnCredits；usageRecords 是同坑位新字段：
    // 丢了就是「auto 模式下审计日志只有 turnCredits、没有逐帧明细」。
    const usageRecords = [
      {
        callId: "call-1",
        usage: {
          input_tokens: 121171,
          output_tokens: 452,
          cache_read_input_tokens: 118656,
          cache_creation_input_tokens: 0,
          cost: 0.024018,
          billing_unit: "credits",
        },
        model: "glm-5-3-flash",
        provider: "nolo",
      },
    ];
    const folded = foldLocalResultForTui({
      exitCode: 0,
      dialogId: "01DIALOG",
      title: "t",
      turnCredits: 0.024018,
      usageRecords,
    });
    expect(folded.usageRecords).toEqual(usageRecords);
    expect(folded.usageRecords?.[0]?.usage?.cost).toBe(0.024018);
  });

  test("无 usageRecords 时不虚构该字段", () => {
    const folded = foldLocalResultForTui({ exitCode: 0, turnCredits: 0.01 });
    expect("usageRecords" in folded).toBe(false);
  });

  test("无平台计费（自有 API）时 turnCredits 缺省、不造 0", () => {
    const local: RunAgentTurnResult = {
      exitCode: 0,
      turnTokens: { input: 1000, output: 10 },
    };
    const folded = foldLocalResultForTui(local);
    expect(folded.turnCredits).toBeUndefined();
    expect("turnCredits" in folded).toBe(false);
  });

  test("失败字段（streamInterrupted / pendingToolName）照旧透传", () => {
    const folded = foldLocalResultForTui({
      exitCode: 0,
      streamInterrupted: true,
      pendingToolName: "Edit",
    });
    expect(folded.streamInterrupted).toBe(true);
    expect(folded.pendingToolName).toBe("Edit");
  });

  test("emptyAssistantFallbackReason 随行——后台 run 结算 stalled 依赖它", () => {
    const folded = foldLocalResultForTui({
      exitCode: 0,
      emptyAssistantFallbackReason: "length_truncated",
    });
    expect(folded.emptyAssistantFallbackReason).toBe("length_truncated");
  });

  // 与上一条配对：结算层靠这两个字段的组合区分「有正文的收尾帧缺失」与
  // 「真的没拿到输出」，任一在 fold 时丢失都会让 run 成败判断失真。
  test("emptyAssistantOutputUsable 随行——后台 run 结算区分可用截断依赖它", () => {
    const folded = foldLocalResultForTui({
      exitCode: 0,
      emptyAssistantFallbackReason: "stream_truncated",
      emptyAssistantOutputUsable: true,
    });
    expect(folded.emptyAssistantFallbackReason).toBe("stream_truncated");
    expect(folded.emptyAssistantOutputUsable).toBe(true);
  });

  test("未标记 usable 时不虚构该字段（避免误判为可用）", () => {
    const folded = foldLocalResultForTui({
      exitCode: 0,
      emptyAssistantFallbackReason: "stream_truncated",
    });
    expect(folded.emptyAssistantOutputUsable).toBeUndefined();
  });
});

describe("run 记录与面板/dock 的积分显示", () => {
  const baseRecord = {
    runId: "run-1",
    agentKey: "a",
    agentName: "AGY Flash",
    startedAt: new Date(1_700_000_000_000).toISOString(),
    endedAt: new Date(1_700_000_006_000).toISOString(),
    status: "done" as const,
    exitCode: 0,
    logPath: "/tmp/run-1.log",
  };

  test("snapshotFromRunRecord 携带收尾自报的 credits", () => {
    const snapshot = snapshotFromRunRecord({ ...baseRecord, credits: 0.12 } as RunRecord, Date.now());
    expect(snapshot.credits).toBe(0.12);
  });

  test("没有平台计费的 run 不带 credits 字段", () => {
    const snapshot = snapshotFromRunRecord({ ...baseRecord } as RunRecord, Date.now());
    expect(snapshot.credits).toBeUndefined();
  });

  test("单 run 面板行显示「⚡ x.xx 积分」", () => {
    const lines = formatAgentRunPanelLines(
      { runId: "run-1", status: "done", agentName: "AGY Flash", credits: 0.12, logKey: "" },
      false,
      1_700_000_010_000
    );
    expect(lines[0]).toContain("⚡ 0.12 积分");
  });

  test("多 run dock 行显示紧凑积分", () => {
    const lines = formatRunDockLines(
      [
        { runId: "run-1", status: "done", agentName: "A", credits: 0.05, logKey: "" },
        { runId: "run-2", status: "done", agentName: "B", logKey: "" },
      ],
      false,
      1_700_000_010_000
    );
    const row1 = lines.find((l) => l.includes("A #")) ?? "";
    expect(row1).toContain("⚡0.05");
    const row2 = lines.find((l) => l.includes("B #")) ?? "";
    expect(row2).not.toContain("⚡");
  });
});
