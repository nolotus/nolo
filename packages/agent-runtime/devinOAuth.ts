import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { OAuthCredential } from "./oauthTokenStore";

export const DEVIN_SIGNIN_URL =
  "https://app.devin.ai/settings/keys";

export const DEVIN_CONNECT_URL =
  "https://server.codeium.com/exa.api_server_pb.ApiServerService/GetChatMessage";

export function buildDevinAuthUrl(orgId?: string): string {
  const cleanOrg = orgId?.trim();
  if (cleanOrg) {
    return `https://app.devin.ai/org/${encodeURIComponent(cleanOrg)}/settings/keys`;
  }
  return "https://app.devin.ai/settings/keys";
}

export function extractDevinToken(input: string): string | null {
  const raw = input?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const queryToken =
        url.searchParams.get("token") ||
        url.searchParams.get("access_token") ||
        url.searchParams.get("auth_token");
      if (queryToken?.trim()) return queryToken.trim();

      if (url.hash) {
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const hashToken =
          hashParams.get("token") ||
          hashParams.get("access_token") ||
          hashParams.get("auth_token");
        if (hashToken?.trim()) return hashToken.trim();
      }
    } catch {
      // Not a valid URL, fall through to raw string
    }
  }

  return raw || null;
}

export function parseDevinCredentialsToml(content: string): string | null {
  for (const line of content.split(/\r?\n/)) {
    // 1. Direct cog_ token
    const cogMatch = line.match(/(cog_[A-Za-z0-9_-]+)/);
    if (cogMatch?.[1]) {
      return cogMatch[1].trim();
    }
    // 2. key-value pairs
    const match = line.match(
      /^\s*(?:windsurf_api_key|devin_api_key|api_key|api_token|token)\s*=\s*"([^"]+)"\s*$/i
    );
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

export type LocalDevinCredentialDetection = {
  found: boolean;
  token?: string;
  source?: string;
  sourcePath?: string;
};

export function detectLocalDevinCredentials(options?: {
  homeDir?: string;
}): LocalDevinCredentialDetection {
  const baseHome = options?.homeDir || homedir();

  // 1. Devin CLI credentials.toml on Linux/macOS
  const xdgData = process.env.XDG_DATA_HOME;
  const candidateCliPaths = [
    xdgData ? join(xdgData, "devin", "credentials.toml") : null,
    join(baseHome, ".local", "share", "devin", "credentials.toml"),
    process.env.APPDATA ? join(process.env.APPDATA, "devin", "credentials.toml") : null,
  ].filter((p): p is string => Boolean(p));

  for (const credPath of candidateCliPaths) {
    if (existsSync(credPath)) {
      try {
        const content = readFileSync(credPath, "utf-8");
        const token = parseDevinCredentialsToml(content);
        if (token) {
          return {
            found: true,
            token,
            source: "devin-cli",
            sourcePath: credPath,
          };
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  // 2. Codeium config.json
  const codeiumPath = join(baseHome, ".codeium", "config.json");
  if (existsSync(codeiumPath)) {
    try {
      const parsed = JSON.parse(readFileSync(codeiumPath, "utf-8")) as {
        apiKey?: string;
        api_key?: string;
      };
      const token = parsed.apiKey || parsed.api_key;
      if (token?.trim()) {
        return {
          found: true,
          token: token.trim(),
          source: "codeium-config",
          sourcePath: codeiumPath,
        };
      }
    } catch {
      // Skip unreadable or malformed json
    }
  }

  return { found: false };
}

export function buildDevinOAuthCredential(
  token: string,
  now = Date.now()
): OAuthCredential {
  return {
    provider: "devin",
    accessToken: token.trim(),
    obtainedAt: now,
  };
}

import { isDevinOAuthAgent } from "./devinOAuthPure";
export { isDevinOAuthAgent };
