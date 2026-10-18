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

import type { ExecutionBillingModel } from "./executionAudit";

export type ProviderRateEvidence = "verified" | "unverified";

export type ProviderRateCardEntry = {
  backendId: string;
  provider: string;
  model: ExecutionBillingModel;
  evidence: ProviderRateEvidence;
  /** ISO date the rate was read. */
  observedAt: string;
  /** Where it came from, so the next reader can re-check in seconds. */
  source: string;
  notes?: string;
};

/** 1 USD = 1e9 nanoUSD. Rates below are nanoUSD per second/unit unless noted. */
export const PROVIDER_RATE_CARD: readonly ProviderRateCardEntry[] = [
  {
    backendId: "docker-sandbox-cloud",
    provider: "docker-agentic-platform",
    model: { kind: "per-second", rateNanoUsd: "77780" },
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
    model: { kind: "free" },
    evidence: "verified",
    observedAt: "2026-10-18",
    source: "https://instabox.sh/pricing",
    notes: "Usage endpoint reports account-wide runningSeconds/vcpuSeconds/memGiBSeconds.",
  },
  {
    backendId: "cf-containers",
    provider: "cloudflare-containers",
    // billed per 10ms of active runtime.
    model: {
      kind: "vcpu-gib-second",
      vcpuMilli: 1000,
      gibMilli: 1000,
      vcpuRateNanoUsd: "20000",
      gibRateNanoUsd: "2500",
    },
    evidence: "verified",
    observedAt: "2026-10-18",
    source: "https://developers.cloudflare.com/containers/platform/pricing/",
    notes: "Rates are per unit; pass actual vcpu/gib from the application config at build time.",
  },
  {
    backendId: "gcp-cloud-run-jobs",
    provider: "google-cloud-run",
    model: {
      kind: "vcpu-gib-second",
      vcpuMilli: 1000,
      gibMilli: 500,
      vcpuRateNanoUsd: "12600",
      gibRateNanoUsd: "2500",
    },
    evidence: "verified",
    observedAt: "2026-10-18",
    source: "https://cloud.google.com/run/pricing (us-central1, CPU $0.0000126/vCPU-s)",
    notes:
      "Probe job ran 1 vCPU / 512MiB. Memory rate is the standard $0.0000025/GiB-s but was not re-read from the table; treat that half as unverified.",
  },
  {
    backendId: "vultr-instance",
    provider: "vultr",
    // Plan-priced VMs, billed hourly. No rate pinned yet: plans vary by size.
    model: { kind: "per-hour", rateNanoUsd: "0" },
    evidence: "unverified",
    observedAt: "2026-10-18",
    source: "not measured yet — requires a Vultr API key and a plan choice",
    notes: "Session-shaped backend (minutes to boot), not suitable for one-shot runs.",
  },
];

export function findProviderRate(backendId: string): ProviderRateCardEntry | undefined {
  return PROVIDER_RATE_CARD.find((entry) => entry.backendId === backendId);
}
