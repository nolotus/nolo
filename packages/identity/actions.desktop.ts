// Desktop edition identity write surface (nolo-desktop condition).
//
// Mirrors the cloud action signatures but stays inside the public boundary:
// session lifecycle commands delegate to the SAME public AccountSessionService
// wired by storeSession.desktop (core/accountSession — no second session
// abstraction), profile reads reuse the public core fetchAccountProfile, and
// password sign-in has no implementation here (desktop sign-in is an external
// browser action; see accountExternalActions).
//
// Failure policy: service failures PROPAGATE (throw). The desktop UI must
// show sign-out/switch failures — never silently swallow them.
//
// 余额不计算：deductBalance 在桌面端不做本地余额扣减（余额只显示服务端
// profile 返回值），仅保留 API 形状。

import { fetchAccountProfile } from "core/accountSession";
import { selectRemoteServer } from "app/settings/settingSlice";
import {
  getSessionRuntime,
  registerStoreSessionBridge,
} from "identity/session/accountSessionStore";
import type { AccountSessionService } from "identity/types";
import { getSessionSnapshotForState } from "./sessionSource";
import type { IdentityUser } from "./types";

export { registerStoreSessionBridge };

type StoreLike = {
  accountSession?: unknown;
  accountSessionRuntime?: unknown;
  getState?: () => unknown;
  dispatch?: (action: unknown) => unknown;
};

const SERVICE_UNAVAILABLE = "account session service unavailable";

const resolveService = (
  store: StoreLike | null | undefined
): AccountSessionService | null =>
  (getSessionRuntime(store as object | null)?.service as
    | AccountSessionService
    | null) ?? null;

const serverUrlOf = (getState: (() => unknown) | undefined): string => {
  if (!getState) return "";
  return selectRemoteServer(getState() as never) || "";
};

// ---------------------------------------------------------------------------
// Legacy compatibility shims (same shape as the cloud edition)
// ---------------------------------------------------------------------------

type LegacyThunk<T = unknown> = (
  dispatch: any,
  getState: () => unknown,
  extra?: unknown
) => Promise<T> | T;

const storeFromExtra = (extra: unknown): StoreLike | null =>
  (extra as { store?: StoreLike } | undefined)?.store ?? null;

export const signOut = (): LegacyThunk<{ tokens: string[] }> => {
  return async (_dispatch, _getState, extra) => {
    const service = resolveService(storeFromExtra(extra));
    if (!service) throw new Error(SERVICE_UNAVAILABLE);
    // 失败必须可见：rethrow 给调用方（Topbar 以 role="alert" 呈现）。
    return service.signOut();
  };
};

export const fetchUserProfile = (): LegacyThunk => {
  return async (_dispatch, getState, extra) => {
    const store = storeFromExtra(extra);
    const service = resolveService(store);
    const runtime = getSessionRuntime(store as object | null);
    const snapshot = runtime ? runtime.core.getSnapshot() : null;
    const userId = snapshot?.activeAccountId ?? undefined;
    const token = snapshot?.activeToken ?? null;
    const serverUrl = serverUrlOf(getState);
    if (!service || !serverUrl || !token || !userId) {
      throw new Error(SERVICE_UNAVAILABLE);
    }
    const profile = await fetchAccountProfile({ serverUrl, token, userId });
    service.updateAccountProfile(profile);
    return profile;
  };
};

export const initializeAuth = (): LegacyThunk => {
  return async (_dispatch, _getState, extra) => {
    const store = storeFromExtra(extra);
    const service = resolveService(store);
    if (!service) return { tokens: [] as string[], user: null };
    const result = await service.initialize();
    const runtime = getSessionRuntime(store as object | null);
    return {
      ...result,
      user:
        runtime?.core.getSnapshot().accounts.find(
          (a: { userId: string }) =>
            a.userId === runtime.core.getSnapshot().activeAccountId
        ) ?? null,
    };
  };
};

export const changeUser = (user: IdentityUser): LegacyThunk => {
  return async (_dispatch, _getState, extra) => {
    const service = resolveService(storeFromExtra(extra));
    if (!service) throw new Error(SERVICE_UNAVAILABLE);
    return service.switchAccount(user.userId);
  };
};

export const replaceCurrentToken = (
  input: { token: string } | string
): LegacyThunk => {
  return async (_dispatch, _getState, extra) => {
    const service = resolveService(storeFromExtra(extra));
    if (!service) throw new Error(SERVICE_UNAVAILABLE);
    const token = typeof input === "string" ? input : input.token;
    return service.replaceActiveToken(token);
  };
};

export const deductBalance = (cost: number): LegacyThunk => {
  return async () => ({ cost });
};

export const selectUsers = (state: unknown): IdentityUser[] =>
  getSessionSnapshotForState(state)?.accounts ?? [];
