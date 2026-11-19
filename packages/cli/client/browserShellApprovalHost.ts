import { createBrowserShellApprovalBridge } from "./browserShellApprovalBridge";
import {
  createConnectorApprovalPort,
  getHostApprovalRenderer,
  type HostApprovalRenderer,
} from "./hostApprovalFlow";
import { createChromeConnectorClientResolver, type ChromeConnectorClient } from "../../desktop-chrome-connector/chromeConnector";
import { withShellChildEnvironment } from "../../agent-runtime/workspaceShell";
import { BROWSER_SHELL_BRIDGE_ENV } from "./browserShellApprovalClient";

export async function withBrowserShellApproval<T>(args: {
  /** Dedicated host approval renderer. Never falls back to generic ask_user / askChoice. */
  awaitHostApproval?: HostApprovalRenderer;
  client?: ChromeConnectorClient;
  signal?: AbortSignal;
}, run: () => Promise<T>): Promise<T> {
  const resolveRenderer = () => args.awaitHostApproval ?? getHostApprovalRenderer();
  // Fail closed without a dedicated approval UI: never bridge through generic askChoice,
  // and scrub any ambient outer NOLO_BROWSER_SHELL_BRIDGE so a child shell cannot inherit
  // an unrelated host's bridge transport.
  if (!resolveRenderer()) {
    return withShellChildEnvironment({ [BROWSER_SHELL_BRIDGE_ENV]: "" }, run);
  }
  const resolveClient = createChromeConnectorClientResolver();
  const bridges: Awaited<ReturnType<typeof createBrowserShellApprovalBridge>>[] = [];
  try {
    const transports: Record<string, unknown> = {};
    for (const browser of ["chrome", "firefox"] as const) {
      const client = () => args.client ?? resolveClient(browser);
      const bridge = await createBrowserShellApprovalBridge({
        browser,
        signal: args.signal,
        connector: createConnectorApprovalPort(client),
        executeInitial: async (call) => ({
          content: JSON.stringify({
            ok: true,
            result: await client().request(call.name, JSON.parse(call.arguments)),
          }),
        }),
        awaitHostApproval: async (card, signal) => {
          if (card.actionLabel !== "eval_script" && (!card.target?.trim() || card.target.trim() === "未命名控件")) {
            return "deny";
          }
          if (card.actionLabel === "eval_script" && !card.summary.trim()) {
            return "deny";
          }
          const renderer = resolveRenderer();
          if (!renderer || signal.aborted) return "unavailable";
          if (card.expiresAt <= Date.now()) return "expired";
          const result = await renderer(
            { ...card, browser },
            { requestId: card.approvalId, signal, expiresAt: card.expiresAt },
          );
          if (signal.aborted) return "cancelled";
          if (card.expiresAt <= Date.now()) return "expired";
          if (result === "allow_once" || result === "deny") return result;
          return result === "cancelled" || result === "expired" || result === "unavailable"
            ? result
            : "unavailable";
        },
      });
      bridges.push(bridge);
      transports[browser] = bridge.transport;
    }
    return await withShellChildEnvironment({ [BROWSER_SHELL_BRIDGE_ENV]: JSON.stringify(transports) }, run);
  } finally {
    await Promise.all(bridges.map((bridge) => bridge.close()));
  }
}
