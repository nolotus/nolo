import { randomUUID, createHash } from "node:crypto";
import type { McpExecutionBridgeDependencies } from "../../agent-runtime/mcpExecutionBridge";
import type { OriginShellApprovalBinding } from "../client/originShellApprovalBridge";
import { bindInheritedApprovalLifetime, sendInheritedApproval, type InheritedApprovalChannel } from "../client/inheritedApprovalChannel";
export type McpConfirmation = McpExecutionBridgeDependencies["confirm"];
export type McpApprovalHost = { binding: OriginShellApprovalBinding; confirm: (preview: Preview, signal: AbortSignal, context?: { runId: string; requestId: string }) => ReturnType<McpConfirmation>; signal: AbortSignal };
const KIND = "nolo.mcp-approval.v1";
const TTL = 60_000;
const MAX = 256;
type Preview = Parameters<McpConfirmation>[0];
// Match MCP's argument canonicalization; the parent never trusts a child-supplied digest alone.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function snapshot(preview: Preview) { return createHash("sha256").update(JSON.stringify(preview)).digest("hex"); }
function valid(preview: Preview, binding: OriginShellApprovalBinding) {
  const b = preview?.binding;
  return b && b.authenticatedUserId === binding.ownerUserId && b.agentKey === binding.agentKey &&
    typeof b.dialogId === "string" && b.dialogId.length > 0 && b.placement?.kind === "local" &&
    typeof b.connectionId === "string" && Number.isInteger(b.connectionRevision) && b.connectionRevision > 0 &&
    typeof b.catalogRevision === "string" && typeof b.toolName === "string" && /^[a-f0-9]{64}$/.test(b.argumentsDigest) &&
    preview.arguments && typeof preview.arguments === "object" && !Array.isArray(preview.arguments) &&
    createHash("sha256").update(canonical(preview.arguments)).digest("hex") === b.argumentsDigest &&
    Number.isFinite(preview.expiresAt) && preview.expiresAt > Date.now() && preview.expiresAt <= Date.now() + TTL;
}
/** Only the actual ChildProcess from spawn is attached; run/agent/owner come from the parent. */
export function attachMcpApprovalHost(channel: InheritedApprovalChannel, host: McpApprovalHost) {
  const binding = Object.freeze({ ...host.binding });
  let closed = false;
  let count = 0;
  const seen = new Set<string>();
  const active = new Map<string, AbortController>();
  const send = (message: object) => sendInheritedApproval(channel, KIND, message, close);
  let unbind = () => {};
  const close = () => {
    if (closed) return;
    closed = true;
    for (const controller of active.values()) controller.abort();
    active.clear();
    sendInheritedApproval(channel, KIND, { type: "revoke" }, () => {});
    channel.removeListener("message", receive);
    unbind();
  };
  const receive = (m: any) => {
    if (closed || m?.kind !== KIND) return;
    if (m.type === "hello") { send({ type: "binding", binding }); return; }
    if (m.type === "cancel") { active.get(m.id)?.abort(); return; }
    if (m.type !== "request") return;
    if (++count > MAX || typeof m.id !== "string" || seen.has(m.id)) { close(); return; }
    seen.add(m.id);
    let preview: Preview;
    try {
      if (typeof m.snapshot !== "string" || JSON.stringify(m.preview).length > 262144) throw new Error("invalid preview");
      preview = structuredClone(m.preview);
      if (m.runId !== binding.runId || !valid(preview, binding) || snapshot(preview) !== m.snapshot) throw new Error("binding mismatch");
    } catch { send({ type: "decision", id: m.id, runId: binding.runId, snapshot: m.snapshot, decision: "deny" }); return; }
    const controller = new AbortController();
    active.set(m.id, controller);
    const timer = setTimeout(() => controller.abort(), Math.max(0, preview.expiresAt - Date.now()));
    // Abort races even a renderer that ignores its context; late answers cannot revive this request.
    void new Promise<"approve" | "deny" | "unavailable">((resolve) => {
      controller.signal.addEventListener("abort", () => resolve("deny"), { once: true });
      Promise.resolve().then(() => closed || controller.signal.aborted ? "deny" as const : host.confirm(preview, controller.signal, { runId: binding.runId, requestId: m.id }))
        .then(resolve, () => resolve("unavailable"));
    }).then(decision => {
      clearTimeout(timer);
      active.delete(m.id);
      if (!closed) send({ type: "decision", id: m.id, runId: binding.runId, snapshot: m.snapshot,
        decision: !controller.signal.aborted && Date.now() < preview.expiresAt ? decision : "deny" });
    });
  };
  channel.on("message", receive);
  unbind = bindInheritedApprovalLifetime(channel, close, host.signal);
  if (host.signal.aborted || channel.connected === false) close();
  return close;
}
/** Presentation reply only. MCP oneShotApproval, not this IPC message, authorizes execution. */
export function createMcpApprovalChild(channel: InheritedApprovalChannel) {
  const lifetime = new AbortController();
  let binding: OriginShellApprovalBinding | undefined;
  let count = 0;
  let closed = false;
  const pending = new Map<string, { finish(value: "approve" | "deny" | "unavailable"): void; snapshot: string; expiresAt: number }>();
  const readyResolvers = new Set<() => void>();
  let unbind = () => {};
  const close = () => {
    if (closed) return;
    closed = true;
    lifetime.abort();
    for (const entry of pending.values()) entry.finish("unavailable");
    for (const resolve of readyResolvers) resolve();
    readyResolvers.clear();
    channel.removeListener("message", receive);
    unbind();
  };
  const send = (message: object) => sendInheritedApproval(channel, KIND, message, close);
  const receive = (m: any) => {
    if (closed || m?.kind !== KIND) return;
    if (m.type === "revoke") { close(); return; }
    if (m.type === "binding") {
      if (binding || !m.binding || typeof m.binding.runId !== "string" || typeof m.binding.ownerUserId !== "string" || typeof m.binding.agentKey !== "string") { close(); return; }
      binding = Object.freeze({ ...m.binding });
      for (const resolve of readyResolvers) resolve();
      readyResolvers.clear();
      return;
    }
    if (m.type !== "decision") return;
    const entry = pending.get(m.id);
    if (!entry) return;
    const matches = binding && m.runId === binding.runId && m.snapshot === entry.snapshot && Date.now() < entry.expiresAt;
    entry.finish(!matches ? "deny" : m.decision === "approve" ? "approve" : m.decision === "unavailable" ? "unavailable" : "deny");
  };
  channel.on("message", receive);
  unbind = bindInheritedApprovalLifetime(channel, close);
  send({ type: "hello" });
  const confirm: McpConfirmation = async (input, signal) => {
    if (closed || signal.aborted || ++count > MAX) return "unavailable";
    if (!binding) await new Promise<void>(resolve => {
      const done = () => { clearTimeout(timer); readyResolvers.delete(done); signal.removeEventListener("abort", done); resolve(); };
      const timer = setTimeout(done, Math.max(0, Math.min(TTL, input.expiresAt - Date.now())));
      readyResolvers.add(done);
      signal.addEventListener("abort", done, { once: true });
    });
    if (closed || !binding) return "unavailable";
    if (signal.aborted || !valid(input, binding)) return "deny";
    const preview = structuredClone(input), id = randomUUID(), digest = snapshot(preview);
    return new Promise(resolve => {
      const abort = () => { send({ type: "cancel", id }); finish("deny"); };
      const timer = setTimeout(abort, Math.max(0, preview.expiresAt - Date.now()));
      const finish = (value: "approve" | "deny" | "unavailable") => {
        if (!pending.delete(id)) return;
        clearTimeout(timer); signal.removeEventListener("abort", abort); resolve(value);
      };
      pending.set(id, { finish, snapshot: digest, expiresAt: preview.expiresAt });
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
      else send({ type: "request", id, runId: binding!.runId, snapshot: digest, preview });
    });
  };
  return { confirm, signal: lifetime.signal, close };
}
