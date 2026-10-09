import { getForegroundExecutionClientState } from "ai/agent/foregroundExecutionClientState";

/**
 * Best-effort RPC to signal the server to stop a running foreground turn.
 * Does not throw and does not surface UI errors/toasts.
 *
 * executionId is sent whenever the client has observed the server-owned
 * execution identity. Older callers do not need to be rewritten: if they omit
 * executionId this helper resolves it from the shared client execution cache.
 */
export async function stopForegroundTurnOnServer(args: {
  server: string;
  token: string;
  dialogId: string;
  executionId?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; status?: string; code?: string }> {
  try {
    const fetchFn = args.fetchImpl ?? fetch;
    const origin = String(args.server).replace(/\/+$/, "");
    const executionId =
      args.executionId ??
      getForegroundExecutionClientState(args.dialogId)?.executionId;

    const response = await fetchFn(`${origin}/api/agent/turns/control`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.token}`,
      },
      body: JSON.stringify({
        action: "stop",
        dialogId: args.dialogId,
        ...(executionId ? { executionId } : {}),
      }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      // A transport-level success/failure is still useful even without JSON.
    }

    if (!response.ok) {
      return {
        ok: false,
        status: data?.data?.status,
        code: data?.error?.code,
      };
    }

    return {
      ok: true,
      status: data?.data?.status,
      code: data?.data?.code,
    };
  } catch {
    return { ok: false };
  }
}
