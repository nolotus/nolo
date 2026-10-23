import React, { useMemo } from "react";
import type { MyContentListItem } from "app/utils/myContentItems";
import { mergeOwnedHistoryItems } from "./mergeOwnedHistoryItems";
import { useOwnedDialogPages } from "database/hooks/useOwnedDialogPages";
import { WorkDialogGroupsPreview } from "./WorkDialogGroupsPreview";
import type { HomeScope } from "./homeScopeProjection";

type Props = { homeScope?: HomeScope; items: readonly MyContentListItem[]; userId: string; enabled?: boolean; includeNonDialogs?: boolean };

/**
 * Add user-owned remote history to the existing local/hydrated window.
 * Shared Space history is separately fetched from authorized member spaces; it is not exhaustive.
 * Never replace the cached list with remote results on loading/error.
 */
export function WorkDialogHistory({ items, userId, enabled = true, homeScope = { kind: "all" }, includeNonDialogs = false }: Props) {
  const remoteEnabled = enabled && homeScope.kind !== "project";
  const pages = useOwnedDialogPages(remoteEnabled && Boolean(userId));
  const merged = useMemo(() => mergeOwnedHistoryItems(items, remoteEnabled ? pages.records : [], userId), [items, pages.records, userId, remoteEnabled]);

  return <>
    <WorkDialogGroupsPreview items={merged} userId={userId} homeScope={homeScope} includeNonDialogs={includeNonDialogs} paginationOwner={remoteEnabled} ownedPages={pages} />

  </>;
}
