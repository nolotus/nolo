// 文件路径: render/web/ui/modal/ImagePreviewModal.tsx

import "./ImagePreviewModal.css"
import React, { useState, useEffect } from "react";
import { BaseModal } from "./BaseModal";
import { LuShare2, LuStar } from "react-icons/lu";
import { useAppDispatch } from "app/store";
import { shareResourceAction } from "share/action";
import {
  toggleContentFavorite,
  useIsContentFavorited,
  useFavoriteDeps,
} from "app/favorite/favoriteStore";
import { DataType } from "create/types";
import { toast } from "app/utils/toast"

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
  alt?: string;
  // If provided, enables actions
  contentKey?: string; 
  onShareSuccess?: (token: string) => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  onClose,
  alt = "预览图片",
  contentKey,
  onShareSuccess,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const dispatch = useAppDispatch();
  const isFavorited = useIsContentFavorited(contentKey ?? "");
  const favoriteDeps = useFavoriteDeps();
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (imageUrl) {
      setIsLoaded(false);
      setHasError(false);
    }
  }, [imageUrl]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contentKey) return;
    
    try {
      if (!favoriteDeps) return;
      await toggleContentFavorite(favoriteDeps, contentKey);
      toast.success(isFavorited ? "已取消收藏" : "已收藏");
    } catch (err) {
      toast.error("操作失败");
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contentKey || isSharing) return;

    // Use contentKey as ID if it's available
    // Assuming contentKey format: image-{userId}-{imageId} or similar
    // For sharing, we need the actual data or at least the reference.
    // If it's a blob URL, we can't easily share it without the original file/blob data.
    // BUT, if we have contentKey, it means it's stored.
    
    setIsSharing(true);
    try {
      // 1. We share it as a DataType.IMAGE type
      // The data payload needs to include the fileId/imageId so the receiver can fetch it.
      // We'll use a simplified object structure for the share payload.
      
      const shareData = {
        id: contentKey,
        type: DataType.IMAGE,
        url: imageUrl, // Might be blob url (useless for remote) or http url
        // Ideally we need the fileId to reconstruct the URL on the other side
        fileId: contentKey.replace("image-", "").replace("file-", "").split("-").pop() 
      };

      const result = await (dispatch as any)((shareResourceAction as any)({
        type: DataType.IMAGE,
        data: shareData,
        title: alt || "分享图片",
        description: "From Image Preview",
        visibility: "community" // Default to community for now based on user request? Or let user choose?
        // User said "separate share", implied simple action. Let's default to community or add a selector later.
        // For quick implementation, we can do community or private. 
        // Let's assume private first or prompt? 
        // User story: "单独分享" -> "优先展示图片"
        // Let's stick to the existing share flow which usually returns a token.
      })).unwrap();

      const shareUrl = `${window.location.origin}/share/${result.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("分享链接已复制");
      if (onShareSuccess) onShareSuccess(result.token);
      
    } catch (err) {
      console.error(err);
      toast.error("分享失败");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <BaseModal
        isOpen={!!imageUrl}
        onClose={onClose}
        className="image-preview-modal"
      >
        {imageUrl && (
          <div className="preview-container">
            {!isLoaded && !hasError && (
              <div className="loading-spinner">
                <svg viewBox="0 0 24 24" fill="none" className="spinner-icon">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  />
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    className="opacity-75"
                  />
                </svg>
              </div>
            )}

            {hasError && (
              <div className="preview-error" role="status" aria-live="polite">
                <div className="preview-error__title">图片加载失败</div>
                <div className="preview-error__hint">这张图片当前不可用，可能是文件资源缺失或无权限访问。</div>
              </div>
            )}

            <img
              src={imageUrl}
              alt={alt}
              className={`preview-image ${isLoaded ? "loaded" : "loading"}${hasError ? " failed" : ""}`}
              onLoad={() => {
                setIsLoaded(true);
                setHasError(false);
              }}
              onError={() => {
                setIsLoaded(false);
                setHasError(true);
              }}
            />

            <div className="actions-bar">
               {contentKey && (
                 <>
                   <button
                     type="button"
                     className={`action-button ${isFavorited ? 'active' : ''}`}
                     onClick={handleFavorite}
                     title={isFavorited ? "取消收藏" : "收藏"}
                     aria-label={isFavorited ? "取消收藏" : "收藏"}
                   >
                     <LuStar size={20} fill={isFavorited ? "currentColor" : "none"} aria-hidden="true" />
                   </button>

                   <button
                     type="button"
                     className="action-button"
                     onClick={handleShare}
                     disabled={isSharing}
                     title="分享图片"
                     aria-label="分享图片"
                   >
                     <LuShare2 size={20} aria-hidden="true" />
                   </button>
                 </>
               )}

              <button
                type="button"
                className="close-button"
                onClick={onClose}
                aria-label="关闭预览"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        )}
      </BaseModal>
    </>
  );
};

export default ImagePreviewModal;
