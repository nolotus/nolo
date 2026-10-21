import { mergeSharedHistoryItems } from "./sharedHistoryMerge";
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "app/routing";
import type { MyContentListItem } from "app/utils/myContentItems";
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
import SidebarItemRow from "create/space/SidebarItemRow";
import { SidebarItemMoreMenu } from "create/space/SidebarItemMoreMenu";
import { MenuPopover } from "render/web/ui/MenuPopover";
import type { WorkRunListCoverage, WorkRunListSnapshot } from "./workRunListCoverage";
import type { WorkRunSignal } from "app/navigation/workDialogProjection";

const ignoreMenuToggle = (_key: string | null): void => {};

const WORK_GROUP_SECTIONS = [
  ["needs-you", "需要我处理"],
  ["working", "正在运行"],
  ["recent", "已完成"],
] as const;

export function WorkDialogGroupsPreview({
  items, userId, homeScope = { kind: "all" },
}: { items: readonly MyContentListItem[]; userId: string; homeScope?: HomeScope }) {
  if (!userId) return null;
  return (
    <section aria-label="工作状态" data-hook="work-dialog-groups">
      <WorkDialogGroupsExpanded items={items} userId={userId} homeScope={homeScope} />
    </section>
  );
}

function WorkDialogGroupsExpanded({ items, userId, homeScope }: { items: readonly MyContentListItem[]; userId: string; homeScope: HomeScope }) {
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
  const sharedItems = useMemo(() => sharedEnabled ? mergeSharedHistoryItems(sharedPages.records.filter((record) =>
    record.type === "dialog" && record.ownerUserId && record.ownerUserId !== userId &&
    parseDialogKey(record.contentKey)?.userId === record.ownerUserId &&
    memberSpaces.some((space) => space.spaceId === record.spaceId)
  )) : [], [sharedEnabled, sharedPages.records, userId, memberSpaces]);
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
  const liveness = useMemo(
    () => resolveWorkLiveness({ now, snapshot, storeRuns }),
    [now, snapshot, storeRuns],
  );
  // V2-B 预览尚未接入「agent 正在等用户回答」的权威来源（waitingUserByDialogKey
  // 在生产侧不接线）：「需要我处理」当前由「需处置 / 状态未知」触发，不代表一定在等你。
  const groups = useMemo(() => projectWorkDialogData(items, tasks, {
    sharedItems,
    userId, dialogStatuses, dialogEventTimestamps, now,
    liveDialogIds: liveness.liveDialogIds,
    uncertainDialogIds: liveness.uncertainDialogIds,
  }), [items, tasks, userId, sharedItems, dialogStatuses, dialogEventTimestamps, now, liveness]);
  const titles = useMemo(() => new Map([...items.map((item) => [item.contentKey, item.title] as const), ...sharedItems.map((item) => [item.contentKey, item.title] as const)]), [items, sharedItems]);
  const sharedKeys = useMemo(() => new Set(sharedItems.map((item) => item.contentKey)), [sharedItems]);
  const pinnedByKey = useMemo(
    () => new Map(items.map((item) => [item.contentKey, Boolean(item.pinned)])),
    [items],
  );
  const total = WORK_GROUP_SECTIONS.reduce((sum, [key]) => sum + groups[key].length, 0);

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

  return (
    <div data-hook="home-work-dialog-list">
      <p role="status">{coverageText(coverage, snapshot)}</p>
      {sharedEnabled && sharedPages.hasMoreSpaces.map((spaceId) => {
        const failed = Boolean(sharedPages.errorsBySpace[spaceId]);
        return <button key={spaceId} type="button" disabled={sharedPages.loadingSpaces.includes(spaceId)}
          onClick={() => void sharedPages.loadMore(spaceId)}>
          {failed ? `重试共享历史失败来源（${spaceId}）` : `加载更多共享历史来源（${spaceId}）`}
        </button>;
      })}
      {total === 0 ? (
        <p>暂无已加载的对话。</p>
      ) : WORK_GROUP_SECTIONS.map(([key, label]) => {
        const rows = groups[key];
        // 空分组不占位：只有「已完成」在为零时仍保留，用来给出明确空态。
        if (rows.length === 0 && key !== "recent") return null;
        return (
          <div key={key}>
            <h3>{label} ({rows.length})</h3>
            {rows.map((dialog) => {
              const title = titles.get(dialog.dialogKey) || dialog.dialogKey;
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
                  title={statusLabel(dialog.runs, dialog.needsUserAction)}
                >
                  <SidebarItemRow
                    contentKey={dialog.dialogKey}
                    type="dialog"
                    title={title}
                    isActive={isActive}
                    isMenuOpen={!sharedKeys.has(dialog.dialogKey) && activeMenuKey === dialog.dialogKey}
                    readOnly={sharedKeys.has(dialog.dialogKey)}
                    onToggleMenu={sharedKeys.has(dialog.dialogKey) ? ignoreMenuToggle : setActiveMenuKey}
                    onMenuAnchorChange={sharedKeys.has(dialog.dialogKey) ? undefined : handleMenuAnchorChange}
                    editSignal={sharedKeys.has(dialog.dialogKey) ? undefined : editRequest?.key === dialog.dialogKey ? editRequest.nonce : undefined}
                    pinned={sharedKeys.has(dialog.dialogKey) ? false : pinnedByKey.get(dialog.dialogKey) ?? false}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
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
            type="dialog"
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

function statusLabel(runs: readonly WorkRunSignal[] | undefined, needsUserAction?: boolean): string {
  if (needsUserAction) return "等你处置";
  if (!runs || runs.length === 0) return "无运行记录";
  if (runs.includes("requires-action")) return "需处置";
  if (runs.includes("unknown")) return "状态未知";
  if (runs.includes("waiting-user")) return "待你处理";
  if (runs.includes("live")) return "运行中";
  if (runs.includes("terminal")) return "已停止";
  return "无运行记录";
}

function coverageText(coverage: WorkRunListCoverage, snapshot?: WorkRunListSnapshot): string {
  if (coverage.status === "loading") return "正在检查运行列表范围…";
  if (coverage.status === "error") return "运行列表查询失败或响应无效；状态可能不完整";
  const attributable = snapshot ? snapshot.attributableRunIds.size : 0;
  if (coverage.status === "partial") {
    return `运行列表仅加载 ${coverage.count}/${coverage.total} 条，其中 ${attributable} 条可归属到对话；未覆盖对话的运行状态未知，不会据此判定已结束`;
  }
  return `运行列表查询返回 ${coverage.count}/${coverage.total} 条（本次查询范围完整），其中 ${attributable} 条可归属到对话`;
}
