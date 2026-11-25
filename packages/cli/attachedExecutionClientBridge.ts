/**
 * CLI-side WebSocket bridge between `machineWsSession` and `AttachedExecutionHost`.
 *
 * Keeps the transport layer thin and decoupled from TUI/turn execution:
 * - Routes inbound `execution.command`, `execution.attached`, and `execution.error`
 *   frames without disturbing existing `tool.invoke` or `agent.run` messages.
 * - Forwards validated `execution.command` frames to the bound `AttachedExecutionHost`
 *   and immediately sends the resulting durable `ExecutionCommandReceipt` back over WS.
 * - Provides `attach`, `emitEvent`, and `startHeartbeat` helpers that enforce
 *   `validateExecutionAttachmentFrame` before sending.
 */
import {
  EXECUTION_ATTACHMENT_LIMITS,
  matchesExecutionIdentity,
  validateExecutionAttachmentFrame,
  type ExecutionAttach,
  type ExecutionAttached,
  type ExecutionCommand,
  type ExecutionCommandReceipt,
  type ExecutionEvent,
  type ExecutionEventData,
  type ExecutionHeartbeat,
  type ExecutionIdentity,
} from "../shared/contracts/executionAttachment";
import type { AttachedExecutionHost } from "./tui/attachedExecutionHost";

export type AttachedExecutionWsSender = (message: string) => void;

export interface AttachedExecutionHostBinding {
  identity: ExecutionIdentity;
  host: AttachedExecutionHost;
}

export interface AttachedExecutionErrorFrame {
  type: "execution.error";
  code: string;
  dialogKey?: string;
}

export interface AttachedExecutionClientBridgeOptions {
  /** Default timeout for `attach()` waiting on `execution.attached`. */
  attachTimeoutMs?: number;
  /** Optional observer for `execution.error` frames or protocol drops. */
  onError?: (error: AttachedExecutionErrorFrame) => void;
}

export interface AttachedExecutionClientBridge {
  registerHost(binding: AttachedExecutionHostBinding): void;
  unregisterHost(dialogKey: string, executionId?: string): boolean;
  getBinding(dialogKey: string): AttachedExecutionHostBinding | undefined;
  attach(
    request: ExecutionAttach,
    send: AttachedExecutionWsSender,
    options?: { timeoutMs?: number },
  ): Promise<ExecutionAttached>;
  emitEvent(
    identity: ExecutionIdentity,
    seq: number,
    event: ExecutionEventData,
    send: AttachedExecutionWsSender,
  ): ExecutionEvent;
  startHeartbeat(args: {
    identity: ExecutionIdentity;
    getSeq: () => number;
    send: AttachedExecutionWsSender;
    intervalMs?: number;
  }): () => void;
  /**
   * Demux handler for `machineWsSession` / `handleMachineWsMessageDemux`.
   * Returns `true` if the frame belongs to the `execution.*` namespace (handled
   * or safely dropped), and `false` for all other messages so downstream handlers
   * (`tool.invoke`, `agent.run`, etc.) continue untouched.
   */
  handleWsMessage(rawMessage: string, send: AttachedExecutionWsSender): Promise<boolean>;
  dispose(): void;
}

const DEFAULT_ATTACH_TIMEOUT_MS = 10_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 10_000;
const encoder = new TextEncoder();

interface PendingAttach {
  dialogKey: string;
  resolve: (frame: ExecutionAttached) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

function makeRejectedReceipt(
  command: ExecutionCommand,
  code: string,
): ExecutionCommandReceipt {
  return {
    type: "execution.command.receipt",
    dialogKey: command.dialogKey,
    runId: command.runId,
    executionId: command.executionId,
    hostSessionId: command.hostSessionId,
    machineId: command.machineId,
    leaseEpoch: command.leaseEpoch,
    commandId: command.commandId,
    kind: command.kind,
    stage: "rejected",
    code,
  };
}

export function createAttachedExecutionClientBridge(
  options: AttachedExecutionClientBridgeOptions = {},
): AttachedExecutionClientBridge {
  const defaultAttachTimeoutMs = options.attachTimeoutMs ?? DEFAULT_ATTACH_TIMEOUT_MS;
  const bindings = new Map<string, AttachedExecutionHostBinding>();
  const pendingAttaches = new Map<string, PendingAttach>();
  const activeHeartbeats = new Set<() => void>();

  const clearPendingAttach = (dialogKey: string): PendingAttach | undefined => {
    const entry = pendingAttaches.get(dialogKey);
    if (!entry) return undefined;
    clearTimeout(entry.timer);
    pendingAttaches.delete(dialogKey);
    return entry;
  };

  return {
    registerHost(binding) {
      bindings.set(binding.identity.dialogKey, {
        identity: Object.freeze(structuredClone(binding.identity)),
        host: binding.host,
      });
    },

    unregisterHost(dialogKey, executionId) {
      const current = bindings.get(dialogKey);
      if (!current) return false;
      if (executionId !== undefined && current.identity.executionId !== executionId) {
        return false;
      }
      return bindings.delete(dialogKey);
    },

    getBinding(dialogKey) {
      return bindings.get(dialogKey);
    },

    attach(request, send, attachOptions) {
      const checked = validateExecutionAttachmentFrame(request);
      if (!checked.ok || checked.value.type !== "execution.attach") {
        return Promise.reject(new Error(`invalid_execution_attach:${checked.ok ? "wrong_type" : checked.error}`));
      }
      const frame = checked.value;
      const previous = clearPendingAttach(frame.dialogKey);
      if (previous) {
        previous.reject(new Error("execution_attach_superseded"));
      }
      const timeoutMs = attachOptions?.timeoutMs ?? defaultAttachTimeoutMs;
      return new Promise<ExecutionAttached>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingAttaches.delete(frame.dialogKey);
          reject(new Error("execution_attach_timeout"));
        }, timeoutMs);
        pendingAttaches.set(frame.dialogKey, {
          dialogKey: frame.dialogKey,
          resolve,
          reject,
          timer,
        });
        try {
          send(JSON.stringify(frame));
        } catch (error) {
          clearPendingAttach(frame.dialogKey);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    },

    emitEvent(identity, seq, event, send) {
      const frame: ExecutionEvent = {
        ...identity,
        type: "execution.event",
        seq,
        event,
      };
      const checked = validateExecutionAttachmentFrame(frame);
      if (!checked.ok || checked.value.type !== "execution.event") {
        throw new Error(`invalid_execution_event:${checked.ok ? "wrong_type" : checked.error}`);
      }
      send(JSON.stringify(checked.value));
      return checked.value;
    },

    startHeartbeat({ identity, getSeq, send, intervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS }) {
      let stopped = false;
      const timer = setInterval(() => {
        if (stopped) return;
        const frame: ExecutionHeartbeat = {
          ...identity,
          type: "execution.heartbeat",
          seq: getSeq(),
        };
        const checked = validateExecutionAttachmentFrame(frame);
        if (!checked.ok) return;
        try {
          send(JSON.stringify(checked.value));
        } catch {
          stop();
        }
      }, intervalMs);

      const stop = () => {
        if (stopped) return;
        stopped = true;
        clearInterval(timer);
        activeHeartbeats.delete(stop);
      };
      activeHeartbeats.add(stop);
      return stop;
    },

    async handleWsMessage(rawMessage, send) {
      if (typeof rawMessage !== "string") return false;
      if (encoder.encode(rawMessage).byteLength > EXECUTION_ATTACHMENT_LIMITS.messageBytes) {
        // Avoid parsing oversized frames; only claim if clearly an execution.* frame.
        if (rawMessage.includes('"execution.')) {
          options.onError?.({ type: "execution.error", code: "too_large" });
          return true;
        }
        return false;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawMessage);
      } catch {
        return false;
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return false;
      }
      const frameType = (parsed as { type?: unknown }).type;
      if (typeof frameType !== "string" || !frameType.startsWith("execution.")) {
        return false;
      }

      if (frameType === "execution.error") {
        const code =
          typeof (parsed as { code?: unknown }).code === "string"
            ? (parsed as { code: string }).code
            : "unknown";
        const dialogKey =
          typeof (parsed as { dialogKey?: unknown }).dialogKey === "string"
            ? (parsed as { dialogKey: string }).dialogKey
            : undefined;
        const errFrame: AttachedExecutionErrorFrame = {
          type: "execution.error",
          code,
          ...(dialogKey ? { dialogKey } : {}),
        };
        if (dialogKey) {
          const pending = clearPendingAttach(dialogKey);
          pending?.reject(new Error(`execution_attach_failed:${code}`));
        } else if (pendingAttaches.size === 1) {
          const onlyKey = pendingAttaches.keys().next().value;
          if (onlyKey) {
            const pending = clearPendingAttach(onlyKey);
            pending?.reject(new Error(`execution_attach_failed:${code}`));
          }
        }
        options.onError?.(errFrame);
        return true;
      }

      const checked = validateExecutionAttachmentFrame(parsed);
      if (!checked.ok) {
        options.onError?.({ type: "execution.error", code: checked.error });
        return true;
      }

      const frame = checked.value;
      if (frame.type === "execution.attached") {
        const pending = clearPendingAttach(frame.dialogKey);
        pending?.resolve(frame);
        return true;
      }

      if (frame.type === "execution.command") {
        const safeSendReceipt = (receipt: ExecutionCommandReceipt) => {
          try {
            send(JSON.stringify(receipt));
          } catch {
            options.onError?.({
              type: "execution.error",
              code: "send_failed",
              dialogKey: frame.dialogKey,
            });
          }
        };
        const binding = bindings.get(frame.dialogKey);
        if (!binding) {
          safeSendReceipt(makeRejectedReceipt(frame, "host_not_attached"));
          return true;
        }
        if (!matchesExecutionIdentity(binding.identity, frame)) {
          safeSendReceipt(makeRejectedReceipt(frame, "fenced"));
          return true;
        }
        let receipt: ExecutionCommandReceipt;
        try {
          receipt = await binding.host.receive(frame);
        } catch {
          receipt = makeRejectedReceipt(frame, "lease_invalid");
        }
        safeSendReceipt(receipt);
        return true;
      }

      return true;
    },

    dispose() {
      for (const stop of [...activeHeartbeats]) {
        stop();
      }
      for (const key of [...pendingAttaches.keys()]) {
        const pending = clearPendingAttach(key);
        pending?.reject(new Error("execution_bridge_disposed"));
      }
      bindings.clear();
    },
  };
}
