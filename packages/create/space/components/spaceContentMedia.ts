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
  spaceId?: string | null;
}

export const isSpaceContentImage = (item: MinimalContentMediaItem): boolean =>
  isImageResourceLike({
    kind: item.type,
    fileCategory: item.fileCategory,
    fileName: item.title,
  }) || item.contentKey.startsWith("image-");

// The file API looks up full keys only when they start with file-.
export const spaceImageFileKey = (key: string): string => key.startsWith("image-") ? `file-${key.slice("image-".length)}` : key;

export const buildSpaceContentImageUrl = (
  currentServer: string | null | undefined,
  item: MinimalContentMediaItem
): string | null => {
  if (!isSpaceContentImage(item)) return null;
  return buildDatabaseFileContentUrl(
    currentServer,
    encodeURIComponent(spaceImageFileKey(item.contentKey))
  );
};

export const getSpaceContentImageFallbackFileIds = (
  item: Pick<MinimalContentMediaItem, "contentKey">
): string[] => {
  const fileIds = [item.contentKey];
  if (item.contentKey.startsWith("image-")) {
    fileIds.push(spaceImageFileKey(item.contentKey));
  }
  return fileIds;
};

/** Use the original IndexedDB key first; normalization is only for remote URLs. */
export async function loadSpaceContentImageBlob(
  contentKey: string,
  readLocal: (fileId: string) => Promise<{ blob: Blob }>,
  isCurrent: () => boolean,
): Promise<Blob | null> {
  for (const fileId of getSpaceContentImageFallbackFileIds({ contentKey })) {
    if (!isCurrent()) return null;
    try {
      const { blob } = await readLocal(fileId);
      return isCurrent() ? blob : null;
    } catch { /* Try the next cache key after a miss. */ }
  }
  return null;
}
