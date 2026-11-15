import { canonicalizeToolName } from "./toolNameAliases";
import { isRecord } from "core/isRecord";
import { isOwnedAgentKey } from "core/prefix";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";

export const DEFAULT_PRIVATE_NOLO_WORKSPACE_TOOLS = [
  "listDialogs",
  "readDialog",
  "queryDialogsBySubjectRef",
  "deleteDialogs",
  "listAgents",
  "readAgent",
  "listSpaces",
  "readSpace",
  "readDoc",
  "readSkillDoc",
  "loadSkill",
  "listTables",
  "queryTableRows",
  "cliWhoami",
  "cliDoctor",
  "list_cloud_resources",
  "cloud_probe",
  // cloud_exec 故意不在此清单：硬边界是「永不默认开 exec」。它只在 agent 显式启用时出现，
  // 且只读 run 会被 HIGH_RISK_MUTATION_TOOL_NAMES 挡住（runtimeToolSurface.test.ts 钉住）。
] as const;

export const DEFAULT_SUBTASK_REFERENCE_NOLO_WORKSPACE_TOOLS = [
  "readDialog",
  "queryDialogsBySubjectRef",
  "readDoc",
  "queryTableRows",
] as const;

export type RuntimeToolSurfaceHost =
  | "web"
  | "cli"
  | "desktop"
  | "connector"
  | "server";

export type RuntimeToolSurfaceVisibility =
  | "private"
  | "public"
  | "anonymous"
  | "shared";

export type RuntimeToolSurfaceNames = {
  explicitToolNames: string[];
  injectedToolNames: string[];
  finalToolNames: string[];
};

export type ToolSurfaceConstraints = {
  /** Undefined means no positive constraint; [] explicitly allows no tools. */
  allowedToolNames?: readonly string[] | null;
  blockedToolNames?: readonly string[] | null;
};

/**
 * 具有潜在系统破坏性或写入副作用的高风险工具。
 * 用于只读审计（Reviewer）、规划（Planner）、探测（Probe）等子任务的最小权限收敛。
 */
export const HIGH_RISK_MUTATION_TOOL_NAMES = [
  "writeFile",
  "editFile",
  "deleteDialogs",
  "deleteMemory",
  "taskStop",
  // 能力包（loadSkill 授予）里的写/删/部署/记忆写入/进程启动类工具：
  // 只读 run 的授予通道会过同一份 blockedToolNames，名单缺项即可被绕过。
  // 契约测试（runtimeToolSurface.test.ts）按名字关键字钉住 CAPABILITY_PACKS 的分类。
  "applyEdit",
  "applyLineEdits",
  "launchProcess",
  "rememberMemory",
  "appFileWrite",
  "appFileReplace",
  "appDeploy",
  "appDelete",
  "createTable",
  "addTableRow",
  "addTableRows",
  "updateTableRow",
  "deleteTableRow",
  // 媒体任务译文写回：改写 job 的 translate 产物（服务端零计费、无外部副作用），
  // 但仍是「写」，只读 run 不该拿到写回能力；契约测试按名字关键字钉住这份分类。
  "writeTranslations",
  // 编排副作用：startAgentRun 会另起一次 run（子 run 的只读与否由调用方参数决定），
  // controlAgentRun 能追加指令/停止它；只读 run 不应拿到这两个（review A-1）。
  "startAgentRun",
  "controlAgentRun",
  // 受控云端执行：在用户拥有的云资源上跑任意命令，不可重放、副作用在云端。
  // 硬边界：它永不进 DEFAULT_PRIVATE_NOLO_WORKSPACE_TOOLS（见该清单注释），
  // 必须由 agent 显式启用才出现；这里进名单保证只读 run 即使被显式要求也拿不到。
  "cloud_exec",
] as const;

/**
 * 生成只读安全约束：自动剔除所有高危修改/写操作和删除操作工具。
 */
export function resolveReadOnlyToolConstraints(
  additionalBlockedTools?: readonly string[],
): ToolSurfaceConstraints {
  return {
    blockedToolNames: [
      ...HIGH_RISK_MUTATION_TOOL_NAMES,
      ...(additionalBlockedTools ?? []),
    ],
  };
}

/** Apply only run-scoped narrowing; runtime policy and hard isolation are upstream. */
export function applyToolSurfaceConstraints<T extends RuntimeToolSurfaceNames>(
  surface: T,
  constraints: ToolSurfaceConstraints,
): T {
  const allowed = constraints.allowedToolNames == null
    ? null
    : new Set(asTrimmedNonEmptyStringArray(constraints.allowedToolNames));
  const blocked = new Set(asTrimmedNonEmptyStringArray(constraints.blockedToolNames ?? []));
  const narrow = (names: readonly string[]) => names.filter((name) =>
    (allowed === null || allowed.has(name)) && !blocked.has(name),
  );
  return {
    ...surface,
    explicitToolNames: narrow(surface.explicitToolNames),
    injectedToolNames: narrow(surface.injectedToolNames),
    finalToolNames: narrow(surface.finalToolNames),
  };
}

/** Request surface = requested ∩ profile ∩ backend execution capabilities.
 * Backend capabilities may cover only one namespace (e.g. workspace tools);
 * tools outside that scope remain routed by their own executors.
 * null backend means unrestricted host execution, not an empty capability set.
 * Inputs are already pack-expanded; this resolver never injects tools.
 */
export function resolveRequestToolSurface(args: {
  requestedToolNames: readonly string[];
  profile?: ToolSurfaceConstraints;
  backend: { toolNames: readonly string[]; scopedToolNames?: readonly string[] } | null;
}) {
  const normalize = (name: string) => canonicalizeToolName(name.trim().replace(/^functions\./i, ""));
  const names = (values: readonly string[]) => new Set(values.map(normalize));
  const allowed = args.profile?.allowedToolNames == null ? null : names(args.profile.allowedToolNames);
  const blocked = names(args.profile?.blockedToolNames ?? []);
  const supported = args.backend ? names(args.backend.toolNames) : null;
  const scope = args.backend?.scopedToolNames ? names(args.backend.scopedToolNames) : null;
  const filteredTools: Array<{
    toolName: string;
    reason: "profile-not-allowed" | "profile-blocked" | "backend-unsupported";
  }> = [];
  const finalToolNames = args.requestedToolNames.filter((toolName) => {
    const name = normalize(toolName);
    const reason = allowed && !allowed.has(name) ? "profile-not-allowed"
      : blocked.has(name) ? "profile-blocked"
      : supported && (!scope || scope.has(name)) && !supported.has(name) ? "backend-unsupported"
      : null;
    if (!reason) return true;
    filteredTools.push({ toolName, reason });
    return false;
  });
  return { finalToolNames, filteredTools };
}

export type RuntimeToolSurfaceInput = {
  explicitToolNames?: string[] | null;
  currentUserId?: string | null;
  agentOwnerId?: string | null;
  invocationVisibility?: RuntimeToolSurfaceVisibility;
  runtimeHost: RuntimeToolSurfaceHost;
  trustedPrivateInvocation?: boolean;
  injectPrivateDefaults?: boolean;
  defaultInjectedToolNames?: readonly string[] | null;
  additionalRequiredToolNames?: readonly string[] | null;
};

export type RuntimeToolSurfaceResult = RuntimeToolSurfaceNames & {
  auditReason:
    | "private-authenticated-defaults"
    | "explicit-only-public"
    | "explicit-only-anonymous"
    | "explicit-only-shared"
    | "explicit-only-missing-identity"
    | "explicit-only-owner-mismatch";
};

export type RuntimeToolSurfaceForAgentInput = {
  explicitToolNames?: string[] | null;
  currentUserId?: string | null;
  agentOwnerId?: string | null;
  agentKey?: string | null;
  isPublic?: boolean | null;
  sharingLevel?: string | null;
  runtimeHost: RuntimeToolSurfaceHost;
  trustedPrivateInvocation?: boolean;
  injectPrivateDefaults?: boolean;
  defaultInjectedToolNames?: readonly string[] | null;
  additionalRequiredToolNames?: readonly string[] | null;
};

function uniqueToolNames(values: readonly string[]) {
  return [...new Set(asTrimmedNonEmptyStringArray(values))];
}

function canInjectPrivateDefaults(args: RuntimeToolSurfaceInput) {
  if (!args.currentUserId) return false;
  if (args.invocationVisibility !== "private") return false;
  if (args.agentOwnerId && args.agentOwnerId === args.currentUserId) return true;
  if (args.trustedPrivateInvocation === true) return true;
  return false;
}

function explicitOnlyReason(
  args: RuntimeToolSurfaceInput
): RuntimeToolSurfaceResult["auditReason"] {
  if (!args.currentUserId || !args.agentOwnerId) {
    return "explicit-only-missing-identity";
  }
  if (args.invocationVisibility === "public") return "explicit-only-public";
  if (args.invocationVisibility === "shared") return "explicit-only-shared";
  if (args.agentOwnerId !== args.currentUserId) {
    return "explicit-only-owner-mismatch";
  }
  return "explicit-only-anonymous";
}

export function resolveRuntimeToolSurface(
  args: RuntimeToolSurfaceInput
): RuntimeToolSurfaceResult {
  const explicitToolNames = uniqueToolNames(args.explicitToolNames ?? []);

  if (canInjectPrivateDefaults(args)) {
    const baseInjected =
      args.injectPrivateDefaults === false
        ? (args.defaultInjectedToolNames ?? DEFAULT_SUBTASK_REFERENCE_NOLO_WORKSPACE_TOOLS)
        : (args.defaultInjectedToolNames ?? DEFAULT_PRIVATE_NOLO_WORKSPACE_TOOLS);
    const injectedToolNames = uniqueToolNames([
      ...baseInjected,
      ...(args.additionalRequiredToolNames ?? []),
    ]);
    return {
      explicitToolNames,
      injectedToolNames,
      finalToolNames: uniqueToolNames([
        ...explicitToolNames,
        ...injectedToolNames,
      ]),
      auditReason: "private-authenticated-defaults",
    };
  }

  const injectedToolNames = uniqueToolNames(args.additionalRequiredToolNames ?? []);
  return {
    explicitToolNames,
    injectedToolNames,
    finalToolNames: uniqueToolNames([
      ...explicitToolNames,
      ...injectedToolNames,
    ]),
    auditReason: explicitOnlyReason(args),
  };
}

export function isPublicRuntimeAgentRef(value: unknown) {
  return typeof value === "string" && value.startsWith("agent-pub-");
}

export function inferOwnerIdFromRuntimeAgentKey(value: unknown) {
  if (typeof value !== "string") return null;
  const privateAgentMatch = value.match(/^agent-([^-]+)-(.+)$/);
  if (privateAgentMatch && privateAgentMatch[1] !== "pub") {
    return privateAgentMatch[1];
  }
  return null;
}

export function resolveRuntimeToolSurfaceForAgent(
  args: RuntimeToolSurfaceForAgentInput
) {
  const agentKey = typeof args.agentKey === "string" ? args.agentKey : "";
  const currentUserId = typeof args.currentUserId === "string" ? args.currentUserId : "";
  const inferredOwnerId =
    args.agentOwnerId ??
    (currentUserId && isOwnedAgentKey(agentKey, currentUserId)
      ? currentUserId
      : inferOwnerIdFromRuntimeAgentKey(agentKey));
  const publicRef = isPublicRuntimeAgentRef(agentKey);
  const visibility =
    args.trustedPrivateInvocation === true
      ? "private"
      : publicRef || args.isPublic === true || args.sharingLevel === "public"
      ? "public"
      : "private";
  return resolveRuntimeToolSurface({
    explicitToolNames: args.explicitToolNames,
    currentUserId: args.currentUserId,
    agentOwnerId: inferredOwnerId,
    invocationVisibility: visibility,
    runtimeHost: args.runtimeHost,
    trustedPrivateInvocation: args.trustedPrivateInvocation,
    injectPrivateDefaults: args.injectPrivateDefaults,
    defaultInjectedToolNames: args.defaultInjectedToolNames,
    additionalRequiredToolNames: args.additionalRequiredToolNames,
  });
}

const SECRET_FIELD_NAMES = [
  "apikey",
  "api_key",
  "secret",
  "token",
  "authorization",
  "credential",
  "password",
];

function isSecretFieldName(key: string) {
  const normalized = key.toLowerCase();
  return SECRET_FIELD_NAMES.some((name) => normalized.includes(name));
}

export function redactAgentRecordForWorkspaceTool(record: unknown): unknown {
  if (Array.isArray(record)) return record.map(redactAgentRecordForWorkspaceTool);
  if (!isRecord(record)) return record;
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (isSecretFieldName(key)) {
      redacted[key] = "[redacted]";
      continue;
    }
    redacted[key] =
      Array.isArray(value) || isRecord(value)
        ? redactAgentRecordForWorkspaceTool(value)
        : value;
  }
  return redacted;
}
