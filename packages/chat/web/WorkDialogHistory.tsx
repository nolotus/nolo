import React, { useMemo } from "react";
import type { MyContentListItem } from "app/utils/myContentItems";
import { normalizeSpaceId } from "database-engine/spaceLinkAccess";
import { mergeOwnedHistoryItems } from "./mergeOwnedHistoryItems";
import { useOwnedDialogPages } from "database/hooks/useOwnedDialogPages";
import { WorkDialogGroupsPreview } from "./WorkDialogGroupsPreview";
import type { HomeScope } from "./homeScopeProjection";
import type { SidebarTypeFilterId } from "./sidebar/SidebarTypeFilter";

type Props = {
  homeScope?: HomeScope;
  onSelectHomeScope?: (scope: HomeScope) => void;
  items: readonly MyContentListItem[];
  userId: string;
  enabled?: boolean;
  includeNonDialogs?: boolean;
  /** 有效类型筛选（由 ChatSidebar 用 chip 同一套解析算出的唯一真值）。 */
  typeFilter?: SidebarTypeFilterId;
  unreadAgentKeys?: Set<string>;
};

/**
 * Add user-owned remote history to the existing local/hydrated window.
 * Shared Space history is separately fetched from authorized member spaces; it is not exhaustive.
 * Never replace the cached list with remote results on loading/error.
 */
export function WorkDialogHistory({
  items,
  userId,
  enabled = true,
  homeScope = { kind: "all" },
  onSelectHomeScope,
  includeNonDialogs = false,
  typeFilter,
  unreadAgentKeys,
}: Props) {
  const remoteEnabled = enabled && homeScope.kind !== "project";
  const pages = useOwnedDialogPages(remoteEnabled && Boolean(userId));
  const merged = useMemo(() => mergeOwnedHistoryItems(items, remoteEnabled ? pages.records : [], userId), [items, pages.records, userId, remoteEnabled]);
  const scopedMerged = useMemo(() => {
    if (homeScope.kind === "noSpace") {
      return merged.filter((item) => !normalizeSpaceId(item.spaceId));
    }
    return merged;
  }, [merged, homeScope.kind]);

  return <>
    <WorkDialogGroupsPreview
      items={scopedMerged}
      userId={userId}
      homeScope={homeScope}
      onSelectHomeScope={onSelectHomeScope}
      includeNonDialogs={includeNonDialogs}
      typeFilter={typeFilter}
      paginationOwner={remoteEnabled}
      ownedPages={pages}
      unreadAgentKeys={unreadAgentKeys}
    />
  </>;
}

