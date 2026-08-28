import { asOptionalTrimmedString } from "core/optionalString";
import { TOKEN } from "../testUtils";
import {
  getCurrentProfile,
  getDefaultProfileConfigPath,
  loadProfileConfig,
} from "../../packages/cli/client/profileConfig";

export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(".").filter(Boolean);
  const payloadCandidates =
    parts.length >= 3 ? [parts[1], parts[0]] : [parts[0]];
  for (const payload of payloadCandidates) {
    try {
      return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    } catch {
      continue;
    }
  }
  return null;
}

export function parseUserIdFromAuthToken(token: string): string | undefined {
  const payload = decodeJwtPayload(token);
  const userId = payload?.userId;
  return typeof userId === "string" && userId ? userId : undefined;
}

export function parseUsernameFromAuthToken(token: string): string | undefined {
  const payload = decodeJwtPayload(token);
  return asOptionalTrimmedString(payload?.username);
}

type ResolveAuthTokenOptions = {
  extraEnvKeys?: string[];
  includeProfile?: boolean;
  includeTestFallback?: boolean;
  profileConfigPath?: string;
};

function firstNonEmptyEnvValue(keys: string[]): string | undefined {
  for (const key of keys) {
    const normalized = asOptionalTrimmedString(process.env[key]);
    if (normalized) return normalized;
  }
  return undefined;
}

export function resolveAuthToken(options?: ResolveAuthTokenOptions) {
  const envToken = firstNonEmptyEnvValue([
    ...(options?.extraEnvKeys ?? []),
    "BENCHMARK_AUTH_TOKEN",
    "AUTH_TOKEN",
    "AUTH",
  ]);
  if (envToken) return envToken;
  if (options?.includeProfile !== false) {
    const profile = getCurrentProfile(
      loadProfileConfig(
        options?.profileConfigPath ?? getDefaultProfileConfigPath(),
      ),
    );
    if (profile?.authToken?.trim()) return profile.authToken.trim();
  }
  if (options?.includeTestFallback === false) return "";
  return TOKEN;
}

export function resolveUserAuthToken(options?: ResolveAuthTokenOptions) {
  const envKeys = [
    ...(options?.extraEnvKeys ?? []),
    "BENCHMARK_AUTH_TOKEN",
    "AUTH_TOKEN",
    "AUTH",
  ];
  for (const key of envKeys) {
    const value = process.env[key];
    if (typeof value !== "string" || !value.trim()) continue;
    const token = value.trim();
    if (parseUserIdFromAuthToken(token)) return token;
  }

  if (options?.includeProfile !== false) {
    const profile = getCurrentProfile(
      loadProfileConfig(
        options?.profileConfigPath ?? getDefaultProfileConfigPath(),
      ),
    );
    const token = profile?.authToken?.trim() ?? "";
    if (token && parseUserIdFromAuthToken(token)) return token;
  }

  if (options?.includeTestFallback === false) return "";
  return TOKEN;
}

export function resolveExplicitAuthToken(extraEnvKeys: string[] = []) {
  return resolveAuthToken({
    extraEnvKeys,
    includeProfile: false,
    includeTestFallback: false,
  });
}
