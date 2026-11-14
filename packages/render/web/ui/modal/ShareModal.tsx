// 文件路径: packages/render/web/ui/modal/ShareModal.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  LuGlobe,
  LuCopy,
  LuCheck,
  LuUsers,
  LuExternalLink,
  LuShare2,
} from "react-icons/lu";
import { Link } from "app/routing";
import { Dialog } from "./Dialog";
import Button from "../Button";
import { copyTextToClipboard } from "app/utils/clipboard";
import { toast } from "app/utils/toast";
import "./ShareModal.css";

/**
 * app 分享链接实际能到达谁（review H1 / HIGH-3）。由服务端下发的 `reachability` 决定：
 * - `public`：谁都能打开；
 * - `link`：持有链接的人能打开（不列出）；
 * - `space`：属于空间，只有该空间的成员能打开；
 * - `owner`：只有作者本人能打开。
 */
export type AppShareScope = "owner" | "space" | "link" | "public";

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  webLink?: string;
  isLoading?: boolean;
  isCommunity?: boolean;
  initialCopied?: boolean;
  onPublishCommunity?: () => Promise<void> | void;
  messageCount?: number;
  itemType?: "dialog" | "page" | "app";
  /** app 分享的可见范围（只有 itemType==="app" 时有意义） */
  appScope?: AppShareScope;
  /** 建链失败时的人话提示（显示在链接行下方，可重试） */
  errorMessage?: string | null;
  onRetry?: () => void | Promise<void>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  webLink = "",
  isLoading = false,
  isCommunity = false,
  initialCopied = false,
  onPublishCommunity,
  itemType = "dialog",
  appScope = "owner",
  errorMessage = null,
  onRetry,
}) => {
  const { t } = useTranslation(["common", "chat"]);
  const [copied, setCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPublishError(null);
      if (initialCopied) {
        setCopied(true);
        const timer = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(timer);
      } else {
        setCopied(false);
      }
    }
  }, [isOpen, initialCopied]);

  useEffect(() => {
    if (isOpen) {
      // 打开时自动聚焦并选中 input
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.select();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, webLink]);

  const handleCopy = useCallback(async () => {
    if (!webLink) return;
    try {
      await copyTextToClipboard(webLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      // 降级：全选 input 让用户自己按快捷键复制
      if (inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [webLink]);

  const handlePublish = async () => {
    if (!onPublishCommunity || isPublishing) return;
    setPublishError(null);
    try {
      setIsPublishing(true);
      await onPublishCommunity();
    } catch (err: any) {
      console.error("Publish to community failed:", err);
      const message =
        err?.message ||
        t("publishCommunityFailed", "发布到社区失败，请重试");
      setPublishError(message);
      toast.error(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const modalTitle =
    title ||
    (itemType === "app"
      ? t("shareAppTitle", "分享应用")
      : itemType === "dialog"
        ? t("shareDialogTitle", "分享对话")
        : t("sharePageTitle", "分享页面"));

  const actions = (
    <div className="share-modal__footer">
      <Link
        to="/share/community"
        className="share-modal__manage-link"
        onClick={onClose}
      >
        <span>{t("viewCommunityShares", "浏览社区分享广场")}</span>
        <LuExternalLink size={12} aria-hidden="true" />
      </Link>
      <Button variant="secondary" size="small" onClick={onClose}>
        {t("close", "完成")}
      </Button>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      icon={<LuShare2 size={18} aria-hidden="true" />}
      width={460}
      actions={actions}
      className="share-modal"
    >
      <div className="share-modal__content">
        {/* 权限说明横幅 */}
        <div className="share-modal__permission-banner">
          <LuGlobe size={18} className="share-modal__permission-icon" aria-hidden="true" />
          <div className="share-modal__permission-text">
            <span className="share-modal__permission-title">
              {itemType === "app"
                ? appScope === "public"
                  ? t("sharePermissionTitlePublic", "所有人都能打开")
                  : appScope === "link"
                    ? t("sharePermissionTitleLink", "拿到链接的人能打开")
                    : appScope === "space"
                      ? t("sharePermissionTitleSpace", "空间成员能打开")
                      : t("sharePermissionTitleOwner", "只有你能打开")
                : t("anyoneWithLinkCanView", "拥有链接的人皆可查看")}
            </span>
            <span className="share-modal__permission-desc">
              {itemType === "app"
                ? appScope === "public"
                  ? t(
                      "shareAppNoticePublic",
                      "这个应用已经公开：拿到链接的任何人都能打开，无需登录；内容以当前部署版本为准。",
                    )
                  : appScope === "link"
                    ? t(
                        "shareAppNoticeLink",
                        "持有链接的人可以打开这个应用（无需登录），但它不会出现在列表或搜索里。",
                      )
                    : appScope === "space"
                      ? t(
                          "shareAppNoticeSpace",
                          "这个应用属于某个空间：只有该空间的成员能打开链接，其他人会看到无权访问的提示。",
                        )
                      : t(
                          "shareAppNoticeOwner",
                          "这个应用目前只有你能打开：链接给别人也打不开，要给别人看请先把应用设为公开或放进空间。",
                        )
                : t(
                    "snapshotNotice",
                    "生成内容为当前时刻的只读快照，后续新对话或修改不会出现在此链接中。",
                  )}
            </span>
          </div>
        </div>

        {/* 链接输入框与复制按钮 */}
        <div className="share-modal__link-section">
          <div className="share-modal__link-row">
            <input
              ref={inputRef}
              type="text"
              readOnly
              value={isLoading ? t("generatingLink", "正在生成链接...") : webLink}
              className="share-modal__input"
              onClick={() => inputRef.current?.select()}
              aria-label={t("shareLink", "分享链接")}
            />
            <Button
              variant={copied ? "secondary" : "primary"}
              size="medium"
              onClick={handleCopy}
              disabled={isLoading || !webLink}
              className={`share-modal__copy-btn ${
                copied ? "share-modal__copy-btn--copied" : ""
              }`}
            >
              {copied ? (
                <>
                  <LuCheck size={16} aria-hidden="true" />
                  <span>{t("copied", "已复制")}</span>
                </>
              ) : (
                <>
                  <LuCopy size={16} aria-hidden="true" />
                  <span>{t("copyLink", "复制链接")}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 建链失败：一句人话 + 重试（状态诚实，不把空链接当成功） */}
        {errorMessage && (
          <div className="share-modal__link-error">
            <span>{errorMessage}</span>
            {onRetry && (
              <button
                type="button"
                className="share-modal__retry"
                onClick={() => void onRetry()}
                disabled={isLoading}
              >
                {t("retry", "重试")}
              </button>
            )}
          </div>
        )}

        {/* 社区广场卡片 */}
        {onPublishCommunity && (
          <div
            className={`share-modal__community-card ${
              isCommunity ? "share-modal__community-card--published" : ""
            }`}
          >
            <div className="share-modal__community-info">
              {isCommunity ? (
                <LuCheck size={18} className="share-modal__community-icon share-modal__community-icon--success" aria-hidden="true" />
              ) : (
                <LuUsers size={18} className="share-modal__community-icon" aria-hidden="true" />
              )}
              <div className="share-modal__community-text">
                <span className="share-modal__community-title">
                  {isCommunity
                    ? t("publishedToCommunity", "已发布到社区广场")
                    : t("publishToCommunity", "发布到社区广场")}
                </span>
                <span className="share-modal__community-desc">
                  {isCommunity
                    ? t(
                        "publishedToCommunityDesc",
                        "所有人可在社区广场浏览此快照。如需下架请在管理分享中删除。",
                      )
                    : t(
                        "publishToCommunityDesc",
                        "公开展示在社区分享流中，供其他用户发现与借鉴",
                      )}
                </span>
                {publishError && (
                  <span className="share-modal__community-error">
                    {publishError}
                  </span>
                )}
              </div>
            </div>
            {!isCommunity && (
              <div className="share-modal__community-action">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handlePublish}
                  disabled={isPublishing || isLoading || !webLink}
                  loading={isPublishing}
                >
                  {t("publish", "发布")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default ShareModal;
