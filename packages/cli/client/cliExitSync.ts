import { AsyncLocalStorage } from "node:async_hooks";
import type { CliFetchImpl } from "../cliFetch";

type Entry = { watermark: number; httpOkRecords: number; controller: AbortController; state: "pending" | "completed" | "failed" | "timeout"; failureClass?: string; done: Promise<unknown> };
type Scope = { entries: Entry[]; closed: boolean; output: {write(text: string): unknown}; timeoutMs: number; drain?: Promise<boolean>; watchdogExit?: Promise<void> };
const scopes = new AsyncLocalStorage<Scope>();

/**
 * 远端同步失败只回填**已知协议错误码**，未知值一律退回 `http_<status>`。
 *
 * 不用「字符形状」判定安全性：`{"reason":"<任意短 token>"}` 同样能通过
 * `[A-Za-z0-9_.:-]{1,48}`，等于把凭据片段写进诊断日志（这是真实 review 反例）。
 * 白名单是唯一能保证不泄露远端内容的边界。
 */
const KNOWN_SYNC_FAILURE_CODES = new Set([
  "owner_mismatch",
  "owner_origin_mismatch",
  "owner_grant_revoked",
  "owner_oauth_unavailable",
  "invalid_grant",
  "auth_no_token",
  "token_expired",
  "user_batch_authority_controlled",
  "tombstone_conflict",
]);

const SYNC_FAILURE_CODE_RE = /"(?:code|error|reason)"\s*:\s*"([A-Za-z0-9_.:-]{1,48})"/;

/** Safe classification only: never emit remote bodies, credentials, or message text. */
export function classifyDialogSyncFailure(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") return "aborted";
  if (error instanceof Error && error.name === "TimeoutError") return "timeout";
  const match = error instanceof Error
    ? /^remote dialog evidence write failed: HTTP (\d{3})\b([\s\S]*)$/.exec(error.message)
    : null;
  if (!match) return "transport_or_sync";
  const candidate = SYNC_FAILURE_CODE_RE.exec(match[2] ?? "")?.[1]?.toLowerCase();
  const code = candidate && KNOWN_SYNC_FAILURE_CODES.has(candidate) ? candidate : undefined;
  return code ? `http_${match[1]}(${code})` : `http_${match[1]}`;
}

/** Register before I/O; HTTP success counts include evidence and parent-wake record writes, not storage proof. */
export function startOwnedDialogSync(fetchImpl: CliFetchImpl, start: (fetch: CliFetchImpl) => Promise<unknown>): Promise<unknown> {
  const scope = scopes.getStore();
  if (!scope) return start(fetchImpl);
  if (scope.closed) return Promise.reject(new Error("dialog_sync_scope_closed"));
  const entry: Entry = {watermark: scope.entries.length + 1, httpOkRecords: 0, controller: new AbortController(), state: "pending", done: Promise.resolve()};
  scope.entries.push(entry);
  const trackedFetch: CliFetchImpl = async (url, init) => {
    entry.controller.signal.throwIfAborted();
    const signal = init?.signal ? AbortSignal.any([init.signal, entry.controller.signal]) : entry.controller.signal;
    const response = await fetchImpl(url, {...init, signal});
    signal.throwIfAborted();
    if (response.ok && String(url).includes("/api/v1/db/write/")) entry.httpOkRecords++;
    return response;
  };
  entry.done = Promise.resolve().then(() => start(trackedFetch)).then(result => {
    if (entry.state === "pending") entry.state = "completed";
    return result;
  }, error => {
    if (entry.state === "pending") {entry.state = "failed"; entry.failureClass = classifyDialogSyncFailure(error);}
    throw error;
  });
  void entry.done.catch(() => {});
  return entry.done;
}

function drain(scope: Scope, unsafeRunner = false): Promise<boolean> {
  if (scope.drain) return scope.drain;
  scope.closed = true;
  scope.drain = (async () => {
    const entries = scope.entries.slice();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abortPending = (classification: string) => {
      for (const entry of entries) if (entry.state === "pending") {
        entry.state = "timeout"; entry.failureClass = classification;
        entry.controller.abort(new Error("dialog_sync_drain_stopped"));
      }
    };
    try {
      if (unsafeRunner) abortPending("runner_not_stopped");
      else if (entries.length) await Promise.race([
        Promise.allSettled(entries.map(entry => entry.done)),
        new Promise<void>(resolve => {timer = setTimeout(() => {abortPending("timeout"); resolve();}, scope.timeoutMs);}),
      ]);
    } finally {if (timer) clearTimeout(timer);}
    const failed = entries.filter(entry => entry.state !== "completed");
    for (const entry of failed) scope.output.write(`[nolo] dialog_sync ${entry.state}: watermark=${entry.watermark} httpOkRecords=${entry.httpOkRecords} class=${entry.failureClass ?? entry.state}; local history retained; remote sync incomplete.\n`);
    return failed.length === 0;
  })();
  return scope.drain;
}

/** Watchdog must stop execution before allowing a bounded drain. No-scope callers retain hard exit. */
export function exitCliFromWatchdog(code: number, exit: (code: number) => unknown, stopRunner: () => Promise<boolean>): Promise<void> {
  const scope = scopes.getStore();
  if (!scope) {exit(code); return Promise.resolve();}
  if (scope.watchdogExit) return scope.watchdogExit;
  scope.closed = true; // No new owned sync after watchdog's stop boundary.
  scope.watchdogExit = (async () => {
    let stopped = false;
    try {stopped = await stopRunner();} catch { /* hard exit remains mandatory */ }
    if (!stopped) scope.output.write("[nolo] dialog_sync failed: class=runner_not_stopped; cancelling pending sync before hard exit.\n");
    const complete = await drain(scope, !stopped);
    exit(code === 0 || !complete ? 1 : code);
  })();
  return scope.watchdogExit;
}

/** Production command exit boundary; one drain shared by normal, throw and watchdog paths. */
export async function runCliCommandWithSyncDrain(command: () => Promise<number>, options: {exit: (code: number) => unknown; output: {write(text: string): unknown}; timeoutMs?: number}): Promise<void> {
  const timeoutMs = Number.isFinite(options.timeoutMs) && (options.timeoutMs ?? 0) > 0 ? options.timeoutMs! : 15_000;
  await scopes.run({entries: [], closed: false, output: options.output, timeoutMs}, async () => {
    const scope = scopes.getStore()!;
    let code = 70; let commandError: unknown; let commandThrew = false;
    try {code = await command();} catch (error) {commandThrew = true; commandError = error;}
    if (scope.watchdogExit) {await scope.watchdogExit; if (commandThrew) throw commandError; return;}
    const complete = await drain(scope);
    if (commandThrew) throw commandError;
    await options.exit(code === 0 && !complete ? 1 : code);
  });
}
