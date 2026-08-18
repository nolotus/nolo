// packages/create/space/contentLabels.ts
var getFileCategoryLabel = (category, t) => {
  switch (category) {
    case "image":
      return t("images", "\u56FE\u7247");
    case "document":
      return t("documentAttachment", "\u6587\u6863\u9644\u4EF6");
    case "video":
      return t("videoAttachment", "\u89C6\u9891");
    case "audio":
      return t("audioAttachment", "\u97F3\u9891");
    default:
      return t("attachment", "\u5176\u4ED6\u9644\u4EF6");
  }
};
var getSpaceContentTypeLabel = (item, t) => {
  const type = item.type?.toLowerCase();
  const key = item.contentKey || "";
  if (type === "dialog" /* DIALOG */ || key.startsWith("dialog-")) {
    return t("dialogs", "\u5BF9\u8BDD");
  }
  if (type === "page" /* DOC */ || key.startsWith("page-")) {
    return t("pages", "\u6587\u6863");
  }
  if (type === "table" || key.startsWith("meta-")) {
    return t("tables", "\u8868\u683C");
  }
  if (type === "app" /* APP */ || key.startsWith("app-")) {
    return t("apps", "\u5E94\u7528");
  }
  if (type === "image" /* IMAGE */ || key.startsWith("image-") || item.fileCategory === "image") {
    return t("images", "\u56FE\u7247");
  }
  if (type === "agent" /* AGENT */ || key.startsWith("agent-")) {
    return t("agents", "AI");
  }
  if (type === "file" /* FILE */) {
    return getFileCategoryLabel(item.fileCategory, t);
  }
  return type || t("content", "\u5185\u5BB9");
};

export {
  getSpaceContentTypeLabel
};
