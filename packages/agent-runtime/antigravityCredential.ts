import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { readOAuthCredential, type OAuthCredential } from "./oauthTokenStore";

/** The identity and location to resolve; never carries a secret or wire data. */
export type AntigravityCredentialPlan = {
  provider: "antigravity";
  credentialOwnerUserId: string;
  source: "local" | "server";
  forceRefresh: boolean;
};

/** The provider-facing credential contract shared by local and server callers. */
export type ResolvedAntigravityCredential = {
  provider: "antigravity";
  accessToken: string;
  projectId: string;
  metadata: Record<string, unknown>;
  accountId: string | null;
};

export function createAntigravityCredentialPlan(args: {
  credentialOwnerUserId: string;
  source: "local" | "server";
  forceRefresh?: boolean;
}): AntigravityCredentialPlan {
  const owner = asOptionalTrimmedString(args.credentialOwnerUserId);
  if (!owner) throw new Error("Antigravity credential owner is required.");
  return {
    provider: "antigravity",
    credentialOwnerUserId: owner,
    source: args.source,
    forceRefresh: args.forceRefresh === true,
  };
}

export function resolveAntigravityCredential(args: {
  plan: AntigravityCredentialPlan;
  accessToken: string;
  metadata?: Record<string, unknown> | null;
  accountId?: string | null;
}): ResolvedAntigravityCredential {
  if (args.plan.provider !== "antigravity") {
    throw new Error("Unsupported Antigravity credential plan provider.");
  }
  return toResolvedAntigravityCredential(args);
}

export function toResolvedAntigravityCredential(args: {
  accessToken: string;
  metadata?: Record<string, unknown> | null;
  accountId?: string | null;
}): ResolvedAntigravityCredential {
  const accessToken = asOptionalTrimmedString(args.accessToken);
  const projectId = asOptionalTrimmedString(args.metadata?.projectId);
  if (!accessToken) throw new Error("Antigravity credential access token is missing.");
  if (!projectId) {
    throw new Error(
      'Antigravity OAuth credential is missing metadata.projectId. Re-run `nolo auth antigravity`.',
    );
  }
  return {
    provider: "antigravity",
    accessToken,
    projectId,
    metadata: { ...(args.metadata ?? {}), projectId },
    accountId: asOptionalTrimmedString(args.accountId) ?? null,
  };
}

export type ResolveLocalAntigravityCredentialArgs = {
  credentialOwnerUserId?: string;
  migration?: import("./credentialLocationMigration").CredentialMigrationOptions;
  apiKeyRefResolver: (ref: string, opts?: { force?: boolean }) => Promise<string | null>;
  apiKeyRef?: string;
  forceRefresh?: boolean;
  readCredential?: (provider: "antigravity") => OAuthCredential | null;
  metadata?: Record<string, unknown> | null;
  accountId?: string | null;
  source?: "local" | "server";
};

export async function resolveLocalAntigravityCredential(
  args: ResolveLocalAntigravityCredentialArgs,
): Promise<ResolvedAntigravityCredential> {
  const rawRef = asTrimmedLowercaseString(args.apiKeyRef);
  const isApiKeyRef = rawRef.startsWith("api-key:");
  const providerRef = isApiKeyRef ? rawRef : rawRef || "antigravity";

  if (isApiKeyRef && args.forceRefresh) {
    throw new Error(`Cannot force-refresh non-OAuth API key ref "${rawRef}".`);
  }

  const token = await args.apiKeyRefResolver(
    providerRef,
    args.forceRefresh ? { force: true } : undefined,
  );
  const trimmedToken = asOptionalTrimmedString(token);
  if (!trimmedToken) {
    if (isApiKeyRef) {
      throw new Error(`API key for "${rawRef}" not found locally.`);
    }
    throw new Error(
      'OAuth credential for "antigravity" not found locally. Run `nolo auth antigravity`.',
    );
  }

  const read = args.readCredential ?? readOAuthCredential;
  const raw = read("antigravity");

  const plan = createAntigravityCredentialPlan({
    credentialOwnerUserId: args.credentialOwnerUserId || "local",
    source: args.source || "local",
    forceRefresh: args.forceRefresh === true,
  });

  return resolveAntigravityCredential({
    plan,
    accessToken: trimmedToken,
    metadata: raw?.metadata ?? args.metadata ?? null,
    accountId: raw?.accountId ?? args.accountId ?? null,
  });
}
