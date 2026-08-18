import { useMemo } from "react";

export type ContentKeyType =
  | "app"
  | "page"
  | "meta"
  | "dialog"
  | "image"
  | "file"
  | "agent"
  | "task"
  | "other"
  | "unknown";

export interface TopBarProps {
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const getSideChatLabels = (
  t: (key: string, fallback?: string) => string,
  type: ContentKeyType
) => {
  switch (type) {
    case "app":
      return {
        open: t("showAppAssistant", "打开应用 AI"),
        hide: t("hideAppAssistant", "隐藏应用 AI"),
      };
    case "page":
      return {
        open: t("showDocAssistant", "打开文档 AI"),
        hide: t("hideDocAssistant", "隐藏文档 AI"),
      };
    case "meta":
      return {
        open: t("showTableAssistant", "打开表格 AI"),
        hide: t("hideTableAssistant", "隐藏表格 AI"),
      };
    case "image":
      return {
        open: t("showImageAssistant", "打开图片 AI"),
        hide: t("hideImageAssistant", "隐藏图片 AI"),
      };
    case "file":
      return {
        open: t("showFileAssistant", "打开文件 AI"),
        hide: t("hideFileAssistant", "隐藏文件 AI"),
      };
    default:
      return {
        open: t("showAssistant", "打开页面 AI"),
        hide: t("hideAssistant", "隐藏页面 AI"),
      };
  }
};

/** 判断是否 Mac，用于快捷键提示 */
export const useIsMac = (): boolean =>
  useMemo(
    () =>
      typeof window !== "undefined" &&
      /Mac|iPod|iPhone|iPad/.test(window.navigator.platform),
    []
  );

/** 纯函数：根据路由中的 pageKey 推断当前内容类型 */
export const getContentKeyType = (
  pageKey?: string,
  pageType?: string,
  appKey?: string
): ContentKeyType => {
  if (appKey) return "app";
  if (!pageKey) return "unknown";
  if (pageType === "image") return "image";
  if (pageType === "file") return "file";
  if (pageKey.startsWith("file")) return "file";
  if (pageKey.startsWith("image")) return "image";
  if (pageKey.startsWith("page")) return "page";
  if (pageKey.startsWith("meta")) return "meta";
  if (pageKey.startsWith("dialog")) return "dialog";
  if (pageKey.startsWith("task")) return "task";
  // legacy cybot- 内容键一律按 agent 处理
  if (pageKey.startsWith("cybot")) return "agent";
  if (pageKey.startsWith("agent")) return "agent";
  return "other";
};

/** 钩子：根据路由中的 pageKey 推断当前内容类型 */
export const useContentKeyType = (
  pageKey?: string,
  pageType?: string,
  appKey?: string
): ContentKeyType =>
  useMemo(
    () => getContentKeyType(pageKey, pageType, appKey),
    [appKey, pageKey, pageType]
  );
