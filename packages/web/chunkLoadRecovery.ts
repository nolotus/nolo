import { compactWhitespace } from "core/compactWhitespace";

export const CHUNK_LOAD_RELOAD_STORAGE_PREFIX = "nolo:chunk-load-reload:";
/** Query param used once to bypass intermediate caches after a deploy asset mismatch. */
export const CHUNK_LOAD_CACHE_BUST_PARAM = "noloAssetCb";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type RecoveryEnv = {
  location?: Pick<Location, "href" | "pathname" | "search" | "hash" | "reload" | "assign">;
  sessionStorage?: StorageLike;
};

const recoveredChunkSignatures = new Set<string>();

const CHUNK_LOAD_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk [\w-]+ failed/i,
  /chunkloaderror/i,
];

const readErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown; reason?: unknown };
    if (typeof maybeError.message === "string") return maybeError.message;
    if (typeof maybeError.reason === "string") return maybeError.reason;
    if (maybeError.reason instanceof Error) {
      return `${maybeError.reason.name}: ${maybeError.reason.message}`;
    }
  }
  return "";
};

const createChunkErrorSignature = (error: unknown): string =>
  compactWhitespace(readErrorMessage(error)).slice(0, 300);

export const isChunkLoadError = (error: unknown): boolean => {
  const message = readErrorMessage(error);
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

/**
 * Build a same-path URL with a one-shot cache-bust query so the next load
 * fetches fresh HTML/entry after a deploy (old tab → new hashed chunks 404).
 */
export const buildChunkRecoveryHref = (
  location: Pick<Location, "pathname" | "search" | "hash">,
  nowMs: number = Date.now()
): string => {
  const params = new URLSearchParams(
    location.search.startsWith("?") ? location.search.slice(1) : location.search
  );
  params.set(CHUNK_LOAD_CACHE_BUST_PARAM, String(nowMs));
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash || ""}`;
};

export const maybeRecoverFromChunkLoadError = (
  error: unknown,
  env: RecoveryEnv = {
    location: typeof window !== "undefined" ? window.location : undefined,
    sessionStorage: typeof window !== "undefined" ? window.sessionStorage : undefined,
  }
): boolean => {
  if (!isChunkLoadError(error)) return false;

  const signature = createChunkErrorSignature(error);
  if (!signature || !env.location) return false;

  const storageKey = `${CHUNK_LOAD_RELOAD_STORAGE_PREFIX}${signature}`;
  try {
    if (env.sessionStorage?.getItem(storageKey)) return false;
    env.sessionStorage?.setItem(storageKey, String(Date.now()));
  } catch {
    if (recoveredChunkSignatures.has(signature)) return false;
    recoveredChunkSignatures.add(signature);
  }

  // Prefer hard navigation with cache-bust over soft reload: after deploy the
  // open tab often holds HTML that points at retired chunk hashes. Soft reload
  // can re-serve the same stale document from memory/bfcache and hang the
  // topbar for a long time while Suspense waits on a 404 module.
  try {
    const href = buildChunkRecoveryHref(env.location);
    if (typeof env.location.assign === "function") {
      env.location.assign(href);
    } else if (typeof env.location.reload === "function") {
      env.location.reload();
    } else {
      return false;
    }
  } catch {
    try {
      env.location.reload?.();
    } catch {
      return false;
    }
  }
  return true;
};

export const installChunkLoadRecovery = (win: Window = window): (() => void) => {
  const recover = (error: unknown): boolean =>
    maybeRecoverFromChunkLoadError(error, {
      location: win.location,
      sessionStorage: win.sessionStorage,
    });

  const onError = (event: ErrorEvent) => {
    const error = event.error ?? event.message;
    if (recover(error)) {
      event.preventDefault();
    }
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (recover(event.reason)) {
      event.preventDefault();
    }
  };

  win.addEventListener("error", onError);
  win.addEventListener("unhandledrejection", onUnhandledRejection);

  return () => {
    win.removeEventListener("error", onError);
    win.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
};
