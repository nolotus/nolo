import React from "react";

import { useIsLoggedIn } from "identity";
import { useHasMounted } from "app/hooks/useHasMounted";
// 创建入口保持 eager：它是登录态常驻的首屏 chrome，不能站在懒加载切片后面——
// 切片 404（发版后旧 hash 退场）或慢网络会让右上一段直接空着，见 650a0f3d7。
// 本模块只承载登录态用户簇：游客 chrome 在 GuestPageChrome.tsx，内容页左侧导航
// 在 PageNavChrome.tsx，两者都不静态依赖创建菜单。三条边界由
// topbarGlobalActions.source.test.ts 分别守护；若把本模块重新接到游客路径上，
// 访客就会重新为 react-aria 付费。
import CreateMenuButton from "./CreateMenuButtonContainer";

/**
 * 登录态右侧用户簇：hasMounted 占位 + 创建入口。
 *
 * 游客的右侧用户簇（主题 · 语言 · 登录 · 价格 / 下载）在 GuestPageChrome.tsx。
 * 拆成两个模块是为了让访客不下载创建入口及其菜单依赖（react-aria 等），
 * 同时登录态仍在同一次 chrome 加载里同步拿到创建入口，不再有“切片后置”的空窗。
 */
export const PageUserChrome: React.FC = () => {
  const isLoggedIn = useIsLoggedIn();
  const hasMounted = useHasMounted();

  // 游客分支归 GuestUserChrome；被误挂到游客路径时不渲染创建入口。
  if (!isLoggedIn) return null;

  if (!hasMounted) {
    return (
      <div
        className="topbar__auth-placeholder topbar__auth-placeholder--compact"
        aria-hidden="true"
        data-testid="topbar-auth-placeholder"
      >
        <span className="topbar__auth-placeholder-dot" />
      </div>
    );
  }

  return (
    <div className="topbar__user-area topbar__user-area--compact">
      <CreateMenuButton variant="topbar" className="topbar__create-entry" />
    </div>
  );
};
