import { useEffect } from "react";

import { fetchAccountProfile } from "identity/accountProfile";
import { useAccountSessionService, useAppSelector } from "app/store";
import { selectRemoteServer } from "app/settings/settingSlice";
import { useUserId } from "identity";

/**
 * Profile refresh through the explicit AccountSessionService (Phase 5).
 *
 * Replaces the retired `dispatch(fetchUserProfile())` legacy thunk at the
 * lifecycle call sites (input composer, sidebar/topbar user menus, recharge
 * return): the refresh reads the request context from the owning session
 * runtime (token/userId) plus the selected remote server, and commits the
 * result back through `service.updateAccountProfile`. There is no Redux auth
 * slice anymore — nothing is dispatched and no `state.auth` mirror exists.
 *
 * `refreshVersion` makes the refresh re-triggerable inside one mounted
 * component: bumping the number re-runs the effect, so consecutive requests
 * (e.g. two payment successes without a remount) each fetch fresh data. A
 * boolean `enabled` alone is a React no-op when it flips true a second time.
 * Callers that only need the mount-time refresh keep the default (`0`).
 *
 * No-op when disabled (SSR / local edition / not yet requested) or no
 * signed-in user, matching the semantics of the retired thunk's
 * unavailable-service path. Failures keep the last known profile
 * (fire-and-forget parity with the old unawaited dispatch).
 */
export const useAccountProfileRefresh = (
  options: { enabled?: boolean; refreshVersion?: number } = {}
): void => {
  const enabled = options.enabled ?? true;
  const refreshVersion = options.refreshVersion ?? 0;
  const accountSession = useAccountSessionService();
  const userId = useUserId();
  const serverUrl = useAppSelector(selectRemoteServer);

  useEffect(() => {
    if (!enabled || !accountSession || !userId) return;
    const token = accountSession.getSnapshot().activeToken;
    if (!token) return;

    let cancelled = false;
    fetchAccountProfile({ serverUrl: serverUrl ?? "", token, userId })
      .then((profile) => {
        if (!cancelled) accountSession.updateAccountProfile(profile);
      })
      .catch(() => {
        // Fire-and-forget refresh: keep the last known profile on failure.
      });
    return () => {
      cancelled = true;
    };
  }, [accountSession, enabled, refreshVersion, serverUrl, userId]);
};
