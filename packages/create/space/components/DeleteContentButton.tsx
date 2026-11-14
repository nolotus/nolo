// create/space/components/DeleteContentButton.tsx

import "./DeleteContentButton.css";
import React from "react";
import { LuTrash2 } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import {
  useDeleteContentEntry,
  type DeleteContentCommand,
  type DeleteContentEntryTarget,
} from "./useDeleteContentEntry";

export {
  useDeleteContentEntry,
  type DeleteContentCommand,
  type DeleteContentEntryTarget,
};

interface DeleteContentButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  contentKey: string;
  title: string;
  /**
   * 删除命令（由渲染方传入）：本组件不依赖 Redux，dispatch 由上层既有消费端绑定。
   */
  runDelete: DeleteContentCommand;
  /** HTML `title` attribute for the rendered button (tooltip). */
  htmlTitle?: string;
  className?: string;
  spaceIdOverride?: string | null;
  sourceServerOrigin?: string;
  as?: React.ElementType;
  onClick?: (e: React.MouseEvent) => void;
  onAction?: () => void;
  children?: React.ReactNode;
}

function DeleteContentButton({
  contentKey,
  title,
  htmlTitle,
  className,
  spaceIdOverride,
  sourceServerOrigin,
  runDelete,
  as: Component = "button",
  onClick: onPropClick,
  onAction: onPropAction,
  children,
  ...rest
}: DeleteContentButtonProps) {
  const { t } = useTranslation(["chat", "common"]);
  const { deleteContent, isDeleting } = useDeleteContentEntry(runDelete);

  const handleDelete = async (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    onPropClick?.(event as React.MouseEvent);
    onPropAction?.();
    if (isDeleting) return;
    await deleteContent({
      contentKey,
      title,
      spaceIdOverride,
      sourceServerOrigin,
    });
  };

  const hasCustomChildren = children != null;
  const deleteLabel = t("common:delete");
  // `title`/`htmlTitle` are destructured props, so they never reach `rest`: spread the
  // leftover attributes as a permissive record instead of re-widening to the full prop
  // type, which would make TS read `...safeRest` as overwriting the explicit `title`.
  const { onAction: _onAction, isDisabled: _isDisabled, textValue: _textValue, ...safeRest } = rest as Record<string, unknown>;
  const nativeProps = {
    className: `DeleteButton ${className || ""}`.trim(),
    // MenuItem surfaces its own onAction contract; plain <button> uses onClick.
    onClick: Component === "button" ? handleDelete : undefined,
    // Avoid implicit type=submit when rendered as a native <button> inside forms.
    type: Component === "button" ? "button" : undefined,
    disabled: isDeleting,
    "aria-label": rest["aria-label"] ?? deleteLabel,
    title: htmlTitle ?? deleteLabel,
    ...safeRest,
  };
  const menuProps = {
    ...nativeProps,
    onClick: undefined,
    onAction: handleDelete,
    isDisabled: isDeleting,
    textValue: deleteLabel,
    ...(!hasCustomChildren && { icon: LuTrash2, label: deleteLabel }),
  };
  // Do not leak menu-only contracts onto a native DOM element, including values
  // supplied through the permissive button-attribute rest props.
  const finalProps = Component === "button"
    ? nativeProps
    : menuProps;

  return React.createElement(
    Component as any,
    finalProps as any,
    hasCustomChildren
      ? children
      : Component === "button"
        ? React.createElement(LuTrash2, { size: 16, "aria-hidden": true })
        : null
  );
}

export default DeleteContentButton;
