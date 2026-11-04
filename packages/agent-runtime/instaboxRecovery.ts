import type { InstaboxBillingPolicy, InstaboxCreationPlan } from "./instaboxBackend";

/** Supplied by the authenticated host, not by client JSON. No credentials are stored. */
export type InstaboxRecoveryAuthority = {
  ticketId: string;
  grantId: string;
  generation: number;
  ownerUserId: string;
};

export type InstaboxRecoveryContext = {
  recordId: string;
  machineId?: string;
  createOperationId?: string;
  stopOperationId?: string;
  machineState: "known" | "unknown";
};

export type InstaboxRecoveryRecord = InstaboxRecoveryAuthority & {
  version: 1;
  recordId: string;
  revision: number;
  provider: "instabox";
  /** Stable host-configured account identifier, not an API key or key fingerprint. */
  accountId: string;
  baseUrl: string;
  plan: InstaboxCreationPlan;
  billingPolicy: InstaboxBillingPolicy;
  persistentDiskGiB: number;
  create: {
    method: "POST";
    path: "/machines";
    /** Exact serialized body; authentication headers are deliberately excluded. */
    body: string;
    idempotencyKey: string;
    requestedAt: number;
    /** A persisted intent is conservatively unknown even if the process died before POST. */
    state: "submitted-unknown" | "responded";
  };
  machineId?: string;
  createOperationId?: string;
  stop: {
    intent: boolean;
    idempotencyKey?: string;
    accepted: boolean;
    operationId?: string;
    lastObservedState?: "stopped" | "pending" | "unknown";
  };
};

/** Trusted host adapter. save must atomically compare the durable revision (0 = absent),
 * commit the entire snapshot durably, or reject. load must return a detached snapshot.
 * CAS prevents stale backends from overwriting accepted stop state after a restart.
 * A failed save poisons that loaded record; resuming requires explicit restore/load
 * into a fresh record after reconciliation. Backend never replays a create.
 * Concrete SQLite is deferred.
 */
export interface InstaboxRecoveryStore {
  load(recordId: string): Promise<InstaboxRecoveryRecord | null>;
  save(record: InstaboxRecoveryRecord, expectedRevision: number): Promise<void>;
}
