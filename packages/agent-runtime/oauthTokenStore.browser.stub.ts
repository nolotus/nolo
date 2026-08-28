/**
 * Browser stub for OAuth token file store. Webview cannot read ~/.nolo/credentials.
 * Real OAuth resolution for desktop host uses the Node/Bun implementation.
 */

export type OAuthProvider =
  | "chatgpt"
  | "xai"
  | "antigravity"
  | "claude"
  | "cloudflare";

export type OAuthCredential = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
  metadata?: Record<string, unknown>;
};

export type OAuthRefreshFn = (
  credential: OAuthCredential,
) => Promise<OAuthCredential | null>;

export function getCredentialsDir(_homeDir?: string): string {
  return "/browser-credentials-unavailable";
}

export function readOAuthCredential(
  _provider: OAuthProvider,
): OAuthCredential | null {
  return null;
}

export function writeOAuthCredential(
  _provider: OAuthProvider,
  _credential: OAuthCredential,
): void {
  throw new Error("oauthTokenStore.writeOAuthCredential is not available in browser");
}

export function deleteOAuthCredential(_provider: OAuthProvider): void {
  // no-op
}

export async function resolveFreshAccessToken(
  _provider: OAuthProvider,
  _refresh?: OAuthRefreshFn,
): Promise<string | null> {
  return null;
}
