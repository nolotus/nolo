// Desktop account external actions (public boundary, sender side).
//
// The public desktop edition never renders private auth/account UI. Sign-in
// and the account center are EXTERNAL browser actions: they open FIXED,
// allowlisted nolo.chat pages in the system browser through the existing
// `nolo-desktop-browser-action` host bridge.
//
// The URL policy lives in ./accountUrlPolicy and is shared with the desktop
// host receiver (desktopAccountActionGuard) — the receiver re-validates every
// message independently, so sender-side checks here are defense in depth,
// not the only boundary. Arbitrary/untrusted origins (http, look-alike
// hosts, mutated paths, credentials-in-URL) never become a host message.

import {
  DESKTOP_ACCOUNT_ALLOWLIST,
  buildDesktopBrowserActionMessage,
  isAllowlistedAccountUrl,
  type DesktopAccountTarget,
  type DesktopBrowserActionMessage,
} from "./accountUrlPolicy";

// Public boundary surface: re-export the shared policy for consumers (and so
// the sender cannot grow a private, drifting copy of the allowlist).
export {
  DESKTOP_ACCOUNT_ALLOWLIST,
  buildDesktopBrowserActionMessage,
  isAllowlistedAccountUrl,
};
export type { DesktopAccountTarget, DesktopBrowserActionMessage };

type SendToHost = (message: DesktopBrowserActionMessage) => void;

function resolveSendToHost(): SendToHost | null {
  const candidate = (globalThis as {
    __electrobunSendToHost?: unknown;
  }).__electrobunSendToHost;
  return typeof candidate === "function" ? (candidate as SendToHost) : null;
}

/**
 * Open a fixed allowlisted account page in the system browser.
 * Bridge first; a plain `window.open` (noopener) keeps the same allowlisted
 * URL usable when a desktop-edition bundle runs outside the webview. Returns
 * false only when nothing could open the page — never throws, never accepts a
 * non-allowlisted target.
 */
export function openDesktopAccountPage(target: DesktopAccountTarget): boolean {
  const url = DESKTOP_ACCOUNT_ALLOWLIST[target];
  const message = buildDesktopBrowserActionMessage(url);
  if (!message) return false;

  const sendToHost = resolveSendToHost();
  if (sendToHost) {
    sendToHost(message);
    return true;
  }
  if (typeof window !== "undefined" && typeof window.open === "function") {
    window.open(message.url, "_blank", "noopener,noreferrer");
    return true;
  }
  return false;
}
