import { useEffect, useRef, useState } from "react";
import {
  classifyRevealTarget,
  nextRevealContent,
  REVEAL_TICK_MS,
} from "./streamingRevealCore";

export { splitVisibleCharacters } from "./streamingRevealCore";
export { REVEAL_TICK_MS };

/** Timer handle used by the streaming reveal animation. */
export type RevealTimerHandle = ReturnType<typeof setTimeout>;

/**
 * Injectable scheduler so tests can step reveal ticks deterministically
 * (no wall-clock sleeps). Defaults to the global timers in production.
 */
export type RevealScheduler = {
  setTimeout: (callback: () => void, ms: number) => RevealTimerHandle;
  clearTimeout: (handle: RevealTimerHandle) => void;
};

const defaultScheduler: RevealScheduler = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};

export type UseStreamingRevealOptions = {
  /**
   * Whether the segment is still streaming. While `false` the hook snaps the
   * visible projection straight to the canonical content (settled segments
   * never replay the typewriter and never animate edits).
   */
  active?: boolean;
  scheduler?: RevealScheduler;
  tickMs?: number;
};

/**
 * Reveals streaming content progressively while keeping the visible text
 * monotonic within one streaming segment.
 *
 * Design notes:
 * - Reveal is decoupled from the canonical value: `content` updates only
 *   refresh the target ref and (re)arm the loop. They never clear a pending
 *   tick and never reset already-revealed text — the old clear+restart-per-
 *   -change behaviour starved the timer under high-frequency chunks and kept
 *   the message blank.
 * - The loop self-schedules only while an append tail remains, so idle
 *   streaming messages cost no timers.
 * - All state mutations are guarded against unmount.
 */
export function useStreamingReveal(
  content: string,
  options?: UseStreamingRevealOptions
): string {
  const {
    active = true,
    scheduler = defaultScheduler,
    tickMs = REVEAL_TICK_MS,
  } = options ?? {};

  const [visibleContent, setVisibleContent] = useState(() =>
    active ? "" : content
  );
  const visibleRef = useRef(visibleContent);
  const targetRef = useRef(content);
  const timerRef = useRef<RevealTimerHandle | null>(null);
  const unmountedRef = useRef(false);

  // Latest-value refs: the pending tick reads these at run time, so passing a
  // fresh options object (or a new content value) every render never restarts
  // the animation lifecycle.
  const schedulerRef = useRef(scheduler);
  const tickMsRef = useRef(tickMs);
  const activeRef = useRef(active);
  schedulerRef.current = scheduler;
  tickMsRef.current = tickMs;
  activeRef.current = active;

  function commit(next: string) {
    if (unmountedRef.current) return;
    visibleRef.current = next;
    setVisibleContent(next);
  }

  function clearRevealTimer() {
    if (timerRef.current != null) {
      schedulerRef.current.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleRevealTick() {
    if (unmountedRef.current || timerRef.current != null) return;
    timerRef.current = schedulerRef.current.setTimeout(
      runRevealTick,
      tickMsRef.current
    );
  }

  function runRevealTick() {
    timerRef.current = null;
    if (unmountedRef.current) return;

    const target = targetRef.current;
    const visible = visibleRef.current;
    if (visible === target) return;

    const next = nextRevealContent(target, visible);
    if (next !== visible) commit(next);

    // Keep chasing only while an append tail remains. A frozen transient
    // shrink or a completed replacement goes idle until the next target
    // change re-arms the loop.
    if (next !== target && target.startsWith(next)) {
      scheduleRevealTick();
    }
  }

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      clearRevealTimer();
    };
  }, []);

  // Canonical updates: refresh the target only. Never clear a pending reveal
  // tick here — that is exactly what starved the previous implementation.
  useEffect(() => {
    targetRef.current = content;
    if (unmountedRef.current) return;

    if (!activeRef.current) {
      clearRevealTimer();
      if (visibleRef.current !== content) commit(content);
      return;
    }

    if (visibleRef.current === content) return;

    if (classifyRevealTarget(content, visibleRef.current) === "replace") {
      // Deliberate segment replacement: snap so canonical corrections surface
      // instead of hiding them behind a stale frozen prefix.
      clearRevealTimer();
      commit(content);
      return;
    }

    scheduleRevealTick();
  }, [content]);

  useEffect(() => {
    if (unmountedRef.current) return;
    const target = targetRef.current;
    if (!active) {
      clearRevealTimer();
      if (visibleRef.current !== target) commit(target);
      return;
    }
    if (visibleRef.current !== target) scheduleRevealTick();
  }, [active]);

  return visibleContent;
}
