// packages/create/space/components/useDeleteContentEntry.ts
//
// 「删除内容条目」的 UI 编排（loading / toast / 跳转）。
//
// **不依赖 Redux**：本文件不 import `app/store` / `react-redux` / RTK，也不自己
// dispatch。真正的删除动作由调用方以 `runDelete` 命令传入（`DeleteContentCommand`）：
// 调用点都是既有的 Redux 消费端（顶栏/侧栏遗留适配层），由它们把 `deleteDbKey`
// thunk 与自己的 dispatch 绑成命令；本 hook 只负责状态与用户反馈。

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "app/routing";
import { normalizeSpaceId } from "create/space/spaceKeys";
import { toast } from "app/utils/toast";
import {
  getDeleteErrorMessage,
  type DeleteDbKeyInput,
} from "app/hooks/deleteDbKey";
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

/**
 * 删除命令（由调用方实现）：执行一次权威删除，失败时抛出——错误文案由本 hook
 * 统一翻译/toast，调用方不要自己吞异常。
 */
export interface DeleteContentCommand {
  (
    input: DeleteDbKeyInput,
    spaceId?: string | null,
    options?: { requireOwnership?: boolean }
  ): Promise<unknown>;
}

export function useDeleteContentEntry(runDelete: DeleteContentCommand) {
  const { t } = useTranslation(["chat", "common"]);
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
        await runDelete(
          {
            contentKey,
            serverOrigin: sourceServerOrigin,
          },
          effectiveSpaceId,
          // 侧栏行删除路径：执行端按实体 owner 复核一次，不只依赖 UI 门控。
          { requireOwnership: true }
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
    [runDelete, navigate, location.pathname, currentSpaceId, isDeleting, t]
  );

  return { deleteContent, isDeleting };
}
