import { authRoutes } from "core/authRoutes";
import {
  buildPersistentAuthTokenPayload,
  parseToken,
  signToken,
} from "core/authToken";
import { generateKeyPairFromSeedV1 } from "core/generateKeyPairFromSeedV1";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { hashPasswordV1 } from "core/password";
import { buildRevokeSessionProofPayload } from "identity/sessionRevokeProof";

export interface AccountSessionTokenReplacer {
  replaceActiveToken?: (token: string) => Promise<unknown>;
}

export interface ExecuteRevokeSessionsFlowInput {
  password: string;
  user: {
    userId: string;
    username: string;
  };
  locale: string;
  currentToken: string;
  server: string;
  expectedPublicKey?: string | null;
  accountSession: AccountSessionTokenReplacer | null | undefined;
  fetchImpl?: typeof fetch;
}

export interface ExecuteRevokeSessionsFlowResult {
  tokenVersion: number;
  nextToken: string;
}

/**
 * Shared client flow for session revocation and credential rotation.
 * Used identically by Web (SecuritySettings) and RN (SecuritySettingsScreen).
 */
export async function executeRevokeSessionsFlow(
  input: ExecuteRevokeSessionsFlowInput
): Promise<ExecuteRevokeSessionsFlowResult> {
  const accountSession = input.accountSession;
  const replaceActiveToken = accountSession?.replaceActiveToken;
  // Do not revoke the server session unless this runtime can persist its
  // replacement. Preserve the receiver: the Core service uses instance deps.
  if (typeof replaceActiveToken !== "function") {
    throw new Error("revoke_failed");
  }

  const encryptionKey = await hashPasswordV1(input.password);
  const { publicKey, secretKey } = generateKeyPairFromSeedV1(
    input.user.username + encryptionKey + input.locale
  );

  if (input.expectedPublicKey && input.expectedPublicKey !== publicKey) {
    throw new Error("wrong_password");
  }

  const currentTokenPayload = parseToken(input.currentToken);
  const currentTokenVersion =
    typeof currentTokenPayload?.tokenVersion === "number"
      ? Math.max(0, Math.floor(currentTokenPayload.tokenVersion))
      : 0;

  const verificationToken = signToken(
    buildRevokeSessionProofPayload({
      userId: input.user.userId,
      username: input.user.username,
      publicKey,
      tokenVersion: currentTokenVersion,
    }),
    secretKey
  );

  const fetcher = input.fetchImpl ?? fetch;
  const response = await fetcher(
    `${input.server}${authRoutes.users.sessionRevoke.createPath()}`,
    {
      method: authRoutes.users.sessionRevoke.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.currentToken}`,
      },
      body: JSON.stringify({ verificationToken }),
    }
  );

  if (!response.ok) {
    throw new Error(
      response.status === 403 ? "wrong_password" : "revoke_failed"
    );
  }

  const data = await response.json();
  const nextTokenVersion = Math.max(
    0,
    Math.floor(asOptionalFiniteNumber(data?.tokenVersion) ?? 0)
  );

  const nextToken = signToken(
    buildPersistentAuthTokenPayload(
      {
        userId: input.user.userId,
        username: input.user.username,
        publicKey,
        tokenVersion: nextTokenVersion,
      },
      Math.floor(Date.now() / 1000)
    ),
    secretKey
  );

  try {
    await replaceActiveToken.call(accountSession, nextToken);
  } catch {
    throw new Error("replace_token_failed");
  }

  return {
    tokenVersion: nextTokenVersion,
    nextToken,
  };
}
