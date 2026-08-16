/**
 * Pure visibility rules for Agent "sync to Nolo account" action.
 * Platform-neutral (Web/Desktop/RN). Agent-first: only device-local Agents
 * while a non-local account is active.
 */
import { asTrimmedString } from "core/trimmedString";
import { isDeviceLocalDbKey } from "database/authority/deviceLocal";

export type AgentSyncActionVisibility =
  | { kind: "hidden" }
  | { kind: "sync" }
  | { kind: "synced" };

export function resolveAgentSyncActionVisibility(input: {
  agentKey: string;
  accountUserId: string | null | undefined;
  isLoggedIn: boolean;
  /** True when a durable mapping exists for (agentKey, active account). */
  mappedToActiveAccount: boolean;
}): AgentSyncActionVisibility {
  const account = asTrimmedString(input.accountUserId);
  const activeNonLocalAccount =
    input.isLoggedIn === true && account.length > 0 && account !== "local";

  if (!activeNonLocalAccount) {
    return { kind: "hidden" };
  }
  if (!isDeviceLocalDbKey(input.agentKey)) {
    return { kind: "hidden" };
  }
  if (input.mappedToActiveAccount) {
    return { kind: "synced" };
  }
  return { kind: "sync" };
}
