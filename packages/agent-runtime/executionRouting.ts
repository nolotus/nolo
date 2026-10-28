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
import type { ExecutionEndpoint } from "./executionEndpoint";
import {
  satisfiesExecutionPolicy,
  UNGOVERNED_EXECUTION_POLICY,
  type EndpointCapability,
  type ExecutionSourceTrust,
  type ExecutionPolicy,
  type ExecutionPolicyDeclaration,
  type ExecutionPolicyRefusalCode,
} from "./executionEndpoint";

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

/**
 * 任务来源，决定两件事：「没有策略」这条遗留路径能不能走，以及能不能进宿主。
 * 类型定义在 `executionEndpoint`（判定函数要读它），这里只做转出。
 *   owner      用户自己的项目 / 本机脚本；
 *   untrusted  第三方 / 市场脚本：只允许 `isolated-strictly`，`host-trusted` 直接拒绝；
 *   unknown    调用方没声明（缺省）：与 `owner` 可区分，`host-trusted` 下 fail-closed。
 */
export type { ExecutionSourceTrust };

export type ExecutionBackendCandidate = {
  backendId: string;
  kind: ExecutionBackendKind;
  capabilities: ExecutionBackendCapabilities;
  /** False when the backend is unconfigured, offline, or out of quota. */
  available: boolean;
  /**
   * Measured COLD start in ms (request → actually executable). This is the
   * user-perceived boot cost and the only boot number routing compares.
   *
   * Kept separate from `observedWarmBootMs` on purpose: a warm sandbox is a
   * different quantity, and letting a warm number compete against cold ones
   * makes whichever backend happens to be warm win by definition.
   */
  observedColdBootMs?: number;
  /** Measured boot in ms with a warm sandbox/instance already running. */
  observedWarmBootMs?: number;
  /** Defaults to "platform" for backwards compatibility with callers that
   *  predate per-tenant backends. */
  source?: ExecutionBackendSource;
  /**
   * G2：端点能力标注（路线图 §2.6）。发现阶段就产出，调用方据此问
   * 「这个端能不能 shell / 有没有 browser-connector / shell 有没有边界」，
   * 而不是靠 `backendId` / `runtimeKey` 字符串判断。
   *
   * 只加字段、不改既有字段语义：路由代码不读它（prefer-local 路由是下一块）。
   */
  endpoint?: ExecutionEndpoint;
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
  /**
   * G4 隔离硬约束拒绝：`executionPolicy` 要求隔离，而这批端点里没有一个合格。
   * 与 `degraded` **互斥**——`refused` 时 `backendId` 是 `"none"`，没有宿主回退，
   * 调用方必须当失败处理（不要读 `backendId` 去执行）。
   */
  refused?: true;
  /** `refused` 时给出稳定原因码（见 `ExecutionPolicyRefusalCode`）。 */
  refusalCode?: ExecutionPolicyRefusalCode;
  /** `refused` 时逐候选的原因，供日志/工件展示。 */
  refusedCandidates?: readonly {
    backendId: string;
    refusalCode: ExecutionPolicyRefusalCode;
  }[];
  /**
   * 本次判定用的来源。`"unknown"` = 调用方没声明——它必须与 `"owner"` 在审计里可区分，
   * 否则「没人证明它可信」和「它可信」会写成同一行日志。
   */
  sourceTrust: ExecutionSourceTrust;
  /** 本次判定用的策略声明（含 `ungoverned-legacy` 哨兵）：看得出这里「没人设策略」。 */
  executionPolicy: ExecutionPolicyDeclaration;
};

/**
 * 路由内部判定：审计两维（来源 / 策略声明）由 `resolveExecutionTarget` 统一盖章，
 * 不让每条回退分支各写一遍——漏写一条就是一条审计盲区。
 */
type RouteOutcome = Omit<ExecutionTargetDecision, "sourceTrust" | "executionPolicy">;

function withAudit(
  decision: RouteOutcome,
  audit: { sourceTrust: ExecutionSourceTrust; executionPolicy: ExecutionPolicyDeclaration },
): ExecutionTargetDecision {
  return { ...decision, sourceTrust: audit.sourceTrust, executionPolicy: audit.executionPolicy };
}

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

/**
 * G4 隔离硬约束守卫（Isolation Guard）的候选级判定。
 *
 * 候选没有端点标注时 **fail-closed**：无法证明边界就不当作有边界。
 * 这一段只回答「这个候选能不能承载该策略」，优先序/落点选择仍由下面已有的路由决定。
 */
function evaluatePolicyEligibility(
  candidate: ExecutionBackendCandidate,
  policy: ExecutionPolicy,
  options: {
    required?: readonly EndpointCapability[];
    hostTrustAuthorized?: boolean;
    sourceTrust?: ExecutionSourceTrust;
  },
): { eligible: boolean; refusalCode?: ExecutionPolicyRefusalCode } {
  const endpoint = candidate.endpoint;
  if (!endpoint) {
    return { eligible: false, refusalCode: "endpoint-facts-missing" };
  }
  const verdict = satisfiesExecutionPolicy(endpoint, policy, {
    // 原样透传：`undefined`（未声明 required / 来源）在严格隔离与宿主策略下
    // 都要 fail-closed，不能被 `?? []` / `?? "owner"` 抹成「放行」。
    ...(options.required === undefined ? {} : { required: options.required }),
    ...(options.hostTrustAuthorized === undefined
      ? {}
      : { hostTrustAuthorized: options.hostTrustAuthorized }),
    ...(options.sourceTrust === undefined ? {} : { sourceTrust: options.sourceTrust }),
  });
  return verdict.eligible
    ? { eligible: true }
    : { eligible: false, refusalCode: verdict.refusalCode ?? "no-eligible-endpoint" };
}

export type ResolveExecutionTargetArgs = {
  profile: ExecutionTaskProfile;
  candidates: readonly ExecutionBackendCandidate[];
  /** Preferred backend when several qualify (e.g. a specific cloud account). */
  preferredBackendId?: string;
  /**
   * G4：skill 声明的执行策略。不传 = `UNGOVERNED_EXECUTION_POLICY`，即**没有策略**：
   * 按既有能力/尺寸逻辑路由（可回退宿主裸跑），不带来任何执行保证，且不允许承载
   * untrusted 来源（见 `sourceTrust`）。
   *   - `"isolated-strictly"`：不满足隔离边界的端点直接失去资格，一个都不合格就返回
   *     `refused`（`"no-isolated-endpoint-available"`），**不回退宿主裸跑**。
   *   - `"host-trusted"`：必须有 `hostTrustAuthorized: true`。
   */
  executionPolicy?: ExecutionPolicyDeclaration;
  /**
   * 任务来源。「不设策略」的路由只允许承载用户自己的可信来源：
   *   - `"owner"`（缺省）：用户自己的项目 / 本机脚本，走既有能力路由；
   *   - `"untrusted"`：第三方 / 市场脚本。**必须**声明 `isolated-strictly`，否则
   *     按 `execution-policy-undeclared` 拒绝——不能让「忘了传策略」把不可信脚本
   *     送到宿主上裸跑。
   */
  sourceTrust?: ExecutionSourceTrust;
  /** 调用方对 `host-trusted` 的显式授权标记。 */
  hostTrustAuthorized?: boolean;
  /** skill 声明的 `requiresCapabilities`（透传给策略判定）。 */
  requiredCapabilities?: readonly EndpointCapability[];
};

export function resolveExecutionTarget(args: ResolveExecutionTargetArgs): ExecutionTargetDecision {
  return withAudit(resolveExecutionTargetForPolicy(args), {
    sourceTrust: args.sourceTrust ?? "unknown",
    executionPolicy: args.executionPolicy ?? UNGOVERNED_EXECUTION_POLICY,
  });
}

function resolveExecutionTargetForPolicy(args: ResolveExecutionTargetArgs): RouteOutcome {
  const { profile, candidates } = args;
  const declaration = args.executionPolicy ?? UNGOVERNED_EXECUTION_POLICY;
  // 未声明来源 = "unknown"，不是 "owner"：漏传一个字段不该等于自授权。
  const sourceTrust: ExecutionSourceTrust = args.sourceTrust ?? "unknown";


  // ---- G4：来源 × 策略的自相矛盾组合（review HIGH-1）--------------------------
  // 只在「未声明策略」那条分支判来源是不够的：调用方同时声明
  // `host-trusted` + `hostTrustAuthorized: true` 就能把 untrusted 送进宿主裸跑，
  // 而 marketplace 清单正是攻击者可控的那一侧。
  // 这里刻意**不看** `hostTrustAuthorized`：授权是 owner 本人跨信任边界的决定，
  // 不可信清单自己写下的 `true` 不构成它。
  if (sourceTrust === "untrusted" && declaration === "host-trusted") {
    return {
      backendId: "none",
      reason:
        "untrusted-requires-isolation: 来源是不可信脚本（sourceTrust=untrusted），却声明了 host-trusted；"
        + "不可信来源只允许 isolated-strictly，授权标记不能替代来源可信，拒绝执行，不回退宿主裸跑",
      billingOwner: "none",
      refused: true,
      refusalCode: "untrusted-requires-isolation",
      refusedCandidates: [],
    };
  }

  // ---- G4：「没有策略」不是一条无人看管的路 ------------------------------------
  // 未声明策略允许走既有能力路由（既有契约），但只允许承载用户自己的可信来源。
  // 没有这一条，「忘了传策略 + 不可信脚本」就是宿主裸跑。
  if (declaration === UNGOVERNED_EXECUTION_POLICY && args.sourceTrust === "untrusted") {
    return {
      backendId: "none",
      reason:
        "execution-policy-undeclared: 来源是不可信脚本（sourceTrust=untrusted），但没有声明 executionPolicy；"
        + "未声明策略不等于 host-trusted，拒绝执行，不回退宿主裸跑",
      billingOwner: "none",
      refused: true,
      refusalCode: "execution-policy-undeclared",
      refusedCandidates: [],
    };
  }

  // ---- G4：安全门禁前置（在**任何**回退之前判，包括「没有任何可用后端」）--------
  if (declaration !== UNGOVERNED_EXECUTION_POLICY) {
    const refusedCandidates: { backendId: string; refusalCode: ExecutionPolicyRefusalCode }[] = [];
    const policyEligible: ExecutionBackendCandidate[] = [];
    // 遍历**全部**候选，不只是 `available`：否则探测不过的候选在审计里彻底消失，
    // 「候选全死」与「候选都在但不合格」会给出同一个空拒绝清单，运维无从定位。
    for (const candidate of candidates) {
      if (!candidate.available) {
        refusedCandidates.push({
          backendId: candidate.backendId,
          refusalCode: "endpoint-unavailable",
        });
        continue;
      }
      const verdict = evaluatePolicyEligibility(candidate, declaration, {
        ...(args.requiredCapabilities === undefined
          ? {}
          : { required: args.requiredCapabilities }),
        ...(args.hostTrustAuthorized === undefined
          ? {}
          : { hostTrustAuthorized: args.hostTrustAuthorized }),
        ...(args.sourceTrust === undefined ? {} : { sourceTrust }),
      });
      if (verdict.eligible) {
        policyEligible.push(candidate);
        continue;
      }
      refusedCandidates.push({
        backendId: candidate.backendId,
        refusalCode: verdict.refusalCode ?? "no-eligible-endpoint",
      });
    }

    if (policyEligible.length === 0) {
      const strict = declaration === "isolated-strictly";
      const refusalCode: ExecutionPolicyRefusalCode = strict
        ? "no-isolated-endpoint-available"
        : refusedCandidates.length > 0
          ? refusedCandidates[0]!.refusalCode
          : "no-eligible-endpoint";
      const detail = refusedCandidates.map((c) => `${c.backendId}:${c.refusalCode}`).join(", ")
        || "无候选端点";
      return {
        backendId: "none",
        reason: strict
          ? `no-isolated-endpoint-available: executionPolicy=isolated-strictly 且没有端点满足隔离边界`
            + `（${detail}）；拒绝执行，不回退本地裸跑`
          : `executionPolicy=${declaration} 不被任何端点满足（${detail}）`,
        billingOwner: "none",
        refused: true,
        refusalCode,
        refusedCandidates,
      };
    }

    // 后面的既有路由只在**合规子集**里做尺寸/优先序判断。
    return routeAmongEligible({
      profile: args.profile,
      candidates: policyEligible,
      ...(args.preferredBackendId === undefined ? {} : { preferredBackendId: args.preferredBackendId }),
      executionPolicy: declaration,
    });
  }

  return routeAmongEligible({
    profile: args.profile,
    candidates: args.candidates,
    ...(args.preferredBackendId === undefined ? {} : { preferredBackendId: args.preferredBackendId }),
  });
}

/** 既有路由（尺寸启发式 + 优先端 + 宿主回退）。策略守卫之后才会进来。 */
function routeAmongEligible(args: {
  profile: ExecutionTaskProfile;
  candidates: readonly ExecutionBackendCandidate[];
  preferredBackendId?: string;
  executionPolicy?: ExecutionPolicyDeclaration;
}): RouteOutcome {
  const { profile } = args;
  const available = args.candidates.filter((c) => c.available);
  const strict = args.executionPolicy === "isolated-strictly";

  // 顺序不变量（review LOW-2）：`isolated-strictly` 绝不能走下面「没有可用后端 →
  // 回退 full-host degraded」那条分支。今天 strict 只收到已筛过的合规候选（非空），
  // 所以本该不可达；但这条顺序一旦被改动就是宿主回退复活，宁可在这里显式拒绝。
  if (strict && available.length === 0) {
    return {
      backendId: "none",
      reason:
        "no-isolated-endpoint-available: executionPolicy=isolated-strictly 且没有可用的隔离端点；"
        + "拒绝执行，不回退宿主裸跑",
      billingOwner: "none",
      refused: true,
      refusalCode: "no-isolated-endpoint-available",
      refusedCandidates: [],
    };
  }

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
    //
    // G4：策略要求隔离时，「回退宿主」不是可选项——回退就是裸跑，正是本块要消掉的行为。
    if (strict) {
      return {
        backendId: "none",
        reason: `no-isolated-endpoint-available (${rejected.join(", ")}): executionPolicy=isolated-strictly 下没有端点满足硬需求；拒绝执行，不回退本地裸跑`,
        billingOwner: "none",
        refused: true,
        refusalCode: "no-isolated-endpoint-available",
      };
    }
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
): RouteOutcome {
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
    (a, b) =>
      (a.observedColdBootMs ?? Number.POSITIVE_INFINITY) -
      (b.observedColdBootMs ?? Number.POSITIVE_INFINITY),
  );
  const winner = sorted[0]!;
  const boot = winner.observedColdBootMs;
  // "Only one backend qualified" is not an error: the tenant simply owns less.
  // It must still be visible, because a single-backend tenant may be paying
  // cloud rates for what another tenant runs for free locally.
  const suffix = sorted.length === 1
    ? "; only-available-backend"
    : boot === undefined
      ? ""
      : `; fastest measured cold boot (${boot}ms)`;
  return {
    backendId: winner.backendId,
    reason: `${reason}${suffix}`,
    billingOwner: billingOwnerFor(winner.source),
  };
}
