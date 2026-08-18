import { toErrorMessage } from "core/errorMessage";
import type { AgentRuntimeDecision } from "../../agent-runtime";

export type DesktopAgentRuntimeReadinessStatus =
  | {
      ok: true;
      host: "desktop";
      providerRuntimeState: "unconfigured" | "stopped" | "running" | "error" | "starting";
      localCapabilities: string[];
      decision: AgentRuntimeDecision;
      missingLocalCapabilities: string[];
    }
  | {
      ok: false;
      error: string;
    };

type FetchDesktopAgentRuntimeStatusArgs = {
  fetchImpl?: typeof fetch;
};

export async function fetchDesktopAgentRuntimeStatus({
  fetchImpl = fetch,
}: FetchDesktopAgentRuntimeStatusArgs = {}): Promise<DesktopAgentRuntimeReadinessStatus> {
  try {
    const response = await fetchImpl("/api/desktop/agent-runtime/status", {
      method: "GET",
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      return {
        ok: false,
        error: typeof data?.error === "string" ? data.error : "Failed to load desktop agent runtime status",
      };
    }
    return data as DesktopAgentRuntimeReadinessStatus;
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error),
    };
  }
}
