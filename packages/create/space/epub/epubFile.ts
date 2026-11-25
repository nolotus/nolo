// create/space/epub/epubFile.ts
//
// EPUB 文件识别（零依赖小模块）：FilePage / 空间列表只需要「是不是 EPUB」，
// 不应为此把 pizzip 解析层拽进首屏 chunk。

export const EPUB_MIME_TYPE = "application/epub+zip";

/** mime 优先；旧文件可能是 application/octet-stream，所以同时认 .epub 扩展名。 */
export const isEpubFile = (item: {
  title?: unknown;
  originalName?: unknown;
  mimeType?: unknown;
}): boolean => {
  const mime =
    typeof item.mimeType === "string" ? item.mimeType.trim().toLowerCase() : "";
  if (mime === EPUB_MIME_TYPE) return true;
  return [item.title, item.originalName].some(
    (name) => typeof name === "string" && name.trim().toLowerCase().endsWith(".epub")
  );
};

/**
 * 只有「文件类」空间条目才会打开阅读器：type 为 file 且 contentKey 是 file- 键。
 * 否则标题恰好以 .epub 结尾的页面 / 对话 / 应用会同时命中别的预览分支。
 */
export const isEpubReaderTarget = (item: {
  type?: unknown;
  contentKey?: unknown;
  title?: unknown;
  originalName?: unknown;
  mimeType?: unknown;
}): boolean =>
  typeof item.type === "string" &&
  item.type.toLowerCase() === "file" &&
  typeof item.contentKey === "string" &&
  item.contentKey.startsWith("file-") &&
  isEpubFile(item);
