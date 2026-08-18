const NO_SIDEBAR_PREFIXES = [
  "/profile",
  "/recharge",
  "/share/community",
];

/**
 * Path-only: when logged-in (or desktop) ChatSidebar would host the Home
 * control next to the space switcher. Ignores auth/mount so TopBar can avoid
 * a flash of Home that appears then disappears as session/sidebar hydrate.
 */
export const canPathHostChatSidebarHome = (pathname: string): boolean => {
  if (pathname.startsWith("/life")) return false;
  if (
    NO_SIDEBAR_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }
  return true;
};

export const shouldRenderChatSidebar = ({
  isLoggedIn,
  hasMounted,
  useAllViewSidebar,
  isLifeRoute,
  pathname,
  isDesktopApp = false,
}: {
  isLoggedIn: boolean;
  hasMounted: boolean;
  useAllViewSidebar: boolean;
  isLifeRoute: boolean;
  pathname?: string;
  /** Desktop local-first: allow chat sidebar while logged out. Web keeps marketing shell without sidebar. */
  isDesktopApp?: boolean;
}): boolean => {
  if (!hasMounted) return false;
  if (!isLoggedIn && !isDesktopApp) return false;
  if (isLifeRoute) return false;

  // Hide the left sidebar on specific global or personal/discovery pages
  if (
    pathname &&
    NO_SIDEBAR_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    )
  ) {
    return false;
  }

  if (useAllViewSidebar) return true;
  return true;
};

/**
 * TopBar Home escape hatch: only on routes that never put Home in ChatSidebar
 * (e.g. /life). Do not depend on isLoggedIn / sidebarWidth — those flip during
 * hydration and cause Home to flash on then off on web workspace pages.
 */
export const shouldShowTopbarHomeButton = ({
  pathname,
  hasMounted,
}: {
  pathname: string;
  hasMounted: boolean;
}): boolean => {
  if (!hasMounted) return false;
  return !canPathHostChatSidebarHome(pathname);
};

