// routes/space.tsx
import React, { Suspense } from "react";
import { useLocation } from "app/routing";
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

export const spaceRoutes = {
  path: "/space/:spaceId",
  element: withSuspense(<SpaceLayout />),
  children: [
    {
      index: true,
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
