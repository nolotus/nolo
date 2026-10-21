import type { MyContentListItem } from "app/utils/myContentItems";
import { mergeHistoryItems, type HistorySummary } from "./sharedHistoryMerge";

export function mergeOwnedHistoryItems(cached: readonly MyContentListItem[], pages: readonly HistorySummary[], userId: string): MyContentListItem[] {
  return mergeHistoryItems(cached, pages, userId);
}
