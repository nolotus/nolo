export interface AccountProfileGptProAccess {
  status?: string;
  requiredRechargeAmount?: number;
  rechargeAmount?: number;
  source?: string;
  sourceTxId?: string;
  grantedAt?: number;
  updatedAt?: number;
}

export interface AccountProfileUpdate {
  userId: string;
  balance?: number;
  gptProAccess?: AccountProfileGptProAccess;
  adminPermissions?: Record<string, unknown>;
}

export type AccountProfileFetch = (
  url: string,
  init: { method: string; headers: Record<string, string> }
) => Promise<Response>;

export interface FetchAccountProfileInput {
  serverUrl: string;
  token: string;
  userId: string;
  fetchImpl?: AccountProfileFetch;
}

export async function fetchAccountProfile(
  input: FetchAccountProfileInput
): Promise<AccountProfileUpdate> {
  return {
    userId: input.userId,
  };
}
