// 文件路径：app/settings/routes.ts
import React, { lazy, Suspense } from "react";
import { Navigate, useLocation, useParams } from "app/routing";
import { SettingRoutePaths } from "./config";
import { resolveLegacySettingsRedirectPathFromParts } from "./legacySettingsPath";
import PageLoading from "render/web/ui/PageLoading";

// Layout 与子页全部 lazy，避免 settings 同步进入主壳 / entry 静态图
const SettingLayout = lazy(() => import("./web/SettingLayout"));
const Appearance = lazy(() => import("./web/Appearance"));
const UserProfile = lazy(() => import("./web/UserProfile"));
const SecuritySettings = lazy(() => import("./web/SecuritySettings"));
const EditorConfig = lazy(() => import("./web/EditorConfig"));
const ChatConfig = lazy(() => import("./web/ChatConfig"));
const Productivity = lazy(() => import("./web/Productivity"));
const SecretsConfig = lazy(() => import("./web/SecretsConfig"));
const MemoryConfig = lazy(() => import("./web/MemoryConfig"));
const DesktopRuntime = lazy(() => import("./web/DesktopRuntime"));
const DesktopUpdates = lazy(() => import("./web/DesktopUpdates"));
const DesktopMachines = lazy(() => import("./web/DesktopMachines"));
const DeveloperConfig = lazy(() => import("./web/DeveloperConfig"));
const SystemBuiltinSkills = lazy(() => import("./web/SystemBuiltinSkills"));

const SettingsFallback = <PageLoading fullHeight message="设置加载中..." />;

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={SettingsFallback}>{element}</Suspense>
);

// ✅ 让 index 重定向时，保留 location.state（尤其是 backgroundLocation）
const SettingsIndexRedirect: React.FC = () => {
  const location = useLocation();
  return (
    <Navigate
      to={SettingRoutePaths.SETTING_APPEARANCE}
      replace
      state={location.state}
    />
  );
};

const LegacySettingsRedirect: React.FC = () => {
  const location = useLocation();
  const params = useParams();
  const legacyPath = params["*"] ? `/${params["*"]}` : "";
  const redirectPath =
    resolveLegacySettingsRedirectPathFromParts(location.pathname, location.search, location.hash) ??
    `/${SettingRoutePaths.SETTING}${legacyPath}${location.search}${location.hash}`;

  return (
    <Navigate
      to={redirectPath}
      replace
      state={location.state}
    />
  );
};

export const settingRoutes = {
  path: SettingRoutePaths.SETTING,
  element: withSuspense(<SettingLayout />),
  children: [
    {
      index: true,
      element: <SettingsIndexRedirect />,
    },
    {
      path: SettingRoutePaths.SETTING_APPEARANCE,
      element: withSuspense(<Appearance />),
    },
    { path: SettingRoutePaths.SETTING_ACCOUNT, element: withSuspense(<UserProfile />) },
    {
      path: SettingRoutePaths.SETTING_SECURITY,
      element: withSuspense(<SecuritySettings />),
    },
    { path: SettingRoutePaths.SETTING_EDITOR, element: withSuspense(<EditorConfig />) },
    { path: SettingRoutePaths.SETTING_CHAT, element: withSuspense(<ChatConfig />) },
    {
      path: SettingRoutePaths.SETTING_PRODUCTIVITY,
      element: withSuspense(<Productivity />),
    },
    {
      path: SettingRoutePaths.SETTING_DEVELOPER,
      element: withSuspense(<DeveloperConfig />),
    },
    {
      path: SettingRoutePaths.SETTING_SYSTEM_SKILLS,
      element: withSuspense(<SystemBuiltinSkills />),
    },
    { path: SettingRoutePaths.SETTING_SECRETS, element: withSuspense(<SecretsConfig />) },
    { path: SettingRoutePaths.SETTING_MEMORY, element: withSuspense(<MemoryConfig />) },
    {
      path: SettingRoutePaths.SETTING_RUNTIME,
      element: withSuspense(<DesktopRuntime />),
    },
    {
      path: SettingRoutePaths.SETTING_MACHINES,
      element: withSuspense(<DesktopMachines />),
    },
    {
      path: SettingRoutePaths.SETTING_UPDATES,
      element: withSuspense(<DesktopUpdates />),
    },
  ],
};

export const legacySettingRoutes = {
  path: `${SettingRoutePaths.SETTING_LEGACY}/*`,
  element: <LegacySettingsRedirect />,
};
