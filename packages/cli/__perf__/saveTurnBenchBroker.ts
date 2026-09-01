/**
 * saveTurn 真实持久化路径微基准 — broker 模式（生产默认路径）。
 *
 * 与 saveTurnBench.ts 的差异：db 用 getDefaultCliLocalRuntimeDb({ env: { NOLO_HOME: tmp } })
 * —— 即生产默认 getDefaultCliLocalRuntimeDb 完整链路：authority broker（TCP 客户端
 * → broker 子进程 → broker 内 createLevelAuthorityStore）→ legacyServerDb。
 * 测得的是「生产实际执行路径」的 saveTurn 成本，含每 op 的 socket 往返。
 *
 * 运行：NOLO_BENCH_HOME=<tmp> bun packages/cli/__perf__/saveTurnBenchBroker.ts
 * （不设 NOLO_BENCH_HOME 时自建临时目录并在结束后清理 broker 进程目录）
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDefaultCliLocalRuntimeDb } from "../localRuntimeDb";
import { createCliHybridRecordStore } from "../client/hybridRecordStore";
import { writeDialog } from "../client/localRuntimeDialog";
import type { AgentRuntimeSaveTurnInput } from "../../agent-runtime/hostAdapter";

function makeToolResultContent(index: number, lines: number): string {
  const parts: string[] = [];
  for (let i = 0; i < lines; i++) {
    parts.push(
      `L${String(i + 1).padStart(4, "0")}: const benchSample_${index}_${i} = { value: ${i * 37}, label: "sample_${i}" };`
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
      tool_calls: [{ id: `call_${i}`, type: "function", function: { name: "readFile", arguments: `{"path":"src/s_${i}.ts"}` } }],
    });
    messages.push({ role: "tool", content: makeToolResultContent(i, 40), tool_call_id: `call_${i}`, toolName: "readFile" });
  }
  messages.push({ role: "assistant", content: "done." });
  return messages as AgentRuntimeSaveTurnInput["messages"];
}

function buildInput(messages: any, continueDialogId: string | undefined, seq: number): AgentRuntimeSaveTurnInput {
  return {
    agentKey: "bench-agent",
    messages,
    result: { content: "ok", model: "bench-model", toolCallCount: Math.floor((messages.length - 2) / 2), finish_reason: "stop" },
    usageRecords: [{ callId: `cid_${seq}`, usage: { prompt_tokens: 1000, completion_tokens: 300 }, model: "bench-model" }],
    ...(continueDialogId ? { continueDialogId } : {}),
  };
}

function stats(nums: number[]) {
  const sorted = [...nums].sort((a, b) => a - b);
  const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor((q / 100) * sorted.length))]!;
  const avg = nums.reduce((s, v) => s + v, 0) / nums.length;
  return { p50: p(50), min: sorted[0]!, max: sorted[sorted.length - 1]!, avg, n: nums.length };
}
const report = (label: string, samples: number[]) => {
  const s = stats(samples);
  console.log(`${label}: p50=${s.p50.toFixed(2)}ms min=${s.min.toFixed(2)}ms max=${s.max.toFixed(2)}ms avg=${s.avg.toFixed(2)}ms n=${s.n}`);
};

let idSeq = 0;
const createId = () => `bid_${String(++idSeq).padStart(6, "0")}`;
let nowMs = Date.now();
const now = () => (nowMs += 1000);

async function timeSaveTurn(args: { store: any; messages: any; continueDialogId?: string; seq: number }): Promise<number> {
  const store = args.store;
  const t0 = performance.now();
  await writeDialog({ store, input: buildInput(args.messages, args.continueDialogId, args.seq), userId: "local", now, createId, env: { NOLO_CLI_PERF: "1" } });
  return performance.now() - t0;
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nolo-save-turn-broker-"));
  const env = { NOLO_HOME: tmpDir, NOLO_CLI_PERF: "1" };
  const db = await getDefaultCliLocalRuntimeDb({ env });
  // NOLO_BENCH_STUB=1 → 503 快速失败 stub（本地命中路径）；默认真实 fetch（miss 变体）。
  const useStub = process.env.NOLO_BENCH_STUB === "1";
  const store = createCliHybridRecordStore({
    db,
    env: {},
    fetchImpl: useStub
      ? (async () => new Response(null, { status: 503 })) as unknown as typeof fetch
      : undefined,
  });
  (timeSaveTurn as any).storeRef = store;

  const SMALL = makeTurnMessages(4);
  const LARGE = makeTurnMessages(99);

  const run = async (messages: any, continueDialogId: string | undefined, n: number, label: string) => {
    const samples: number[] = [];
    for (let i = 0; i < n; i++) {
      samples.push(await timeSaveTurn({ store, messages, continueDialogId, seq: 1000 + i }));
    }
    report(label, samples);
    return samples;
  };

  // 预热
  await timeSaveTurn({ store, messages: SMALL, seq: -2 });
  await timeSaveTurn({ store, messages: LARGE, seq: -1 });

  console.log(`# broker-mode saveTurn (production db path: TCP authority broker → Level)`);
  console.log(`# NOLO_HOME=${tmpDir}`);
  await run(SMALL, undefined, 9, "small new-dialog  ");
  await run(SMALL, "local-broker-cont-s", 9, "small continue    ");
  await run(LARGE, undefined, 9, "large new-dialog  ");
  await run(LARGE, "local-broker-cont-l", 9, "large continue    ");

  // 连续 30 次
  const seqSmall: number[] = [];
  const t0 = performance.now();
  for (let i = 0; i < 30; i++) seqSmall.push(await timeSaveTurn({ store, messages: SMALL, continueDialogId: "local-broker-seq-s", seq: 2000 + i }));
  console.log(`small 30x total: ${(performance.now() - t0).toFixed(2)}ms`);
  report("small 30x per-write", seqSmall);
  const seqLarge: number[] = [];
  const t1 = performance.now();
  for (let i = 0; i < 30; i++) seqLarge.push(await timeSaveTurn({ store, messages: LARGE, continueDialogId: "local-broker-seq-l", seq: 3000 + i }));
  console.log(`large 30x total: ${(performance.now() - t1).toFixed(2)}ms`);
  report("large 30x per-write", seqLarge);

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
