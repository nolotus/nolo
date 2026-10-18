// packages/agent-runtime/providerRateCard.ts
//
// One place for "what does a second cost on each backend".
//
// Every entry carries its evidence level, because a rate that looks precise but
// was never verified is worse than an honest estimate:
//   "verified"   → read from the provider's own pricing/dashboard on `observedAt`
//   "unverified" → standard list price, not yet confirmed for this account
//
// Rates are nanoUSD per whole unit, as strings (integer math downstream).
//
// SHAPE IS NOT HERE. A rate only means something once you know the vCPU / GiB
// it is applied to, and that shape is a measurement, not a price: it lives in
// EXECUTION_BACKEND_BENCHMARKS, the row we actually ran. Keeping a second copy
// here is how Cloudflare Containers could be priced 16x high — the card said
// 1 vCPU / 1 GiB while the run actually got 0.0625 vCPU / 256 MiB.
// So `findProviderRate()` resolves a full model: rates from this file, shape
// from the benchmark table, exactly one source for each half.

import type { ExecutionBillingModel } from "./executionAudit";
import { EXECUTION_BACKEND_BENCHMARKS } from "./executionBackendBenchmarks";

export type ProviderRateEvidence = "verified" | "unverified";

/**
 * Rates only — deliberately shape-free. The `vcpu-gib-second` variant names the
 * two rates and no instance shape at all: whoever needs a billable model goes
 * through `findProviderRate()`, which welds the rates to the measured shape.
 */
export type ProviderRatePricing =
  | { kind: "free" }
  | { kind: "per-second"; rateNanoUsd: string }
  | { kind: "per-hour"; rateNanoUsd: string }
  | { kind: "vcpu-gib-second"; vcpuRateNanoUsd: string; gibRateNanoUsd: string };

export type ProviderRateCardEntry = {
  backendId: string;
  provider: string;
  pricing: ProviderRatePricing;
  evidence: ProviderRateEvidence;
  /** ISO date the rate was read. */
  observedAt: string;
  /** Where it came from, so the next reader can re-check in seconds. */
  source: string;
  notes?: string;
};

/** A rate card entry resolved into something actually billable. */
export type ProviderRate = ProviderRateCardEntry & {
  /** Rates from this card + the shape measured in EXECUTION_BACKEND_BENCHMARKS. */
  model: ExecutionBillingModel;
};

/** 1 USD = 1e9 nanoUSD. Rates below are nanoUSD per second/unit unless noted. */
export const PROVIDER_RATE_CARD: readonly ProviderRateCardEntry[] = [
  {
    backendId: "docker-sandbox-cloud",
    provider: "docker-agentic-platform",
    pricing: { kind: "per-second", rateNanoUsd: "77780" },
    evidence: "verified",
    observedAt: "2026-10-18",
    source: "https://agentic-platform.docker.com/usage (rate line: 0.00007778 USD/s)",
    notes: "sbx has no usage API; wall clock is the only source, so cost is local-estimate.",
  },
  {
    backendId: "instabox",
    provider: "instabox",
    // Pricing page: "5 machines free for everyone, each with 4 vCPUs and 8 GB".
    // Usage is still recorded (runningSeconds) so the data survives the day
    // pricing is published.
    pricing: { kind: "free" },
    evidence: "verified",
    observedAt: "2026-10-18",
    source: "https://instabox.sh/pricing",
    notes: "Usage endpoint reports account-wide runningSeconds/vcpuSeconds/memGiBSeconds.",
  },
  {
    backendId: "cf-containers",
    provider: "cloudflare-containers",
    // billed per 10ms of active runtime.
    // Rate only: the shape Cloudflare actually gives us (1/16 vCPU, 256 MiB) is
    // recorded in the benchmark row, because that is the instance we ran.
    pricing: { kind: "vcpu-gib-second", vcpuRateNanoUsd: "20000", gibRateNanoUsd: "2500" },
    evidence: "verified",
    observedAt: "2026-10-18",
    source: "https://developers.cloudflare.com/containers/platform/pricing/",
    notes: "Rates are per unit; the unit itself is measured, see EXECUTION_BACKEND_BENCHMARKS.",
  },
  {
    backendId: "gcp-cloud-run-jobs",
    provider: "google-cloud-run",
    // Rate only: the shape we ran (1 vCPU / 512MiB) comes from the benchmark row.
    pricing: { kind: "vcpu-gib-second", vcpuRateNanoUsd: "12600", gibRateNanoUsd: "2500" },
    evidence: "verified",
    observedAt: "2026-10-18",
    source: "https://cloud.google.com/run/pricing (us-central1, CPU $0.0000126/vCPU-s)",
    notes:
      "Probe job ran 1 vCPU / 512MiB (measured in EXECUTION_BACKEND_BENCHMARKS). Memory rate is the standard $0.0000025/GiB-s but was not re-read from the table; treat that half as unverified.",
  },
  {
    backendId: "vultr-instance",
    provider: "vultr",
    // Plan-priced VMs, billed hourly. No rate pinned yet: plans vary by size.
    pricing: { kind: "per-hour", rateNanoUsd: "0" },
    evidence: "unverified",
    observedAt: "2026-10-18",
    source: "not measured yet — requires a Vultr API key and a plan choice",
    notes: "Session-shaped backend (minutes to boot), not suitable for one-shot runs.",
  },
];

/**
 * Rates from this card + the measured shape from EXECUTION_BACKEND_BENCHMARKS.
 *
 * Returns undefined when a shape-priced entry has no `measured` benchmark row:
 * a per-vCPU/GiB rate with no shape to apply it to cannot be resolved, and
 * guessing a shape is exactly the 16x bug. Callers then fail closed (unrated /
 * throw) instead of billing against an invented instance size.
 */
function resolveBillingModel(entry: ProviderRateCardEntry): ExecutionBillingModel | undefined {
  const { pricing } = entry;
  if (pricing.kind !== "vcpu-gib-second") return pricing;

  const row = EXECUTION_BACKEND_BENCHMARKS.find((b) => b.backendId === entry.backendId);
  if (!row || row.evidence !== "measured" || row.billing.kind !== "vcpu-gib-second") {
    return undefined;
  }
  return {
    kind: "vcpu-gib-second",
    vcpuMicro: row.billing.vcpuMicro,
    gibMicro: row.billing.gibMicro,
    vcpuRateNanoUsd: pricing.vcpuRateNanoUsd,
    gibRateNanoUsd: pricing.gibRateNanoUsd,
  };
}

export function findProviderRate(backendId: string): ProviderRate | undefined {
  const entry = PROVIDER_RATE_CARD.find((e) => e.backendId === backendId);
  if (!entry) return undefined;
  const model = resolveBillingModel(entry);
  return model ? { ...entry, model } : undefined;
}
