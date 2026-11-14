import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "app/routing";
import { normalizeSpaceId } from "create/space/spaceKeys";
import { useAppDispatch } from "app/store";
import { toast } from "app/utils/toast";
import { deleteDbKey, getDeleteErrorMessage } from "app/hooks/deleteDbKey";
import {
  isViewingDeletedContent,
  resolveDeleteSuccessPath,
} from "render/layout/deleteBehavior";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

export interface DeleteContentEntryTarget {
  contentKey: string;
  title?: string;
  spaceIdOverride?: string | null;
  sourceServerOrigin?: string;
}

export function useDeleteContentEntry() {
  const { t } = useTranslation(["chat", "common"]);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currentSpaceId = useCurrentSpaceId();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteContent = useCallback(
    async (target: DeleteContentEntryTarget): Promise<boolean> => {
      if (isDeleting) return false;
      const { contentKey, title, spaceIdOverride, sourceServerOrigin } = target;
      const effectiveSpaceId =
        spaceIdOverride === undefined ? currentSpaceId : spaceIdOverride;
      const safeTitle =
        typeof title === "string" && title.trim().length > 0 ? title : contentKey;

      setIsDeleting(true);
      try {
        await dispatch(
          deleteDbKey(
            {
              contentKey,
              serverOrigin: sourceServerOrigin,
            },
            effectiveSpaceId,
            // 侧栏行删除路径：执行端按实体 owner 复核一次，不只依赖 UI 门控。
            { requireOwnership: true }
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
              ? `/space/${normalizeSpaceId(effectiveSpaceId)}/contents`
              : undefined);
          if (redirect) {
            navigate(redirect, { replace: true });
          } else {
            navigate(-1);
          }
        }
        return true;
      } catch (error) {
        const message = getDeleteErrorMessage(error, t("deleteFailed"));
        console.error("Failed to delete content:", message, error);
        toast.error(message === t("deleteFailed") ? message : `${t("deleteFailed")}: ${message}`);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [dispatch, navigate, location.pathname, currentSpaceId, isDeleting, t]
  );

  return { deleteContent, isDeleting };
}
