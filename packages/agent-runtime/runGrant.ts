import { isRecord } from "core/isRecord";
import { asNonEmptyStringArray } from "core/stringArray";
import { asOptionalTrimmedString } from "core/optionalString";
import type { AgentRunKind } from "./agentRunIsolation";
import { withinRoot } from "./executionLeaseValidation";
import { normalizeAgentRuntimeToolPolicy } from "./runtimeToolPolicy";
import type { AgentRuntimeToolPolicy, AgentRuntimeWorkspaceMode } from "./types";

export type AgentRunGrantTargetSource = "dialog" | "agent" | "client-default";
export type AgentRunGrantTriggerOrigin = "request" | "agent-delegation" | "automation";

export type AgentRunGrantMachinePermissionPolicy = {
  mode: "read_only" | "full_access";
  allowFilesystemRead: boolean;
  allowFilesystemWrite: boolean;
  allowShell: boolean;
  readableRoots: string[];
  writableRoots: string[];
};

export type AgentRunGrantWorkspaceScope = {
  mode?: AgentRuntimeWorkspaceMode;
  /**
   * "runtime-workspace" means the concrete roots are chosen by the execution
   * provider (for example connector cwd/worktree or a hosted lease).
   * "legacy-unscoped" is explicit technical debt: read authority exists but the
   * issuer could not express a bounded root. Sandboxed backends may reject it.
   */
  readScope: "none" | "runtime-workspace" | "configured-roots" | "legacy-unscoped";
  readableRoots: string[];
  writeScope: "none" | "runtime-workspace" | "configured-roots";
  writableRoots: string[];
  cwd?: string;
};

export type AgentRunGrant = {
  version: 1;
  grantId: string;
  issuedAt: number;
  agentKey: string;
  callerUserId?: string;
  trigger: {
    runKind: AgentRunKind;
    background: boolean;
    origin: AgentRunGrantTriggerOrigin;
  };
  target:
    | { kind: "server"; source: AgentRunGrantTargetSource }
    | {
        kind: "machine";
        machineId: string;
        source: AgentRunGrantTargetSource;
        connectorSurface?: string;
      };
  toolSurface: {
    finalToolNames: string[];
    allowedToolNames?: string[];
    blockedToolNames?: string[];
  };
  runtimeToolPolicy?: AgentRuntimeToolPolicy;
  workspace: AgentRunGrantWorkspaceScope;
  machine?: {
    machineId: string;
    permissionPolicy: AgentRunGrantMachinePermissionPolicy;
  };
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Intersect two root sets as directory subtrees: a root survives when it lies
 * inside some root of the other set. The result never reaches outside either
 * set (lexical check only; backends must still enforce realpaths/mounts).
 */
function intersectRoots(requested: string[], ceiling: string[]): string[] {
  return unique([
    ...requested.filter((root) => ceiling.some((cap) => withinRoot(cap, root))),
    ...ceiling.filter((cap) => requested.some((root) => withinRoot(root, cap))),
  ]);
}

function normalizePermissionPolicy(value: unknown): AgentRunGrantMachinePermissionPolicy | undefined {
  if (!isRecord(value)) return undefined;
  if (value.mode !== "read_only" && value.mode !== "full_access") return undefined;
  if (
    typeof value.allowFilesystemRead !== "boolean" ||
    typeof value.allowFilesystemWrite !== "boolean" ||
    typeof value.allowShell !== "boolean"
  ) {
    return undefined;
  }
  const mode = value.mode;
  return {
    mode,
    allowFilesystemRead: value.allowFilesystemRead,
    allowFilesystemWrite: mode === "full_access" && value.allowFilesystemWrite,
    allowShell: mode === "full_access" && value.allowShell,
    readableRoots: value.allowFilesystemRead ? unique(asNonEmptyStringArray(value.readableRoots)) : [],
    writableRoots: mode === "full_access" && value.allowFilesystemWrite
      ? unique(asNonEmptyStringArray(value.writableRoots)) : [],
  };
}

export function normalizeAgentRunGrant(value: unknown): AgentRunGrant | undefined {
  if (!isRecord(value) || value.version !== 1) return undefined;
  const grantId = asOptionalTrimmedString(value.grantId);
  const issuedAt =
    typeof value.issuedAt === "number" && Number.isFinite(value.issuedAt) && value.issuedAt > 0
      ? value.issuedAt
      : undefined;
  const agentKey = asOptionalTrimmedString(value.agentKey);
  const trigger = isRecord(value.trigger) ? value.trigger : undefined;
  const target = isRecord(value.target) ? value.target : undefined;
  const toolSurface = isRecord(value.toolSurface) ? value.toolSurface : undefined;
  const workspace = isRecord(value.workspace) ? value.workspace : undefined;
  if (!grantId || !issuedAt || !agentKey || !trigger || !target || !toolSurface || !workspace) return undefined;

  const runKind: AgentRunKind = trigger.runKind === "subtask" ? "subtask" : "interactive";
  const origin: AgentRunGrantTriggerOrigin =
    trigger.origin === "automation"
      ? "automation"
      : trigger.origin === "agent-delegation"
        ? "agent-delegation"
        : "request";
  const source: AgentRunGrantTargetSource =
    target.source === "dialog" || target.source === "agent" ? target.source : "client-default";
  const machineId = asOptionalTrimmedString(target.machineId);
  const connectorSurface = asOptionalTrimmedString(target.connectorSurface)?.toLowerCase();
  const normalizedTarget =
    target.kind === "machine" && machineId
      ? ({
          kind: "machine",
          machineId,
          source,
          ...(connectorSurface ? { connectorSurface } : {}),
        } as const)
      : target.kind === "server"
        ? ({ kind: "server", source } as const)
        : undefined;
  if (!normalizedTarget) return undefined;

  const rawPolicy = normalizeAgentRuntimeToolPolicy(value.runtimeToolPolicy);
  // Distinguish "machine authority not provided" from "provided but invalid".
  // A present-but-malformed machine block / permissionPolicy (non-object,
  // missing or non-boolean flags, unknown mode) must never fall through to
  // the no-policy compatibility branch, which would re-open read/write.
  // Rejecting the whole grant is the most conservative choice and is
  // compatible with callers, which already treat undefined as "no grant".
  // Server grants that omit `machine` entirely are unchanged.
  if (value.machine !== undefined) {
    if (!isRecord(value.machine)) return undefined;
    if (!normalizePermissionPolicy(value.machine.permissionPolicy)) return undefined;
  }
  // A machine target must carry a valid machine permission block bound to the
  // same machineId. A missing/undefined block or a mismatched/missing
  // machine.machineId would otherwise fall through to the no-policy branch
  // and keep workspace read/write authority on an unpoliced machine.
  if (normalizedTarget.kind === "machine") {
    if (
      !isRecord(value.machine) ||
      asOptionalTrimmedString(value.machine.machineId) !== normalizedTarget.machineId
    ) {
      return undefined;
    }
  }
  const rawMachine = isRecord(value.machine) ? value.machine : undefined;
  const permissionPolicy = normalizePermissionPolicy(rawMachine?.permissionPolicy);
  const rawMachineId = asOptionalTrimmedString(rawMachine?.machineId);
  const machine =
    normalizedTarget.kind === "machine" &&
    rawMachineId === normalizedTarget.machineId &&
    permissionPolicy
      ? {
          machineId: rawMachineId,
          permissionPolicy,
        }
      : undefined;

  const mode =
    workspace.mode === "current" || workspace.mode === "lease" || workspace.mode === "none"
      ? workspace.mode
      : undefined;
  const readableRoots = unique(asNonEmptyStringArray(workspace.readableRoots));
  const writableRoots = unique(asNonEmptyStringArray(workspace.writableRoots));
  const explicitReadScope =
    workspace.readScope === "runtime-workspace"
      ? "runtime-workspace"
      : workspace.readScope === "configured-roots" && readableRoots.length > 0
        ? "configured-roots"
        : workspace.readScope === "legacy-unscoped"
          ? "legacy-unscoped"
          : workspace.readScope === "none"
            ? "none"
            : undefined;
  const requestedWriteScope =
    workspace.writeScope === "runtime-workspace"
      ? "runtime-workspace"
      : workspace.writeScope === "configured-roots" && writableRoots.length > 0
        ? "configured-roots"
        : "none";

  // The machine permission policy (when present and bound to the target
  // machine) is an upper bound on workspace authority, never a suggestion:
  // - allowFilesystemRead/Write !== true forces the scope to "none", even if
  //   the workspace names an explicit scope.
  // - Non-empty policy roots keep the scope bounded ("configured-roots"):
  //   explicit workspace roots are intersected with the policy roots, and
  //   runtime-workspace / legacy-unscoped / derived scopes are replaced by the
  //   policy roots themselves (the provider-chosen runtime workspace cannot be
  //   proven to lie inside the policy, so the owner-declared ceiling is used).
  //   An empty intersection fails closed to "none".
  // - Empty policy roots carry no bound, so the workspace scope is kept.
  const policy = permissionPolicy;
  let readScope: AgentRunGrantWorkspaceScope["readScope"];
  let effectiveReadableRoots: string[];
  if (policy && policy.allowFilesystemRead !== true) {
    readScope = "none";
    effectiveReadableRoots = [];
  } else if (policy && policy.readableRoots.length > 0 && explicitReadScope !== "none") {
    effectiveReadableRoots =
      readableRoots.length > 0 &&
      (explicitReadScope === "configured-roots" || explicitReadScope === undefined)
        ? intersectRoots(readableRoots, policy.readableRoots)
        : [...policy.readableRoots];
    readScope = effectiveReadableRoots.length > 0 ? "configured-roots" : "none";
  } else {
    readScope =
      explicitReadScope ??
      (policy?.allowFilesystemRead
        ? readableRoots.length > 0
          ? "configured-roots"
          : "legacy-unscoped"
        : "none");
    effectiveReadableRoots = readScope === "configured-roots" ? readableRoots : [];
  }

  let writeScope: AgentRunGrantWorkspaceScope["writeScope"];
  let effectiveWritableRoots: string[];
  if (policy && policy.allowFilesystemWrite !== true) {
    writeScope = "none";
    effectiveWritableRoots = [];
  } else if (policy && policy.writableRoots.length > 0 && requestedWriteScope !== "none") {
    effectiveWritableRoots =
      requestedWriteScope === "configured-roots"
        ? intersectRoots(writableRoots, policy.writableRoots)
        : [...policy.writableRoots];
    writeScope = effectiveWritableRoots.length > 0 ? "configured-roots" : "none";
  } else {
    writeScope = requestedWriteScope;
    effectiveWritableRoots = writeScope === "configured-roots" ? writableRoots : [];
  }
  const cwd = asOptionalTrimmedString(workspace.cwd);
  const callerUserId = asOptionalTrimmedString(value.callerUserId);

  return {
    version: 1,
    grantId,
    issuedAt,
    agentKey,
    ...(callerUserId ? { callerUserId } : {}),
    trigger: {
      runKind,
      background: trigger.background === true,
      origin,
    },
    target: normalizedTarget,
    toolSurface: {
      finalToolNames: unique(asNonEmptyStringArray(toolSurface.finalToolNames)),
      ...(asNonEmptyStringArray(toolSurface.allowedToolNames).length
        ? { allowedToolNames: unique(asNonEmptyStringArray(toolSurface.allowedToolNames)) }
        : {}),
      ...(asNonEmptyStringArray(toolSurface.blockedToolNames).length
        ? { blockedToolNames: unique(asNonEmptyStringArray(toolSurface.blockedToolNames)) }
        : {}),
    },
    ...(rawPolicy ? { runtimeToolPolicy: rawPolicy } : {}),
    workspace: {
      ...(mode ? { mode } : {}),
      readScope,
      readableRoots: effectiveReadableRoots,
      writeScope,
      writableRoots: effectiveWritableRoots,
      ...(cwd ? { cwd } : {}),
    },
    ...(machine ? { machine } : {}),
  };
}
