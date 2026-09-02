// NOLO_LOOP_TIMING 必须在 import localLoop 之前设置（模块级常量在加载时求值）。
process.env.NOLO_LOOP_TIMING = "1";
const TIMING_FILE = join(tmpdir(), `nolo-loop-timing-${process.pid}.jsonl`);
process.env.NOLO_LOOP_TIMING_FILE = TIMING_FILE;
// 默认隔离 NOLO_HOME：spill 目录（~/.nolo/spills）当前有数千文件，spillToolOutput 每次
// 调用都全目录扫描，会主导 buildMessages 相位。bench 用临时 NOLO_HOME 测「干净环境」
// 基线；真实目录规模的影响单独在 plan 文档里说明。
// --real-home 时不做隔离，直接使用真实 ~/.nolo（用于验证 spill 清理节流优化）。
if (!process.argv.includes("--real-home")) {
  process.env.NOLO_HOME = join(tmpdir(), `nolo-loop-bench-home-${process.pid}`);
}

import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AgentRuntimeHostAdapter, AgentRuntimeSaveTurnInput } from "../hostAdapter";
import type { AgentRuntimeChatMessage } from "../types";

// 动态 import：确保上面的 env 设置先于 localLoop 模块求值。
const { runLocalAgentTurn } = await import("../localLoop");

// ─────────────────────────────────────────────────────────────────────────────
// 场景矩阵
// ─────────────────────────────────────────────────────────────────────────────
// --long 追加长循环档：真实 agent run 常见 100–300 轮，用于暴露「每轮全量扫描
// 历史」这类 O(n²) 形状（30 轮档看不出来）。
const SCENARIOS = Bun.argv.includes("--long")
  ? [
      { rounds: 30, toolsPerRound: 3, samples: 3 },
      { rounds: 100, toolsPerRound: 3, samples: 3 },
      { rounds: 200, toolsPerRound: 3, samples: 3 },
      { rounds: 300, toolsPerRound: 3, samples: 3 },
    ]
  : [
      { rounds: 1, toolsPerRound: 1, samples: 7 },
      { rounds: 10, toolsPerRound: 3, samples: 7 },
      { rounds: 30, toolsPerRound: 3, samples: 7 },
    ];

// 相位分类：一次性（整 turn 一次）/ 每轮 / 每工具
const ONCE_PHASES = new Set([
  "loadDialogHistory",
  "buildContextBlocks",
  "maybeAutoCompactLocalHistory",
  "trimHistoryToContextBudget",
  "buildMessages",
  "saveTurnStart",
  "saveTurn",
]);
const PER_ROUND_PHASES = new Set([
  "roundStart",
  "prepareMessagesForProviderCall",
  "llmCall",
  "postLlmProcessing",
  "toolLoopStart",
  "roundEnd",
]);
const PER_TOOL_PHASES = new Set(["toolCallStart", "toolExecute", "toolResultFormat"]);

// ─────────────────────────────────────────────────────────────────────────────
// 预填「真实量级」历史：50 条消息（20 user + 20 assistant + 10 tool 结果 2KB）
// ─────────────────────────────────────────────────────────────────────────────
function buildHistory(): AgentRuntimeChatMessage[] {
  const history: AgentRuntimeChatMessage[] = [];
  for (let i = 0; i < 20; i++) {
    history.push({ role: "user", content: `previous user message ${i}` });
    history.push({ role: "assistant", content: `previous assistant answer ${i}` });
    if (i % 2 === 0) {
      history.push({
        role: "tool",
        content: "x".repeat(2048),
        tool_call_id: `prev-${i}`,
        toolName: "execShell",
      });
    }
  }
  return history;
}

// ─────────────────────────────────────────────────────────────────────────────
// scripted mock provider：前 rounds 轮返回 toolsPerRound 个 tool_calls（0 延迟），
// 第 rounds+1 轮返回纯文本结束。工具结果带 callId（保证每次不同，避免 progressGuard
// 的 stagnant_tool_calls 熔断误杀 30 轮场景）。
// ─────────────────────────────────────────────────────────────────────────────
function makeScriptedProvider(rounds: number, toolsPerRound: number) {
  let callCount = 0;
  return {
    model: "fake-local",
    complete: async (messages: AgentRuntimeChatMessage[]) => {
      callCount += 1;
      if (callCount <= rounds) {
        return {
          content: "",
          model: "fake-local",
          tool_calls: Array.from({ length: toolsPerRound }, (_, i) => ({
            id: `call-${callCount}-${i}`,
            type: "function" as const,
            function: {
              name: "execShell",
              arguments: JSON.stringify({ cmd: `echo bench-${callCount}-${i}` }),
            },
          })),
          finish_reason: "tool_calls",
        };
      }
      return { content: "final text answer", model: "fake-local", finish_reason: "stop" };
    },
  };
}

function makeMemoryAdapter(
  history: AgentRuntimeChatMessage[],
  rounds: number,
  toolsPerRound: number,
): AgentRuntimeHostAdapter {
  return {
    host: "cli",
    capabilities: ["local-provider", "local-persistence", "local-tools"],
    loadAgentConfig: async (agentRef) => ({
      key: agentRef,
      name: "Bench Agent",
      prompt: "You are a bench agent.",
      model: "fake-local",
      toolNames: ["execShell"],
    }),
    loadDialogHistory: async () => history,
    saveTurn: async () => ({ dialogId: "dialog-bench" }),
    resolveProvider: async () => makeScriptedProvider(rounds, toolsPerRound),
    executeTool: async (call) => ({
      content: `${call.id} ` + "x".repeat(2048),
      metadata: { exitCode: 0 },
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 统计
// ─────────────────────────────────────────────────────────────────────────────
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

type PhaseAgg = { samples: number; medianMs: number; perTurnMs: number; pct: number };

function aggregate(
  timings: Record<string, number[]>,
  rounds: number,
  toolsPerRound: number,
): { rows: Array<{ phase: string } & PhaseAgg>; totalPerTurnMs: number } {
  const rows: Array<{ phase: string } & PhaseAgg> = [];
  let totalPerTurnMs = 0;
  for (const [phase, values] of Object.entries(timings)) {
    const med = median(values);
    const perTurnMs = ONCE_PHASES.has(phase)
      ? med
      : PER_ROUND_PHASES.has(phase)
        ? med * rounds
        : PER_TOOL_PHASES.has(phase)
          ? med * toolsPerRound * rounds
          : med;
    rows.push({ phase, samples: values.length, medianMs: med, perTurnMs, pct: 0 });
    totalPerTurnMs += perTurnMs;
  }
  for (const row of rows) {
    row.pct = totalPerTurnMs > 0 ? (row.perTurnMs / totalPerTurnMs) * 100 : 0;
  }
  rows.sort((a, b) => b.perTurnMs - a.perTurnMs);
  return { rows, totalPerTurnMs };
}

// ─────────────────────────────────────────────────────────────────────────────
// 主场景
// ─────────────────────────────────────────────────────────────────────────────
async function runScenario(rounds: number, toolsPerRound: number, samples: number) {
  const history = buildHistory();
  const timings: Record<string, number[]> = {};
  for (let s = 0; s < samples; s++) {
    writeFileSync(TIMING_FILE, "");
    const adapter = makeMemoryAdapter(history, rounds, toolsPerRound);
    await runLocalAgentTurn({
      adapter,
      agentRef: "bench",
      input: "bench input",
      continueDialogId: "dialog-bench",
    });
    const rows = readFileSync(TIMING_FILE, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { phase: string; round: number; durationMs: number });
    for (const row of rows) {
      (timings[row.phase] ??= []).push(row.durationMs);
    }
  }
  return aggregate(timings, rounds, toolsPerRound);
}

// ─────────────────────────────────────────────────────────────────────────────
// 微基准：真实 saveTurn 路径（writeDialog + 临时 LevelDB）
// ─────────────────────────────────────────────────────────────────────────────
async function runSaveTurnMicroBench() {
  const { createLevelAuthorityStore } = await import("../../database-engine/levelAuthorityStore");
  const { createLegacyServerDb } = await import("../../database-engine/legacyServerDb");
  const { createHybridRecordStore } = await import("../hybridRecordStore");
  const { writeDialog } = await import("../../cli/client/localRuntimeDialog");

  const dir = mkdtempSync(join(tmpdir(), "nolo-saveturn-bench-"));
  const store = createLevelAuthorityStore(dir);
  await store.open();
  const db = createLegacyServerDb(store);
  const hybrid = createHybridRecordStore({
    db,
    defaultServer: "https://nolo.local",
    fallbackServers: [],
    fetchImpl: fetch,
  });

  const history = buildHistory();
  const messages: AgentRuntimeChatMessage[] = [
    ...history,
    { role: "user", content: "bench input" },
    { role: "assistant", content: "final answer" },
  ];
  const baseInput: AgentRuntimeSaveTurnInput = {
    agentKey: "bench-agent",
    messages,
    result: { content: "final answer", model: "fake-local", toolCallCount: 3 },
    billingConfig: { model: "fake-local" },
  };

  let idCounter = 0;
  const now = () => Date.now();
  const createId = () => `bench-${idCounter++}`;

  const measure = async (input: AgentRuntimeSaveTurnInput): Promise<number> => {
    const t0 = performance.now();
    await writeDialog({
      store: hybrid,
      input,
      userId: "local",
      now,
      createId,
      env: {},
      fetchImpl: fetch,
      cwd: "/tmp",
      titleGenerator: null,
    });
    return performance.now() - t0;
  };

  // 新 dialog：每次独立 dialogId（createId 递增）
  const freshDurations: number[] = [];
  for (let i = 0; i < 7; i++) {
    freshDurations.push(await measure({ ...baseInput }));
  }

  // 续聊：先建一个 dialog，再在同一 dialog 上续写 7 次（消息累积，模拟真实增长）
  const continueDurations: number[] = [];
  const first = await measure({ ...baseInput });
  continueDurations.push(first);
  for (let i = 1; i < 7; i++) {
    continueDurations.push(
      await measure({ ...baseInput, continueDialogId: "dialog-bench" }),
    );
  }

  await store.close();
  rmSync(dir, { recursive: true, force: true });

  return {
    fresh: { samples: freshDurations.length, medianMs: median(freshDurations) },
    continued: { samples: continueDurations.length, medianMs: median(continueDurations) },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const skipMicro = args.has("--scenarios-only");

console.log("=== localLoop 非 LLM 开销基线（NOLO_LOOP_TIMING=1，mock provider 0 延迟）===");
console.log("相位定义：delta 语义（距上一 mark）；一次性相位=整 turn 一次，每轮相位×rounds，每工具相位×toolsPerRound×rounds");
console.log("");

const allResults: Array<{ rounds: number; toolsPerRound: number; rows: Array<{ phase: string } & PhaseAgg>; totalPerTurnMs: number }> = [];
for (const scenario of SCENARIOS) {
  const { rows, totalPerTurnMs } = await runScenario(
    scenario.rounds,
    scenario.toolsPerRound,
    scenario.samples,
  );
  allResults.push({ rounds: scenario.rounds, toolsPerRound: scenario.toolsPerRound, rows, totalPerTurnMs });
  console.log(`--- 场景 rounds=${scenario.rounds} tools/round=${scenario.toolsPerRound} samples=${scenario.samples} ---`);
  console.log(`| phase | samples | medianMs | perTurnMs | pct% |`);
  console.log(`|---|---:|---:|---:|---:|`);
  for (const row of rows) {
    console.log(`| ${row.phase} | ${row.samples} | ${row.medianMs.toFixed(3)} | ${row.perTurnMs.toFixed(3)} | ${row.pct.toFixed(2)} |`);
  }
  console.log(`| **total (非 LLM 程序开销/turn)** | | | **${totalPerTurnMs.toFixed(3)}** | 100.00 |`);
  console.log("");
}

if (!skipMicro) {
  console.log("=== 微基准：真实 saveTurn 路径（writeDialog + 临时 LevelDB）===");
  try {
    const micro = await runSaveTurnMicroBench();
    console.log(`| 场景 | samples | medianMs |`);
    console.log(`|---|---:|---:|`);
    console.log(`| 新 dialog（首次写入） | ${micro.fresh.samples} | ${micro.fresh.medianMs.toFixed(3)} |`);
    console.log(`| 续聊（同一 dialog 累积写入） | ${micro.continued.samples} | ${micro.continued.medianMs.toFixed(3)} |`);
  } catch (error) {
    console.log(`微基准失败，放弃并说明：${(error as Error).message}`);
  }
}
