// packages/agent-runtime/abortableKernel.ts
// LocalAgentLoop 第二刀：timeout + abort 的 Effect v4 execution boundary。
//
// 职责：await 一个无取消契约的任务 promise（provider.complete），用
// Effect.raceFirst 实现 timeout 与 AbortSignal 桥接，输家被 interrupt、
// cleanup（listener 移除）必随之执行（Effect.ensuring 兜底，v4 callback 的
// native cleanup 只在 interrupt 路径跑，winner 路径靠 ensuring）。
//
// timeout 语义是 idle（静默期）而非整请求总时长：见 RunAbortableArgs.timeoutMs
// 与下方 idleWatchdog——持续有 delta/事件流入的请求永远不会被超时误杀。
//
// deterministic world：timeout 走 Effect Clock —— 生产用默认 runtime（真实时间），
// 测试注入 ManagedRuntime(TestClock.layer()) 即可用 TestClock.adjust 虚拟推进，
// 零真实 sleep。
//
// 错误语义不在这里翻译：kernel 返回 outcome union，timeout/aborted 的错误
// 构造（LLM_REQUEST_TIMEOUT / LOCAL_TURN_ABORTED）留在 localLoop façade，
// 保持既有 error/status/事件行为不变。

import { Duration, Effect } from "effect";
import type { ManagedRuntime } from "effect";

/**
 * idle watchdog 的分片数：把一次 idle 窗切成 N 片轮询，活动（delta/事件）到达
 * 即可在下一片边界重新起窗。N 越大判定越贴脸，代价只是每秒级的 sleep 次数。
 * 上界误差 = 一片（timeoutMs/N），N=20 即最多多等 5%——换来的保证是
 * 「持续有输出的请求永远不会被误杀」。
 */
const IDLE_WATCHDOG_SLICES = 20;

export type AbortableOutcome<T> =
  | { kind: "done"; value: T }
  | { kind: "timeout" }
  | { kind: "aborted" }
  | { kind: "failed"; error: unknown };

export type RunAbortableArgs<T> = {
  /** 无取消契约的任务 promise（例如 provider.complete）。被放弃时不取消。 */
  task: Promise<T>;
  /**
   * 空闲硬超时（ms，idle 语义）。undefined = 不限时，等任务自然结束。
   *
   * 语义（2026-10 ctx-overflow-feedback review 修复）：超时的是「距上一次
   * 活动的最长静默期」，不是「整请求总时长」。每次 activityVersion() 读数
   * 变化都算一次活动（delta / 工具事件到达），静默计时随之清零；只有连续
   * 静默满 timeoutMs 才放弃。健康的长流式生成（持续有 delta）因此永远不会
   * 被误杀；不传 activityVersion 时退化为旧的总时长语义。
   */
  timeoutMs?: number;
  /**
   * 活动信号读数（monotonic version）：调用方在每次 delta / 工具事件到达时
   * +1，本 kernel 只读不写。不传 = 无活动信号，timeoutMs 退化为整请求总时长。
   */
  activityVersion?: () => number;
  /** 外部中止信号。触发即放弃等待任务（任务自身不被取消）。 */
  abortSignal?: AbortSignal;
  /**
   * [test seam] 注入带 TestClock 的 runtime：timeout 由 TestClock 虚拟推进驱动，
   * 测试即可精确构造 9999ms 不触发 / +1ms 触发。生产不传——走
   * Effect.runPromise 默认 runtime（真实 Clock），行为与旧实现一致。
   */
  runtime?: ManagedRuntime.ManagedRuntime<never, never>;
};

/**
 * 等待任务完成，但 timeout / abort 任一先到即胜出（raceFirst：先 settle 者赢，
 * 无论成败）。被放弃的任务 promise 不取消、不重试——provider.complete 没有
 * 取消契约，重试会留下孤儿进程/重复调用；其后续 rejection 由本 kernel 内部
 * handler 吸收，不会成为 unhandled rejection。
 */
export function runAbortableWithTimeout<T>(
  args: RunAbortableArgs<T>,
): Promise<AbortableOutcome<T>> {
  // 任务通道：resolve/reject 都映射成 outcome（全部走成功通道，避免 v4 race
  // 「失败不算赢」语义干扰 raceFirst 的选择）。
  const taskEffect: Effect.Effect<AbortableOutcome<T>, never, never> = Effect.callback(
    (resume) => {
      args.task.then(
        (value) => resume(Effect.succeed({ kind: "done", value })),
        (error) => resume(Effect.succeed({ kind: "failed", error })),
      );
    },
  );

  let raced: Effect.Effect<AbortableOutcome<T>, never, never> = taskEffect;

  if (args.abortSignal) {
    const signal = args.abortSignal;
    // listener 生命周期跨 register 回调与 ensuring 兜底，提到外层闭包。
    let abortListener: (() => void) | undefined;
    const removeAbortListener = () => {
      if (abortListener) signal.removeEventListener("abort", abortListener);
      abortListener = undefined;
    };
    const abortEffect = Effect.callback<AbortableOutcome<T>, never>((resume) => {
      const finish = () => resume(Effect.succeed({ kind: "aborted" }));
      if (signal.aborted) {
        finish();
        return;
      }
      abortListener = () => finish();
      signal.addEventListener("abort", abortListener, { once: true });
      // interrupt 路径的清理（raceFirst 输家 / fiber 中断时执行）。
      return Effect.sync(removeAbortListener);
    }).pipe(
      // 兜底：v4 callback 的 native cleanup 只覆盖 interrupt 路径；abort bridge
      // 胜出（正常结束）时也必须移除 listener，否则同一 signal 多轮堆积
      // （Node 默认 11 个即 MaxListenersExceededWarning）。
      Effect.ensuring(Effect.sync(removeAbortListener)),
    );
    raced = Effect.raceFirst(taskEffect, abortEffect);
  }

  if (typeof args.timeoutMs === "number") {
    const outer = raced;
    const timeoutMs = args.timeoutMs;
    const activityVersion = args.activityVersion;
    // idle 语义（不再是「包住整个 complete() 的总时长 deadline」）：timeout
    // 通道是一片片轮询的 watchdog——每睡满一片就比对活动版本号，有变化说明
    // 期间有 delta/事件到达（调用方 activityVersion +1），静默计时清零重新
    // 起窗；读数不变则累计静默，满 timeoutMs 才产出 timeout outcome。
    // 分片切分把「最后一片才撞线」的上界误差压到一片（timeoutMs/20），同时
    // 保住「timeout 走 Effect Clock」的契约：真实 setTimeout 无法被 TestClock
    // 虚拟推进，会直接毁掉 deterministic world 测试。
    const idleWatchdog = Effect.gen(function* () {
      const sliceCount = activityVersion ? IDLE_WATCHDOG_SLICES : 1;
      const baseSliceMs = Math.max(1, Math.floor(timeoutMs / sliceCount));
      let idleMs = 0;
      for (;;) {
        const versionAtSliceStart = activityVersion?.();
        const sliceMs = Math.max(1, Math.min(timeoutMs - idleMs, baseSliceMs));
        yield* Effect.sleep(Duration.millis(sliceMs));
        idleMs += sliceMs;
        if (activityVersion && activityVersion() !== versionAtSliceStart) {
          // 本片内有活动：静默 streak 从头起算（宁可少算，不可早杀）。
          idleMs = 0;
          continue;
        }
        if (idleMs >= timeoutMs) return { kind: "timeout" } as AbortableOutcome<T>;
      }
    });
    raced = Effect.raceFirst(outer, idleWatchdog);
  }

  return args.runtime
    ? args.runtime.runPromise(raced)
    : Effect.runPromise(raced);
}
