import { buildDialogKey, dialogMessageKey } from "database/dialogKey";
import { dialogOwnerKey, registerDialogOwner } from "database-engine/dialogOwner";
import { isTombstoneRecord } from "database/tombstones";
import { resolveWorkContextAccess } from "../../ai/memory/vnext/workContextAccess";
import { dialogTurnUserMessageId } from "../../agent-runtime/dialogHistoryOrder";
import type { AgentRuntimeSaveTurnInput } from "../agentRuntimeLocal";
import type { HybridRecordStore } from "./hybridRecordStore";
import { buildLocalDialogWritePlan } from "./localDialogRecords";

interface ResolvePersistedTurnUserMessageInput {
  store: Pick<HybridRecordStore, "read">;
  userId: string;
  dialogId: string;
  batchMessageIds?: readonly string[];
  userMessages?: readonly { cliMessageId?: string }[];
}

/** The host chooses the candidate; the local store must prove its provenance. */
export async function resolvePersistedTurnUserMessageId(input: ResolvePersistedTurnUserMessageInput): Promise<string | undefined> {
  const { store, dialogId, userId, userMessages, batchMessageIds } = input;
  if (userMessages && userMessages.length !== 1) return undefined;
  if (batchMessageIds && batchMessageIds.length !== 1) return undefined;
  const candidate = userMessages ? userMessages[0]?.cliMessageId : batchMessageIds?.[0];
  if (!candidate || (batchMessageIds && batchMessageIds[0] !== candidate)) return undefined;
  try {
    await resolveWorkContextAccess({ get: (key: string) => store.read(key, { remote: false }) }, userId, dialogId, candidate);
    return candidate;
  } catch {
    return undefined;
  }
}

/** Persist exactly the same sanitized direct user row/id that saveTurn will use.
 * This is not a completed turn, queue receipt, or sync request. */
export async function persistDirectWorkMemorySource(args: {
  store: HybridRecordStore;
  userId: string;
  dialogId: string;
  turnId: string;
  freshDialog: boolean;
  input: Pick<AgentRuntimeSaveTurnInput, "agentKey" | "spaceId" | "category" | "parentDialogId" | "inheritedFromDialogKey" | "runtimeContext">;
  message: AgentRuntimeSaveTurnInput["messages"][number];
}): Promise<string | undefined> {
  const { store, userId, dialogId, turnId, message } = args;
  if (!userId || userId === "server" || !/^[A-Za-z0-9_-]{1,128}$/.test(dialogId)) return undefined;
  const id = dialogTurnUserMessageId(turnId, 0);
  if (!id || message.role !== "user" || message.id !== id || typeof message.content !== "string") return undefined;
  const dialogKey = buildDialogKey(userId, dialogId);
  const messageKey = dialogMessageKey(dialogId, id);
  const existingDialog = await store.read(dialogKey, { remote: false });
  if (existingDialog) {
    await resolveWorkContextAccess({ get: async () => existingDialog }, userId, dialogId);
  } else if (!args.freshDialog) {
    return undefined;
  }
  const existingMessage = await store.read(messageKey, { remote: false });
  if (!existingMessage) {
    const { ops } = buildLocalDialogWritePlan({
      input: { ...args.input, continueDialogId: dialogId, messages: [message], result: { content: "", model: "" } },
      userId, now: Date.now(), createId: () => dialogId, existingDialog,
    });
    const userOp = ops.find(op => op.key === messageKey && op.value.role === "user");
    const dialogOp = ops.find(op => op.key === dialogKey);
    if (!userOp || !dialogOp) return undefined;
    // A new dialog needs its header before access can be proven. Do not set
    // completion fields until the actual turn save, or update an existing header.
    const { status, finishedAt, ...openDialog } = dialogOp.value;
    if (!existingDialog) {
      // Match pending-user writes: register before publishing the header, and
      // never overwrite an existing owner. The helper logs failures, so read
      // back the binding before creating a dialog for this source.
      await registerDialogOwner({
        store: {
          get: key => store.read(key, { remote: false }),
          put: (key, value) => store.batch([{ type: "put", key, value }]),
        },
        dialogId, ownerId: userId, spaceId: args.input.spaceId, source: "cli-work-memory-source",
      });
      const owner = await store.read(dialogOwnerKey(dialogId), { remote: false });
      if (owner?.dialogId !== dialogId || owner.ownerId !== userId) return undefined;
      // The owner registration is an await boundary. If another writer has
      // already created a header, validate it instead of replacing it.
      const currentDialog = await store.read(dialogKey, { remote: false });
      if (currentDialog) {
        await resolveWorkContextAccess({ get: async () => currentDialog }, userId, dialogId);
        await store.batch([userOp]);
      } else {
        await store.batch([{ ...dialogOp, value: openDialog }, userOp]);
      }
    } else {
      await store.batch([userOp]);
    }
  }
  const persisted = await store.read(messageKey, { remote: false });
  if (!persisted || isTombstoneRecord(persisted) || persisted.content !== message.content) return undefined;
  return resolvePersistedTurnUserMessageId({ store, userId, dialogId, userMessages: [{ cliMessageId: id }] });
}
