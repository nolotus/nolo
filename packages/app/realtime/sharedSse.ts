// packages/app/realtime/sharedSse.ts
// façade：对外 API 不变（subscribeSharedSse），内部委托给 Effect kernel。
// Effect 类型不泄漏到调用方（React hooks / Redux consumers 只看到 () => void）。

import { Effect, Fiber, Layer } from "effect";
import {
  SseBroadcastDirect,
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
  // 按 mode 配对：shared = SseLockLive + SseBroadcastLive（真实选举 + 扇出）；
  // direct = SseLockDirect + SseBroadcastDirect（无选举 + no-op broadcast）。
  // 不能混搭：supportsSharedTransport() 为 false 的常见原因是 BroadcastChannel
  // 不存在，direct fallback 若仍用 SseBroadcastLive 会因 new BroadcastChannel(name)
  // 抛异常（旧实现走 subscribeDirect 直接 fetch 的回归）。
  const shared = supportsSharedTransport();
  const lockLayer = shared ? SseLockLive : SseLockDirect;
  const broadcastLayer = shared ? SseBroadcastLive : SseBroadcastDirect;
  const liveLayer = Layer.mergeAll(
    SseClockLive,
    SseTransportLive,
    lockLayer,
    broadcastLayer
  );
  const fiber = Effect.runFork(
    subscribeSharedSseEffect(args).pipe(Effect.provide(liveLayer))
  );
  return () => {
    // v4: Fiber.interruptAsFork 已移除；用 runFork 发起中断（fire-and-forget，
    // 不等待 fiber 完成），保持 dispose 的同步语义。
    Effect.runFork(Fiber.interrupt(fiber));
  };
}
