// routes/space.tsx
import React, { lazy, Suspense } from "react";
import PageLoading from "render/web/ui/PageLoading";

const SpaceLayout = lazy(() => import("create/space/components/SpaceLayout"));
const SpaceSettings = lazy(() => import("create/space/pages/SpaceSettings"));
const SpaceMembers = lazy(() => import("create/space/pages/SpaceMembers"));
const SpaceContent = lazy(() => import("create/space/pages/SpaceContent"));
const PageLoader = lazy(() => import("render/page/PageLoader"));
const LocalPreviewPanel = lazy(() => import("app/pages/LocalPreviewPanel"));

const ContentFallback = <PageLoading message="加载中..." />;

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={ContentFallback}>{element}</Suspense>
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
