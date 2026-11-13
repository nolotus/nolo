// routes/space.tsx
import React, { Suspense } from "react";
import { Navigate, useLocation, useParams } from "app/routing";
import { AppRoutePaths } from "app/constants/routePaths";
import PageLoading from "render/web/ui/PageLoading";
import PageContentErrorBoundary from "render/layout/PageContentErrorBoundary";
import { lazyWithTimeout } from "web/lazyWithTimeout";

const SpaceLayout = lazyWithTimeout(() => import("create/space/components/SpaceLayout"));
const SpaceSettings = lazyWithTimeout(() => import("create/space/pages/SpaceSettings"));
const SpaceMembers = lazyWithTimeout(() => import("create/space/pages/SpaceMembers"));
const SpaceContent = lazyWithTimeout(() => import("create/space/pages/SpaceContent"));
const PageLoader = lazyWithTimeout(() => import("render/page/PageLoader"));
const LocalPreviewPanel = lazyWithTimeout(() => import("app/pages/LocalPreviewPanel"));

const ContentFallback = <PageLoading message="加载中..." />;

// 懒加载失败（含「永不 settle」）必须落到可操作错误页，而不是永久 fallback。
// 边界要按路由复位：React 的错误边界一旦进入错误态就没有自动恢复路径，而同一个
// 路由 element 类型在切换 spaceId/子路由时是**同一个实例**——不复位的话，错误页会
// 一直粘在后续页面上，只能整页刷新。
const RouteErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();
  return (
    <PageContentErrorBoundary resetKey={location.pathname}>
      {children}
    </PageContentErrorBoundary>
  );
};

const withSuspense = (element: React.ReactNode) => (
  <RouteErrorBoundary>
    <Suspense fallback={ContentFallback}>{element}</Suspense>
  </RouteErrorBoundary>
);

// 空间首页 = 空间对话首页，不再承载内容浏览器：/space/:id 直接复用既有的
// 空间对话页 /chat?spaceId=...（同一份聊天页面，不另造第二套）。原来的内容
// 浏览（成员/设置/附件/AI/筛选等能力原样保留）搬到 /space/:id/contents。
const SpaceHomeRedirect: React.FC = () => {
  const { spaceId } = useParams<"spaceId">();
  if (!spaceId) return <PageLoading message="加载中..." />;
  return (
    <Navigate
      to={`${AppRoutePaths.CHAT}?spaceId=${encodeURIComponent(spaceId)}`}
      replace
    />
  );
};

export const spaceRoutes = {
  path: "/space/:spaceId",
  element: withSuspense(<SpaceLayout />),
  children: [
    {
      index: true,
      element: withSuspense(<SpaceHomeRedirect />),
    },
    {
      // 全部内容：原 SpaceContent 的独立落点。静态段优先于下面的 :pageKey，
      // 而真实内容 key 都以 dialog/page/app-/agent/meta-/file/image/task 开头，
      // 不会被这里吞掉。
      path: "contents",
      element: withSuspense(<SpaceContent />),
    },
    {
      path: "files",
      element: withSuspense(<SpaceContent />),
    },
    {
      path: "ai",
      element: withSuspense(<SpaceContent />),
    },
    {
      path: "members",
      element: withSuspense(<SpaceMembers />),
    },
    {
      path: "settings",
      element: withSuspense(<SpaceSettings />),
    },
    {
      path: "preview",
      element: withSuspense(<LocalPreviewPanel />),
    },
    {
      path: ":pageKey",
      element: withSuspense(<PageLoader />),
    },
  ],
};
