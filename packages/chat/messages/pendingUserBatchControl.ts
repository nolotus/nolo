import { getRuntimeServerContext } from "database/runtimeServerContext";
import { resolveUserAuthorityServer } from "database/authority/userAuthorityRegistry";
import { waitForWriteAck } from "database/actions/writeAck";
import type { Message } from "./types";

export type UserBatchReceipt = {
  batchId: string; messageIds: string[]; owner: "client" | "server";
  token: string; phase: "admitted" | "requested";
};

// A logged-out/local runtime must never turn an account dialog into local-only.
export const isLocalUserBatch = (dialogKey: string) => dialogKey.startsWith("dialog-local-");

export function userBatchControl(state: any, dialogKey: string) {
  const context = getRuntimeServerContext(state);
  const userId = context.currentUserId;
  if (!userId || userId === "local" || !dialogKey.startsWith(`dialog-${userId}-`) || !context.currentToken) {
    throw new Error("User batch authority requires the owning account and token; unsent messages retained");
  }
  const server = resolveUserAuthorityServer({ ownerUserId: userId, registry: context.userAuthorityRegistry }) ?? context.currentServer;
  if (!server) throw new Error("User batch authority unavailable; unsent messages retained");
  const dialogId = dialogKey.slice(`dialog-${userId}-`.length);
  const call = async (body: Record<string, unknown>) => {
    // No retry: requested may commit even if its response is lost.
    let response: Response;
    try {
      response = await fetch(`${server.replace(/\/$/, "")}/api/agent/turns/control`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${context.currentToken}` },
        body: JSON.stringify({ ...body, dialogId }),
      });
    } catch {
      throw new Error("User batch authority network failure; messages retained, provider not retried");
    }
    let result: any;
    try { result = await response.json(); }
    catch { throw new Error("User batch authority response unreadable; messages retained, provider not retried"); }
    if (!result || typeof result !== "object") throw new Error("User batch authority response invalid; messages retained, provider not retried");
    if (!response.ok || result.ok !== true) throw new Error(`User batch authority: ${result.error?.message ?? response.status}`);
    return result.data;
  };
  return {
    call,
    async publish(message: Message) {
      if (message.userId !== userId) throw new Error("User batch message belongs to another account");
      await waitForWriteAck(message.dbKey, { targetServer: server });
      // ACK timeout/unknown is not proof of server presence. Idempotent enqueue
      // publishes the complete original durable row before claim, never a projection.
      return (await call({ action: "enqueue", message })).message as Message;
    },
  };
}

export function readClientReceipt(value: any, ids: string[], ordered = false): UserBatchReceipt {
  if (!value || value.owner !== "client" || typeof value.batchId !== "string" || !value.batchId ||
      typeof value.token !== "string" || !value.token || !Array.isArray(value.messageIds) ||
      value.messageIds.length !== ids.length || new Set(value.messageIds).size !== ids.length ||
      ids.some(id => !value.messageIds.includes(id)) || (ordered && ids.some((id, i) => value.messageIds[i] !== id)) || !["admitted", "requested"].includes(value.phase)) {
    throw new Error("Invalid or foreign user batch receipt; automatic resubmission blocked");
  }
  return value;
}
