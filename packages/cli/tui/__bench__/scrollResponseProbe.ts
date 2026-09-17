/**
 * 滚动跟手度探针（测量用，非产品代码）。
 *
 * 目的：把「TUI 滚动不跟手」拆成可测的机械指标——首次可见延迟、总距离、
 * 停手后 settle 时长、每帧步长、重绘次数——在**合成输入**下用确定性虚拟时钟
 * 复现，不改动 tuiScrollAnimation.ts。
 *
 * 用法：bun packages/cli/tui/__bench__/scrollResponseProbe.ts
 * 输出：每个场景一行指标 + 渲染成本段 + 与虚拟时钟预测的实时光对照。
 *
 * 注意：本探针只证明「合成报告序列 + 16ms tick」这条机械链的性质；真实终端
 * 上报速率、事件循环抖动、渲染实际耗时在用户设备上未知，不能据此宣称真实手感。
 */
import {
  createTurnHistory,
  renderHistory,
  type TurnHistory,
} from "../tuiHistory";
import {
  createScrollAnimator,
  resolveScrollTuning,
  type ScrollTickTimer,
  type ScrollWheelDirection,
} from "../tuiScrollAnimation";
import { WHEEL_SCROLL_LINES } from "../tuiScrollbar";

const TICK_MS = 16;
const ROWS = 10;
const COLUMNS = 40;
const INPUT_LINES = 2;
const VIEWPORT = ROWS - INPUT_LINES;

/** 确定性虚拟时钟：tickTimer 来源。时间只在 advanceTo 时前进。 */
function makeClock() {
  let idSeq = 0;
  let timers: { id: number; interval: number; next: number; fn: () => void }[] =
    [];
  let now = 0;
  /** 最后一次「有计时器被触发后变为空闲」的时刻——推进器 settle 的真实时点。 */
  let idleAt: number | null = null;
  const every = (ms: number, fn: () => void) => {
    const t = { id: ++idSeq, interval: ms, next: now + ms, fn };
    timers.push(t);
    return () => {
      timers = timers.filter((x) => x.id !== t.id);
    };
  };
  const timer: ScrollTickTimer = { every };
  return {
    timer,
    now: () => now,
    idleAt: () => idleAt,
    activeCount: () => timers.length,
    /** 推进到 absTime，按时间顺序触发到期 tick（每个 tick 只跑一次）。 */
    advanceTo(absTime: number) {
      for (;;) {
        const due = timers.filter((t) => t.next <= absTime);
        if (due.length === 0) break;
        due.sort((a, b) => a.next - b.next || a.id - b.id);
        const stepTime = due[0]!.next;
        now = stepTime;
        for (const t of due) {
          if (t.next === stepTime) t.next += t.interval;
        }
        for (const t of due) {
          if (t.next - t.interval === stepTime) t.fn();
        }
        if (timers.length === 0) idleAt = stepTime;
      }
      now = Math.max(now, absTime);
    },
  };
}

function makeOutput(rows = ROWS, columns = COLUMNS): NodeJS.WritableStream {
  return {
    isTTY: true,
    rows,
    columns,
    write() {
      return true;
    },
  } as unknown as NodeJS.WritableStream;
}

/** 单行 turn 的合成历史：contentLines 行 → maxScrollTop = contentLines - VIEWPORT。 */
function makeHistory(turnCount: number): TurnHistory {
  const history = createTurnHistory();
  for (let i = 0; i < turnCount; i++) {
    history.turns.push({ role: "assistant", content: `line ${i}` });
  }
  history.followBottom = false;
  history.scrollTop = 0;
  return history;
}

type InputEvent = { at: number; direction: ScrollWheelDirection };

type ScenarioMetrics = {
  name: string;
  reports: number;
  /** 首条报告 → scrollTop 第一次变化的虚拟时间（"报告首次可见延迟"）。 */
  firstVisibleMs: number | null;
  /** 最后一次 scrollTop 变化 − 最后一次输入：停手后的拖尾（settle）。 */
  tailAfterLastInputMs: number;
  /** 输入结束后还在推进的距离（拖尾行数 = 末次输入时的欠账）。 */
  tailLines: number;
  /** 全部输入结束时的累计位移。 */
  distanceAtLastInput: number;
  /** 最终位移（含拖尾）。 */
  totalDistance: number;
  /** 单帧最大步长 / 总帧数 / 重绘次数。 */
  maxStep: number;
  frames: number;
  paints: number;
  /** 输入结束后仍在跑的总时长（首帧到 idle）。 */
  settleMs: number | null;
};

function runScenario(
  name: string,
  history: TurnHistory,
  events: InputEvent[],
  opts: { endAt: number; onPaint?: () => void; env?: Record<string, string> },
): ScenarioMetrics {
  const clock = makeClock();
  const ordered = [...events].sort((a, b) => a.at - b.at);
  const lastInputAt = ordered.length ? ordered[ordered.length - 1]!.at : 0;
  let paints = 0;
  let firstChangeAt: number | null = null;
  let lastChangeAt = 0;
  let lastChangeValue = history.scrollTop;
  let changedFrames = 0;
  let maxStep = 0;
  let prev = history.scrollTop;
  const startTop = history.scrollTop;
  let atLastInputTop = 0;

  const animator = createScrollAnimator({
    history,
    output: makeOutput(),
    getInputLines: () => INPUT_LINES,
    onPaint: () => {
      paints += 1;
      const nowTop = history.scrollTop;
      if (nowTop !== prev) {
        const step = Math.abs(nowTop - prev);
        maxStep = Math.max(maxStep, step);
        changedFrames += 1;
        if (firstChangeAt === null) firstChangeAt = clock.now();
        lastChangeAt = clock.now();
        lastChangeValue = nowTop;
        prev = nowTop;
      }
      opts.onPaint?.();
    },
    env: opts.env ?? {},
    tickTimer: clock.timer,
  });

  let idx = 0;
  while (idx < ordered.length) {
    const at = ordered[idx]!.at;
    clock.advanceTo(at);
    while (idx < ordered.length && ordered[idx]!.at === at) {
      animator.wheel(ordered[idx]!.direction);
      idx += 1;
    }
    if (at === lastInputAt) atLastInputTop = history.scrollTop;
  }
  clock.advanceTo(opts.endAt);
  const idleAt = clock.idleAt(); // 必须在推进后取：settle 发生在 advance 期间

  const settleMs =
    idleAt !== null
      ? Math.max(0, idleAt - lastInputAt)
      : clock.activeCount() > 0
        ? null
        : 0;
  return {
    name,
    reports: ordered.length,
    firstVisibleMs: firstChangeAt === null ? null : firstChangeAt - ordered[0]!.at,
    tailAfterLastInputMs: lastChangeAt - lastInputAt,
    tailLines: lastChangeValue - atLastInputTop, // 末次输入时欠账 = 静默后仍在推进的距离
    distanceAtLastInput: atLastInputTop - startTop,
    totalDistance: lastChangeValue - startTop,
    maxStep,
    frames: changedFrames,
    paints,
    settleMs,
  };
}

/** 场景集合：单报告 / 密集 burst / 持续输入 / 停手 / 反向 / 边界。 */
function scenarios(): {
  name: string;
  turnCount: number;
  events: InputEvent[];
  endAt: number;
}[] {
  const dense: InputEvent[] = [];
  for (let i = 0; i < 20; i++) dense.push({ at: 0, direction: "down" });

  const sustained: InputEvent[] = [];
  for (let i = 0; i < 40; i++)
    sustained.push({ at: i * 40, direction: "down" });

  // 停手场景：0~320ms 每 16ms 一条（每帧都来新报告），之后 1s 静默。
  const burstThenStop: InputEvent[] = [];
  for (let i = 0; i < 20; i++)
    burstThenStop.push({ at: i * TICK_MS, direction: "down" });

  const reverse: InputEvent[] = [
    { at: 0, direction: "down" },
    { at: 0, direction: "down" },
    { at: 0, direction: "down" },
    { at: 0, direction: "down" },
    { at: 0, direction: "down" },
    { at: 0, direction: "down" }, // 目标 +30
    { at: 32, direction: "up" }, // 滚动进行中反向
  ];

  return [
    { name: "single-report", turnCount: 30, events: [{ at: 0, direction: "down" }], endAt: 2000 },
    { name: "dense-burst-20", turnCount: 2000, events: dense, endAt: 4000 },
    { name: "sustained-40@40ms", turnCount: 2000, events: sustained, endAt: 6000 },
    { name: "burst20-then-stop", turnCount: 2000, events: burstThenStop, endAt: 3000 },
    { name: "reverse-mid-flight", turnCount: 2000, events: reverse, endAt: 3000 },
  ];
}

const tuning = resolveScrollTuning({});
console.log(
  `TUI scroll response probe — synthetic reports, virtual clock, tick=${TICK_MS}ms, ` +
    `rows=${ROWS} cols=${COLUMNS} inputLines=${INPUT_LINES} viewport=${VIEWPORT}`,
);
console.log(
  `tuning(默认): wheelLines=${tuning.wheelLines} (WHEEL_SCROLL_LINES=${WHEEL_SCROLL_LINES}) ` +
    `adaptiveStep=${tuning.adaptiveStep}（默认模式步长 = min(欠账, max(6, wheelLines, ceil(欠账/4)), max(20, wheelLines))）`,
);
console.log(
  `tuning(显式 NOLO_TUI_SCROLL_MAX_STEP=N): 固定限速 N 行/帧，上限 ${100}（本 probe 的 before 口径用 N=6）\n`,
);

const header = [
  "scenario".padEnd(22),
  "rep".padStart(3),
  "1stVis".padStart(7),
  "dist@last".padStart(9),
  "tail".padStart(5),
  "total".padStart(6),
  "maxStep".padStart(7),
  "frames".padStart(6),
  "paints".padStart(6),
  "settle".padStart(7),
];

/** 同口径跑一遍全部场景（before = 旧的固定 6 行/帧；after = 默认追赶模式）。 */
function runAllScenarios(env: Record<string, string>): ScenarioMetrics[] {
  const results: ScenarioMetrics[] = [];
  for (const s of scenarios()) {
    const history = makeHistory(s.turnCount);
    results.push(
      runScenario(s.name, history, s.events, { endAt: s.endAt, env }),
    );
  }
  return results;
}

function printScenarioTable(label: string, rows: ScenarioMetrics[]) {
  console.log(`[${label}]`);
  console.log(header.join(" "));
  console.log("-".repeat(header.join(" ").length));
  for (const m of rows) {
    console.log(
      [
        m.name.padEnd(22),
        String(m.reports).padStart(3),
        `${m.firstVisibleMs ?? "-"}ms`.padStart(7),
        String(m.distanceAtLastInput).padStart(9),
        String(m.tailLines).padStart(5),
        String(m.totalDistance).padStart(6),
        String(m.maxStep).padStart(7),
        String(m.frames).padStart(6),
        String(m.paints).padStart(6),
        `${m.settleMs ?? "-"}ms`.padStart(7),
      ].join(" "),
    );
  }
  console.log("");
}

const beforeRows = runAllScenarios({
  NOLO_TUI_SCROLL_MAX_STEP: "6", // before 口径 = 旧默认固定 6 行/帧
});
const afterRows = runAllScenarios({});
printScenarioTable("before] 显式 NOLO_TUI_SCROLL_MAX_STEP=6（旧固定限速语义", beforeRows);
printScenarioTable("after] 默认模式（按积压比例追赶）", afterRows);

console.log("[before/after 对比] 同场景、同输入、同虚拟时钟口径");
console.log(
  [
    "scenario".padEnd(22),
    "tail b→a".padStart(11),
    "settle b→a".padStart(15),
    "maxStep b→a".padStart(13),
    "frames b→a".padStart(12),
    "total b→a".padStart(12),
  ].join(" "),
);
for (let i = 0; i < beforeRows.length; i++) {
  const b = beforeRows[i]!;
  const a = afterRows[i]!;
  console.log(
    [
      b.name.padEnd(22),
      `${b.tailLines}→${a.tailLines}`.padStart(11),
      `${b.settleMs ?? "-"}→${a.settleMs ?? "-"}ms`.padStart(15),
      `${b.maxStep}→${a.maxStep}`.padStart(13),
      `${b.frames}→${a.frames}`.padStart(12),
      `${b.totalDistance}→${a.totalDistance}`.padStart(12),
    ].join(" "),
  );
}
console.log("");

// ── 边界：顶部继续上滚 & 近底 clamp ──────────────────────────────────────────
console.log("\n[boundary]");
{
  const history = makeHistory(3); // 3 行内容 < viewport → maxScrollTop = 0
  history.followBottom = true;
  const m = runScenario("edge-top-up", history, [{ at: 0, direction: "up" }], {
    endAt: 500,
  });
  console.log(
    `  top-up: maxScrollTop=0 → distance=${m.totalDistance} paints=${m.paints} frames=${m.frames} (期望 0 位移、0 次重绘)`,
  );
  console.log(`  followBottom preserved: ${history.followBottom} (期望 true)`);
}
{
  const history = makeHistory(30); // maxScrollTop = 30 - 8 = 22
  const m = runScenario(
    "clamp-bottom",
    history,
    scenarios().find((s) => s.name === "dense-burst-20")!.events,
    { endAt: 4000 },
  );
  console.log(
    `  clamp-bottom: maxScrollTop=22 → total=${m.totalDistance} tail=${m.tailLines} settle=${m.settleMs}ms ` +
      `frames=${m.frames} maxStep=${m.maxStep} followBottom=${history.followBottom} (期望 22 / true)`,
  );
}
{
  // 反向场景的两种口径对比：现状（从可见位置重算） vs 假设（沿用旧目标 +5）
  const historyNow = makeHistory(2000);
  const nowM = runScenario("reverse-current", historyNow, [
    ...[0, 0, 0, 0, 0, 0].map((at) => ({ at, direction: "down" as const })),
    { at: 32, direction: "up" as const },
  ], { endAt: 3000 });
  console.log(
    `  reverse current: 6×down@t0 → 1×up@t32: dist@last=${nowM.distanceAtLastInput} ` +
      `tail=${nowM.tailLines} total=${nowM.totalDistance} settle=${nowM.settleMs}ms ` +
      `(假设=旧目标+5 需先滑完旧目标)`,
  );
}

// ── 渲染成本（真实 renderHistory，非虚拟） ──────────────────────────────────
// renderHistory 走内部 diff 缓冲：同一位置重复渲染写入字节为 0（缓存全命中），
// 所以「滚动帧」按每次 scrollTop+1 的方式测，才反映推进器每帧真实的重绘成本。
console.log("\n[render cost] 真实 renderHistory（rows=10 cols=40 inputLines=2）");
for (const turnCount of [500, 2000]) {
  const history = makeHistory(turnCount);
  let bytes = 0;
  const output = {
    isTTY: true,
    rows: ROWS,
    columns: COLUMNS,
    write(chunk: string | Buffer) {
      bytes += typeof chunk === "string" ? chunk.length : chunk.byteLength;
      return true;
    },
  } as unknown as NodeJS.WritableStream;
  const maxScrollTop = Math.max(0, turnCount - VIEWPORT);
  const mid = Math.floor(maxScrollTop / 2);
  history.scrollTop = mid;

  // 静态帧：同位置重复渲染（diff 短路 → 0 字节），验证缓存命中路径。
  const staticSamples: number[] = [];
  for (let k = 0; k < 200; k++) {
    const t0 = performance.now();
    renderHistory(output, history, INPUT_LINES);
    staticSamples.push(performance.now() - t0);
  }
  staticSamples.sort((a, b) => a - b);

  // 滚动帧：每帧 scrollTop+1（真实推进步长），测渲染 + 写入字节。
  const scrollSamples: number[] = [];
  let scrollBytes = 0;
  for (let k = 0; k < 200; k++) {
    history.scrollTop = mid + (k % 5);
    bytes = 0;
    const t0 = performance.now();
    renderHistory(output, history, INPUT_LINES);
    scrollSamples.push(performance.now() - t0);
    scrollBytes += bytes;
  }
  scrollSamples.sort((a, b) => a - b);
  const p = (arr: number[], q: number) =>
    arr[Math.min(arr.length - 1, Math.floor(arr.length * q))]!;
  console.log(
    `  turnCount=${String(turnCount).padStart(4)}: 静态帧 p50=${p(staticSamples, 0.5).toFixed(3)}ms ` +
      `p95=${p(staticSamples, 0.95).toFixed(3)}ms (同帧重复→diff 短路)  |  ` +
      `滚动帧 p50=${p(scrollSamples, 0.5).toFixed(3)}ms p95=${p(scrollSamples, 0.95).toFixed(3)}ms ` +
      `bytes/帧=${(scrollBytes / 200).toFixed(0)}`,
  );
  const frameP50 = p(scrollSamples, 0.5);
  const frameP95 = p(scrollSamples, 0.95);
  console.log(
    `             → 单帧渲染 p50=${frameP50.toFixed(3)}ms p95=${frameP95.toFixed(3)}ms ` +
      `= ${((frameP95 / TICK_MS) * 100).toFixed(1)}% of ${TICK_MS}ms tick`,
  );
}
console.log(
  `\n注：虚拟时钟下 before 口径 settle = ceil(欠账/6) × ${TICK_MS}ms；after 口径为追赶步长\n` +
    `    step = min(欠账, max(6, wheelLines, ceil(欠账/4)), max(20, wheelLines)) 逐帧收敛，\n` +
    `    均未计入渲染耗时与事件循环抖动。`,
);

// ── 修复假设的参数扫描（只调 env 旋钮，不改产品代码） ────────────────────────
// 假设：把每帧上限提到 ≥ 单条报告行数（wheelLines）可让"单报告"一帧落地，
// 同时把单帧渲染成本留在 16ms 预算内（渲染实测 p95 << 1ms）。
console.log("\n[step sweep] 只调 NOLO_TUI_SCROLL_MAX_STEP（显式值 = 固定限速；wheelLines=5 固定），观察指标");
const sweepHeader = [
  "maxStep".padStart(7),
  "1stVis".padStart(7),
  "single".padStart(6),
  "dense20".padStart(8),
  "dense20settle".padStart(13),
  "burst20stop".padStart(11),
  "frames".padStart(6),
];
console.log(sweepHeader.join(" "));
for (const step of [2, 5, 6, 10, 20]) {
  const env = { NOLO_TUI_SCROLL_MAX_STEP: String(step) };
  const single = runScenario(
    "single",
    makeHistory(30),
    [{ at: 0, direction: "down" }],
    { endAt: 2000, env },
  );
  const dense = runScenario("dense", makeHistory(2000), [
    ...Array.from({ length: 20 }, () => ({
      at: 0,
      direction: "down" as ScrollWheelDirection,
    })),
  ], { endAt: 4000, env });
  const stop = runScenario(
    "stop",
    makeHistory(2000),
    Array.from({ length: 20 }, (_, i) => ({
      at: i * TICK_MS,
      direction: "down" as ScrollWheelDirection,
    })),
    { endAt: 3000, env },
  );
  console.log(
    [
      String(step).padStart(7),
      `${single.firstVisibleMs ?? "-"}ms`.padStart(7),
      `${single.totalDistance}/${single.frames}f`.padStart(6),
      String(dense.totalDistance).padStart(8),
      `${dense.settleMs ?? "-"}ms`.padStart(13),
      String(stop.tailLines).padStart(11),
      String(dense.frames).padStart(6),
    ].join(" "),
  );
}
console.log(
  `  single 列 = 总距离/可见帧数；dense20stop 列 = 停手后仍在推进的行数（拖尾）。`,
);
console.log("DONE");
