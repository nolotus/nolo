import { readdirSync } from "node:fs";
import { getCredentialsDir } from "../../agent-runtime/oauthTokenStore";
import { resolvePlatformAuthToken } from "../../agent-runtime/providerResolution";

type EnvLike = Record<string, string | undefined>;

/**
 * Local model/OAuth credentials live as one `<provider>.json` per provider under
 * the nolo credentials dir. `getCredentialsDir` is the single source of truth
 * for that location ($NOLO_HOME/credentials, or ~/.nolo/credentials when
 * NOLO_HOME is unset) — do not hand-join the path here.
 *
 * Returns the provider basenames found (file stem, sorted). A missing / unreadable
 * dir yields an empty list, which is the "no local credentials" signal. The
 * `keys/` subdirectory that fileCredentialBroker uses is a *directory*, so it is
 * naturally excluded by the `.json` suffix filter — no risk of miscounting it.
 */
export function listLocalCredentialProviders(): string[] {
  try {
    return readdirSync(getCredentialsDir(), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.slice(0, -".json".length))
      .filter((name) => name.length > 0)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Single truth table behind the unauthenticated guidance surfaces (welcome
 * block, AUTH_NO_TOKEN failure copy, `nolo doctor` auth line).
 *
 * `platform` — a Nolo platform bearer is resolvable (profile token or an env
 *   var `resolvePlatformAuthToken` reads). Platform chat/agent/doc/space work.
 * `local`   — at least one `$NOLO_HOME/credentials/<provider>.json` exists, so
 *   `nolo run` / `nolo auth <provider>` has a usable local model.
 * `guidanceNeeded` — neither path is configured. This is the ONLY state in
 *   which we show the three-path guidance: a user with either platform login or
 *   a local credential already has a working setup and must not be nagged.
 */
export function resolveAuthGuidanceState(env: EnvLike): {
  platformLoggedIn: boolean;
  localProviders: string[];
  guidanceNeeded: boolean;
} {
  const platformLoggedIn = Boolean(resolvePlatformAuthToken(env));
  const localProviders = listLocalCredentialProviders();
  return {
    platformLoggedIn,
    localProviders,
    guidanceNeeded: !platformLoggedIn && localProviders.length === 0,
  };
}
