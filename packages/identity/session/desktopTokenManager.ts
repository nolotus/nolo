// Desktop edition TokenManager (public source).
//
// Mirrors the localStorage contract of the private cloud web token manager so
// there is exactly one session-writer semantic per runtime:
// - Runtime authority: webview localStorage `tokens` list. The
//   AccountSessionService (core/accountSession) is the only writer.
// - Desktop bootstrap authority: the desktop profile token exposed by the
//   local desktop runtime as GET /api/desktop/auth/session (route table
//   registers GET only — no mutating route exists). It is imported only while
//   localStorage is empty; afterwards the webview list wins and token writes
//   never round-trip to the endpoint, keeping the import a read-only
//   bootstrap seam instead of a second session writer.
//
// Public boundary: this module must not import auth/billing/admin or any
// private server module (guarded by desktopEdition.source.test.ts). The web
// auth cookie is intentionally NOT synced here: the desktop webview origin is
// the local runtime (trust is same-origin/loopback based), and cloud calls
// would be cross-origin where this cookie would not apply.
import { asNonEmptyStringArray } from "core/stringArray";
import { parseToken } from "core/authToken";
import type { TokenManager } from "../authTypes.local";

const STORAGE_KEY = "tokens";

function isDesktopWebView(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as { __NOLO_DESKTOP__?: boolean }).__NOLO_DESKTOP__ === true
  );
}

function readStoredTokens(): string[] {
  if (typeof localStorage === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((token): token is string => typeof token === "string")
      : [];
  } catch {
    return [];
  }
}

function tokenUserId(token: string): string | null {
  const parsed = parseToken(token);
  const userId = (parsed as { userId?: unknown } | null)?.userId;
  return typeof userId === "string" && userId.trim() ? userId : null;
}

function writeStoredTokens(tokens: readonly string[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

async function readDesktopSessionTokens(): Promise<string[]> {
  if (!isDesktopWebView() || typeof fetch !== "function") return [];
  try {
    const response = await fetch("/api/desktop/auth/session", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = (await response.json().catch(() => ({}))) as {
      tokens?: unknown;
    };
    return asNonEmptyStringArray(data?.tokens);
  } catch {
    // Anonymous, locally usable: a missing/unreachable local runtime is not
    // a session failure, it just yields an empty token set.
    return [];
  }
}

export const desktopTokenManager: TokenManager = {
  async getTokens() {
    return readStoredTokens();
  },

  async initTokens() {
    let tokens = readStoredTokens();
    if (!tokens.length) {
      const imported = await readDesktopSessionTokens();
      if (imported.length) {
        writeStoredTokens(imported);
        tokens = imported;
      }
    }
    return tokens;
  },

  async storeToken(newToken: string) {
    const tokens = readStoredTokens();
    const newUserId = tokenUserId(newToken);
    const filtered = tokens.filter((token) => {
      if (token === newToken) return false;
      return !newUserId || tokenUserId(token) !== newUserId;
    });
    filtered.unshift(newToken);
    writeStoredTokens(filtered);
  },

  async removeToken(tokenToRemove: string) {
    const filtered = readStoredTokens().filter((token) => token !== tokenToRemove);
    writeStoredTokens(filtered);
  },
};
