// packages/agent-runtime/executionRouting.ts
//
// Where should a task run? A pure decision, no I/O, so it is testable and the
// reasons are auditable.
//
// The rule set is driven by measurements, not by preference:
//   - linux-bubblewrap-v1 boots in ~114ms and costs nothing, but it is
//     `oneshot`, has no network policy, no persistent filesystem and cannot
//     snapshot. It is the default for light work only.
//   - Instabox boots in 0.85s (warm) / 12.3s (cold), gives 4 vCPU / 8 GiB on
//     the free tier, and has network. It is the default for heavy work.
//   - Cloud container backends are for workloads that need container isolation.
//
// The memory threshold exists because a 16GiB laptop with a browser, an IDE and
// a dev server has very little headroom left: moving a 2GiB build off-box is
// worth more than saving 12 seconds.

import type {
  ExecutionBackendCapabilities,
  ExecutionBackendKind,
} from "./executionBackend";

/** Above this, run off-box: the local machine is already memory-constrained. */
export const LOCAL_MEMORY_LIMIT_MB = 1_024;

/** Above this, run off-box: long tasks monopolise the user's own machine. */
export const LOCAL_DURATION_LIMIT_MS = 30_000;

export type ExecutionTaskProfile = {
  /** Rough peak memory the command is expected to need. */
  estimatedMemoryMb?: number;
  /** Rough wall-clock estimate. */
  estimatedDurationMs?: number;
  needsNetwork?: boolean;
  needsPersistentFilesystem?: boolean;
  needsSnapshots?: boolean;
  /** Requires container-grade isolation (not just a process sandbox). */
  needsStrongIsolation?: boolean;
};

/**
 * Who owns the backend. This decides who pays, which is the difference between
 * "platform absorbs it" and "the user's own account/quota".
 *   platform      → platform-hosted (e.g. platform_credits)
 *   user-cloud    → the user's own Instabox / CF / GCP / Vultr account
 *   user-machine  → the user's own server joined through the machine connector
 *   local-device  → the user's own laptop/desktop sandbox
 */
export type ExecutionBackendSource =
  | "platform"
  | "user-cloud"
  | "user-machine"
  | "local-device";

export type ExecutionBillingOwner = "platform" | "user" | "none";

export type ExecutionBackendCandidate = {
  backendId: string;
  kind: ExecutionBackendKind;
  capabilities: ExecutionBackendCapabilities;
  /** False when the backend is unconfigured, offline, or out of quota. */
  available: boolean;
  /** Measured boot time, used to prefer the fastest qualifying backend. */
  observedBootMs?: number;
  /** Defaults to "platform" for backwards compatibility with callers that
   *  predate per-tenant backends. */
  source?: ExecutionBackendSource;
};

export type ExecutionTargetDecision = {
  backendId: string;
  reason: string;
  /** Who pays for this run. Never inferred at the call site. */
  billingOwner: ExecutionBillingOwner;
  /**
   * True when no backend could satisfy the hard requirements and we fell back
   * to the host. Callers must surface this, never hide it.
   */
  degraded?: boolean;
};

function satisfiesHardRequirements(
  candidate: ExecutionBackendCandidate,
  profile: ExecutionTaskProfile,
): string | null {
  const c = candidate.capabilities;
  if (profile.needsNetwork && !c.networkPolicy) return "no-network-policy";
  if (profile.needsPersistentFilesystem && !c.persistentFilesystem) return "no-persistent-filesystem";
  if (profile.needsSnapshots && !c.snapshots) return "no-snapshots";
  if (profile.needsStrongIsolation && !c.isolationModes.includes("container")) {
    return "no-container-isolation";
  }
  return null;
}

/** Local = the user's own machine; it must stay responsive for them. */
function isLocal(candidate: ExecutionBackendCandidate): boolean {
  return candidate.kind === "local-sandbox" || candidate.kind === "full-host";
}

export function resolveExecutionTarget(args: {
  profile: ExecutionTaskProfile;
  candidates: readonly ExecutionBackendCandidate[];
  /** Preferred backend when several qualify (e.g. a specific cloud account). */
  preferredBackendId?: string;
}): ExecutionTargetDecision {
  const { profile, candidates } = args;
  const available = candidates.filter((c) => c.available);

  if (available.length === 0) {
    return {
      backendId: "full-host",
      reason: "no-execution-backend-available: falling back to host process execution",
      billingOwner: "user",
      degraded: true,
    };
  }

  const qualifying: ExecutionBackendCandidate[] = [];
  const rejected: string[] = [];
  for (const candidate of available) {
    const why = satisfiesHardRequirements(candidate, profile);
    if (why) {
      rejected.push(`${candidate.backendId}:${why}`);
      continue;
    }
    qualifying.push(candidate);
  }

  if (qualifying.length === 0) {
    // Nothing satisfies the hard requirements. Refuse to silently run heavy or
    // networked work on the host: report it as degraded and let the caller
    // decide (fail-closed at the call site, visible here).
    return {
      backendId: "full-host",
      reason: `no-backend-satisfies-requirements (${rejected.join(", ")}): falling back to host process execution`,
      billingOwner: "user",
      degraded: true,
    };
  }

  // An explicit preference outranks the heuristics, but never the hard
  // requirements: it only applies to candidates that already qualified.
  if (args.preferredBackendId) {
    const preferred = qualifying.find((c) => c.backendId === args.preferredBackendId);
    if (preferred) {
      return {
        backendId: preferred.backendId,
        reason: "preferred backend selected (satisfies all hard requirements)",
        billingOwner: billingOwnerFor(preferred.source),
      };
    }
  }

  const memoryMb = profile.estimatedMemoryMb ?? 0;
  const durationMs = profile.estimatedDurationMs ?? 0;
  const tooHeavyForLocal =
    memoryMb > LOCAL_MEMORY_LIMIT_MB || durationMs > LOCAL_DURATION_LIMIT_MS;

  if (tooHeavyForLocal) {
    const remote = qualifying.filter((c) => !isLocal(c));
    if (remote.length > 0) {
      return pickFastest(remote, args.preferredBackendId, `too-heavy-for-local (memory=${memoryMb}MB, duration=${durationMs}ms)`);
    }
    // Heavy but only local backends qualify: still run, but say why.
    return {
      ...pickFastest(qualifying, args.preferredBackendId, "heavy-but-local-only"),
      reason: "heavy-but-local-only: no remote backend qualifies",
    };
  }

  const local = qualifying.filter((c) => isLocal(c));
  if (local.length > 0) {
    return pickFastest(local, args.preferredBackendId, `light-task (memory=${memoryMb}MB, duration=${durationMs}ms)`);
  }
  return pickFastest(qualifying, args.preferredBackendId, "no-local-backend-qualified");
}

function billingOwnerFor(source: ExecutionBackendSource | undefined): ExecutionBillingOwner {
  // Absent source means the caller predates per-tenant backends; treat it as
  // platform-hosted, which is the conservative accounting default.
  return (source ?? "platform") === "platform" ? "platform" : "user";
}

function pickFastest(
  candidates: readonly ExecutionBackendCandidate[],
  preferredBackendId: string | undefined,
  reason: string,
): ExecutionTargetDecision {
  if (preferredBackendId) {
    const preferred = candidates.find((c) => c.backendId === preferredBackendId);
    if (preferred) {
      return {
        backendId: preferred.backendId,
        reason: `${reason}; preferred backend selected`,
        billingOwner: billingOwnerFor(preferred.source),
      };
    }
  }
  // Unknown boot time sorts last; ties keep declaration order (stable sort).
  const sorted = [...candidates].sort(
    (a, b) => (a.observedBootMs ?? Number.POSITIVE_INFINITY) - (b.observedBootMs ?? Number.POSITIVE_INFINITY),
  );
  const winner = sorted[0]!;
  const boot = winner.observedBootMs;
  // "Only one backend qualified" is not an error: the tenant simply owns less.
  // It must still be visible, because a single-backend tenant may be paying
  // cloud rates for what another tenant runs for free locally.
  const suffix = sorted.length === 1
    ? "; only-available-backend"
    : boot === undefined
      ? ""
      : `; fastest measured boot (${boot}ms)`;
  return {
    backendId: winner.backendId,
    reason: `${reason}${suffix}`,
    billingOwner: billingOwnerFor(winner.source),
  };
}
