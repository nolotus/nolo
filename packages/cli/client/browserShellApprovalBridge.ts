import { validateChromeConnectorPayload } from "../../desktop-chrome-connector/chromeConnector";
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { AgentRuntimeToolCallInput, AgentRuntimeToolResult } from "../../agent-runtime";
import {
  parsePendingApprovalResult,
  runConnectorToolWithHostApproval,
  withHostApprovalRequest,
  type HostApprovalConnector,
  type HostApprovalRenderer,
  type HostApprovalCard,
  type HostApprovalResult,
} from "./hostApprovalFlow";

export type BrowserShellApprovalRequest = { approvalId: string; browser: "chrome" | "firefox" };
export type BrowserShellApprovalOutcome =
  | "allowed"
  | "denied"
  | "cancelled"
  | "expired"
  | "unavailable";
export type BrowserShellApprovalReply = {
  status: "retry_once" | "blocked" | "rejected";
  outcome?: BrowserShellApprovalOutcome;
  code?: string;
};

const VALID_HOST_APPROVAL_RESULTS = new Set<HostApprovalResult>([
  "allow_once",
  "deny",
  "cancelled",
  "expired",
  "unavailable",
]);

function mapBlockedOutcome(code: unknown, hasRenderer: boolean): { outcome: BrowserShellApprovalOutcome; code: string } {
  switch (code) {
    case "USER_APPROVAL_CANCELLED":
      return { outcome: "cancelled", code: "USER_APPROVAL_CANCELLED" };
    case "USER_APPROVAL_EXPIRED":
      return { outcome: "expired", code: "USER_APPROVAL_EXPIRED" };
    case "USER_APPROVAL_UNAVAILABLE":
      return { outcome: "unavailable", code: "USER_APPROVAL_UNAVAILABLE" };
    case "USER_APPROVAL_DENIED":
      return { outcome: "denied", code: "USER_APPROVAL_DENIED" };
    default:
      return hasRenderer
        ? { outcome: "denied", code: typeof code === "string" && code ? code : "USER_APPROVAL_DENIED" }
        : { outcome: "unavailable", code: "USER_APPROVAL_UNAVAILABLE" };
  }
}

/** Per-execShell transport, not an approval credential. Never log or give it to the model. */
export type BrowserShellApprovalTransport = { endpoint: string; capability: string };

/**
 * Each host-observed operation has its own binding, claim and decision. Loopback TCP is supported on
 * Bun's Windows/macOS/Linux runtimes without filesystem socket cleanup. This is not a
 * security boundary against malicious code running as the same OS user.
 *
 * Integration MUST route the original connector operation through prepare() using the
 * host's executeInitial port. A child-supplied pending ID alone can never arm this bridge.
 * executeInitial must use the same browser/connector as connector, not parse shell output.
 * CLI must retain its original immutable action/payload and consume retry_once once; this
 * primitive never reruns a shell command or the browser action. Call close() on shell exit.
 */
export async function createBrowserShellApprovalBridge(args: {
  browser: "chrome" | "firefox";
  connector: HostApprovalConnector;
  executeInitial(call: AgentRuntimeToolCallInput): Promise<AgentRuntimeToolResult>;
  awaitHostApproval?: (card: HostApprovalCard, signal: AbortSignal) => ReturnType<HostApprovalRenderer>;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  const timeoutMs = args.timeoutMs ?? 60_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) throw new Error("Invalid bridge timeout");
  if (args.signal?.aborted) throw new Error("Browser approval bridge aborted");
  const capability = randomBytes(32).toString("hex");
  const deadline = Date.now() + timeoutMs;
  const lifetime = new AbortController();
  let preparing = false;
  type Binding = { call: AgentRuntimeToolCallInput; pending: AgentRuntimeToolResult; approvalId: string; tabId: string; claimed: boolean };
  // Keep claimed IDs until shell end: a later operation must never revive an old approval.
  const bindings = new Map<string, Binding>();
  let closing: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout>;
  const terminalOutcome = () => Date.now() >= deadline
    ? { outcome: "expired", code: "USER_APPROVAL_EXPIRED" } as const
    : { outcome: "cancelled", code: "USER_APPROVAL_CANCELLED" } as const;
  const active = () => !lifetime.signal.aborted && Date.now() < deadline;
  const requireActive = () => { if (!active()) throw new Error("Browser approval bridge revoked"); };
  const server = createServer(async (request, response) => {
    const reply = (
      status: BrowserShellApprovalReply["status"],
      result?: unknown,
      extra?: Pick<BrowserShellApprovalReply, "outcome" | "code">,
    ) => {
      if (!response.destroyed && !response.writableEnded) {
        response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        response.end(JSON.stringify({
          status,
          ...(extra?.outcome ? { outcome: extra.outcome } : {}),
          ...(extra?.code ? { code: extra.code } : {}),
          ...(result === undefined ? {} : { result }),
        }));
      }
    };
    const revoke = () => reply("blocked", undefined, terminalOutcome());
    try {
      const authorization = request.headers.authorization ?? "";
      const expected = `Bearer ${capability}`;
      if (!active() || request.method !== "POST" || request.url !== "/approval" ||
        authorization.length !== expected.length ||
        !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))) return reply("rejected");
      response.on("close", () => {
        lifetime.signal.removeEventListener("abort", revoke);
        if (!response.writableEnded) void close();
      });
      lifetime.signal.addEventListener("abort", revoke, { once: true });
      response.setTimeout(timeoutMs + 5_000);
      let body = "";
      for await (const chunk of request) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 65536) return reply("rejected");
      }
      const input = JSON.parse(body);
      if (request.url === "/approval" && input?.op === "prepare") {
        if (Object.keys(input).sort().join(",") !== "action,browser,op,payload" || input.browser !== args.browser ||
          !["eval_script", "click", "type", "press", "set_select_value"].includes(input.action) ||
          !input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) return reply("rejected");
        validateChromeConnectorPayload(input.action, input.payload);
        const result = await prepare({ id: "browser-shell", name: input.action, arguments: JSON.stringify(input.payload) });
        return reply("blocked", JSON.parse(result.content));
      }
      const binding = typeof input?.approvalId === "string" ? bindings.get(input.approvalId) : undefined;
      if (!input || typeof input !== "object" || Array.isArray(input) ||
        Object.keys(input).sort().join(",") !== "approvalId,browser" ||
        input.browser !== args.browser || typeof input.approvalId !== "string" ||
        !binding || input.approvalId !== binding.approvalId || binding.claimed || !active()) return reply("rejected");
      binding.claimed = true; // Claim synchronously before any list/UI await; duplicates cannot queue decisions.
      const current = binding;
      let calls = 0;
      let retry = false;
      const flowResult = await runConnectorToolWithHostApproval({
        call: current.call,
        signal: lifetime.signal,
        execute: async () => {
          requireActive();
          if (calls++ === 0) return current.pending;
          retry = true;
          return { content: "{}" };
        },
        connector: {
          listPendingApprovals: async () => {
            requireActive();
            const cards = await args.connector.listPendingApprovals();
            requireActive();
            return cards.filter(card => card.approvalId === current.approvalId && card.tabId === current.tabId);
          },
          submitApprovalDecision: async (id, decision) => {
            requireActive();
            // UI may resolve after expiry. Never send its stale positive answer to the connector.
            const cards = await args.connector.listPendingApprovals();
            requireActive();
            const card = cards.find(item => item.approvalId === current.approvalId);
            if (id !== current.approvalId || !card || card.tabId !== current.tabId || card.expiresAt <= Date.now()) return { failed: "USER_APPROVAL_EXPIRED" };
            return args.connector.submitApprovalDecision(id, decision);
          },
        },
        ...(args.awaitHostApproval ? { awaitHostApproval: async (card: HostApprovalCard) => {
          requireActive();
          const decision = await new Promise<HostApprovalResult>((resolve, reject) => {
            const abort = () => reject(new Error("Browser approval bridge revoked"));
            lifetime.signal.addEventListener("abort", abort, { once: true });
            Promise.resolve().then(() => {
              requireActive();
              return args.awaitHostApproval!(card, lifetime.signal);
            }).then(resolve, reject).finally(() => lifetime.signal.removeEventListener("abort", abort));
          });
          requireActive();
          // Preserve all typed host approval terminal states so hostApprovalFlow can revoke
          // negative outcomes cleanly and surface distinct audit/UI codes; still fail closed
          // for malformed external values.
          if (!VALID_HOST_APPROVAL_RESULTS.has(decision)) throw new Error("Invalid host decision");
          return decision;
        } } : {}),
      });
      if (active() && retry) {
        reply("retry_once", undefined, { outcome: "allowed" });
      } else {
        const metaCode = (flowResult.metadata as { code?: unknown } | undefined)?.code;
        reply("blocked", undefined, mapBlockedOutcome(Date.now() >= deadline ? "USER_APPROVAL_EXPIRED" : metaCode, Boolean(args.awaitHostApproval)));
      }
    } catch {
      reply("blocked", undefined, lifetime.signal.aborted || Date.now() >= deadline
        ? terminalOutcome()
        : { outcome: "unavailable", code: "USER_APPROVAL_UNAVAILABLE" });
    }
  });
  server.requestTimeout = timeoutMs;
  server.headersTimeout = timeoutMs;
  const onAbort = () => { void close(); };
  function close(): Promise<void> {
    if (closing) return closing;
    closing = new Promise(resolve => {
      // Abort synchronously revokes approval and writes terminal replies. Drain them before closing
      // active sockets; keep a short bound for peers that never finish sending or reading.
      lifetime.abort();
      clearTimeout(timer);
      args.signal?.removeEventListener("abort", onAbort);
      bindings.clear();
      const forceClose = setTimeout(() => server.closeAllConnections(), 1_000);
      server.close(() => { clearTimeout(forceClose); resolve(); });
      server.closeIdleConnections();
    });
    return closing;
  }
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { server.removeListener("error", reject); resolve(); });
  });
  const address = server.address();
  if (!address || typeof address === "string") { await close(); throw new Error("No local bridge address"); }
  timer = setTimeout(onAbort, Math.max(1, deadline - Date.now()));
  args.signal?.addEventListener("abort", onAbort, { once: true });
  if (args.signal?.aborted) await close();
  async function prepare(call: AgentRuntimeToolCallInput): Promise<AgentRuntimeToolResult> {
      requireActive();
      if (preparing) throw new Error("Another browser operation is preparing");
      // Bound memory without evicting replay protection. Ordinary operations consume no slot.
      if (bindings.size >= 256) throw new Error("Browser approval binding limit reached");
      preparing = true;
      try {
      const snapshot = { ...call };
      const payload = JSON.parse(snapshot.arguments);
      if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        "approvalId" in payload || typeof payload.tabId !== "string" || !payload.tabId || payload.tabId === "active") {
        throw new Error("Bridge requires an unapproved action with a resolved tabId");
      }
      const result = await args.executeInitial(withHostApprovalRequest(snapshot));
      requireActive();
      const pending = parsePendingApprovalResult(result);
      if (pending) {
        if (bindings.has(pending.approvalId)) {
          // A connector identity collision cannot leave the earlier binding approvable.
          bindings.get(pending.approvalId)!.claimed = true;
          throw new Error("Connector reused an approvalId");
        }
        bindings.set(pending.approvalId, { call: snapshot, pending: result, approvalId: pending.approvalId, tabId: payload.tabId, claimed: false });
      }
      return result;
      } finally { preparing = false; }
  }
  return {
    transport: { endpoint: `http://127.0.0.1:${address.port}/approval`, capability } satisfies BrowserShellApprovalTransport,
    /** Host-only: observes the real initial connector result; never accepts an ID from the child. */
    prepare,
    close,
  };
}
