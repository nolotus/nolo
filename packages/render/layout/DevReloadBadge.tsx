import "./layout.css";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStaleBuildPrompt, waitUntilServerReadyThenReload } from "./useStaleBuildPrompt";

export const DevReloadBadge: React.FC = () => {
  const { t } = useTranslation();
  const stale = useStaleBuildPrompt();
  const [checking, setChecking] = useState(false);
  if (!stale) return null;

  const label = checking
    ? t("devReload.checking", "正在等待更新完成，马上自动刷新…")
    : t("devReload.badge", "New build available, click to reload");

  const handleClick = () => {
    if (checking) return;
    setChecking(true);
    // 先等 drain 窗口结束（新进程接管 /api/core/meta），再顶层导航，
    // 避免浏览器把 503 core_draining 裸 JSON 渲染成页面。超时兜底照常刷新。
    void waitUntilServerReadyThenReload().finally(() =>
      window.location.reload()
    );
  };

  return (
    <button
      type="button"
      className={`DevReloadBadge ${checking ? "DevReloadBadge--checking" : ""}`}
      onClick={handleClick}
      title={label}
      aria-label={label}
      aria-busy={checking}
    />
  );
};
