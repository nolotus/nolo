// 站点页脚的路由白名单。
//
// 合规要求（Waffo 进件审核）：《服务条款》《隐私政策》《AIGC 可接受使用规范》
// 必须能从站内导航直接查阅。内容型页面在正文底部渲染完整页脚；聊天 / 空间等
// 满高工作区不渲染（会破坏 MainLayout__main 的满高滚动布局），改由侧栏底部
// 的法务入口承载（见 chat/web/sidebar/SidebarUserSection 的用户菜单）。
//
// 登录后的首页是工作区视图（QuickChat / 组件面板 + 侧栏），同样不渲染页脚，
// 法务导航由侧栏用户菜单承载；游客首页保留完整页脚（合规入口）。
//
// 采用白名单而非黑名单：新增工作区类路由时默认不渲染，不会意外撑坏布局。

const FOOTER_EXACT_PATHS = new Set([
  "/",
  "/pricing",
  "/recharge",
  "/terms",
  "/privacy",
  "/aup",
  "/about",
  "/contact",
  "/guide",
  "/downloads",
  "/lab",
]);

/** 这些前缀下的所有子路径都渲染页脚（营销 / 信息型页面）。 */
const FOOTER_PREFIXES = ["/share/community"];

export interface SiteFooterOptions {
  /** 登录后首页不渲染页脚。默认 false：游客与 SSR 首帧仍渲染合规页脚。 */
  isLoggedIn?: boolean;
}

const stripTrailingSlash = (pathname: string) =>
  pathname.length > 1 && pathname.endsWith("/")
    ? pathname.replace(/\/+$/, "")
    : pathname;

export const shouldRenderSiteFooter = (
  pathname: string,
  { isLoggedIn = false }: SiteFooterOptions = {},
): boolean => {
  if (typeof pathname !== "string" || !pathname) return false;
  const path = stripTrailingSlash(pathname);
  if (isLoggedIn && path === "/") return false;
  if (FOOTER_EXACT_PATHS.has(path)) return true;
  return FOOTER_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
};
