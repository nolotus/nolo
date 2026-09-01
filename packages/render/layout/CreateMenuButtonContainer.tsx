// Domain wiring for the create menu: state, dispatch actions, item handlers.
// Presentation shell lives in CreateMenuButton.tsx; item policy in createMenuPolicy.ts.

import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "app/routing";
import { toast } from "app/utils/toast";
import { useAppDispatch, useAppSelector } from "app/store";
import { useHoverCapable } from "app/hooks/useHoverCapable";
import type { TypedThunkDispatch } from "app/store";
import { useStore } from "react-redux";
import {
  selectCreateMenuOpenCount,
  setSettings,
} from "app/settings/settingSlice";
import { createDocState } from "render/page/docStore";
import {
  LuFileText,
  LuMessageSquare,
  LuBot,
  LuGrid2X2,
  LuUpload,
  LuCalendarClock,
} from "react-icons/lu";
import { AppRoutePaths } from "app/constants/routePaths";
import { useCreateTable } from "render/table/useCreateTable";
import CreateTaskModal from "chat/web/CreateTaskModal";
import { selectCurrentSpace, selectCurrentSpaceId, selectViewMode } from "create/space/spaceCurrentSelectors";
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import { DataType } from "create/types";
import type { Key } from "react-aria-components";
import CreateMenuButton from "./CreateMenuButton";
import { MenuItem } from "render/web/ui/Menu";
import {
  type CreateMenuItemId,
  getVisibleCreateMenuItemIds,
  shouldShowCreateMenuLabel,
} from "./createMenuPolicy";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
import { useCurrentSpaceFromEntity } from "create/space/spaceCurrentSelectors";
import { useViewMode } from "create/space/spaceCurrentStore";

interface CreateMenuButtonContainerProps {
  variant?: "sidebar" | "topbar" | "inline" | "header";
  className?: string;
  showLabel?: boolean;
  categoryId?: string;
  title?: string;
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
  onUploadClick,
  onOpenMenu,
  onOpenChange,
}) => {
  const { t } = useTranslation(["space"]);
  const dispatch = useAppDispatch() as unknown as TypedThunkDispatch;
  const store = useStore();
  const navigate = useNavigate();

  const currentSpace = useCurrentSpaceFromEntity();
  const currentSpaceId = useCurrentSpaceId();
  const viewMode = useViewMode();
  const createMenuOpenCount = useAppSelector(selectCreateMenuOpenCount);

  // 仅顶栏在支持 hover 的桌面端走 hover 展开；侧栏 / inline / header 维持点击。
  const hoverOpen = variant === "topbar" && useHoverCapable();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const { createNewTable, isCreating: isCreatingTable } = useCreateTable({
    onSuccess: () => setIsOpen(false),
  });

  const sidebarScopedSpaceId =
    variant === "sidebar"
      ? viewMode === "all"
        ? null
        : currentSpaceId ?? currentSpace?.id ?? null
      : undefined;

  const pageCreateSpaceId = currentSpaceId ?? currentSpace?.id ?? null;

  // 计数副作用只在 count=true 分支触发；hover 预览 count=false 不递增
  // createMenuOpenCount（该计数超阈值会让「新建」引导标签永久消失）。
  // 共享一个纯函数 applyOpenChange，两个 useCallback 只差 count 参数，
  // 避免在渲染体内用工厂调 hook（违反 hooks 规则）。
  const applyOpenChange = useCallback(
    (open: boolean, count: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
      if (open && count) {
        void dispatch(
          setSettings({ createMenuOpenCount: createMenuOpenCount + 1 })
        );
        if (onOpenMenu) onOpenMenu();
      }
    },
    [createMenuOpenCount, dispatch, onOpenChange, onOpenMenu]
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

  const createChat = useCallback(() => {
    closeMenu();
    const spaceId = currentSpaceId ?? currentSpace?.id ?? null;
    navigate(
      spaceId
        ? `${AppRoutePaths.CHAT}?spaceId=${encodeURIComponent(spaceId)}`
        : AppRoutePaths.CHAT
    );
  }, [closeMenu, currentSpaceId, currentSpace?.id, navigate]);

  const createNewPageAndClose = useCallback(async () => {
    setIsCreatingPage(true);
    try {
      const key = await createDocState(
        {
          spaceId: pageCreateSpaceId ?? undefined,
          categoryId,
        },
        { dispatch, getState: store.getState }
      );
      if (!key) throw new Error("Unexpected createDoc result");
      closeMenu();
      const path = buildRoutableContentPath({
        contentKey: key,
        type: DataType.DOC,
        spaceId: pageCreateSpaceId,
      });
      navigate(`${path}?edit=true`);
    } catch {
      closeMenu();
      toast.error(t("createPageFailed", "创建页面失败"));
    } finally {
      setIsCreatingPage(false);
    }
  }, [closeMenu, dispatch, navigate, pageCreateSpaceId, categoryId, t]);

  const handleManualCreateAgent = useCallback(() => {
    closeMenu();
    navigate("/create/agent");
  }, [closeMenu, navigate]);

  const handleCreateTask = useCallback(() => {
    closeMenu();
    setIsCreateTaskOpen(true);
  }, [closeMenu]);

  const handleUploadClick = useCallback(() => {
    closeMenu();
    onUploadClick?.();
  }, [closeMenu, onUploadClick]);

  const handleAction = useCallback(
    (key: Key) => {
      switch (key) {
        case "new-chat":
          createChat();
          break;
        case "new-page":
          void createNewPageAndClose();
          break;
        case "new-table":
          createNewTable({
            spaceId: sidebarScopedSpaceId ?? undefined,
            categoryId,
          });
          break;
        case "create-agent-manual":
          handleManualCreateAgent();
          break;
        case "scheduled-task":
          handleCreateTask();
          break;
        case "upload-file":
          handleUploadClick();
          break;
        default:
          break;
      }
    },
    [
      createChat,
      createNewPageAndClose,
      createNewTable,
      sidebarScopedSpaceId,
      categoryId,
      handleManualCreateAgent,
      handleCreateTask,
      handleUploadClick,
    ]
  );

  const renderMenuItem = (id: CreateMenuItemId): React.ReactNode => {
    switch (id) {
      case "new-chat": {
        const label = t("chat:newchat", "新建对话");
        return (
          <MenuItem key={id} id={id} textValue={label}>
            <LuMessageSquare size={16} aria-hidden="true" />
            <span slot="label" title={label}>
              {label}
            </span>
          </MenuItem>
        );
      }
      case "new-page": {
        const label = t("newPage");
        return (
          <MenuItem
            key={id}
            id={id}
            textValue={label}
            isDisabled={isCreatingPage}
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
            isDisabled={isCreatingTable}
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
        const label = t("agent:create_agent_manual", "手动配置 AI");
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
          <MenuItem key={id} id={id} textValue={label}>
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
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  };

  const menuItems = (
    <>
      {getVisibleCreateMenuItemIds({
        hasUploadHandler: Boolean(onUploadClick),
      }).map(renderMenuItem)}
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
        {menuItems}
      </CreateMenuButton>
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        spaceId={sidebarScopedSpaceId}
      />
    </>
  );
};

export default CreateMenuButtonContainer;
