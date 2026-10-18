// packages/agent-runtime/executionAudit.ts
//
// Provider-agnostic audit + billing model for execution backends.
//
// Why this exists: sbx (Docker Agentic Platform), Instabox, Cloudflare
// Containers, GCP Cloud Run jobs and Vultr all expose the same lifecycle
// (create → run → stop) but bill and report timing differently. Rather than one
// abstraction per provider, the run is described once here:
//
//   requestedAt → readyAt → finishedAt
//   bootMs = readyAt - requestedAt      (cold start, the number users feel)
//   runMs  = finishedAt - readyAt       (what the provider bills for)
//
// `source` is deliberately explicit: Docker's sbx has no usage API, so its cost
// is a local estimate and must never be presented as measured.

export type ExecutionBillingUnit =
  | "second"
  | "vcpu-second"
  | "gib-second"
  | "hour"
  | "free";

/**
 * How strong the isolation actually is. Declared per run so no surface can
 * present host execution as a "sandbox":
 *   none       → plain host process (today's macOS desktop path)
 *   seatbelt   → macOS sandbox-exec profile (best effort, deprecated by Apple)
 *   os-sandbox → Linux user namespaces + seccomp (linux-bubblewrap-v1)
 *   container  → container/VM boundary (Instabox, sbx, CF, Cloud Run, Vultr)
 */
export type ExecutionIsolation = "none" | "seatbelt" | "os-sandbox" | "container";

/** How a backend charges. Every provider maps onto exactly one of these. */
export type ExecutionBillingModel =
  | { kind: "free" }
  /** Fixed price per wall-clock second (e.g. a shape-priced sandbox). */
  | { kind: "per-second"; rateNanoUsd: string }
  /** CPU + memory priced separately, per second of runtime. */
  | {
      kind: "vcpu-gib-second";
      /**
       * vCPU in millionths (1_000_000 = 1 vCPU). Integer so that the smallest
       * real shapes stay exact: Cloudflare Containers runs 0.0625 vCPU, which a
       * thousandths field cannot express (62.5 milli).
       */
      vcpuMicro: number;
      /** GiB in millionths (500_000 = 0.5 GiB). */
      gibMicro: number;
      vcpuRateNanoUsd: string;
      gibRateNanoUsd: string;
    }
  /** Billed by the hour with per-hour rounding (typical VM). */
  | { kind: "per-hour"; rateNanoUsd: string };

export type ExecutionCost = {
  unit: ExecutionBillingUnit;
  /** Integer micro-units of `unit` (never a float). */
  quantityMicros: string;
  rateNanoUsd: string;
  /** Integer nanoUSD. */
  costNanoUsd: string;
  source: "provider-usage" | "local-estimate";
};

export type ExecutionAuditTimes = {
  /** When we asked the provider to create the workload. */
  requestedAt: number;
  /** When the workload became executable (cold start end). Absent = never ready. */
  readyAt?: number;
  /** When release/stop was confirmed. Absent = still running or unconfirmed. */
  finishedAt?: number;
};

export type ExecutionAuditTerminalStatus = "done" | "failed" | "cancelled";

export type ExecutionAuditRecord = {
  runId: string;
  backendId: string;
  provider: string;
  /** Provider-side identity: sandbox name, machine id, container id. */
  externalId?: string;
  times: ExecutionAuditTimes;
  /** requestedAt → readyAt: the number that matters to a user waiting. */
  bootMs?: number;
  /** readyAt → finishedAt: the interval providers bill for. */
  runMs?: number;
  billingModel: ExecutionBillingModel;
  cost?: ExecutionCost;
  /** Measured isolation strength. Absent is treated as "none" by consumers. */
  isolation: ExecutionIsolation;
  /**
   * Set when the LOCAL TIMING WINDOW is unknown (the run finished without ever
   * being observed ready). This is about observability, not about money:
   * `cost` may still be present, sourced from provider usage.
   * Consumers must not exclude such a record from billing sums; conversely, a
   * missing `cost` only means "0" when this field is absent as well AND
   * `finishedAt` is defined (an unfinished record has no cost yet, which is not
   * the same as costing nothing).
   */
  billingGap?: "no-ready-at";
  status: ExecutionAuditTerminalStatus | "running";
  errorCode?: string;
  cleanupStatus: "released" | "cleanup_pending" | "not-created";
};

/** Micro-units per one base unit. */
const MICROS_PER_UNIT = 1_000_000n;
/** Millionths of one billing unit (vCPU / GiB). Same scale, different subject. */
const UNIT_MICROS = 1_000_000n;
const NANO_PER_MICRO = 1_000n;

function toBigInt(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite billing input");
    return BigInt(Math.round(value));
  }
  if (!/^-?\d+$/.test(value)) throw new Error(`not an integer: ${value}`);
  return BigInt(value);
}

/** Ceiling division for positive bigints (no float, no silent truncation). */
function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error("denominator must be positive");
  if (numerator <= 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

/**
 * Compute the billed cost for a duration under a given model.
 *
 * `elapsedMs` is the interval the provider bills (readyAt → finishedAt), not the
 * whole call. Rounding is always upward so a multi-provider total never
 * under-reports; per-hour and granular-second billing both round up.
 */
export function computeExecutionCost(args: {
  model: ExecutionBillingModel;
  elapsedMs: number;
  /** Provider-reported usage overrides the local estimate when present. */
  source?: ExecutionCost["source"];
}): ExecutionCost {
  const source = args.source ?? "local-estimate";
  const elapsedMs = Math.max(0, Math.floor(args.elapsedMs));
  // Microseconds, exact.
  const durationMicros = BigInt(elapsedMs) * 1000n;

  const finish = (
    unit: ExecutionBillingUnit,
    quantityMicros: bigint,
    rateNanoUsd: bigint,
  ): ExecutionCost => ({
    unit,
    quantityMicros: quantityMicros.toString(),
    rateNanoUsd: rateNanoUsd.toString(),
    // rate is per whole unit; quantity is in micro-units.
    costNanoUsd: ceilDiv(quantityMicros * rateNanoUsd, MICROS_PER_UNIT).toString(),
    source,
  });

  switch (args.model.kind) {
    case "free":
      return {
        unit: "free",
        quantityMicros: durationMicros.toString(),
        rateNanoUsd: "0",
        costNanoUsd: "0",
        source,
      };
    case "per-second":
      return finish("second", durationMicros, toBigInt(args.model.rateNanoUsd));
    case "vcpu-gib-second": {
      const vcpuMicro = BigInt(Math.max(0, Math.round(args.model.vcpuMicro)));
      const gibMicro = BigInt(Math.max(0, Math.round(args.model.gibMicro)));
      // size = micro-seconds × millionths-of-a-unit → seconds scaled by 1e12.
      const denom = UNIT_MICROS * UNIT_MICROS;
      const vcpuCost = ceilDiv(
        durationMicros * vcpuMicro * toBigInt(args.model.vcpuRateNanoUsd),
        denom,
      );
      const gibCost = ceilDiv(
        durationMicros * gibMicro * toBigInt(args.model.gibRateNanoUsd),
        denom,
      );
      return {
        unit: "vcpu-second",
        // Quantity reported in vCPU-seconds (rounded up to a micro-unit).
        quantityMicros: ceilDiv(durationMicros * vcpuMicro, UNIT_MICROS).toString(),
        rateNanoUsd: toBigInt(args.model.vcpuRateNanoUsd).toString(),
        costNanoUsd: (vcpuCost + gibCost).toString(),
        source,
      };
    }
    case "per-hour": {
      const hoursMicro = ceilDiv(durationMicros, MICROS_PER_UNIT * 3600n) * MICROS_PER_UNIT;
      return finish("hour", hoursMicro, toBigInt(args.model.rateNanoUsd));
    }
  }
}

/**
 * Assemble the audit record. Times are kept separate on purpose: collapsing
 * them into a single "duration" is what makes cold starts invisible.
 */
export function buildExecutionAuditRecord(args: {
  runId: string;
  backendId: string;
  provider: string;
  externalId?: string;
  times: ExecutionAuditTimes;
  billingModel: ExecutionBillingModel;
  /** Isolation strength actually provided. Defaults to "none": never claim more. */
  isolation?: ExecutionIsolation;
  status: ExecutionAuditRecord["status"];
  errorCode?: string;
  cleanupStatus: ExecutionAuditRecord["cleanupStatus"];
  /** Only for providers that expose a usage API. */
  providerUsageMs?: number;
}): ExecutionAuditRecord {
  const { requestedAt, readyAt, finishedAt } = args.times;
  const bootMs = readyAt !== undefined ? Math.max(0, readyAt - requestedAt) : undefined;
  const runMs = readyAt !== undefined && finishedAt !== undefined
    ? Math.max(0, finishedAt - readyAt)
    : undefined;

  // Provider-reported usage is billable even when we never observed readyAt
  // (a machine can be created and billed before its boot fails). Dropping it
  // would silently under-count, so provider usage wins over the local window.
  const billableMs = args.providerUsageMs ?? runMs;
  const cost = billableMs === undefined
    ? undefined
    : computeExecutionCost({
        model: args.billingModel,
        elapsedMs: billableMs,
        ...(args.providerUsageMs !== undefined ? { source: "provider-usage" as const } : {}),
      });

  // The gap is about the local window, not about money: an execution can finish
  // without ever being observed ready, in which case bootMs/runMs are unknown
  // even when the provider reported billable usage.
  const billingGap = args.times.readyAt === undefined && args.times.finishedAt !== undefined
    ? ("no-ready-at" as const)
    : undefined;

  return {
    runId: args.runId,
    backendId: args.backendId,
    provider: args.provider,
    ...(args.externalId ? { externalId: args.externalId } : {}),
    times: args.times,
    ...(bootMs !== undefined ? { bootMs } : {}),
    ...(runMs !== undefined ? { runMs } : {}),
    billingModel: args.billingModel,
    ...(cost ? { cost } : {}),
    // Conservative default: a caller that forgets to declare isolation gets
    // "none", never an implied sandbox.
    isolation: args.isolation ?? "none",
    ...(billingGap ? { billingGap } : {}),
    status: args.status,
    ...(args.errorCode ? { errorCode: args.errorCode } : {}),
    cleanupStatus: args.cleanupStatus,
  };
}

/** NanoUSD → a human string for logs/dashboards (never used for storage). */
export function formatNanoUsd(nanoUsd: string): string {
  const n = toBigInt(nanoUsd);
  const sign = n < 0n ? "-" : "";
  const abs = n < 0n ? -n : n;
  const whole = abs / 1_000_000_000n;
  const frac = (abs % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return `${sign}$${whole.toString()}${frac ? `.${frac}` : ""}`;
}
