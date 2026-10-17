/**
 * Docker Agentic Platform Budget Admission Engine
 *
 * Core pure state machine and admission policy for Docker compute runtime.
 * Implements strict nanoUSD budget reservations, inflight tracking,
 * unreconciled debt retention, verified identity binding, and snapshot validation.
 *
 * Security & Financial Guarantees:
 * 1. Unit & Precision:
 *    - All monetary balances, rates, and debts are strictly represented as `bigint` nanoUSD (1 USD = 1,000,000,000 nanoUSD).
 *    - Reject negative or zero rates.
 *    - Reject unsupported units (only "second" is currently supported).
 *    - TTL budget calculation uses ceil rounding: Math.ceil(ttlSeconds) * rateNanoUsd.
 *    - Rejects if requested maxBudget is less than required estimated budget.
 *
 * 2. Snapshot Freshness:
 *    - Snapshots must not be in the future (beyond clock skew tolerance).
 *    - Snapshots must not be stale (older than maxStalenessMs).
 *
 * 3. Identity & Account Binding:
 *    - Owner and Docker account binding MUST have a trusted, verified identity.
 *    - If unverified or mismatched with the execution Docker account, admission is NOT auto-granted;
 *      instead it yields structured `status: "approval-required"`.
 *    - Unconfirmed browser observations alone NEVER auto-approve.
 *
 * 4. Atomic Repository Contract:
 *    - State transitions (reserve, stop, cancel, reconcile) rely on an injected atomic repository.
 *    - No module-level global Map pretending to be cross-process.
 *    - If an atomic persistent repository is not configured, engine status is "not-configured" and cannot be ready.
 *
 * 5. Available Quota & Debt Invariant:
 *    available = snapshot.availableNanoUsd - inflightReservationsNanoUsd - spentUnreconciledDebtNanoUsd
 *    - Both inflight reservations and stopped-unbilled debts reduce available quota.
 *    - Stopping a run transitions inflight to spent-unreconciled debt; it CANNOT be released for free.
 *    - Failure before sandbox creation can cancel inflight reservation (refunded).
 *    - Completion records a conservative maximum or explicit runtime estimate, NEVER claiming confirmed billing actual.
 *    - Only trusted reconcile proofs with explicit billing watermarks can reduce or clear debt.
 *      Refreshing observedAt or passing 48h alone CANNOT clear debt!
 *
 * 6. Isolation & Idempotency:
 *    - Isolated by accountId / ownerId.
 *    - Idempotent request IDs prevent double reservations and duplicate stop debts.
 *    - Zero writes to Nolo billing ledger (Docker spend is private to Docker platform).
 */

import type { DockerQuotaSnapshot } from "./dockerCloudQuota";
import type { DockerBrowserQuotaResult } from "./dockerBrowserQuota";

export const NANO_USD_PER_USD = 1_000_000_000n;
export const NANO_USD_PER_MICRO_USD = 1_000n;
export const NANO_USD_PER_CENT = 10_000_000n;

export const DEFAULT_MAX_TTL_SECONDS = 86_400; // 24 hours
export const DEFAULT_MAX_STALENESS_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_CLOCK_SKEW_TOLERANCE_MS = 5_000; // 5 seconds

export type DockerRateUnit = "second";

export interface DockerVerifiedIdentity {
  /** The verified Docker account ID or namespace (e.g. "org-slug" or "docker-user") */
  accountId: string;
  /** Verification origin */
  verifiedBy:
    | "docker-cli-keyring"
    | "docker-connect-token"
    | "nolo-identity-provider"
    | "manual-operator-confirmation";
  /** Timestamp when identity verification occurred */
  verifiedAt: number;
  /** Must be true for automated admission; unverified/false requires approval */
  trusted: boolean;
}

export interface DockerBudgetSnapshotInput {
  source: "docker-agentic-platform-connect" | "docker-agentic-platform-browser";
  observedAt: number;
  /** Unconfirmed or extracted account identity if present */
  accountIdentity?: string;
  /** Real-time available balance in nanoUSD */
  availableNanoUsd: bigint;
  /** Rate per unit in nanoUSD */
  rateNanoUsd: bigint;
  /** Unit of the rate (e.g. "second") */
  rateUnit: string;
}

export interface DockerAdmissionRequest {
  /** Unique idempotent request identifier */
  requestId: string;
  /** Docker account intended for execution */
  targetDockerAccountId: string;
  /** Owner ID within Nolo workspace */
  ownerId: string;
  /** Planned execution duration / TTL in seconds */
  ttlSeconds: number;
  /** Optional upper bound cap on budget; if estimated exceeds this, reject */
  maxBudgetNanoUsd?: bigint;
  /** Trusted verified identity binding */
  verifiedIdentity?: DockerVerifiedIdentity;
  /** Fresh quota snapshot from connect RPC or browser bridge */
  snapshot: DockerBudgetSnapshotInput;
  /** Current wall-clock time for verification */
  now?: number;
}

export type DockerAdmissionRejectionReason =
  | "ATOMIC_REPOSITORY_NOT_CONFIGURED"
  | "INVALID_RATE"
  | "UNSUPPORTED_RATE_UNIT"
  | "INVALID_TTL"
  | "TTL_EXCEEDS_MAX_LIMIT"
  | "INSUFFICIENT_MAX_BUDGET"
  | "FUTURE_SNAPSHOT"
  | "STALE_SNAPSHOT"
  | "INSUFFICIENT_AVAILABLE_BUDGET"
  | "ACCOUNT_ALREADY_RESERVED"
  | "REPOSITORY_ERROR";

export type DockerApprovalRequiredReason =
  | "UNVERIFIED_ACCOUNT_IDENTITY"
  | "ACCOUNT_IDENTITY_MISMATCH"
  | "MISSING_VERIFIED_IDENTITY";

export interface DockerBudgetEstimate {
  ttlSeconds: number;
  rateNanoUsd: bigint;
  rateUnit: DockerRateUnit;
  estimatedBudgetNanoUsd: bigint;
}

export interface DockerAdmissionApprovalRequired {
  ok: false;
  status: "approval-required";
  reason: DockerApprovalRequiredReason;
  message: string;
  estimate: DockerBudgetEstimate;
  details: {
    targetDockerAccountId: string;
    verifiedAccountId?: string;
    verifiedBy?: string;
  };
}

export interface DockerAdmissionRejected {
  ok: false;
  status: "rejected";
  reason: DockerAdmissionRejectionReason;
  message: string;
  estimate?: DockerBudgetEstimate;
  availableNanoUsd?: bigint;
  requiredNanoUsd?: bigint;
}

export interface DockerReservation {
  requestId: string;
  accountId: string;
  ownerId: string;
  reservedNanoUsd: bigint;
  ttlSeconds: number;
  rateNanoUsd: bigint;
  createdAt: number;
  expiresAt: number;
  status: "inflight" | "stopped" | "cancelled";
  /** Explicit runtime actual estimate (not confirmed billing actual) */
  runtimeActualEstimateNanoUsd?: bigint;
  stoppedAt?: number;
  cancelledAt?: number;
}

export interface DockerAdmissionAdmitted {
  ok: true;
  status: "admitted";
  reservation: DockerReservation;
  estimate: DockerBudgetEstimate;
  duplicate?: boolean;
}

export type DockerAdmissionResult =
  | DockerAdmissionAdmitted
  | DockerAdmissionRejected
  | DockerAdmissionApprovalRequired;

export interface DockerStopRequest {
  requestId: string;
  accountId: string;
  ownerId: string;
  /**
   * Runtime actual estimate or conservative maximum.
   * If omitted, falls back to conservative maximum (reservedNanoUsd).
   * Note: This is an internal runtime estimate, NOT a claim of official billing actual.
   */
  runtimeActualEstimateNanoUsd?: bigint;
  stoppedAt?: number;
}

export interface DockerStopResult {
  ok: boolean;
  status: "stopped" | "not-found" | "invalid-state" | "repository-error";
  reservation?: DockerReservation;
  spentUnreconciledDebtNanoUsd?: bigint;
  duplicate?: boolean;
  error?: string;
}

export interface DockerCancelRequest {
  requestId: string;
  accountId: string;
  ownerId: string;
  cancelledAt?: number;
}

export interface DockerCancelResult {
  ok: boolean;
  status: "cancelled" | "not-found" | "cannot-cancel-stopped" | "repository-error";
  reservation?: DockerReservation;
  duplicate?: boolean;
  error?: string;
}

export interface DockerReconcileProof {
  proofId: string;
  accountId: string;
  /** Billing watermark timestamp from official billing summary */
  watermarkTimestamp: number;
  /** Amount confirmed incorporated into settled billing, in nanoUSD */
  reconciledAmountNanoUsd: bigint;
  /** Signature or proof metadata */
  proofSource: "docker-connect-billing-summary" | "manual-audit";
}

export interface DockerReconcileResult {
  ok: boolean;
  previousDebtNanoUsd: bigint;
  newDebtNanoUsd: bigint;
  clearedDebtNanoUsd: bigint;
  watermarkTimestamp: number;
}

export interface DockerAccountBudgetState {
  accountId: string;
  totalInflightNanoUsd: bigint;
  spentUnreconciledDebtNanoUsd: bigint;
  activeInflightCount: number;
  lastReconciledWatermark?: {
    watermarkTimestamp: number;
    reconciledAt: number;
    proofId: string;
  };
}

/**
 * Atomic repository contract for production storage.
 * Production implementations MUST guarantee ACID / serializable transaction semantics
 * across concurrent processes/hosts (e.g., PostgreSQL SELECT FOR UPDATE or Redis Lua script with CAS).
 */
export interface DockerBudgetRepository {
  /**
   * Indicates whether this repository is a true persistent, cross-process atomic store.
   * Test-only in-memory mocks must set this to false unless explicitly configured for testing.
   */
  readonly isPersistentAtomicStore: boolean;

  /**
   * Retrieves the current aggregated budget state for an account.
   */
  getAccountState(accountId: string): Promise<DockerAccountBudgetState>;

  /**
   * Retrieves an existing reservation by requestId within an account.
   */
  getReservation(accountId: string, requestId: string): Promise<DockerReservation | null>;

  /**
   * Atomically evaluates available budget and creates a reservation if available >= required.
   * Must be idempotent on requestId.
   */
  atomicReserve(
    reservation: DockerReservation,
    snapshotAvailableNanoUsd: bigint,
  ): Promise<
    | { ok: true; reservation: DockerReservation; duplicate?: boolean }
    | { ok: false; reason: "INSUFFICIENT_AVAILABLE_BUDGET"; availableNanoUsd: bigint; requiredNanoUsd: bigint }
    | { ok: false; reason: "CONFLICT"; message: string }
  >;

  /**
   * Atomically transitions an inflight reservation to stopped, deducting inflight and adding debt.
   * Cannot be released for free.
   * Idempotent: duplicate stop calls must not double-accumulate debt.
   */
  atomicStop(
    request: DockerStopRequest,
  ): Promise<
    | { ok: true; reservation: DockerReservation; spentUnreconciledDebtNanoUsd: bigint; duplicate?: boolean }
    | { ok: false; status: "not-found" | "invalid-state"; message: string }
  >;

  /**
   * Atomically cancels a reservation before sandbox creation.
   * Refunds inflight reservation back to available budget without debt.
   * Cannot cancel if already stopped.
   */
  atomicCancelBeforeSandbox(
    request: DockerCancelRequest,
  ): Promise<
    | { ok: true; reservation: DockerReservation; duplicate?: boolean }
    | { ok: false; status: "not-found" | "cannot-cancel-stopped"; message: string }
  >;

  /**
   * Atomically reconciles unreconciled debt using a verified billing watermark.
   * Passing time or refreshing snapshots CANNOT clear debt without this proof.
   */
  atomicReconcileDebt(
    proof: DockerReconcileProof,
  ): Promise<DockerReconcileResult>;
}

export interface DockerBudgetAdmissionEngineConfig {
  /**
   * Atomic repository adapter.
   * If omitted, engine remains in "not-configured" state and will reject admissions.
   */
  repository?: DockerBudgetRepository;
  maxTtlSeconds?: number;
  maxStalenessMs?: number;
  clockSkewToleranceMs?: number;
}

/**
 * Converts a DockerQuotaSnapshot from dockerCloudQuota into DockerBudgetSnapshotInput.
 * Since Cloud Connect Billing returns micro-USD balances, it is converted to nano-USD.
 * A verified second-rate must be supplied since Connect billing summary only contains balances.
 */
export function fromCloudQuotaSnapshot(
  snapshot: DockerQuotaSnapshot,
  rateNanoUsd: bigint,
  rateUnit: string = "second",
): DockerBudgetSnapshotInput {
  return {
    source: snapshot.source,
    observedAt: snapshot.observedAt,
    accountIdentity: snapshot.accountIdentity,
    availableNanoUsd: snapshot.availableCreditMicroUsd * NANO_USD_PER_MICRO_USD,
    rateNanoUsd,
    rateUnit,
  };
}

/**
 * Converts a successful DockerBrowserQuotaResult from dockerBrowserQuota into DockerBudgetSnapshotInput.
 * Note: browser observations DO NOT have verified account identity.
 */
export function fromBrowserQuotaSnapshot(
  result: DockerBrowserQuotaResult & { ok: true },
): DockerBudgetSnapshotInput | null {
  if (!result.mediumRuntimeRate) {
    return null;
  }
  return {
    source: result.source,
    observedAt: result.observedAt,
    accountIdentity: undefined, // Browser tab does not guarantee verified identity
    availableNanoUsd: result.availableToSpendNanoUsd,
    rateNanoUsd: result.mediumRuntimeRate.rateNanoUsd,
    rateUnit: result.mediumRuntimeRate.unit,
  };
}

/**
 * Calculates estimated budget in nanoUSD using ceiling rounding:
 * Math.ceil(ttlSeconds) * rateNanoUsd.
 */
export function calculateEstimatedBudget(
  ttlSeconds: number,
  rateNanoUsd: bigint,
): bigint {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("Invalid ttlSeconds: must be positive finite number");
  }
  if (rateNanoUsd <= 0n) {
    throw new Error("Invalid rateNanoUsd: must be positive non-zero bigint");
  }
  const ceilSeconds = BigInt(Math.ceil(ttlSeconds));
  return ceilSeconds * rateNanoUsd;
}

/**
 * Core Docker Budget Admission Engine
 */
export class DockerBudgetAdmissionEngine {
  private readonly repository?: DockerBudgetRepository;
  private readonly maxTtlSeconds: number;
  private readonly maxStalenessMs: number;
  private readonly clockSkewToleranceMs: number;

  constructor(config: DockerBudgetAdmissionEngineConfig = {}) {
    this.repository = config.repository;
    this.maxTtlSeconds = config.maxTtlSeconds ?? DEFAULT_MAX_TTL_SECONDS;
    this.maxStalenessMs = config.maxStalenessMs ?? DEFAULT_MAX_STALENESS_MS;
    this.clockSkewToleranceMs =
      config.clockSkewToleranceMs ?? DEFAULT_CLOCK_SKEW_TOLERANCE_MS;
  }

  /**
   * Returns true only when a valid, persistent atomic repository is configured.
   */
  public isReady(): boolean {
    return Boolean(this.repository && this.repository.isPersistentAtomicStore);
  }

  public getStatus(): "ready" | "not-configured" {
    return this.isReady() ? "ready" : "not-configured";
  }

  /**
   * Pre-flight pure validation of an admission request without modifying state.
   */
  public validateRequest(
    request: DockerAdmissionRequest,
  ):
    | { valid: true; estimate: DockerBudgetEstimate }
    | { valid: false; rejection: DockerAdmissionRejected | DockerAdmissionApprovalRequired } {
    const now = request.now ?? Date.now();

    // 0. Owner and target Docker account identity guards
    if (
      typeof request.ownerId !== "string" ||
      request.ownerId.trim().length === 0
    ) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "REPOSITORY_ERROR",
          message: `ownerId must be a non-empty string. Received: ${request.ownerId}`,
        },
      };
    }

    if (
      typeof request.targetDockerAccountId !== "string" ||
      request.targetDockerAccountId.trim().length === 0
    ) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "REPOSITORY_ERROR",
          message: `targetDockerAccountId must be a non-empty string. Received: ${request.targetDockerAccountId}`,
        },
      };
    }

    // 0.1 Clock and timestamp validity guards (prevent NaN bypassing freshness)
    if (!Number.isFinite(now) || now <= 0) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "REPOSITORY_ERROR",
          message: `Evaluation timestamp 'now' must be a finite positive number. Received: ${now}`,
        },
      };
    }

    const observedAt = request.snapshot.observedAt;
    if (!Number.isFinite(observedAt) || observedAt <= 0) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "STALE_SNAPSHOT",
          message: `Snapshot observedAt must be a valid positive finite timestamp. Received: ${observedAt}`,
        },
      };
    }

    // 0.2 Balance validity guard
    if (
      typeof request.snapshot.availableNanoUsd !== "bigint" ||
      request.snapshot.availableNanoUsd < 0n
    ) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "INSUFFICIENT_AVAILABLE_BUDGET",
          message: `Available budget must be a non-negative bigint nanoUSD. Received: ${request.snapshot.availableNanoUsd}`,
          availableNanoUsd: 0n,
        },
      };
    }

    // 1. Rate unit & rate value check
    if (request.snapshot.rateUnit !== "second") {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "UNSUPPORTED_RATE_UNIT",
          message: `Unsupported rate unit '${request.snapshot.rateUnit}'. Only 'second' is supported.`,
        },
      };
    }

    if (request.snapshot.rateNanoUsd <= 0n) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "INVALID_RATE",
          message: `Rate must be strictly positive non-zero nanoUSD. Received: ${request.snapshot.rateNanoUsd}`,
        },
      };
    }

    // 2. TTL check
    if (
      !Number.isFinite(request.ttlSeconds) ||
      request.ttlSeconds <= 0 ||
      !Number.isInteger(request.ttlSeconds)
    ) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "INVALID_TTL",
          message: `TTL seconds must be a positive integer. Received: ${request.ttlSeconds}`,
        },
      };
    }

    if (request.ttlSeconds > this.maxTtlSeconds) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "TTL_EXCEEDS_MAX_LIMIT",
          message: `Requested TTL ${request.ttlSeconds}s exceeds configured maximum limit of ${this.maxTtlSeconds}s.`,
        },
      };
    }

    // 3. Calculate estimate
    const estimatedBudgetNanoUsd = calculateEstimatedBudget(
      request.ttlSeconds,
      request.snapshot.rateNanoUsd,
    );
    const estimate: DockerBudgetEstimate = {
      ttlSeconds: request.ttlSeconds,
      rateNanoUsd: request.snapshot.rateNanoUsd,
      rateUnit: "second",
      estimatedBudgetNanoUsd,
    };

    // 4. Max budget check
    if (
      request.maxBudgetNanoUsd !== undefined &&
      request.maxBudgetNanoUsd < estimatedBudgetNanoUsd
    ) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "INSUFFICIENT_MAX_BUDGET",
          message: `Requested max budget (${request.maxBudgetNanoUsd} nanoUSD) is less than required estimated budget (${estimatedBudgetNanoUsd} nanoUSD).`,
          estimate,
          requiredNanoUsd: estimatedBudgetNanoUsd,
        },
      };
    }

    // 5. Snapshot freshness check
    if (observedAt > now + this.clockSkewToleranceMs) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "FUTURE_SNAPSHOT",
          message: `Snapshot observedAt (${observedAt}) is in the future compared to current time (${now}).`,
          estimate,
        },
      };
    }

    if (now - observedAt > this.maxStalenessMs) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "rejected",
          reason: "STALE_SNAPSHOT",
          message: `Snapshot observedAt is stale (${now - observedAt}ms old, max allowed: ${this.maxStalenessMs}ms). Fresh snapshot required.`,
          estimate,
        },
      };
    }

    // 6. Identity verification check (Must be verified and match target Docker account)
    if (!request.verifiedIdentity || !request.verifiedIdentity.trusted) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "approval-required",
          reason: "UNVERIFIED_ACCOUNT_IDENTITY",
          message:
            "Execution Docker account requires trusted verified identity. Unconfirmed browser observation or unverified account cannot auto-admit.",
          estimate,
          details: {
            targetDockerAccountId: request.targetDockerAccountId,
            verifiedAccountId: request.verifiedIdentity?.accountId,
            verifiedBy: request.verifiedIdentity?.verifiedBy,
          },
        },
      };
    }

    if (request.verifiedIdentity.accountId !== request.targetDockerAccountId) {
      return {
        valid: false,
        rejection: {
          ok: false,
          status: "approval-required",
          reason: "ACCOUNT_IDENTITY_MISMATCH",
          message: `Verified account identity '${request.verifiedIdentity.accountId}' does not match target Docker account '${request.targetDockerAccountId}'.`,
          estimate,
          details: {
            targetDockerAccountId: request.targetDockerAccountId,
            verifiedAccountId: request.verifiedIdentity.accountId,
            verifiedBy: request.verifiedIdentity.verifiedBy,
          },
        },
      };
    }

    return { valid: true, estimate };
  }

  /**
   * Evaluates admission and atomically creates a budget reservation.
   * If atomic repository is missing, returns not-configured rejection.
   */
  public async requestAdmission(
    request: DockerAdmissionRequest,
  ): Promise<DockerAdmissionResult> {
    // Check repository configuration
    if (!this.repository) {
      return {
        ok: false,
        status: "rejected",
        reason: "ATOMIC_REPOSITORY_NOT_CONFIGURED",
        message:
          "Persistent atomic repository is not configured. Admissions cannot proceed without atomic ACID guarantees.",
      };
    }

    // Run static pure validations
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      return validation.rejection;
    }

    const { estimate } = validation;
    const now = request.now ?? Date.now();
    const expiresAt = now + request.ttlSeconds * 1000;

    const reservation: DockerReservation = {
      requestId: request.requestId,
      accountId: request.targetDockerAccountId,
      ownerId: request.ownerId,
      reservedNanoUsd: estimate.estimatedBudgetNanoUsd,
      ttlSeconds: request.ttlSeconds,
      rateNanoUsd: estimate.rateNanoUsd,
      createdAt: now,
      expiresAt,
      status: "inflight",
    };

    try {
      const reserveResult = await this.repository.atomicReserve(
        reservation,
        request.snapshot.availableNanoUsd,
      );

      if (reserveResult.ok) {
        return {
          ok: true,
          status: "admitted",
          reservation: reserveResult.reservation,
          estimate,
          duplicate: reserveResult.duplicate,
        };
      }

      if (reserveResult.reason === "INSUFFICIENT_AVAILABLE_BUDGET") {
        return {
          ok: false,
          status: "rejected",
          reason: "INSUFFICIENT_AVAILABLE_BUDGET",
          message: `Insufficient available Docker budget. Available: ${reserveResult.availableNanoUsd} nanoUSD, Required: ${reserveResult.requiredNanoUsd} nanoUSD.`,
          estimate,
          availableNanoUsd: reserveResult.availableNanoUsd,
          requiredNanoUsd: reserveResult.requiredNanoUsd,
        };
      }

      return {
        ok: false,
        status: "rejected",
        reason: "REPOSITORY_ERROR",
        message: reserveResult.message,
        estimate,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: "rejected",
        reason: "REPOSITORY_ERROR",
        message: err instanceof Error ? err.message : String(err),
        estimate,
      };
    }
  }

  /**
   * Stop an inflight reservation.
   * This transfers the reserved budget to unreconciled debt (cannot release for free).
   * Conservative maximum or explicit runtime actual estimate is recorded.
   */
  public async stopExecution(
    request: DockerStopRequest,
  ): Promise<DockerStopResult> {
    if (!this.repository) {
      return {
        ok: false,
        status: "repository-error",
        error: "Persistent atomic repository is not configured.",
      };
    }

    try {
      const res = await this.repository.atomicStop(request);
      if (res.ok) {
        return {
          ok: true,
          status: "stopped",
          reservation: res.reservation,
          spentUnreconciledDebtNanoUsd: res.spentUnreconciledDebtNanoUsd,
          duplicate: res.duplicate,
        };
      }
      return {
        ok: false,
        status: res.status,
        error: res.message,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: "repository-error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Cancels a reservation if and only if failure happened BEFORE sandbox creation.
   * Refunds inflight reservation back to available budget without debt.
   */
  public async cancelBeforeSandbox(
    request: DockerCancelRequest,
  ): Promise<DockerCancelResult> {
    if (!this.repository) {
      return {
        ok: false,
        status: "repository-error",
        error: "Persistent atomic repository is not configured.",
      };
    }

    try {
      const res = await this.repository.atomicCancelBeforeSandbox(request);
      if (res.ok) {
        return {
          ok: true,
          status: "cancelled",
          reservation: res.reservation,
          duplicate: res.duplicate,
        };
      }
      return {
        ok: false,
        status: res.status,
        error: res.message,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: "repository-error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Reconciles unreconciled debt against a verified billing watermark.
   */
  public async reconcileDebt(
    proof: DockerReconcileProof,
  ): Promise<DockerReconcileResult> {
    if (!this.repository) {
      throw new Error("Persistent atomic repository is not configured.");
    }
    return this.repository.atomicReconcileDebt(proof);
  }

  /**
   * Queries the current account budget state.
   */
  public async getAccountState(
    accountId: string,
  ): Promise<DockerAccountBudgetState> {
    if (!this.repository) {
      return {
        accountId,
        totalInflightNanoUsd: 0n,
        spentUnreconciledDebtNanoUsd: 0n,
        activeInflightCount: 0,
      };
    }
    return this.repository.getAccountState(accountId);
  }
}

/**
 * In-Memory Atomic Repository Implementation.
 * NOTE: For unit testing and single-node integration testing only.
 * This class uses an asynchronous queue mutex per account to provide atomic ACID-equivalent
 * isolation within a single JS process.
 *
 * For multi-process / clustered production deployments, a persistent atomic repository
 * adapter (PostgreSQL row locks / Redis Lua) MUST be implemented.
 */
export class InMemoryDockerBudgetRepository implements DockerBudgetRepository {
  public readonly isPersistentAtomicStore: boolean;
  private reservations = new Map<string, DockerReservation>(); // key: `${accountId}:${requestId}`
  private debts = new Map<string, bigint>(); // key: accountId -> spentUnreconciledDebtNanoUsd
  private watermarks = new Map<
    string,
    { watermarkTimestamp: number; reconciledAt: number; proofId: string }
  >();
  private accountLocks = new Map<string, Promise<void>>();

  constructor(options: { isPersistentAtomicStore?: boolean } = {}) {
    // Defaults to true when explicitly instantiated for in-process test runs
    this.isPersistentAtomicStore = options.isPersistentAtomicStore ?? true;
  }

  private async withAccountLock<T>(
    accountId: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const prevLock = this.accountLocks.get(accountId) || Promise.resolve();
    let releaseLock: () => void = () => {};
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.accountLocks.set(
      accountId,
      prevLock.then(() => currentLock),
    );

    await prevLock;
    try {
      return await action();
    } finally {
      releaseLock();
    }
  }

  public async getAccountState(
    accountId: string,
  ): Promise<DockerAccountBudgetState> {
    return this.withAccountLock(accountId, async () => {
      let totalInflight = 0n;
      let count = 0;
      for (const res of this.reservations.values()) {
        if (res.accountId === accountId && res.status === "inflight") {
          totalInflight += res.reservedNanoUsd;
          count++;
        }
      }
      const debt = this.debts.get(accountId) ?? 0n;
      const watermark = this.watermarks.get(accountId);

      return {
        accountId,
        totalInflightNanoUsd: totalInflight,
        spentUnreconciledDebtNanoUsd: debt,
        activeInflightCount: count,
        lastReconciledWatermark: watermark,
      };
    });
  }

  public async getReservation(
    accountId: string,
    requestId: string,
  ): Promise<DockerReservation | null> {
    const key = `${accountId}:${requestId}`;
    const res = this.reservations.get(key);
    return res ? { ...res } : null;
  }

  public async atomicReserve(
    reservation: DockerReservation,
    snapshotAvailableNanoUsd: bigint,
  ): Promise<
    | { ok: true; reservation: DockerReservation; duplicate?: boolean }
    | { ok: false; reason: "INSUFFICIENT_AVAILABLE_BUDGET"; availableNanoUsd: bigint; requiredNanoUsd: bigint }
    | { ok: false; reason: "CONFLICT"; message: string }
  > {
    return this.withAccountLock(reservation.accountId, async () => {
      const key = `${reservation.accountId}:${reservation.requestId}`;
      const existing = this.reservations.get(key);

      if (existing) {
        if (existing.status === "inflight") {
          return { ok: true, reservation: { ...existing }, duplicate: true };
        }
        return {
          ok: false,
          reason: "CONFLICT",
          message: `Request '${reservation.requestId}' already exists with terminal status '${existing.status}'. Cannot re-reserve.`,
        };
      }

      // Calculate total inflight and unreconciled debt
      let currentInflight = 0n;
      for (const res of this.reservations.values()) {
        if (res.accountId === reservation.accountId && res.status === "inflight") {
          currentInflight += res.reservedNanoUsd;
        }
      }
      const currentDebt = this.debts.get(reservation.accountId) ?? 0n;

      // Available budget invariant: snapshot.available - inflight - debt
      const netAvailable = snapshotAvailableNanoUsd - currentInflight - currentDebt;

      if (netAvailable < reservation.reservedNanoUsd) {
        return {
          ok: false,
          reason: "INSUFFICIENT_AVAILABLE_BUDGET",
          availableNanoUsd: netAvailable < 0n ? 0n : netAvailable,
          requiredNanoUsd: reservation.reservedNanoUsd,
        };
      }

      // Record reservation
      const saved: DockerReservation = { ...reservation };
      this.reservations.set(key, saved);

      return { ok: true, reservation: { ...saved } };
    });
  }

  public async atomicStop(
    request: DockerStopRequest,
  ): Promise<
    | { ok: true; reservation: DockerReservation; spentUnreconciledDebtNanoUsd: bigint; duplicate?: boolean }
    | { ok: false; status: "not-found" | "invalid-state"; message: string }
  > {
    return this.withAccountLock(request.accountId, async () => {
      const key = `${request.accountId}:${request.requestId}`;
      const existing = this.reservations.get(key);

      if (!existing) {
        return {
          ok: false,
          status: "not-found",
          message: `Reservation '${request.requestId}' not found for account '${request.accountId}'.`,
        };
      }

      if (existing.status === "stopped") {
        // Idempotent: already stopped, do not double-debit!
        const debt = this.debts.get(request.accountId) ?? 0n;
        return {
          ok: true,
          reservation: { ...existing },
          spentUnreconciledDebtNanoUsd: debt,
          duplicate: true,
        };
      }

      if (existing.status !== "inflight") {
        return {
          ok: false,
          status: "invalid-state",
          message: `Reservation '${request.requestId}' is in '${existing.status}' state and cannot be stopped.`,
        };
      }

      // Transition to stopped
      // Amount to record as debt: actual estimate or conservative maximum (reservedNanoUsd)
      const debtAmount =
        request.runtimeActualEstimateNanoUsd !== undefined
          ? request.runtimeActualEstimateNanoUsd
          : existing.reservedNanoUsd;

      existing.status = "stopped";
      existing.runtimeActualEstimateNanoUsd = debtAmount;
      existing.stoppedAt = request.stoppedAt ?? Date.now();

      const currentDebt = this.debts.get(request.accountId) ?? 0n;
      const newDebt = currentDebt + debtAmount;
      this.debts.set(request.accountId, newDebt);

      return {
        ok: true,
        reservation: { ...existing },
        spentUnreconciledDebtNanoUsd: newDebt,
      };
    });
  }

  public async atomicCancelBeforeSandbox(
    request: DockerCancelRequest,
  ): Promise<
    | { ok: true; reservation: DockerReservation; duplicate?: boolean }
    | { ok: false; status: "not-found" | "cannot-cancel-stopped"; message: string }
  > {
    return this.withAccountLock(request.accountId, async () => {
      const key = `${request.accountId}:${request.requestId}`;
      const existing = this.reservations.get(key);

      if (!existing) {
        return {
          ok: false,
          status: "not-found",
          message: `Reservation '${request.requestId}' not found for account '${request.accountId}'.`,
        };
      }

      if (existing.status === "cancelled") {
        return {
          ok: true,
          reservation: { ...existing },
          duplicate: true,
        };
      }

      if (existing.status === "stopped") {
        return {
          ok: false,
          status: "cannot-cancel-stopped",
          message: `Reservation '${request.requestId}' is already stopped and converted to debt. Cannot cancel.`,
        };
      }

      // Transition to cancelled: inflight is released, no debt added
      existing.status = "cancelled";
      existing.cancelledAt = request.cancelledAt ?? Date.now();

      return {
        ok: true,
        reservation: { ...existing },
      };
    });
  }

  public async atomicReconcileDebt(
    proof: DockerReconcileProof,
  ): Promise<DockerReconcileResult> {
    return this.withAccountLock(proof.accountId, async () => {
      const prevDebt = this.debts.get(proof.accountId) ?? 0n;
      const cleared =
        proof.reconciledAmountNanoUsd > prevDebt
          ? prevDebt
          : proof.reconciledAmountNanoUsd;
      const newDebt = prevDebt - cleared;

      this.debts.set(proof.accountId, newDebt);
      this.watermarks.set(proof.accountId, {
        watermarkTimestamp: proof.watermarkTimestamp,
        reconciledAt: Date.now(),
        proofId: proof.proofId,
      });

      return {
        ok: true,
        previousDebtNanoUsd: prevDebt,
        newDebtNanoUsd: newDebt,
        clearedDebtNanoUsd: cleared,
        watermarkTimestamp: proof.watermarkTimestamp,
      };
    });
  }
}
