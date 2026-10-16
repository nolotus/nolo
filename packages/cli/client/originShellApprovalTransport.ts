import { realpathSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { ExecShellApprovalAuthority } from "../../agent-runtime/capabilities/capability";
import { createOriginShellApprovalBridge, type OriginShellApprovalBinding } from "./originShellApprovalBridge";

/** Private inherited IPC, not a queue, run record, environment grant or model API.
 * Same-UID processes/debuggers are NOT isolated by this channel. The host owns
 * binding and confirm; only the minimum display projection crosses into UI.
 */
export type ShellApprovalConfirmation = OriginShellApprovalBinding & {
  command: string;
  toolName: "execShell";
  expiresAt: number;
  permissionNotice: string;
};
export type ShellApprovalHost = {
  binding: OriginShellApprovalBinding;
  confirm(request: ShellApprovalConfirmation, signal: AbortSignal): Promise<boolean>;
  signal: AbortSignal;
};
export type ShellApprovalSession = Pick<ShellApprovalHost, "confirm" | "signal">;
type Channel = {
  connected?: boolean;
  send?: (message: any) => unknown;
  on(event: string, listener: (...args: any[]) => void): unknown;
  removeListener(event: string, listener: (...args: any[]) => void): unknown;
};
const KIND = "nolo.shell-approval.v1";
const MAX = 256;
const TTL = 60_000;
const NOTICE = "Executes with this local user's reachable permissions; workspace is NOT a directory sandbox.";
function payloadCall(payload: string, binding: OriginShellApprovalBinding) {
  if (typeof payload !== "string" || payload.length > 262144) throw new Error("Invalid approval payload");
  const execution = JSON.parse(JSON.parse(payload).binding);
  if (execution.workspaceRoot !== binding.workspaceRoot || typeof execution.input?.command !== "string") {
    throw new Error("Approval binding mismatch");
  }
  return { ...binding, toolName: "execShell", command: execution.input.command, executionPayload: payload };
}
function send(channel: Channel, message: object) {
  if (channel.connected === false || !channel.send) throw new Error("Approval channel disconnected");
  channel.send({ kind: KIND, ...message });
}

/** Call immediately after spawn, before yielding; lifetime is the parent session AND child. */
export function attachShellApprovalHost(channel: Channel, host: ShellApprovalHost): () => void {
  const binding = Object.freeze({ ...host.binding });
  const bridge = createOriginShellApprovalBridge({ binding, resolveWorkspace: realpathSync });
  let closed = false;
  let count = 0;
  const active = new Set<AbortController>();
  const close = () => {
    if (closed) return;
    closed = true;
    bridge.revoke();
    for (const controller of active) controller.abort();
    active.clear();
    try { send(channel, { type: "revoke" }); } catch { /* already disconnected */ }
    channel.removeListener("message", receive);
    channel.removeListener("disconnect", close);
    channel.removeListener("exit", close);
    channel.removeListener("error", close);
    host.signal.removeEventListener("abort", close);
  };
  const receive = (message: any) => {
    if (closed || message?.kind !== KIND) return;
    if (message.type === "hello") {
      try { send(channel, { type: "binding", binding }); } catch { close(); }
      return;
    }
    if (message.type !== "request") return;
    if (++count > MAX || typeof message.id !== "string" || message.id.length > 100) { close(); return; }
    const id = message.id;
    void (async () => {
      let controller: AbortController | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        if (message.runId !== binding.runId) throw new Error("Wrong run");
        const call = payloadCall(message.payload, binding);
        const pending = bridge.request(call);
        if (!pending.ok) throw new Error("Request refused");
        controller = new AbortController();
        active.add(controller);
        const cancelled = new Promise<boolean>((resolve) => {
          controller!.signal.addEventListener("abort", () => resolve(false), { once: true });
        });
        timer = setTimeout(() => controller!.abort(), Math.max(0, pending.request.expiresAt - Date.now()));
        const approved = await Promise.race([
          host.confirm({ ...binding, toolName: "execShell", command: call.command,
            expiresAt: pending.request.expiresAt, permissionNotice: NOTICE }, controller.signal), cancelled,
        ]);
        if (closed || controller.signal.aborted || approved !== true) throw new Error("Not approved");
        const decided = bridge.decide(pending.request.requestId, call, "approve");
        const consumed = decided.ok && bridge.consume(pending.request.requestId, call);
        if (!consumed || !consumed.ok) throw new Error("Approval expired");
        send(channel, { type: "decision", id, runId: binding.runId, approved: true,
          ticket: pending.request.requestId, expiresAt: pending.request.expiresAt });
      } catch {
        // No payload, argv, inherited environment, or exception text in logs/UI.
        try { if (!closed) send(channel, { type: "decision", id, runId: binding.runId, approved: false }); } catch { close(); }
      } finally {
        if (timer) clearTimeout(timer);
        if (controller) { controller.abort(); active.delete(controller); }
      }
    })();
  };
  channel.on("message", receive);
  channel.on("disconnect", close);
  channel.on("exit", close);
  channel.on("error", close);
  host.signal.addEventListener("abort", close, { once: true });
  if (host.signal.aborted) close();
  return close;
}

/** Child-local single-use synchronous cache; disconnect/revoke clears all authority. */
export function createShellApprovalChild(channel: Channel, timeoutMs = TTL): {
  authority: ExecShellApprovalAuthority; close(): void;
} {
  let closed = false;
  let binding: OriginShellApprovalBinding | undefined;
  let count = 0;
  const pending = new Map<string, { payload: string; resolve(ticket: string): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
  const tickets = new Map<string, { payload: string; expiresAt: number }>();
  const close = () => {
    if (closed) return;
    closed = true;
    tickets.clear();
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error("Shell approval revoked")); }
    pending.clear();
    channel.removeListener("message", receive);
    channel.removeListener("disconnect", close);
  };
  const receive = (message: any) => {
    if (closed || message?.kind !== KIND) return;
    if (message.type === "revoke") { close(); return; }
    if (message.type === "binding") {
      if (binding) { close(); return; }
      binding = Object.freeze({ ...message.binding });
      return;
    }
    if (message.type !== "decision") return;
    const entry = pending.get(message.id);
    if (!entry) return; // unknown/replayed responses cannot create authority
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (!binding || message.runId !== binding.runId || message.approved !== true ||
        typeof message.ticket !== "string" || !Number.isFinite(message.expiresAt) ||
        message.expiresAt <= Date.now() || message.expiresAt > Date.now() + TTL || tickets.has(message.ticket)) {
      entry.reject(new Error("Shell approval denied")); return;
    }
    tickets.set(message.ticket, { payload: entry.payload, expiresAt: message.expiresAt });
    entry.resolve(message.ticket);
  };
  channel.on("message", receive);
  channel.on("disconnect", close);
  try { send(channel, { type: "hello" }); } catch { close(); }
  return {
    close,
    authority: {
      async request(payload) {
        // Binding handshake is asynchronous. A bounded wait avoids granting from env/run records.
        if (++count > MAX) throw new Error("Shell approval capacity exceeded");
        const deadline = Date.now() + Math.min(timeoutMs, TTL);
        while (!binding && !closed && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 5));
        if (closed || !binding) throw new Error("Shell approval unavailable");
        payloadCall(payload, binding);
        const id = randomUUID();
        return new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => { pending.delete(id); reject(new Error("Shell approval timeout")); }, Math.min(timeoutMs, TTL));
          pending.set(id, { payload, resolve, reject, timer });
          try { send(channel, { type: "request", id, runId: binding!.runId, payload }); }
          catch { close(); }
        });
      },
      consume(ticket, payload) {
        const entry = tickets.get(ticket);
        tickets.delete(ticket);
        if (closed || channel.connected === false || !binding || !entry || entry.payload !== payload || entry.expiresAt <= Date.now()) {
          throw new Error("Shell approval invalid or revoked");
        }
        payloadCall(payload, binding);
      },
    },
  };
}
