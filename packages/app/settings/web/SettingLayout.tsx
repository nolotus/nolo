// 文件路径：render/layout/SettingLayout.tsx

import React, { useMemo, Suspense, useCallback } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  type Location as RouterLocation,
} from "app/routing";
import { useTranslation } from "react-i18next";
import { LuX } from "react-icons/lu";
import { BaseModal } from "render/web/ui/modal/BaseModal";
import { Tabs, TabList, Tab } from "render/web/ui/Tabs";
import { useIsMobile } from "app/hooks/useIsMobile";
import { isDesktopApp } from "app/utils/env";
import { buildSettingNavItems } from "../navItems";
import { useSettingsStylesheet } from "./useSettingsStylesheet";

const SIDEBAR_WIDTH = 210;

interface BackgroundState {
  backgroundLocation?: RouterLocation;
}

const SettingLayout: React.FC = () => {
  useSettingsStylesheet();

  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as BackgroundState | undefined;

  // 与 settings.css 的布局断点保持一致：≤768px 时侧栏改为顶部横排导航
  const isMobile = useIsMobile(768);

  const navItems = useMemo(
    () => buildSettingNavItems(t),
    [t]
  );

  const activeKey = useMemo(() => {
    const match = navItems.find(
      (item) =>
        location.pathname === item.path ||
        location.pathname.endsWith(`/${item.path}`)
    );
    return match?.path ?? null;
  }, [navItems, location.pathname]);

  const handleTabChange = useCallback(
    (key: React.Key) => {
      navigate(String(key), { state: location.state, replace: true });
    },
    [navigate, location.state]
  );

  const handleClose = useCallback(() => {
    const background = state?.backgroundLocation;
    if (background) {
      navigate(background, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  const settingsContent = (
    <div className="SettingsModal__container">
      <header className="SettingsModal__header">
        <div>
          <h2 className="SettingsModal__title">
            {t("settings.title", "设置")}
          </h2>
          <p className="SettingsModal__subtitle">
            {t("settings.subtitle", "偏好与账户")}
          </p>
        </div>
        <button
          type="button"
          className="SettingsModal__closeBtn"
          onClick={handleClose}
          aria-label={t("common.close", "关闭")}
        >
          <LuX size={16} aria-hidden="true" />
        </button>
      </header>

      <div className="SettingsLayout">
        <aside className="SettingsLayout__sidebar">
          <Tabs
            className="react-aria-Tabs SettingsLayout__tabs"
            orientation={isMobile ? "horizontal" : "vertical"}
            selectedKey={activeKey ?? undefined}
            onSelectionChange={handleTabChange}
          >
            <TabList
              aria-label={t("settings.title", "设置")}
              className="react-aria-TabList SettingsLayout__nav"
            >
              {navItems.map(({ path, label, Icon }) => (
                <Tab
                  key={path}
                  id={path}
                  className="react-aria-Tab nav-list-item"
                >
                  {Icon && (
                    <span className="nav-list-icon">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                  )}
                  {label}
                </Tab>
              ))}
            </TabList>
          </Tabs>
        </aside>

        <main className="SettingsLayout__content">
          <Suspense
            fallback={
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--textSecondary)",
                }}
              >
                {t("common.loading", "加载中...")}
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );

  if (!state?.backgroundLocation) {
    return <div className="SettingsPage">{settingsContent}</div>;
  }

  return (
    <BaseModal
      isOpen
      onClose={handleClose}
      className={
        // 桌面端窗口再窄也保持浮动弹窗，不切换成全屏移动态
        isDesktopApp ? "SettingsModal SettingsModal--floating" : "SettingsModal"
      }
    >
      {settingsContent}
    </BaseModal>
  );
};

export default SettingLayout;
