// packages/agent-runtime/executionBackendDiscovery.ts
//
// "What does this tenant actually own?" The router only chooses among these.
//
// Every probe is injectable so tests never touch a real binary, network or
// credential. Production probes are deliberately cheap: they check presence and
// capability, never call a paid API (a run-time probe that costs money would be
// a worse bug than a stale cache).
//
// Boot numbers below are read straight from EXECUTION_BACKEND_BENCHMARKS: the
// COLD number (the user-perceived cost, and the only one routing compares) and,
// in a separate field, the warm one. No hard-coded fallback on purpose: if a row
// stops being `measured` the estimate disappears instead of quietly keeping an
// old number alive.

import { accessSync, constants, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import type { ExecutionBackendCandidate } from "./executionRouting";
import { LinuxBubblewrapBackend } from "./linuxBubblewrapBackend";
import { measuredBootMs } from "./executionBackendBenchmarks";

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
    gcp?: BackendProbe;
    gcpCloudRun?: BackendProbe;
    cf?: BackendProbe;
    cfContainers?: BackendProbe;
    vultr?: BackendProbe;
    vultrInstance?: BackendProbe;
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

const defaultGcpProbe = (env: Record<string, string | undefined>): BackendProbe => async () => {
  try {
    if (env.GCLOUD_PATH) {
      return existsSync(env.GCLOUD_PATH);
    }
    const candidates = [
      env.HOME ? `${env.HOME}/google-cloud-sdk/bin/gcloud` : undefined,
      "/home/nolotus/google-cloud-sdk/bin/gcloud",
      "/usr/bin/gcloud",
      "/usr/local/bin/gcloud",
    ].filter((p): p is string => Boolean(p));

    for (const p of candidates) {
      if (existsSync(p)) return true;
    }
    const which = spawnSync("which", ["gcloud"], {
      encoding: "utf8",
      env: { PATH: env.PATH ?? process.env.PATH },
    });
    return which.status === 0 && Boolean(which.stdout?.trim());
  } catch {
    return false;
  }
};

const defaultCfProbe = (env: Record<string, string | undefined>): BackendProbe => async () => {
  try {
    if (Boolean(env.CLOUDFLARE_API_TOKEN?.trim())) {
      return true;
    }
    const home = env.HOME?.trim() || homedir();
    if (!home) return false;
    const configPath = join(home, ".config", "cloudflare", "config", "default.json");
    if (!existsSync(configPath)) return false;
    accessSync(configPath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

const defaultVultrProbe = (env: Record<string, string | undefined>): BackendProbe => async () => {
  return Boolean(env.VULTR?.trim() || env.VULTR_API_KEY?.trim());
};

const safeProbe = async (probe: BackendProbe): Promise<boolean> => {
  try {
    return await probe();
  } catch {
    return false;
  }
};

export async function discoverExecutionBackends(
  inputs: DiscoveryInputs,
): Promise<ExecutionBackendCandidate[]> {
  const env = inputs.env ?? process.env;
  const probes = inputs.probes ?? {};

  const [bwrapOk, sbxOk, instaboxOk, gcpOk, cfOk, vultrOk] = await Promise.all([
    safeProbe(probes.bubblewrap ?? defaultBubblewrapProbe),
    safeProbe(probes.sbx ?? presenceProbe(env, "NOLO_DOCKER_BINDINGS")),
    safeProbe(probes.instabox ?? presenceProbe(env, "INSTABOX_API_KEY")),
    safeProbe(probes.gcp ?? probes.gcpCloudRun ?? defaultGcpProbe(env)),
    safeProbe(probes.cf ?? probes.cfContainers ?? defaultCfProbe(env)),
    safeProbe(probes.vultr ?? probes.vultrInstance ?? defaultVultrProbe(env)),
  ]);

  const candidates: ExecutionBackendCandidate[] = [...(inputs.platform ?? [])];

  const pushCandidate = (candidate: ExecutionBackendCandidate) => {
    if (!candidates.some((c) => c.backendId === candidate.backendId)) {
      candidates.push(candidate);
    }
  };

  pushCandidate({
    backendId: "linux-bubblewrap-v1",
    kind: "local-sandbox",
    capabilities: new LinuxBubblewrapBackend().describe().capabilities,
    available: bwrapOk,
    source: "local-device",
    observedColdBootMs: measuredBootMs("linux-bubblewrap-v1"),
    observedWarmBootMs: measuredBootMs("linux-bubblewrap-v1", { warm: true }),
  });

  pushCandidate({
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
    observedColdBootMs: measuredBootMs("docker-sandbox-cloud"),
    observedWarmBootMs: measuredBootMs("docker-sandbox-cloud", { warm: true }),
  });

  pushCandidate({
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
    observedColdBootMs: measuredBootMs("instabox"),
    observedWarmBootMs: measuredBootMs("instabox", { warm: true }),
  });

  pushCandidate({
    backendId: "gcp-cloud-run-jobs",
    kind: "cloud",
    capabilities: {
      executionClasses: ["oneshot"],
      streamingExec: false,
      filesystem: true,
      persistentFilesystem: false,
      processSignals: false,
      inboundPorts: false,
      networkPolicy: true,
      snapshots: false,
      gpu: false,
      isolationModes: ["container"],
    },
    available: gcpOk,
    source: "user-cloud",
    observedColdBootMs: measuredBootMs("gcp-cloud-run-jobs"),
    observedWarmBootMs: measuredBootMs("gcp-cloud-run-jobs", { warm: true }),
  });

  pushCandidate({
    backendId: "cf-containers",
    kind: "cloud",
    capabilities: {
      executionClasses: ["oneshot"],
      streamingExec: false,
      filesystem: true,
      persistentFilesystem: false,
      processSignals: false,
      inboundPorts: false,
      networkPolicy: true,
      snapshots: false,
      gpu: false,
      isolationModes: ["container"],
    },
    available: cfOk,
    source: "user-cloud",
    observedColdBootMs: measuredBootMs("cf-containers"),
    observedWarmBootMs: measuredBootMs("cf-containers", { warm: true }),
  });

  pushCandidate({
    backendId: "vultr-instance",
    kind: "cloud",
    capabilities: {
      executionClasses: ["session", "oneshot"],
      streamingExec: false,
      filesystem: true,
      persistentFilesystem: true,
      processSignals: false,
      inboundPorts: true,
      networkPolicy: true,
      snapshots: false,
      gpu: false,
      isolationModes: ["container"],
    },
    available: vultrOk,
    source: "user-cloud",
    observedColdBootMs: measuredBootMs("vultr-instance"),
    observedWarmBootMs: measuredBootMs("vultr-instance", { warm: true }),
  });

  return candidates;
}
