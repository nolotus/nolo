import { useInsertionEffect } from "react";

const SETTINGS_CSS_HREF = "/public/route-styles/settings.css";

function ensureStylesheetInHead(href: string) {
  if (typeof document === "undefined") return;
  if (document.head.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/**
 * 偏好设置的样式已完全静态合并入主样式表（entry.css），
 * 无需再动态插入 link 标签，从而在 Web 和桌面端都 100% 根绝了 FOUC 闪烁和静态资源 404。
 */
export function useSettingsStylesheet() {
  // no-op
}
