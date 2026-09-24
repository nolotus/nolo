import { Duration, Effect, Option } from "effect";
import type { ManagedRuntime } from "effect";

export type WaitForRunTerminalOutcome<S> =
  | { kind: "terminal"; state: S }
  | { kind: "timeout"; waitedMs: number; lastState: S | undefined }
  | { kind: "aborted" }
  | { kind: "failed"; error: unknown };

export type WaitForRunTerminalArgs<S, T = unknown> = {
  read: () => S | Promise<S>;
  isTerminal: (state: S) => boolean;
  pollIntervalMs: number;
  timeoutMs: number;
  sleep?: (ms: number) => Promise<void> | void;
  abortSignal?: AbortSignal;
  claim?: {
    acquire: () => T | null;
    commit: (token: T | null) => void;
    release: (token: T | null) => void;
  };
  runtime?: ManagedRuntime.ManagedRuntime<never, never>;
};

const readEffect = <S>(read: () => S | Promise<S>) =>
  Effect.tryPromise({ try: () => Promise.resolve(read()), catch: (error) => error });

export function waitForRunTerminal<S, T = unknown>(
  args: WaitForRunTerminalArgs<S, T>,
): Promise<WaitForRunTerminalOutcome<S>> {
  let lastState: S | undefined;
  let token: T | null = null;
  let committed = false;
  const abort = args.abortSignal;
  let removeAbortListener: (() => void) | undefined;
  const abortEffect = abort
    ? Effect.callback<"aborted", never>((resume) => {
        const listener = () => resume(Effect.succeed("aborted" as const));
        if (abort.aborted) { listener(); return; }
        removeAbortListener = () => {
          abort.removeEventListener("abort", listener);
          removeAbortListener = undefined;
        };
        abort.addEventListener("abort", listener, { once: true });
        return Effect.sync(() => removeAbortListener?.());
      }).pipe(Effect.ensuring(Effect.sync(() => removeAbortListener?.())))
    : undefined;
  const sleep = (ms: number) => {
    const effect = args.sleep
      ? Effect.tryPromise({ try: () => Promise.resolve(args.sleep!(ms)), catch: (error) => error })
      : Effect.sleep(Duration.millis(ms));
    return abortEffect ? Effect.raceFirst(effect, abortEffect) : effect;
  };
  const loop = Effect.gen(function* () {
    token = args.claim?.acquire() ?? null;
    // 真实时钟兜底：Effect.timeoutOption 的超时是一个宏任务定时器，注入的
    // sleep stub 若同步 resolve（测试里常见），while 每轮只跑微任务，会把
    // 宏任务饿死 → timeoutOption 永远不调 → 98% CPU 死循环（worker 收尾时
    // 表现为套件冻结）。循环内自查 deadline 不依赖宏任务调度，保证必收敛。
    const deadline = Date.now() + args.timeoutMs;
    // 迭代硬上限（时钟无关的第二道保险）：全量 bun test --parallel=6 实测
    // （cliAgentRunToolExecutors 的 600ms timeout 用例，5/5 复现）该 worker
    // 内 macrotask 定时器整体失效——同一个 worker 里 readlineWorkspace 的
    // 5.6s 用例超过 --timeout=5000 仍 pass、bun 的 per-test 超时也不触发，
    // 表现为 99% CPU 的微任务热循环（三次 eu-stack 采样栈完全一致）。此时
    // 连 Date.now() 推进都不可信，循环内 deadline 自查会失效。按
    // timeoutMs/pollIntervalMs 给出与时间语义等价的迭代上限：生产路径
    // （真实 sleep）下迭代速率本身受 pollInterval 限速，上限不会提前触发；
    // 时钟/timer 任一退化下也必然收敛，不会拖垮整个 worker。
    const maxIterations =
      Math.ceil(args.timeoutMs / Math.max(1, args.pollIntervalMs)) + 1;
    let iterations = 0;
    while (true) {
      const state = yield* readEffect(args.read);
      lastState = state;
      if (args.isTerminal(state)) {
        if (args.claim) { args.claim.commit(token); committed = true; }
        return { kind: "terminal", state } as const;
      }
      iterations += 1;
      if (Date.now() >= deadline || iterations >= maxIterations) {
        return { kind: "timeout", waitedMs: args.timeoutMs, lastState } as const;
      }
      // v4 raceFirst 类型推断让 sleep 分支的 void 占主导，但 abort 桥胜出时
      // 运行时值就是 "aborted"（见 abort 用例）——这里收紧为真实联合类型。
      const slept = (yield* sleep(args.pollIntervalMs)) as "aborted" | void;
      if (slept === "aborted") return { kind: "aborted" } as const;
    }
  }).pipe(
    Effect.timeoutOption(Duration.millis(args.timeoutMs)),
    Effect.map((result) => Option.isNone(result)
      ? ({ kind: "timeout", waitedMs: args.timeoutMs, lastState } as const)
      : result.value),
    Effect.catch((error) => Effect.succeed({ kind: "failed", error } as const)),
    Effect.ensuring(Effect.sync(() => {
      if (args.claim && !committed) args.claim.release(token);
    })),
  );
  const run = args.runtime ? args.runtime.runPromise(loop) : Effect.runPromise(loop);
  return run;
}
