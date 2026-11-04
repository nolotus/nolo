import { mergeSharedHistoryItems } from "./sharedHistoryMerge";
import { isAgentRowUnread } from "./sidebar/agentUnread";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "app/routing";
import { toTimestamp, type MyContentListItem } from "app/utils/myContentItems";
import { parseDialogKey } from "database/dialogKey";
import { useDialogEventTimestamps } from "create/space/spaceDialogStore";
import { isRoutableContentActive } from "create/space/contentKeyUtils";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import { useAppSelector } from "app/store";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import type { HomeScope } from "./homeScopeProjection";
import { useSharedSpaceDialogPages } from "database/hooks/useSharedSpaceDialogPages";
import { normalizeSpaceId } from "database-engine/spaceLinkAccess";
import SidebarItemRow from "create/space/SidebarItemRow";
import { SidebarItemMoreMenu } from "create/space/SidebarItemMoreMenu";
import { MenuPopover } from "render/web/ui/MenuPopover";

const ignoreMenuToggle = (_key: string | null): void => {};
const AUTO_LOAD_MIN_INTERVAL_MS = 1000;

type DialogPages = {
  error: string | null;
  loading: boolean;
  hasMore: boolean;
  pendingSourceCount?: number;
  loadMore: (options?: { retryFailed?: boolean }) => Promise<void>;
};

export function WorkDialogGroupsPreview({
  items, userId, homeScope = { kind: "all" }, includeNonDialogs = false, paginationOwner = false, ownedPages, unreadAgentKeys,
}: { items: readonly MyContentListItem[]; userId: string; homeScope?: HomeScope; includeNonDialogs?: boolean; paginationOwner?: boolean; ownedPages?: DialogPages; unreadAgentKeys?: Set<string> }) {
  if (!userId) return null;
  return <section aria-label="工作状态" data-hook="work-dialog-groups">
    <WorkDialogGroupsExpanded items={items} userId={userId} homeScope={homeScope} includeNonDialogs={includeNonDialogs} paginationOwner={paginationOwner} ownedPages={ownedPages} unreadAgentKeys={unreadAgentKeys} />
  </section>;
}

function WorkDialogGroupsExpanded({ items, userId, homeScope, includeNonDialogs, paginationOwner, ownedPages, unreadAgentKeys }: { items: readonly MyContentListItem[]; userId: string; homeScope: HomeScope; includeNonDialogs: boolean; paginationOwner: boolean; ownedPages?: DialogPages; unreadAgentKeys?: Set<string> }) {
  const dialogEventTimestamps = useDialogEventTimestamps();
  const location = useLocation();
  const currentSpaceId = useCurrentSpaceId();
  const runtime = useAppSelector(selectRuntimeSnapshot);
  const memberSpaces = useAllMemberSpaces();
  const sharedEnabled = homeScope.kind !== "project" &&
    Boolean(runtime.currentUserId && runtime.currentToken) && runtime.currentUserId === userId;
  const sharedPages = useSharedSpaceDialogPages({
    enabled: sharedEnabled,
    spaceIds: memberSpaces.map((space) => space.spaceId),
    account: runtime.currentUserId ?? "",
    token: runtime.currentToken ?? "",
    origins: runtime.syncServers,
  });
  const memberSpaceIds = useMemo(() => new Set(memberSpaces
    .map((space) => normalizeSpaceId(space.spaceId))
    .filter((spaceId): spaceId is string => Boolean(spaceId))), [memberSpaces]);
  const sharedItems = useMemo(() => sharedEnabled ? mergeSharedHistoryItems(sharedPages.records.filter((record) =>
    record.type === "dialog" && record.ownerUserId && record.ownerUserId !== userId &&
    parseDialogKey(record.contentKey)?.userId === record.ownerUserId &&
    memberSpaceIds.has(normalizeSpaceId(record.spaceId) ?? "")
  )) : [], [sharedEnabled, sharedPages.records, userId, memberSpaceIds]);
  const sharedKeys = useMemo(() => new Set(sharedItems.map((item) => item.contentKey)), [sharedItems]);
  const contentByKey = useMemo(() => new Map(items.map((item) => [item.contentKey, item])), [items]);
  const titles = useMemo(() => new Map([...items, ...sharedItems].map((item) => [item.contentKey, item.title] as const)), [items, sharedItems]);
  const pinnedByKey = useMemo(() => new Map(items.map((item) => [item.contentKey, Boolean(item.pinned)])), [items]);

  const rows = useMemo(() => {
    const byKey = new Map<string, { key: string; updatedAt: number; item: MyContentListItem | (typeof sharedItems)[number]; shared: boolean }>();
    const add = (item: MyContentListItem | (typeof sharedItems)[number], shared: boolean) => {
      const parsed = item.type === "dialog" ? parseDialogKey(item.contentKey) : null;
      if (item.type === "dialog") {
        if (!parsed || (!shared && parsed.userId !== userId && parsed.userId !== "local")) return;
      } else if (!includeNonDialogs || homeScope.kind === "project") return;
      const now = Date.now();
      const eventAt = !shared && parsed?.userId === userId ? dialogEventTimestamps[parsed.dialogId] : undefined;
      const sourceAt = toTimestamp(item.updatedAt);
      const updatedAt = Math.max(Number.isFinite(sourceAt) && sourceAt <= now ? sourceAt : 0,
        typeof eventAt === "number" && Number.isFinite(eventAt) && eventAt <= now ? eventAt : 0);
      const previous = byKey.get(item.contentKey);
      if (!previous || updatedAt > previous.updatedAt) byKey.set(item.contentKey, { key: item.contentKey, updatedAt, item, shared });
    };
    items.forEach((item) => add(item, false));
    sharedItems.forEach((item) => add(item, true));
    return [...byKey.values()].sort((a, b) => b.updatedAt - a.updatedAt || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  }, [items, sharedItems, userId, dialogEventTimestamps, includeNonDialogs, homeScope.kind]);
  const total = rows.length;
  const sharedPagesView = sharedPages as typeof sharedPages & { deferredSourceCount?: number; actionableSourceCount?: number };
  const sharedDeferred = sharedEnabled ? (sharedPagesView.deferredSourceCount ?? 0) : 0;
  const sharedFailedCount = sharedEnabled ? (sharedPages.failedSourceCount ?? 0) : 0;
  const ownedFailed = Boolean(ownedPages?.error);
  const ownedBusy = Boolean(ownedPages?.loading);
  const hardFailure = ownedFailed || sharedFailedCount > 0;
  const partialFailure = hardFailure || sharedDeferred > 0;
  const sharedActionable = sharedEnabled && (sharedPagesView.actionableSourceCount === undefined
    ? (sharedPages.hasMoreSpaces.length > 0 || sharedFailedCount > 0)
    : sharedPagesView.actionableSourceCount > 0);
  // loading is aggregate: a slow origin must not block another origin's next page.
  // B1 owns per-origin in-flight exclusion; legacy callers retain the busy fallback.
  const ownedHealthyPending = Boolean(ownedPages && ownedPages.hasMore &&
    (ownedPages.pendingSourceCount ?? (!ownedBusy && !ownedFailed ? 1 : 0)) > 0);
  const ownedActionable = ownedHealthyPending || Boolean(ownedPages && !ownedBusy && ownedFailed);
  const sharedHealthyPending = sharedEnabled && sharedActionable &&
    (sharedPages.pendingSourceCount ?? (sharedFailedCount > 0 ? 0 : sharedPages.hasMoreSpaces.length)) > 0;
  const loading = (ownedBusy || (sharedEnabled && sharedPages.loadingSpaces.length > 0)) && !ownedActionable && !sharedActionable;
  const canLoadMore = ownedActionable || sharedActionable || partialFailure || loading;
  const failed = hardFailure;
  const controlLabel = loading ? "正在加载对话…" : failed ? "重试加载" : (ownedActionable || sharedActionable) ? "加载更多对话" : "稍后重试";
  const controlDisabled = loading || !(ownedActionable || sharedActionable || (sharedFailedCount > 0 && sharedPages.loadingSpaces.length === 0));
  const [autoLoadStalled, setAutoLoadStalled] = useState(false);
  const autoLoadActive = typeof IntersectionObserver !== "undefined" && !autoLoadStalled && (ownedHealthyPending || sharedHealthyPending);

  const loadCombined = (manual = false) => {
    const tasks: Promise<unknown>[] = [];
    if (ownedPages && (manual ? ownedActionable : ownedHealthyPending)) {
      tasks.push(ownedPages.loadMore({ retryFailed: manual && ownedFailed }));
    }
    if (sharedEnabled && (manual ? (sharedActionable || (sharedFailedCount > 0 && sharedPages.loadingSpaces.length === 0)) : sharedHealthyPending)) {
      tasks.push((sharedPages.loadMore as (spaceId?: string, options?: { retryFailed?: boolean }) => Promise<void>)(undefined, { retryFailed: manual && sharedFailedCount > 0 }));
    }
    void Promise.allSettled(tasks);
  };
  const autoLoadSentinelRef = useRef<HTMLDivElement | null>(null);
  const autoLoadVisibleRef = useRef(false);
  const autoLoadTriggerRef = useRef(loadCombined);
  const autoLoadFromTotalRef = useRef<number | null>(null);
  const autoLoadEmptyRoundsRef = useRef(0);
  const autoLoadLastTriggerAtRef = useRef(0);
  const autoLoadCanLoadMoreRef = useRef(canLoadMore);
  const autoLoadTotalRef = useRef(total);
  autoLoadTriggerRef.current = loadCombined;
  autoLoadCanLoadMoreRef.current = canLoadMore;
  autoLoadTotalRef.current = total;
  useEffect(() => {
    if (!autoLoadActive) return;
    const node = autoLoadSentinelRef.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const flush = () => {
      timer = undefined;
      if (disposed || !autoLoadVisibleRef.current || !autoLoadCanLoadMoreRef.current) return;
      const from = autoLoadFromTotalRef.current;
      const current = autoLoadTotalRef.current;
      // 按「一轮完成后的净增量」判进展：上一轮发起时的条目数没被超过 = 那一轮空转。
      if (from !== null && current <= from) {
        autoLoadEmptyRoundsRef.current += 1;
        if (autoLoadEmptyRoundsRef.current >= 2) {
          // 连续两轮拿不回新行：停手，让渲染分支退回手动按钮，不再无限自动重试。
          setAutoLoadStalled(true);
          return;
        }
      } else {
        autoLoadEmptyRoundsRef.current = 0;
      }
      autoLoadLastTriggerAtRef.current = Date.now();
      autoLoadFromTotalRef.current = current;
      autoLoadTriggerRef.current();
      // 自己接着守候下一轮：一次发起如果没有改变任何 effect 依赖，就不会有新的
      // observer 通知，链条会在这里断掉，stall 计数也永远累计不到 2。
      schedule();
    };
    // 节流不能「直接 return 丢掉这次机会」：observer 只在可见性变化时通知，
    // 一页若在闸门窗口内加载完，重订阅后的首次通知会被丢掉、哨兵又一直可见，
    // 自动续页就永久停住且没有手动入口。这里改成「到期后再确认一次」。
    const schedule = () => {
      if (timer !== undefined || disposed) return;
      const wait = Math.max(0, AUTO_LOAD_MIN_INTERVAL_MS - (Date.now() - autoLoadLastTriggerAtRef.current));
      timer = setTimeout(() => { flush(); }, wait);
    };
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      autoLoadVisibleRef.current = visible;
      if (visible) schedule();
    }, { rootMargin: "240px 0px" });
    observer.observe(node);
    return () => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      observer.disconnect();
    };
  }, [autoLoadActive, total]);

  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const menuAnchorKeyRef = useRef<string | null>(null);
  const [editRequest, setEditRequest] = useState<{ key: string; nonce: number } | null>(null);
  const handleMenuAnchorChange = useCallback((key: string, el: HTMLElement | null) => {
    if (el) { menuAnchorKeyRef.current = key; setMenuAnchorEl(el); return; }
    if (menuAnchorKeyRef.current === key) { menuAnchorKeyRef.current = null; setMenuAnchorEl(null); }
  }, []);
  const closeMenu = useCallback(() => { setActiveMenuKey(null); menuAnchorKeyRef.current = null; setMenuAnchorEl(null); }, []);
  const activeItem = activeMenuKey ? contentByKey.get(activeMenuKey) : undefined;

  return <div data-hook="home-work-dialog-list" className="home-work-dialog-list">
    {total === 0 ? <p role={partialFailure ? "alert" : undefined}>{partialFailure ? "加载失败，请稍后重试。" : includeNonDialogs ? "暂无已加载的内容。" : "暂无已加载的对话。"}</p> : <div aria-label={includeNonDialogs ? "最近活动内容" : "最近活动对话"}>
      {rows.map(({ key, item, shared }) => {
        const isActive = isRoutableContentActive({ contentKey: key, type: item.type.toLowerCase(), userId, spaceId: currentSpaceId, currentPath: location.pathname });
        if (item.type !== "dialog") return <div key={key}><SidebarItemRow contentKey={key} sourceServerOrigin={"serverOrigin" in item ? item.serverOrigin : undefined} type={item.type.toLowerCase()} title={item.title || key} isActive={isActive} isMenuOpen={activeMenuKey === key} onToggleMenu={setActiveMenuKey} onMenuAnchorChange={handleMenuAnchorChange} editSignal={editRequest?.key === key ? editRequest.nonce : undefined} pinned={"pinned" in item && Boolean(item.pinned)} hasUnread={item.type.toLowerCase() === "agent" ? isAgentRowUnread(unreadAgentKeys, key, userId) : undefined} /></div>;
        const content = contentByKey.get(key);
        const ownerId = parseDialogKey(key)?.userId;
        const summary = !shared && content?.type === "dialog" && (ownerId === userId || ownerId === "local") ? content : undefined;
        return <div key={key}>
          <SidebarItemRow contentKey={key} type="dialog" title={titles.get(key) || key} disableAutoRead summaryStatus={summary && "status" in summary ? summary.status : undefined} summaryUnreadAt={summary && "unreadAt" in summary ? summary.unreadAt : undefined} isActive={isActive} isMenuOpen={!shared && activeMenuKey === key} readOnly={shared} onToggleMenu={shared ? ignoreMenuToggle : setActiveMenuKey} onMenuAnchorChange={shared ? undefined : handleMenuAnchorChange} editSignal={shared ? undefined : editRequest?.key === key ? editRequest.nonce : undefined} pinned={shared ? false : pinnedByKey.get(key) ?? false} />
        </div>;
      })}
    </div>}
    {partialFailure && <p role="status">部分对话暂时未能加载，已显示的对话仍可打开。</p>}
    {canLoadMore && <>
      {autoLoadActive && <div ref={autoLoadSentinelRef} data-hook="work-dialog-autoload-sentinel" aria-hidden="true" />}
      {(!autoLoadActive || partialFailure) && <button type="button" disabled={controlDisabled} onClick={() => loadCombined(true)}>{controlLabel}</button>}
    </>}
    {activeMenuKey && !sharedKeys.has(activeMenuKey) && menuAnchorEl && <MenuPopover triggerRef={{ current: menuAnchorEl }} isOpen onOpenChange={(open) => { if (!open) closeMenu(); }} placement="bottom end">
      <SidebarItemMoreMenu contentKey={activeMenuKey} title={titles.get(activeMenuKey) || activeMenuKey} type={activeItem?.type ?? "dialog"} fileCategory={(activeItem as { fileCategory?: string | null } | undefined)?.fileCategory ?? null} sourceServerOrigin={activeItem?.serverOrigin} spaceId={currentSpaceId} canEditInSpace={Boolean(currentSpaceId) && !sharedKeys.has(activeMenuKey)} canMoveToSpace={!sharedKeys.has(activeMenuKey)} showDownloadAction={false} menuAnchorEl={menuAnchorEl} onEditTitle={() => { setEditRequest({ key: activeMenuKey, nonce: Date.now() }); closeMenu(); }} onClose={closeMenu} />
    </MenuPopover>}
  </div>;
}
