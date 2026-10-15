import { isRecord } from "core/isRecord";
import { asOptionalPositiveFiniteNumber } from "core/optionalPositiveNumber";
import { asNonEmptyStringArray } from "core/stringArray";
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
    workspace: {
      ...(base?.workspace ?? {}),
      ...(override?.workspace ?? {}),
      readableRoots: unique([
        ...(base?.workspace?.readableRoots ?? []),
        ...(override?.workspace?.readableRoots ?? []),
      ]),
      writableRoots: unique([
        ...(base?.workspace?.writableRoots ?? []),
        ...(override?.workspace?.writableRoots ?? []),
      ]),
    },
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
}): AgentRuntimeToolPolicy | undefined {
  const agentPolicy = resolveCurrentRunRuntimeToolPolicy(args.agentConfig);
  const effectivePolicy = mergeAgentRuntimeToolPolicies(agentPolicy);
  return args.host === "web"
    ? applyWebRuntimeSafetyBaseline(effectivePolicy)
    : effectivePolicy;
}
