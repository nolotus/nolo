import {
  dockerReadinessNotProbed,
  normalizeDockerReadiness,
  type DockerRuntimeReadiness,
} from "./dockerRuntimeReadiness.browser.stub";

/** Minimal discovery projection; no registry service or execution authority. */
export type RuntimeCatalogMachine = {
  ownerUserId: string;
  machineId: string;
  name: string;
  status: "online" | "offline";
  lastSeenAt: number;
};
export type RuntimeCatalogTarget =
  | { kind: "server" }
  | { kind: "machine"; machineId: string }
  | { kind: "docker"; runtimeId?: string };

/** Public discovery only: neither a key nor a ready summary grants execution rights. */
export type RuntimeKind = "server" | "machine" | "local" | "docker" | "cloudflare";
/**
 * "not-configured"          = 该运行时没有配置（含 docker 探测未做 / sbx CLI 缺失）
 * "quota-unverifiable"      = 已配置但额度无法核实（cloud/auth 不可达或没有额度来源）
 */
export type RuntimeUnavailableReason =
  | "offline"
  | "connector-disconnected"
  | "not-configured"
  | "quota-unverifiable"
  | "unsupported-local";
export type RuntimeQuotaSnapshot = {
  source: string;
  observedAt: number;
  sharedGroup?: string;
  remaining?: number;
  unit?: string;
};
export type RuntimeSummary = {
  runtimeKey: string;
  kind: RuntimeKind;
  name: string;
  status: "ready" | "offline" | "unavailable";
  selectable: boolean;
  reason?: RuntimeUnavailableReason;
  details?: string;
  lastSeenAt?: number;
  quotaSnapshot?: RuntimeQuotaSnapshot;
};
export type RuntimeCatalog = { runtimes: RuntimeSummary[]; selectableCount: number };
/** Construct ONLY in the server composition root, never from model/request fields.
 * serverScope is a stable public opaque deployment ID, NOT a server URL or secret.
 * Registry must be owner-filtered; the additional owner check is defense in depth.
 */
export type RuntimeCatalogDeps = {
  callerUserId: string | null | undefined;
  serverScope: string;
  serverSelectable: boolean;
  connectorSurface: string;
  machineRegistry: { listMachines(ownerUserId: string): RuntimeCatalogMachine[] };
  connectorConnections: {
    hasConnection(ownerUserId: string, machineId: string, connectorSurface: string): boolean;
  };
  /**
   * 同一次 docker 就绪探测结果（`dockerRuntimeReadiness.snapshot()`）。
   * 这是 docker 就绪的**权威来源**：未提供 = 未探测 = fail-closed 不可用。
   */
  dockerReadiness?: DockerRuntimeReadiness;
  /**
   * 绑定配置是否存在且 caller 匹配。缺省 / false 则一律不可选（fail-closed）。
   */
  isDockerBound?: (callerUserId: string) => boolean;
  /** @deprecated 旧注入面（等价于「已探测且就绪」）；新接线请用 dockerReadiness。 */
  dockerSelectable?: boolean;
  /** @deprecated 旧注入面；只有 dockerSelectable 为 true 时才被采纳。 */
  dockerQuotaSnapshot?: RuntimeQuotaSnapshot;
};

/**
 * 解析注入的就绪判定。catalog 只做能力发现：这里**不**预算额度、不判并发/费率，
 * 执行准入仍完全由后端 `prepare()` 负责。
 */
export function resolveDockerReadiness(
  deps: Pick<RuntimeCatalogDeps, "dockerReadiness" | "dockerSelectable" | "dockerQuotaSnapshot">,
): DockerRuntimeReadiness {
  if (deps.dockerReadiness) return normalizeDockerReadiness(deps.dockerReadiness);
  if (deps.dockerSelectable === true) {
    return { ready: true, ...(deps.dockerQuotaSnapshot ? { quotaSnapshot: deps.dockerQuotaSnapshot } : {}) };
  }
  return dockerReadinessNotProbed();
}

function context(deps: RuntimeCatalogDeps) {
  const owner = deps.callerUserId?.trim();
  if (!owner) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(deps.serverScope)) {
    throw new Error("serverScope must be a public opaque deployment ID");
  }
  return { owner, scope: deps.serverScope };
}
function key(scope: string, owner: string, kind: RuntimeKind, id = "") {
  return ["runtime-v1", scope, owner, kind, id].map(encodeURIComponent).join(":");
}

/** No caches: refreshes owner-scoped registry and live surface connection each call. */
export function buildRuntimeCatalog(deps: RuntimeCatalogDeps): RuntimeCatalog {
  const ctx = context(deps);
  if (!ctx) return { runtimes: [], selectableCount: 0 };
  const summary = (kind: RuntimeKind, name: string, selectable: boolean, reason?: RuntimeUnavailableReason): RuntimeSummary => ({
    runtimeKey: key(ctx.scope, ctx.owner, kind), kind, name,
    status: selectable ? "ready" : "unavailable", selectable,
    ...(reason ? { reason } : {}),
  });
  const runtimes: RuntimeSummary[] = [summary("server", "Server", deps.serverSelectable,
    deps.serverSelectable ? undefined : "not-configured")];
  const seen = new Set<string>();
  for (const machine of deps.machineRegistry.listMachines(ctx.owner)) {
    if (machine.ownerUserId !== ctx.owner || !machine.machineId || seen.has(machine.machineId)) continue;
    seen.add(machine.machineId);
    const reason: RuntimeUnavailableReason | undefined = machine.status !== "online" ? "offline"
      : !deps.connectorSurface.trim() ? "not-configured"
      : !deps.connectorConnections.hasConnection(ctx.owner, machine.machineId, deps.connectorSurface)
        ? "connector-disconnected" : undefined;
    runtimes.push({
      runtimeKey: key(ctx.scope, ctx.owner, "machine", machine.machineId),
      kind: "machine", name: machine.name, selectable: !reason,
      status: reason === "offline" || reason === "connector-disconnected" ? "offline" : reason ? "unavailable" : "ready",
      ...(reason ? { reason } : {}), lastSeenAt: machine.lastSeenAt,
    });
  }
  // Docker 就绪完全由**同一次探测结果**决定（未注入 = 未探测 = fail-closed 拒绝）：
  //   ready → status: "ready" + selectable，额度摘要（若可得）仅作展示透传；
  //   否则 → status: "unavailable" + reason（区分「未配置」与「已配置但额度不可核实」）。
  // catalog 只做能力发现，不复制预算 / 并发 / 费率判定；准入真值在后端 prepare()。
  const dockerReadiness = resolveDockerReadiness(deps);
  const isDockerBound = deps.isDockerBound
    ? Boolean(deps.isDockerBound(ctx.owner))
    : deps.dockerSelectable === true;
  const dockerKey = key(ctx.scope, ctx.owner, "docker");
  const dockerSummary: RuntimeSummary = (dockerReadiness.ready && isDockerBound)
    ? {
        runtimeKey: dockerKey,
        kind: "docker",
        name: "Docker",
        status: "ready",
        selectable: true,
        ...(dockerReadiness.quotaSnapshot ? { quotaSnapshot: dockerReadiness.quotaSnapshot } : {}),
      }
    : {
        runtimeKey: dockerKey,
        kind: "docker",
        name: "Docker",
        status: "unavailable",
        selectable: false,
        reason: dockerReadiness.reason ?? "not-configured",
        ...(dockerReadiness.details ? { details: dockerReadiness.details } : {}),
      };
  runtimes.push(
    summary("local", "Local (client only)", false, "unsupported-local"),
    dockerSummary,
    summary("cloudflare", "Cloudflare", false, "not-configured"),
  );
  return { runtimes, selectableCount: runtimes.filter((runtime) => runtime.selectable).length };
}

export function shouldExposeListRuntimes(catalog: RuntimeCatalog): boolean {
  return catalog.selectableCount > 1;
}
export type ResolveRuntimeKeyResult =
  | { ok: true; target: RuntimeCatalogTarget; runtime: RuntimeSummary }
  | { ok: false; reason: "caller-missing" | "unknown-key" | "runtime-denied" | "runtime-offline" | "runtime-unavailable"; unavailableReason?: RuntimeUnavailableReason };

/** Exact lookup in a freshly trusted catalog; no URL interpretation or fallback.
 * Execution MUST still use existing runtimeTarget authorization and trustedRunGrantIssuer.
 */
export function resolveRuntimeKey(runtimeKey: string, deps: RuntimeCatalogDeps): ResolveRuntimeKeyResult {
  const ctx = context(deps);
  if (!ctx) return { ok: false, reason: "caller-missing" };
  let parts: string[];
  try { parts = runtimeKey.split(":").map(decodeURIComponent); }
  catch { return { ok: false, reason: "unknown-key" }; }
  if (parts.length !== 5 || parts[0] !== "runtime-v1") return { ok: false, reason: "unknown-key" };
  if (parts[1] !== ctx.scope || parts[2] !== ctx.owner) return { ok: false, reason: "runtime-denied" };
  const runtime = buildRuntimeCatalog(deps).runtimes.find((entry) => entry.runtimeKey === runtimeKey);
  if (!runtime) return { ok: false, reason: "unknown-key" };
  if (!runtime.selectable) return {
    ok: false, reason: runtime.status === "offline" ? "runtime-offline" : "runtime-unavailable",
    unavailableReason: runtime.reason,
  };
  if (runtime.kind === "server") return { ok: true, target: { kind: "server" }, runtime };
  if (runtime.kind === "machine") return { ok: true, target: { kind: "machine", machineId: parts[4]! }, runtime };
  if (runtime.kind === "docker") {
    const isBound = Boolean(ctx.owner && deps.isDockerBound?.(ctx.owner));
    if (isBound && runtime.selectable) {
      return { ok: true, target: { kind: "docker" }, runtime };
    }
    return { ok: false, reason: "runtime-unavailable", unavailableReason: runtime.reason ?? "not-configured" };
  }
  return { ok: false, reason: "runtime-unavailable", unavailableReason: "not-configured" };
}
