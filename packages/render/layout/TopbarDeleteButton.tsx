// 文件: render/layout/blocks/TopbarDeleteButton.tsx

import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"
import { LuTrash2 } from "react-icons/lu";
import { useNavigate } from "app/routing";

import { useAppDispatch } from "app/store";
import { deleteDbKey, getDeleteErrorMessage } from "app/hooks/deleteDbKey";
import { isDialogKey } from "database/keys";

interface TopbarDeleteButtonProps {
  contentKey?: string;
  title?: string;
  spaceId?: string | null;
  className?: string;
  label?: string;
  redirectTo?: string;
}

const TopbarDeleteButton: React.FC<TopbarDeleteButtonProps> = ({
  contentKey,
  title,
  spaceId,
  className = "topbar__button topbar__button--delete",
  label,
  redirectTo,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [isDeleting, setDeleting] = useState(false);

  const isDialogDelete = Boolean(contentKey && isDialogKey(contentKey));

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!contentKey) {
        toast.error(t("deleteFailedInfoMissing"));
        return;
      }
      if (isDeleting) return;

      setDeleting(true);
      try {
        await dispatch(
          deleteDbKey(
            isDialogDelete
              ? { contentKey, includeAttachments: true }
              : contentKey,
            spaceId,
          ),
        );
        toast.success(t("deleteMovedToTrash", { title: title || contentKey }));

        if (redirectTo) {
          navigate(redirectTo, { replace: true });
        } else {
          navigate(-1);
        }
      } catch (err) {
        const message = getDeleteErrorMessage(err, t("deleteFailed"));
        console.error("Failed to delete content:", message, err);
        toast.error(message === t("deleteFailed") ? message : `${t("deleteFailed")}: ${message}`);
      } finally {
        setDeleting(false);
      }
    },
    [contentKey, dispatch, isDialogDelete, isDeleting, navigate, redirectTo, spaceId, t, title]
  );

  return (
    <button
      type="button"
      className={className}
      onClick={handleDelete}
      disabled={isDeleting || !contentKey}
      title={t("delete")}
      aria-label={label || t("delete")}
    >
      <LuTrash2 size={16} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </button>
  );
};

export default TopbarDeleteButton;