// Single public URL policy for desktop account external actions.
//
// This module is the ONE source of truth for which URLs may leave the app
// through the `nolo-desktop-browser-action` host bridge. It is imported by
// BOTH trust boundaries so they can never drift:
// - sender (webview bundle): packages/identity/accountExternalActions.ts —
//   validates before a host message is ever built;
// - receiver (Bun host): packages/desktop/src/bun/desktopAccountActionGuard.ts
//   — re-validates before openDesktopBrowser, independent of the sender.
//
// Import-safety contract: this file must stay dependency-free and must not
// touch DOM/globals at module scope, so the Bun host can import it safely.
//
// Host message schema (exact):
//   { type: "nolo-desktop-browser-action", action: "open", url: string }

export const DESKTOP_ACCOUNT_ALLOWLIST = {
  signIn: "https://nolo.chat/login",
  accountCenter: "https://nolo.chat/life",
} as const;

export type DesktopAccountTarget = keyof typeof DESKTOP_ACCOUNT_ALLOWLIST;

export interface DesktopBrowserActionMessage {
  type: "nolo-desktop-browser-action";
  action: "open";
  url: string;
}

const ALLOWED_URLS: ReadonlySet<string> = new Set(
  Object.values(DESKTOP_ACCOUNT_ALLOWLIST)
);

/**
 * Exact-allowlist check: only the fixed https nolo.chat `/login` and `/life`
 * URLs pass. Anything else — http, lookalike hosts, other paths, ports,
 * credentials, query or fragment injection, non-string values — is rejected.
 * The exact-string set membership is deliberately strict (no normalization):
 * a URL that is not byte-for-byte an allowlist entry never passes.
 */
export function isAllowlistedAccountUrl(url: unknown): url is string {
  if (typeof url !== "string" || !ALLOWED_URLS.has(url)) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "nolo.chat" &&
      parsed.port === "" &&
      parsed.username === "" &&
      parsed.password === ""
    );
  } catch {
    return false;
  }
}

export function buildDesktopBrowserActionMessage(
  url: unknown
): DesktopBrowserActionMessage | null {
  return isAllowlistedAccountUrl(url)
    ? { type: "nolo-desktop-browser-action", action: "open", url }
    : null;
}
