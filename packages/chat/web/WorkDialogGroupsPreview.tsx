import { mergeSharedHistoryItems } from "./sharedHistoryMerge";
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "app/routing";
import { toTimestamp, type MyContentListItem } from "app/utils/myContentItems";
import { useWorkRunListCoverage } from "./useWorkRunListCoverage";
import { getAgentRuns, getAgentRunsVersion, getRemoteTasks, subscribeAgentRuns } from "./agentRunStore";
import { parseDialogKey } from "database/dialogKey";
import { useDialogStatuses, useDialogEventTimestamps } from "create/space/spaceDialogStore";
import { projectWorkDialogData } from "./workDialogDataProjection";
import { resolveWorkLiveness, type WorkStoreRun } from "./workRunLiveness";
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
import type { WorkRunListCoverage, WorkRunListSnapshot } from "./workRunListCoverage";
import { sortWorkDialogTimeline, type WorkRunSignal, type GroupedWorkItem } from "app/navigation/workDialogProjection";

const ignoreMenuToggle = (_key: string | null): void => {};

export function WorkDialogGroupsPreview({
  items, userId, homeScope = { kind: "all" }, includeNonDialogs = false, paginationOwner = false, ownedPages,
}: { items: readonly MyContentListItem[]; userId: string; homeScope?: HomeScope; includeNonDialogs?: boolean; paginationOwner?: boolean; ownedPages?: { error: string | null; loading: boolean; hasMore: boolean; loadMore: () => Promise<void> } }) {
  if (!userId) return null;
  return (
    <section aria-label="工作状态" data-hook="work-dialog-groups">
      <WorkDialogGroupsExpanded items={items} userId={userId} homeScope={homeScope} includeNonDialogs={includeNonDialogs} paginationOwner={paginationOwner} ownedPages={ownedPages} />
    </section>
  );
}

function WorkDialogGroupsExpanded({ items, userId, homeScope, includeNonDialogs, paginationOwner, ownedPages }: { items: readonly MyContentListItem[]; userId: string; homeScope: HomeScope; includeNonDialogs: boolean; paginationOwner: boolean; ownedPages?: { error: string | null; loading: boolean; hasMore: boolean; loadMore: () => Promise<void> } }) {
  // This subscription hydrates run state on mount/focus; per-dialog lookup retains ownership scope.
  const { coverage, snapshot } = useWorkRunListCoverage(userId);
  const dialogStatuses = useDialogStatuses();
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
  // memberSpaces 的 spaceId 可能带 `space-` 前缀，而服务端记录的 spaceId 是裸形态：两边都归一化再比。
  const memberSpaceIds = useMemo(() => new Set(memberSpaces
    .map((space) => normalizeSpaceId(space.spaceId))
    .filter((spaceId): spaceId is string => Boolean(spaceId))), [memberSpaces]);
  const sharedItems = useMemo(() => sharedEnabled ? mergeSharedHistoryItems(sharedPages.records.filter((record) =>
    record.type === "dialog" && record.ownerUserId && record.ownerUserId !== userId &&
    parseDialogKey(record.contentKey)?.userId === record.ownerUserId &&
    memberSpaceIds.has(normalizeSpaceId(record.spaceId) ?? "")
  )) : [], [sharedEnabled, sharedPages.records, userId, memberSpaceIds]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  // 直接订阅 store 版本：memo 依赖才是反应式的（裸读版本号会静默失效）。
  const storeVersion = useSyncExternalStore(subscribeAgentRuns, getAgentRunsVersion, getAgentRunsVersion);
  const tasks = useMemo(() => getRemoteTasks({ userId }, now), [userId, storeVersion, now]);
  const storeRuns = useMemo<WorkStoreRun[]>(() => {
    const out: WorkStoreRun[] = [];
    for (const item of items) {
      if (item.type !== "dialog") continue;
      const parsed = parseDialogKey(item.contentKey);
      if (!parsed || parsed.userId !== userId) continue;
      for (const run of getAgentRuns({ userId, dialogId: parsed.dialogId })) {
        if (run.status !== "running") continue;
        out.push({ runId: run.runId, dialogId: parsed.dialogId, startedAt: run.startedAt });
      }
    }
    return out;
  }, [items, userId, storeVersion]);
  // Preserve real events after terminal presentation snapshots expire. Account
  // changes reset the cache; ticking the store never creates a new timestamp.
  const runActivityRef = useRef<{ userId: string; timestamps: Record<string, number> }>({ userId, timestamps: {} });
  const runActivityTimestamps = useMemo(() => {
    const timestamps = runActivityRef.current.userId === userId
      ? { ...runActivityRef.current.timestamps } : {};
    for (const item of items) {
      if (item.type !== "dialog") continue;
      const parsed = parseDialogKey(item.contentKey);
      if (!parsed || parsed.userId !== userId) continue;
      for (const run of getAgentRuns({ userId, dialogId: parsed.dialogId })) {
        for (const at of [run.startedAt, run.finishedAt]) {
          if (typeof at === "number" && Number.isFinite(at)) {
            timestamps[parsed.dialogId] = Math.max(timestamps[parsed.dialogId] ?? 0, at);
          }
        }
      }
    }
    runActivityRef.current = { userId, timestamps };
    return timestamps;
  }, [items, userId, storeVersion]);
  const liveness = useMemo(
    () => resolveWorkLiveness({ now, snapshot, storeRuns }),
    [now, snapshot, storeRuns],
  );
  // V2-B 预览尚未接入「agent 正在等用户回答」的权威来源（waitingUserByDialogKey
  // 在生产侧不接线）：「需要我处理」当前由「需处置 / 状态未知」触发，不代表一定在等你。
  const groups = useMemo(() => projectWorkDialogData(items, tasks, {
    sharedItems,
    userId, dialogStatuses, dialogEventTimestamps, runActivityTimestamps, now,
    liveDialogIds: liveness.liveDialogIds,
    uncertainDialogIds: liveness.uncertainDialogIds,
  }), [items, tasks, userId, sharedItems, dialogStatuses, dialogEventTimestamps, runActivityTimestamps, now, liveness]);
  const titles = useMemo(() => new Map([...items.map((item) => [item.contentKey, item.title] as const), ...sharedItems.map((item) => [item.contentKey, item.title] as const)]), [items, sharedItems]);
  const sharedKeys = useMemo(() => new Set(sharedItems.map((item) => item.contentKey)), [sharedItems]);
  const pinnedByKey = useMemo(
    () => new Map(items.map((item) => [item.contentKey, Boolean(item.pinned)])),
    [items],
  );
  const timeline = useMemo(() => sortWorkDialogTimeline(groups), [groups]);
  const contentByKey = useMemo(() => new Map(items.map((item) => [item.contentKey, item])), [items]);
  // The authorized dialog projection stays authoritative for dialog membership,
  // activity and status. Only the already-scoped non-dialog window is mixed in.
  const mixedTimeline = useMemo(() => {
    const rows: Array<
      | { key: string; updatedAt: number; dialog: GroupedWorkItem; item?: undefined }
      | { key: string; updatedAt: number; dialog?: undefined; item: MyContentListItem }
    > = timeline.map((dialog) => ({ key: dialog.dialogKey, updatedAt: dialog.updatedAt, dialog }));
    if (includeNonDialogs && homeScope.kind === "all") {
      const seen = new Set(rows.map((row) => row.key));
      for (const item of items) {
        if (item.type === "dialog" || seen.has(item.contentKey)) continue;
        seen.add(item.contentKey);
        const at = toTimestamp(item.updatedAt);
        rows.push({ key: item.contentKey, updatedAt: Number.isFinite(at) ? at : 0, item });
      }
    }
    return rows.sort((a, b) => b.updatedAt - a.updatedAt || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  }, [timeline, items, includeNonDialogs, homeScope.kind]);
  const total = mixedTimeline.length;
  // 共享历史只是补充：失败只做一处收敛提示，不按 Space 平铺按钮、也不暴露裸 spaceId。
  const failedSharedSources = sharedPages.failedSourceCount ?? 0;
  const deferredSharedSources = sharedPages.deferredSourceCount ?? 0;
  const pendingSharedSources = sharedPages.pendingSourceCount ?? 0;
  // 单次点击同时重试失败来源、推进健康且未加载完的来源（hook 的 loadMore 无参语义）。
  // 文案必须说清这次点击会做什么：只有失败 → 重试；两类都有 → 重试并加载更多。
  const sharedIncomplete = sharedEnabled && (deferredSharedSources > 0 || failedSharedSources > 0 || pendingSharedSources > 0 || sharedPages.hasMoreSpaces.length > 0);
  const sharedActionable = sharedIncomplete && (sharedPages.actionableSourceCount === undefined || sharedPages.actionableSourceCount > 0);
  const sharedLoading = sharedPages.loadingSpaces.length > 0;
  const combinedActionable = sharedIncomplete || Boolean(ownedPages && (ownedPages.error || ownedPages.hasMore));
  const ownedActionable = Boolean(ownedPages && !ownedPages.loading && (ownedPages.error || ownedPages.hasMore));
  const canLoadMore = sharedActionable || ownedActionable;
  const loadingOnly = !canLoadMore && (sharedLoading || Boolean(ownedPages?.loading));
  const coolingDown = deferredSharedSources > 0 && !sharedActionable && !ownedActionable;
  const loadCombined = () => {
    if (!canLoadMore) return;
    const tasks: Promise<unknown>[] = [];
    if (ownedPages && ownedActionable) tasks.push(ownedPages.loadMore());
    if (sharedActionable) tasks.push(sharedPages.loadMore());
    void Promise.allSettled(tasks);
  };

  // 侧栏条目的「更多」菜单挂在 row 之外（RAC Menu 不能嵌在 ListBox 里），
  // 与 CategorySection 同一套约定：row 上报锚点，这里渲染 MenuPopover。
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const menuAnchorKeyRef = useRef<string | null>(null);
  const [editRequest, setEditRequest] = useState<{ key: string; nonce: number } | null>(null);

  const handleMenuAnchorChange = useCallback((key: string, el: HTMLElement | null) => {
    if (el) {
      menuAnchorKeyRef.current = key;
      setMenuAnchorEl(el);
      return;
    }
    if (menuAnchorKeyRef.current === key) {
      menuAnchorKeyRef.current = null;
      setMenuAnchorEl(null);
    }
  }, []);

  const closeMenu = useCallback(() => {
    setActiveMenuKey(null);
    menuAnchorKeyRef.current = null;
    setMenuAnchorEl(null);
  }, []);

  const covText = coverageText(coverage, snapshot);
  const activeItem = activeMenuKey ? contentByKey.get(activeMenuKey) : undefined;

  return (
    <div data-hook="home-work-dialog-list" className="home-work-dialog-list">
      {covText && <p role="status">{covText}</p>}
      {(paginationOwner || sharedIncomplete) && (failedSharedSources > 0 || deferredSharedSources > 0 || ownedPages?.error) && (
        <p role="status">部分对话暂时未能加载，已显示的对话仍可打开。</p>
      )}
      {(paginationOwner || sharedIncomplete) && combinedActionable && (
        <button type="button" disabled={!canLoadMore} onClick={loadCombined}>
          {loadingOnly ? "正在加载对话…" : coolingDown ? "稍后重试" : failedSharedSources > 0 || ownedPages?.error ? "重试加载" : "加载更多对话"}
        </button>
      )}
      {total === 0 ? (
        <p>{includeNonDialogs ? "暂无已加载的内容。" : "暂无已加载的对话。"}</p>
      ) : (
          <div aria-label={includeNonDialogs ? "最近活动内容" : "最近活动对话"}>
            {mixedTimeline.map(({ dialog, item }) => {
              if (item) {
                const type = item.type.toLowerCase();
                return <div key={item.contentKey}>
                  <SidebarItemRow
                    contentKey={item.contentKey}
                    sourceServerOrigin={item.serverOrigin}
                    type={type}
                    title={item.title || item.contentKey}
                    isActive={isRoutableContentActive({ contentKey: item.contentKey, type, userId, spaceId: currentSpaceId, currentPath: location.pathname })}
                    isMenuOpen={activeMenuKey === item.contentKey}
                    onToggleMenu={setActiveMenuKey}
                    onMenuAnchorChange={handleMenuAnchorChange}
                    editSignal={editRequest?.key === item.contentKey ? editRequest.nonce : undefined}
                    pinned={Boolean(item.pinned)}
                  />
                </div>;
              }
              const title = titles.get(dialog.dialogKey) || dialog.dialogKey;
              const status = statusLabel(dialog.runs, dialog.needsUserAction);
              const content = contentByKey.get(dialog.dialogKey);
              const ownerId = parseDialogKey(dialog.dialogKey)?.userId;
              // Account summaries are never evidence for another owner's shared row.
              const summary = !sharedKeys.has(dialog.dialogKey) && content?.type === "dialog" &&
                (ownerId === userId || ownerId === "local") ? content : undefined;
              // 与行自身的链接同源：侧栏条目会带上当前 Space 前缀，并容忍尾斜杠/子路由，
              // 所以不能拿 pathname 做严格相等。
              const isActive = isRoutableContentActive({
                contentKey: dialog.dialogKey,
                type: "dialog",
                userId,
                spaceId: currentSpaceId,
                currentPath: location.pathname,
              });
              return (
                <div
                  key={dialog.dialogKey}
                  title={status}
                >
                  <SidebarItemRow
                    contentKey={dialog.dialogKey}
                    type="dialog"
                    title={title}
                    disableAutoRead
                    summaryStatus={summary && "status" in summary ? summary.status : undefined}
                    summaryUnreadAt={summary && "unreadAt" in summary ? summary.unreadAt : undefined}
                    isActive={isActive}
                    isMenuOpen={!sharedKeys.has(dialog.dialogKey) && activeMenuKey === dialog.dialogKey}
                    readOnly={sharedKeys.has(dialog.dialogKey)}
                    onToggleMenu={sharedKeys.has(dialog.dialogKey) ? ignoreMenuToggle : setActiveMenuKey}
                    onMenuAnchorChange={sharedKeys.has(dialog.dialogKey) ? undefined : handleMenuAnchorChange}
                    editSignal={sharedKeys.has(dialog.dialogKey) ? undefined : editRequest?.key === dialog.dialogKey ? editRequest.nonce : undefined}
                    pinned={sharedKeys.has(dialog.dialogKey) ? false : pinnedByKey.get(dialog.dialogKey) ?? false}
                  />
                  {status && <small data-hook="work-dialog-status" style={{ color: "var(--text-secondary)", paddingInlineStart: 12 }}>
                    {status}
                  </small>}
                </div>
              );
            })}
          </div>
      )}
      {activeMenuKey && !sharedKeys.has(activeMenuKey) && menuAnchorEl && (
        <MenuPopover
          triggerRef={{ current: menuAnchorEl }}
          isOpen
          onOpenChange={(open) => { if (!open) closeMenu(); }}
          placement="bottom end"
        >
          <SidebarItemMoreMenu
            contentKey={activeMenuKey}
            title={titles.get(activeMenuKey) || activeMenuKey}
            type={activeItem?.type ?? "dialog"}
            fileCategory={(activeItem as { fileCategory?: string | null } | undefined)?.fileCategory ?? null}
            sourceServerOrigin={activeItem?.serverOrigin}
            spaceId={currentSpaceId}
            canEditInSpace={Boolean(currentSpaceId) && !sharedKeys.has(activeMenuKey)}
            canMoveToSpace={!sharedKeys.has(activeMenuKey)}
            showDownloadAction={false}
            menuAnchorEl={menuAnchorEl}
            onEditTitle={() => {
              setEditRequest({ key: activeMenuKey, nonce: Date.now() });
              closeMenu();
            }}
            onClose={closeMenu}
          />
        </MenuPopover>
      )}
    </div>
  );
}

function statusLabel(runs: readonly WorkRunSignal[] | undefined, needsUserAction?: boolean): string | undefined {
  if (needsUserAction) return "等你处置";
  if (!runs || runs.length === 0) return undefined;
  if (runs.includes("requires-action")) return "需处置";
  if (runs.includes("unknown")) return "状态未知";
  if (runs.includes("waiting-user")) return "待你处理";
  if (runs.includes("live")) return "运行中";
  // Completed/stopped records are history, not an action prompt.
  return undefined;
}

function coverageText(coverage: WorkRunListCoverage, snapshot?: WorkRunListSnapshot): string | null {
  if (coverage.status === "loading" || coverage.status === "complete") return null;
  if (coverage.status === "error") return "部分对话的最新进展暂时查不到，稍后会自动更新";
  if (coverage.status === "partial") {
    // 不暴露内部计数，也不承诺完整：只说明有一部分对话的进展暂时无法确定。
    return "有些对话的最新进展暂时看不到，还不能确定是否已结束。";
  }
  return null;
}
