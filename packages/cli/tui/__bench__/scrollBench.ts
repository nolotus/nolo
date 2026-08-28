/**
 * TUI 滚动渲染性能 baseline bench（只测量，不改生产代码）。
 *
 * 用法：bun packages/cli/tui/__bench__/scrollBench.ts
 *
 * 手法说明：
 *  - 用假 WritableStream（isTTY:true, rows:45, columns:120）驱动真实的 renderHistory。
 *  - 直接向 history.turns 填充 turn 对象（绕过 MAX_TUI_HISTORY_TURNS=500 截断，
 *    以便测出 2000 条全量扫描的上界；真实运行时会被截断到 500，见文档结论）。
 *  - 每档各自 new 独立 turn 对象，因此模块级 WeakMap 缓存天然不跨档污染，
 *    miss 计数在每档开始前 reset。
 *  - buildTurnOffsets 自身耗时：在 renderHistory 调用前，对同一 history 状态
 *    额外调用一次并计时（代理该帧内 buildTurnOffsets 的近似成本；因缓存状态一致，
 *    与 renderHistory 内部的调用成本接近，占比估算有效——未修改 tuiHistory.ts）。
 */
import {
  buildTurnOffsets,
  createTurnHistory,
  getRenderCacheMissCount,
  renderHistory,
  resetRenderCacheMissCount,
  applyScrollAction,
  type TurnHistory,
} from "../tuiHistory";
import { makeTurnContent } from "./scrollBenchShared";

const ROWS = 45;
const COLUMNS = 120;
const INPUT_LINES = 1;
const WHEEL_UP_N = 200;
const WHEEL_DOWN_N = 200;
// 颜色贴近真实 TTY（避免 NOLO_CLI_COLOR=0 关掉 ANSI）
process.env.NOLO_CLI_COLOR = "1";

const ROLES = ["user", "assistant", "local"] as const;

function buildHistory(turnCount: number): TurnHistory {
  const h = createTurnHistory();
  for (let i = 0; i < turnCount; i++) {
    const role = ROLES[i % 3]!;
    h.turns.push({ role, content: makeTurnContent(i) });
  }
  // 从 bottom 开始（贴底 live-tail）
  h.followBottom = true;
  h.scrollTop = 0;
  return h;
}

function makeOutput(onWriteBytes: (b: number) => void): NodeJS.WritableStream {
  return {
    isTTY: true,
    rows: ROWS,
    columns: COLUMNS,
    write(chunk: string | Buffer): boolean {
      const b = typeof chunk === "string" ? chunk.length : chunk.byteLength;
      onWriteBytes(b);
      return true;
    },
  } as unknown as NodeJS.WritableStream;
}

type FrameRec = { ms: number; bytes: number; miss: number };

type Stats = { p50: number; p95: number; max: number; total: number; n: number };

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

function summarize(samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  const total = samples.reduce((s, v) => s + v, 0);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
    total,
    n: samples.length,
  };
}

function runTurnCount(turnCount: number): void {
  const history = buildHistory(turnCount);
  const output = makeOutput((b) => { bytesThisFrame += b; });
  const contentWidth = Math.max(1, COLUMNS - 1);
  resetRenderCacheMissCount();

  const renderSamples: number[] = [];
  const buildSamples: number[] = [];
  const frames: FrameRec[] = [];
  let bytesThisFrame = 0;

  // 每次 wheel 事件 = 先改 scrollTop，再渲染一帧（与 readlineWorkspace 路径一致）
  const scrollAndRender = (dir: "up" | "down") => {
    // 真实路径：parseScrollAction → applyScrollAction（改 scrollTop）
    applyScrollAction(history, dir === "up" ? "wheel-up" : "wheel-down", output, INPUT_LINES);

    // buildTurnOffsets 独立计时（代理该帧内部调用）
    let t0 = performance.now();
    buildTurnOffsets(history, contentWidth);
    buildSamples.push(performance.now() - t0);

    // 渲染整帧
    const missBefore = getRenderCacheMissCount();
    bytesThisFrame = 0;
    t0 = performance.now();
    renderHistory(output, history, INPUT_LINES);
    const ms = performance.now() - t0;
    renderSamples.push(ms);
    frames.push({ ms, bytes: bytesThisFrame, miss: getRenderCacheMissCount() - missBefore });
  };

  // 200 次 wheel-up（从 bottom 向上滚），再 200 次 wheel-down
  for (let i = 0; i < WHEEL_UP_N; i++) scrollAndRender("up");
  for (let i = 0; i < WHEEL_DOWN_N; i++) scrollAndRender("down");

  const rs = summarize(renderSamples);
  const bs = summarize(buildSamples);
  const misses = getRenderCacheMissCount();

  // 拆出“含 miss 的帧”与“纯重绘帧”耗时分布
  const missFrames = frames.filter((f) => f.miss > 0).map((f) => f.ms);
  const repaintFrames = frames.filter((f) => f.miss === 0).map((f) => f.ms);
  const missS = missFrames.length ? summarize(missFrames) : null;
  const repS = repaintFrames.length ? summarize(repaintFrames) : null;
  const totalBytes = frames.reduce((s, f) => s + f.bytes, 0);
  const maxBytes = frames.reduce((m, f) => Math.max(m, f.bytes), 0);
  const avgBytes = frames.length ? totalBytes / frames.length : 0;

  console.log(`\n===== turnCount = ${turnCount} (${WHEEL_UP_N} wheel-up + ${WHEEL_DOWN_N} wheel-down) =====`);
  console.log(`renderHistory:   p50=${rs.p50.toFixed(3)}ms  p95=${rs.p95.toFixed(3)}ms  max=${rs.max.toFixed(3)}ms  total=${rs.total.toFixed(2)}ms  frames=${rs.n}`);
  console.log(`buildTurnOffsets: p50=${bs.p50.toFixed(3)}ms  p95=${bs.p95.toFixed(3)}ms  max=${bs.max.toFixed(3)}ms  total=${bs.total.toFixed(2)}ms`);
  const buildShare = rs.total > 0 ? ((bs.total / rs.total) * 100).toFixed(1) : "0";
  console.log(`buildTurnOffsets 耗时占比 (proxy): ${buildShare}%`);
  console.log(`renderCacheMissCount（累计）: ${misses}`);
  console.log(`  miss 帧数: ${missFrames.length} / 400， 纯重绘帧数: ${repaintFrames.length}`);
  if (missS) console.log(`  miss 帧耗时:   p50=${missS.p50.toFixed(3)}ms  p95=${missS.p95.toFixed(3)}ms  max=${missS.max.toFixed(3)}ms`);
  if (repS) console.log(`  纯重绘帧耗时: p50=${repS.p50.toFixed(3)}ms  p95=${repS.p95.toFixed(3)}ms  max=${repS.max.toFixed(3)}ms`);
  console.log(`write 字节/帧: avg=${avgBytes.toFixed(0)}B  max=${maxBytes}B  total=${totalBytes}B`);
  // 慢帧分布诊断：输出每帧耗时 > 8ms 的序号，观察是否呈周期（GC/定时器）
  const slowIdx = frames.map((f, i) => (f.ms > 8 ? i : -1)).filter((i) => i >= 0);
  if (slowIdx.length > 0) {
    console.log(`  慢帧(>8ms) 序号: ${slowIdx.slice(0, 40).join(",")}${slowIdx.length > 40 ? "..." : ""} (共 ${slowIdx.length})`);
  }

  // 对照组：同一可视窗口反复重绘（scrollTop 不变、缓存全命中），剥离缓存 miss 与扫描，
  // 量化"每帧固有构造成本（45 行 pad+ANSI+scrollbar+diff 拼接）"。
  const staticSamples: number[] = [];
  for (let k = 0; k < 200; k++) {
    const t0 = performance.now();
    renderHistory(output, history, INPUT_LINES);
    staticSamples.push(performance.now() - t0);
  }
  const st = summarize(staticSamples);
  console.log(`  对照·静帧重绘(缓存全命中): p50=${st.p50.toFixed(3)}ms p95=${st.p95.toFixed(3)}ms max=${st.max.toFixed(3)}ms`);
}

console.log(`TUI scroll render baseline — rows=${ROWS} cols=${COLUMNS} inputLines=${INPUT_LINES}  wheel=${WHEEL_UP_N}up/${WHEEL_DOWN_N}down`);
for (const n of [100, 500, 2000]) {
  runTurnCount(n);
}
console.log("\nDONE");
