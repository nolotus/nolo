// Domain wiring for the create menu: state, dispatch actions, item handlers.
// Presentation shell lives in CreateMenuButton.tsx; item policy in createMenuPolicy.ts.

import React, { lazy, Suspense, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "app/routing";
import { toast } from "app/utils/toast";
import { useAppDispatch, useAppSelector } from "app/store";
import { useHoverCapable } from "app/hooks/useHoverCapable";
import type { TypedThunkDispatch } from "app/store";
import { useSelector, useStore } from "react-redux";
import { selectIdentityUserId } from "identity/selectors";
import { canManageSpaceCategories } from "chat/web/sidebar/workDialogSpaceGroups";
import { setWorkSpacePreference } from "chat/web/sidebar/workSpaceUiStore";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import { normalizeSpaceId } from "database-engine/spaceLinkAccess";
import { selectById } from "database/dbSlice";
import { isTombstoneRecord } from "database/tombstones";
import { getRouteDescriptor } from "./mainLayoutViewMode";
import { useCreateMenuOpenCount, incrementCreateMenuOpenCount } from "./createMenuOpenCountStore";
import { useCreateDialog } from "chat/dialog/useCreateDialog";
import {
  resolveActiveProjectScope,
  linkContentToProject,
} from "chat/web/projectCreationScope";
import {
  resolveProjectCreationTarget,
  tryLinkToProject,
  projectStillExists,
} from "chat/web/projectScopedCreation";
import {
  bindDialogToProject,
} from "chat/web/desktopFolderProjects";
import { noloAgentId } from "core/init";
import { createDocState } from "render/page/docStore";
import { APP_TEMPLATES } from "app/constants/appTemplates";
import { AppRoutePaths, QUICK_CHAT_CREATE_APP_LAUNCH_SLUG } from "app/constants/routePaths";
import {
  LuFileText,
  LuChevronDown,
  LuBot,
  LuGrid2X2,
  LuUpload,
  LuCalendarClock,
  LuMessageCirclePlus,
  LuAppWindow,
  LuWaves,
  LuLayoutTemplate,
  LuLayoutGrid,
} from "react-icons/lu";
import { useCreateTable } from "render/table/useCreateTable";
import CreateTaskModal from "chat/web/CreateTaskModal";
import { Dialog } from "render/web/ui/modal/Dialog";
const CreateSpaceForm = lazy(() =>
  import("create/space/CreateSpaceForm").then((module) => ({ default: module.CreateSpaceForm })),
);
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import { DataType } from "create/types";
import type { Key } from "react-aria-components";
import CreateMenuButton from "./CreateMenuButton";
import { MenuItem } from "render/web/ui/Menu";
import { Header, MenuSection } from "render/web/ui/Menu";
import {
  type CreateMenuItemId,
  getVisibleCreateMenuItemIds,
  shouldShowCreateMenuLabel,
} from "./createMenuPolicy";
import { useCurrentSpaceFromEntity } from "create/space/useCurrentSpaceFromEntity";

type SpaceTarget = { id: string; name: string };
type CreationTarget = { spaceId: string; name: string; projectId: string | null };
const SPACE_ACTION_GROUPS = [["new-chat"], ["new-page", "new-table"], ["scheduled-task"]] as const;

const RAIL_CREATE_APP_GROUP_ITEM_IDS: readonly CreateMenuItemId[] = [
  "create-app",
  ...APP_TEMPLATES.filter((tmpl) => tmpl.showInCreateMenu).map(
    (tmpl) => `create-app-template-${tmpl.id}` as CreateMenuItemId,
  ),
];

// 暂时隐藏「新建应用」及其模板分组，待产品方案成熟后再启用
const RAIL_CREATE_MENU_GROUPS: readonly (readonly CreateMenuItemId[])[] = [
  ["new-chat", "create-space"],
  ["new-project", "new-page", "new-table"],
  ["create-agent-manual", "scheduled-task"],
  ["upload-file"],
] as const;

interface CreateMenuButtonContainerProps {
  variant?: "sidebar" | "topbar" | "inline" | "header";
  className?: string;
  showLabel?: boolean;
  categoryId?: string;
  title?: string;
  /** Retained for legacy callers; only a real Dialog binding supplies a project default. */
  projectScopeId?: string | null;
  scopeSpace?: SpaceTarget;
  onUploadClick?: () => void;
  onOpenMenu?: () => void;
  onOpenChange?: (open: boolean) => void;
}

const CreateMenuButtonContainer: React.FC<CreateMenuButtonContainerProps> = ({
  variant = "sidebar",
  className = "",
  showLabel,
  categoryId,
  title,
  scopeSpace,
  onUploadClick,
  onOpenMenu,
  onOpenChange,
}) => {
  const { t } = useTranslation(["space"]);
  const dispatch = useAppDispatch() as unknown as TypedThunkDispatch;
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = useSelector(selectIdentityUserId);
  const memberSpaces = useAllMemberSpaces();

  const { createNewDialog } = useCreateDialog();
  const isDesktop = typeof document !== "undefined" && document.documentElement.dataset.noloDesktop === "1";

  const currentSpace = useCurrentSpaceFromEntity();
  const createMenuOpenCount = useCreateMenuOpenCount();

  // 仅顶栏在支持 hover 的桌面端走 hover 展开；侧栏 / inline / header 维持点击。
  const hoverCapable = useHoverCapable();
  const hoverOpen = variant === "topbar" && hoverCapable;

  const [isOpen, setIsOpen] = useState(false);
  const [sessionTarget, setSessionTarget] = useState<CreationTarget>();
  const [showDestinations, setShowDestinations] = useState(false);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [taskTarget, setTaskTarget] = useState<{ spaceId: string | null } | null>(null);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);

  const { createNewTable, isCreating: isCreatingTable } = useCreateTable({
    onSuccess: () => setIsOpen(false),
  });

  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const route = getRouteDescriptor(pathname);
  const dialogKey = route.routeKind === "global" && route.contentKeyType === "dialog"
    && route.contentKey && !route.contentKey.includes("/") ? route.contentKey : null;
  const dialog = useAppSelector((state) => dialogKey ? selectById(state, dialogKey) : null);
  const dialogSpaceId = dialog?.type === DataType.DIALOG && !isTombstoneRecord(dialog)
    ? dialog.spaceId
    : null;
  const isNewChatRoute = pathname === AppRoutePaths.CHAT;
  // Only NewChatPage consumes the query. Existing dialogs can supply a loaded
  // record for the exact URL key; the last selected Space is not route context.
  const chatSpaceId = isNewChatRoute ? new URLSearchParams(location.search).get("spaceId") : null;
  const routeSpaceId = normalizeSpaceId(route.spaceId ?? chatSpaceId ?? dialogSpaceId);
  const canCreateIn = (id: string) => {
    const normalizedId = normalizeSpaceId(id);
    const record = normalizeSpaceId(currentSpace?.id) === normalizedId ? currentSpace : null;
    const known = record || memberSpaces.some((space) => normalizeSpaceId(space.spaceId) === normalizedId);
    return Boolean(known && canManageSpaceCategories({ spaceId: id, userId, memberSpaces, record }));
  };
  const writableSpaces = new Map<string, SpaceTarget>();
  for (const space of memberSpaces) {
    const id = normalizeSpaceId(space.spaceId);
    if (id && canCreateIn(id)) writableSpaces.set(id, { id: space.spaceId, name: space.spaceName || space.spaceId });
  }
  const contextSpace = routeSpaceId && canCreateIn(routeSpaceId)
    ? writableSpaces.get(routeSpaceId) ?? { id: routeSpaceId, name: currentSpace?.name || routeSpaceId }
    : null;
  if (contextSpace && routeSpaceId) writableSpaces.set(routeSpaceId, contextSpace);

  const outsideSpace = { spaceId: "", name: t("createOutsideSpace", "空间外"), projectId: null };
  const scopedTarget = scopeSpace && { spaceId: scopeSpace.id, name: scopeSpace.name, projectId: null };
  const getDefaultTarget = (): CreationTarget => {
    if (dialogKey) {
      const project = resolveActiveProjectScope({ location: { pathname, search: "" } });
      if (project) {
        const spaceId = project.spaceId ?? "";
        const spaceName = spaceId ? writableSpaces.get(normalizeSpaceId(spaceId) ?? "")?.name ?? spaceId : outsideSpace.name;
        return { spaceId, name: `${spaceName} · ${project.name}`, projectId: project.id };
      }
    }
    if (contextSpace) return { spaceId: contextSpace.id, name: contextSpace.name, projectId: null };
    return outsideSpace;
  };
  const targetForMenu = scopedTarget ?? sessionTarget ?? outsideSpace;
  const canUseTarget = targetForMenu.spaceId ? canCreateIn(targetForMenu.spaceId) : !scopeSpace;
  const targetCategoryId = categoryId && routeSpaceId && routeSpaceId === normalizeSpaceId(targetForMenu.spaceId) ? categoryId : undefined;

  // 计数副作用只在 count=true 分支触发；hover 预览 count=false 不递增
  // createMenuOpenCount（该计数超阈值会让「新建」引导标签永久消失）。
  // 共享一个纯函数 applyOpenChange，两个 useCallback 只差 count 参数，
  // 避免在渲染体内用工厂调 hook（违反 hooks 规则）。
  const applyOpenChange = useCallback(
    (open: boolean, count: boolean) => {
      if (open) {
        setSessionTarget(scopeSpace ? undefined : getDefaultTarget());
        setShowDestinations(false);
      }
      setIsOpen(open);
      onOpenChange?.(open);
      if (open && count) {
        incrementCreateMenuOpenCount();
        if (onOpenMenu) onOpenMenu();
      }
    },
    [getDefaultTarget, scopeSpace, onOpenChange, onOpenMenu]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => applyOpenChange(open, true),
    [applyOpenChange]
  );
  const handleHoverOpenChange = useCallback(
    (open: boolean) => applyOpenChange(open, false),
    [applyOpenChange]
  );

  const closeMenu = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const createLabel = t("common:create", "新建");
  const triggerTitle = title ?? createLabel;
  const shouldShowLabel = shouldShowCreateMenuLabel({
    showLabel,
    variant,
    createMenuOpenCount,
  });

  const isRail = variant === "sidebar" && !shouldShowLabel;

  /**
   * 关联失败（内容已创建、但没能挂到项目上）时统一提示。
   * 绝不能伪装成「创建失败」：用户会再点一次，造成重复创建。
   */
  const reportUnlinked = useCallback(
    (error: unknown) => {
      console.error("[createMenu] 内容已创建，但未能关联到项目", error);
      toast.info(
        t("chat:createdButNotLinkedToProject", "已创建，但未能关联到项目"),
      );
    },
    [t],
  );

  const resolveCreationTarget = () => {
    if (!canUseTarget) return null;
    if (targetForMenu.projectId) {
      let storage: Pick<Storage, "getItem"> | null = null;
      try { storage = window.localStorage; } catch { /* unavailable */ }
      const project = resolveProjectCreationTarget({ storage, project: null, requestedProjectId: targetForMenu.projectId });
      // A removed or retargeted project cannot change the displayed destination mid-session.
      if (!project.ok || project.spaceId !== targetForMenu.spaceId) {
        toast.error(t("chat:projectMissingForCreate", "项目已不存在，未创建任何内容"));
        return null;
      }
    }
    return targetForMenu;
  };

  const revealCreatedGroup = (spaceId: string) => {
    if (userId) setWorkSpacePreference(userId, "spaces", JSON.stringify(normalizeSpaceId(spaceId)), true);
  };

  const createNewPageAndClose = async () => {
    const target = resolveCreationTarget();
    // 项目已被删除：什么都不创建，避免留下无主数据。
    if (!target) return;
    const projectId = target.projectId;
    setIsCreatingPage(true);
    try {
      const key = await createDocState(
        {
          spaceId: target.spaceId,
          categoryId: targetCategoryId,
        },
        { dispatch, getState: store.getState }
      );
      if (!key) throw new Error("Unexpected createDoc result");
      revealCreatedGroup(target.spaceId);
      if (projectId) {
        const link = tryLinkToProject(projectId, () =>
          linkContentToProject(window.localStorage, projectId, key),
        );
        // 关联失败：内容已创建，继续导航并明确告知用户。
        if (!link.linked) reportUnlinked(link.error);
      }
      closeMenu();
      const path = buildRoutableContentPath({
        contentKey: key,
        type: DataType.DOC,
        spaceId: target.spaceId || null,
      });
      navigate(`${path}?edit=true`);
    } catch {
      closeMenu();
      toast.error(t("createPageFailed", "创建页面失败"));
    } finally {
      setIsCreatingPage(false);
    }
  };

  const handleManualCreateAgent = useCallback(() => {
    closeMenu();
    navigate("/create/agent");
  }, [closeMenu, navigate]);

  const handleUploadClick = useCallback(() => {
    closeMenu();
    onUploadClick?.();
  }, [closeMenu, onUploadClick]);

  const handleAction = (key: Key) => {
    const strKey = String(key);
    if (strKey === "create-app") {
      closeMenu();
      navigate(`${AppRoutePaths.CHAT}?launch=${QUICK_CHAT_CREATE_APP_LAUNCH_SLUG}`);
      return;
    }
    if (strKey.startsWith("create-app-template-")) {
      const templateId = strKey.slice("create-app-template-".length);
      const template = APP_TEMPLATES.find((tmpl) => tmpl.id === templateId);
      if (template) {
        closeMenu();
        navigate(`${AppRoutePaths.CHAT}?launch=${template.launchSlug}`);
        return;
      }
    }

    switch (key) {
      case "new-chat": {
        // 创建时同步快照
        const target = resolveCreationTarget();
        // 项目已被删除：什么都不创建，避免留下无主数据。
        if (!target) break;
        const projectId = target.projectId;
        closeMenu();
        void createNewDialog({
          agents: [noloAgentId],
          spaceId: target.spaceId,
          onCreated: ({ dbKey, spaceId }) => {
            revealCreatedGroup(spaceId ?? target.spaceId);
            if (!projectId) return;
            const link = tryLinkToProject(projectId, () => {
              // 关联前再确认一次：项目可能在创建期间刚好被删除。
              if (!projectStillExists(window.localStorage, projectId)) {
                throw new Error(`项目不存在，关联失败: ${projectId}`);
              }
              bindDialogToProject(window.localStorage, dbKey, projectId);
            });
            // 关联失败：对话已创建，继续导航并明确告知用户。
            if (!link.linked) reportUnlinked(link.error);
          },
        }).catch(() => toast.error(t("chat:createDialogFailed", "新建对话失败")));
        break;
      }
      case "create-space":
        // 新建空间不依赖当前选中的 space：表单自行创建并切换到新空间。
        closeMenu();
        setIsCreateSpaceOpen(true);
        break;
      case "new-project":
        closeMenu();
        break;
      case "new-page":
        void createNewPageAndClose();
        break;
      case "new-table": {
        const target = resolveCreationTarget();
        // 项目已被删除：什么都不创建，避免留下无主数据。
        if (!target) break;
        const projectId = target.projectId;
        createNewTable({
          spaceId: target.spaceId,
          categoryId: targetCategoryId,
          onCreated: (dbKey) => {
            revealCreatedGroup(target.spaceId);
            if (!projectId) return;
            const link = tryLinkToProject(projectId, () =>
              linkContentToProject(window.localStorage, projectId, dbKey),
            );
            // 关联失败：表格已创建，useCreateTable 仍会导航过去，并明确告知用户。
            if (!link.linked) reportUnlinked(link.error);
          },
        });
        break;
      }
      case "create-agent-manual":
        handleManualCreateAgent();
        break;
      case "scheduled-task": {
        const target = resolveCreationTarget();
        if (!target) break;
        setTaskTarget({ spaceId: target.spaceId || null });
        closeMenu();
        break;
      }
      case "upload-file":
        handleUploadClick();
        break;
      default:
        break;
    }
  };

  const renderMenuItem = (id: CreateMenuItemId): React.ReactNode => {
    switch (id) {
      case "new-chat": {
        const label = t("chat:newChat", "新对话");
        return (
          <MenuItem key={id} id={id} textValue={label} isDisabled={!canUseTarget}>
            {isRail || scopeSpace ? (
              <LuMessageCirclePlus size={16} aria-hidden="true" />
            ) : (
              <span aria-hidden="true">✦</span>
            )}
            <span slot="label">{label}</span>
          </MenuItem>
        );
      }
      case "create-space": {
        const label = t("space:create_new_space", "新建空间");
        return (
          <MenuItem key={id} id={id} textValue={label}>
            <LuLayoutGrid size={16} aria-hidden="true" />
            <span slot="label" title={label}>
              {label}
            </span>
          </MenuItem>
        );
      }
      case "new-project": {
        const label = t("project:newProject", "新建项目");
        return <MenuItem key={id} id={id} textValue={label}><span aria-hidden="true">▣</span><span slot="label">{label}</span></MenuItem>;
      }
      case "new-page": {
        const label = t("newPage");
        return (
          <MenuItem
            key={id}
            id={id}
            textValue={label}
            isDisabled={isCreatingPage || !canUseTarget}
          >
            {isCreatingPage ? (
              <div className="spinner" aria-hidden="true" />
            ) : (
              <LuFileText size={16} aria-hidden="true" />
            )}
            <span slot="label" title={label}>
              {label}
            </span>
          </MenuItem>
        );
      }
      case "new-table": {
        const label = t("table:newTable", "新建表格");
        return (
          <MenuItem
            key={id}
            id={id}
            textValue={label}
            isDisabled={isCreatingTable || !canUseTarget}
          >
            {isCreatingTable ? (
              <div className="spinner" aria-hidden="true" />
            ) : (
              <LuGrid2X2 size={16} aria-hidden="true" />
            )}
            <span slot="label" title={label}>
              {label}
            </span>
          </MenuItem>
        );
      }
      case "create-agent-manual": {
        const label = t("agent:create_agent_manual", "创建AI");
        return (
          <MenuItem key={id} id={id} textValue={label}>
            <LuBot size={16} aria-hidden="true" />
            <span slot="label" title={label}>
              {label}
            </span>
          </MenuItem>
        );
      }
      case "scheduled-task": {
        const label = t("scheduled", "任务");
        return (
          <MenuItem key={id} id={id} textValue={label} isDisabled={!canUseTarget}>
            <LuCalendarClock size={16} aria-hidden="true" />
            <span slot="label" title={label}>
              {label}
            </span>
          </MenuItem>
        );
      }
      case "upload-file": {
        const label = t("uploadFile");
        return (
          <MenuItem key={id} id={id} textValue={label}>
            <LuUpload size={16} aria-hidden="true" />
            <span slot="label" title={label}>
              {label}
            </span>
          </MenuItem>
        );
      }
      case "create-app": {
        const label = t("app:newApp", "新建应用");
        return (
          <MenuItem key={id} id={id} textValue={label}>
            <LuAppWindow size={16} aria-hidden="true" />
            <span slot="label" title={label}>
              {label}
            </span>
          </MenuItem>
        );
      }
      default: {
        const strId = String(id);
        if (strId.startsWith("create-app-template-")) {
          const templateId = strId.slice("create-app-template-".length);
          const template = APP_TEMPLATES.find((tmpl) => tmpl.id === templateId);
          if (template) {
            const label = t(template.labelKey, template.fallback);
            return (
              <MenuItem key={id} id={id} textValue={label}>
                {template.id === "surf" ? (
                  <LuWaves size={16} aria-hidden="true" />
                ) : (
                  <LuLayoutTemplate size={16} aria-hidden="true" />
                )}
                <span slot="label" title={label}>
                  {label}
                </span>
              </MenuItem>
            );
          }
        }
        return null;
      }
    }
  };

  const visibleItemIds = getVisibleCreateMenuItemIds({
    hasUploadHandler: Boolean(onUploadClick),
    isDesktop,
  });

  const isItemVisibleInRail = (id: CreateMenuItemId) => {
    if (id === "new-project") return false;
    if (id === "upload-file") return Boolean(onUploadClick);
    return true;
  };

  const menuItems =
    isRail ? (
      <>
        {RAIL_CREATE_MENU_GROUPS.map((group, groupIndex) => {
          const activeItems = group.filter(isItemVisibleInRail);
          if (activeItems.length === 0) return null;
          return (
            <MenuSection key={groupIndex} className="create-menu__section">
              {activeItems.map(renderMenuItem)}
            </MenuSection>
          );
        })}
      </>
    ) : (
      <>{visibleItemIds.map(renderMenuItem)}</>
    );

  const targetLabel = `${t("createDestination", "新建到")}：${targetForMenu.name}`;
  const destination = scopeSpace ? (
    <>
      {SPACE_ACTION_GROUPS.map((group, index) => (
        <MenuSection key={group[0]} className="create-menu__section">
          {index === 0 && <Header className="create-menu__destination" title={targetLabel}>{targetLabel}</Header>}
          {group.map(renderMenuItem)}
        </MenuSection>
      ))}
    </>
  ) : (
    <>
      <MenuItem id="toggle-destinations" textValue={targetLabel} shouldCloseOnSelect={false}
        onAction={() => setShowDestinations((show) => !show)}>
        <span slot="label" title={targetLabel}>{targetLabel}</span>
        <LuChevronDown className="app-menu-chevron" size={16} aria-hidden="true" />
      </MenuItem>
      {showDestinations && (
        <MenuSection aria-label={t("createDestination", "新建到")} selectionMode="single"
          selectedKeys={targetForMenu.projectId ? [] : [`destination:${targetForMenu.spaceId}`]}>
          {[outsideSpace, ...Array.from(writableSpaces.values(), ({ id, name }) => ({ spaceId: id, name, projectId: null }))].map((target) => (
            <MenuItem
              id={`destination:${target.spaceId}`}
              key={target.spaceId}
              shouldCloseOnSelect={false}
              onAction={() => setSessionTarget(target)}
            >
              {target.name}
            </MenuItem>
          ))}
        </MenuSection>
      )}
    </>
  );

  return (
    <>
      <CreateMenuButton
        variant={variant}
        className={className}
        title={triggerTitle}
        createLabel={createLabel}
        shouldShowLabel={shouldShowLabel}
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        onHoverOpenChange={handleHoverOpenChange}
        onAction={handleAction}
        hoverOpen={hoverOpen}
      >
        {destination}
        {!scopeSpace && menuItems}
      </CreateMenuButton>
      <CreateTaskModal
        isOpen={taskTarget !== null && (!taskTarget.spaceId || canCreateIn(taskTarget.spaceId))}
        onClose={() => setTaskTarget(null)}
        spaceId={taskTarget?.spaceId}
      />
      {isCreateSpaceOpen && <Dialog
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
      >
        <Suspense fallback={null}>
          <CreateSpaceForm onClose={() => setIsCreateSpaceOpen(false)} />
        </Suspense>
      </Dialog>}
    </>
  );
};

export default CreateMenuButtonContainer;
