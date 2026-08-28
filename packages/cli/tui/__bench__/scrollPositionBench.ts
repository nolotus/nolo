/**
 * TUI 滚动渲染性能 bench——聚焦三个滚动位置（scrollTop=顶部/中部/贴底）。
 *
 * 用法：bun packages/cli/tui/__bench__/scrollPositionBench.ts
 *
 * 动机：
 *  原始 scrollBench 用 200 次 wheel-up 从 bottom 滚到 top，恰好把窗口停在“最快”的顶部位置，
 *  系统性低估了真实滚动开销（顶部行大多为空/短行，displayWidth 的慢路径命中最少）。
 *  本 bench 在同一机器同一脚本下，对 scrollTop = 0 / 中部 / 贴底 三个位置分别测量：
 *    - 静帧重绘（固定位置反复渲染，缓存全命中，剥离 miss 与扫描）p50/p95
 *    - 滚动帧（从该位置 wheel-up 滚动一次并渲染）p50/p95
 * 并统计单帧实际写入字节数，确认渲染真实发生（避免 diff 短路造成假快）。
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
process.env.NOLO_CLI_COLOR = "1";

const ROLES = ["user", "assistant", "local"] as const;

function buildHistory(turnCount: number): TurnHistory {
  const h = createTurnHistory();
  for (let i = 0; i < turnCount; i++) {
    const role = ROLES[i % 3]!;
    h.turns.push({ role, content: makeTurnContent(i) });
  }
  h.followBottom = false;
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

let bytesSinceReset = 0;
function makeCountedOutput(): NodeJS.WritableStream {
  return {
    isTTY: true,
    rows: ROWS,
    columns: COLUMNS,
    write(chunk: string | Buffer): boolean {
      bytesSinceReset += typeof chunk === "string" ? chunk.length : chunk.byteLength;
      return true;
    },
  } as unknown as NodeJS.WritableStream;
}

type Stats = { p50: number; p95: number; max: number; n: number };
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}
function summarize(samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  return { p50: percentile(sorted, 50), p95: percentile(sorted, 95), max: sorted[sorted.length - 1] ?? 0, n: samples.length };
}

const STATIC_FRAMES = 300;
const SCROLL_FRAMES = 120;

function measurePosition(
  history: TurnHistory,
  output: NodeJS.WritableStream,
  inputLines: number,
  contentWidth: number,
  positionLabel: string,
): void {
  const visibleHeight = Math.max(1, ROWS - inputLines);
  const { totalLines } = buildTurnOffsets(history, contentWidth);
  const maxScrollTop = Math.max(0, totalLines - visibleHeight);
  const mid = Math.floor(maxScrollTop / 2);

  const pos = positionLabel === "top" ? 0 : positionLabel === "middle" ? mid : maxScrollTop;
  history.scrollTop = pos;
  history.followBottom = pos >= maxScrollTop;

  // 先暖一次，确保 turnLineCountCache 已填充（避免把首次计数算进静态帧）
  renderHistory(output, history, inputLines);
  resetRenderCacheMissCount();

  // 用带字节计数的输出刷新一帧，统计单帧实际写入字节（确认渲染真实发生）
  bytesSinceReset = 0;
  renderHistory(makeCountedOutput(), history, inputLines);
  const frameBytes = bytesSinceReset;

  // 静帧重绘：固定位置反复渲染，缓存全命中
  const staticSamples: number[] = [];
  for (let k = 0; k < STATIC_FRAMES; k++) {
    const t0 = performance.now();
    renderHistory(output, history, inputLines);
    staticSamples.push(performance.now() - t0);
  }
  const st = summarize(staticSamples);

  // 滚动帧：从该位置 wheel-up 滚动一次并渲染（贴近真实滚动路径）
  const scrollSamples: number[] = [];
  for (let k = 0; k < SCROLL_FRAMES; k++) {
    history.scrollTop = pos;
    history.followBottom = pos >= maxScrollTop;
    applyScrollAction(history, "wheel-up", output, inputLines);
    const t0 = performance.now();
    renderHistory(output, history, inputLines);
    scrollSamples.push(performance.now() - t0);
  }
  const sc = summarize(scrollSamples);

  console.log(
    `  [${positionLabel.padEnd(6)}] scrollTop=${pos} (maxScroll=${maxScrollTop})  ` +
      `静帧重绘: p50=${st.p50.toFixed(3)}ms p95=${st.p95.toFixed(3)}ms max=${st.max.toFixed(3)}ms  |  ` +
      `滚动帧: p50=${sc.p50.toFixed(3)}ms p95=${sc.p95.toFixed(3)}ms max=${sc.max.toFixed(3)}ms  ` +
      `| 单帧字节=${frameBytes}`,
  );
}

function runTurnCount(turnCount: number): void {
  const history = buildHistory(turnCount);
  const output = makeOutput(() => {});
  const contentWidth = Math.max(1, COLUMNS - 1);
  resetRenderCacheMissCount();
  console.log(`\n===== turnCount = ${turnCount} =====`);
  for (const label of ["top", "middle", "bottom"] as const) {
    measurePosition(history, output, INPUT_LINES, contentWidth, label);
  }
}

console.log(`TUI scroll position bench — rows=${ROWS} cols=${COLUMNS} inputLines=${INPUT_LINES}  static=${STATIC_FRAMES} scroll=${SCROLL_FRAMES}`);
for (const n of [500, 2000]) {
  runTurnCount(n);
}
console.log("\nDONE");
