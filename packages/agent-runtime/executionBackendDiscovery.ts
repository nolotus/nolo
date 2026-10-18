// packages/agent-runtime/executionBackendDiscovery.ts
//
// "What does this tenant actually own?" The router only chooses among these.
//
// Every probe is injectable so tests never touch a real binary, network or
// credential. Production probes are deliberately cheap: they check presence and
// capability, never call a paid API (a run-time probe that costs money would be
// a worse bug than a stale cache).
//
// Boot numbers below are measured values from 2026-10-18, kept as constants so
// routing can prefer the fastest qualifying backend without a warm-up call.

import type { ExecutionBackendCandidate } from "./executionRouting";
import { LinuxBubblewrapBackend } from "./linuxBubblewrapBackend";

/** Measured boot times, ms. */
export const MEASURED_BOOT_MS = {
  "linux-bubblewrap-v1": 4,
  instabox: 851,
  "docker-sandbox-cloud": 11_700,
  "gcp-cloud-run-jobs": 13_119,
} as const;

export type BackendProbe = () => Promise<boolean>;

export type DiscoveryInputs = {
  userId: string;
  /** Env-like bag; production passes process.env, tests pass a literal. */
  env?: Record<string, string | undefined>;
  /**
   * Platform-hosted backends configured for this deployment. The platform
   * decides these; discovery never invents them.
   */
  platform?: readonly ExecutionBackendCandidate[];
  /** Test seams. Production omits them and gets the real probes. */
  probes?: {
    bubblewrap?: BackendProbe;
    sbx?: BackendProbe;
    instabox?: BackendProbe;
  };
};

const defaultBubblewrapProbe: BackendProbe = async () => {
  try {
    // describe() only builds a descriptor; the real capability check happens in
    // prepare(). Probing here would need bwrap --version/--help plus the flag
    // assertions, which is the backend's own job — so this probe is intentionally
    // optimistic and prepare() stays the fail-closed gate.
    new LinuxBubblewrapBackend().describe();
    return process.platform === "linux";
  } catch {
    return false;
  }
};

/** Presence check only: a paid API must never be called during discovery. */
const presenceProbe = (env: Record<string, string | undefined>, key: string): BackendProbe =>
  async () => Boolean(env[key]?.trim());

export async function discoverExecutionBackends(
  inputs: DiscoveryInputs,
): Promise<ExecutionBackendCandidate[]> {
  const env = inputs.env ?? process.env;
  const probes = inputs.probes ?? {};

  const [bwrapOk, sbxOk, instaboxOk] = await Promise.all([
    (probes.bubblewrap ?? defaultBubblewrapProbe)().catch(() => false),
    (probes.sbx ?? presenceProbe(env, "NOLO_DOCKER_BINDINGS"))().catch(() => false),
    (probes.instabox ?? presenceProbe(env, "INSTABOX_API_KEY"))().catch(() => false),
  ]);

  const candidates: ExecutionBackendCandidate[] = [...(inputs.platform ?? [])];

  candidates.push({
    backendId: "linux-bubblewrap-v1",
    kind: "local-sandbox",
    capabilities: new LinuxBubblewrapBackend().describe().capabilities,
    available: bwrapOk,
    source: "local-device",
    observedBootMs: MEASURED_BOOT_MS["linux-bubblewrap-v1"],
  });

  candidates.push({
    backendId: "docker-sandbox-cloud",
    kind: "cloud",
    capabilities: {
      executionClasses: ["oneshot"],
      streamingExec: false,
      filesystem: true,
      persistentFilesystem: false,
      processSignals: false,
      inboundPorts: false,
      networkPolicy: false,
      snapshots: false,
      gpu: false,
      isolationModes: ["container"],
    },
    available: sbxOk,
    source: "platform",
    observedBootMs: MEASURED_BOOT_MS["docker-sandbox-cloud"],
  });

  candidates.push({
    backendId: "instabox",
    kind: "cloud",
    capabilities: {
      executionClasses: ["oneshot", "session"],
      streamingExec: false,
      filesystem: true,
      persistentFilesystem: true, // pause/resume keeps the disk
      processSignals: true,
      inboundPorts: true,
      networkPolicy: true,
      snapshots: true,
      gpu: false,
      isolationModes: ["container"],
    },
    available: instaboxOk,
    source: "user-cloud",
    observedBootMs: MEASURED_BOOT_MS.instabox,
  });

  return candidates;
}
