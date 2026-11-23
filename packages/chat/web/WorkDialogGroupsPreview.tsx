import * as spaceAccessModule from "create/space/spaceAccess";
import { matchesTypeFilter, type SidebarTypeFilterId } from "./sidebar/SidebarTypeFilter";
import { resolveEffectiveSidebarType, readStoredSidebarType } from "./sidebar/sidebarTypeQuery";
import { isAllViewDialogImageAttachment } from "./sidebar/allViewSearch";
import { WorkDialogSpaceGroups, WorkDialogCategoryGroups } from "./WorkDialogSpaceGroups";
import { WORK_SPACE_NAME_TTL_MS, readCachedSpaceRecord, projectWorkSpaceDirectories, collectClaimedDirectoryKeys, resolveActiveSpaceGroupId, groupWorkDialogsByCategory, areWorkSpaceRecordsEquivalent, type WorkSpaceRecord, groupWorkDialogsBySpace, canManageSpaceCategories, isSpaceManager, resolveRowOwnership, resolveContentRowCapability, type ContentRowCapability } from "./sidebar/workDialogSpaceGroups";
import { useContentOwnershipEvidence } from "./sidebar/useContentOwnershipEvidence";
import { mergeSharedHistoryItems } from "./sharedHistoryMerge";
import { isAgentRowUnread } from "./sidebar/agentUnread";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "app/routing";
import { pinnedFirst, toTimestamp, type MyContentListItem } from "app/utils/myContentItems";
import { parseDialogKey } from "database/dialogKey";
import { useDialogEventTimestamps, useDialogStatuses } from "create/space/spaceDialogStore";
import { isRoutableContentActive } from "create/space/contentKeyUtils";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import { useAppDispatch, useAppSelector } from "app/store";
import { deleteDbKey } from "app/hooks/deleteDbKey";
import type { DeleteContentCommand } from "create/space/components/useDeleteContentEntry";
import { updateContentPinned } from "create/space/content/contentThunks";
import { runPinnedToggleWithTransition } from "create/space/content/optimisticPinnedUpdate";
import { runSidebarViewTransition } from "./sidebar/sidebarViewTransitions";
import { SidebarAppDeleteDialog } from "create/space/SidebarAppDeleteDialog";
import { UnlinkContentFromSpaceDialog } from "create/space/UnlinkContentFromSpaceDialog";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import type { HomeScope } from "./homeScopeProjection";
import { useSharedSpaceDialogPages } from "database/hooks/useSharedSpaceDialogPages";
import type { SharedSpaceDialogSummary } from "database/client/sharedSpaceDialogPage";
import { normalizeSpaceId } from "database-engine/spaceLinkAccess";
import { selectEntities } from "database/dbSlice";
import { isDeviceLocalSpaceBody, isDeviceLocalOwnerId } from "database/authority/deviceLocal";
import { createSpaceKey } from "create/space/spaceKeys";
import { isTombstoneRecord } from "database/tombstones";
import type { SpaceData } from "app/types";
import SidebarItemRow from "create/space/SidebarItemRow";
import { SidebarItemMoreMenu } from "create/space/SidebarItemMoreMenu";
import { MenuPopover } from "render/web/ui/MenuPopover";
import { useTranslation } from "react-i18next";
import { canDeleteSidebarItem } from "create/space/canDeleteSidebarItem";
import { useDeleteContentEntry } from "create/space/components/useDeleteContentEntry";
import { useRovingRowKeyboard } from "./sidebar/useRovingRowKeyboard";
import {
  buildWorkDialogHierarchyView,
  type WorkDialogFlatRow,
} from "./sidebar/workDialogHierarchyView";
import {
  aggregateRunningAncestors,
  collectRunningDialogKeys,
} from "./sidebar/runningDialogAggregation";

const ignoreMenuToggle = (_key: string | null): void => {};const AUTO_LOAD_MIN_INTERVAL_MS = 1000;
const EMPTY_ENTITIES: Record<string, any> = Object.freeze({});

/** 已加载条目自带的归属身份（对话 summary 的 userId / ownerUserId）。 */
const itemOwnerIdentity = (item: any): string | null => {
  const owner = typeof item?.userId === "string" ? item.userId.trim() : "";
  if (owner) return owner;
  const summaryOwner = typeof item?.ownerUserId === "string" ? item.ownerUserId.trim() : "";
  return summaryOwner || null;
};

/** 实际实体记录里的归属身份（已核实的证据）。 */
const entityOwnerIdFrom = (record: any): string | null => {
  if (!record || typeof record !== "object") return null;
  const owner = typeof record.userId === "string" ? record.userId.trim() : "";
  if (owner) return owner;
  const ownerId = typeof record.ownerId === "string" ? record.ownerId.trim() : "";
  return ownerId || null;
};

/**
 * 列表行来源：本地条目（含本人缓存）与空间共享摘要共用同一批行。
 * 摘要只带服务器列出的字段——既没有置顶归属，也没有来源服务器，
 * 因此只能在数据本身带该字段时读取，不能按本地条目字段硬读。
 */
type WorkRowSourceItem = MyContentListItem | SharedSpaceDialogSummary;

/** 置顶归属：共享摘要没有 pinned，缺失返回 undefined，由调用方决定语义。 */
const pinnedOfSourceItem = (item: WorkRowSourceItem): boolean | undefined =>
  "pinned" in item ? item.pinned : undefined;

/**
 * 菜单动作的来源服务器：只读数据自带的字段。
 * 共享摘要没有来源服务器，缺失即「未知」——绝不用当前服务器冒充，
 * 否则跨服务器的动作会落到错误的对象上。
 */
const serverOriginOfSourceItem = (item: WorkRowSourceItem | undefined): string | undefined => {
  if (!item) return undefined;
  return "serverOrigin" in item ? item.serverOrigin : undefined;
};

type DialogPages = {
  error: string | null;
  loading: boolean;
  hasMore: boolean;
  pendingSourceCount?: number;
  identityKey?: string;
  /** 游标快照：推进/耗尽时变化；缺失时展示层退回行数信号。 */
  cursorKey?: string;
  loadMore: (options?: { retryFailed?: boolean }) => Promise<void>;
};

export function WorkDialogGroupsPreview({
  items, userId, homeScope = { kind: "all" }, onSelectHomeScope, includeNonDialogs = false, typeFilter, paginationOwner = false, ownedPages, unreadAgentKeys,
}: { items: readonly MyContentListItem[]; userId: string; homeScope?: HomeScope; onSelectHomeScope?: (scope: HomeScope) => void; includeNonDialogs?: boolean; typeFilter?: SidebarTypeFilterId; paginationOwner?: boolean; ownedPages?: DialogPages; unreadAgentKeys?: Set<string> }) {
  if (!userId) return null;
  return <section aria-label="工作状态" data-hook="work-dialog-groups">
    <WorkDialogGroupsExpanded items={items} userId={userId} homeScope={homeScope} onSelectHomeScope={onSelectHomeScope} includeNonDialogs={includeNonDialogs} typeFilter={typeFilter} paginationOwner={paginationOwner} ownedPages={ownedPages} unreadAgentKeys={unreadAgentKeys} />
  </section>;
}

function WorkDialogGroupsExpanded({ items, userId, homeScope, onSelectHomeScope, includeNonDialogs, typeFilter: typeFilterProp, paginationOwner, ownedPages, unreadAgentKeys }: { items: readonly MyContentListItem[]; userId: string; homeScope: HomeScope; onSelectHomeScope?: (scope: HomeScope) => void; includeNonDialogs: boolean; typeFilter?: SidebarTypeFilterId; paginationOwner: boolean; ownedPages?: DialogPages; unreadAgentKeys?: Set<string> }) {
  const dialogEventTimestamps = useDialogEventTimestamps();
  const location = useLocation();
  // 有效类型筛选只能有一处解析：生产调用方（ChatSidebar）传入 chip 用的同一个值。
  // 无 prop 的独立渲染（测试 / 其它调用方）走同一套解析（URL 覆盖本地偏好），
  // 没有本地偏好时沿用各自历史默认（只看对话 / 不过滤）。
  // 早期实现在这里另起一套「URL 否则 includeNonDialogs ? all : dialog」，
  // 详情页 URL 归一化丢掉 sidebarType 后列表回落到 all，与 chip 的本地偏好分叉。
  const legacyDefaultTypeFilter: SidebarTypeFilterId = includeNonDialogs ? "all" : "dialog";
  const typeFilter = typeFilterProp ??
    resolveEffectiveSidebarType(location.search, readStoredSidebarType(userId) ?? legacyDefaultTypeFilter);
  const currentSpaceId = useCurrentSpaceId();
  const runtime = useAppSelector(selectRuntimeSnapshot);
  const memberSpaces = useAllMemberSpaces();
  const dbEntities = useAppSelector((state: any) => {
    if (state?.db) {
      try {
        return selectEntities(state) ?? EMPTY_ENTITIES;
      } catch {
        return state.db?.entities ?? EMPTY_ENTITIES;
      }
    }
    return state?.entities ?? EMPTY_ENTITIES;
  });
  const dbEntitiesRef = useRef(dbEntities);
  dbEntitiesRef.current = dbEntities;
  const memberSpacesRef = useRef(memberSpaces);
  memberSpacesRef.current = memberSpaces;
  const sharedEnabled = homeScope.kind === "all" &&
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
  const contentByKey = useMemo(() => new Map(items.map((item) => [item.contentKey, item])), [items]);
  const titles = useMemo(() => new Map([...items, ...sharedItems].map((item) => [item.contentKey, item.title] as const)), [items, sharedItems]);
  const pinnedByKey = useMemo(() => new Map(items.map((item) => [item.contentKey, Boolean(item.pinned)])), [items]);

  const eligibleRows = useMemo(() => {
    const byKey = new Map<string, { key: string; updatedAt: number; item: WorkRowSourceItem; shared: boolean }>();
    const add = (item: WorkRowSourceItem, shared: boolean) => {
      const parsed = item.type === "dialog" ? parseDialogKey(item.contentKey) : null;
      if (item.type === "dialog") {
        if (!parsed || (!shared && parsed.userId !== userId && parsed.userId !== "local")) return;
      } else if (homeScope.kind === "project") return;
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
    return [...byKey.values()].sort((a, b) => {
      // 置顶排序只对自有条目成立：共享摘要没有置顶归属，
      // 即便共享来源多带了 pinned 字段也不得把它抬到前面（置顶由本人维护）。
      const pinnedOf = (row: { key: string; shared: boolean; item: WorkRowSourceItem }): boolean =>
        !row.shared && Boolean(pinnedOfSourceItem(row.item) ?? pinnedByKey.get(row.key));
      const pinDiff = pinnedFirst({ pinned: pinnedOf(a) }, { pinned: pinnedOf(b) });
      return pinDiff || b.updatedAt - a.updatedAt || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    });
  }, [items, sharedItems, userId, dialogEventTimestamps, homeScope.kind, pinnedByKey]);
  // Group-layer eligibility is independent of the selected type, including dialog-only.
  const rows = useMemo(() => eligibleRows.filter(row =>
    (row.item.type === "dialog" || includeNonDialogs) &&
    matchesTypeFilter(row.item as MyContentListItem, typeFilter) &&
    (typeFilter === "attachment" || !isAllViewDialogImageAttachment(row.item))),
  [eligibleRows, includeNonDialogs, typeFilter]);
  const total = rows.length;
  const sharedPagesView = sharedPages as typeof sharedPages & { deferredSourceCount?: number; actionableSourceCount?: number; cursorKey?: string };
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
  const [autoLoadStalled, setAutoLoadStalled] = useState(false);
  // 自动续页的进展信号：游标快照（含耗尽为 null）推进即算进展。
  // 不能用 total/rows.length——重复页、已缓存、去重、类型过滤都会让行数不动却仍在翻页。
  const autoLoadProgressKey = `${ownedPages?.cursorKey ?? ""}|${sharedEnabled ? (sharedPagesView.cursorKey ?? "") : ""}`;
  const stalled = autoLoadStalled && (ownedActionable || sharedActionable);
  const controlLabel = loading ? "正在加载对话…" : failed ? "重试加载" : stalled ? "加载停滞，点击重试" : (ownedActionable || sharedActionable) ? "加载更多对话" : "稍后重试";
  const controlDisabled = loading || !(ownedActionable || sharedActionable || (sharedFailedCount > 0 && sharedPages.loadingSpaces.length === 0));
  const autoLoadActive = typeof IntersectionObserver !== "undefined" && !autoLoadStalled && (ownedHealthyPending || sharedHealthyPending);
  // 身份变化（账号/服务器/空间集合）后，旧身份的停滞结论不再适用：重新交给自动链条。
  const autoLoadIdentityKey = `${ownedPages?.identityKey ?? ""}|${sharedPages.identityKey}`;
  useEffect(() => { setAutoLoadStalled(false); }, [autoLoadIdentityKey]);

  const autoLoadFromProgressRef = useRef<string | null>(null);
  const autoLoadEmptyRoundsRef = useRef(0);
  const loadCombined = (manual = false): Promise<void> => {
    // 手动重试重新开启自动续页：点击后若游标重新推进，自动链条继续；若仍停滞，再收敛回手动。
    // 同时清空停滞计数与进展 snapshot，给重试一轮完整预算，避免一次重试就立刻再停滞。
    if (manual) {
      setAutoLoadStalled(false);
      autoLoadEmptyRoundsRef.current = 0;
      autoLoadFromProgressRef.current = null;
    }
    const tasks: Promise<unknown>[] = [];
    if (ownedPages && (manual ? ownedActionable : ownedHealthyPending)) {
      tasks.push(ownedPages.loadMore({ retryFailed: manual && ownedFailed }));
    }
    if (sharedEnabled && (manual ? (sharedActionable || (sharedFailedCount > 0 && sharedPages.loadingSpaces.length === 0)) : sharedHealthyPending)) {
      tasks.push((sharedPages.loadMore as (spaceId?: string, options?: { retryFailed?: boolean }) => Promise<void>)(undefined, { retryFailed: manual && sharedFailedCount > 0 }));
    }
    return Promise.allSettled(tasks).then(() => undefined);
  };
  const autoLoadSentinelRef = useRef<HTMLDivElement | null>(null);
  const autoLoadVisibleRef = useRef(false);
  const autoLoadTriggerRef = useRef(loadCombined);
  const autoLoadLastTriggerAtRef = useRef(0);
  const autoLoadCanLoadMoreRef = useRef(canLoadMore);
  const autoLoadProgressRef = useRef(autoLoadProgressKey);
  const autoLoadLoadingRef = useRef(false);
  autoLoadTriggerRef.current = loadCombined;
  autoLoadCanLoadMoreRef.current = canLoadMore;
  autoLoadProgressRef.current = autoLoadProgressKey;
  autoLoadLoadingRef.current = Boolean(ownedPages?.loading) || (sharedEnabled && sharedPages.loadingSpaces.length > 0);
  useEffect(() => {
    if (!autoLoadActive) return;
    const node = autoLoadSentinelRef.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const flush = () => {
      timer = undefined;
      if (disposed || !autoLoadVisibleRef.current || !autoLoadCanLoadMoreRef.current) return;
      const from = autoLoadFromProgressRef.current;
      const current = autoLoadProgressRef.current;
      // 只有「没有请求在途、且游标没推进」才算真正空转。在途请求可能马上落地推进，
      // 既不能算空转，也不能阻塞别的健康来源——hook 内有逐来源在途守卫。
      if (from !== null && current === from && !autoLoadLoadingRef.current) {
        autoLoadEmptyRoundsRef.current += 1;
        if (autoLoadEmptyRoundsRef.current >= 2) {
          // 所有来源连续两轮游标没动：停手，让渲染分支退回手动按钮，不再无限自动重试。
          setAutoLoadStalled(true);
          return;
        }
      } else if (current !== from) {
        autoLoadEmptyRoundsRef.current = 0;
      }
      autoLoadLastTriggerAtRef.current = Date.now();
      autoLoadFromProgressRef.current = current;
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
  const dispatch = useAppDispatch();
  const handleTogglePinned = useCallback((contentKey: string, item: any, spaceIdOverride?: string | null) => {
    const isCurrentPinned = Boolean(item.pinned ?? pinnedByKey.get(contentKey));
    const nextPinned = !isCurrentPinned;
    runPinnedToggleWithTransition({
      pinned: nextPinned,
      contentKey,
      runTransition: runSidebarViewTransition,
      syncRemote: () =>
        (dispatch as any)(
          (updateContentPinned as any)({
            spaceId: spaceIdOverride ?? null,
            contentKey,
            pinned: nextPinned,
            sourceServerOrigin: "serverOrigin" in item ? item.serverOrigin : undefined,
          })
        ),
    });
  }, [dispatch, pinnedByKey]);
  const handleMenuAnchorChange = useCallback((key: string, el: HTMLElement | null) => {
    if (el) { menuAnchorKeyRef.current = key; setMenuAnchorEl(el); return; }
    if (menuAnchorKeyRef.current === key) { menuAnchorKeyRef.current = null; setMenuAnchorEl(null); }
  }, []);
  const closeMenu = useCallback(() => { setActiveMenuKey(null); menuAnchorKeyRef.current = null; setMenuAnchorEl(null); }, []);
  const activeItem = activeMenuKey ? contentByKey.get(activeMenuKey) : undefined;

  // ── Dialog 入口的层级 / 日期分组 ──────────────────────────────────────────
  // 父子判定与「父未载入 → 子留顶层」全部来自 sidebarDialogHierarchy 的
  // buildDialogHierarchy；这里只负责把它接到既有渲染上（不新写关系模型）。
  const { t } = useTranslation("space");
  const DATE_GROUP_FALLBACKS: Record<string, string> = {
    today: "今天",
    yesterday: "昨天",
    last7: "最近 7 天",
    last30: "最近 30 天",
    earlier: "更早",
  };
  const [expandedDialogKeys, setExpandedDialogKeys] = useState<ReadonlySet<string>>(() => new Set<string>());
  const toggleDialogExpanded = useCallback((key: string) => {
    setExpandedDialogKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const dialogStatuses = useDialogStatuses();
  const flatRows = useMemo<WorkDialogFlatRow[]>(() => rows.map((row) => ({
    key: row.key,
    updatedAt: row.updatedAt,
    item: row.item as unknown as MyContentListItem,
    shared: row.shared,
  })), [rows]);
  const runningDialogKeys = useMemo(
    () => collectRunningDialogKeys(flatRows.map((entry) => entry.item), dialogStatuses),
    [flatRows, dialogStatuses],
  );
  // 子对话的运行状态向上汇总到 root（同一棵关系树），root 再据此展示聚合态。
  const aggregatedRunningKeys = useMemo(
    () => aggregateRunningAncestors(flatRows.map((entry) => entry.item), dialogStatuses),
    [flatRows, dialogStatuses],
  );
  const nameScope = JSON.stringify([runtime.currentUserId, runtime.currentToken, runtime.currentServer, runtime.syncServers]);
  const [resolvedRecords, setResolvedRecords] = useState<{ scope: string; records: Map<string, WorkSpaceRecord> }>();
  const [pendingCategories, setPendingCategories] = useState<{
    scope: string;
    entries: Map<string, Record<string, { name: string; order: number; createdAt: number }>>;
  }>();
  useEffect(() => {
    if (pendingCategories?.scope !== nameScope) return;
    const expiries = [...pendingCategories.entries.values()].flatMap(categories =>
      Object.values(categories).map(category => category.createdAt + WORK_SPACE_NAME_TTL_MS),
    );
    if (!expiries.length) return;
    const timer = setTimeout(() => {
      setPendingCategories(previous => {
        if (previous?.scope !== nameScope) return previous;
        const entries = new Map(previous.entries);
        for (const [spaceId, categories] of entries) {
          const remaining = Object.fromEntries(Object.entries(categories).filter(([, category]) =>
            Date.now() - category.createdAt < WORK_SPACE_NAME_TTL_MS,
          ));
          if (Object.keys(remaining).length) entries.set(spaceId, remaining);
          else entries.delete(spaceId);
        }
        return { scope: nameScope, entries };
      });
    }, Math.max(0, Math.min(...expiries) - Date.now()));
    return () => clearTimeout(timer);
  }, [nameScope, pendingCategories]);
  const [recordRefreshNonce, setRecordRefreshNonce] = useState(0);
  const triggerRecordRefresh = useCallback(() => {
    setRecordRefreshNonce(nonce => nonce + 1);
  }, []);
  const nameSpaceIds = JSON.stringify([...new Set([...eligibleRows.map(row => normalizeSpaceId(row.item.spaceId)), ...memberSpaces.map(space => normalizeSpaceId(space.spaceId))].filter((id): id is string => Boolean(id)))].sort());
  useEffect(() => {
    let active = true;
    if (!sharedEnabled || !runtime.currentToken || !runtime.currentUserId) return;
    const authToken = runtime.currentToken;
    const servers = [...new Set([runtime.currentServer, ...runtime.syncServers].filter((server): server is string => Boolean(server)))];
    const refresh = (skipWhenHidden = false) => {
      if (
        skipWhenHidden &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      const currentMembers = memberSpacesRef.current;
      const currentEntities = dbEntitiesRef.current;
      const remoteSpaceIds: string[] = [];
      for (const spaceId of JSON.parse(nameSpaceIds) as string[]) {
        const member = currentMembers.find(m => normalizeSpaceId(m.spaceId) === spaceId);
        const localKey = createSpaceKey.space(spaceId);
        const localEntity = (currentEntities[localKey] ?? currentEntities[spaceId]) as (SpaceData & { userId?: string }) | undefined;
        if (isDeviceLocalOwnerId(userId) || isDeviceLocalSpaceBody(localEntity) || isDeviceLocalSpaceBody(member)) {
          continue;
        }
        remoteSpaceIds.push(spaceId);
      }
      if (remoteSpaceIds.length === 0) return;

      void Promise.all(
        remoteSpaceIds.map(async (spaceId) => {
          const readRemoteDirectory =
            spaceAccessModule.fetchAuthoritativeSpaceDirectory ??
            spaceAccessModule.fetchAuthoritativeRemoteSpace;
          const record = await readCachedSpaceRecord(nameScope, spaceId, async () =>
            readRemoteDirectory({
              servers,
              token: authToken,
              userId: runtime.currentUserId!,
              spaceId,
            }),
          );
          return [spaceId, record] as const;
        }),
      ).then((fetchedEntries) => {
        if (!active) return;
        setResolvedRecords((previous) => {
          const prevSameScope = previous?.scope === nameScope;
          const prevMap = prevSameScope ? previous.records : undefined;
          let changed = !prevSameScope;
          if (!changed && prevMap) {
            for (const [spaceId, record] of fetchedEntries) {
              const prevRec = prevMap.get(spaceId);
              if (record) {
                if (!prevRec || !areWorkSpaceRecordsEquivalent(prevRec, record)) {
                  changed = true;
                  break;
                }
              } else if (prevMap.has(spaceId)) {
                changed = true;
                break;
              }
            }
          }
          if (!changed && previous) return previous;
          const records = new Map(prevMap ?? []);
          for (const [spaceId, record] of fetchedEntries) {
            if (record) records.set(spaceId, record);
            else records.delete(spaceId);
          }
          return { scope: nameScope, records };
        });

        setPendingCategories((prev) => {
          if (!prev || prev.scope !== nameScope || prev.entries.size === 0) {
            return prev;
          }
          const now = Date.now();
          let nextEntries: Map<string, Record<string, { name: string; order: number; createdAt: number }>> | null = null;
          for (const [spaceId, record] of fetchedEntries) {
            if (!record) continue;
            const spacePending = prev.entries.get(spaceId);
            if (!spacePending) continue;
            const remaining: Record<string, { name: string; order: number; createdAt: number }> = {};
            let spaceChanged = false;
            for (const [catId, catVal] of Object.entries(spacePending)) {
              if (record.categories?.[catId]) {
                spaceChanged = true;
              } else if (now - catVal.createdAt < WORK_SPACE_NAME_TTL_MS) {
                remaining[catId] = catVal;
              } else {
                spaceChanged = true;
              }
            }
            if (spaceChanged) {
              if (!nextEntries) nextEntries = new Map(prev.entries);
              if (Object.keys(remaining).length > 0) {
                nextEntries.set(spaceId, remaining);
              } else {
                nextEntries.delete(spaceId);
              }
            }
          }
          return nextEntries ? { scope: nameScope, entries: nextEntries } : prev;
        });
      });
    };
    refresh(false);
    const timer = setInterval(() => refresh(true), WORK_SPACE_NAME_TTL_MS);
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refresh(false);
      }
    };
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    return () => {
      active = false;
      clearInterval(timer);
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [nameScope, nameSpaceIds, sharedEnabled, userId, recordRefreshNonce]);

  const handleSpaceRecordUpdate = useCallback((
    spaceId: string,
    newCategoryId?: string,
    newCategory?: { name: string; order: number },
  ) => {
    const id = normalizeSpaceId(spaceId);
    if (!id) return;
    readCachedSpaceRecord.invalidate(id);
    spaceAccessModule.invalidateSpaceDirectoryScanCache?.(id);
    if (newCategoryId && newCategory) {
      setPendingCategories(prev => {
        const entries = new Map(prev?.scope === nameScope ? prev.entries : []);
        const currentPending = entries.get(id) ?? {};
        entries.set(id, { ...currentPending, [newCategoryId]: { ...newCategory, createdAt: Date.now() } });
        return { scope: nameScope, entries };
      });
    }
    triggerRecordRefresh();
  }, [nameScope, triggerRecordRefresh]);

  const handleCategoryRenamed = useCallback((spaceId: string, categoryId: string, name: string) => {
    const id = normalizeSpaceId(spaceId);
    if (!id) return;
    readCachedSpaceRecord.invalidate(id);
    spaceAccessModule.invalidateSpaceDirectoryScanCache?.(id);
    setPendingCategories(prev => {
      if (prev?.scope !== nameScope) return prev;
      const pending = prev.entries.get(id);
      if (!pending?.[categoryId]) return prev;
      const entries = new Map(prev.entries);
      entries.set(id, { ...pending, [categoryId]: { ...pending[categoryId]!, name } });
      return { scope: nameScope, entries };
    });
    setResolvedRecords(prev => {
      if (prev?.scope !== nameScope) return prev;
      const rec = prev.records.get(id);
      if (!rec || !rec.categories?.[categoryId]) return prev;
      const nextRecords = new Map(prev.records);
      nextRecords.set(id, {
        ...rec,
        categories: {
          ...rec.categories,
          [categoryId]: { ...rec.categories[categoryId]!, name },
        },
      });
      return { scope: nameScope, records: nextRecords };
    });
    triggerRecordRefresh();
  }, [nameScope, triggerRecordRefresh]);

  const handleCategoryDeleted = useCallback((spaceId: string, categoryId: string) => {
    const id = normalizeSpaceId(spaceId);
    if (!id) return;
    readCachedSpaceRecord.invalidate(id);
    spaceAccessModule.invalidateSpaceDirectoryScanCache?.(id);
    setPendingCategories(prev => {
      if (prev?.scope !== nameScope) return prev;
      const spacePending = prev.entries.get(id);
      if (!spacePending || !spacePending[categoryId]) return prev;
      const remaining = { ...spacePending };
      delete remaining[categoryId];
      const nextEntries = new Map(prev.entries);
      if (Object.keys(remaining).length > 0) {
        nextEntries.set(id, remaining);
      } else {
        nextEntries.delete(id);
      }
      return { scope: nameScope, entries: nextEntries };
    });
    setResolvedRecords(prev => {
      if (prev?.scope !== nameScope) return prev;
      const rec = prev.records.get(id);
      if (!rec || !rec.categories?.[categoryId]) return prev;
      const nextRecords = new Map(prev.records);
      const remainingCats = { ...rec.categories };
      delete remainingCats[categoryId];
      nextRecords.set(id, {
        ...rec,
        categories: remainingCats,
      });
      return { scope: nameScope, records: nextRecords };
    });
    triggerRecordRefresh();
  }, [nameScope, triggerRecordRefresh]);
  const knownRemoteRecords = resolvedRecords?.scope === nameScope ? resolvedRecords.records : undefined;
  const remoteRecords = sharedEnabled ? knownRemoteRecords : undefined;
  const deviceLocalRecords = useMemo(() => {
    const candidateIds = new Set<string>();
    for (const space of memberSpaces) {
      const id = normalizeSpaceId(space.spaceId);
      if (id) candidateIds.add(id);
    }
    for (const row of eligibleRows) {
      const id = normalizeSpaceId(row.item.spaceId);
      if (id) candidateIds.add(id);
    }
    const current = normalizeSpaceId(currentSpaceId);
    if (current) candidateIds.add(current);

    const result = new Map<string, WorkSpaceRecord>();
    for (const id of candidateIds) {
      const member = memberSpaces.find(m => normalizeSpaceId(m.spaceId) === id);
      const localKey = createSpaceKey.space(id);
      const localEntity = (dbEntities[localKey] ?? dbEntities[id]) as (SpaceData & { userId?: string }) | undefined;
      const isDeviceLocal = isDeviceLocalOwnerId(userId) || isDeviceLocalSpaceBody(localEntity) || isDeviceLocalSpaceBody(member);
      if (!isDeviceLocal) continue;

      if (localEntity && (isTombstoneRecord(localEntity) || (localEntity as any).deleted || (localEntity as any).tombstone)) {
        continue;
      }

      if (localEntity || member) {
        const contents: Record<string, any> = { ...(localEntity?.contents ?? {}) };
        for (const row of eligibleRows) {
          if (normalizeSpaceId(row.item.spaceId) === id && !contents[row.key]) {
            contents[row.key] = {
              contentKey: row.key,
              type: row.item.type,
              title: row.item.title,
              updatedAt: row.updatedAt,
            };
          }
        }
        result.set(id, {
          name: localEntity?.name || member?.spaceName,
          ownerId: localEntity?.ownerId ?? member?.ownerId ?? (isDeviceLocalOwnerId(userId) ? "local" : undefined),
          userId: localEntity?.userId ?? member?.userId ?? (isDeviceLocalOwnerId(userId) ? "local" : undefined),
          categories: localEntity?.categories ?? {},
          contents,
        });
      }
    }
    return result;
  }, [memberSpaces, eligibleRows, currentSpaceId, dbEntities, userId]);

  const records = useMemo(() => {
    if (!remoteRecords && deviceLocalRecords.size === 0) return undefined;
    const combined = new Map<string, WorkSpaceRecord>();
    if (remoteRecords) {
      for (const [id, record] of remoteRecords) {
        combined.set(id, record);
      }
    }
    for (const [id, record] of deviceLocalRecords) {
      combined.set(id, record);
    }
    // 仅临时覆盖本次会话创建且未到期的待同步分类，严格按 nameScope 隔离；切账号立即不参与投影
    const activePending = pendingCategories?.scope === nameScope ? pendingCategories.entries : undefined;
    if (activePending && activePending.size > 0) {
      const now = Date.now();
      for (const [id, pendingMap] of activePending) {
        const existing = combined.get(id);
        if (existing) {
          const validPending: Record<string, { name: string; order: number }> = {};
          for (const [catId, catVal] of Object.entries(pendingMap)) {
            if (now - catVal.createdAt < WORK_SPACE_NAME_TTL_MS) {
              validPending[catId] = { name: catVal.name, order: catVal.order };
            }
          }
          if (Object.keys(validPending).length > 0) {
            combined.set(id, {
              ...existing,
              categories: { ...(existing.categories ?? {}), ...validPending },
            });
          }
        }
      }
    }
    return combined;
  }, [remoteRecords, deviceLocalRecords, pendingCategories, nameScope]);

  // ── 行级权限：只用可核实证据（实际实体 owner + 空间角色）────────────────────
  // 缓存缺失（目录行不在已加载窗口）、实体 spaceId 与目录不一致、来自远端目录页，
  // 都不是「无权限」的证据。缺证据时先读实际实体，读到之前不授予本体删除。
  const ownershipCandidateKeys = useMemo(() => {
    if (!userId || isDeviceLocalOwnerId(userId)) return [] as string[];
    return eligibleRows
      .filter((row) => resolveRowOwnership({
        contentKey: row.key,
        type: row.item?.type,
        itemUserId: itemOwnerIdentity(row.item),
        entityOwnerId: entityOwnerIdFrom(dbEntities[row.key]),
        userId,
      }) === "unknown")
      .map((row) => row.key);
  }, [eligibleRows, dbEntities, userId]);
  const {
    owners: ownershipEvidence,
    failedKeys: ownershipFailedKeys,
    retry: retryOwnershipEvidence,
  } = useContentOwnershipEvidence({
    dispatch,
    keys: ownershipCandidateKeys,
    enabled: Boolean(userId),
    // 证据必须按账号 + 服务器分区：切账号后旧证据不能继续授权。
    scope: `${userId}@${runtime.currentServer ?? ""}`,
  });
  const spaceManageableMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const member of memberSpaces) {
      const id = normalizeSpaceId(member.spaceId);
      if (!id || map.has(id)) continue;
      map.set(
        id,
        isSpaceManager({
          spaceId: id,
          userId,
          memberSpaces,
          record: records?.get(id) as any,
        }),
      );
    }
    if (records) {
      for (const [id, record] of records) {
        if (map.has(id)) continue;
        map.set(
          id,
          isSpaceManager({
            spaceId: id,
            userId,
            memberSpaces,
            record: record as any,
          }),
        );
      }
    }
    return map;
  }, [memberSpaces, records, userId]);
  const capabilityFor = useCallback((key: string, item: any): ContentRowCapability => {
    const rowSpaceId = normalizeSpaceId(item?.spaceId) ?? null;
    const record = rowSpaceId ? records?.get(rowSpaceId) : undefined;
    const dbRecord = dbEntities[key];
    const ownership = resolveRowOwnership({
      contentKey: key,
      type: item?.type,
      itemUserId: itemOwnerIdentity(item),
      entityOwnerId: entityOwnerIdFrom(dbRecord) ?? ownershipEvidence.get(key) ?? null,
      userId,
      isDeviceLocal:
        isDeviceLocalOwnerId(userId) ||
        isDeviceLocalSpaceBody(record) ||
        isDeviceLocalSpaceBody(dbRecord),
    });
    return resolveContentRowCapability({
      ownership,
      spaceManageable: rowSpaceId ? (spaceManageableMap.get(rowSpaceId) ?? false) : false,
    });
  }, [dbEntities, ownershipEvidence, records, spaceManageableMap, userId]);
  const otherLabel = t("workspace_other", "其他空间");
  const unassociatedLabel = t("workspace_unassociated", "空间外");
  const labels = useMemo(
    () => ({ other: otherLabel, unassociated: unassociatedLabel }),
    [otherLabel, unassociatedLabel],
  );
  const recordNames = useMemo(
    () =>
      new Map(
        [...(records ?? [])].flatMap(([id, record]) =>
          record.name?.trim() ? [[id, record.name.trim()] as const] : [],
        ),
      ),
    [records],
  );
  const directoryRows = eligibleRows as WorkDialogFlatRow[];
  const claimedInNoSpace = useMemo(() => {
    if (homeScope.kind !== "noSpace") return null;
    if (!knownRemoteRecords && deviceLocalRecords.size === 0) return null;
    const combined = new Map<string, WorkSpaceRecord>();
    if (knownRemoteRecords) {
      for (const [id, record] of knownRemoteRecords) combined.set(id, record);
    }
    for (const [id, record] of deviceLocalRecords) combined.set(id, record);
    const byKey = new Map(directoryRows.map((row) => [row.key, row]));
    return collectClaimedDirectoryKeys(memberSpaces, combined, byKey);
  }, [homeScope.kind, knownRemoteRecords, deviceLocalRecords, directoryRows, memberSpaces]);
  const effectiveDirectoryRows = useMemo(
    () =>
      claimedInNoSpace && claimedInNoSpace.size > 0
        ? directoryRows.filter((row) => !claimedInNoSpace.has(row.key))
        : directoryRows,
    [directoryRows, claimedInNoSpace],
  );
  const spaceGroups = useMemo(() => {
    const include = (row: WorkDialogFlatRow) =>
      (row.item.type === "dialog" || includeNonDialogs) &&
      matchesTypeFilter(row.item, typeFilter) &&
      (typeFilter === "attachment" || !isAllViewDialogImageAttachment(row.item));
    return records
      ? projectWorkSpaceDirectories(
          effectiveDirectoryRows,
          currentSpaceId,
          memberSpaces,
          records,
          labels,
          include,
        )
      : groupWorkDialogsBySpace(
          effectiveDirectoryRows.filter(include),
          currentSpaceId,
          memberSpaces,
          recordNames,
          labels,
        );
  }, [
    records,
    effectiveDirectoryRows,
    currentSpaceId,
    memberSpaces,
    labels,
    includeNonDialogs,
    typeFilter,
    recordNames,
  ]);
  const showSpaceGroups = useMemo(() => {
    if (spaceGroups.length > 1) return true;
    const allGroups = records
      ? projectWorkSpaceDirectories(
          directoryRows,
          currentSpaceId,
          memberSpaces,
          records,
          labels,
        )
      : groupWorkDialogsBySpace(
          directoryRows,
          currentSpaceId,
          memberSpaces,
          recordNames,
          labels,
        );
    return allGroups.length > 1;
  }, [
    spaceGroups.length,
    records,
    directoryRows,
    currentSpaceId,
    memberSpaces,
    labels,
    recordNames,
  ]);

  // 删除命令：本文件是既有 Redux 消费端，由它把 deleteDbKey thunk 与 dispatch 绑成
  // 领域命令传给 useDeleteContentEntry（该 hook 自身不依赖 Redux）。
  const runDelete = useCallback<DeleteContentCommand>(
    (input, spaceId, options) => dispatch(deleteDbKey(input, spaceId, options)),
    [dispatch]
  );
  const { deleteContent } = useDeleteContentEntry(runDelete);
  const eligibleRowMap = useMemo(
    () => new Map(eligibleRows.map((r) => [r.key, r])),
    [eligibleRows]
  );
  // 当前路由上真实打开的那一行（无回退）：供「空间外」分组自动展开使用，
  // 也作为侧栏焦点行的首选，避免同一判据写两遍。
  const activeRowKey = useMemo(() => {
    for (const row of eligibleRows) {
      if (
        isRoutableContentActive({
          contentKey: row.key,
          type: row.item.type.toLowerCase(),
          userId,
          spaceId: currentSpaceId,
          currentPath: location.pathname,
        })
      ) {
        return row.key;
      }
    }
    return null;
  }, [eligibleRows, userId, currentSpaceId, location.pathname]);
  const defaultFocusedKey = activeRowKey ?? eligibleRows[0]?.key ?? null;

  const canDeleteRow = useCallback(
    (key: string) => {
      const row = eligibleRowMap.get(key);
      if (!row) return false;
      const capability = capabilityFor(key, row.item);
      return canDeleteSidebarItem({
        type: row.item.type,
        readOnly: capability.readOnly,
        canDeleteContent: capability.canDeleteContent,
      });
    },
    [eligibleRowMap, capabilityFor]
  );

  const handleDeleteRow = useCallback(
    (key: string) => {
      const row = eligibleRowMap.get(key);
      if (!row) return;
      return deleteContent({
        contentKey: row.key,
        title: row.item.title || titles.get(row.key) || row.key,
        spaceIdOverride: row.item.spaceId ?? null,
        sourceServerOrigin: "serverOrigin" in row.item ? row.item.serverOrigin : undefined,
      });
    },
    [eligibleRowMap, deleteContent, titles]
  );

  const { containerRef, containerProps, getRowProps } = useRovingRowKeyboard({
    defaultFocusedKey,
    canDeleteRow,
    onDeleteRow: handleDeleteRow,
  });

  const hierarchyView = useMemo(
    () => buildWorkDialogHierarchyView(flatRows, expandedDialogKeys, Date.now(), runningDialogKeys),
    [flatRows, expandedDialogKeys, runningDialogKeys],
  );
  const dateGroupLabel = (groupId: string): string => {
    const fallback = DATE_GROUP_FALLBACKS[groupId] ?? groupId;
    const labelKey = `time_group_${groupId}`;
    const label = t(labelKey, fallback);
    return label === labelKey ? fallback : label;
  };
  const [preferredActiveSpace, setPreferredActiveSpace] = useState<{
    key: string;
    spaceId: string | null;
  } | null>(null);
  const renderDialogRow = (
    { key, item }: WorkDialogFlatRow,
    loadedChildCount: number,
    isChildRow: boolean,
    depth: number,
    groupSpaceKey?: string | null,
  ) => {
    const rowSpaceId = item.spaceId ?? "";
    const rowSpaceKey = groupSpaceKey !== undefined ? groupSpaceKey : normalizeSpaceId(rowSpaceId) ?? null;
    const routeMatched = isRoutableContentActive({ contentKey: key, type: item.type.toLowerCase(), userId, spaceId: currentSpaceId, currentPath: location.pathname });
    const activeOwnerSpaceKey =
      routeMatched && homeScope.kind !== "project"
        ? resolveActiveSpaceGroupId(
            key,
            spaceGroups,
            currentSpaceId,
            preferredActiveSpace?.key === key ? preferredActiveSpace.spaceId : undefined,
          )
        : undefined;
    const isActive =
      routeMatched &&
      (activeOwnerSpaceKey === undefined || rowSpaceKey === activeOwnerSpaceKey);
    const rememberRowActivation = (event: React.MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement | null)?.closest?.("a")) {
        setPreferredActiveSpace({ key, spaceId: rowSpaceKey });
      }
    };
    const capability = capabilityFor(key, item);
    // 只读由「实际归属 + 空间角色」决定，不由 shared（缓存/目录来源）推定。
    const rowReadOnly = capability.readOnly;
    const canDeleteOwnedContent = capability.canDeleteContent;
    const isPinned = canDeleteOwnedContent ? Boolean(item.pinned ?? pinnedByKey.get(key)) : false;
    const pinAction = canDeleteOwnedContent ? {
      pinned: isPinned,
      onToggle: () => handleTogglePinned(key, item, rowSpaceId || null),
    } : undefined;
    const rowKeyboardProps = getRowProps(key);
    if (item.type.toLowerCase() !== "dialog") {
      return (
        <div key={key} role="row" {...rowKeyboardProps} onClickCapture={rememberRowActivation}>
          <SidebarItemRow spaceIdOverride={rowSpaceId} contentKey={key} sourceServerOrigin={"serverOrigin" in item ? item.serverOrigin : undefined} type={item.type.toLowerCase()} title={item.title || key} isActive={isActive} isMenuOpen={!rowReadOnly && activeMenuKey === key} readOnly={rowReadOnly} canDeleteContent={canDeleteOwnedContent} onToggleMenu={rowReadOnly ? ignoreMenuToggle : setActiveMenuKey} onMenuAnchorChange={rowReadOnly ? undefined : handleMenuAnchorChange} editSignal={rowReadOnly ? undefined : editRequest?.key === key ? editRequest.nonce : undefined} pinned={isPinned} pinAction={pinAction} hasUnread={item.type.toLowerCase() === "agent" ? isAgentRowUnread(unreadAgentKeys, key, userId) : undefined} />
        </div>
      );
    }
    const content = contentByKey.get(key);
    const ownerId = parseDialogKey(key)?.userId;
    const summary = canDeleteOwnedContent && content?.type === "dialog" && (ownerId === userId || ownerId === "local") ? content : undefined;
    return (
      <div
        key={key}
        role="row"
        data-hook={isChildRow ? "work-dialog-child-row" : undefined}
        {...rowKeyboardProps}
        onClickCapture={rememberRowActivation}
      >
        <SidebarItemRow spaceIdOverride={rowSpaceId} contentKey={key} type="dialog" title={item.title || titles.get(key) || key} disableAutoRead summaryStatus={summary && "status" in summary ? summary.status : undefined} summaryUnreadAt={summary && "unreadAt" in summary ? summary.unreadAt : undefined} isActive={isActive} isMenuOpen={!rowReadOnly && activeMenuKey === key} readOnly={rowReadOnly} canDeleteContent={canDeleteOwnedContent} onToggleMenu={rowReadOnly ? ignoreMenuToggle : setActiveMenuKey} onMenuAnchorChange={rowReadOnly ? undefined : handleMenuAnchorChange} editSignal={rowReadOnly ? undefined : editRequest?.key === key ? editRequest.nonce : undefined} pinned={isPinned} pinAction={pinAction} {...(loadedChildCount > 0 ? { childCount: loadedChildCount, isChildCollapsed: !expandedDialogKeys.has(key), onToggleChildCollapse: () => toggleDialogExpanded(key) } : {})} {...(isChildRow ? { isChildRow: true } : {})} depth={Math.min(depth, 2) as 0 | 1 | 2} aggregatedRunning={aggregatedRunningKeys.has(key)} />
      </div>
    );
  };

  const renderHierarchy = (view: ReturnType<typeof buildWorkDialogHierarchyView>) => (<div aria-label="最近活动对话">
      {view.runningRows.length > 0 && (
        <div data-hook="work-dialog-running-group" data-group-id="running">
          <div data-hook="work-dialog-date-header">正在进行</div>
          {view.runningRows.map((entry) => renderDialogRow(entry.row, entry.loadedChildCount, entry.isChild, entry.depth))}
        </div>
      )}
      {view.sections.map((section) => (
        <div key={section.key} data-hook="work-dialog-date-group" data-group-id={section.groupId}>
          <div data-hook="work-dialog-date-header">{dateGroupLabel(section.groupId)}</div>
          {section.rows.map((entry) => renderDialogRow(entry.row, entry.loadedChildCount, entry.isChild, entry.depth))}
        </div>
      ))}
    </div>);

  const flatHierarchyCache = useMemo(
    () => new WeakMap<readonly WorkDialogFlatRow[], ReturnType<typeof buildWorkDialogHierarchyView>>(),
    [expandedDialogKeys, runningDialogKeys],
  );
  const memberCategoriesBySpaceId = useMemo(() => {
    const map = new Map<string, Record<string, { name: string; order: number }>>();
    for (const member of memberSpaces) {
      const id = normalizeSpaceId(member.spaceId);
      if (id && member.categories && typeof member.categories === "object") {
        map.set(id, member.categories);
      }
    }
    return map;
  }, [memberSpaces]);
  const hasResolvedRemoteScope = resolvedRecords?.scope === nameScope;
  const spaceCategoriesCache = useMemo(() => {
    const map = new Map<string, ReturnType<typeof groupWorkDialogsByCategory>>();
    const dropEmpty = typeFilter !== "all";
    for (const group of spaceGroups) {
      if (!group.spaceId || group.directoryUnavailable) continue;
      const fallbackCats = !hasResolvedRemoteScope
        ? memberCategoriesBySpaceId.get(group.spaceId)
        : undefined;
      const record =
        records?.get(group.spaceId) ??
        (fallbackCats ? { categories: fallbackCats } : undefined);
      const hasCategories = Object.values(record?.categories ?? {}).some(category => category?.name?.trim());
      if (!hasCategories) continue;
      const activePendingForSpace =
        pendingCategories?.scope === nameScope
          ? pendingCategories.entries.get(group.spaceId)
          : undefined;
      const keepCategoryIds = activePendingForSpace
        ? new Set(Object.keys(activePendingForSpace))
        : undefined;
      map.set(
        group.spaceId,
        groupWorkDialogsByCategory(group.rows, record, {
          dropEmpty,
          keepCategoryIds,
        }),
      );
    }
    return map;
  }, [spaceGroups, records, hasResolvedRemoteScope, memberCategoriesBySpaceId, typeFilter, pendingCategories, nameScope]);

  // Keep running subtrees first and preserve parent/child folding, but render
  // ordinary history as one continuous list without invisible date sections.
  const renderFlatHierarchy = (
    groupRows: readonly WorkDialogFlatRow[],
    groupSpaceKey?: string | null,
  ) => {
    let view = flatHierarchyCache.get(groupRows);
    if (!view) {
      view = buildWorkDialogHierarchyView(groupRows, expandedDialogKeys, Date.now(), runningDialogKeys);
      flatHierarchyCache.set(groupRows, view);
    }
    return <div aria-label="最近活动对话">
      {view.runningRows.length > 0 && <div data-hook="work-dialog-running-group" data-group-id="running">
        <div>正在进行</div>
        {view.runningRows.map(entry => renderDialogRow(entry.row, entry.loadedChildCount, entry.isChild, entry.depth, groupSpaceKey))}
      </div>}
      {view.sections.flatMap(section => section.rows).map(entry =>
        renderDialogRow(entry.row, entry.loadedChildCount, entry.isChild, entry.depth, groupSpaceKey)
      )}
    </div>;
  };

  const renderSpace = (group: (typeof spaceGroups)[number]) => {
    const groupSpaceKey = normalizeSpaceId(group.spaceId) ?? null;
    const fallbackCats =
      !hasResolvedRemoteScope && group.spaceId
        ? memberCategoriesBySpaceId.get(group.spaceId)
        : undefined;
    const record =
      (group.spaceId ? records?.get(group.spaceId) : undefined) ??
      (fallbackCats ? { categories: fallbackCats } : undefined);
    if (group.directoryUnavailable) return <><p role="status">{t("workspace_directory_unavailable", "空间目录暂不可用，保留已加载内容")}</p>{renderFlatHierarchy(group.rows, groupSpaceKey)}</>;
    const hasCategories = Object.values(record?.categories ?? {}).some(category => category?.name?.trim());
    if (!hasCategories) return renderFlatHierarchy(group.rows, groupSpaceKey);
    const dropEmpty = typeFilter !== "all";
    const activePendingForSpace =
      group.spaceId && pendingCategories?.scope === nameScope
        ? pendingCategories.entries.get(group.spaceId)
        : undefined;
    const keepCategoryIds = activePendingForSpace
      ? new Set(Object.keys(activePendingForSpace))
      : undefined;
    const categories =
      (group.spaceId ? spaceCategoriesCache.get(group.spaceId) : undefined) ??
      groupWorkDialogsByCategory(group.rows, record, { dropEmpty, keepCategoryIds });
    // 特定类型筛选下，若所有具名分类均为空被隐去、仅剩「未分类」桶，省去多余的一层「未分类」壳直接平铺。
    if (dropEmpty && categories.every(category => category.id === null)) {
      return renderFlatHierarchy(group.rows, groupSpaceKey);
    }
    const canManage = canManageSpaceCategories({ spaceId: group.spaceId, userId, memberSpaces, record });
    const isInsideThisSpace =
      Boolean(group.spaceId) &&
      normalizeSpaceId(currentSpaceId) === normalizeSpaceId(group.spaceId);
    const allowCategoryHeaderEdit =
      canManage &&
      (typeFilter === "all" || isInsideThisSpace || Boolean(keepCategoryIds?.size));
    return (
      <WorkDialogCategoryGroups
        groups={categories}
        spaceId={group.spaceId ?? ""}
        userId={userId}
        canEdit={allowCategoryHeaderEdit}
        onCategoryRenamed={handleCategoryRenamed}
        onCategoryDeleted={handleCategoryDeleted}
      >
        {rows => renderFlatHierarchy(rows, groupSpaceKey)}
      </WorkDialogCategoryGroups>
    );
  };

  const activeRow = activeMenuKey ? eligibleRows.find((row) => row.key === activeMenuKey) : undefined;
  // 菜单可用性与行级一致：只有「自有内容」或「空间管理角色」才开菜单；
  // 删除本体/编辑标题/移出空间一律要求自有内容的正证据。
  const activeCapability = activeRow ? capabilityFor(activeRow.key, activeRow.item) : undefined;
  const activeIsReadOnly = !activeCapability || activeCapability.readOnly;
  const activeCanDeleteContent = Boolean(activeCapability?.canDeleteContent);
  const activeItemRow = activeRow?.item ?? activeItem;
  const activeSpaceId = normalizeSpaceId(activeItemRow?.spaceId);
  const canEditActiveInSpace = Boolean(
    activeSpaceId &&
    activeCanDeleteContent &&
    canManageSpaceCategories({
      spaceId: activeSpaceId,
      userId,
      memberSpaces,
      record: records?.get(activeSpaceId),
    })
  );
  const [appDeleteRequest, setAppDeleteRequest] = useState<{
    contentKey: string;
    spaceId?: string | null;
    sourceServerOrigin?: string;
  } | null>(null);
  const [unlinkRequest, setUnlinkRequest] = useState<
    { contentKey: string; title: string; spaceId: string; spaceName?: string } | null
  >(null);
  const activeSpaceManager = Boolean(
    activeSpaceId &&
    isSpaceManager({
      spaceId: activeSpaceId,
      userId,
      memberSpaces,
      record: records?.get(activeSpaceId) as any,
    })
  );

  const isNoSpace = homeScope.kind === "noSpace";
  const emptyMessage = partialFailure
    ? "加载失败，请稍后重试。"
    : isNoSpace
      ? t("workspace_unassociated_empty", "空间外还没有内容")
      : includeNonDialogs
        ? "暂无已加载的内容。"
        : "暂无已加载的对话。";

  return <div ref={containerRef} {...containerProps} data-hook="home-work-dialog-list" className="home-work-dialog-list">
    {(homeScope.kind === "all" || isNoSpace) && (
      !showSpaceGroups && !isNoSpace
        ? (spaceGroups[0] ? renderSpace(spaceGroups[0]) : renderFlatHierarchy([]))
        : (
          <WorkDialogSpaceGroups
            groups={spaceGroups}
            userId={userId}
            memberSpaces={memberSpaces}
            records={records}
            homeScope={homeScope}
            onSelectHomeScope={onSelectHomeScope}
            onSpaceRecordUpdate={handleSpaceRecordUpdate}
            activeRowKey={activeRowKey}
          >
            {renderSpace}
          </WorkDialogSpaceGroups>
        )
    )}
    {(homeScope.kind === "all" ? spaceGroups.every(group => group.rows.length === 0) : total === 0) ? <p role={partialFailure ? "alert" : undefined}>{emptyMessage}</p> : homeScope.kind === "project" ? renderHierarchy(hierarchyView) : null}
    {sharedEnabled && records && memberSpaces.some(member => { const id = normalizeSpaceId(member.spaceId); if (!id) return false; return !records.get(id)?.contents; }) && <p role="status">{t("workspace_directory_unavailable", "空间目录暂不可用，保留已加载内容")}</p>}
    {ownershipFailedKeys.size > 0 && <p role="status" data-hook="work-dialog-ownership-unverified">
      {`有 ${ownershipFailedKeys.size} 条内容的归属未能核实（暂时按不可删除处理，内容不受影响）。`}
      <button type="button" onClick={retryOwnershipEvidence}>重新核实</button>
    </p>}
    {partialFailure && <p role="status">部分对话暂时未能加载，已显示的对话仍可打开。</p>}
    {stalled && <p role="status">自动加载已暂停，点击下方重试继续加载。</p>}
    {canLoadMore && <>
      {autoLoadActive && <div ref={autoLoadSentinelRef} data-hook="work-dialog-autoload-sentinel" aria-hidden="true" />}
      {(!autoLoadActive || partialFailure) && <button type="button" disabled={controlDisabled} onClick={() => loadCombined(true)}>{controlLabel}</button>}
    </>}
    {activeMenuKey && !activeIsReadOnly && menuAnchorEl && <MenuPopover triggerRef={{ current: menuAnchorEl }} isOpen onOpenChange={(open) => { if (!open) closeMenu(); }} placement="bottom end">
      <SidebarItemMoreMenu
        contentKey={activeMenuKey}
        title={titles.get(activeMenuKey) || activeMenuKey}
        type={activeItemRow?.type ?? "dialog"}
        fileCategory={(activeItemRow as { fileCategory?: string | null } | undefined)?.fileCategory ?? null}
        sourceServerOrigin={serverOriginOfSourceItem(activeItemRow)}
        spaceId={activeSpaceId ?? undefined}
        canEditInSpace={canEditActiveInSpace}
        canMoveToSpace={activeCanDeleteContent && activeItemRow?.type !== "app"}
        canDeleteContent={activeCanDeleteContent}
        canRemoveFromSpace={activeSpaceManager && Boolean(activeSpaceId)}
        onRemoveFromSpace={() =>
          setUnlinkRequest({
            contentKey: activeMenuKey,
            title: titles.get(activeMenuKey) || activeMenuKey,
            spaceId: String(activeSpaceId),
            spaceName: activeSpaceId ? records?.get(activeSpaceId)?.name : undefined,
          })
        }
        showDownloadAction={activeItemRow?.type === "file" || activeItemRow?.type === "image"}
        menuAnchorEl={menuAnchorEl}
        onEditTitle={() => {
          setEditRequest({ key: activeMenuKey, nonce: Date.now() });
          closeMenu();
        }}
        onDeleteApp={() =>
          setAppDeleteRequest({
            contentKey: activeMenuKey,
            spaceId: activeSpaceId,
            sourceServerOrigin: serverOriginOfSourceItem(activeItemRow),
          })
        }
        onClose={closeMenu}
      />
    </MenuPopover>}
    <SidebarAppDeleteDialog
      request={appDeleteRequest}
      onClose={() => setAppDeleteRequest(null)}
    />
    <UnlinkContentFromSpaceDialog
      request={unlinkRequest}
      onClose={() => setUnlinkRequest(null)}
      dispatch={dispatch}
    />
  </div>;
}
