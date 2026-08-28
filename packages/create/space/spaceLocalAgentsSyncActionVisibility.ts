/**
 * Pure visibility for Space Settings "sync local Agents in this Space".
 * Existing-account Space reconciliation only — not device-local Space create/map.
 */
import { asTrimmedString } from "core/trimmedString";

export type SpaceLocalAgentsSyncActionVisibility =
  | { kind: "hidden" }
  | { kind: "sync" };

/**
 * Show the entry only for an active non-local account that owns a writable Space.
 * Does not inspect catalog contents (that is preflight's job after click).
 */
export function resolveSpaceLocalAgentsSyncActionVisibility(input: {
  accountUserId: string | null | undefined;
  isLoggedIn: boolean;
  spaceOwnerId: string | null | undefined;
}): SpaceLocalAgentsSyncActionVisibility {
  const account = asTrimmedString(input.accountUserId);
  const owner = asTrimmedString(input.spaceOwnerId);
  const activeNonLocalAccount =
    input.isLoggedIn === true && account.length > 0 && account !== "local";

  if (!activeNonLocalAccount) {
    return { kind: "hidden" };
  }
  if (!owner || owner !== account) {
    return { kind: "hidden" };
  }
  return { kind: "sync" };
}
