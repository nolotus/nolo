// create/space/components/DeleteContentButton.tsx

import "./DeleteContentButton.css";
import React, { useState } from "react";
import { LuTrash2 } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "app/routing";
import {
  selectCurrentSpaceId,
} from "create/space/spaceSlice";
import { normalizeSpaceId } from "create/space/spaceKeys";
import { useAppDispatch, useAppSelector } from "app/store";
import { toast } from "app/utils/toast"
import { deleteDbKey, getDeleteErrorMessage } from "app/hooks/deleteDbKey";
import {
  isViewingDeletedContent,
  resolveDeleteSuccessPath,
} from "render/layout/deleteBehavior";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

interface DeleteContentButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  contentKey: string;
  title: string;
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
  as: Component = "button",
  onClick: onPropClick,
  onAction: onPropAction,
  children,
  ...rest
}: DeleteContentButtonProps) {
  const { t } = useTranslation(["chat", "common"]);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currentSpaceId = useCurrentSpaceId();
  const effectiveSpaceId =
    spaceIdOverride === undefined ? currentSpaceId : spaceIdOverride;

  const [isDeleting, setIsDeleting] = useState(false);
  const safeTitle =
    typeof title === "string" && title.trim().length > 0 ? title : contentKey;

  const handleDelete = async (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    onPropClick?.(event as React.MouseEvent);
    onPropAction?.();
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await dispatch(
        deleteDbKey(
          {
            contentKey,
            serverOrigin: sourceServerOrigin,
          },
          effectiveSpaceId
        )
      );
      toast.success(t("deleteMovedToTrash", { title: safeTitle }));

      // Sidebar delete while viewing that page/dialog: leave the dead route.
      if (isViewingDeletedContent(location.pathname, contentKey)) {
        const redirect =
          resolveDeleteSuccessPath({
            contentKey,
            routeSpaceId: effectiveSpaceId,
          }) ??
          (effectiveSpaceId
            ? `/space/${normalizeSpaceId(effectiveSpaceId)}`
            : undefined);
        if (redirect) {
          navigate(redirect, { replace: true });
        } else {
          navigate(-1);
        }
      }
    } catch (error) {
      const message = getDeleteErrorMessage(error, t("deleteFailed"));
      console.error("Failed to delete content:", message, error);
      toast.error(message === t("deleteFailed") ? message : `${t("deleteFailed")}: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasCustomChildren = children != null;
  const deleteLabel = t("common:delete");
  const props = {
    className: `DeleteButton ${className || ""}`.trim(),
    // MenuItem surfaces its own onAction contract; plain <button> uses onClick.
    onClick: Component === "button" ? handleDelete : undefined,
    onAction: Component !== "button" ? handleDelete : undefined,
    // Avoid implicit type=submit when rendered as a native <button> inside forms.
    type: Component === "button" ? "button" : undefined,
    disabled: isDeleting,
    isDisabled: Component !== "button" ? isDeleting : undefined,
    textValue: Component !== "button" ? deleteLabel : undefined,
    "aria-label": rest["aria-label"] ?? deleteLabel,
    title: htmlTitle ?? deleteLabel,
    ...rest,
    ...(Component !== "button" && !hasCustomChildren && {
      icon: LuTrash2,
      label: deleteLabel,
    }),
  };

  return React.createElement(
    Component as any,
    props as any,
    hasCustomChildren
      ? children
      : Component === "button"
        ? React.createElement(LuTrash2, { size: 16, "aria-hidden": true })
        : null
  );
}

export default DeleteContentButton;
