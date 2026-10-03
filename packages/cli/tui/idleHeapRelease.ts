/**
 * Return freed JS heap pages to the OS once the TUI goes idle after a turn.
 *
 * Why: a turn allocates in bursts (streamed text, tool outputs, JSON
 * round-trips). After the burst the live JS heap drops back to ~18 MB, but
 * JavaScriptCore keeps the freed blocks mapped, so the process's private
 * memory stays at the burst's high-water mark (measured: ~70 MB baseline →
 * ~170–235 MB after one burst, held while idle). A full GC followed by
 * `Bun.shrink()` hands those pages back (measured: back to ~64 MB within
 * ~1 s, three bursts in a row).
 *
 * The release is debounced: back-to-back turns (queue drain, wake chains) only
 * trigger it once the user is actually idle, so the full GC never lands in the
 * middle of streaming output. Opt out with NOLO_TUI_IDLE_HEAP_RELEASE=0.
 *
 * Runtime dependency: `Bun.shrink()` is marked @deprecated in bun-types 1.4.2
 * but is the only call measured to actually return the pages (`Bun.gc(true)`
 * alone, `gcAggressionLevel(2)` and libc `malloc_trim(0)` left Pss_Anon
 * unchanged). If a future Bun removes it, the releaser degrades to a no-op
 * (no point paying for a GC that gives nothing back) and memory behaves as it
 * did before this module — re-measure and pick the replacement API then.
 */

export const IDLE_HEAP_RELEASE_DELAY_MS = 2_000;

type BunHeapApi = {
  gc?: (force?: boolean) => void;
  shrink?: () => void;
};

export type IdleHeapReleaser = {
  /** Call when a turn ends; (re)arms the debounced release. */
  schedule(): void;
  /** Call when a turn starts or the workspace exits; drops a pending release. */
  cancel(): void;
};

export function createIdleHeapReleaser(options: {
  env?: NodeJS.ProcessEnv;
  delayMs?: number;
  bun?: BunHeapApi | undefined;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
} = {}): IdleHeapReleaser {
  const env = options.env ?? process.env;
  const bun: BunHeapApi | undefined =
    "bun" in options ? options.bun : (globalThis as { Bun?: BunHeapApi }).Bun;
  const disabled =
    env.NOLO_TUI_IDLE_HEAP_RELEASE === "0" ||
    typeof bun?.gc !== "function" ||
    typeof bun?.shrink !== "function";
  if (disabled) return { schedule() {}, cancel() {} };

  const delayMs = options.delayMs ?? IDLE_HEAP_RELEASE_DELAY_MS;
  const setTimer =
    options.setTimer ??
    ((fn: () => void, ms: number) => {
      const handle = setTimeout(fn, ms);
      // Never keep the process alive just to release memory.
      (handle as { unref?: () => void }).unref?.();
      return handle;
    });
  const clearTimer =
    options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let pending: unknown = null;

  const release = () => {
    pending = null;
    try {
      bun!.gc!(true);
      bun!.shrink!();
    } catch {
      // Memory hygiene must never break the TUI.
    }
  };

  return {
    schedule() {
      if (pending !== null) clearTimer(pending);
      pending = setTimer(release, delayMs);
    },
    cancel() {
      if (pending === null) return;
      clearTimer(pending);
      pending = null;
    },
  };
}
