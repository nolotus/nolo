/**
 * Browser stub for the scoped OAuth token store.
 *
 * Same rationale as `oauthTokenStore.browser.stub.ts`: webview cannot read
 * `$NOLO_HOME/credentials/accounts/...`. Real scoped-credential resolution on
 * the desktop host uses the Node/Bun implementation.
 *
 * `canonicalizeOrigin` / `resolveAccountScope` live in `accountScopeContext.ts`
 * and are pure — this stub only has to cover the file-backed store surface so
 * esbuild's `oauthTokenStore` redirect keeps a coherent type surface.
 */

import type { OAuthCredential, OAuthProvider } from "./oauthTokenStore";
import type { AccountScope } from "./accountScopeContext";
import type {
  CasWriteResult,
  ScopedOAuthCredentialFile,
  ScopedOAuthCredentialFileWritten,
  ScopedOAuthTokenStore,
  ScopedStoreReadResult,
} from "./scopedOAuthTokenStore";

export const SCOPED_CREDENTIAL_SCHEMA_VERSION = 2 as const;
export const DEFAULT_SLOT = "default";

export function getScopedAccountsDir(_homeDir?: string): string {
  return "/browser-credentials-unavailable";
}

export function getScopedCredentialDir(_scope: AccountScope, _homeDir?: string): string {
  return "/browser-credentials-unavailable";
}

export function getScopedCredentialPath(
  _scope: AccountScope,
  _provider: OAuthProvider,
  _homeDir?: string,
  _slot?: string,
): string {
  return "/browser-credentials-unavailable";
}

export function ownerForScope(
  scope: AccountScope,
):
  | { kind: "nolo-account"; serverOrigin: string; userId: string }
  | { kind: "local-unbound" } {
  return scope.kind === "nolo-account"
    ? { kind: "nolo-account", serverOrigin: scope.canonicalOrigin, userId: scope.userId }
    : { kind: "local-unbound" };
}

export function createScopedOAuthTokenStore(_args: {
  scope: AccountScope;
  homeDir?: string;
}): ScopedOAuthTokenStore {
  const scope = _args.scope;
  return {
    scope,
    read(): ScopedStoreReadResult {
      return { status: "missing" };
    },
    writeAuthoritative(): ScopedOAuthCredentialFileWritten {
      throw new Error("scopedOAuthTokenStore.writeAuthoritative is not available in browser");
    },
    writeCas(): CasWriteResult {
      throw new Error("scopedOAuthTokenStore.writeCas is not available in browser");
    },
    remove(): void {
      throw new Error("scopedOAuthTokenStore.remove is not available in browser");
    },
    withScopedLock(): never {
      throw new Error("scopedOAuthTokenStore.withScopedLock is not available in browser");
    },
  };
}
