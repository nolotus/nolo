/**
 * Host/Server workspace credential cooldown loader.
 * Loads local cooldown state from agent-runtime/credentialAvailability when running
 * in host runtime (CLI / Desktop / Server), with fail-open fallback for web/non-node environments.
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
  env: NodeJS.ProcessEnv = process.env,
  now: number = Date.now()
): Promise<LocalCooldownState> {
  let localCooldowns: Record<string, number> = {};
  let resolveCooldownFn:
    | ((
        key: string | undefined,
        map: Record<string, number>,
        now?: number
      ) => number | undefined)
    | undefined;

  try {
    const credModulePath = "../../agent-runtime/credentialAvailability";
    const credMod: any = await import(credModulePath);
    if (
      credMod?.readCredentialAvailability &&
      credMod?.resolveEffectiveCredentialCooldown
    ) {
      localCooldowns = await credMod
        .readCredentialAvailability(env, now)
        .catch(() => ({}));
      resolveCooldownFn = credMod.resolveEffectiveCredentialCooldown;
    }
  } catch {
    // 浏览器环境或 import 失败时跳过合并，保持 fail-open（以云端记录为准）
  }

  return { localCooldowns, resolveCooldownFn };
}
