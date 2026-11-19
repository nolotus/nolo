import { useEffect, useRef, useState } from "react";
import { subscribeSharedSse } from "app/realtime/sharedSse";

export const BACKGROUND_WAKE_HIDDEN_THRESHOLD_MS = 5_000;
export const BACKGROUND_WAKE_RELOAD_THROTTLE_MS = 5_000;

export type WakeEventTarget = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

export type WakeTimers = {
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
};

export type DialogBackgroundWakeOptions = {
  dialogId: string | null;
  server: string | null;
  token: string | null;
  /** Local streaming or the foreground recovery session owns this channel. */
  foregroundActive: boolean;
  reloadMessages: () => Promise<unknown>;
  subscribe?: typeof subscribeSharedSse;
  documentTarget?: WakeEventTarget;
  windowTarget?: WakeEventTarget;
  readVisibilityState?: () => string | undefined;
  now?: () => number;
  hiddenThresholdMs?: number;
  reloadThrottleMs?: number;
  timers?: WakeTimers;
};

function defaultDocumentTarget(): WakeEventTarget | undefined {
  if (
    typeof document !== "undefined" &&
    typeof document.addEventListener === "function" &&
    typeof document.removeEventListener === "function"
  ) {
    return document;
  }
  return undefined;
}

function defaultWindowTarget(): WakeEventTarget | undefined {
  if (
    typeof window !== "undefined" &&
    typeof window.addEventListener === "function" &&
    typeof window.removeEventListener === "function"
  ) {
    return window;
  }
  return undefined;
}

function defaultReadVisibilityState(): string | undefined {
  if (typeof document === "undefined") return "visible";
  return document.visibilityState;
}

export function useDialogBackgroundWake({
  dialogId,
  server,
  token,
  foregroundActive,
  reloadMessages,
  subscribe = subscribeSharedSse,
  documentTarget,
  windowTarget,
  readVisibilityState = defaultReadVisibilityState,
  now = () => Date.now(),
  hiddenThresholdMs = BACKGROUND_WAKE_HIDDEN_THRESHOLD_MS,
  reloadThrottleMs = BACKGROUND_WAKE_RELOAD_THROTTLE_MS,
  timers,
}: DialogBackgroundWakeOptions): boolean {
  const [followingDialog, setFollowingDialog] = useState<string | null>(null);
  const latest = useRef({
    foregroundActive,
    reloadMessages,
    readVisibilityState,
    now,
    hiddenThresholdMs,
    reloadThrottleMs,
  });
  latest.current = {
    foregroundActive,
    reloadMessages,
    readVisibilityState,
    now,
    hiddenThresholdMs,
    reloadThrottleMs,
  };

  useEffect(() => {
    setFollowingDialog(null);
    if (!dialogId || !server || !token || foregroundActive) return;
    const setTimeoutFn = timers?.setTimeout ?? globalThis.setTimeout.bind(globalThis);
    const clearTimeoutFn = timers?.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
    let disposed = false;
    let terminalSeen = false;
    let isFollowing = false;
    let catchupInFlight = false;
    // 待处理补读的优先级：0=无，1=节流（推断信号），2=立即（明确信号）。
    // 合并时保留最高优先级，settle 后按「待处理信号」而不是刚结束那轮决定去留。
    const PENDING_NONE = 0;
    const PENDING_THROTTLE = 1;
    const PENDING_IMMEDIATE = 2;
    let pendingCatchup: number = PENDING_NONE;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastReloadAt = -Infinity;
    let hiddenSince: number | null =
      latest.current.readVisibilityState() === "hidden"
        ? latest.current.now()
        : null;
    let sawOnlineWhileHidden = false;

    const clearThrottleTimer = () => {
      if (throttleTimer !== null) {
        clearTimeoutFn(throttleTimer);
        throttleTimer = null;
      }
    };

    const scheduleThrottleFlush = (delayMs: number) => {
      if (disposed || latest.current.foregroundActive || throttleTimer !== null) return;
      throttleTimer = setTimeoutFn(() => {
        throttleTimer = null;
        if (disposed || latest.current.foregroundActive) return;
        if (pendingCatchup === PENDING_NONE) return;
        // 定时器到期时若待处理信号已被升级为立即，按立即执行。
        triggerCatchup(pendingCatchup === PENDING_IMMEDIATE);
      }, Math.max(0, delayMs));
    };

    // immediate=true 用于「明确追赶信号」（重连、跟随中的 turn）：这类信号说明确实
    // 有内容要追上，人为节流只会让用户多等。注意 in-flight 合并只限制**并发**、不限制
    // **频率**——若每轮在途期间都收到明确事件，补读会按请求完成速度连续发起，
    // 这一点已知并接受（读请求可被降载策略覆盖，但不能靠这里保证）。
    const runCatchup = (immediate: boolean) => {
      pendingCatchup = PENDING_NONE;
      clearThrottleTimer();
      lastReloadAt = latest.current.now();
      catchupInFlight = true;
      void latest.current
        .reloadMessages()
        .catch(() => {})
        .finally(() => {
          catchupInFlight = false;
          if (disposed || latest.current.foregroundActive) return;
          if (pendingCatchup === PENDING_NONE) return;
          // 用**待处理信号**决定下一轮，而不是刚结束那轮的 immediate：
          // 在途期间收到的明确信号不能在 settle 后被降级成节流，反之亦然。
          if (pendingCatchup === PENDING_IMMEDIATE) {
            runCatchup(true);
            return;
          }
          const remainingMs =
            latest.current.reloadThrottleMs - (latest.current.now() - lastReloadAt);
          if (remainingMs <= 0) {
            runCatchup(false);
          } else {
            scheduleThrottleFlush(remainingMs);
          }
        });
    };

    const triggerCatchup = (immediate: boolean) => {
      if (disposed || latest.current.foregroundActive) return;
      if (catchupInFlight) {
        // 合并时保留最高优先级：在途期间的明确信号必须能把待处理状态升到立即。
        pendingCatchup = Math.max(
          pendingCatchup,
          immediate ? PENDING_IMMEDIATE : PENDING_THROTTLE,
        );
        return;
      }
      if (immediate) {
        runCatchup(true);
        return;
      }
      const remainingMs =
        latest.current.reloadThrottleMs - (latest.current.now() - lastReloadAt);
      if (remainingMs > 0) {
        pendingCatchup = Math.max(pendingCatchup, PENDING_THROTTLE);
        scheduleThrottleFlush(remainingMs);
        return;
      }
      runCatchup(false);
    };

    const onVisibilityChange = () => {
      if (disposed || latest.current.foregroundActive) return;
      const state = latest.current.readVisibilityState();
      if (state === "hidden") {
        if (hiddenSince === null) {
          hiddenSince = latest.current.now();
        }
        return;
      }
      if (state === "visible") {
        const currentTime = latest.current.now();
        const wasHiddenMs = hiddenSince !== null ? currentTime - hiddenSince : 0;
        // 明确信号：跟随中的 turn、隐藏期间重连过 —— 一定有内容要追，立即补读。
        // 仅"隐藏够久"属于推断信号，仍走 5s 节流，避免短切换放大读请求。
        const immediateCatchup = isFollowing || sawOnlineWhileHidden;
        const shouldCatchup =
          immediateCatchup || wasHiddenMs >= latest.current.hiddenThresholdMs;
        hiddenSince = null;
        sawOnlineWhileHidden = false;
        if (shouldCatchup) {
          triggerCatchup(immediateCatchup);
        }
      }
    };

    const onOnline = () => {
      if (disposed || latest.current.foregroundActive) return;
      if (latest.current.readVisibilityState() === "hidden") {
        sawOnlineWhileHidden = true;
        return;
      }
      // 网络刚恢复就是明确的追赶信号：不让用户等节流窗口。
      triggerCatchup(true);
    };

    const doc = documentTarget ?? defaultDocumentTarget();
    const win = windowTarget ?? defaultWindowTarget();
    doc?.addEventListener("visibilitychange", onVisibilityChange);
    win?.addEventListener("online", onOnline);

    const channel = `dialog-${dialogId}`;
    const unsubscribe = subscribe({
      key: `${server}:${channel}`,
      url: `${server}/api/events/${channel}`,
      headers: { Authorization: `Bearer ${token}` },
      onEvent: (event) => {
        if (disposed || latest.current.foregroundActive) return;
        if (event.type === "status" && event.status === "running") {
          terminalSeen = false;
          isFollowing = true;
          setFollowingDialog(dialogId);
        } else if (
          event.type === "done" || event.type === "failed" || event.type === "cancelled"
        ) {
          isFollowing = false;
          setFollowingDialog(null);
          if (terminalSeen) return;
          terminalSeen = true;
          pendingCatchup = PENDING_NONE;
          clearThrottleTimer();
          lastReloadAt = latest.current.now();
          // The normal dialog bootstrap/error surface remains authoritative.
          void latest.current
            .reloadMessages()
            .catch(() => {})
            .finally(() => {
              terminalSeen = false;
            });
        }
      },
    });
    return () => {
      disposed = true;
      pendingCatchup = PENDING_NONE;
      clearThrottleTimer();
      doc?.removeEventListener("visibilitychange", onVisibilityChange);
      win?.removeEventListener("online", onOnline);
      unsubscribe();
    };
  }, [dialogId, server, token, foregroundActive, subscribe, documentTarget, windowTarget, timers]);

  return !foregroundActive && followingDialog === dialogId && dialogId !== null;
}
