// packages/agent-runtime/abortableKernel.ts
// LocalAgentLoop 第二刀：timeout + abort 的 Effect v4 execution boundary。
//
// 职责：await 一个无取消契约的任务 promise（provider.complete），用
// Effect.raceFirst + Effect.timeoutOption 实现 timeout 与 AbortSignal 桥接，
// 输家被 interrupt、cleanup（listener 移除）必随之执行（Effect.ensuring 兜底，
// v4 callback 的 native cleanup 只在 interrupt 路径跑，winner 路径靠 ensuring）。
//
// deterministic world：timeout 走 Effect Clock —— 生产用默认 runtime（真实时间），
// 测试注入 ManagedRuntime(TestClock.layer()) 即可用 TestClock.adjust 虚拟推进，
// 零真实 sleep。
//
// 错误语义不在这里翻译：kernel 返回 outcome union，timeout/aborted 的错误
// 构造（LLM_REQUEST_TIMEOUT / LOCAL_TURN_ABORTED）留在 localLoop façade，
// 保持既有 error/status/事件行为不变。

import { Duration, Effect, Option } from "effect";
import type { ManagedRuntime } from "effect";

export type AbortableOutcome<T> =
  | { kind: "done"; value: T }
  | { kind: "timeout" }
  | { kind: "aborted" }
  | { kind: "failed"; error: unknown };

export type RunAbortableArgs<T> = {
  /** 无取消契约的任务 promise（例如 provider.complete）。被放弃时不取消。 */
  task: Promise<T>;
  /** 硬超时（ms）。undefined = 不限时，等任务自然结束。 */
  timeoutMs?: number;
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
    const inner = raced;
    const timeoutMs = args.timeoutMs;
    raced = Effect.gen(function* () {
      const outcome = yield* Effect.timeoutOption(inner, Duration.millis(timeoutMs));
      return Option.isNone(outcome)
        ? ({ kind: "timeout" } as AbortableOutcome<T>)
        : outcome.value;
    });
  }

  return args.runtime
    ? args.runtime.runPromise(raced)
    : Effect.runPromise(raced);
}
