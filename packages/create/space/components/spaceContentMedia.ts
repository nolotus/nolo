import { isImageResourceLike } from "app/utils/fileUtils";
import { buildDatabaseFileContentUrl } from "database/fileUrl";

export interface MinimalContentMediaItem {
  type?: string;
  contentKey: string;
  title?: string;
  fileCategory?: string;
  mimeType?: string;
  /** Prefer when content is hosted on a non-default origin (my-content cross-server). */
  serverOrigin?: string | null;
}

export const isSpaceContentImage = (item: MinimalContentMediaItem): boolean =>
  isImageResourceLike({
    kind: item.type,
    fileCategory: item.fileCategory,
    fileName: item.title,
  }) || item.contentKey.startsWith("image-");

export const buildSpaceContentImageUrl = (
  currentServer: string | null | undefined,
  item: MinimalContentMediaItem
): string | null => {
  if (!isSpaceContentImage(item)) return null;
  return buildDatabaseFileContentUrl(
    currentServer,
    encodeURIComponent(item.contentKey)
  );
};

export const getSpaceContentImageFallbackFileIds = (
  item: MinimalContentMediaItem
): string[] => {
  const fileIds = [item.contentKey];
  if (item.contentKey.startsWith("image-")) {
    fileIds.push(`file-${item.contentKey.slice("image-".length)}`);
  }
  return fileIds;
};
