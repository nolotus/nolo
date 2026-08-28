import type { TFunction } from "i18next";
import { ContentType, type FileCategory } from "app/types";

export const getFileCategoryLabel = (
  category: FileCategory | undefined,
  t: TFunction
): string => {
  switch (category) {
    case "image":
      return t("images", "图片");
    case "document":
      return t("documentAttachment", "文档附件");
    case "video":
      return t("videoAttachment", "视频");
    case "audio":
      return t("audioAttachment", "音频");
    default:
      return t("attachment", "其他附件");
  }
};

export const getSpaceContentTypeLabel = (
  item: { type?: string; contentKey?: string; fileCategory?: FileCategory },
  t: TFunction
): string => {
  const type = item.type?.toLowerCase();
  const key = item.contentKey || "";

  if (type === ContentType.DIALOG || key.startsWith("dialog-")) {
    return t("dialogs", "对话");
  }
  if (type === ContentType.DOC || key.startsWith("page-")) {
    return t("pages", "文档");
  }
  if (type === "table" || key.startsWith("meta-")) {
    return t("tables", "表格");
  }
  if (type === ContentType.APP || key.startsWith("app-")) {
    return t("apps", "应用");
  }
  if (
    type === ContentType.IMAGE ||
    key.startsWith("image-") ||
    item.fileCategory === "image"
  ) {
    return t("images", "图片");
  }
  if (type === ContentType.AGENT || key.startsWith("agent-")) {
    return t("agents", "AI");
  }
  if (type === ContentType.FILE) {
    return getFileCategoryLabel(item.fileCategory, t);
  }

  return type || t("content", "内容");
};
