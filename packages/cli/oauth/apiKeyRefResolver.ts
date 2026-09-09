import type { ApiKeyRefResolver } from "../../agent-runtime/providerResolution";
import {
  createOAuthTokenStore,
  isTokenExpired,
  resolveFreshAccessToken,
} from "./token-store";
import { refreshAntigravityOAuthToken } from "./flows/antigravity";
import { refreshOpenAiCodexToken } from "./flows/openai-codex";
import { anthropicRefresh, cursorRefresh, xaiRefresh } from "../../agent-runtime/oauthProviders";
import type { OAuthProvider, OAuthRefreshFn } from "./types";
import type { CredentialMigrationOptions } from "../../agent-runtime/credentialLocationMigration";

const REFRESH_BY_PROVIDER: Partial<Record<OAuthProvider, OAuthRefreshFn>> = {
  chatgpt: refreshOpenAiCodexToken,
  // Previously only chatgpt was wired; expired antigravity/xai tokens then
  // surfaced as "OAuth credential not found" even when `$NOLO_HOME/credentials` (or `~/.nolo/credentials` when `NOLO_HOME` is unset)
  // still held a valid refresh_token.
  antigravity: refreshAntigravityOAuthToken,
  xai: xaiRefresh,
  claude: anthropicRefresh,
  cursor: cursorRefresh,
};

function isOAuthProvider(value: string): value is OAuthProvider {
  return (
    value === "chatgpt" ||
    value === "xai" ||
    value === "antigravity" ||
    value === "claude" ||
    value === "cursor"
  );
}

export type CreateOAuthApiKeyRefResolverOptions = {
  homeDir?: string;
  migration?: CredentialMigrationOptions;
};

export function createOAuthApiKeyRefResolver(
  options: CreateOAuthApiKeyRefResolverOptions = {}
): ApiKeyRefResolver {
  return async (ref, opts) => {
    const provider = ref.trim();
    if (!isOAuthProvider(provider)) return null;
    const refresh = REFRESH_BY_PROVIDER[provider];
    const token = await resolveFreshAccessToken({
      provider,
      ...(options.homeDir ? { homeDir: options.homeDir } : {}),
      ...(options.migration ? { migration: options.migration } : {}),
      ...(refresh ? { refresh } : {}),
      ...(opts?.force ? { force: true } : {}),
    });
    if (token) return token;

    // Prefer a precise error over "not found" when the file exists but is stale.
    const store = createOAuthTokenStore(options.homeDir, options.migration);
    const credential = store.read(provider);
    if (credential && isTokenExpired(credential)) {
      throw new Error(
        `OAuth credential for "${provider}" is expired and could not be refreshed. Run \`nolo auth ${provider}\` (or \`nolo auth ${provider} --sync-to-server\` for server-side runs).`
      );
    }
    return null;
  };
}
