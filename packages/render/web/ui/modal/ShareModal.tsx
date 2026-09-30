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
  itemType?: "dialog" | "page";
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
    (itemType === "dialog"
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
              {t("anyoneWithLinkCanView", "拥有链接的人皆可查看")}
            </span>
            <span className="share-modal__permission-desc">
              {t(
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
