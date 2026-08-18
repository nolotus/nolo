import { extractUserId } from "core/prefix";
import { isSystemAdmin } from "core/init";

import { useUserId } from "./useIdentity";

/**
 * Pure decision for "can this user edit the record behind dbKey?".
 *
 * Public platform agents (agent-pub-*) are owned by the platform (system
 * user), never by a regular user — and not even by the system admin through
 * this hook. Rendering the per-agent grant/edit panel for them would call the
 * grants API as a non-owner and surface an error (400 missing owner / 403 not
 * owner). Grant management for public agents is out of scope here; the panel
 * must not render, so this returns false for every agent-pub-* key.
 */
export function resolveCouldEdit(
  dbKey: string | undefined,
  currentUserId: string | undefined,
): boolean {
  if (!dbKey) return false;

  if (dbKey.startsWith("agent-pub-")) return false;

  const dataUserId = extractUserId(dbKey);

  if (isSystemAdmin(currentUserId)) return true;
  if (!dataUserId || !currentUserId) return false;

  return dataUserId === currentUserId;
}

export const useCouldEdit = (dbKey?: string) => {
  const currentUserId = useUserId();
  return resolveCouldEdit(dbKey, currentUserId);
};
