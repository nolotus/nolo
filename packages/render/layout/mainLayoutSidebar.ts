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


/**
 * Explore 的分类入口在窄视口下从 Context 列挪到内容区顶部横条
 * （AgentExplore.tsx 的 .agent-explore-category-bar），列本身自动折叠成 Rail，
 * 把横向空间让给卡片网格。
 *
 * 这条阈值必须与 AgentExplore.css 里 `.agent-explore-category-bar` 的 @media
 * 断点**同源**：一个管折叠列、一个管显示横条，两边不一致就会出现
 * 「列还在 + 顶部也有」（重复入口）或「两处都没有」（分类不可达）的空档。
 */
export const EXPLORE_COMPACT_CATEGORY_BAR_MAX_WIDTH = 1200;

/** Whether the Explore category switcher should live in the content-top bar. */
export const shouldRenderExploreCategoryBar = ({
  pathname,
  isCompactViewport,
}: {
  pathname: string;
  isCompactViewport: boolean;
}): boolean => {
  if (!isCompactViewport) return false;
  return pathname === "/explore" || pathname.startsWith("/explore/");
};

/**
 * Whether the Explore Context column should be folded down to the Rail so the
 * category bar can take its horizontal space. Mobile is excluded: there the
 * sidebar is already a closed-by-default drawer (MainLayout 的 768 断点逻辑管),
 * 再叠一层自动折叠只会和抽屉状态打架。
 */
export const shouldFoldExploreContextColumn = ({
  pathname,
  isCompactViewport,
  isMobile,
}: {
  pathname: string;
  isCompactViewport: boolean;
  isMobile: boolean;
}): boolean =>
  !isMobile && shouldRenderExploreCategoryBar({ pathname, isCompactViewport });
