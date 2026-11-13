// Desktop edition store ↔ session binding (nolo-desktop condition).
//
// Mirrors the composition shape of storeSession.cloud.ts but with public-only
// seams: the session core/service is the SAME core/accountSession machinery
// the cloud edition uses — no second session abstraction — while the
// credential authority is the read-only /api/desktop/auth/session bootstrap
// (see session/desktopTokenManager.ts) and password sign-in fails closed
// (desktop sign-in uses the browser authorization controller). Anonymous initialization yields an initialized empty session —
// never a hard failure and never a fabricated cloud login.
import {
  composeAccountSessionRuntime,
  createAccountSessionCore,
} from "core/accountSession";
import type { TokenManager } from "identity/authTypes";
import type {
  AccountSessionService,
  AccountSessionSnapshot,
} from "identity/types";
import {
  registerStoreSessionBridge,
  unregisterStoreSessionBridge,
} from "identity/session/accountSessionStore";
import { createDesktopBrowserAuthorization } from "./desktopBrowserAuthorization";
import { desktopTokenManager } from "./session/desktopTokenManager";

export interface AccountSessionCore {
  getSnapshot(): AccountSessionSnapshot;
  [key: string]: any;
}

export type { AccountSessionService };

/**
 * Public desktop uses browser authorization through the normal session
 * service. The controller owns the authenticator capability; arbitrary
 * password sign-in remains unavailable.
 */
export function createStoreSessionCore(): AccountSessionCore | undefined {
  // Desktop runs the web bundle inside its webview, but a plain browser tab
  // loading a desktop-edition bundle still gets a real core and simply stays
  // anonymous (local-first contract). SSR (no window) composes no core.
  return typeof window !== "undefined" ? (createAccountSessionCore() as any) : undefined;
}

export function bindStoreSessionRuntime(input: {
  store: any;
  extra: { accountSession?: AccountSessionService | null; [key: string]: unknown };
  sessionCore?: AccountSessionCore;
  tokenManager?: TokenManager | null;
  getServerUrl?: () => string;
}): void {
  const { store, extra, sessionCore } = input;
  if (!sessionCore) return;

  const browserAuthorization = createDesktopBrowserAuthorization({
    signIn: (credentials) => {
      if (!runtime.service) throw new Error("account_session_unavailable");
      return runtime.service.signIn(credentials);
    },
  });
  const runtime = composeAccountSessionRuntime({
    core: sessionCore as any,
    // Desktop edition always has a token authority: the webview localStorage
    // list, bootstrapped once from the trusted local session endpoint.
    tokenManager: input.tokenManager ?? desktopTokenManager,
    authenticate: browserAuthorization.authenticate,
  });

  if (runtime.service) {
    extra.accountSession = runtime.service;
    store.accountSession = runtime.service;
  }
  store.desktopBrowserAuthorization = browserAuthorization;
  store.accountSessionRuntime = runtime;
  store.disposeAccountSession = () => {
    browserAuthorization.dispose();
    unregisterStoreSessionBridge(store);
    runtime.dispose();
  };
  registerStoreSessionBridge(store, runtime);
  (extra as { store?: unknown }).store = store;
}
