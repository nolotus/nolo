// Browser-only readiness surface: no sbx probing or Node I/O.
// Pure normalization and source caching match the server implementation.
// Default browser probes always fail closed; injected runners are never executed.

export type DockerRuntimeUnavailableReason = "not-configured" | "quota-unverifiable";

export type DockerQuotaSnapshotView = {
  source: string;
  observedAt: number;
  sharedGroup?: string;
  remaining?: number;
  unit?: string;
};

export type DockerRuntimeReadiness = {
  ready: boolean;
  reason?: DockerRuntimeUnavailableReason;
  details?: string;
  quotaSnapshot?: DockerQuotaSnapshotView;
};

export type DockerSbxOutcome = { exitCode: number | null; stdout: string; stderr: string };
export type DockerSbxRunner = (args: readonly string[]) => Promise<DockerSbxOutcome>;

export type DockerQuotaSnapshotInput =
  | {
      ok: true;
      availableNanoUsd: bigint;
      rateNanoUsd?: bigint;
      observedAt?: number;
      source?: string;
      sharedGroup?: string;
    }
  | { ok: false; reason: string };

export type DockerQuotaProbe = () => Promise<DockerQuotaSnapshotInput>;

export type DockerRuntimeReadinessDeps = {
  runSbx?: DockerSbxRunner;
  quotaProvider?: DockerQuotaProbe;
  now?: () => number;
};

/** 与真实实现一致：只读探测 argv（stub 不执行它，保留常量供契约引用）。 */
export const DOCKER_SBX_PROBE_ARGV: readonly string[] = ["--cloud", "ls"];

const NANO_USD_PER_MICRO_USD = 1_000n;
const MICRO_USD_PER_USD = 1_000_000;

/** nanoUSD → USD（与真实实现同一算法，先取整到微美元再转 number）。 */
export function nanoUsdToUsd(availableNanoUsd: bigint): number {
  if (availableNanoUsd <= 0n) return 0;
  return Number(availableNanoUsd / NANO_USD_PER_MICRO_USD) / MICRO_USD_PER_USD;
}

const NOT_PROBED: DockerRuntimeReadiness = {
  ready: false,
  reason: "not-configured",
  details: "Docker runtime readiness has not been probed; execution stays closed",
};

export function dockerReadinessNotProbed(): DockerRuntimeReadiness {
  return { ...NOT_PROBED };
}

function unready(reason: DockerRuntimeUnavailableReason, details: string): DockerRuntimeReadiness {
  return { ready: false, reason, details };
}

/**
 * 浏览器版探测：无默认 runner（真实默认 runner 需要 Node 子进程），也不执行注入 runner——
 * sbx 探测属于服务端能力发现的职责。结果如实为 fail-closed（not-configured），
 * 既不在浏览器冒充「已探测」，也绝不默认放行。
 */
export async function probeDockerRuntimeReadiness(
  _deps: DockerRuntimeReadinessDeps = {},
): Promise<DockerRuntimeReadiness> {
  return unready(
    "not-configured",
    "sbx CLI probing is unavailable in the browser; docker runtime stays unavailable and execution stays closed",
  );
}

/** 规范化任意注入值：只有字面 `ready: true` 才算就绪，其余一律带理由拒绝（与真实实现一致）。 */
export function normalizeDockerReadiness(value: DockerRuntimeReadiness | undefined | null): DockerRuntimeReadiness {
  if (value?.ready === true) {
    return { ready: true, ...(value.quotaSnapshot ? { quotaSnapshot: value.quotaSnapshot } : {}) };
  }
  if (!value) return dockerReadinessNotProbed();
  return {
    ready: false,
    reason: value.reason ?? "not-configured",
    ...(value.details ? { details: value.details } : {}),
  };
}

export type DockerRuntimeReadinessSource = {
  /** 探测一次并共享结果（单飞 + TTL 缓存）；探测抛错 → fail-closed 结果。 */
  get(): Promise<DockerRuntimeReadiness>;
  /** 最近一次探测结果；从未探测 = fail-closed。 */
  snapshot(): DockerRuntimeReadiness;
};

export type DockerRuntimeReadinessSourceOptions = {
  now?: () => number;
  /** 缓存窗口；窗口外重新探测（就绪是外部事实，会变）。 */
  ttlMs?: number;
};

/** 与真实实现同一纯逻辑包装（单飞 + TTL 缓存），仅上游默认探测在浏览器下为 fail-closed。 */
export function createDockerRuntimeReadinessSource(
  probe: () => Promise<DockerRuntimeReadiness>,
  options: DockerRuntimeReadinessSourceOptions = {},
): DockerRuntimeReadinessSource {
  const now = options.now ?? (() => Date.now());
  const ttlMs = options.ttlMs ?? 30_000;
  let cached: { at: number; value: DockerRuntimeReadiness } | null = null;
  let inflight: Promise<DockerRuntimeReadiness> | null = null;

  async function runProbe(): Promise<DockerRuntimeReadiness> {
    let outcome: DockerRuntimeReadiness;
    try {
      outcome = await probe();
    } catch {
      outcome = unready(
        "not-configured",
        "docker readiness probe threw; execution stays closed",
      );
    }
    const value = normalizeDockerReadiness(outcome);
    cached = { at: now(), value };
    return value;
  }

  async function get(): Promise<DockerRuntimeReadiness> {
    if (cached && now() - cached.at < ttlMs) return cached.value;
    if (!inflight) {
      inflight = runProbe();
      inflight.finally(() => {
        inflight = null;
      });
    }
    return await inflight;
  }

  function snapshot(): DockerRuntimeReadiness {
    return cached ? cached.value : dockerReadinessNotProbed();
  }

  return { get, snapshot };
}

/** 浏览器默认源：探测恒为 not-configured（fail-closed），绝不默认放行。 */
export function createDefaultDockerRuntimeReadinessSource(
  deps: DockerRuntimeReadinessDeps = {},
  options: DockerRuntimeReadinessSourceOptions = {},
): DockerRuntimeReadinessSource {
  return createDockerRuntimeReadinessSource(() => probeDockerRuntimeReadiness(deps), options);
}

let sharedDockerRuntimeReadinessSource: DockerRuntimeReadinessSource | null = null;
let dockerRuntimeReadinessDepsForTest: DockerRuntimeReadinessDeps | null = null;
let productionDockerRuntimeReadinessDeps: DockerRuntimeReadinessDeps | null = null;

export function setProductionDockerRuntimeReadinessDeps(deps: DockerRuntimeReadinessDeps | null): void {
  productionDockerRuntimeReadinessDeps = deps;
  sharedDockerRuntimeReadinessSource = null;
}

export function __setDockerRuntimeReadinessDepsForTest(deps: DockerRuntimeReadinessDeps | null): void {
  dockerRuntimeReadinessDepsForTest = deps;
  sharedDockerRuntimeReadinessSource = null;
}

export function getDockerRuntimeReadinessSource(deps?: DockerRuntimeReadinessDeps): DockerRuntimeReadinessSource {
  if (!sharedDockerRuntimeReadinessSource) {
    const effectiveDeps: DockerRuntimeReadinessDeps = {
      ...productionDockerRuntimeReadinessDeps,
      ...deps,
      ...dockerRuntimeReadinessDepsForTest,
    };
    sharedDockerRuntimeReadinessSource = createDefaultDockerRuntimeReadinessSource(effectiveDeps);
  }
  return sharedDockerRuntimeReadinessSource;
}

export function resetSharedDockerRuntimeReadinessSourceForTest(): void {
  sharedDockerRuntimeReadinessSource = null;
}
