import type { ChromeConnectorRequestPayload } from "../../desktop-chrome-connector/chromeConnector";
export const BROWSER_SHELL_BRIDGE_ENV = "NOLO_BROWSER_SHELL_BRIDGE";
export async function requestBrowserShellAction(args: {
  browser: "chrome" | "firefox"; action: string; payload: ChromeConnectorRequestPayload;
  env: Record<string, string | undefined>;
  execute(action: string, payload: ChromeConnectorRequestPayload): Promise<unknown>;
}): Promise<unknown> {
  const raw = args.env[BROWSER_SHELL_BRIDGE_ENV];
  if (!raw || !["eval_script", "click", "type", "press", "set_select_value"].includes(args.action)) {
    return args.execute(args.action, args.payload);
  }
  // A present but stale/invalid host transport is a failure, never permission to fall back.
  const transports = JSON.parse(raw);
  const transport = transports[args.browser];
  const url = new URL(transport.endpoint);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.pathname !== "/approval" || url.username || url.password) throw new Error("Invalid browser host transport");
  const send = async (body: unknown) => {
    // The host owns the 60 s approval deadline; allow its terminal reply to arrive first.
    const signal = AbortSignal.timeout(65_000);
    try {
      const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${transport.capability}`, "content-type": "application/json" }, body: JSON.stringify(body), signal, redirect: "error" });
      if (!response.ok) throw new Error(`Browser approval host returned HTTP ${response.status}`);
      return await response.json() as any;
    } catch (cause) {
      const code = signal.aborted ? "USER_APPROVAL_TIMEOUT" : "USER_APPROVAL_UNAVAILABLE";
      throw Object.assign(new Error("No reply from the browser approval host. Check that the host is connected and verify the tab state before requesting fresh approval.", { cause }), { code });
    }
  };
  const payload = structuredClone(args.payload);
  const prepared = await send({ op: "prepare", action: args.action, browser: args.browser, payload });
  const result = prepared.result?.result;
  if (!result) {
    throw Object.assign(new Error("Browser approval host rejected the original action. Request a fresh approval if you still need this action."), {
      code: prepared.code ?? "USER_APPROVAL_UNAVAILABLE",
    });
  }
  if (result.code !== "USER_APPROVAL_PENDING") return result;
  const decision = await send({ approvalId: result.approvalId, browser: args.browser });
  if (decision.status !== "retry_once") {
    const code = typeof decision.code === "string" && decision.code ? decision.code : "USER_APPROVAL_DENIED";
    const outcome = typeof decision.outcome === "string" && decision.outcome ? decision.outcome : "denied";
    return {
      ...result,
      ok: false,
      code,
      outcome,
      message: "Host approval was not granted; action not executed.",
    };
  }
  return args.execute(args.action, { ...payload, approvalId: result.approvalId, hostApproval: true });
}
