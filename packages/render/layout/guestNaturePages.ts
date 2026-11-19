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

// 内容对象页（page / app- / agent / meta- / file / image / task / dialog）自带
// 页面头部，Home 入口由那里承载；页面头部之外的游客页没有页头，也没有侧栏，
// 需要一个独立的品牌入口，否则登录页 / 定价页只能靠浏览器后退回首页。
const CONTENT_OBJECT_SEGMENT = /^(page|app-|agent|meta-|file|image|task|dialog)/;

export function isContentObjectPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  return CONTENT_OBJECT_SEGMENT.test(last);
}

/**
 * 游客页左上角是否渲染可点的品牌入口（回首页）。
 * 已经在首页时不需要；内容对象页有自己的页头 Home；登录态走侧栏 / 页头。
 */
export function shouldShowGuestBrandHome(
  pathname: string,
  { isLoggedIn, isDesktop }: { isLoggedIn: boolean; isDesktop: boolean },
): boolean {
  if (isLoggedIn || isDesktop) return false;
  if (typeof pathname !== "string" || !pathname) return false;
  const path = stripTrailingSlash(pathname);
  if (!path || path === "/") return false;
  return !isContentObjectPath(path);
}
