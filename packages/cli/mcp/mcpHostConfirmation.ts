import { getHostApprovalRenderer, type HostApprovalContext, type HostApprovalResult } from "../client/hostApprovalFlow";
import type { McpExecutionBridgeDependencies } from "../../agent-runtime/mcpExecutionBridge";

/**
 * Existing host renderer presents only; oneShotApproval remains the execution authority.
 *
 * The renderer is read per call from the late-bound registry `registerHostApprovalRenderer()`
 * (installed by the TUI at session start). Background children inject the inherited IPC
 * confirmation callback instead; only the parent reads this renderer registry.
 *
 * The three answers are deliberately distinct:
 *  - `approve`      — this exact invocation was allowed once, in time;
 *  - `deny`         — a human said no, or the card expired / the run was cancelled: an answer existed;
 *  - `unavailable`  — nobody could be asked at all (headless/background run with no renderer, or the
 *                     renderer failed). Never silently upgraded to approve; the caller reports
 *                     `approval_unavailable` instead of pretending the user refused.
 */
export const confirmMcpOnHost = async (preview: Parameters<McpExecutionBridgeDependencies["confirm"]>[0], signal: AbortSignal, context: Pick<HostApprovalContext, "runId" | "requestId"> = {}): ReturnType<McpExecutionBridgeDependencies["confirm"]> => {
  const render = getHostApprovalRenderer();
  if (!render) return "unavailable";
  if (signal.aborted) return "deny";
  let decision: HostApprovalResult;
  try {
    decision = await render({ approvalId: crypto.randomUUID(), actionLabel: "callMcpTool",
      origin: preview.binding.placement.kind, target: preview.binding.toolName,
      summary: JSON.stringify({ connectionId: preview.binding.connectionId, revision: preview.binding.connectionRevision, arguments: preview.arguments }, null, 2),
      expiresAt: preview.expiresAt }, { signal, expiresAt: preview.expiresAt, dialogId: preview.binding.dialogId,
        requestId: context.requestId ?? crypto.randomUUID(), runId: context.runId });
  } catch {
    // The host could not deliver an answer (renderer crash): that is "no channel", not a refusal.
    return "unavailable";
  }
  if (decision === "unavailable") return "unavailable";
  return !signal.aborted && Date.now() < preview.expiresAt && decision === "allow_once" ? "approve" : "deny";
};
