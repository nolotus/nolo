/**
 * 本地工具执行开销 bench（agent loop 里被 ×300 放大的那一段）。
 *
 * localLoopBench 用 mock executor 测「loop 程序开销 ~3ms/turn」，把真实工具执行
 * 排除在外。本 bench 补上这一段：对真实 executor（createLocalWorkspaceToolExecutors）
 * 逐工具计时，并把「策略层 + 派发」与「工具自身工作」拆开——策略层用 noop executor
 * 单独测，差值即工具本体。
 *
 * 口径：
 *   - workspaceRoot = 本仓库（真实大目录，globFiles/execShell 的真实规模）。
 *   - 每工具 warmup 3 次后取 N 样本，报 median / p90。
 *   - 结果按「300 次调用」外推，回答「×300 放大后是多少」。
 *
 * 运行：bun run packages/agent-runtime/__bench__/localToolExecBench.ts [--samples 15]
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createLocalWorkspaceToolExecutors } from "../localWorkspaceTools";
import { executeLocalToolWithPolicy } from "../localToolPolicy";
import type { AgentRuntimeToolCallInput } from "../hostAdapter";

const SAMPLES = (() => {
  const i = Bun.argv.indexOf("--samples");
  return i > 0 ? Math.max(1, Number(Bun.argv[i + 1]) || 15) : 15;
})();

const workspaceRoot = resolve(import.meta.dir, "../..", "..");
const scratch = mkdtempSync(join(tmpdir(), "nolo-tool-bench-"));
const scratchFile = join(scratch, "target.txt");
writeFileSync(scratchFile, Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n"));
mkdirSync(join(workspaceRoot, ".bench-scratch"), { recursive: true });

const env: Record<string, string | undefined> = { ...process.env };
const executors: Record<
  string,
  (call: AgentRuntimeToolCallInput, opts?: any) => Promise<any>
> = createLocalWorkspaceToolExecutors({ workspaceRoot });
// 策略层基线：同一条 executeLocalToolWithPolicy 路径，executor 立即返回。
const noopExecutors: typeof executors = Object.fromEntries(
  Object.keys(executors).map((name) => [name, async () => ({ content: "" })]),
);

const agentToolNames = Object.keys(executors);

type Case = {
  label: string;
  name: string;
  args: unknown;
  /** 每次调用前的准备（如重置被 edit 的文件） */
  before?: () => void;
};

const CASES: Case[] = [
  {
    label: "readFile 小文件 (200 行)",
    name: "readFile",
    args: { path: scratchFile },
  },
  {
    label: "readFile 大文件 (localWorkspaceTools.ts)",
    name: "readFile",
    // 同一 path 重复读会命中 readLedger 去重通知；每次换 offset 规避。
    args: { path: "packages/agent-runtime/localWorkspaceTools.ts", limit: 200 },
  },
  {
    label: "globFiles (**/*.ts 限 50)",
    name: "globFiles",
    args: { pattern: "packages/agent-runtime/*.ts", limit: 50 },
  },
  {
    label: "execShell echo (最小 spawn)",
    name: "execShell",
    args: { command: "echo bench" },
  },
  {
    label: "execShell git status --short",
    name: "execShell",
    args: { command: "git status --short" },
  },
  {
    label: "writeFile (workspace 外 /tmp)",
    name: "writeFile",
    args: { path: join(scratch, "out.txt"), content: "hello bench\n" },
  },
  {
    label: "writeFile (仓库内 — 真实场景)",
    name: "writeFile",
    args: { path: ".bench-scratch/out.txt", content: "hello bench\n" },
  },
  {
    label: "editFile (仓库内单处替换)",
    name: "editFile",
    args: {
      path: ".bench-scratch/edit.txt",
      oldString: "MARKER_UNIQUE_LINE",
      newString: "MARKER_UNIQUE_LINE_EDITED",
    },
    before: () =>
      writeFileSync(
        join(workspaceRoot, ".bench-scratch/edit.txt"),
        ["alpha", "MARKER_UNIQUE_LINE", "omega"].join("\n"),
      ),
  },
];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))];
};
const r2 = (n: number) => Math.round(n * 100) / 100;

async function runCase(c: Case, useNoop: boolean, readOffsetSeed: number) {
  const call: AgentRuntimeToolCallInput = {
    id: `bench-${readOffsetSeed}`,
    name: c.name,
    arguments: JSON.stringify(
      c.label.startsWith("readFile 大文件")
        ? { ...(c.args as object), offset: 1 + (readOffsetSeed % 50) }
        : c.args,
    ),
  };
  c.before?.();
  const t0 = performance.now();
  await executeLocalToolWithPolicy({
    env,
    agentToolNames,
    call,
    executors: useNoop ? noopExecutors : executors,
  });
  return performance.now() - t0;
}

const rows: any[] = [];
for (const c of CASES) {
  let failed: string | undefined;
  const real: number[] = [];
  const noop: number[] = [];
  try {
    for (let i = 0; i < 3; i++) await runCase(c, false, i);
    for (let i = 0; i < SAMPLES; i++) real.push(await runCase(c, false, 100 + i));
    for (let i = 0; i < SAMPLES; i++) noop.push(await runCase(c, true, 200 + i));
  } catch (err) {
    failed = err instanceof Error ? err.message : String(err);
  }
  if (failed) {
    console.log(`[bench] ${c.label.padEnd(38)} FAILED: ${failed.slice(0, 120)}`);
    rows.push({ label: c.label, error: failed });
    continue;
  }
  const row = {
    label: c.label,
    realMed: r2(median(real)),
    realP90: r2(pct(real, 0.9)),
    policyMed: r2(median(noop)),
    per300s: r2((median(real) * 300) / 1000),
  };
  rows.push(row);
  console.log(
    `[bench] ${c.label.padEnd(38)} med ${String(row.realMed).padStart(8)}ms ` +
      `p90 ${String(row.realP90).padStart(8)}ms | 策略层 ${String(row.policyMed).padStart(5)}ms ` +
      `| ×300 = ${row.per300s}s`,
  );
}

console.log(`\nBENCH_JSON ${JSON.stringify({ samples: SAMPLES, rows })}`);
rmSync(scratch, { recursive: true, force: true });
rmSync(join(workspaceRoot, ".bench-scratch"), { recursive: true, force: true });
