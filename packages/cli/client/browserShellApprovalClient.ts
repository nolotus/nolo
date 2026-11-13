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
    const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${transport.capability}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60_000), redirect: "error" });
    if (!response.ok) throw new Error("Browser host unavailable");
    return await response.json() as any;
  };
  const payload = structuredClone(args.payload);
  const prepared = await send({ op: "prepare", action: args.action, browser: args.browser, payload });
  const result = prepared.result?.result;
  if (!result) throw new Error("Browser host rejected original action");
  if (result.code !== "USER_APPROVAL_PENDING") return result;
  const decision = await send({ approvalId: result.approvalId, browser: args.browser });
  if (decision.status !== "retry_once") return { ...result, message: "Host approval was not granted; action not executed." };
  return args.execute(args.action, { ...payload, approvalId: result.approvalId, hostApproval: true });
}
