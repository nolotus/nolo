// Host receiver guard for `nolo-desktop-browser-action` messages.
//
// The webview is untrusted: any script inside it can post a host-message, so
// the receiver independently re-validates every browser-action against the
// single shared account URL policy (packages/identity/accountUrlPolicy) — it
// never assumes the sender validated anything. A url-less open keeps the
// pre-existing "open the default browser window" feature (no navigation
// target is involved); any URL that is not an exact allowlist entry
// (https://nolo.chat/login, https://nolo.chat/life) is rejected here, at the
// last boundary before openDesktopBrowser.
import { isAllowlistedAccountUrl } from "../../../../packages/identity/accountUrlPolicy";

export type DesktopBrowserActionReview =
  | { kind: "not-browser-action" }
  | { kind: "open-default-browser" }
  | { kind: "open-url"; url: string }
  | { kind: "reject"; reason: string };

export function reviewDesktopBrowserAction(
  detail: unknown
): DesktopBrowserActionReview {
  if (!detail || typeof detail !== "object") return { kind: "not-browser-action" };
  const { type, action, url } = detail as {
    type?: unknown;
    action?: unknown;
    url?: unknown;
  };
  if (type !== "nolo-desktop-browser-action") return { kind: "not-browser-action" };
  if (action !== "open") {
    return { kind: "reject", reason: `unsupported action: ${String(action)}` };
  }
  if (url === undefined || url === "") return { kind: "open-default-browser" };
  if (typeof url !== "string") {
    return { kind: "reject", reason: "url must be a string" };
  }
  if (!isAllowlistedAccountUrl(url)) {
    return {
      kind: "reject",
      reason: "url is not in the desktop account allowlist (https://nolo.chat /login, /life)",
    };
  }
  return { kind: "open-url", url };
}
