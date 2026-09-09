import type { TokenManager } from "identity/authTypes";
import type {
  AccountSessionService,
  AccountSessionSnapshot,
} from "identity/types";
import {
  registerStoreSessionBridge,
  unregisterStoreSessionBridge,
} from "identity/session/accountSessionStore";

export interface AccountSessionCore {
  getSnapshot(): AccountSessionSnapshot;
  [key: string]: any;
}

export type { AccountSessionService };

export function createStoreSessionCore(): AccountSessionCore | undefined {
  return undefined;
}

export function bindStoreSessionRuntime(input: {
  store: any;
  extra: { accountSession?: AccountSessionService | null; [key: string]: unknown };
  sessionCore?: AccountSessionCore;
  tokenManager?: TokenManager | null;
  getServerUrl?: () => string;
}): void {
  const { store, extra, sessionCore, tokenManager } = input;
  if (!sessionCore) return;

  const core = sessionCore as any;
  let disposed = false;
  const service: AccountSessionService = {
    get core() {
      return core;
    },
    getSnapshot() {
      return typeof core.getSnapshot === "function" ? core.getSnapshot() : {
        accounts: [],
        activeAccountId: null,
        activeToken: null,
        initialized: false,
        transition: "idle",
      };
    },
    async initialize() {
      if (tokenManager) {
        const tokens = await tokenManager.getTokens();
        if (typeof core.initializeFromTokens === "function") {
          core.initializeFromTokens(tokens);
        }
      }
      return this.getSnapshot();
    },
    deductBalance(cost: number) {
      if (typeof core.deductActiveBalance === "function") {
        core.deductActiveBalance(cost);
      }
    },
  };

  const runtime = {
    core,
    service: tokenManager ? service : null,
    get disposed() {
      return disposed;
    },
    dispose: () => {
      disposed = true;
    },
  };

  if (runtime.service) {
    extra.accountSession = runtime.service;
    store.accountSession = runtime.service;
  }
  store.accountSessionRuntime = runtime;
  store.disposeAccountSession = () => {
    unregisterStoreSessionBridge(store);
    runtime.dispose();
  };
  registerStoreSessionBridge(store, runtime);
  (extra as { store?: unknown }).store = store;
}
