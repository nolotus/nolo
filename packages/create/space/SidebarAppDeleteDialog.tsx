import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "app/routing";
import { useAppDispatch } from "app/store";
import { deleteDbKey } from "app/hooks/deleteDbKey";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import { toast } from "app/utils/toast";
import { deriveAppIdFromRouteKey } from "app/utils/appKeys";

export interface SidebarAppDeleteRequest {
  contentKey: string;
  spaceId?: string | null;
  sourceServerOrigin?: string;
}

export const SidebarAppDeleteDialog: React.FC<{
  request: SidebarAppDeleteRequest | null;
  onClose: () => void;
}> = ({ request, onClose }) => {
  const { t } = useTranslation("interface");
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!request) return null;

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await (dispatch as any)(
        deleteDbKey(
          {
            contentKey: request.contentKey,
            preferredServerOrigin: request.sourceServerOrigin,
          },
          request.spaceId,
        ),
      );
      toast.success(t("deleteSuccess", "已删除"));
      onClose();
      const appId = deriveAppIdFromRouteKey(request.contentKey);
      if (
        location.pathname.includes(request.contentKey) ||
        (appId && location.pathname.includes(appId))
      ) {
        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error("Failed to delete app from sidebar:", error);
      toast.error(t("deleteFailed", "删除失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmModal
      isOpen
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      title={t("app_delete", "删除应用")}
      message={t("app_delete_confirm", "确定要删除此应用吗？此操作不可撤销。")}
      confirmText={t("delete", "删除")}
      cancelText={t("cancel", "取消")}
      type="error"
      loading={loading}
    />
  );
};
