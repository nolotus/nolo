import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "app/store";
import { toast } from "app/utils/toast";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import { deleteMessage } from "../messageSlice";

/**
 * Shared delete-with-confirmation affordance for any message row that has a
 * persisted dbKey (standard user/assistant messages, tool messages, …).
 *
 * Collapses the previously duplicated trio (open-confirm handler, confirm
 * handler, close handler) plus the ConfirmModal JSX that was copy-pasted
 * between MessageActions and ToolMessageItem. Callers pick the locale key
 * used for the confirmation body via `confirmMessageKey` so tool-output rows
 * keep "delConfirm" while standard messages use "delConfirmMessage".
 *
 * @param dbKey            the persisted message key; when absent the row is
 *                         not deletable and openConfirm is a guarded no-op.
 * @param confirmMessageKey i18n key for the modal body copy.
 * @param t               optional injected translator (defaults to the
 *                         chat namespace translator captured here).
 * @returns {
 *   openConfirm, confirmDelete, closeConfirm, modal, canDelete
 * }
 */
export function useMessageDelete({
  dbKey,
  confirmMessageKey,
  t: tOverride,
}: {
  dbKey: string | undefined;
  confirmMessageKey: string;
  t?: ReturnType<typeof useTranslation>["t"];
}) {
  const dispatch = useAppDispatch();
  const defaultT = useTranslation("chat").t;
  const t = tOverride ?? defaultT;
  const [showConfirm, setShowConfirm] = useState(false);

  const openConfirm = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation?.();
      if (!dbKey) {
        toast.error(t("deleteFailed", "删除失败"));
        return;
      }
      setShowConfirm(true);
    },
    [dbKey, t],
  );

  const confirmDelete = useCallback(() => {
    if (!dbKey) {
      toast.error(t("deleteFailed", "删除失败"));
      setShowConfirm(false);
      return;
    }
    dispatch(deleteMessage(dbKey));
    toast.success(t("deleteSuccess", "已删除"));
    setShowConfirm(false);
  }, [dbKey, dispatch, t]);

  const closeConfirm = useCallback(() => {
    setShowConfirm(false);
  }, []);

  const modal = (
    <ConfirmModal
      isOpen={showConfirm}
      onClose={closeConfirm}
      onConfirm={confirmDelete}
      title={t("deleteMessageTitle", "删除消息")}
      message={t(confirmMessageKey, "删除此消息？")}
      confirmText={t("confirm", "确认")}
      cancelText={t("cancel", "取消")}
      type="warning"
    />
  );

  return {
    openConfirm,
    confirmDelete,
    closeConfirm,
    modal,
    canDelete: Boolean(dbKey),
  };
}
