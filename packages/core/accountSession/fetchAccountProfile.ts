/**
 * fetchAccountProfile — Phase 5 extraction of the profile read that used to
 * live inside the `authSlice.fetchUserProfile` thunk.
 *
 * Platform-neutral: no Redux, no Core, no React. The caller supplies the
 * request context (server selection + bearer token + userId) and is
 * responsible for committing the returned profile into the
 * `AccountSessionCore` (e.g. `service.core.updateAccountProfile(profile)` or
 * the equivalent thunk-side commit).
 *
 * `fetchImpl` is injectable so runtimes can layer their own retry/transport
 * policy (web passes the transient-read-retry fetch; tests pass stubs) without
 * this module reaching into app/runtime modules.
 */

import { authRoutes } from "core/authRoutes";

/** Only the non-token-derived profile fields the server returns here. */
export interface AccountProfileUpdate {
  userId: string;
  balance?: number;
  gptProAccess?: AccountProfileGptProAccess;
  adminPermissions?: Record<string, unknown>;
}

export interface AccountProfileGptProAccess {
  status?: string;
  requiredRechargeAmount?: number;
  rechargeAmount?: number;
  source?: string;
  sourceTxId?: string;
  grantedAt?: number;
  updatedAt?: number;
}

export type AccountProfileFetch = (
  url: string,
  init: { method: string; headers: Record<string, string> }
) => Promise<Response>;

export interface FetchAccountProfileInput {
  serverUrl: string;
  token: string;
  userId: string;
  /** Defaults to global `fetch`; inject a retrying/stub fetch as needed. */
  fetchImpl?: AccountProfileFetch;
}

export async function fetchAccountProfile(
  input: FetchAccountProfileInput
): Promise<AccountProfileUpdate> {
  const serverUrl = input.serverUrl?.trim();
  const token = input.token?.trim();
  const userId = input.userId?.trim();
  if (!serverUrl || !token || !userId) {
    throw new Error("missing_profile_request_params");
  }

  const path = authRoutes.users.detail.createPath({ userId });
  const fetchImpl = input.fetchImpl ?? ((url, init) => fetch(url, init));
  const response = await fetchImpl(`${serverUrl}${path}`, {
    method: authRoutes.users.detail.method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`profile_fetch_failed: ${response.status} ${errorText}`);
  }

  const profileData: {
    balance?: number;
    gptProAccess?: AccountProfileGptProAccess;
    adminPermissions?: Record<string, unknown>;
  } = await response.json().catch(() => ({}));

  return {
    userId,
    balance: profileData.balance,
    gptProAccess: profileData.gptProAccess,
    adminPermissions: profileData.adminPermissions,
  };
}
