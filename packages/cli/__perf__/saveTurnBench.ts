/**
 * saveTurn 真实持久化路径微基准（只测量，不改生产代码）。
 *
 * 路径：writeDialog(localRuntimeDialog.ts) → buildAgentRuntimeDialogWritePlan
 *   → store.batch(ops) → createCliHybridRecordStore → LevelDB
 *   （createLevelAuthorityStore，与 authority broker 进程内部同一 Level 写路径）。
 *
 * 降级说明（plan 文档已注明）：默认生产路径 db 经 authority broker（TCP 代理
 * 进程 → broker 内 createLevelAuthorityStore）。bench 直接用同一
 * createLevelAuthorityStore 开临时 LevelDB 目录，跳过 broker 进程间往返
 * （省去 socket hop），测得的是「纯 LevelDB 写 + writeDialog 编排」成本，
 * 即 broker 内 InDbWrite 的下界；broker 往返开销另计（tcp hop 通常 <1ms 量级）。
 * userId="local" 时 remote sync / title 生成不参与阻塞路径（与真实 TUI 本地用户一致，
 * title patch / remote sync 均为 fire-and-forget）。
 *
 * 运行：bun packages/cli/__perf__/saveTurnBench.ts
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLevelAuthorityStore } from "../../database-engine/levelAuthorityStore";
import { createLegacyServerDb } from "../../database-engine/legacyServerDb";
import { createCliHybridRecordStore } from "../client/hybridRecordStore";
import { writeDialog } from "../client/localRuntimeDialog";
import type { AgentRuntimeSaveTurnInput } from "../../agent-runtime/hostAdapter";

// ── payload 构造：模拟真实 tool-loop turn 的消息形状 ──────────────────────
// assistant(tool_calls) → tool(tool_call_id, content, toolName) 交替，
// 与 localLoop.ts blocksToOpenAiMessages / 工具执行分支 push 的形状一致。

function makeToolResultContent(index: number, lines: number): string {
  const parts: string[] = [];
  for (let i = 0; i < lines; i++) {
    parts.push(
      `L${String(i + 1).padStart(4, "0")}: const benchSample_${index}_${i} = { value: ${i * 37}, label: "sample-row-${index}-${i}" };`
    );
  }
  return parts.join("\n");
}

function makeTurnMessages(toolPairs: number): AgentRuntimeSaveTurnInput["messages"] {
  const messages: AgentRuntimeSaveTurnInput["messages"] = [
    { role: "user", content: "bench: run the sampling loop" },
  ];
  for (let i = 0; i < toolPairs; i++) {
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: `call_bench_${i}`,
          type: "function",
          function: {
            name: "readFile",
            arguments: JSON.stringify({ path: `src/sample_${i}.ts` }),
          },
        },
      ],
    });
    messages.push({
      role: "tool",
      content: makeToolResultContent(i, 40), // ~3KB/tool result
      tool_call_id: `call_bench_${i}`,
      toolName: "readFile",
    });
  }
  messages.push({
    role: "assistant",
    content: "Bench turn complete.",
  });
  return messages as AgentRuntimeSaveTurnInput["messages"];
}

function buildSaveTurnInput(
  messages: AgentRuntimeSaveTurnInput["messages"],
  continueDialogId: string | undefined,
  agentKey: string,
  seq: number
): AgentRuntimeSaveTurnInput {
  return {
    agentKey,
    messages,
    result: {
      content: "Bench turn final answer.",
      model: "bench-model",
      toolCallCount: Math.floor((messages.length - 2) / 2),
      finish_reason: "stop",
    },
    usageRecords: [
      {
        callId: `callid_bench_${seq}`,
        usage: { prompt_tokens: 1200 + seq, completion_tokens: 340, total_tokens: 1540 + seq },
        model: "bench-model",
      },
    ],
    ...(continueDialogId ? { continueDialogId } : {}),
  };
}

// ── 计时工具 ─────────────────────────────────────────────────────────────
function stats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((s, v) => s + v, 0);
  const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor((q / 100) * sorted.length))]!;
  return { p50: p(50), min: sorted[0]!, max: sorted[sorted.length - 1]!, avg: sum / samples.length, n: samples.length };
}
const fmt = (v: number) => v.toFixed(2);

let idSeq = 0;
const createId = () => `benchid_${String(++idSeq).padStart(6, "0")}`;
let nowMs = Date.now();
const now = () => (nowMs += 1000); // 单调递增，避免 dialogMessageKey 时间戳前缀碰撞

async function timeSaveTurn(args: {
  store: ReturnType<typeof createCliHybridRecordStore>;
  messages: AgentRuntimeSaveTurnInput["messages"];
  continueDialogId: string | undefined;
  agentKey: string;
  seq: number;
}): Promise<number> {
  const input = buildSaveTurnInput(args.messages, args.continueDialogId, args.agentKey, args.seq);
  const t0 = performance.now();
  await writeDialog({
    store: args.store,
    input,
    userId: "local",
    now,
    createId,
    env: { NOLO_CLI_PERF: "1" }, // 启用 writeDialog 内置分相打桩（stderr）
  });
  return performance.now() - t0;
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nolo-save-turn-bench-"));
  let fetchCount = 0;
  // NOLO_BENCH_STUB=1 → 503 快速失败 stub（测本地命中路径，隔离网络）；
  // 默认（不设）→ 真实 fetch（测远端 miss fallback 的实际网络成本）。
  const useStub = process.env.NOLO_BENCH_STUB === "1";
  const stubFetch = (async (...a: any[]) => {
    fetchCount += 1;
    process.stderr.write(`[bench-probe] remote fetch #${fetchCount} at ${performance.now().toFixed(0)}ms ${String(a[0]).slice(0, 100)}\n`);
    return new Response(null, { status: 503 });
  }) as unknown as typeof fetch;
  const store = createCliHybridRecordStore({
    // 与生产 getDefaultCliLocalRuntimeDb 一致：Level → legacyServerDb 适配层
    db: createLegacyServerDb(createLevelAuthorityStore(tmpDir)),
    env: { NOLO_CLI_PERF: "1" }, // 启用 writeDialog 内置分相打桩（stderr）
    fetchImpl: useStub ? stubFetch : undefined,
  });

  const SMALL = makeTurnMessages(4); // ~10 条消息
  const LARGE = makeTurnMessages(99); // ~200 条消息
  const smallBytes = JSON.stringify(SMALL).length;
  const largeBytes = JSON.stringify(LARGE).length;

  // 预热：文件系统缓存 + Level compaction 状态稳定
  await timeSaveTurn({ store, messages: SMALL, continueDialogId: undefined, agentKey: "bench-agent", seq: -2 });
  await timeSaveTurn({ store, messages: LARGE, continueDialogId: undefined, agentKey: "bench-agent", seq: -1 });

  const N = 9; // 采样次数（≥7）

  // ── 场景 1：单次 saveTurn（新对话，无 continueDialogId） ──────────────
  const newSmall: number[] = [];
  for (let i = 0; i < N; i++) {
    newSmall.push(await timeSaveTurn({ store, messages: SMALL, continueDialogId: undefined, agentKey: "bench-agent", seq: i }));
  }
  const newLarge: number[] = [];
  for (let i = 0; i < N; i++) {
    newLarge.push(await timeSaveTurn({ store, messages: LARGE, continueDialogId: undefined, agentKey: "bench-agent", seq: 100 + i }));
  }

  // ── 场景 2：单次 saveTurn（续聊，读已有 dialog 记录 + batch） ─────────
  const contSeedSmall = await timeSaveTurn({ store, messages: SMALL, continueDialogId: undefined, agentKey: "bench-agent", seq: 200 });
  const contSmallDialog = `local-benchcont-small`;
  await timeSaveTurn({ store, messages: SMALL, continueDialogId: contSmallDialog, agentKey: "bench-agent", seq: 201 });
  const contSmall: number[] = [];
  for (let i = 0; i < N; i++) {
    contSmall.push(await timeSaveTurn({ store, messages: SMALL, continueDialogId: contSmallDialog, agentKey: "bench-agent", seq: 202 + i }));
  }
  const contLargeDialog = "local-benchcont-large";
  await timeSaveTurn({ store, messages: LARGE, continueDialogId: contLargeDialog, agentKey: "bench-agent", seq: 300 });
  const contLarge: number[] = [];
  for (let i = 0; i < N; i++) {
    contLarge.push(await timeSaveTurn({ store, messages: LARGE, continueDialogId: contLargeDialog, agentKey: "bench-agent", seq: 301 + i }));
  }

  // ── 场景 3：连续 30 次 saveTurn（模拟 30 轮 turn 逐轮写累积） ─────────
  const seqSmallDialog = "local-benchseq-small";
  await timeSaveTurn({ store, messages: SMALL, continueDialogId: undefined, agentKey: "bench-agent", seq: 400 });
  const seqSmall: number[] = [];
  const seqSmallT0 = performance.now();
  for (let i = 0; i < 30; i++) {
    seqSmall.push(await timeSaveTurn({ store, messages: SMALL, continueDialogId: seqSmallDialog, agentKey: "bench-agent", seq: 401 + i }));
  }
  const seqSmallTotal = performance.now() - seqSmallT0;

  const seqLargeDialog = "local-benchseq-large";
  await timeSaveTurn({ store, messages: LARGE, continueDialogId: undefined, agentKey: "bench-agent", seq: 500 });
  const seqLarge: number[] = [];
  const seqLargeT0 = performance.now();
  for (let i = 0; i < 30; i++) {
    seqLarge.push(await timeSaveTurn({ store, messages: LARGE, continueDialogId: seqLargeDialog, agentKey: "bench-agent", seq: 501 + i }));
  }
  const seqLargeTotal = performance.now() - seqLargeT0;

  const report = (label: string, samples: number[]) => {
    const s = stats(samples);
    console.log(`${label}: p50=${fmt(s.p50)}ms min=${fmt(s.min)}ms max=${fmt(s.max)}ms avg=${fmt(s.avg)}ms n=${s.n}`);
  };

  console.log(`# payload: small=${SMALL.length} msgs (~${(JSON.stringify(SMALL).length / 1024).toFixed(1)}KiB), large=${LARGE.length} msgs (~${(JSON.stringify(LARGE).length / 1024).toFixed(1)}KiB)`);
  console.log(`# db: temp LevelDB ${tmpDir}`);
  console.log(`# seed(continue small) first-write=${fmt(contSeedSmall)}ms`);
  console.log("");
  console.log("## 单次 saveTurn — 新对话 (fresh dialogId)");
  report("small(~10 msgs)", newSmall);
  report("large(~200 msgs)", newLarge);
  console.log("");
  console.log("## 单次 saveTurn — 续聊 (continueDialogId, read+batch)");
  report("small(~10 msgs)", contSmall);
  report("large(~200 msgs)", contLarge);
  console.log("");
  console.log("## 连续 30 次 saveTurn");
  report("small per-write", seqSmall);
  console.log(`  small 30x total: ${fmt(seqSmallTotal)}ms`);
  report("large per-write", seqLarge);
  console.log(`  large 30x total: ${fmt(seqLargeTotal)}ms`);
  console.log(`\n# remote-fallback fetch count (hybrid read local-miss → cluster servers): ${fetchCount}`);

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
