import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import { copyTextToClipboard } from "app/utils/clipboard";
import { toast } from "app/utils/toast";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import {
  currentWindowOrigin,
  runShare,
  type SharePayload,
  type ShareVisibility,
} from "./shareWorkflowCore";

/**
 * 分享流程的唯一实现：建链接 → 填 ShareModal → 复制 → 公开到社区。
 *
 * 之前这套状态机只住在 `render/layout/useTopBarState.tsx`（内容页顶栏 / 溢出菜单），
 * app 详情页要分享时再抄一遍就会变成第三份实现。这里把「造 payload」留给调用方
 * （`buildPayload`），其余（链接生成、web 路径、剪贴板、toast、`nolo:share-created`
 * 事件、loading/错误状态）只有这一处。
 *
 * 「构造载荷 + 调 thunk + 生成链接」这一层在 `shareWorkflowCore.runShare`，
 * 没弹窗的一次性动作（`app/components/AppCard.tsx` 的「发布到社区」）直接复用它，
 * 不另写一份 dispatch。
 *
 * 调用点：
 * - `render/layout/useTopBarState.tsx`（page / dialog / app 内容页顶栏）
 * - `app/pages/AppDetailPage.tsx`（app 详情页页头「分享」）
 */

export type { SharePayload, ShareVisibility } from "./shareWorkflowCore";

export interface ShareWorkflow {
  isShareModalOpen: boolean;
  shareModalLink: string;
  shareModalVisibility: ShareVisibility;
  isShareModalLoading: boolean;
  shareModalCopied: boolean;
  /** 建链失败时的人话提示（给 ShareModal 里的错误行 + 重试） */
  shareError: string | null;
  setIsShareModalOpen: (open: boolean) => void;
  handleShare: (visibility?: ShareVisibility) => Promise<string | null>;
  handleOpenShare: () => Promise<void>;
  handlePublishCommunity: () => Promise<void>;
}

export function useShareWorkflow(
  buildPayload: (visibility: ShareVisibility) => SharePayload | null
): ShareWorkflow {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { currentServer: server } = useAppSelector(selectRuntimeSnapshot);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalLink, setShareModalLink] = useState("");
  const [shareModalVisibility, setShareModalVisibility] =
    useState<ShareVisibility>("private");
  const [isShareModalLoading, setIsShareModalLoading] = useState(false);
  const [shareModalCopied, setShareModalCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const handleShare = useCallback(
    async (visibility: ShareVisibility = "private") => {
      const payload = buildPayload(visibility);
      // 当前上下文没有可分享的对象（例如 app 还没加载出访问地址）：什么都不做。
      if (!payload) return null;

      try {
        // 与 AppCard「发布到社区」同一个分发点（shareWorkflowCore.runShare）：
        // visibility 必须进 thunk —— private = 持有链接可见（分享页按 token 读取）。
        const { webLink } = await runShare({
          dispatch: dispatch as unknown as Parameters<typeof runShare>[0]["dispatch"],
          payload,
          visibility,
          server,
          windowOrigin: currentWindowOrigin(),
        });

        setShareModalLink(webLink);
        setShareModalVisibility(visibility);
        setShareError(null);

        try {
          await copyTextToClipboard(webLink);
          setShareModalCopied(true);
          toast.success(
            visibility === "community"
              ? t("sharePublished", "已分享到社区，链接已复制")
              : t("shareLinkCopied", "分享链接已复制")
          );
        } catch (copyError) {
          setShareModalCopied(false);
          console.warn("Failed to copy share link:", copyError);
          toast.success(
            `${t("shareCopyFailed", "复制链接失败，请手动复制")}: ${webLink}`,
            { duration: 8000 }
          );
        }
        return webLink;
      } catch (e: any) {
        const message = `${t("shareFailed", "分享失败")}${e?.message ? `: ${e.message}` : ""}`;
        toast.error(message);
        setShareError(message);
        throw e;
      }
    },
    [buildPayload, dispatch, server, t]
  );

  const handleOpenShare = useCallback(async () => {
    setIsShareModalOpen(true);
    setIsShareModalLoading(true);
    setShareError(null);
    try {
      await handleShare("private");
    } catch {
      // 错误已由 handleShare 把提示写进 shareError 并 toast
    } finally {
      setIsShareModalLoading(false);
    }
  }, [handleShare]);

  const handlePublishCommunity = useCallback(async () => {
    setIsShareModalLoading(true);
    setShareError(null);
    try {
      await handleShare("community");
    } catch {
      // 同上
    } finally {
      setIsShareModalLoading(false);
    }
  }, [handleShare]);

  return {
    isShareModalOpen,
    shareModalLink,
    shareModalVisibility,
    isShareModalLoading,
    shareModalCopied,
    shareError,
    setIsShareModalOpen,
    handleShare,
    handleOpenShare,
    handlePublishCommunity,
  };
}
