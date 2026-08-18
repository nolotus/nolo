// 文件路径: render/layout/MobileDownloadBanner.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "app/routing";
import { LuDownload, LuX } from "react-icons/lu";
import { useIsMobile } from "app/hooks/useIsMobile";
import { isDesktopApp } from "app/utils/env";
import "./MobileDownloadBanner.css";

export const MobileDownloadBanner: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile(768);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 1. 如果不是移动端，或者是客户端壳子，或者已经手动关闭过，则不显示
    if (!isMobile || isDesktopApp) {
      setVisible(false);
      return;
    }

    const isDismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem("nolo-mobile-download-banner-dismissed") === "true";

    if (isDismissed) {
      setVisible(false);
      return;
    }

    // 2. 避免在下载页面、登录、注册页面本身渲染
    const hideOnRoutes = ["/downloads", "/login", "/signup"];
    if (hideOnRoutes.includes(location.pathname)) {
      setVisible(false);
      return;
    }

    // 延迟少许展示以触发流畅的滑入动画
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [isMobile, location.pathname]);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nolo-mobile-download-banner-dismissed", "true");
    }
  };

  const handleNavigate = () => {
    navigate("/downloads");
  };

  if (!visible) return null;

  return (
    <div className="mobile-download-banner">
      <button
        type="button"
        className="mobile-download-banner__content"
        onClick={handleNavigate}
      >
        <div className="mobile-download-banner__icon-box" aria-hidden="true">
          <LuDownload size={18} className="mobile-download-banner__dl-icon" aria-hidden="true" />
        </div>
        <div className="mobile-download-banner__text">
          <div className="mobile-download-banner__title">
            {t("downloadClientPromptTitle", "体验原生客户端")}
          </div>
          <div className="mobile-download-banner__subtitle">
            {t("downloadClientPromptSub", "响应更快，后台常驻，体验大幅升级")}
          </div>
        </div>
      </button>
      <div className="mobile-download-banner__actions">
        <button
          type="button"
          className="mobile-download-banner__btn"
          onClick={handleNavigate}
        >
          <span>{t("downloadNowShort", "立即下载")}</span>
        </button>
        <button
          type="button"
          className="mobile-download-banner__close"
          onClick={handleDismiss}
          aria-label={t("close", "关闭")}
        >
          <LuX size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
