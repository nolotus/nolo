import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  getAgentRuns,
  getAgentRunsVersion,
  tickAgentRuns,
  subscribeAgentRuns,
  getAgentRunElapsedMs,
  type AgentRunScope,
  type AgentRunEvent,
  applyAgentRunEvent,
} from "./agentRunStore";

export function useAgentRuns(scope?: AgentRunScope) {
  const getSnapshot = useCallback(() => getAgentRunsVersion(), []);
  useSyncExternalStore(subscribeAgentRuns, getSnapshot, getSnapshot);
  const snapshot = getAgentRuns(scope);
  useEffect(() => {
    const timer = setInterval(tickAgentRuns, 1000);
    return () => clearInterval(timer);
  }, []);
  // Scope filtering is also applied at render time so an event received before
  // the current dialog changed can never leak into another dialog.
  return snapshot.map((run) => ({ ...run, elapsedMs: getAgentRunElapsedMs(run) }));
}

/** SSE integration seam; the transport only needs to pass parsed events here. */
export function applyAgentRunEventFromStream(event: AgentRunEvent, scope: AgentRunScope) {
  return applyAgentRunEvent(event, scope);
}
