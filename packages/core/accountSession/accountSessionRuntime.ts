/**
 * AccountSession runtime composition (Phase 5).
 *
 * One small factory shared by every client runtime that owns an
 * AccountSessionCore:
 * - Web (`app/store.ts`) — per-store Core in the browser; SSR request-local
 *   stores create no Core at all (no mutable module state shared across
 *   requests).
 * - RN (`rn/redux/store.ts`) — per-store isolated Core.
 * - Desktop — boots the same web bundle in its webview (`__NOLO_DESKTOP__`),
 *   so it inherits the web composition; its token *bootstrap* authority is
 *   the read-only `/api/desktop/auth/session` profile import (see
 *   `auth/web/tokenManager.ts`), never a second writer.
 * - CLI/TUI (`cli/tui/accountSessionRuntime.ts`) — profile-backed Core.
 *
 * Phase 5: the factory is platform-neutral — it imports no React, no Redux,
 * no `@reduxjs/toolkit`. The former Core→Redux snapshot projection
 * (`accountSessionReduxProjection.ts` + `auth/sessionProjected`) is deleted;
 * read sides consume the Core directly (React: `auth/session/react` hooks,
 * non-React: the explicit `core`/`service` reference).
 *
 * The factory intentionally stays tiny: no container, no provider graph. It
 * only builds the service over the ports and hands back an idempotent
 * `dispose()` for the lifecycle surface.
 */

import type { TokenManager } from "./authTypes";
import type { AccountSessionCore } from "./accountSessionCore";
import {
  AccountSessionService,
  type SessionAuthenticator,
  type SessionRuntimeReset,
  type SessionSignUpApi,
} from "./accountSessionService";

export interface AccountSessionRuntimeComposition {
  core: AccountSessionCore;
  tokenManager?: TokenManager | null;
  authenticate?: SessionAuthenticator;
  signUpWithApi?: SessionSignUpApi;
  resetRuntime?: SessionRuntimeReset;
}

export interface AccountSessionRuntime {
  readonly core: AccountSessionCore;
  /** Null when no tokenManager was provided (SSR / persistence-less runs). */
  readonly service: AccountSessionService | null;
  /**
   * Idempotent teardown hook. The Core and the service hold no external
   * resources (no timers, no subscriptions of their own), so dispose only
   * exists to keep the Phase 3 runtime contract stable for runtimes that
   * recreate stores (tests, RN fast refresh).
   */
  dispose(): void;
  readonly disposed: boolean;
}

export function composeAccountSessionRuntime(
  composition: AccountSessionRuntimeComposition
): AccountSessionRuntime {
  const { core, tokenManager, authenticate, signUpWithApi, resetRuntime } =
    composition;

  const service =
    core && tokenManager && authenticate
      ? new AccountSessionService({
          core,
          tokenManager,
          authenticate,
          signUpWithApi,
          resetRuntime,
        })
      : null;

  let disposed = false;
  return {
    core,
    service,
    dispose() {
      disposed = true;
    },
    get disposed() {
      return disposed;
    },
  };
}
