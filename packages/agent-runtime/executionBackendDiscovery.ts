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
import { EXECUTION_BACKEND_KINDS } from "./executionBackend";
import {
  resolveExecutionEndpoint,
  type EndpointFacts,
  type ExecutionEndpoint,
  type ExecutionEndpointKind,
  type HostPlatform,
} from "./executionEndpoint";
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
  /**
   * G2：宿主平台。缺省取真实 `process.platform`；测试可注入（在 Linux CI 上断言
   * macOS 行为必须靠这个，否则「macOS 无 bwrap」这条事实在 CI 上永远测不到）。
   */
  hostPlatform?: HostPlatform;
  /**
   * G2：部署方对自己端点的额外事实（浏览器连接器是否可用、是否允许出网、
   * 显式授予/撤销某能力）。**发现层自己看不见的事实不猜**：例如连接器存在性
   * 属于桌面运行时的运行时事实，不从这里编造。
   */
  endpointFacts?: EndpointFacts;
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

/** `process.platform` → 端点事实里的平台；未知一律 "other"（不猜成 linux）。 */
export function normalizeHostPlatform(platform: string): HostPlatform {
  return platform === "linux" || platform === "darwin" || platform === "win32"
    ? platform
    : "other";
}

/** 与 `EXECUTION_BACKEND_KINDS` 同源（不依赖 executionBackend 里缺失的类型导出）。 */
type DiscoveredBackendKind = (typeof EXECUTION_BACKEND_KINDS)[number];

/**
 * G2：落点 → 端点种类。**按 `source`（谁拥有）优先**，`kind` 只做兜底：
 * 同一个 `kind: "cloud"` 既可能是平台的 docker 沙盒（platform-server），
 * 也可能是用户自己的 GCP 账号（third-party-sandbox）——决定性的差别是计费与凭据边界，
 * 不是「在哪跑」。
 */
export function endpointKindForBackend(backend: {
  kind: DiscoveredBackendKind;
  source?: ExecutionBackendCandidate["source"];
}): ExecutionEndpointKind {
  switch (backend.source) {
    case "platform":
      return "platform-server";
    case "user-cloud":
      return "third-party-sandbox";
    case "local-device":
    case "user-machine":
      // 用户自己的机器（本机或经 machine connector 加入）：语义都是 desktop-host。
      return "desktop-host";
    default:
      break;
  }
  switch (backend.kind) {
    case "full-host":
    case "local-sandbox":
    case "machine-connector":
      return "desktop-host";
    case "hosted-workspace":
      return "platform-server";
    case "remote-executor":
    case "cloud":
      return "third-party-sandbox";
  }
}

export async function discoverExecutionBackends(
  inputs: DiscoveryInputs,
): Promise<ExecutionBackendCandidate[]> {
  const env = inputs.env ?? process.env;
  const probes = inputs.probes ?? {};
  const hostPlatform: HostPlatform =
    inputs.hostPlatform ?? normalizeHostPlatform(process.platform);

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

  // G2：给每个候选补能力标注。发现层只写自己核实过的事实：
  //   - 平台取自入参或真实平台；
  //   - bwrap 是否可用只挂在「本机沙盒」那一条上（且 bwrap 仅 linux 注册）；
  //   - gpu / 出网沿用后端自己的 capability 声明，避免同一个端两套说法打架。
  return candidates.map((candidate) => {
    const endpointKind = endpointKindForBackend(candidate);
    const isLocalSandbox = candidate.kind === "local-sandbox";
    // L1：平台与「本机有没有 bwrap」只属于**本机沙盒**那一条候选。铺到每条候选会让远端
    // （machine-connector）继承本机平台；`shellIsolationAvailable` 一旦泄露就是 fail-open
    // ——远端那台机器从未被探测过。
    const facts: EndpointFacts = { ...(inputs.endpointFacts ?? {}) };
    if (isLocalSandbox) {
      facts.platform = hostPlatform;
    } else {
      delete facts.platform;
      delete facts.shellIsolationAvailable;
    }
    if (endpointKind === "third-party-sandbox" || endpointKind === "platform-server") {
      // 云后端的 networkPolicy 是「出网策略」；桌面本机的同名字段没有这个含义，不能照搬。
      if (facts.networkEgress === undefined) {
        facts.networkEgress = candidate.capabilities.networkPolicy;
      }
    }
    if (endpointKind === "third-party-sandbox" && facts.gpuAvailable === undefined) {
      facts.gpuAvailable = candidate.capabilities.gpu;
    }
    // M3：`executionWired` **只能由部署方显式声明**（`endpointFacts.executionWired`）。
    // 候选交上来只证明「配置存在」，`available` 只证明「连得上」，都不证明执行面已接线；
    // 把两者当成接线会让最不该乐观的一类端点变成乐观标注。
    if (isLocalSandbox) {
      // 如实传「这次探测到没探测到」，而不是按平台假设一定有/一定没有 bwrap。
      facts.shellIsolationAvailable ??= bwrapOk;
    }
    const latency: { coldBootMs?: number; warmBootMs?: number } = {};
    if (candidate.observedColdBootMs !== undefined) latency.coldBootMs = candidate.observedColdBootMs;
    if (candidate.observedWarmBootMs !== undefined) latency.warmBootMs = candidate.observedWarmBootMs;
    const endpoint: ExecutionEndpoint = resolveExecutionEndpoint({
      id: candidate.backendId,
      kind: endpointKind,
      facts,
      latency,
      // M4：liveness 进契约。不给它，`satisfiesRequiredCapabilities` 会对探测不过的
      // 后端返回 ok——「这个端还活着」是能力判定的一部分。
      available: candidate.available,
    });
    return { ...candidate, endpoint };
  });
}
