// packages/app/realtime/sharedSse.ts
// façade：对外 API 不变（subscribeSharedSse），内部委托给 Effect kernel。
// Effect 类型不泄漏到调用方（React hooks / Redux consumers 只看到 () => void）。

import { Effect, Fiber, FiberId, Layer } from "effect";
import {
  SseBroadcastLive,
  SseClockLive,
  SseLockDirect,
  SseLockLive,
  SseTransportLive,
  subscribeSharedSseEffect,
  type SubscribeSharedSseArgs,
} from "./sharedSseEffect";

function supportsSharedTransport() {
  return (
    typeof BroadcastChannel !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof (navigator as any).locks?.request === "function"
  );
}

export function subscribeSharedSse(args: SubscribeSharedSseArgs): () => void {
  const lockLayer = supportsSharedTransport() ? SseLockLive : SseLockDirect;
  const liveLayer = Layer.mergeAll(
    SseClockLive,
    SseTransportLive,
    lockLayer,
    SseBroadcastLive
  );
  const fiber = Effect.runFork(
    subscribeSharedSseEffect(args).pipe(Effect.provide(liveLayer))
  );
  return () => {
    Effect.runSync(Fiber.interruptAsFork(fiber, FiberId.none));
  };
}
