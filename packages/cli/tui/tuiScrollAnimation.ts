/**
 * 平滑滚动推进器（滚轮/触控板的限速动画）。
 *
 * 背景：一次滚轮/触控板手势会在同一 burst 里送来 1~几十条 SGR 报告（条数由
 * 终端与触控板惯性决定）。旧实现每条报告立刻改 scrollTop、画面按 ~30fps 合并
 * 重绘，于是同一手势的观感在「每帧 5 行」与「单帧跳几十行」之间漂移——快滚
 * 像瞬移、慢滚像蠕动，用户无法预期滚一下会走多远。
 *
 * 本模块把距离与节奏解耦：
 * - 距离：每条报告给目标位置 ±WHEEL_SCROLL_LINES 行，全部照单入库（触控板
 *   惯性因此保持自然）；
 * - 节奏：一个 16ms 定时器把视口朝目标推进，每帧最多 maxLinesPerTick 行，
 *   逐帧可见。快滚慢滚都是同一条匀速轨迹，不再出现单帧瞬移。
 *
 * 与 applyScrollAction 的分工：键盘（PageUp/PageDown/Half/Home/End）保持瞬跳，
 * 不走本模块；只有滚轮走这里。followBottom 语义与 applyScrollAction 的 wheel
 * 分支对齐：任一滚轮动作先退出 live-tail，滚到（新的）底部时恢复。
 *
 * 手感可用环境变量调（非法值回落默认，读不到即默认）：
 * - NOLO_TUI_WHEEL_LINES      每条滚轮报告的行数（默认 WHEEL_SCROLL_LINES = 5，上限 50）
 * - NOLO_TUI_SCROLL_MAX_STEP  每帧最多推进的行数（显式给值 = 固定限速，默认 6，上限 100）
 *
 * 默认模式不固定步长，而是「按积压比例追赶」：一条报告的欠账是 5 行（一帧
 * 结清，轻滚精度不变），但同一 burst 里 20 条报告把欠账堆到 100 行时，若仍以
 * 6 行/帧结清，这 272ms 全部发生在用户停手之后（"手停了画面还在滑"）。因此
 * 空闲态默认步长跟随当前欠账放大，但仍逐帧可视且单帧有上限：
 *
 *   step = min(欠账, max(6, wheelLines, ceil(欠账 / 4)), max(20, wheelLines))
 *
 * 每报告距离仍恒为 wheelLines（总距离不增益、不丢失），反向仍从当前可见位置
 * 起算。这是**有上限的追赶改进**：单帧步长 ≤ max(20, wheelLines)，因此对任意
 * 大的 burst，尾延迟并不有界，只是大幅缩短且随欠账自适应。显式给出
 * NOLO_TUI_SCROLL_MAX_STEP 时回到旧的固定限速 / 硬上限语义（不做追赶）。
 */
import { computeScrollMetrics, type TurnHistory } from "./tuiHistory";
import { WHEEL_SCROLL_LINES } from "./tuiScrollbar";

export type ScrollWheelDirection = "up" | "down";

/**
 * 周期性 tick 来源。默认 setInterval；测试注入确定性实现，手动驱动帧。
 * 返回停止函数（幂等：重复调用安全）。
 */
export type ScrollTickTimer = {
  every: (ms: number, fn: () => void) => () => void;
};

export type ScrollAnimatorDeps = {
  history: TurnHistory;
  output: NodeJS.WritableStream;
  getInputLines: () => number;
  getReservedRows?: () => number;
  /** 每推进一帧后的同步重绘（BSU/ESU 包裹与暂停判断由调用方负责）。 */
  onPaint: () => void;
  /** 环境变量来源（默认 process.env）；测试可注入干净对象。 */
  env?: Record<string, string | undefined>;
  /** 定时器来源（默认 setInterval）。 */
  tickTimer?: ScrollTickTimer;
};

const SCROLL_ANIMATION_TICK_MS = 16;

/** 空闲态默认步长的下限：单条报告（wheelLines）必须一帧结清。 */
const DEFAULT_SCROLL_MAX_LINES_PER_TICK = 6;

/** 默认追赶模式的单帧上限（用户未显式给 NOLO_TUI_SCROLL_MAX_STEP 时）。 */
const ADAPTIVE_STEP_CAP = 20;

/** 用户显式步长的硬上限（沿用原上限语义，不随追赶改动）。 */
const EXPLICIT_STEP_CAP = 100;

function readPositiveInt(
  raw: string | undefined,
  fallback: number,
  max: number,
): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

/**
 * 解析手感参数：环境变量优先，非法/缺省回落默认值并做上限收敛。
 *
 * `adaptiveStep` 表示「用户没有显式给合法步长」——此时每帧步长按积压比例
 * 追赶；显式给值时保留固定限速 / 硬上限语义（不做追赶）。
 */
export function resolveScrollTuning(
  env: Record<string, string | undefined> = process.env,
): { wheelLines: number; maxLinesPerTick: number; adaptiveStep: boolean } {
  const rawStep = env.NOLO_TUI_SCROLL_MAX_STEP;
  const explicit = parseExplicitStep(rawStep);
  return {
    wheelLines: readPositiveInt(env.NOLO_TUI_WHEEL_LINES, WHEEL_SCROLL_LINES, 50),
    maxLinesPerTick: explicit ?? DEFAULT_SCROLL_MAX_LINES_PER_TICK,
    adaptiveStep: explicit === null,
  };
}

/** 合法显式步长（收敛到 EXPLICIT_STEP_CAP）；缺省 / 非法返回 null。 */
function parseExplicitStep(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.min(parsed, EXPLICIT_STEP_CAP);
}

const defaultTickTimer: ScrollTickTimer = {
  every(ms, fn) {
    const handle = setInterval(fn, ms);
    // 防守：异常路径下未 cancel 的推进器不应拖住事件循环退出（正常路径
    // settle/stop/cancel/finish 都会 clearInterval）。
    (handle as { unref?: () => void }).unref?.();
    return () => clearInterval(handle);
  },
};

/**
 * 创建推进器。返回的 wheel/cancel 在主线程同步调用（键盘与鼠标事件路径）。
 */
export function createScrollAnimator(deps: ScrollAnimatorDeps) {
  const { wheelLines, maxLinesPerTick, adaptiveStep } = resolveScrollTuning(
    deps.env ?? process.env,
  );
  // 追赶模式的单帧上限：至少 20，且不低于单条报告的 wheelLines（否则单报告
  // 一帧结不清）。显式步长时只用用户给的固定上限。
  const stepCap = adaptiveStep
    ? Math.max(ADAPTIVE_STEP_CAP, wheelLines)
    : maxLinesPerTick;
  const timer = deps.tickTimer ?? defaultTickTimer;
  const history = deps.history;

  /** 尚未到达的目标行（null = 空闲，且与 scrollTop 已同步）。 */
  let goal: number | null = null;
  /** 最近一次滚轮意图方向；tick 用它决定到达底部时是否恢复 live-tail。 */
  let intent: ScrollWheelDirection | null = null;
  let stopTicker: (() => void) | null = null;

  const metrics = () =>
    computeScrollMetrics(
      history,
      deps.output,
      deps.getInputLines(),
      deps.getReservedRows?.() ?? 0,
    );

  const stop = () => {
    if (stopTicker) {
      stopTicker();
      stopTicker = null;
    }
    goal = null;
    intent = null;
  };

  const settle = (maxScrollTop: number) => {
    // 从底部方向滚到（含 clamp 到）底部：恢复 live-tail，与旧 wheel-down 语义一致。
    if (intent === "down" && history.scrollTop >= maxScrollTop) {
      history.followBottom = true;
    }
    stop();
  };

  const tick = () => {
    if (goal === null) {
      stop();
      return;
    }
    const { maxScrollTop } = metrics();
    // 内容缩短或视口变化（resize）时把目标收回合法区间。
    if (goal > maxScrollTop) goal = maxScrollTop;
    const delta = goal - history.scrollTop;
    if (delta === 0) {
      settle(maxScrollTop);
      return;
    }
    // 单帧步长：显式步长 = 固定限速；默认 = 按积压比例追赶（下限保证单条
    // 报告一帧结清，上限 stepCap）。两者都逐帧可视，不新增惯性。
    const backlog = Math.abs(delta);
    const limit = adaptiveStep
      ? Math.min(
          backlog,
          Math.max(
            DEFAULT_SCROLL_MAX_LINES_PER_TICK,
            wheelLines,
            Math.ceil(backlog / 4),
          ),
          stepCap,
        )
      : Math.min(backlog, maxLinesPerTick);
    const step = Math.sign(delta) * limit;
    history.scrollTop += step;
    deps.onPaint();
    if (history.scrollTop === goal) {
      settle(maxScrollTop);
    }
  };

  const ensureTicker = () => {
    if (!stopTicker) {
      stopTicker = timer.every(SCROLL_ANIMATION_TICK_MS, tick);
    }
  };

  return {
    /**
     * 一条滚轮报告：折算为目标位置并保证推进器在跑。
     * followBottom 先退出（与 applyScrollAction 的 wheel 分支一致）。
     */
    wheel(direction: ScrollWheelDirection): void {
      // 反向打断（滚动进行中反向滚）：从当前可见位置重新起算，而不是从
      // 尚未到达的旧目标——否则要先滑完旧目标才回头，体感是"按了没反应"。
      const isOpposing = intent !== null && intent !== direction;
      const base = isOpposing ? history.scrollTop : (goal ?? history.scrollTop);
      const next = direction === "up" ? base - wheelLines : base + wheelLines;
      goal = Math.max(0, next);
      intent = direction;
      if (goal === history.scrollTop) {
        // 无位移可推进（如短内容在顶部继续上滚）：不改任何状态直接收工，
        // live-tail 保持原样（避免误触触控板把自动吸底关掉）。
        stop();
        return;
      }
      // 真有位移意图时才退出 live-tail（语义与 applyScrollAction 的 wheel 分支一致）。
      history.followBottom = false;
      ensureTicker();
    },
    /** 外部直接改了 scrollTop（键盘滚动、选区拖拽自动滚动）前调用，避免两套写入打架。 */
    cancel(): void {
      stop();
    },
    isAnimating(): boolean {
      return goal !== null;
    },
  };
}

export type ScrollAnimator = ReturnType<typeof createScrollAnimator>;
