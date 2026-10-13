// AttachmentsPreview.tsx
import React, { useState, useCallback, useMemo, memo, MouseEvent } from "react";
import { MediaJobAttachment } from "./MediaJobAttachment";
import { useTranslation } from "react-i18next";
import { formatFileSize } from "app/utils/fileUtils";
import type { PendingMediaUploadState } from "./useMessageInputFiles";
import { LuX, LuTrash2 } from "react-icons/lu";
import { useAppDispatch } from "app/store";
import ImagePreviewModal from "render/web/ui/modal/ImagePreviewModal";
import { FileItem } from "chat/messages/web/FileItem";
import type { PendingFile } from "../dialog/dialogSlice";
import { removePendingFile } from "../dialog/dialogSlice";
import DocxPreviewDialog from "render/web/ui/modal/DocxPreviewDialog";
import TablePreviewDialog from "render/web/ui/modal/TablePreviewDialog";
import {
  ATTACHMENT_ITEM_KEY_ATTRIBUTE,
  runAttachmentViewTransition,
} from "./attachmentViewTransitions";

export interface PendingImagePreview {
  id: string;
  url: string;
}

interface AttachmentsPreviewProps {
  imagePreviews: PendingImagePreview[];
  pendingFiles: (PendingFile & {
    error?: string;
    mediaUpload?: PendingMediaUploadState;
  })[];
  onRemoveImage: (id: string) => void;
  processingFiles?: Set<string>;
  isMobile?: boolean;
}

interface ImageItemProps {
  image: PendingImagePreview;
  index: number;
  isMobile: boolean;
  onPreview: (url: string) => void;
  onRemove: (id: string) => void;
}

/** 样式常量，便于维护和复用 */
const ATTACHMENTS_PREVIEW_STYLES = `
  .attachments-preview {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    align-items: flex-start;
    width: 100%;
    box-sizing: border-box;
  }

  .attachment-item {
    position: relative;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    flex-shrink: 0;
    max-width: 120px;
  }

  .attachment-item:hover:not(.processing):not(.error) {
    transform: translateY(-1px);
  }

  .attachment-item.mobile {
    max-width: 110px;
  }

  .image-content {
    width: 44px;
    height: var(--control-lg);
    object-fit: cover;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: block;
  }

  .image-content:hover {
    border-color: var(--primary);
    transform: scale(1.05);
    box-shadow: 0 4px 12px var(--shadowMedium);
  }

  .image-content:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-color: var(--primary);
  }

  .remove-button {
    position: absolute;
    border-radius: 50%;
    background: var(--error);
    color: white;
    border: 1px solid var(--background);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 2;
    box-shadow: 0 2px 4px var(--shadowMedium);
  }

  .remove-button:not(.mobile) {
    top: -6px;
    right: -6px;
    width: 22px;
    height: 22px;
    opacity: 0.85;
  }

  .remove-button.mobile {
    top: -8px;
    right: -8px;
    width: 30px;
    height: 30px;
    opacity: 1;
    box-shadow: 0 2px 8px var(--shadowHeavy);
    border-width: 1.5px;
  }

  .attachment-item:hover .remove-button:not(.mobile):not(:disabled) {
    opacity: 1;
  }

  .remove-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }

  .remove-button:hover:not(:disabled) {
    transform: scale(1.1);
    background: #dc2626;
    box-shadow: 0 4px 12px var(--shadowHeavy);
  }

  .remove-button:focus-visible {
    opacity: 1;
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .remove-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    .attachments-preview {
      gap: var(--space-1);
      justify-content: flex-start;
      align-items: flex-start;
      overflow-x: visible;
    }

    .attachment-item {
      min-width: 44px;
    }

    .attachment-item.mobile {
      max-width: 100px;
    }

    .remove-button.mobile {
      width: 28px;
      height: var(--control-sm);
    }
  }

  @media (hover: none) and (pointer: coarse) {
    .remove-button:not(.mobile) {
      opacity: 1;
      top: -8px;
      right: -8px;
      width: 26px;
      height: 26px;
    }

    .attachment-item:hover,
    .image-content:hover {
      transform: none;
    }
  }

  @media (prefers-contrast: high) {
    .image-content {
      border-width: 2px;
    }

    .remove-button {
      border-width: 2px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .attachment-item,
    .image-content,
    .remove-button {
      transition: none;
    }

    .attachment-item:hover,
    .image-content:hover,
    .remove-button:hover {
      transform: none;
    }
  }

  .attachment-item.error {
    opacity: 0.7;
  }

  .attachment-item.error .image-content {
    border-color: var(--error);
  }

  .attachment-item.processing {
    opacity: 0.6;
    pointer-events: none;
  }

  :root[data-nolo-attachment-transition="1"]::view-transition-group(*) {
    animation-duration: 280ms;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }

  :root[data-nolo-attachment-transition="1"]::view-transition-old(*) {
    animation: attachment-thumb-shrink-away 200ms cubic-bezier(0.4, 0, 1, 1) both;
  }

  :root[data-nolo-attachment-transition="1"]::view-transition-new(*) {
    animation: attachment-thumb-pop-in 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .media-upload-card {
    position: relative;
    flex: 1 1 240px;
    max-width: 360px;
    min-width: 200px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--backgroundSecondary, var(--background));
    box-sizing: border-box;
  }

  .media-upload-card.error {
    border-color: var(--error);
  }

  .media-upload-card__name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    padding-right: var(--space-4);
  }

  .media-upload-card__meta {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-1);
    color: var(--textSecondary);
    font-size: var(--fontSize-sm, 13px);
  }

  .media-upload-card__bar {
    height: 4px;
    margin-top: var(--space-1);
    border-radius: 999px;
    background: var(--border);
    overflow: hidden;
  }

  .media-upload-card__bar-fill {
    height: 100%;
    background: var(--primary);
    transition: width 0.2s linear;
  }

  .media-upload-card__error {
    margin-top: var(--space-1);
    color: var(--error);
    font-size: var(--fontSize-sm, 13px);
    word-break: break-word;
  }

  @keyframes attachment-thumb-pop-in {
    0% {
      opacity: 0;
      transform: scale(0.65);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes attachment-thumb-shrink-away {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.6);
    }
  }
`;

/**
 * 单个图片附件项
 */
const ImageItem: React.FC<ImageItemProps> = memo(
  ({ image, index, isMobile, onPreview, onRemove }) => {
    const handlePreview = useCallback(() => {
      onPreview(image.url);
    }, [image.url, onPreview]);

    const handleRemove: React.MouseEventHandler<HTMLButtonElement> =
      useCallback(
        (event) => {
          event.stopPropagation();
          onRemove(image.id);
        },
        [image.id, onRemove],
      );

    return (
      <div
        className={`attachment-item image-item ${isMobile ? "mobile" : ""}`}
        {...{ [ATTACHMENT_ITEM_KEY_ATTRIBUTE]: `img-${image.id}` }}
        role="group"
        aria-label={`图片附件 ${index + 1}`}
      >
        <img
          src={image.url}
          alt={`预览图片 ${index + 1}`}
          className="image-content"
          onClick={handlePreview}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handlePreview();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`点击查看大图 ${index + 1}`}
        />
        <button
          type="button"
          onClick={handleRemove}
          className={`remove-button ${isMobile ? "mobile" : ""}`}
          aria-label={`删除图片 ${index + 1}`}
          title={`删除图片 ${index + 1}`}
        >
          {isMobile ? (
            <LuTrash2 size={16} aria-hidden="true" />
          ) : (
            <LuX size={14} aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);

ImageItem.displayName = "ImageItem";

/**
 * 媒体文件上传卡：拖入即出现，显示上传进度 → 创建任务中 → 失败可读错误。
 * 拿到 job 后由 MediaJobAttachment 报价卡原位接替。
 */
const MediaUploadCard: React.FC<{
  id: string;
  name: string;
  upload: PendingMediaUploadState;
  error?: string;
  isMobile: boolean;
}> = ({ id, name, upload, error, isMobile }) => {
  const { t } = useTranslation("chat");
  const percent =
    upload.total > 0
      ? Math.min(100, Math.round((upload.loaded / upload.total) * 100))
      : 0;
  const isError = upload.phase === "error";
  const statusText = isError
    ? t("mediaUploadFailedShort", { defaultValue: "失败" })
    : upload.phase === "creating"
      ? t("mediaJobCreating", { defaultValue: "创建任务中…" })
      : t("mediaUploadingPercent", {
          defaultValue: "上传中 {{percent}}%",
          percent,
        });
  const removeLabel = t("mediaUploadRemove", {
    defaultValue: "移除 {{name}}",
    name,
  });
  // 进度条自身无内容，可访问名需显式指向同卡的文件名元素。
  const nameElementId = `media-upload-name-${id}`;

  return (
    <div
      className={`attachment-item media-upload-card ${isError ? "error" : ""}`}
      {...{ [ATTACHMENT_ITEM_KEY_ATTRIBUTE]: `file-${id}` }}
      role="group"
      aria-label={name}
      aria-busy={!isError || undefined}
      data-media-upload-phase={upload.phase}
    >
      <span id={nameElementId} className="media-upload-card__name" title={name}>
        {name}
      </span>
      <div className="media-upload-card__meta">
        <span>{formatFileSize(upload.size)}</span>
        <span data-testid="media-upload-status">{statusText}</span>
      </div>
      {!isError && (
        <div
          className="media-upload-card__bar"
          role="progressbar"
          aria-labelledby={nameElementId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={upload.phase === "creating" ? 100 : percent}
        >
          <div
            className="media-upload-card__bar-fill"
            style={{ width: `${upload.phase === "creating" ? 100 : percent}%` }}
          />
        </div>
      )}
      {isError && error && (
        <div className="media-upload-card__error" role="alert">
          {error}
        </div>
      )}
      {/* 「创建任务中」不可移除：上传已完成、服务端正在建任务，
          此时移除只会让服务端留下孤儿任务（hook 侧同样有守卫）。 */}
      {upload.phase !== "creating" && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            upload.remove();
          }}
          className={`remove-button ${isMobile ? "mobile" : ""}`}
          aria-label={removeLabel}
          title={removeLabel}
        >
          {isMobile ? (
            <LuTrash2 size={16} aria-hidden="true" />
          ) : (
            <LuX size={14} aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
};

const AttachmentsPreview: React.FC<AttachmentsPreviewProps> = ({
  imagePreviews,
  pendingFiles,
  onRemoveImage,
  processingFiles = new Set(),
  isMobile = false,
}) => {
  const dispatch = useAppDispatch();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PendingFile | null>(null);

  const hasAttachments = useMemo(
    () => imagePreviews.length > 0 || pendingFiles.length > 0,
    [imagePreviews.length, pendingFiles.length],
  );

  const handleRemoveFile = useCallback(
    (id: string) => {
      runAttachmentViewTransition(() => {
        dispatch(removePendingFile(id));
      });
    },
    [dispatch],
  );

  const handlePreviewImage = useCallback((url: string) => {
    setSelectedImage(url);
  }, []);

  const handleCloseImagePreview = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handlePreviewFile = useCallback((file: PendingFile) => {
    setPreviewFile(file);
  }, []);

  const handleCloseFilePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  if (!hasAttachments) return null;

  return (
    <>
      <style data-name="attachments-preview-fixed" precedence="high">
        {ATTACHMENTS_PREVIEW_STYLES}
      </style>

      <div
        className="attachments-preview"
        role="group"
        aria-label="附件预览"
        aria-live="polite"
      >
        {imagePreviews.map((image, index) => (
          <ImageItem
            key={image.id}
            image={image}
            index={index}
            isMobile={isMobile}
            onPreview={handlePreviewImage}
            onRemove={onRemoveImage}
          />
        ))}

        {pendingFiles.map((file) => {
          const isProcessing = processingFiles.has(file.trackingId ?? file.id);

          const handleRemoveClick = (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            handleRemoveFile(file.id);
          };

          const itemClassName = [
            "attachment-item",
            "file-item",
            isMobile ? "mobile" : "",
            isProcessing ? "processing" : "",
            file.error ? "error" : "",
          ]
            .filter(Boolean)
            .join(" ");

          if (file.mediaUpload) {
            return (
              <MediaUploadCard
                key={file.id}
                id={file.id}
                name={file.name}
                upload={file.mediaUpload}
                error={file.error}
                isMobile={isMobile}
              />
            );
          }

          if (file.type === "media_job") {
            const dropCard = () => {
              // 与点删除按钮同一条路径：store + localStorage 引用一起清掉。
              dispatch(removePendingFile(file.id));
            };
            return (
              <MediaJobAttachment
                key={file.id}
                jobId={file.id}
                fileName={file.name}
                onJobMissing={dropCard}
                onJobDiscard={dropCard}
                onRemove={dropCard}
              />
            );
          }

          return (
            <div
              key={file.id}
              className={itemClassName}
              {...{ [ATTACHMENT_ITEM_KEY_ATTRIBUTE]: `file-${file.id}` }}
              role="group"
              aria-label={`文件附件 ${file.name}`}
            >
              <FileItem
                file={file}
                variant="attachment"
                isMobile={isMobile}
                isProcessing={isProcessing}
                error={file.error}
                onPreview={
                  file.type === "dialog"
                    ? undefined
                    : () =>
                        !isProcessing && !file.error && handlePreviewFile(file)
                }
              />

              <button
                type="button"
                onClick={handleRemoveClick}
                className={`remove-button ${isMobile ? "mobile" : ""}`}
                disabled={isProcessing}
                aria-label={`删除文件 ${file.name}`}
                title={`删除文件 ${file.name}`}
              >
                {isMobile ? (
                  <LuTrash2 size={16} aria-hidden="true" />
                ) : (
                  <LuX size={14} aria-hidden="true" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <ImagePreviewModal
        imageUrl={selectedImage}
        onClose={handleCloseImagePreview}
        alt="放大预览图片"
      />

      {previewFile && previewFile.type === "table" ? (
        <TablePreviewDialog
          isOpen={!!previewFile}
          onClose={handleCloseFilePreview}
          tableKey={previewFile.pageKey || ""}
          tableName={previewFile.name || ""}
        />
      ) : (
        previewFile && (
          <DocxPreviewDialog
            isOpen={!!previewFile}
            onClose={handleCloseFilePreview}
            pageKey={previewFile.pageKey || ""}
            fileName={previewFile.name || ""}
          />
        )
      )}
    </>
  );
};

export default memo(AttachmentsPreview);
