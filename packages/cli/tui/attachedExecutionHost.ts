import {
  isContractId,
  matchesExecutionIdentity,
  matchesExpectedExecution,
  validateExecutionAttachmentFrame,
  type ExecutionAppendCommand,
  type ExecutionCommand,
  type ExecutionCommandReceipt,
  type ExecutionIdentity,
  type ExecutionStatus,
} from "../../shared/contracts/executionAttachment";

export interface AttachedHostRecord {
  command: ExecutionCommand;
  receipt: ExecutionCommandReceipt;
  delivery: "pending" | "dispatching" | "inbox" | "scheduled" | "finished";
}

export interface AttachedHostLedgerTransaction {
  get(commandId: string): Promise<AttachedHostRecord | undefined>;
  list(): Promise<AttachedHostRecord[]>;
  put(record: AttachedHostRecord): Promise<void>;
}

/** Inject a ledger scoped to authenticated owner + server + dialog. Transactions
 * must be serializable, rollback on failure, and durable before resolving.
 * Store defensive copies. Never expire command IDs while redelivery is possible.
 * Exactly one live host owns a binding; the lifecycle layer must fence/stop the
 * previous host BEFORE opening a replacement (including the same lease).
 */
export interface AttachedHostLedger {
  transaction<T>(work: (tx: AttachedHostLedgerTransaction) => Promise<T>): Promise<T>;
}

export interface AttachedHostCallbacks {
  /** Must verify current authoritative lease, expiry and host ownership. Shape
   * validation is not authentication. Called again immediately before effects. */
  assertLease(identity: Readonly<ExecutionIdentity>): Promise<void>;
  state(): {
    status: ExecutionStatus;
    busy: boolean;
    controller?: AbortController;
  };
  /** Synchronous ownership transfer to the ORIGINAL turn inbox. false MUST mean
   * no transfer. Carry commandId as fallback metadata, not only the input text.
   * A true return is NOT evidence of model application or durable save. */
  inject(command: Readonly<ExecutionAppendCommand>): boolean;
  /** Original host queue/turn scheduler ONLY, never agent.run. scheduled means
   * ownership transferred; deferred means no effect. Must explicitly support
   * done+continue; enqueue on a terminal execution is rejected by this core. */
  schedule(command: Readonly<ExecutionAppendCommand>): Promise<"scheduled" | "deferred">;
  /** Verify command-correlated stable messageId in the original dialog's durable
   * saved messages, not merely transcript append, inbox drain or push success. */
  verifySavedMessage(command: Readonly<ExecutionAppendCommand>, messageId: string): Promise<boolean>;
}

export interface AttachedExecutionHost {
  receive(command: ExecutionCommand): Promise<ExecutionCommandReceipt>;
  /** Retry only safe pending work, e.g. after an idle/lifecycle transition. */
  resumePending(): Promise<void>;
  /** Call with ONLY close()'s returned, undrained command IDs. Never pass drained
   * entries: their application is unknown until stable save evidence arrives. */
  inboxClosed(commandIds: readonly string[]): Promise<void>;
  confirmApplied(commandId: string, messageId: string): Promise<ExecutionCommandReceipt>;
  receipt(commandId: string): Promise<ExecutionCommandReceipt | undefined>;
}

const copy = <T>(value: T): T => structuredClone(value);
const fingerprint = (command: ExecutionCommand): string => JSON.stringify([
  command.dialogKey, command.runId, command.executionId, command.hostSessionId,
  command.machineId, command.leaseEpoch, command.expectedExecutionId,
  command.expectedLeaseEpoch, command.commandId, command.kind,
  command.kind === "append" ? command.mode : null,
  command.kind === "append" ? command.userInput : null,
]);

/** No transport, credentials, new session or runtime startup lives here.
 * Callbacks must not await reentrant host calls: all public operations share one
 * serial scheduler. On crash, every possibly transferred record becomes uncertain
 * BEFORE any new delivery; only pending records are safe to retry.
 */
export async function createAttachedExecutionHost(options: {
  identity: ExecutionIdentity;
  ledger: AttachedHostLedger;
  callbacks: AttachedHostCallbacks;
}): Promise<AttachedExecutionHost> {
  const identity = Object.freeze(copy(options.identity));
  const { ledger, callbacks } = options;
  let tail: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = tail.then(work);
    tail = next.catch(() => undefined);
    return next;
  };
  const makeReceipt = (command: ExecutionCommand, outcome: Record<string, unknown>): ExecutionCommandReceipt =>
    ({ ...identity, type: "execution.command.receipt", commandId: command.commandId,
      kind: command.kind, ...outcome }) as ExecutionCommandReceipt;
  const check = async () => callbacks.assertLease(identity);
  const read = (id: string) => ledger.transaction(tx => tx.get(id));
  const change = (id: string, work: (record: AttachedHostRecord) => AttachedHostRecord) =>
    ledger.transaction(async tx => {
      const record = await tx.get(id);
      if (!record || !matchesExecutionIdentity(identity, record.command)) throw new Error("unknown_command");
      const next = work(record);
      await tx.put(next);
      return copy(next);
    });
  const finish = (id: string, outcome: Record<string, unknown>) => change(id, record => ({
    ...record, delivery: "finished", receipt: makeReceipt(record.command, outcome),
  }));
  const recover = async () => {
    await check();
    await ledger.transaction(async tx => {
      for (const record of await tx.list()) {
        if (!matchesExecutionIdentity(identity, record.command)) continue;
        if (["dispatching", "inbox", "scheduled"].includes(record.delivery)) {
          await tx.put({ ...record, delivery: "finished", receipt: makeReceipt(record.command,
            { stage: "uncertain", code: "host_recovery" }) });
        }
      }
    });
  };
  await recover();

  async function dispatch(id: string): Promise<void> {
    const record = await read(id);
    if (!record || record.delivery !== "pending") return;
    await check();
    let state = callbacks.state();
    const command = record.command;
    if (state.status === "cancelled" || (command.kind === "append"
      && state.status !== "running" && !(state.status === "done" && command.mode === "continue"))) {
      await finish(id, { stage: "rejected", code: "execution_terminal" });
      return;
    }
    if (command.kind === "cancel" && (!state.controller || state.status !== "running")) {
      await finish(id, { stage: "rejected", code: "no_active_controller" });
      return;
    }
    await change(id, current => ({ ...current, delivery: "dispatching" }));
    try {
      await check();
      // Ledger/lease checks await I/O. Re-read lifecycle state immediately before
      // the synchronous transfer/abort so a completed/replaced turn is not used.
      state = callbacks.state();
      if (state.status === "cancelled" || (command.kind === "append"
        && state.status !== "running" && !(state.status === "done" && command.mode === "continue"))) {
        await finish(id, { stage: "rejected", code: "execution_terminal" });
        return;
      }
      if (command.kind === "cancel" && (!state.controller || state.status !== "running")) {
        await finish(id, { stage: "rejected", code: "no_active_controller" });
        return;
      }
      if (command.kind === "cancel") {
        // Only the bound turn controller; never process.kill / TUI shutdown.
        state.controller!.abort();
        await finish(id, { stage: "applied" });
      } else if (state.status === "running" && state.busy && callbacks.inject(copy(command))) {
        await change(id, current => ({ ...current, delivery: "inbox" }));
      } else {
        const result = await callbacks.schedule(copy(command));
        if (result !== "scheduled" && result !== "deferred") throw new Error("invalid_schedule_result");
        await change(id, current => ({ ...current, delivery: result === "scheduled" ? "scheduled" : "pending" }));
      }
    } catch {
      // An effect OR a post-effect ledger commit may have succeeded. Never retry.
      await finish(id, { stage: "uncertain", code: "delivery_uncertain" });
    }
  }

  return {
    receive(input) {
      // Snapshot before waiting on the scheduler; callers cannot mutate identity
      // or contents between validation, ledger commit and injection.
      const validated = validateExecutionAttachmentFrame(input);
      if (!validated.ok || validated.value.type !== "execution.command") return Promise.reject(new Error("malformed_command"));
      const command = copy(validated.value);
      return serial(async () => {
        await check();
        if (!matchesExecutionIdentity(identity, command) || !matchesExpectedExecution(command, identity)) {
          return makeReceipt(command, { stage: "rejected", code: "fenced" });
        }
        const result = await ledger.transaction(async tx => {
          const existing = await tx.get(command.commandId);
          if (existing) return { record: existing, conflict: fingerprint(existing.command) !== fingerprint(command), fresh: false };
          const record: AttachedHostRecord = { command, delivery: "pending", receipt: makeReceipt(command, { stage: "accepted" }) };
          await tx.put(record);
          return { record, conflict: false, fresh: true };
        });
        if (result.conflict) return makeReceipt(command, { stage: "rejected", code: "command_id_conflict" });
        // Duplicate delivery is observation only, never a scheduling trigger.
        if (result.fresh) await dispatch(command.commandId);
        else if (result.record.delivery === "dispatching") await finish(command.commandId, { stage: "uncertain", code: "delivery_uncertain" });
        return copy((await read(command.commandId))!.receipt);
      });
    },
    resumePending() {
      return serial(async () => {
        await check();
        const records = await ledger.transaction(tx => tx.list());
        for (const record of records) {
          if (matchesExecutionIdentity(identity, record.command) && record.delivery === "pending") await dispatch(record.command.commandId);
        }
      });
    },
    inboxClosed(ids) {
      const snapshot = [...new Set(ids)];
      return serial(async () => {
        await check();
        for (const id of snapshot) {
          const record = await read(id);
          if (!record || !matchesExecutionIdentity(identity, record.command) || record.delivery !== "inbox") continue;
          await change(id, current => ({ ...current, delivery: "pending" }));
          // Must bypass a possibly stale busy/inbox snapshot on this path.
          const command = record.command;
          if (command.kind !== "append") continue;
          const state = callbacks.state();
          if (state.status !== "running" && !(state.status === "done" && command.mode === "continue")) {
            await finish(id, { stage: "rejected", code: "execution_terminal" });
            continue;
          }
          await change(id, current => ({ ...current, delivery: "dispatching" }));
          try {
            await check();
            const latest = callbacks.state();
            if (latest.status !== "running" && !(latest.status === "done" && command.mode === "continue")) {
              await finish(id, { stage: "rejected", code: "execution_terminal" });
              continue;
            }
            const result = await callbacks.schedule(copy(command));
            if (result !== "scheduled" && result !== "deferred") throw new Error("invalid_schedule_result");
            await change(id, current => ({ ...current, delivery: result === "scheduled" ? "scheduled" : "pending" }));
          } catch {
            await finish(id, { stage: "uncertain", code: "delivery_uncertain" });
          }
        }
      });
    },
    confirmApplied(commandId, messageId) {
      return serial(async () => {
        await check();
        const record = await read(commandId);
        if (!record || !matchesExecutionIdentity(identity, record.command) || record.command.kind !== "append") throw new Error("unknown_append");
        if (record.receipt.stage === "applied") {
          if (record.receipt.kind !== "append" || record.receipt.messageId !== messageId) throw new Error("message_id_conflict");
          return copy(record.receipt);
        }
        // Shared server receipt transitions treat uncertain as terminal. Any
        // later evidence must use an explicit reconciliation protocol, not silently
        // promote a previously reported uncertain receipt on this host alone.
        if (record.receipt.stage === "uncertain") throw new Error("uncertain_is_terminal");
        if (record.delivery === "pending" || record.receipt.stage === "rejected") throw new Error("not_delivered");
        if (!isContractId(messageId) || !await callbacks.verifySavedMessage(copy(record.command), messageId)) throw new Error("missing_saved_message_evidence");
        return (await finish(commandId, { stage: "applied", messageId })).receipt;
      });
    },
    receipt(commandId) {
      return serial(async () => {
        await check();
        const record = await read(commandId);
        return record && matchesExecutionIdentity(identity, record.command) ? copy(record.receipt) : undefined;
      });
    },
  };
}
