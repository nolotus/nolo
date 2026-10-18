// packages/agent-runtime/executionBackendBenchmarks.ts
//
// Measured facts about every execution backend we have actually run, in one
// table. This is the data the router should consume instead of hard-coded
// numbers, and the place to append when new specs / regions / samples arrive.
//
// Rules for this table:
//   - `evidence: "measured"` means WE ran it and recorded the number here.
//     Vendor documentation numbers are `"vendor-doc"`; estimates are
//     `"unverified"` and must not be presented as measured.
//   - times are milliseconds; keep `coldBootMs` and `warmBootMs` separate —
//     collapsing them is what makes cold starts invisible.
//   - rates are nanoUSD per billing unit (see ExecutionBillingModel).
//
// Relationship to providerRateCard.ts: that file answers "what does a unit
// cost", this file answers "what did it actually do when we ran it". When a
// backend gains a real sample here, its routing boot estimate should come from
// this table.

import type { ExecutionBillingModel, ExecutionIsolation } from "./executionAudit";

export type BenchmarkEvidence = "measured" | "vendor-doc" | "unverified";

export type ExecutionBackendBenchmark = {
  backendId: string;
  provider: string;
  /** First-ever run: request → actually executable. */
  coldBootMs?: number;
  /** Subsequent runs with a warm sandbox/instance. */
  warmBootMs?: number;
  /** One command round trip inside the sandbox, when we measured it. */
  execRoundTripMs?: number;
  billing: ExecutionBillingModel;
  isolation: ExecutionIsolation;
  specs?: {
    vcpu?: number;
    memoryMiB?: number;
    diskMiB?: number;
  };
  evidence: BenchmarkEvidence;
  /** ISO date of the measurement. */
  observedAt: string;
  /** How it was measured, so the next reader can re-run it. */
  source: string;
  notes?: string;
};

export const EXECUTION_BACKEND_BENCHMARKS: readonly ExecutionBackendBenchmark[] = [
  {
    backendId: "linux-bubblewrap-v1",
    provider: "local-host",
    coldBootMs: 4,
    warmBootMs: 4,
    execRoundTripMs: 15,
    billing: { kind: "free" },
    isolation: "os-sandbox",
    evidence: "measured",
    observedAt: "2026-10-18",
    source: "scripts/verify/verifyExecutionBackend.ts --backend=local + localSandboxWorkload e2e",
    notes:
      "prepare() only validates and pins fds; bwrap is spawned per command, so boot is ~4ms and each exec costs ~15ms.",
  },
  {
    backendId: "instabox",
    provider: "instabox",
    coldBootMs: 12_340,
    warmBootMs: 851,
    execRoundTripMs: 300,
    billing: { kind: "free" },
    isolation: "container",
    specs: { vcpu: 4, memoryMiB: 8_192 },
    evidence: "measured",
    observedAt: "2026-10-18",
    source: "REST probe: POST /v1/machines → operations poll → exec → usage → delete",
    notes:
      "Free tier: 5 machines, 4 vCPU / 8 GiB each. exec is a REST round trip (~260-380ms measured on real code task).",
  },
  {
    backendId: "cf-containers",
    provider: "cloudflare-containers",
    coldBootMs: 8_413,
    warmBootMs: 27,
    billing: {
      kind: "vcpu-gib-second",
      // Cloudflare Containers default instance: 1/16 vCPU = 0.0625 (62_500
      // millionths) and 256 MiB = 0.25 GiB. Pinning the real shape here is what
      // keeps the CPU estimate from being off by 16x — and this row is the ONLY
      // copy of the shape: providerRateCard.ts carries rates only and resolves
      // its billing model from this table.
      vcpuMicro: 62_500,
      gibMicro: 250_000,
      vcpuRateNanoUsd: "20000",
      gibRateNanoUsd: "2500",
    },
    isolation: "container",
    specs: { vcpu: 0.0625, memoryMiB: 256, diskMiB: 2_000 },
    evidence: "measured",
    observedAt: "2026-10-18",
    source:
      "Worker + Container class + wrangler deploy; GET / returned msToContainerResponse 8413 cold / 27-33 warm (Linux cloudchamber microVM)",
    notes:
      "Requires a Worker/Durable Object binding: an application record alone never schedules an instance (instances returned NOT_ENABLED with location=mock).",
  },
  {
    backendId: "docker-sandbox-cloud",
    provider: "docker-agentic-platform",
    coldBootMs: 11_700,
    billing: { kind: "per-second", rateNanoUsd: "77780" },
    isolation: "container",
    specs: { vcpu: 4, memoryMiB: 8_192 },
    evidence: "measured",
    observedAt: "2026-10-18",
    source: "runViaDockerWorkload real probe: create → helper upload → exec → stop confirm",
    notes: "No usage API: cost is a local estimate from wall clock.",
  },
  {
    backendId: "gcp-cloud-run-jobs",
    provider: "google-cloud-run",
    coldBootMs: 13_119,
    billing: {
      kind: "vcpu-gib-second",
      vcpuMicro: 1_000_000,
      gibMicro: 500_000,
      vcpuRateNanoUsd: "12600",
      gibRateNanoUsd: "2500",
    },
    isolation: "container",
    specs: { vcpu: 1, memoryMiB: 512 },
    evidence: "measured",
    observedAt: "2026-10-18",
    source: "gcloud run jobs create + execute --wait (busybox), startTime→completionTime 31.96s",
    notes: "`--wait` does not return the container exit code; exitCodeSource is reported as unknown.",
  },
  {
    backendId: "vultr-instance",
    provider: "vultr",
    coldBootMs: 5_035,
    billing: { kind: "per-hour", rateNanoUsd: "7000000" },
    isolation: "container",
    specs: { vcpu: 1, memoryMiB: 1_024 },
    evidence: "measured",
    observedAt: "2026-10-18",
    source: "POST /v2/instances (vc2-1c-1gb, ewr, Ubuntu 24.04) → poll status=active (5.035s) → DELETE (locked, retried)",
    notes:
      "VM shaped: session-class only, not a oneshot target. Stopping the server still bills hourly; must destroy. Needs IP allowlist on the API key.",
  },
];

export function findBackendBenchmark(backendId: string): ExecutionBackendBenchmark | undefined {
  return EXECUTION_BACKEND_BENCHMARKS.find((b) => b.backendId === backendId);
}

/**
 * Boot estimate from one benchmark row. Only `measured` numbers are returned as
 * estimates; anything else is left undefined so callers do not present a guess
 * as a fact.
 *
 * Warmth never borrows from the other column: a row that only measured a cold
 * boot has no warm number (and vice versa). Relabelling one as the other is how
 * a cold start becomes invisible in a comparison table.
 */
export function bootMsFromBenchmark(
  row: ExecutionBackendBenchmark | undefined,
  opts: { warm?: boolean } = {},
): number | undefined {
  if (!row || row.evidence !== "measured") return undefined;
  return opts.warm ? row.warmBootMs : row.coldBootMs;
}

/**
 * Boot estimate for routing, by backend id. Default口径 is the COLD start —
 * the user-perceived cost — so callers that want the warm number must ask for
 * it explicitly and must not compare it against cold numbers.
 */
export function measuredBootMs(backendId: string, opts: { warm?: boolean } = {}): number | undefined {
  return bootMsFromBenchmark(findBackendBenchmark(backendId), opts);
}
