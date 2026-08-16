// CategoryHeader.tsx
import "./CategoryHeader.css";
import React, { useState, useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import {
  LuPencil,
  LuTrash2,
  LuChevronDown,
} from "react-icons/lu";
import {
  updateCategoryName,
  deleteCategory,
  selectCurrentSpaceId,
  toggleCategoryCollapse,
  selectIsCategoryCollapsed,
} from "create/space/spaceSlice";
import CreateMenuButton from "render/layout/CreateMenuButtonContainer";
import { useTranslation } from "react-i18next";
import { useInlineEdit } from "render/web/ui/useInlineEdit";
import InlineEditInput from "render/web/ui/InlineEditInput";
import { UNCATEGORIZED_ID } from "create/space/constants";
import type { TypedThunkDispatch } from "app/store";

// buildCreateSlice 导出的 action creator 在类型推断下会被并上 `void`，
// 导致无法直接调用。这里通过 `as unknown` 把它们恢复为可调用签名，返回类型用
// `unknown` 是因为 thunk 的真正返回类型由 dispatch 的 `TypedThunkDispatch` 决定。
const updateCategoryNameAction = updateCategoryName as unknown as (payload: {
  spaceId: string;
  categoryId: string;
  name: string;
}) => unknown;
const deleteCategoryAction = deleteCategory as unknown as (payload: {
  spaceId: string;
  categoryId: string;
}) => unknown;
const toggleCategoryCollapseAction = toggleCategoryCollapse as unknown as (payload: {
  categoryId: string;
}) => unknown;

interface CategoryHeaderProps {
  categoryId: string;
  categoryName: string;
  itemCount?: number;
  handleProps?: {
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
  };
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  categoryId,
  categoryName = "",
  itemCount,
  handleProps,
}) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch() as unknown as TypedThunkDispatch;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const spaceId = useAppSelector(selectCurrentSpaceId);
  const isUncategorized = categoryId === UNCATEGORIZED_ID;
  const isCollapsed = useAppSelector(selectIsCategoryCollapsed(categoryId));
  const displayCategoryName = isUncategorized
    ? t("uncategorized")
    : categoryName;

  const handleSaveName = useCallback(
    (newName: string) => {
      if (spaceId && !isUncategorized) {
        dispatch(updateCategoryNameAction({ spaceId, categoryId, name: newName }));
      }
    },
    [dispatch, spaceId, categoryId, isUncategorized]
  );

  const { isEditing, startEditing, inputRef, inputProps } = useInlineEdit({
    initialValue: displayCategoryName,
    onSave: handleSaveName,
    placeholder: t("categoryNamePlaceholder"),
    disabled: isUncategorized,
  });

  const handleToggleCollapse = () =>
    dispatch(toggleCategoryCollapseAction({ categoryId }));

  const handleDelete = () => {
    if (spaceId && !isUncategorized) {
      dispatch(deleteCategoryAction({ spaceId, categoryId }));
    }
    setIsDeleteModalOpen(false);
  };

  const handleSectionClick = (e: React.MouseEvent) => {
    // 点击 actions 区域、菜单按钮或正在编辑时不触发折叠
    if (isEditing) return;
    // Create menu is portaled out of .CategoryHeader__actions in the DOM, but
    // React still bubbles the click here. Without this guard, "新建页面"
    // toggles collapse (close) before addContent force-expands (open) → flash.
    if (isCreateMenuOpen) return;
    const target = e.target as HTMLElement;
    if (target.closest(".CategoryHeader__actions")) return;
    if (target.closest(".CategoryHeader__collapse-btn")) return;
    if (target.closest(".create-menu")) return;
    if (target.closest(".create-menu-popover")) return;
    handleToggleCollapse();
  };

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      setIsDragging(true);
      e.dataTransfer.setData("categoryId", categoryId);
      e.dataTransfer.setData("dragType", "category");
      e.dataTransfer.effectAllowed = "move";
      handleProps?.onDragStart?.(e);
    },
    [categoryId, handleProps]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      setIsDragging(false);
      handleProps?.onDragEnd?.(e);
    },
    [handleProps]
  );

  const canEdit = !isUncategorized && !isEditing;
  const canDrag = canEdit && !!handleProps;

  const nameProps = useMemo(
    () =>
      canDrag
        ? {
          draggable: true,
          onDragStart: handleDragStart,
          onDragEnd: handleDragEnd,
        }
        : {},
    [canDrag, handleDragStart, handleDragEnd]
  );

  const headerClass = [
    "CategoryHeader",
    isEditing && "CategoryHeader--editing",
    isDragging && "CategoryHeader--dragging",
    isCreateMenuOpen && "is-menu-open",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        className={headerClass}
        onClick={handleSectionClick}
        style={{ cursor: isEditing ? "default" : "pointer" }}
      >
        <button
          className={`CategoryHeader__collapse-btn ${isCollapsed ? "is-collapsed" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleCollapse();
          }}
          title={isCollapsed ? t("expand") : t("collapse")}
          aria-label={isCollapsed ? t("expand") : t("collapse")}
          aria-expanded={!isCollapsed}
          type="button"
          style={{ visibility: !itemCount ? "hidden" : "visible" }}
        >
          <LuChevronDown size={16} aria-hidden="true" />
        </button>

        {isEditing ? (
          <InlineEditInput inputRef={inputRef} {...inputProps} />
        ) : (
          <span
            className={`CategoryHeader__name ${canDrag ? "is-draggable" : ""}`}
            {...nameProps}
            title={canDrag ? t("dragToReorder") : displayCategoryName}
          >
            {displayCategoryName}
          </span>
        )}
        {itemCount !== undefined && itemCount > 0 && (
          <span className="CategoryHeader__badge">{itemCount}</span>
        )}

        {canEdit && (
          <div
            className="CategoryHeader__actions"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CreateMenuButton
              variant="header"
              categoryId={categoryId}
              className="CategoryHeader__action-btn"
              title={t("newPage")}
              onOpenChange={setIsCreateMenuOpen}
            />
            <button
              className="CategoryHeader__action-btn"
              onClick={startEditing}
              title={t("editName")}
              aria-label={t("editName")}
              type="button"
            >
              <LuPencil size={14} aria-hidden="true" />
            </button>
            <button
              className="CategoryHeader__action-btn is-danger"
              onClick={() => setIsDeleteModalOpen(true)}
              title={t("deleteCategory")}
              aria-label={t("deleteCategory")}
              type="button"
            >
              <LuTrash2 size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {!isUncategorized && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title={t("deleteCategory")}
          message={t("deleteCategoryConfirm", { name: displayCategoryName })}
          confirmText={t("common:confirmDelete")}
          cancelText={t("common:cancel")}
          type="error"
          showCancel
        />
      )}

      
    </>
  );
};

export default React.memo(CategoryHeader);
