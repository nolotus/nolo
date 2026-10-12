import type {
  AgentRunGrant,
  AgentRunGrantWorkspaceScope,
} from "./runGrant";
import type { AgentRuntimeIsolationPolicy } from "./types";

export type ExecutionClass = "oneshot" | "session" | "service";

export type ExecutionFilesystemAuthority = {
  readScope: AgentRunGrantWorkspaceScope["readScope"];
  readableRoots: string[];
  writeScope: AgentRunGrantWorkspaceScope["writeScope"];
  writableRoots: string[];
};

export type ExecutionTicket = {
  version: 1;
  ticketId: string;
  grantId: string;
  issuedAt: number;
  agentKey: string;
  callerUserId?: string;
  executionClass: ExecutionClass;
  target:
    | { kind: "server" }
    | { kind: "machine"; machineId: string; connectorSurface?: string };
  toolNames: string[];
  filesystem: ExecutionFilesystemAuthority;
  shellAllowed: boolean;
  requestedIsolation: NonNullable<AgentRuntimeIsolationPolicy["mode"]>;
  maxRunSeconds?: number;
};

/** Backend-neutral observation of an execution capability after placement.
 * Path containment does not constitute OS sandboxing. A denied capability
 * has backendId=null and is never represented as a successful lease.
 */
export type ExecutionCapabilityRealization = {
  backendId: string | null;
  effectiveIsolation:
    | "none"
    | "workspace-guard"
    | "full-host"
    | "os-sandbox"
    | "container"
    | "vm";
  degraded: boolean;
  reason?: string;
};

export type ExecutionBackendCapabilities = {
  executionClasses: ExecutionClass[];
  streamingExec: boolean;
  filesystem: boolean;
  persistentFilesystem: boolean;
  processSignals: boolean;
  inboundPorts: boolean;
  networkPolicy: boolean;
  snapshots: boolean;
  gpu: boolean;
  isolationModes: Array<NonNullable<AgentRuntimeIsolationPolicy["mode"]>>;
};

/** Runtime and type consumers share the same placement-kind vocabulary. */
export const EXECUTION_BACKEND_KINDS = [
  "full-host",
  "hosted-workspace",
  "machine-connector",
  "local-sandbox",
  "remote-executor",
  "cloud",
] as const;

export type ExecutionBackendDescriptor = {
  id: string;
  kind: (typeof EXECUTION_BACKEND_KINDS)[number];
  capabilities: ExecutionBackendCapabilities;
};

export type ExecutionLease = {
  leaseId: string;
  backendId: string;
  ticketId: string;
  grantId: string;
  createdAt: number;
  workspaceRoot?: string;
  readableRoots: string[];
  writableRoots: string[];
  metadata?: Record<string, unknown>;
};

export type ExecutionRequest =
  | {
      kind: "command";
      argv: string[];
      cwd?: string;
      env?: Record<string, string>;
      stdin?: string;
      timeoutMs?: number;
    }
  | {
      kind: "tool";
      toolName: string;
      input: unknown;
    };

export type ExecutionEvent =
  | { type: "started"; executionId: string; at: number }
  | { type: "stdout"; executionId: string; chunk: string; seq: number }
  | { type: "stderr"; executionId: string; chunk: string; seq: number }
  | {
      type: "usage";
      executionId: string;
      usage: {
        wallMs?: number;
        cpuMs?: number;
        peakMemoryBytes?: number;
        networkIngressBytes?: number;
        networkEgressBytes?: number;
      };
    }
  | { type: "exited"; executionId: string; exitCode: number | null; signal?: string };

export type ExecutionResult = {
  executionId: string;
  ok: boolean;
  exitCode?: number | null;
  output?: unknown;
  artifacts?: unknown;
};

export type ExecutionReleaseReason =
  | "completed"
  | "cancelled"
  | "failed"
  | "expired"
  | "backend-shutdown";

export interface ExecutionBackend {
  describe(): ExecutionBackendDescriptor;
  prepare(ticket: ExecutionTicket): Promise<ExecutionLease>;
  execute(
    lease: ExecutionLease,
    request: ExecutionRequest,
    onEvent?: (event: ExecutionEvent) => void,
  ): Promise<ExecutionResult>;
  release(
    lease: ExecutionLease,
    reason: ExecutionReleaseReason,
  ): Promise<void>;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Compile one immutable RunGrant into the provider-neutral ticket consumed by
 * execution backends. Backends may narrow the ticket, but must not consult
 * durable Agent configuration to widen it.
 */
export function buildExecutionTicket(args: {
  runGrant: AgentRunGrant;
  ticketId: string;
  executionClass?: ExecutionClass;
}): ExecutionTicket {
  const { runGrant } = args;
  const target =
    runGrant.target.kind === "machine"
      ? {
          kind: "machine" as const,
          machineId: runGrant.target.machineId,
          ...(runGrant.target.connectorSurface
            ? { connectorSurface: runGrant.target.connectorSurface }
            : {}),
        }
      : { kind: "server" as const };

  const shellAllowed =
    runGrant.toolSurface.finalToolNames.includes("execShell") &&
    runGrant.workspace.readScope !== "none" &&
    runGrant.workspace.writeScope !== "none" &&
    (runGrant.target.kind !== "machine" ||
      runGrant.machine?.permissionPolicy.allowShell === true);

  const maxRunSeconds = runGrant.runtimeToolPolicy?.budget?.maxRunSeconds;

  return {
    version: 1,
    ticketId: args.ticketId,
    grantId: runGrant.grantId,
    issuedAt: runGrant.issuedAt,
    agentKey: runGrant.agentKey,
    ...(runGrant.callerUserId ? { callerUserId: runGrant.callerUserId } : {}),
    executionClass: args.executionClass ?? "session",
    target,
    toolNames: unique(runGrant.toolSurface.finalToolNames),
    filesystem: {
      readScope: runGrant.workspace.readScope,
      readableRoots: [...runGrant.workspace.readableRoots],
      writeScope: runGrant.workspace.writeScope,
      writableRoots: [...runGrant.workspace.writableRoots],
    },
    shellAllowed,
    requestedIsolation:
      runGrant.runtimeToolPolicy?.isolation?.mode ?? "none",
    ...(typeof maxRunSeconds === "number" &&
    Number.isFinite(maxRunSeconds) &&
    maxRunSeconds > 0
      ? { maxRunSeconds }
      : {}),
  };
}

export function executionBackendCanSatisfy(
  backend: ExecutionBackendDescriptor,
  ticket: ExecutionTicket,
): boolean {
  if (!backend.capabilities.executionClasses.includes(ticket.executionClass)) {
    return false;
  }
  if (!backend.capabilities.isolationModes.includes(ticket.requestedIsolation)) {
    return false;
  }
  // A connector for a specific user machine cannot realize server work,
  // and server-local adapters cannot opportunistically execute machine work.
  // Remote/cloud schedulers will need an explicit placement contract later.
  if (backend.kind === "machine-connector" && ticket.target.kind !== "machine") {
    return false;
  }
  if (
    ticket.target.kind === "machine" &&
    (backend.kind === "full-host" ||
      backend.kind === "hosted-workspace" ||
      backend.kind === "local-sandbox")
  ) {
    return false;
  }
  // Unbounded legacy reads must never be interpreted as a bounded mount.
  // Fail closed: only the explicit Full Host compatibility backend may
  // accept legacy-unscoped authority (and the adapter must record the
  // downgrade). Every other kind — local-sandbox, hosted-workspace,
  // remote-executor, cloud, machine-connector, or any unknown future kind —
  // is rejected until it has its own explicit unbounded-read contract.
  if (
    ticket.filesystem.readScope === "legacy-unscoped" &&
    backend.kind !== "full-host"
  ) {
    return false;
  }
  const needsFilesystem =
    ticket.filesystem.readScope !== "none" ||
    ticket.filesystem.writeScope !== "none";
  if (needsFilesystem && !backend.capabilities.filesystem) return false;
  return true;
}
