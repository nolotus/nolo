import React, { useMemo } from "react";
import type { MyContentListItem } from "app/utils/myContentItems";
import { mergeOwnedHistoryItems } from "./mergeOwnedHistoryItems";
import { useOwnedDialogPages } from "database/hooks/useOwnedDialogPages";
import { WorkDialogGroupsPreview } from "./WorkDialogGroupsPreview";
import type { HomeScope } from "./homeScopeProjection";

type Props = { homeScope?: HomeScope; items: readonly MyContentListItem[]; userId: string; enabled?: boolean };

/**
 * Add user-owned remote history to the existing local/hydrated window.
 * Shared Space history is separately fetched from authorized member spaces; it is not exhaustive.
 * Never replace the cached list with remote results on loading/error.
 */
export function WorkDialogHistory({ items, userId, enabled = true, homeScope = { kind: "all" } }: Props) {
  const remoteEnabled = enabled && homeScope.kind !== "project";
  const pages = useOwnedDialogPages(remoteEnabled && Boolean(userId));
  const merged = useMemo(() => mergeOwnedHistoryItems(items, remoteEnabled ? pages.records : [], userId), [items, pages.records, userId, remoteEnabled]);

  return <>
    <WorkDialogGroupsPreview items={merged} userId={userId} homeScope={homeScope} />
    {remoteEnabled && pages.error && <p role="alert">历史对话加载失败：{pages.error}。已加载的对话仍可访问。</p>}
    {remoteEnabled && pages.loading && <p role="status">正在加载历史对话…</p>}
    {remoteEnabled && pages.error && <button type="button" disabled={pages.loading}
      onClick={() => void pages.loadMore()}>重试本人历史来源</button>}
    {remoteEnabled && !pages.error && pages.hasMore && <button type="button" disabled={pages.loading}
      onClick={() => void pages.loadMore()}>加载更多本人历史来源</button>}
    {remoteEnabled && <small>列表包含本人远端历史与已授权共享 Space 历史；共享历史仅覆盖 Space contents，可能因非事务写入而漏项。</small>}
  </>;
}
