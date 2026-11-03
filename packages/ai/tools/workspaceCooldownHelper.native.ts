/**
 * React Native workspace credential cooldown loader.
 * In native environments (iOS / Android), host filesystem cooldowns do not exist.
 * Agent availability status is driven by server/data state without touching Node built-ins.
 */
export type LocalCooldownState = {
  localCooldowns: Record<string, number>;
  resolveCooldownFn?: (
    key: string | undefined,
    map: Record<string, number>,
    now?: number
  ) => number | undefined;
};

export async function loadWorkspaceCredentialCooldowns(
  _env?: unknown,
  _now?: number
): Promise<LocalCooldownState> {
  // Mobile RN: host file cooldowns are not applicable.
  // Returns empty cooldowns so availability is resolved strictly via server records.
  return { localCooldowns: {} };
}
