import { getHostApprovalRenderer } from "../client/hostApprovalFlow";
import type { McpExecutionBridgeDependencies } from "../../agent-runtime/mcpExecutionBridge";

/** Existing host renderer presents only; oneShotApproval remains the execution authority. */
export const confirmMcpOnHost: McpExecutionBridgeDependencies["confirm"] = async (preview, signal) => {
  const render = getHostApprovalRenderer();
  if (!render || signal.aborted) return "deny";
  const decision = await render({ approvalId: crypto.randomUUID(), actionLabel: "callMcpTool",
    origin: preview.binding.placement.kind, target: preview.binding.toolName,
    summary: JSON.stringify({ connectionId: preview.binding.connectionId, revision: preview.binding.connectionRevision, arguments: preview.arguments }, null, 2),
    expiresAt: preview.expiresAt });
  return !signal.aborted && Date.now() < preview.expiresAt && decision === "allow_once" ? "approve" : "deny";
};
