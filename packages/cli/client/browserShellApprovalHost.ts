import { createBrowserShellApprovalBridge } from "./browserShellApprovalBridge";
import { createConnectorApprovalPort } from "./hostApprovalFlow";
import { createChromeConnectorClientResolver, type ChromeConnectorClient } from "../../desktop-chrome-connector/chromeConnector";
import { withShellChildEnvironment } from "../../agent-runtime/workspaceShell";
import { BROWSER_SHELL_BRIDGE_ENV } from "./browserShellApprovalClient";
import type { UserChoiceRequest, UserChoiceResult } from "./localRuntimeAdapterTypes";

export async function withBrowserShellApproval<T>(args: {
  requestUserChoice?: (request: UserChoiceRequest) => Promise<UserChoiceResult>;
  client?: ChromeConnectorClient;
  signal?: AbortSignal;
}, run: () => Promise<T>): Promise<T> {
  if (!args.requestUserChoice) return run();
  const resolveClient = createChromeConnectorClientResolver();
  const bridges: Awaited<ReturnType<typeof createBrowserShellApprovalBridge>>[] = [];
  try {
    const transports: Record<string, unknown> = {};
    for (const browser of ["chrome", "firefox"] as const) {
      const client = () => args.client ?? resolveClient(browser);
      const bridge = await createBrowserShellApprovalBridge({ browser, signal: args.signal,
        connector: createConnectorApprovalPort(client),
        executeInitial: async call => ({ content: JSON.stringify({ ok: true, result: await client().request(call.name, JSON.parse(call.arguments)) }) }),
        awaitHostApproval: async (card, signal) => {
          if (card.actionLabel !== "eval_script" && (!card.target?.trim() || card.target.trim() === "未命名控件")) return "deny";
          if (card.actionLabel === "eval_script" && !card.summary.trim()) return "deny";
          const tab = (card as typeof card & { tabId?: string }).tabId;
          const approvalText = `Browser action requires one-time approval\nAction/risk: ${card.actionLabel} (may change page or external state)\nBrowser: ${browser}\nTab: ${tab ?? "unknown"}\nOrigin: ${card.origin}\nTarget: ${card.target ?? "script in the bound tab"}\nScript/option summary:\n${card.summary}\nExpires: ${new Date(card.expiresAt).toISOString()}`;
          const result = await args.requestUserChoice!({
            question: "Approve this browser action once?",
            approvalDisplay: { kind: "browser-approval", text: approvalText },
            choices: [{ label: "Allow once", userMessage: "browser-allow-once" }, { label: "Deny", userMessage: "browser-deny" }],
            blocking: true,
            signal,
          });
          return !signal.aborted && result.kind === "selected" && result.userMessage === "browser-allow-once" ? "allow_once" : "deny";
        },
      });
      bridges.push(bridge);
      transports[browser] = bridge.transport;
    }
    return await withShellChildEnvironment({ [BROWSER_SHELL_BRIDGE_ENV]: JSON.stringify(transports) }, run);
  } finally {
    await Promise.all(bridges.map(bridge => bridge.close()));
  }
}
