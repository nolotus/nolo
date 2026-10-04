// Guest "nature" pages: public pages a logged-out visitor sees that share the
// guest home's look — topbar dissolved into the sky (no border, brand mark),
// nature palette tokens, no app-canvas white. One predicate for MainLayout and
// TopBar so the two never disagree.
//
// Scope is deliberately an allow-list: the guest home plus the auth entry
// pages. Logged-in users and the desktop shell keep the normal app chrome.

export type GuestNaturePage = "home" | "auth";

const AUTH_PATHS = new Set(["/login", "/signup", "/cli/authorize"]);

const stripTrailingSlash = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

export function getGuestNaturePage(
  pathname: string,
  { isLoggedIn, isDesktop }: { isLoggedIn: boolean; isDesktop: boolean },
): GuestNaturePage | null {
  if (isLoggedIn || isDesktop) return null;
  const path = stripTrailingSlash(pathname);
  if (path === "/") return "home";
  if (AUTH_PATHS.has(path)) return "auth";
  return null;
}
