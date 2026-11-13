// packages/cli/tui/dialogNotifyReceiver.ts
//
// The receiving half of `nolo dialog notify`: bound to the lifecycle of one
// live CLI dialog (the same object that owns `ChatQueueTuiBinding`).
//
// Rules this module enforces:
//   - It never starts a turn by itself. Admitted messages go through
//     `binding.admitExternalRequest`, i.e. the same durable-save + enqueue path
//     a typed message uses; the existing drain cascade decides when to run them.
//   - It never bypasses a stop (drain paused) or a recovery gate: paused state
//     just leaves the message `queued`, and a blocked recovery leaves it
//     `persisted` for a later retry.
//   - It only ever reads its own dialog directory, and defensively skips any
//     entry whose userId/dialogId does not match the bound dialog.
//   - One receiver per dialog: an active lease held by another live process
//     makes this receiver refuse to attach instead of competing for writes.

import { watch, type FSWatcher } from "node:fs";
import type { TurnRequest } from "core/chat/internalTurnEvent";
import type { ChatQueueTuiBinding } from "./chatQueueTuiBinding";
import {
  DIALOG_NOTIFY_SOURCE,
  ensureDialogNotifyDir,
  isLeaseLive,
  listNotificationEntries,
  readAck,
  readLease,
  resolveDialogNotifyDirs,
  resolveDialogNotifyRoot,
  writeAck,
  writeLease,
  type DialogNotifyDirs,
} from "../dialogNotifyMailbox";

export type DialogNotifyReceiverEvent =
  | { type: "admitted"; keyHash: string; messageId: string; state: "queued" | "consumed" }
  | { type: "blocked"; keyHash: string; reason: "recovery-blocked" | "durable-check-failed" }
  | { type: "failed"; keyHash: string; messageId: string; error: string; attempts: number }
  /**
   * The message WAS admitted but its receipt could not be written. This is a
   * reporting failure only: it never consumes an admission attempt and never
   * turns into `state:"failed"`, and the next scan retries the receipt without
   * admitting the message a second time.
   */
  | { type: "ack-write-failed"; keyHash: string; messageId: string; error: string };

export type DialogNotifyReceiver = {
  readonly active: boolean;
  readonly reason?: string;
  readonly userId: string;
  readonly dialogId: string;
  /** Force one scan (tests and hosts that want deterministic pickup). */
  pollNow(): Promise<void>;
  /** Stop polling and mark the lease stopped. Delivery records are kept. */
  stop(): void;
};

const DEFAULT_HEARTBEAT_MS = 5_000;
const DEFAULT_SCAN_INTERVAL_MS = 1_000;
const MAX_ADMIT_ATTEMPTS = 3;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function attachDialogNotifyReceiver(args: {
  binding: Pick<ChatQueueTuiBinding, "admitExternalRequest" | "isRecoveryBlocked">;
  userId: string;
  dialogId: string;
  root?: string;
  env?: Record<string, string | undefined>;
  host?: string;
  pid?: number;
  heartbeatMs?: number;
  scanIntervalMs?: number;
  /**
   * Upgrade a `queued` receipt once the dialog's own durable record proves the
   * batch was dispatched to the provider (`cliBatchPhase: requested|completed`).
   * Without it a receipt admitted behind a stop/running gate would stay `queued`
   * forever even after the queue actually ran the message.
   */
  resolveAdmittedState?: (messageId: string) => Promise<"queued" | "consumed">;
  /**
   * Does the dialog's own durable store already hold a record for this
   * `messageId`? True means the message was saved (and therefore enqueued) by an
   * earlier admission — this process before a failed receipt write, or a
   * previous process before a crash. Admission is then skipped: the queue only
   * dedupes against what is *still* queued, so re-admitting a delivered message
   * would enqueue a second identical user turn.
   */
  isMessagePersisted?: (messageId: string) => Promise<boolean>;
  onEvent?: (event: DialogNotifyReceiverEvent) => void;
}): DialogNotifyReceiver {
  const pid = args.pid ?? process.pid;
  const inactive = (reason: string): DialogNotifyReceiver => ({
    active: false,
    reason,
    userId: args.userId,
    dialogId: args.dialogId,
    pollNow: async () => {},
    stop: () => {},
  });

  let dirs: DialogNotifyDirs;
  try {
    dirs = resolveDialogNotifyDirs({
      root: args.root ?? resolveDialogNotifyRoot({ env: args.env }),
      userId: args.userId,
      dialogId: args.dialogId,
    });
    ensureDialogNotifyDir(dirs);
  } catch (error) {
    return inactive(errorMessage(error));
  }

  const host = args.host ?? "local";
  const existing = readLease(dirs);
  if (existing && existing.pid !== pid && isLeaseLive(existing)) {
    return inactive(`dialog ${args.dialogId} already has a live notify receiver (pid ${existing.pid})`);
  }

  const startedAt = new Date().toISOString();
  const lease = () =>
    writeLease(dirs, {
      userId: args.userId,
      dialogId: args.dialogId,
      pid,
      host,
      startedAt,
      heartbeatAt: new Date().toISOString(),
      state: "active",
    });

  let active = true;
  try {
    lease();
  } catch (error) {
    return inactive(`cannot claim dialog notify lease: ${errorMessage(error)}`);
  }

  const inFlight = new Set<string>();
  const attempts = new Map<string, number>();

  /**
   * Write (or repair) one receipt. Receipt writes are deliberately OUTSIDE the
   * admission retry semantics: delivery already happened, so a disk/permission
   * failure here is a reporting problem that the next scan repairs through the
   * durable check — never an admission failure that could be retried into a
   * duplicate enqueue or reported as `failed`.
   */
  const recordAck = (
    keyHash: string,
    messageId: string,
    state: "queued" | "consumed" | "failed",
    reason?: string,
  ): boolean => {
    try {
      writeAck(dirs, keyHash, {
        messageId,
        state,
        ...(reason ? { reason } : {}),
        at: new Date().toISOString(),
        receiverPid: pid,
      });
      return true;
    } catch (error) {
      args.onEvent?.({ type: "ack-write-failed", keyHash, messageId, error: errorMessage(error) });
      return false;
    }
  };

  const scan = async (): Promise<void> => {
    if (!active) return;
    const entries = listNotificationEntries(dirs);
    for (const { keyHash, entry } of entries) {
      if (!active) return;
      if (inFlight.has(keyHash)) continue;
      const ack = readAck(dirs, keyHash);
      if (ack?.state === "failed" && args.isMessagePersisted) {
        // Repair a receipt that an earlier (pre-fix) build wrote on the
        // admission retry path: the durable row exists, so the message WAS
        // delivered and the `failed` receipt is simply wrong. Reporting only —
        // nothing is re-admitted.
        const persisted = await args.isMessagePersisted(entry.messageId).catch(() => false);
        if (persisted) {
          const state = args.resolveAdmittedState
            ? await args.resolveAdmittedState(entry.messageId).catch(() => "queued" as const)
            : ("queued" as const);
          if (recordAck(keyHash, entry.messageId, state)) {
            args.onEvent?.({ type: "admitted", keyHash, messageId: entry.messageId, state });
          }
        }
        continue;
      }
      if (ack) {
        // Late upgrade: an entry admitted behind a stop/running gate is recalled
        // by the dialog's own durable receipt once the queue dispatched it.
        if (ack.state === "queued" && args.resolveAdmittedState) {
          try {
            const state = await args.resolveAdmittedState(entry.messageId);
            if (state === "consumed" && recordAck(keyHash, entry.messageId, state)) {
              args.onEvent?.({ type: "admitted", keyHash, messageId: entry.messageId, state });
            }
          } catch {
            /* Durable read failure only delays the upgrade; it is not a delivery error. */
          }
        }
        continue;
      }
      // Defensive: never inject a record that belongs to another dialog/actor.
      if (entry.userId !== args.userId || entry.dialogId !== args.dialogId) continue;
      if (args.binding.isRecoveryBlocked()) {
        args.onEvent?.({ type: "blocked", keyHash, reason: "recovery-blocked" });
        continue;
      }
      inFlight.add(keyHash);
      try {
        // Dedupe BEFORE admitting. `admitExternalRequest` both saves the durable
        // row and enqueues it, and the queue only dedupes against what is still
        // queued — a message admitted one tick ago has usually been drained
        // already. So a retry driven by a *receipt* failure (or a crash between
        // save and receipt) must be detected here, on the durable record, or the
        // target dialog receives the same user turn twice.
        let persisted: boolean;
        try {
          persisted = args.isMessagePersisted ? await args.isMessagePersisted(entry.messageId) : false;
        } catch {
          // Unknown durable state: admitting now could duplicate a delivered
          // message. Leave it for the next tick instead of guessing.
          args.onEvent?.({ type: "blocked", keyHash, reason: "durable-check-failed" });
          continue;
        }
        if (persisted) {
          const state = args.resolveAdmittedState
            ? await args.resolveAdmittedState(entry.messageId).catch(() => "queued" as const)
            : ("queued" as const);
          if (recordAck(keyHash, entry.messageId, state)) {
            args.onEvent?.({ type: "admitted", keyHash, messageId: entry.messageId, state });
          }
          attempts.delete(keyHash);
          continue;
        }
        const request: TurnRequest = {
          event: { kind: "user", text: entry.message },
          text: entry.message,
          messageId: entry.messageId,
          source: DIALOG_NOTIFY_SOURCE,
        };
        const state = await args.binding.admitExternalRequest(request);
        // The admission already happened. A receipt write failure below must not
        // be retried through this path: `recordAck` reports it and the next scan
        // repairs the receipt via the durable check above.
        attempts.delete(keyHash);
        if (recordAck(keyHash, entry.messageId, state)) {
          args.onEvent?.({ type: "admitted", keyHash, messageId: entry.messageId, state });
        }
      } catch (error) {
        const count = (attempts.get(keyHash) ?? 0) + 1;
        attempts.set(keyHash, count);
        if (count >= MAX_ADMIT_ATTEMPTS) {
          // Explicit terminal receipt instead of an endless retry loop. The
          // request record itself stays: it is the durable delivery record.
          recordAck(keyHash, entry.messageId, "failed", errorMessage(error));
        }
        args.onEvent?.({
          type: "failed",
          keyHash,
          messageId: entry.messageId,
          error: errorMessage(error),
          attempts: count,
        });
      } finally {
        inFlight.delete(keyHash);
      }
    }
  };

  let chain: Promise<void> = Promise.resolve();
  const schedule = () => {
    chain = chain.then(scan).catch(() => {});
  };

  let watcher: FSWatcher | null = null;
  try {
    watcher = watch(dirs.dialogDir, { persistent: false }, () => schedule());
  } catch {
    watcher = null; // Interval scan alone is enough; watching is only a latency win.
  }
  const scanTimer = setInterval(schedule, args.scanIntervalMs ?? DEFAULT_SCAN_INTERVAL_MS);
  scanTimer.unref?.();
  const heartbeat = setInterval(() => {
    if (!active) return;
    try {
      lease();
    } catch {
      /* A missed heartbeat only shortens the lease; the next one repairs it. */
    }
  }, args.heartbeatMs ?? DEFAULT_HEARTBEAT_MS);
  heartbeat.unref?.();

  schedule();

  return {
    active: true,
    userId: args.userId,
    dialogId: args.dialogId,
    async pollNow() {
      schedule();
      await chain;
    },
    stop() {
      if (!active) return;
      active = false;
      clearInterval(scanTimer);
      clearInterval(heartbeat);
      watcher?.close();
      watcher = null;
      try {
        writeLease(dirs, {
          userId: args.userId,
          dialogId: args.dialogId,
          pid,
          host,
          startedAt,
          heartbeatAt: new Date().toISOString(),
          state: "stopped",
          stoppedAt: new Date().toISOString(),
        });
      } catch {
        /* Shutdown must not throw; a stale active lease expires by TTL. */
      }
    },
  };
}
