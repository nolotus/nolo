import type { AgentRuntimeAgentConfig } from "../../agent-runtime/hostAdapter";
import { asOptionalTrimmedString } from "core/optionalString";
import type {
  ShellApprovalHost,
  ShellApprovalSession,
} from "./originShellApprovalTransport";

/** Resolve identity only from the trusted store projection, never caller/model fields. */
export function createChildShellApprovalHostResolver(args: {
  readAgentConfig(agentKey: string): Promise<AgentRuntimeAgentConfig | null>;
  resolveDeviceId(): Promise<unknown>;
  workspaceRoot: string;
  session: ShellApprovalSession;
}): (agentKey: string) => Promise<ShellApprovalHost | undefined> {
  return async (agentKey) => {
    const config = await args.readAgentConfig(agentKey);
    // readAgentFromStore returns a runtime config; owner fields live in rawRecord.
    const record = config?.rawRecord;
    const ownerUserId = asOptionalTrimmedString(record?.userId)
      ?? asOptionalTrimmedString(record?.ownerUserId);
    if (!ownerUserId) return undefined;
    const deviceId = asOptionalTrimmedString(await args.resolveDeviceId());
    if (!deviceId) return undefined;
    return {
      binding: {
        runId: "pending-spawn",
        agentKey,
        ownerUserId,
        deviceId,
        workspaceRoot: args.workspaceRoot,
      },
      confirm: args.session.confirm,
      signal: args.session.signal,
    };
  };
}
