/** 聚焦 microbench：隔离 markdown 重渲染成本，确认慢帧主因（只测量，不改生产代码）。 */
import { layoutTurnRows } from "../tuiHistory";
import { makeTurnContent } from "./scrollBenchShared";

process.env.NOLO_CLI_COLOR = "1";
const CW = 119; // columns-1

// 预热 + 计时：对一批代表性 turn 做完整 layout（=markdown 渲染 + wrap）
const samples: number[] = [];
for (let round = 0; round < 20; round++) {
  for (let i = 0; i < 400; i++) {
    const role = (["user", "assistant", "local"] as const)[i % 3]!;
    const content = makeTurnContent(i);
    const t0 = performance.now();
    layoutTurnRows(role, content, CW, true);
    samples.push(performance.now() - t0);
  }
}
const sorted = [...samples].sort((a, b) => a - b);
const sum = samples.reduce((s, v) => s + v, 0);
const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor((q / 100) * sorted.length))]!;
console.log(`layoutTurnRows (markdown+wrap) per-turn: p50=${p(50).toFixed(4)}ms p95=${p(95).toFixed(4)}ms max=${p(100).toFixed(4)}ms avg=${(sum / samples.length).toFixed(4)}ms n=${samples.length}`);
