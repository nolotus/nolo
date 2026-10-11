import { isRecord } from "core/isRecord";
import { asNonEmptyStringArray } from "core/stringArray";
import { asOptionalTrimmedString } from "core/optionalString";
import type { AgentRunKind } from "./agentRunIsolation";
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
  const readScope =
    explicitReadScope ??
    (permissionPolicy?.allowFilesystemRead
      ? readableRoots.length > 0
        ? "configured-roots"
        : "legacy-unscoped"
      : "none");
  const writeScope =
    workspace.writeScope === "runtime-workspace"
      ? "runtime-workspace"
      : workspace.writeScope === "configured-roots" && writableRoots.length > 0
        ? "configured-roots"
        : "none";
  const effectiveReadableRoots =
    readScope === "configured-roots" ? readableRoots : [];
  const effectiveWritableRoots =
    writeScope === "configured-roots" ? writableRoots : [];
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
