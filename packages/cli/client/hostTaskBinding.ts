import { resolve } from "node:path";
import type { AgentRuntimeHostAdapter } from "../../agent-runtime/hostAdapter";
import { evaluateTaskExecutionContract, type BusinessCompletion, type TaskExecutionContract } from "../../agent-runtime/taskExecutionContract";
import { hostTaskEventsRoot, readHostTask, unknownTaskCompletion, type HostTaskReference, type HostTaskResolution } from "./hostTaskEvents";

/** Host-only opt-in. Returning no verified snapshot fails closed, not completed.
 * Account review admission alone is NOT a development completion evidence source.
 * The full implementation/commit/merge producer is not wired in production yet;
 * taskProgressEvidence remains an unintegrated module, not an active completion gate.
 */
export type HostTaskCompletionEvidenceProvider = (contract: TaskExecutionContract) =>
  TaskExecutionContract | undefined | Promise<TaskExecutionContract | undefined>;

/** Only references cross the dispatch seam. Authority is loaded from host disk. */
export function bindHostTask(args: {
  adapter: AgentRuntimeHostAdapter;
  reference?: HostTaskReference;
  workspace: string;
  dialogId: string;
  env: Record<string, string | undefined>;
  signal?: AbortSignal;
  completionEvidenceProvider?: HostTaskCompletionEvidenceProvider;
}) {
  let latest: HostTaskResolution | undefined;
  let completion: BusinessCompletion | undefined;
  function load() {
    if (!args.reference) return undefined;
    if (resolve(args.reference.workspace) !== resolve(args.workspace) || args.reference.dialogId !== args.dialogId) {
      return { authorization: "unknown", reason: "scope_mismatch" } as const;
    }
    return readHostTask(hostTaskEventsRoot(args.env), args.reference);
  }
  latest = load();
  const contract: TaskExecutionContract | undefined = args.completionEvidenceProvider && latest && latest.authorization !== "unknown" ? latest.contract : undefined;
  const adapter: AgentRuntimeHostAdapter = !args.reference ? args.adapter : {
    ...args.adapter,
    // Re-read authority before each protected action. A review-only binding owns
    // typed review tools, not ordinary chat tools or their existing permission gates.
    // Explicit completion tasks retain their all-tool stop semantics; unknown scope
    // fails closed. Already running tools are not cancelled by this entry guard.
    executeTool: async (call, opts) => {
      latest = load();
      const authorization = latest?.authorization ?? "unknown";
      const protectedTool = call.name === "requestTaskReview" || call.name === "recordTaskReviewDecision";
      if (authorization !== "active" && (args.completionEvidenceProvider || protectedTool || authorization === "unknown")) {
        const code = authorization === "paused"
          ? "authorization_paused"
          : authorization === "revoked" ? "authorization_revoked" : "authorization_unknown";
        throw Object.assign(new Error(`host task authority ${authorization}: tool "${call.name}" was not executed`), { code });
      }
      return args.adapter.executeTool(call, opts);
    },
    saveTurn: async (input) => {
      latest = load();
      const stopped = args.signal?.aborted || input.result.businessCompletion?.reasons.includes("stopped");
      // Authorization/review records do not establish implementation completion.
      // Only an explicit trusted host producer may opt into business assessment.
      if (args.completionEvidenceProvider) {
        const snapshot = latest && latest.authorization !== "unknown" ? latest.contract : undefined;
        let evidence: TaskExecutionContract | undefined;
        try { evidence = snapshot ? await args.completionEvidenceProvider(snapshot) : undefined; }
        catch { /* Unavailable trusted evidence is not a successful assessment. */ }
        // Evidence collection may await IO; a concurrent pause/revoke still wins.
        latest = load();
        const current = latest && latest.authorization !== "unknown" ? latest.contract : undefined;
        completion = !current || !evidence || evidence.taskId !== current.taskId
          ? (stopped ? { taskId: args.reference!.taskId, status: "blocked", reasons: ["stopped"] } : unknownTaskCompletion(args.reference!.taskId))
          : evaluateTaskExecutionContract({ ...evidence, authorization: current.authorization }, {
              stopped,
              executionFailed: input.result.error === true || !!input.result.runtimeProviderFailure || !!input.result.emptyAssistantFallbackReason,
              budgetExhausted: input.result.businessCompletion?.reasons.includes("budget_exhausted"),
            });
      }
      const result = { ...input.result };
      delete result.businessCompletion;
      if (completion) result.businessCompletion = completion;
      try {
        return await args.adapter.saveTurn({ ...input, result });
      } catch (error) {
        // The assessment above was never persisted, so it must not be reported as a
        // success next to a failed save (exitCode 1 + completed). Downgrade first.
        if (args.completionEvidenceProvider) completion = { taskId: args.reference!.taskId, status: "blocked", reasons: ["execution_failed"] };
        throw error;
      }
    },
  };
  return {
    adapter, contract,
    result: (): { taskAuthorization?: HostTaskResolution["authorization"]; businessCompletion?: BusinessCompletion } => args.reference ? {
      taskAuthorization: latest?.authorization ?? "unknown",
      ...(args.completionEvidenceProvider ? { businessCompletion: completion ?? unknownTaskCompletion(args.reference.taskId) } : {}),
    } : {},
  };
}
