import React, { Suspense, lazy } from "react";
import { Navigate } from "app/routing";
import Home from "app/pages/Home";
import MainLayout from "render/layout/MainLayout";
import { CreateRoutePaths } from "create/routePaths";
import { AppRoutePaths } from "app/constants/routePaths";
import { spaceRoutes } from "create/space/routes";
import { isCloudEdition } from "identity";
import { cloudLazy } from "identity/cloudLazy";
import { cloudRoutes } from "identity/cloudRoutes";
import {
  MY_ROUTE_SECTIONS,
  type MySectionDefinition,
} from "app/constants/mySections";
import { legacySettingRoutes, settingRoutes } from "app/settings/routes";
import ShareImportPage from "app/pages/ShareImportPage";

import PageLoading from "render/web/ui/PageLoading";
import { getIsDesktopApp } from "app/utils/env";

// Non-shell pages: route-level lazy so dialog/home first paint does not sync-pull lab/create/pricing.
const Lab = lazy(() => import("app/pages/Lab"));
// Cloud-only pages: 用 cloudLazy 包装，local 模式返回 null 组件。
const PricePage = cloudLazy("app/pages/Pricing/Price", () => null);
const RechargePage = cloudLazy("app/pages/Recharge", () => null);
const NewChatPage = lazy(() => import("app/pages/NewChatPage"));
const AgentExplore = lazy(() => import("ai/agent/web/AgentExplore"));
const GuidedAgentCreatePage = lazy(() => import("ai/agent/web/GuidedAgentCreatePage"));
const LocalQuickCreateAgent = lazy(() => import("app/pages/LocalQuickCreateAgent"));
const CreatorPage = lazy(() => import("ai/agent/web/CreatorPage"));
const MyContentPage = lazy(() => import("app/pages/MyContentPage"));
const ShareCommunityPage = lazy(() => import("app/pages/ShareCommunityPage"));
const MyFavoritesPage = lazy(() => import("app/pages/MyFavoritesPage"));
const ClientDownloadsPage = lazy(() => import("app/pages/ClientDownloadsPage"));
const NotificationsPage = lazy(() => import("app/pages/NotificationsPage"));
const QuickStartGuidePage = lazy(() => import("app/pages/QuickStartGuidePage"));
const PrivacyPolicyPage = lazy(() => import("app/pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("app/pages/TermsOfServicePage"));
const AUPPage = lazy(() => import("app/pages/AUPPage"));
const AboutPage = lazy(() => import("app/pages/AboutPage"));
const ContactPage = lazy(() => import("app/pages/ContactPage"));
// Dialog and other content keys: keep dynamic so space/routes cannot force DialogPage into the shell graph.
const PageLoader = lazy(() => import("render/page/PageLoader"));
const AgentEmailE2EPage = cloudLazy("app/email/AgentEmailE2EPage", () => null);
const AgentInboxPage = lazy(() => import("ai/agent/web/AgentInboxPage"));
const SpaceInvite = cloudLazy("create/space/pages/SpaceInvite", () => null);

// ADMIN_PAGE_PATHS 在 app/admin/ 里（被排除）。local 模式不需要 admin 路由，
// 用条件避免 static import 指向被排除的模块。
// cloud 模式的值必须与 app/admin/adminPages.ts 的 ADMIN_PAGE_PATHS.email 保持同步。
const ADMIN_EMAIL_PATH = isCloudEdition ? "/life/users/email" : "/";

/**
 * 统一的 Suspense 包装：
 * - 使用 PageLoading 作为 fallback
 * - message 会根据传入的 pageName 生成「在加载什么」
 */
const withSuspense = (element: React.ReactNode, pageName?: string) => {
  const message = pageName ? `${pageName}加载中...` : "内容加载中，请稍候...";

  return (
    <Suspense
      fallback={
        <PageLoading
          fullHeight
          message={getIsDesktopApp() ? undefined : message}
        />
      }
    >
      {element}
    </Suspense>
  );
};

const renderMySectionRoute = (section: MySectionDefinition) => {
  if (section.kind === "favorites") {
    return {
      path: section.path,
      element: withSuspense(<MyFavoritesPage />, section.defaultTitle),
    };
  }

  return {
    path: section.path,
    element: withSuspense(<MyContentPage sectionId={section.id} />, section.defaultTitle),
  };
};

const commonRoutes = [
  ...cloudRoutes,
  {
    path: CreateRoutePaths.CREATE_AGENT,
    element: withSuspense(<GuidedAgentCreatePage />, "创建 AI"),
  },
  {
    path: CreateRoutePaths.CREATE_LOCAL_AGENT,
    element: withSuspense(<LocalQuickCreateAgent />, "本地创建 Agent"),
  },
  settingRoutes,
  legacySettingRoutes,
  ...MY_ROUTE_SECTIONS.map(renderMySectionRoute),
  { path: "profile/:userId", element: withSuspense(<CreatorPage />, "个人主页") },
  { path: "share/community", element: withSuspense(<ShareCommunityPage />, "社区分享") },
  { path: "share/:token", element: withSuspense(<ShareImportPage />, "分享内容") },
  {
    path: ":agentPageKey/inbox",
    element: withSuspense(<AgentInboxPage />, "Agent 收件箱"),
  },
  { path: ":pageKey", element: withSuspense(<PageLoader />, "页面内容") },
];

export const routes = () => [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      ...commonRoutes,
      { index: true, element: <Home /> },

      // 按页面给出清晰的加载文案
      { path: "lab", element: withSuspense(<Lab />, "实验室页面") },
      {
        path: "pricing",
        element: withSuspense(<PricePage />, "定价与套餐信息"),
      },
      {
        path: "recharge",
        element: withSuspense(<RechargePage />, "充值页面"),
      },
      {
        path: AppRoutePaths.CHAT.slice(1),
        element: withSuspense(<NewChatPage />, "新对话"),
      },
      {
        path: AppRoutePaths.GUIDE.slice(1),
        element: withSuspense(<QuickStartGuidePage />, "使用指南"),
      },
      {
        path: "privacy",
        element: withSuspense(<PrivacyPolicyPage />, "隐私政策"),
      },
      {
        path: "terms",
        element: withSuspense(<TermsOfServicePage />, "服务条款"),
      },
      {
        path: "aup",
        element: withSuspense(<AUPPage />, "AIGC使用规范"),
      },
      {
        path: "about",
        element: withSuspense(<AboutPage />, "关于我们"),
      },
      {
        path: "contact",
        element: withSuspense(<ContactPage />, "联系我们"),
      },
      {
        path: AppRoutePaths.CLIENT_DOWNLOADS.slice(1),
        element: withSuspense(<ClientDownloadsPage />, "客户端下载"),
      },
      {
        path: AppRoutePaths.NOTIFICATIONS.slice(1),
        element: withSuspense(<NotificationsPage />, "通知中心"),
      },
      {
        path: AppRoutePaths.SPACE_INVITE.slice(1),
        element: withSuspense(<SpaceInvite />, "空间邀请"),
      },
      spaceRoutes,
      {
        path: "explore",
        element: withSuspense(<AgentExplore />, "智能体广场"),
      },
      {
        path: "admin/email",
        element: <Navigate to={ADMIN_EMAIL_PATH} replace />,
      },
      {
        path: "dev/email-e2e",
        element: withSuspense(<AgentEmailE2EPage />, "Agent Email E2E"),
      },
    ],
  },
];
