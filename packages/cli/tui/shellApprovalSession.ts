import type { ShellApprovalConfirmation, ShellApprovalSession } from "../client/originShellApprovalTransport";
/** Serial modal ownership; aborts are scoped to the exact request, including queued requests. */
export function createShellApprovalSession(confirm: ShellApprovalSession["confirm"]) {
  let generation = new AbortController();
  let ended = false;
  let tail: Promise<unknown> = Promise.resolve();
  const session: ShellApprovalSession = {
    get signal() { return generation.signal; },
    confirm(request: ShellApprovalConfirmation, signal: AbortSignal) {
      const epoch = generation;
      const combined = AbortSignal.any([signal, epoch.signal]);
      const result = tail.then(async () => {
        if (ended || combined.aborted || request.expiresAt <= Date.now()) return false;
        const timeout = new AbortController();
        const timer = setTimeout(() => timeout.abort(), Math.max(0, request.expiresAt - Date.now()));
        const scoped = AbortSignal.any([combined, timeout.signal]);
        try { return await confirm(request, scoped) === true && !scoped.aborted && request.expiresAt > Date.now(); }
        finally { clearTimeout(timer); }
      });
      tail = result.catch(() => false);
      return result;
    },
  };
  return { session, revoke() { generation.abort(); generation = new AbortController(); if (ended) generation.abort(); },
    close() { ended = true; generation.abort(); } };
}
