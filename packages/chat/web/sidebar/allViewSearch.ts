import type { MyContentListItem } from "app/utils/myContentItems";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
export { isRoutableContentActive } from "create/space/contentKeyUtils";

export type FavoriteSearchRecord = {
  type?: string;
  title?: string;
  name?: string;
  fileCategory?: string | null;
  spaceId?: string | null;
};

const normalizeSearchText = (value: unknown): string =>
  asTrimmedLowercaseString(value);

export const isAllViewDialogImageAttachment = (item: {
  type?: string | null;
  fileCategory?: string | null;
  spaceId?: string | null;
}): boolean => {
  const normalizedType = normalizeSearchText(item.type);
  const normalizedFileCategory = normalizeSearchText(item.fileCategory);
  const hasSpace = typeof item.spaceId === "string" && item.spaceId.trim().length > 0;

  return normalizedType === "file" && normalizedFileCategory === "image" && !hasSpace;
};

export const matchesAllViewSearch = (
  searchQuery: string,
  ...values: Array<unknown>
): boolean => {
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  if (!normalizedSearchQuery) return false;

  return values.some((value) =>
    normalizeSearchText(value).includes(normalizedSearchQuery)
  );
};

export const filterAllViewRecentItems = (
  items: MyContentListItem[],
  searchQuery: string
): MyContentListItem[] => {
  return items.filter((item) =>
    matchesAllViewSearch(
      searchQuery,
      item.title,
      item.type,
      item.spaceName,
      item.contentKey
    )
  );
};

export const filterAllViewFavoriteKeys = (
  favoriteKeys: string[],
  favoriteRecordsByKey: Record<string, FavoriteSearchRecord | undefined>,
  searchQuery: string
): string[] => {
  return favoriteKeys.filter((favoriteKey) => {
    const record = favoriteRecordsByKey[favoriteKey];
    return matchesAllViewSearch(
      searchQuery,
      record?.title,
      record?.name,
      record?.type,
      record?.spaceId,
      favoriteKey
    );
  });
};

