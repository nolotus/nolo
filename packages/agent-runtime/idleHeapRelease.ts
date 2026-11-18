/**
 * Return freed JS heap pages to the OS once a turn or stream workload goes idle.
 *
 * Why: a turn/stream allocates in bursts (streamed text, tool outputs, JSON
 * round-trips). After the burst the live JS heap drops back, but JavaScriptCore
 * keeps the freed blocks mapped, so private memory stays at the high-water mark.
 * A full GC followed by `Bun.shrink()` hands those pages back to the OS.
 *
 * The release is debounced: back-to-back turns or overlapping streams only
 * trigger it once the host is actually idle, so the full GC never lands in the
 * middle of streaming output. Callers can pass a runtime-specific `disableEnvVar`
 * (e.g. `NOLO_TUI_IDLE_HEAP_RELEASE=0`, `NOLO_DESKTOP_IDLE_HEAP_RELEASE=0`,
 * `NOLO_SERVER_IDLE_HEAP_RELEASE=0`).
 *
 * Runtime dependency: `Bun.shrink()` is marked @deprecated in bun-types 1.4.2
 * but is the only call measured to actually return the pages (`Bun.gc(true)`
 * alone, `gcAggressionLevel(2)` and libc `malloc_trim(0)` left Pss_Anon
 * unchanged). If a future Bun removes it, the releaser degrades to a no-op
 * and memory behaves as it did before this module.
 */

export const IDLE_HEAP_RELEASE_DELAY_MS = 2_000;

export type BunHeapApi = {
  gc?: (force?: boolean) => void;
  shrink?: () => void;
};

export type IdleHeapReleaser = {
  /** Call when a turn or stream batch goes idle; (re)arms the debounced release. */
  schedule(): void;
  /** Call when new work starts or the host exits; drops a pending release. */
  cancel(): void;
};

export type IdleHeapReleaseOptions = {
  env?: NodeJS.ProcessEnv;
  disableEnvVar?: string;
  bun?: BunHeapApi | undefined;
};

export type CreateIdleHeapReleaserOptions = IdleHeapReleaseOptions & {
  delayMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

function isIdleHeapReleaseDisabled(
  env: NodeJS.ProcessEnv | undefined,
  disableEnvVar: string,
): boolean {
  return env?.[disableEnvVar] === "0";
}

/**
 * Return freed JS heap pages to the OS immediately: Bun.gc(true) + Bun.shrink().
 * Safe to call in any environment (swallows errors, no-op if unsupported or disabled).
 */
export function releaseHeapPages(options: IdleHeapReleaseOptions = {}): void {
  const env = options.env ?? process.env;
  const disableEnvVar = options.disableEnvVar ?? "NOLO_TUI_IDLE_HEAP_RELEASE";
  if (isIdleHeapReleaseDisabled(env, disableEnvVar)) return;
  const bun: BunHeapApi | undefined =
    "bun" in options ? options.bun : (globalThis as { Bun?: BunHeapApi }).Bun;
  if (typeof bun?.gc !== "function" || typeof bun?.shrink !== "function") return;
  try {
    bun.gc(true);
    bun.shrink();
  } catch {
    // Memory hygiene must never break the host process.
  }
}

export function createIdleHeapReleaser(
  options: CreateIdleHeapReleaserOptions = {},
): IdleHeapReleaser {
  const disableEnvVar = options.disableEnvVar ?? "NOLO_TUI_IDLE_HEAP_RELEASE";
  const hasExplicitEnv = "env" in options;
  const bun: BunHeapApi | undefined =
    "bun" in options ? options.bun : (globalThis as { Bun?: BunHeapApi }).Bun;
  const disabledAtCreation =
    (hasExplicitEnv && isIdleHeapReleaseDisabled(options.env, disableEnvVar)) ||
    typeof bun?.gc !== "function" ||
    typeof bun?.shrink !== "function";
  if (disabledAtCreation) return { schedule() {}, cancel() {} };

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
    options.clearTimer ??
    ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let pending: unknown = null;

  const currentEnv = () => (hasExplicitEnv ? options.env : process.env);

  const cancel = () => {
    if (pending === null) return;
    clearTimer(pending);
    pending = null;
  };

  const release = () => {
    pending = null;
    releaseHeapPages({ env: currentEnv(), disableEnvVar, bun });
  };

  return {
    schedule() {
      if (isIdleHeapReleaseDisabled(currentEnv(), disableEnvVar)) {
        cancel();
        return;
      }
      if (pending !== null) clearTimer(pending);
      pending = setTimer(release, delayMs);
    },
    cancel,
  };
}
