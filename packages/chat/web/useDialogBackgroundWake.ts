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
    let pendingCatchup = false;
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
        if (disposed || latest.current.foregroundActive || !pendingCatchup) return;
        triggerCatchup();
      }, Math.max(0, delayMs));
    };

    const runCatchup = () => {
      pendingCatchup = false;
      clearThrottleTimer();
      lastReloadAt = latest.current.now();
      catchupInFlight = true;
      void latest.current
        .reloadMessages()
        .catch(() => {})
        .finally(() => {
          catchupInFlight = false;
          if (disposed || latest.current.foregroundActive || !pendingCatchup) return;
          const remainingMs =
            latest.current.reloadThrottleMs - (latest.current.now() - lastReloadAt);
          if (remainingMs <= 0) {
            runCatchup();
          } else {
            scheduleThrottleFlush(remainingMs);
          }
        });
    };

    const triggerCatchup = () => {
      if (disposed || latest.current.foregroundActive) return;
      if (catchupInFlight) {
        pendingCatchup = true;
        return;
      }
      const remainingMs =
        latest.current.reloadThrottleMs - (latest.current.now() - lastReloadAt);
      if (remainingMs > 0) {
        pendingCatchup = true;
        scheduleThrottleFlush(remainingMs);
        return;
      }
      runCatchup();
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
        const shouldCatchup =
          isFollowing ||
          sawOnlineWhileHidden ||
          wasHiddenMs >= latest.current.hiddenThresholdMs;
        hiddenSince = null;
        sawOnlineWhileHidden = false;
        if (shouldCatchup) {
          triggerCatchup();
        }
      }
    };

    const onOnline = () => {
      if (disposed || latest.current.foregroundActive) return;
      if (latest.current.readVisibilityState() === "hidden") {
        sawOnlineWhileHidden = true;
        return;
      }
      triggerCatchup();
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
          pendingCatchup = false;
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
      pendingCatchup = false;
      clearThrottleTimer();
      doc?.removeEventListener("visibilitychange", onVisibilityChange);
      win?.removeEventListener("online", onOnline);
      unsubscribe();
    };
  }, [dialogId, server, token, foregroundActive, subscribe, documentTarget, windowTarget, timers]);

  return !foregroundActive && followingDialog === dialogId && dialogId !== null;
}
