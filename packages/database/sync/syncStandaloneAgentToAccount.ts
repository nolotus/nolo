/**
 * Explicit standalone local Agent → active Nolo account snapshot upload.
 *
 * Boundaries (this slice):
 * - Login/onboarding does not call this; upload is explicit only.
 * - Local Agent stays local; creates a distinct account Agent + durable mapping.
 * - includeDialogs=true is rejected (not pretended).
 * - Snapshot only: no continuous sync, no paired delete, no Space export.
 * - Production/default-store path hydrates durable mappings before idempotent
 *   reuse checks (cold start must not assume useMyContentItems mounted first).
 * - Durable path fails closed when no client DB is bound (no silent downgrade).
 *
 * Known limitation (no rollback in this slice):
 * If abort/failure happens after the account Agent write succeeds but before
 * the mapping is persisted, the remote snapshot may exist without a mapping.
 * Retry does not roll back that write; without a mapping it may create another
 * remote Agent. Callers must treat that as an unmapped remote snapshot, not a
 * transactional failure.
 */

import { toErrorMessage } from "core/errorMessage";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedString } from "core/trimmedString";
import { ulid } from "database/utils/ulid";
import {
  isDeviceLocalDbKey,
  isDeviceLocalOwnerId,
} from "database/authority/deviceLocal";
import {
  createSyncJobRegistry,
  getDefaultSyncJobRegistry,
  type SyncJobRegistry,
} from "./syncJobRegistry";
import {
  ensureSyncMappingsHydrated,
  getBoundSyncMappingClientDb,
  getDefaultSyncMappingStore,
  putSyncMappingDurable,
  removeSyncMappingDurable,
  type SyncMapping,
  type SyncMappingStore,
} from "./syncMapping";
import {
  agentSnapshotContainsSecrets,
  stripAgentForAccountSync,
} from "./stripAgentForAccountSync";

export type SyncStandaloneAgentToAccountInput = {
  /** Active Nolo account user id (must not be "local"). */
  accountUserId: string;
  /** Local Agent dbKey (agent-local-…). */
  localAgentKey: string;
  /**
   * Dialog upload is not supported in this slice.
   * Default false; true is rejected rather than silently ignored.
   */
  includeDialogs?: boolean;
  /** Optional external abort (also cancelled via auth reset registry). */
  signal?: AbortSignal;
};

export type SyncStandaloneAgentToAccountResult = {
  localDbKey: string;
  remoteDbKey: string;
  accountUserId: string;
  mapping: SyncMapping;
  /** True when an existing account-scoped mapping was reused. */
  reused: boolean;
  agent: Record<string, unknown>;
};

export type SyncStandaloneAgentToAccountDeps = {
  readRecord: (dbKey: string) => Promise<Record<string, unknown> | null>;
  writeRecord: (args: {
    data: Record<string, unknown>;
    customKey: string;
    userId: string;
  }) => Promise<Record<string, unknown>>;
  mappingStore?: SyncMappingStore;
  /**
   * When true (default for production path), persist mapping via durable
   * write-through after the account Agent write succeeds.
   */
  persistMappingDurable?: boolean;
  jobRegistry?: SyncJobRegistry;
  now?: () => number;
  createId?: () => string;
  log?: (
    event: string,
    data?: Record<string, string | number | boolean | null | undefined>
  ) => void;
};

const dropStaleMapping = async (
  localAgentKey: string,
  accountUserId: string,
  mappingStore: SyncMappingStore,
  persistDurable: boolean,
  usingDefaultStore: boolean
): Promise<void> => {
  if (persistDurable && usingDefaultStore) {
    await removeSyncMappingDurable(localAgentKey, accountUserId);
    return;
  }
  mappingStore.remove(localAgentKey, accountUserId);
};

const normalize = (value: unknown): string => asTrimmedString(value);

const throwIfAborted = (signal: AbortSignal | undefined, phase: string) => {
  if (signal?.aborted) {
    const reason =
      typeof signal.reason === "string"
        ? signal.reason
        : signal.reason instanceof Error
          ? signal.reason.message
          : "aborted";
    const err = new Error(
      `syncStandaloneAgentToAccount aborted at ${phase}: ${reason}`
    );
    (err as Error & { name: string }).name = "AbortError";
    throw err;
  }
};

const isTombstone = (record: Record<string, unknown> | null): boolean => {
  if (!record) return true;
  if (record.deleted === true) return true;
  if (record.isTombstone === true) return true;
  if (typeof record.deletedAt === "string" && record.deletedAt.trim()) {
    return true;
  }
  return false;
};

const defaultLog: SyncStandaloneAgentToAccountDeps["log"] = (
  event,
  data
) => {
  // Best-effort; avoid hard dependency on app package at import time.
  void import("app/localFirst/localFirstLog")
    .then(({ localFirstLog }) => {
      localFirstLog(event, data);
    })
    .catch(() => {
      /* diagnostics optional */
    });
};

/**
 * Explicitly upload a local Agent snapshot to the active account.
 * Idempotent per (localAgentKey, accountUserId) mapping.
 */
export async function syncStandaloneAgentToAccount(
  input: SyncStandaloneAgentToAccountInput,
  deps: SyncStandaloneAgentToAccountDeps
): Promise<SyncStandaloneAgentToAccountResult> {
  const accountUserId = normalize(input.accountUserId);
  const localAgentKey = normalize(input.localAgentKey);
  const log = deps.log ?? defaultLog;
  const now = deps.now ?? Date.now;
  const createId = deps.createId ?? ulid;
  const usingDefaultStore = !deps.mappingStore;
  const mappingStore = deps.mappingStore ?? getDefaultSyncMappingStore();
  const jobRegistry = deps.jobRegistry ?? getDefaultSyncJobRegistry();
  const persistDurable = deps.persistMappingDurable !== false;

  if (!accountUserId || accountUserId === "local") {
    throw new Error(
      "syncStandaloneAgentToAccount requires a non-local accountUserId"
    );
  }
  if (!localAgentKey) {
    throw new Error("syncStandaloneAgentToAccount requires localAgentKey");
  }
  if (input.includeDialogs === true) {
    throw new Error(
      "syncStandaloneAgentToAccount does not support includeDialogs=true in this slice"
    );
  }

  const job = jobRegistry.register({
    accountUserId,
    label: "syncStandaloneAgentToAccount",
    controller: input.signal
      ? // Re-use external signal bookkeeping via a linked controller.
        (() => {
          const controller = new AbortController();
          if (input.signal!.aborted) {
            controller.abort(input.signal!.reason);
          } else {
            input.signal!.addEventListener(
              "abort",
              () => controller.abort(input.signal!.reason),
              { once: true }
            );
          }
          return controller;
        })()
      : undefined,
  });

  const signal = job.signal;

  try {
    throwIfAborted(signal, "start");
    log?.("sync.agent.start", {
      accountUserId,
      localAgentKey,
      includeDialogs: 0,
    });

    // Production path: durable mapping is required. Fail before any account
    // write when no client DB is bound (no silent memory-only downgrade).
    // Also hydrate durable rows before the idempotent mapping lookup so a
    // cold-start command reuses prior remotes without waiting for UI mount.
    if (persistDurable && usingDefaultStore) {
      if (!getBoundSyncMappingClientDb()) {
        throw new Error(
          "syncStandaloneAgentToAccount requires a bound client DB for durable mapping; refuse silent durability downgrade"
        );
      }
      throwIfAborted(signal, "before-hydrate");
      await ensureSyncMappingsHydrated();
      throwIfAborted(signal, "after-hydrate");
    }

    // Idempotent reuse of an existing account-scoped mapping.
    const existing = mappingStore.get(localAgentKey, accountUserId);
    if (existing) {
      throwIfAborted(signal, "before-idempotent-read");
      const remote = await deps.readRecord(existing.remoteDbKey);
      throwIfAborted(signal, "after-idempotent-read");
      if (remote && !isTombstone(remote)) {
        log?.("sync.agent.reuse", {
          accountUserId,
          localAgentKey,
          remoteDbKey: existing.remoteDbKey,
        });
        return {
          localDbKey: existing.localDbKey,
          remoteDbKey: existing.remoteDbKey,
          accountUserId,
          mapping: existing,
          reused: true,
          agent: remote,
        };
      }
      // Stale mapping: drop memory (+ durable on production path) then recreate.
      await dropStaleMapping(
        localAgentKey,
        accountUserId,
        mappingStore,
        persistDurable,
        usingDefaultStore
      );
      log?.("sync.agent.staleMapping", {
        accountUserId,
        localAgentKey,
        remoteDbKey: existing.remoteDbKey,
      });
    }

    throwIfAborted(signal, "before-local-read");
    const localAgent = await deps.readRecord(localAgentKey);
    throwIfAborted(signal, "after-local-read");

    if (!localAgent) {
      throw new Error(
        `syncStandaloneAgentToAccount: local agent not found: ${localAgentKey}`
      );
    }

    const owner = asTrimmedString(localAgent.userId);
    if (
      !isDeviceLocalDbKey(localAgentKey) &&
      !isDeviceLocalOwnerId(owner) &&
      !isDeviceLocalDbKey(
        typeof localAgent.dbKey === "string" ? localAgent.dbKey : null
      )
    ) {
      throw new Error(
        `syncStandaloneAgentToAccount: agent is not device-local: ${localAgentKey}`
      );
    }

    const agentId = createId();
    const snapshot = stripAgentForAccountSync({
      localAgent,
      accountUserId,
      agentId,
      now: now(),
    });

    if (agentSnapshotContainsSecrets(snapshot)) {
      throw new Error(
        "syncStandaloneAgentToAccount refused to upload secret-bearing agent fields"
      );
    }

    // Defense: never attach dialog/message payloads even if caller stuffed them.
    delete (snapshot as any).dialogs;
    delete (snapshot as any).messages;
    delete (snapshot as any).attachments;

    throwIfAborted(signal, "before-account-write");
    const written = await deps.writeRecord({
      data: snapshot,
      customKey: snapshot.dbKey,
      userId: accountUserId,
    });
    throwIfAborted(signal, "after-account-write");

    const remoteDbKey =
      asOptionalTrimmedString(written?.dbKey) ?? snapshot.dbKey;

    const mappingInput = {
      localDbKey: localAgentKey,
      remoteDbKey,
      accountUserId,
      contentType: "agent" as const,
      updatedAt: now(),
    };

    // Persist mapping only after account write succeeds.
    let mapping: SyncMapping;
    if (persistDurable && usingDefaultStore) {
      mapping = await putSyncMappingDurable(mappingInput);
    } else {
      mapping = mappingStore.put(mappingInput);
    }

    log?.("sync.agent.done", {
      accountUserId,
      localAgentKey,
      remoteDbKey,
      reused: 0,
    });

    return {
      localDbKey: localAgentKey,
      remoteDbKey,
      accountUserId,
      mapping,
      reused: false,
      agent: written ?? snapshot,
    };
  } catch (err) {
    log?.("sync.agent.error", {
      accountUserId,
      localAgentKey,
      // Error-only: non-Errors stay "unknown-error" (not String(err) enrichment).
      message:
        err instanceof Error
          ? toErrorMessage(err).slice(0, 200)
          : "unknown-error",
    });
    throw err;
  } finally {
    jobRegistry.unregister(job.id);
  }
}

/** Test helper: isolated registry factory re-export surface. */
export { createSyncJobRegistry };
