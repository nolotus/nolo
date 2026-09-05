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
    while (true) {
      const state = yield* readEffect(args.read);
      lastState = state;
      if (args.isTerminal(state)) {
        if (args.claim) { args.claim.commit(token); committed = true; }
        return { kind: "terminal", state } as const;
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
