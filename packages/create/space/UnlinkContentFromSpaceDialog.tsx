import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import { toast } from "app/utils/toast";
import { unlinkSpaceContent } from "create/space/content/contentThunks";

export interface UnlinkContentRequest {
  contentKey: string;
  title: string;
  spaceId: string;
  spaceName?: string;
}

/**
 * 「从空间移除」确认框：明确显示要移除的内容与目标空间，再执行纯 unlink
 * （不删除内容本体）。权限在执行端（unlinkSpaceContentAction）复核。
 *
 * dispatch 由宿主注入（本组件不直接依赖 app/store 的消费端 API）。
 */
export const UnlinkContentFromSpaceDialog: React.FC<{
  request: UnlinkContentRequest | null;
  onClose: () => void;
  dispatch: (action: any) => any;
}> = ({ request, onClose, dispatch }) => {
  const { t } = useTranslation("space");
  const [loading, setLoading] = useState(false);

  if (!request) return null;

  const spaceLabel = request.spaceName?.trim() || request.spaceId;

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await (dispatch as any)(
        (unlinkSpaceContent as any)({
          spaceId: request.spaceId,
          contentKey: request.contentKey,
        })
      ).unwrap();
      toast.success(t("removeFromSpaceDone", "已从空间移除"));
      onClose();
    } catch (error) {
      const message =
        (error as { message?: string } | undefined)?.message ||
        t("removeFromSpaceFailed", "移除失败，请稍后重试");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmModal
      isOpen
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      title={t("removeFromSpace", "从空间移除")}
      message={t("removeFromSpaceConfirm", {
        title: request.title,
        space: spaceLabel,
        defaultValue: `将从空间「${spaceLabel}」移除「${request.title}」。内容本身不会被删除，其它空间的引用不受影响。`,
      })}
      confirmText={t("removeFromSpace", "从空间移除")}
      cancelText={t("cancel", "取消")}
      type="warning"
      loading={loading}
    />
  );
};

export default UnlinkContentFromSpaceDialog;
