import { isRecord } from "core/isRecord";
import { asOptionalPositiveFiniteNumber } from "core/optionalPositiveNumber";
import { asNonEmptyStringArray, asTrimmedNonEmptyStringArray } from "core/stringArray";
import { asOptionalTrimmedString } from "core/optionalString";
import type { AgentRuntimeAgentConfig } from "./hostAdapter";
import type { AgentRuntimeHost, AgentRuntimeToolPolicy, AgentRuntimeWorkspaceMode } from "./types";

type EnvLike = Record<string, string | undefined>;

function unique(values: string[]) {
  return [...new Set(values)];
}

function mergeRecords<T extends Record<string, unknown>>(
  base: T | undefined,
  override: T | undefined,
): T | undefined {
  if (!base && !override) return undefined;
  return {
    ...(base ?? {}),
    ...(override ?? {}),
  } as T;
}

function normalizeWorkspacePolicy(value: unknown): AgentRuntimeToolPolicy["workspace"] | undefined {
  if (!isRecord(value)) return undefined;
  const mode: AgentRuntimeWorkspaceMode | undefined =
    value.mode === "none" || value.mode === "current" || value.mode === "lease"
      ? value.mode
      : undefined;
  const readableRoots = unique(asNonEmptyStringArray(value.readableRoots));
  const writableRoots = unique(asNonEmptyStringArray(value.writableRoots));
  const cwd = asOptionalTrimmedString(value.cwd);
  const normalized = {
    ...(mode ? { mode } : {}),
    ...(readableRoots.length ? { readableRoots } : {}),
    ...(writableRoots.length ? { writableRoots } : {}),
    ...(cwd ? { cwd } : {}),
  };
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Merge two workspace policies keeping the same invariant as
 * `normalizeWorkspacePolicy`: empty root lists and absent keys stay absent
 * instead of being materialized as `readableRoots: []`.
 */
function mergeWorkspacePolicy(
  base: AgentRuntimeToolPolicy["workspace"],
  override: AgentRuntimeToolPolicy["workspace"],
): AgentRuntimeToolPolicy["workspace"] {
  const readableRoots = unique([
    ...(base?.readableRoots ?? []),
    ...(override?.readableRoots ?? []),
  ]);
  const writableRoots = unique([
    ...(base?.writableRoots ?? []),
    ...(override?.writableRoots ?? []),
  ]);
  return {
    ...(base ?? {}),
    ...(override ?? {}),
    ...(readableRoots.length ? { readableRoots } : {}),
    ...(writableRoots.length ? { writableRoots } : {}),
  };
}

export function normalizeAgentRuntimeToolPolicy(
  value: unknown,
): AgentRuntimeToolPolicy | undefined {
  if (!isRecord(value)) return undefined;
  const workspace = normalizeWorkspacePolicy(value.workspace);
  return {
    version: 1,
    ...(asNonEmptyStringArray(value.agentTools).length
      ? { agentTools: unique(asNonEmptyStringArray(value.agentTools)) }
      : {}),
    ...(asNonEmptyStringArray(value.runtimeTools).length
      ? { runtimeTools: unique(asNonEmptyStringArray(value.runtimeTools)) }
      : {}),
    ...(workspace ? { workspace } : {}),
    ...(isRecord(value.shell) ? { shell: { ...value.shell } } : {}),
    ...(isRecord(value.isolation) ? { isolation: { ...value.isolation } } : {}),
    ...(isRecord(value.git) ? { git: { ...value.git } } : {}),
    ...(isRecord(value.budget) ? { budget: { ...value.budget } } : {}),
    ...(isRecord(value.audit) ? { audit: { ...value.audit } } : {}),
  };
}

/**
 * 请求级 runtime tool policy 申请（`nolo agent run --machine-shell`）的**唯一**
 * 白名单闸门 —— 客户端只能「申请能力」，不能「改边界」。
 *
 * 只接受两项，其余（`shell` / `isolation` / `audit` / `network` / `agentTools` /
 * `git` / `budget` / `workspace.readableRoots` 等——含任何未列出的字段）一律丢弃：
 *   - `runtimeTools`：只保留字面量 `"execShell"`；
 *   - `workspace.mode`：只保留 `"lease"`。
 *
 * 合并顺序由 resolveEffectiveRuntimeToolPolicy 钉死：先并入本 override，再叠加
 * applyWebRuntimeSafetyBaseline —— 所以 os-sandbox / commandPolicy=approval /
 * networkPolicy=default-deny / audit 仍然生效（与 agent 自身策略同一条路径）。
 *
 * 无可接受内容时返回 undefined（等价于没有申请，不产生任何 policy）。
 */
export function normalizeRuntimeToolPolicyOverride(
  value: unknown,
): AgentRuntimeToolPolicy | undefined {
  if (!isRecord(value)) return undefined;
  const runtimeTools = unique(
    asTrimmedNonEmptyStringArray(value.runtimeTools).filter(
      (tool) => tool === "execShell",
    ),
  );
  const workspace =
    isRecord(value.workspace) && value.workspace.mode === "lease"
      ? { mode: "lease" as const }
      : undefined;
  if (!runtimeTools.length && !workspace) return undefined;
  return {
    version: 1,
    ...(runtimeTools.length ? { runtimeTools } : {}),
    ...(workspace ? { workspace } : {}),
  };
}

function runtimeBindingRecord(
  runtimeBinding: unknown,
): Record<string, unknown> | undefined {
  return isRecord(runtimeBinding) ? runtimeBinding : undefined;
}

function runtimeToolNamesFromPolicy(policy: AgentRuntimeToolPolicy | undefined) {
  return asNonEmptyStringArray(policy?.runtimeTools);
}

function readPositiveNumber(value: unknown) {
  return asOptionalPositiveFiniteNumber(Number(value));
}

export function mergeAgentRuntimeToolPolicies(
  base?: AgentRuntimeToolPolicy,
  override?: AgentRuntimeToolPolicy,
): AgentRuntimeToolPolicy | undefined {
  if (!base && !override) return undefined;
  return {
    version: 1,
    agentTools: unique([
      ...(base?.agentTools ?? []),
      ...(override?.agentTools ?? []),
    ]),
    runtimeTools: unique([
      ...(base?.runtimeTools ?? []),
      ...(override?.runtimeTools ?? []),
    ]),
    workspace: mergeWorkspacePolicy(base?.workspace, override?.workspace),
    shell: mergeRecords(base?.shell, override?.shell),
    isolation: mergeRecords(base?.isolation, override?.isolation),
    git: mergeRecords(base?.git, override?.git),
    budget: mergeRecords(base?.budget, override?.budget),
    audit: mergeRecords(base?.audit, override?.audit),
  };
}

export function resolveRequestedRuntimeToolNames(args: {
  agentConfig: Pick<
    AgentRuntimeAgentConfig,
    "toolNames" | "runtimeToolPolicy" | "runtimeBinding"
  >;
}) {
  const runtimeBinding = runtimeBindingRecord(args.agentConfig.runtimeBinding);
  const bindingPolicy = normalizeAgentRuntimeToolPolicy(
    runtimeBinding?.runtimeToolPolicy,
  );
  const bindingSnapshotPolicy = normalizeAgentRuntimeToolPolicy(
    runtimeBinding?.runtimeToolPolicySnapshot,
  );
  return unique([
    ...asNonEmptyStringArray(args.agentConfig.toolNames),
    ...runtimeToolNamesFromPolicy(
      normalizeAgentRuntimeToolPolicy(args.agentConfig.runtimeToolPolicy),
    ),
    ...runtimeToolNamesFromPolicy(bindingPolicy),
    ...runtimeToolNamesFromPolicy(bindingSnapshotPolicy),
  ]);
}

export function resolveCurrentRunRuntimeToolPolicy(
  agentConfig: Pick<AgentRuntimeAgentConfig, "runtimeToolPolicy" | "runtimeBinding"> | null | undefined,
): AgentRuntimeToolPolicy | undefined {
  const runtimeBinding = runtimeBindingRecord(agentConfig?.runtimeBinding);
  return normalizeAgentRuntimeToolPolicy(
    runtimeBinding?.runtimeToolPolicySnapshot ??
      agentConfig?.runtimeToolPolicy ??
      runtimeBinding?.runtimeToolPolicy,
  );
}

export function resolveLocalRuntimeEnvFromPolicy(
  runtimeEnv: EnvLike,
  policy?: AgentRuntimeToolPolicy,
): EnvLike {
  void policy;
  return { ...runtimeEnv };
}

export function resolveLocalWorkspaceExecutorOptionsFromPolicy(
  policy?: AgentRuntimeToolPolicy,
) {
  const maxOutputBytes = readPositiveNumber(policy?.shell?.maxOutputBytes);
  return {
    ...(maxOutputBytes ? { commandOutputLimit: Math.floor(maxOutputBytes) } : {}),
  };
}

function policyRequestsHostedWorkspace(policy: AgentRuntimeToolPolicy | undefined) {
  if (!policy) return false;
  const workspaceMode = policy.workspace?.mode;
  return (
    policy.shell?.enabled === true ||
    policy.runtimeTools?.some((tool) => tool === "execShell") ||
    workspaceMode === "lease"
  );
}

function applyWebRuntimeSafetyBaseline(
  policy: AgentRuntimeToolPolicy | undefined,
): AgentRuntimeToolPolicy | undefined {
  if (!policyRequestsHostedWorkspace(policy)) return policy;
  return mergeAgentRuntimeToolPolicies(
    policy,
    {
      version: 1,
      shell: {
        commandPolicy: "approval",
        networkPolicy: "default-deny",
      },
      isolation: {
        mode: "os-sandbox",
      },
      audit: {
        logToolCalls: true,
        logShellCommands: true,
        writeToDialog: true,
      },
    },
  );
}

export function resolveEffectiveRuntimeToolPolicy(args: {
  agentConfig: Pick<AgentRuntimeAgentConfig, "runtimeToolPolicy" | "runtimeBinding">;
  host?: AgentRuntimeHost;
  /**
   * 请求级申请（`nolo agent run --machine-shell` → runtimeContext
   * .runtimeToolPolicyOverride）。只经 normalizeRuntimeToolPolicyOverride
   * 白名单，且必须在 applyWebRuntimeSafetyBaseline **之前** 合并——顺序即安全
   * 边界：override 申请得到的能力仍受 web 基线的 sandbox/审批/审计约束。
   */
  runtimeToolPolicyOverride?: unknown;
}): AgentRuntimeToolPolicy | undefined {
  const agentPolicy = resolveCurrentRunRuntimeToolPolicy(args.agentConfig);
  const requestedPolicy = normalizeRuntimeToolPolicyOverride(
    args.runtimeToolPolicyOverride,
  );
  const effectivePolicy = mergeAgentRuntimeToolPolicies(agentPolicy, requestedPolicy);
  return args.host === "web"
    ? applyWebRuntimeSafetyBaseline(effectivePolicy)
    : effectivePolicy;
}
