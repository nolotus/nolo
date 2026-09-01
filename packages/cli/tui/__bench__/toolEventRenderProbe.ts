/**
 * TUI 渲染开销探针（只测量，不改生产代码）。
 *
 * 脱离真终端：renderHistory 只读 output.isTTY/rows/columns 并 write 字节串，
 * 用内存 sink 完全可注入。模拟真实 tool 事件流：
 *   - 事件源按 30 events/s 注入 tool block（同 agentRunOutput.formatToolEvent 的
 *     writeToolBlock chunk 形状），渲染走真实 renderHistory（tuiRender 的
 *     scheduleRender 节流为 33ms/帧，本探针直接按帧驱动等价路径并计时）。
 * 测量：每帧渲染耗时、字节量、随 current-turn 增长的变化。
 * 运行：bun packages/cli/tui/__bench__/toolEventRenderProbe.ts
 */
import {
  createTurnHistory,
  startTurn,
  finalizeCurrentTurn,
  applyOutputChunkToCurrentTurn,
  renderHistory,
  type TurnHistory,
} from "../tuiHistory";

process.env.NOLO_CLI_COLOR = "1";

const ROWS = 40;
const COLUMNS = 120;
const INPUT_LINES = 3;

function makeFakeOutput() {
  let bytes = 0;
  let writes = 0;
  return {
    output: {
      isTTY: true,
      rows: ROWS,
      columns: COLUMNS,
      write(chunk: string | Buffer): boolean {
        bytes += typeof chunk === "string" ? chunk.length : chunk.length;
        writes += 1;
        return true;
      },
    },
    stats: () => ({ bytes, writes }),
  };
}

function makeToolBlock(i: number, faithful: boolean): string {
  // faithful=false（宽松对照）：块间空行 → 流式前缀缓存可按 \n\n 推进
  if (!faithful) {
    return `› readFile src/sample_${i}.ts\n  ok sample output line a ${i}\n  ok sample output line b ${i}\n  ok sample output line c ${i}\n\n`;
  }
  // faithful=true（真实 formatter 形状）：header + tree，结尾单 \n
  // （toolOutput.formatRunTreeBlockForCli/formatReadTreeBlockForCli 实际输出）
  return `› tool ${i}\n  ├ sample output line a ${i}\n  ├ sample output line b ${i}\n  └ sample output line c ${i}\n`;
}

function seedHistory(history: TurnHistory) {
  // 模拟一个已有 20 turn 的会话（大 history 下的窗口渲染成本）
  for (let t = 0; t < 20; t++) {
    startTurn(history, t % 2 === 0 ? "user" : "assistant");
    const lines = Array.from({ length: 6 }, (_, i) => `turn ${t} line ${i}: lorem ipsum transcript content padding padding`);
    history.currentContent += lines.join("\n") + "\n";
    finalizeCurrentTurn(history);
  }
}

/** 等价 scheduleRender(33ms) 节流后的一帧 paint（paintSyncedFrame 的 render 部分）。 */
function paintFrame(history: TurnHistory, out: { write(s: string): unknown }) {
  renderHistory(out, history, INPUT_LINES);
}

function stats(nums: number[]) {
  const sorted = [...nums].sort((a, b) => a - b);
  const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor((q / 100) * sorted.length))]!;
  const avg = nums.reduce((s, v) => s + v, 0) / nums.length;
  return { p50: p(50), p95: p(95), max: sorted[sorted.length - 1]!, avg };
}
const fmt = (label: string, nums: number[]) => {
  const s = stats(nums);
  return `${label}: p50=${s.p50.toFixed(3)}ms p95=${s.p95.toFixed(3)}ms max=${s.max.toFixed(3)}ms avg=${s.avg.toFixed(3)}ms n=${nums.length}`;
};

function scenario(name: string, opts: { seededTurns: boolean; toolEvents: number; faithful?: boolean }) {
  const { output, stats: outStats } = makeFakeOutput();
  const faithful = opts.faithful !== false; // 默认走真实形状
  const history = createTurnHistory();
  if (opts.seededTurns) seedHistory(history);

  // assistant streaming turn 开启（真实 turn 中 tool blocks 追加进 current turn）
  startTurn(history, "assistant");
  applyOutputChunkToCurrentTurn(history, "Working on it...\n\n");

  const frameTimes: number[] = [];
  const EVENTS = opts.toolEvents;

  for (let i = 0; i < EVENTS; i++) {
    // 注入一个 tool 事件 chunk（= writeToolBlock 路径）
    applyOutputChunkToCurrentTurn(history, makeToolBlock(i, faithful), "tool");
    // 等价 scheduleRender(33ms) 节流后的一帧 paint
    const frameStart = performance.now();
    paintFrame(history, output);
    frameTimes.push(performance.now() - frameStart);
  }

  const s = stats(frameTimes);
  const o = outStats();
  console.log(`${name}: paint p50=${s.p50.toFixed(3)}ms p95=${s.p95.toFixed(3)}ms max=${s.max.toFixed(3)}ms avg=${s.avg.toFixed(3)}ms frames=${frameTimes.length} bytes=${o.bytes} writes=${o.writes}`);
}


// ── 场景矩阵 ────────────────────────────────────────────────────────────// 1. 短会话 + 10 个 tool 事件（事件即帧，@30fps）
scenario("A fresh-history  10 tool-evt (faithful) ", { seededTurns: false, toolEvents: 10 });
// 2. 长 history（20 turns）+ 10 个 tool 事件
scenario("B 20-turn-hist  10 tool-evt (faithful) ", { seededTurns: true, toolEvents: 10 });
// 3. 长 history + 100 个 tool 事件（真实形状：块尾单 \n）
scenario("C 20-turn-hist 100 tool-evt (faithful) ", { seededTurns: true, toolEvents: 100 });
// 4. 压力：600 个 tool 事件（几十轮 tool call 的大 turn）
scenario("D 20-turn-hist 600 tool-evt (faithful) ", { seededTurns: true, toolEvents: 600 });
// 5. 对照：同 D 但块尾 \n\n（前缀缓存可推进时的理论下界）
scenario("E 20-turn-hist 600 tool-evt (blankline)", { seededTurns: true, toolEvents: 600, faithful: false });
