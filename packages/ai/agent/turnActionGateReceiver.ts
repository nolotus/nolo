import { clearGateTurn, pushGate } from "app/utils/desktopActionGateChannel";
import { messageStreaming, removeTransientMessage } from "chat/messages/messageSlice";
import { createDialogMessageKeyAndId } from "database/keys";

export function createTurnActionGateReceiver(
  dispatch: (action: ReturnType<typeof messageStreaming> | ReturnType<typeof removeTransientMessage>) => unknown,
  foregroundMessageId?: string,
) {
  // Host-generated scope, never taken from the SSE payload.
  const turnId = createDialogMessageKeyAndId("secret-gate").messageId;
  const secretGateAnchors = new Set<string>();
  let cleared = false;

  function receiveActionGate(
    gate: Parameters<typeof pushGate>[0],
    target: Parameters<typeof pushGate>[1],
    dialogId: string,
  ) {
    if (cleared) return;
    const secret = gate.kind === "input" && (gate.payload as { action?: unknown } | undefined)?.action === "secret_request";
    if (!secret || target?.kind === "local") {
      // Bind ordinary Web confirmations to this turn without adding a message row.
      pushGate(gate, target, foregroundMessageId ? { dialogId, turnId, messageId: foregroundMessageId } : undefined);
      return;
    }
    const { messageId, key } = createDialogMessageKeyAndId(dialogId);
    secretGateAnchors.add(messageId);
    pushGate(gate, target, { dialogId, turnId, messageId });
    dispatch(messageStreaming({ id: messageId, dbKey: key, dialogId, role: "tool",
      toolName: "secret-request", content: "", isStreaming: true }));
  }

  function clearActionGates() {
    if (cleared) return;
    cleared = true;
    clearGateTurn(turnId);
    for (const id of secretGateAnchors) dispatch(removeTransientMessage(id));
  }

  return { receiveActionGate, clearActionGates };
}
