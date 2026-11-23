import { useLayoutEffect, useRef, useState } from "react";
import type { useWebMediaSource } from "./useWebMediaSrc";

type Source = ReturnType<typeof useWebMediaSource>;
type Resume = { time: number; playing: boolean; rate: number };

/** Keep a working media element on its current URL. A fresh URL is only applied
 * after a read failure, or before an explicit seek that may need fresh bytes. */
export function useStableMediaPlayback(source: Source, player: React.RefObject<HTMLMediaElement | null>) {
  const [active, setActive] = useState<{ identity: object; url: string }>();
  const [unavailable, setUnavailable] = useState(false);
  const scope = useRef<{ identity: object; resume?: Resume; playing: boolean; lastTime: number; failed: Set<string>; busy: boolean } | null>(null);
  const url = active?.identity === source.identity ? active.url : source.src;

  useLayoutEffect(() => {
    const current = { identity: source.identity, playing: false, lastTime: 0, failed: new Set<string>(), busy: false };
    scope.current = current;
    setUnavailable(false);
    return () => { if (scope.current === current) scope.current = null; };
  }, [source.identity]);

  useLayoutEffect(() => {
    if (source.src && active?.identity !== source.identity) setActive({ identity: source.identity, url: source.src });
  }, [active, source.identity, source.src]);



  useLayoutEffect(() => {
    const current = scope.current;
    if (!current?.resume || !unavailable || !source.src || source.src === url || current.failed.has(source.src)) return;
    setUnavailable(false);
    setActive({ identity: source.identity, url: source.src });
  }, [source.identity, source.src, unavailable, url]);

  function replace(next: string, resume: Resume) {
    const current = scope.current;
    if (!current || current.identity !== source.identity) return;
    current.resume = resume;
    setUnavailable(false);
    setActive({ identity: source.identity, url: next });
  }

  async function recover() {
    const el = player.current;
    const current = scope.current;
    if (!el || !url || !current || current.busy || current.identity !== source.identity) return;
    const resume = current.resume ?? { time: el.currentTime || current.lastTime, playing: current.playing || !el.paused, rate: el.playbackRate };
    current.resume = resume;
    current.failed.add(url);
    current.busy = true;
    setUnavailable(true);
    try {
      const cached = await source.getFresh();
      const next = cached && !current.failed.has(cached) ? cached : await source.refresh();
      if (scope.current !== current || !next || current.failed.has(next)) return;
      replace(next, resume);
    } finally {
      current.busy = false;
    }
  }

  async function prepareSeek(time: number) {
    const current = scope.current;
    const el = player.current;
    const next = await source.getFresh();
    if (!current || scope.current !== current || !el || player.current !== el) return "unavailable" as const;
    if (next && next !== url) {
      replace(next, { time, playing: true, rate: el.playbackRate });
      return "switching" as const;
    }
    if (el.error && url) {
      const fresh = await source.refresh();
      if (scope.current !== current) return "unavailable" as const;
      if (fresh && fresh !== url) {
        replace(fresh, { time, playing: true, rate: el.playbackRate });
        return "switching" as const;
      }
      return "unavailable" as const;
    }
    return url ? "ready" as const : "unavailable" as const;
  }

  return {
    src: url,
    unavailable,
    prepareSeek,
    events: {
      onTimeUpdate: () => {
        if (scope.current && player.current && !player.current.error && !scope.current.resume) scope.current.lastTime = player.current.currentTime;
      },
      onPlay: () => { if (scope.current) scope.current.playing = true; },
      onPause: () => { if (scope.current && !player.current?.error && !scope.current.resume) scope.current.playing = false; },
      onLoadedMetadata: () => {
        const el = player.current;
        const current = scope.current;
        if (!el || !current?.resume) return;
        const { time, playing, rate } = current.resume;
        current.resume = undefined;
        el.currentTime = Number.isFinite(el.duration) ? Math.min(time, el.duration) : time;
        el.playbackRate = rate;
        current.lastTime = el.currentTime;
        if (playing) void el.play().catch(() => { if (scope.current === current) setUnavailable(true); });
      },
      onError: () => { void recover(); },
    },
  };
}
