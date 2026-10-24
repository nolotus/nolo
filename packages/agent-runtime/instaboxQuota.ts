/** Read-only observations, NOT a reservation or a free-only create authorization.
 * Official contract inspected: https://api.instabox.sh/v1/openapi.json
 * OrgLimits.freeSandboxes is never billed; OrgUsage.freeSandboxHours is used
 * time, not remaining time. Me.orgId is ONLY a workspace-key restriction.
 * GET /usage is personal scope and cannot prove workspace create capacity.
 */
export type InstaboxCapacity = {
  maxMachines: number; currentMachines: number; remainingMachines: number;
  maxSnapshots?: number; currentSnapshots?: number; maxStoredGiB?: number;
};
export type InstaboxBalance = {
  creditsUSD?: number; creditsUsedUSD?: number; creditRemainingUSD?: number;
  allowanceUSD?: number; overageUSD?: number; remainingUSD?: number;
  freeSandboxHours?: number; usedFreeSandboxHours?: number;
};
import type { InstaboxCreationPlan, InstaboxFreeOrgObservation, InstaboxBillingPolicy } from "./instaboxBackend";
export type { InstaboxCreationPlan, InstaboxBillingPolicy } from "./instaboxBackend";
export type InstaboxAdmissionEvaluation = {
  admitted: boolean; isFreeOnly: boolean; preflightPassed: boolean;
  tier: "free" | "pro" | "team" | "enterprise" | "unknown";
  orgKind: "personal" | "workspace" | "unknown";
  orgId?: string; reasons: string[]; missingEvidence: string[];
  capacityUnverified?: boolean;
};
export type InstaboxQuotaResult = {
  ok: boolean; source: string; observedAt: number; remaining?: number; unit?: string;
  capacity?: InstaboxCapacity; balance?: InstaboxBalance;
  evaluation?: InstaboxAdmissionEvaluation; error?: string;
  /** Preflight-only bound inputs for the backend. */
  creationContract?: { plan: InstaboxCreationPlan; freeOrgObservation: InstaboxFreeOrgObservation };
};
export type InstaboxHttpFetch = (url: string, init?: RequestInit) => Promise<Response>;
export type InstaboxQuotaAdapterDeps = {
  fetchFn?: InstaboxHttpFetch; now?: () => number; timeoutMs?: number;
  creationPlan?: InstaboxCreationPlan;
  billingPolicy?: InstaboxBillingPolicy;
};
export type RawInstaboxMe = {
  userId?: string; orgId?: string; activated?: boolean; inviteRequired?: boolean;
};
export type RawInstaboxOrg = {
  id: string; tier: string; kind: string; personal: boolean;
  disabledAt?: string | null; cardMissingAt?: string | null;
  allowedSpecs?: { vcpus: number; memMiB: number; persistentDiskGiB: number }[];
  limits?: { maxMachines?: number; freeSandboxes?: number; freeSandboxHours?: number;
    maxSnapshots?: number; maxStoredGiB?: number };
  usage?: { machines?: number; freeMachines?: number; snapshots?: number;
    freeSandboxHours?: number; ratedUntil?: string; periodStart?: string; periodEnd?: string;
    creditsUSD?: number; creditsUsedUSD?: number; creditRemainingUSD?: number;
    allowanceUSD?: number; overageUSD?: number; remainingUSD?: number };
  billing?: { subscribed?: boolean; status?: string };
};
const SOURCE = "instabox-official-quota";
export const INSTABOX_OBSERVATION_MAX_AGE_MS = 30_000;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const count = (v: unknown): v is number => finite(v) && Number.isSafeInteger(v);
export function sanitizeErrorMessage(_err: unknown, status?: number): string {
  const labels: Record<number, string> = {401: "Unauthorized", 402: "Payment Required", 403: "Forbidden", 404: "Not Found", 429: "Rate Limit Exceeded"};
  return status && Number.isInteger(status) && status >= 100 && status <= 599
    ? `HTTP ${status} ${labels[status] ?? "Request Failed"}` : "Instabox API communication error";
}
/** This budget bounds even injected dependencies that ignore AbortSignal. */
export async function withInstaboxDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>, timeoutMs = 5_000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, 30_000) : 5_000;
  try {
    return await Promise.race([Promise.resolve().then(() => work(controller.signal)), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error("Instabox timeout")); }, budget);
    })]);
  } finally { if (timer) clearTimeout(timer); controller.abort(); }
}

export function evaluateFreeOnlyAdmission(
  orgs: RawInstaboxOrg[] | null | undefined,
  targetOrgId?: string,
  now = Date.now(),
  plan?: InstaboxCreationPlan,
  observedAt = now,
  keyOrgId?: string,
  billingPolicy: InstaboxBillingPolicy = "free-only",
): InstaboxAdmissionEvaluation {
  const missing = new Set<string>();
  const reasons: string[] = [];
  if (!plan || !plan.orgId?.trim() || !plan.name?.trim()) missing.add("explicit-creation-plan");
  if (!targetOrgId || plan?.orgId !== targetOrgId) missing.add("create-request-org-route");
  if (keyOrgId && keyOrgId !== targetOrgId) missing.add("workspace-key-org-match");
  const matches = Array.isArray(orgs) ? orgs.filter(o => o?.id === targetOrgId) : [];
  const org = matches.length === 1 ? matches[0] : undefined;
  if (!org) missing.add("unique-target-org");
  const tier = ["free", "pro", "team", "enterprise"].includes(org?.tier ?? "")
    ? org!.tier as InstaboxAdmissionEvaluation["tier"] : "unknown";
  const orgKind = org?.kind === "personal" || org?.kind === "workspace" ? org.kind : "unknown";

  const isFreeTier = tier === "free" && orgKind === "personal" && org?.personal === true && org?.billing?.subscribed !== true;
  if (orgKind === "unknown" || (orgKind === "personal" && org?.personal !== true) || (orgKind === "workspace" && org?.personal !== false)) missing.add("consistent-org-kind");
  if (org?.disabledAt || org?.cardMissingAt) missing.add("org-enabled");
  if (org?.billing?.subscribed === true && billingPolicy !== "allow-paid") missing.add("no-subscription");

  if (!isFreeTier) {
    if (billingPolicy !== "allow-paid") {
      missing.add("free-tier");
      missing.add("allow-paid-required");
      reasons.push("allow-paid-required");
    }
  }

  if (!finite(observedAt) || !finite(now) || observedAt > now || now - observedAt > INSTABOX_OBSERVATION_MAX_AGE_MS) missing.add("fresh-observation");

  const l = org?.limits, u = org?.usage;
  const freeSandboxes = l?.freeSandboxes;
  const maxMachines = l?.maxMachines;
  const machines = u?.machines;
  const freeMachines = u?.freeMachines;
  let capacityUnverified = false;
  if (!count(freeSandboxes) || !count(maxMachines) || !count(machines) || !count(freeMachines)) {
    capacityUnverified = true;
  } else if (machines !== freeMachines || machines >= freeSandboxes || (maxMachines > 0 && machines >= maxMachines)) {
    missing.add("available-free-slot");
  }

  if (!plan || plan.snapshotId || plan.templateId !== "agent-browser" || plan.persistentDiskGiB !== undefined || plan.rootDiskGiB !== undefined) missing.add("supported-free-create-source");
  if (!plan || !Number.isSafeInteger(plan.vcpus) || plan.vcpus <= 0 || !Number.isSafeInteger(plan.memMiB) || plan.memMiB <= 0 || !Array.isArray(org?.allowedSpecs) || org.allowedSpecs.filter(s => s.vcpus === plan.vcpus && s.memMiB === plan.memMiB && Number.isSafeInteger(s.persistentDiskGiB) && s.persistentDiskGiB >= 0).length !== 1) missing.add("allowed-create-spec");
  if (!plan || !count(plan.maxRunMinutes) || plan.maxRunMinutes === 0) missing.add("bounded-run-duration");
  if (plan && plan.maxRunMinutes !== 480) missing.add("free-runtime-policy");

  if (finite(l?.freeSandboxHours) && finite(u?.freeSandboxHours)) {
    if (l.freeSandboxHours > 0) {
      const start = Date.parse(u?.periodStart ?? ""), end = Date.parse(u?.periodEnd ?? ""), rated = Date.parse(u?.ratedUntil ?? "");
      if (!(start <= now && now < end && rated >= start && rated <= now && now - rated <= INSTABOX_OBSERVATION_MAX_AGE_MS)) missing.add("fresh-current-period-metering");
      if (plan && (u.freeSandboxHours + plan.maxRunMinutes / 60 > l.freeSandboxHours || now + plan.maxRunMinutes * 60_000 >= end)) missing.add("sufficient-hour-budget");
    }
  }

  const preflightPassed = missing.size === 0;
  const admitted = preflightPassed;
  const isFreeOnly = isFreeTier;
  return {
    admitted,
    isFreeOnly,
    preflightPassed,
    tier,
    orgKind,
    orgId: org?.id,
    reasons: reasons.length > 0 ? reasons : admitted ? ["Admitted based on official schema Machine.free=never billed"] : ["Admission preflight checks failed"],
    missingEvidence: [...missing],
    ...(capacityUnverified ? { capacityUnverified: true } : {}),
  };
}

export async function probeInstaboxOfficialQuota(apiKey: string, deps: InstaboxQuotaAdapterDeps = {}): Promise<InstaboxQuotaResult> {
  const now = deps.now ?? Date.now;
  const observedAt = now();
  try {
    return await withInstaboxDeadline(async signal => {
      const fetchFn = deps.fetchFn ?? fetch;
      const init = { method: "GET", headers: { "X-API-Key": apiKey, Accept: "application/json" }, signal };
      const [meRes, orgsRes] = await Promise.all([fetchFn("https://api.instabox.sh/v1/me", init), fetchFn("https://api.instabox.sh/v1/orgs", init)]);
      if (!meRes.ok || !orgsRes.ok) return { ok: false, source: SOURCE, observedAt, error: sanitizeErrorMessage(null, !meRes.ok ? meRes.status : orgsRes.status) };
      const [me, data] = await Promise.all([meRes.json(), orgsRes.json()]);
      // 官方 /me 的 userId 实测是**数字**（2026-10-24 真机），不是字符串：
      // 只接受 string 会把正常账户判成 "Invalid shape" 再被脱敏成通用通信错误。
      const meUserId = me?.userId;
      if (!me || (typeof meUserId !== "string" && typeof meUserId !== "number") || !Array.isArray(data?.orgs)) throw new Error("Invalid shape");
      const orgs = data.orgs as RawInstaboxOrg[];
      const evaluation = evaluateFreeOnlyAdmission(orgs, deps.creationPlan?.orgId, now(), deps.creationPlan, observedAt, me.orgId, deps.billingPolicy);
      if (me.inviteRequired === true && me.activated !== true) evaluation.missingEvidence.push("account-activated");
      if (evaluation.missingEvidence.length > 0) {
        evaluation.preflightPassed = false;
        evaluation.admitted = false;
      }
      const org = orgs.find(o => o?.id === deps.creationPlan?.orgId);
      let capacity: InstaboxCapacity | undefined;
      if (count(org?.limits?.freeSandboxes) && count(org?.limits?.maxMachines) && count(org?.usage?.machines)) {
        const max = org.limits.maxMachines === 0 ? org.limits.freeSandboxes : Math.min(org.limits.maxMachines, org.limits.freeSandboxes);
        capacity = { maxMachines: max, currentMachines: org.usage.machines, remainingMachines: Math.max(0, max - org.usage.machines) };
      }
      const creationContract = evaluation.admitted && org && deps.creationPlan ? {
        plan: structuredClone(deps.creationPlan),
        freeOrgObservation: { orgId: org.id, tier: "free" as const, observedAt,
          allowedSpecs: structuredClone(org.allowedSpecs!) },
      } : undefined;
      return { ok: evaluation.admitted, source: SOURCE, observedAt, creationContract, capacity, remaining: capacity?.remainingMachines, unit: "sandboxes", evaluation,
        balance: { freeSandboxHours: org?.limits?.freeSandboxHours, usedFreeSandboxHours: org?.usage?.freeSandboxHours } };
    }, deps.timeoutMs);
  } catch { return { ok: false, source: SOURCE, observedAt, error: sanitizeErrorMessage(null) }; }
}

/** 生产建机路径的「创建合同」解析。
 *
 * 证据**只认官方 API**（/me、/orgs 的 tier / kind / allowedSpecs /
 * limits.freeSandboxes / usage.machines）；**不认** run config 布尔或环境变量。
 * 拿不到合同 = 不许建机：调用方必须 fail-closed，零建机请求。
 */
export type InstaboxCreationContract = {
  plan: InstaboxCreationPlan;
  freeOrgObservation: InstaboxFreeOrgObservation;
};
export type InstaboxContractProbeDeps = {
  fetchFn?: InstaboxHttpFetch;
  now?: () => number;
  timeoutMs?: number;
  /** 用户侧「允许付费」授权（这是授权，不是层级证据）。 */
  billingPolicy?: InstaboxBillingPolicy;
  /** 调用方期望的模板；免费组织只接受 agent-browser。 */
  templateId?: string;
  /** 要创建的机器名（必须与后端建机用的名字完全一致）。 */
  machineName?: string;
};
export type InstaboxContractProbeResult = {
  ok: boolean;
  contract?: InstaboxCreationContract;
  /** 真正生效的计费策略：免费组织一律收紧成 free-only。 */
  billingPolicy: InstaboxBillingPolicy;
  tier?: InstaboxAdmissionEvaluation["tier"];
  orgKind?: InstaboxAdmissionEvaluation["orgKind"];
  orgId?: string;
  reasons: string[];
  missingEvidence: string[];
  error?: string;
};
export type InstaboxContractProbe = (
  apiKey: string,
  deps: InstaboxContractProbeDeps,
) => Promise<InstaboxContractProbeResult>;

const INSTABOX_FREE_TEMPLATE_ID = "agent-browser";
const INSTABOX_FREE_MAX_RUN_MINUTES = 480;

/** 官方 allowedSpecs 里 (vcpus, memMiB) 唯一的一组：后端的证据校验要求恰好命中一条。 */
function pickUniqueAllowedSpec(
  specs: RawInstaboxOrg["allowedSpecs"],
): { vcpus: number; memMiB: number } | undefined {
  if (!Array.isArray(specs)) return undefined;
  const byPair = new Map<string, { vcpus: number; memMiB: number }[]>();
  for (const spec of specs) {
    if (!spec || typeof spec !== "object") continue;
    if (!Number.isSafeInteger(spec.vcpus) || spec.vcpus <= 0) continue;
    if (!Number.isSafeInteger(spec.memMiB) || spec.memMiB <= 0) continue;
    if (!Number.isSafeInteger(spec.persistentDiskGiB) || spec.persistentDiskGiB < 0) continue;
    const key = `${spec.vcpus}:${spec.memMiB}`;
    const list = byPair.get(key) ?? [];
    list.push({ vcpus: spec.vcpus, memMiB: spec.memMiB });
    byPair.set(key, list);
  }
  const unique = [...byPair.values()]
    .filter((list) => list.length === 1)
    .map((list) => list[0]!);
  unique.sort((a, b) => a.memMiB - b.memMiB || a.vcpus - b.vcpus);
  return unique[0];
}

/**
 * 用官方 API 证据解析出「这一次建机」允许的创建合同。
 * 失败时只返回缺证据名与脱敏错误，绝不回显 apiKey 或响应体。
 */
export async function resolveInstaboxCreationContract(
  apiKey: string,
  deps: InstaboxContractProbeDeps = {},
): Promise<InstaboxContractProbeResult> {
  const now = deps.now ?? Date.now;
  const observedAt = now();
  const requestedPolicy: InstaboxBillingPolicy = deps.billingPolicy ?? "free-only";
  const missing = new Set<string>();
  const reasons: string[] = [];
  const finish = (error?: string): InstaboxContractProbeResult => ({
    ok: false,
    billingPolicy: requestedPolicy,
    reasons: reasons.length > 0 ? reasons : ["no-creation-contract"],
    missingEvidence: [...missing],
    ...(error ? { error } : {}),
  });
  if (!apiKey?.trim()) {
    missing.add("api-key");
    return finish(sanitizeErrorMessage(null, 401));
  }
  try {
    return await withInstaboxDeadline(async (signal) => {
      const fetchFn = deps.fetchFn ?? (globalThis.fetch as unknown as InstaboxHttpFetch);
      const init = {
        method: "GET",
        headers: { "X-API-Key": apiKey, Accept: "application/json" },
        signal,
      };
      const [meRes, orgsRes] = await Promise.all([
        fetchFn("https://api.instabox.sh/v1/me", init),
        fetchFn("https://api.instabox.sh/v1/orgs", init),
      ]);
      if (!meRes.ok || !orgsRes.ok) {
        missing.add("official-api-reachable");
        return finish(sanitizeErrorMessage(null, !meRes.ok ? meRes.status : orgsRes.status));
      }
      const [me, data] = await Promise.all([meRes.json(), orgsRes.json()]);
      const meUserId = me?.userId;
      if (!me || (typeof meUserId !== "string" && typeof meUserId !== "number") || !Array.isArray(data?.orgs)) {
        missing.add("official-api-shape");
        return finish(sanitizeErrorMessage(null));
      }
      const orgs = data.orgs as RawInstaboxOrg[];
      const meOrgId = typeof me.orgId === "string" ? me.orgId : undefined;
      const enabled = (org: RawInstaboxOrg): boolean => !org.disabledAt && !org.cardMissingAt;
      const freeOrg = (org: RawInstaboxOrg): boolean =>
        org.tier === "free" &&
        org.kind === "personal" &&
        org.personal === true &&
        org.billing?.subscribed !== true &&
        enabled(org);
      const candidates = requestedPolicy === "free-only"
        ? orgs.filter((org) => org && freeOrg(org))
        : orgs.filter((org) => org && org.id && enabled(org));
      const org =
        candidates.find((candidate) => candidate.id === meOrgId) ??
        (candidates.length === 1 ? candidates[0] : undefined);
      if (!org) {
        const paidOrgExists = orgs.some(
          (candidate) =>
            candidate && candidate.id && enabled(candidate) && !freeOrg(candidate),
        );
        missing.add(requestedPolicy === "free-only" ? "free-org-evidence" : "target-org-evidence");
        if (requestedPolicy === "free-only" && paidOrgExists) {
          missing.add("allow-paid-required");
        }
        reasons.push(
          requestedPolicy === "free-only"
            ? "no-free-org-in-official-api"
            : "ambiguous-or-missing-target-org",
        );
        return finish();
      }
      const tier = org.tier;
      if (!["free", "pro", "team", "enterprise"].includes(tier)) {
        missing.add("known-tier");
        reasons.push("unknown-tier");
        return finish();
      }
      const isFree = freeOrg(org);
      if (!isFree && requestedPolicy !== "allow-paid") {
        missing.add("allow-paid-required");
        reasons.push("allow-paid-required");
        return finish();
      }
      // 生效策略：免费组织一律收紧为 free-only；付费组织必须显式 allow-paid。
      const billingPolicy: InstaboxBillingPolicy = isFree ? "free-only" : "allow-paid";
      const freeSandboxes = org.limits?.freeSandboxes;
      const maxMachines = org.limits?.maxMachines;
      const machines = org.usage?.machines;
      if (!count(freeSandboxes) || !count(machines)) {
        missing.add("official-capacity-evidence");
        return finish();
      }
      if (isFree) {
        if (machines >= freeSandboxes) {
          missing.add("available-free-slot");
          return finish();
        }
        const freeMachines = org.usage?.freeMachines;
        if (count(freeMachines) && freeMachines !== machines) {
          missing.add("available-free-slot");
          return finish();
        }
      } else if (count(maxMachines) && maxMachines > 0 && machines >= maxMachines) {
        missing.add("available-machine-slot");
        return finish();
      }
      const requestedTemplate = deps.templateId?.trim();
      if (isFree && requestedTemplate && requestedTemplate !== INSTABOX_FREE_TEMPLATE_ID) {
        missing.add("free-template-agent-browser");
        reasons.push("free-org-only-allows-agent-browser");
        return finish();
      }
      const templateId = isFree ? INSTABOX_FREE_TEMPLATE_ID : requestedTemplate || "universal";
      const machineName = deps.machineName?.trim();
      if (!machineName) {
        missing.add("machine-name");
        return finish();
      }
      const spec = pickUniqueAllowedSpec(org.allowedSpecs);
      if (!spec) {
        missing.add("allowed-create-spec");
        return finish();
      }
      const plan: InstaboxCreationPlan = {
        orgId: org.id,
        name: machineName,
        templateId,
        vcpus: spec.vcpus,
        memMiB: spec.memMiB,
        maxRunMinutes: INSTABOX_FREE_MAX_RUN_MINUTES,
      };
      const freeOrgObservation: InstaboxFreeOrgObservation = {
        orgId: org.id,
        tier: tier as InstaboxFreeOrgObservation["tier"],
        observedAt,
        allowedSpecs: structuredClone(org.allowedSpecs!),
      };
      reasons.push(isFree ? "free-org-evidence" : "paid-org-with-allow-paid");
      return {
        ok: true,
        contract: {
          plan: structuredClone(plan),
          freeOrgObservation: structuredClone(freeOrgObservation),
        },
        billingPolicy,
        tier: tier as InstaboxAdmissionEvaluation["tier"],
        orgKind: org.kind === "personal" || org.kind === "workspace" ? org.kind : "unknown",
        orgId: org.id,
        reasons,
        missingEvidence: [],
      };
    }, deps.timeoutMs);
  } catch {
    missing.add("probe-failed");
    return finish(sanitizeErrorMessage(null));
  }
}
