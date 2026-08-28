import "./SpaceContentBlock.css";
import React, { memo } from "react";
import {
  LuAudioLines,
  LuFile,
  LuMessageSquare,
  LuFileText,
  LuLayoutGrid,
  LuTrash2,
  LuEye,
  LuExternalLink,
  LuDownload,
  LuCheck,
  LuVideo,
} from "react-icons/lu";
import { SpaceContent, ContentType } from "app/types";
import { useTranslation } from "react-i18next";
import Button from "render/web/ui/Button";
import { getCompactFileMetaLabel } from "app/utils/fileUtils";
import { getSpaceContentTypeLabel } from "create/space/contentLabels";
import { cardViewTransitionStyles } from "app/viewTransitions";
import { isSpaceContentImage } from "./spaceContentMedia";
import { useContentImageSrc } from "./useContentImageSrc";

interface SpaceContentBlockProps {
  item: SpaceContent;
  onPreview: (item: SpaceContent) => void;
  onOpen: (item: SpaceContent) => void;
  onDelete: (item: SpaceContent) => void;
  onDownload?: (item: SpaceContent) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (key: string, e?: React.MouseEvent) => void;
  /** Dialog cards only: file-drop handlers staged for this dialog's composer. */
  fileDropProps?: React.HTMLAttributes<HTMLDivElement>;
  isFileDropTarget?: boolean;
}

const SpaceContentBlockComponent: React.FC<SpaceContentBlockProps> = ({
  item,
  onPreview,
  onOpen,
  onDelete,
  onDownload,
  isSelectionMode,
  isSelected,
  onSelect,
  fileDropProps,
  isFileDropTarget,
}) => {
  const { t } = useTranslation("space");
  const type = item.type?.toLowerCase();
  const key = item.contentKey;
  const isImage = isSpaceContentImage(item);
  const isPage = type === "page" || key.startsWith("page-");
  const isDialog = type === "dialog" || key.startsWith("dialog-");
  const isApp = type === ContentType.APP || type === "app" || key.startsWith("app-");
  const { imageSrc, loadImageFallback } = useContentImageSrc(item);

  const typeClass = isImage
    ? "content-block--image"
    : isDialog
      ? "content-block--dialog"
      : isPage
        ? "content-block--page"
        : isApp
          ? "content-block--app"
        : "content-block--file";
  const showPreviewAction = !isImage && !isApp;
  const showOpenAction = isPage || isApp;
  const showDownloadAction = (type === "file" || isImage) && !!onDownload;
  const showDeleteAction = !isImage;
  const showBottomActions =
    showPreviewAction || showOpenAction || showDownloadAction || showDeleteAction;
  const typeLabel = getSpaceContentTypeLabel(item, t);
  const fileMetaLabel =
    type === "file"
      ? getCompactFileMetaLabel({
          fileName: item.originalName || item.title,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
        })
      : null;

  const getIcon = () => {
    if (isImage) {
      return (
        <div className="content-block__preview">
          {!isSelectionMode && (
            <div className="content-block__image-top-actions">
              <Button
                variant="ghost"
                size="small"
                className="content-block__image-action-btn"
                icon={<LuExternalLink size={14} aria-hidden="true" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(item);
                }}
                title={t("open")}
              />
              <Button
                variant="ghost"
                size="small"
                className="content-block__image-action-btn content-block__image-delete-btn"
                icon={<LuTrash2 size={14} aria-hidden="true" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
                title={t("delete")}
              />
            </div>
          )}
          <img
            src={imageSrc ?? ""}
            alt={item.title}
            className="content-block__img"
            loading="lazy"
            onError={() => {
              void loadImageFallback();
            }}
          />
        </div>
      );
    }

    if (type === "dialog" || key.startsWith("dialog-"))
      return <div className="content-block__icon-wrapper"><LuMessageSquare className="content-block__icon dialog" aria-hidden="true" /></div>;
    if (type === "page" || key.startsWith("page-"))
      return <div className="content-block__icon-wrapper"><LuFileText className="content-block__icon page" aria-hidden="true" /></div>;
    if (isApp)
      return <div className="content-block__icon-wrapper"><LuLayoutGrid className="content-block__icon file" aria-hidden="true" /></div>;
    if (type === "file" && item.fileCategory === "document")
      return <div className="content-block__icon-wrapper"><LuFileText className="content-block__icon file" aria-hidden="true" /></div>;
    if (type === "file" && item.fileCategory === "video")
      return <div className="content-block__icon-wrapper"><LuVideo className="content-block__icon file" aria-hidden="true" /></div>;
    if (type === "file" && item.fileCategory === "audio")
      return <div className="content-block__icon-wrapper"><LuAudioLines className="content-block__icon file" aria-hidden="true" /></div>;

    return <div className="content-block__icon-wrapper"><LuFile className="content-block__icon file" aria-hidden="true" /></div>;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      onSelect?.(item.contentKey, e);
    } else {
      if (isImage) {
        onPreview(item);
        return;
      }
      onOpen(item);
    }
  };

  // Shared with SpaceContentList / AgentBlock / AgentPage via app/viewTransitions.
  // Unique per contentKey avoids cross-card name collisions; selection mode
  // clears names so multi-select does not reserve shared-element slots.
  const cardVt = cardViewTransitionStyles(item.contentKey, {
    enabled: !isSelectionMode,
  });

  return (
    <div
      className={`content-block ${typeClass} ${isSelected ? "selected" : ""} ${isSelectionMode ? "selection-mode" : ""}${isFileDropTarget ? " file-drop-active" : ""}`}
      onClick={handleClick}
      {...fileDropProps}
    >
      <button
        type="button"
        className={`content-block__checkbox ${isSelected ? "is-checked" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(item.contentKey, e);
        }}
        aria-label={isSelected ? "deselect" : "select"}
        aria-pressed={isSelected}
      >
        {isSelected && <LuCheck size={12} aria-hidden="true" />}
      </button>

      <div className="content-block__content">
        <div style={cardVt.icon}>
          {getIcon()}
        </div>

        <div className="content-block__info">
          <h3
            className="content-block__title"
            title={item.title}
            style={cardVt.title}
          >
            {item.title || t("unnamed")}
          </h3>
          <div className="content-block__meta">
            <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
            {fileMetaLabel ? (
              <span className="content-block__file-meta">{fileMetaLabel}</span>
            ) : null}
            <span className="content-block__type-tag">{typeLabel}</span>
          </div>
        </div>
      </div>

      {!isSelectionMode && showBottomActions && (
        <div className="content-block__actions">
          {showPreviewAction && (
            <Button
              variant="ghost"
              size="small"
              className="content-block__action-btn"
              icon={<LuEye size={14} aria-hidden="true" />}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item);
              }}
              title={t("preview")}
            />
          )}
          {showOpenAction && (
            <Button
              variant="ghost"
              size="small"
              className="content-block__action-btn"
              icon={<LuExternalLink size={14} aria-hidden="true" />}
              onClick={(e) => {
                e.stopPropagation();
                onOpen(item);
              }}
              title={t("open")}
            />
          )}
          {showDownloadAction && (
            <Button
              variant="ghost"
              size="small"
              className="content-block__action-btn"
              icon={<LuDownload size={14} aria-hidden="true" />}
              onClick={(e) => {
                e.stopPropagation();
                onDownload(item);
              }}
              title={t("download")}
            />
          )}
          {showDeleteAction && (
            <Button
              variant="ghost"
              size="small"
              className="content-block__action-btn content-block__action-delete"
              icon={<LuTrash2 size={14} aria-hidden="true" />}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              title={t("delete")}
            />
          )}
        </div>
      )}

      
    </div>
  );
};

const SpaceContentBlock = memo(SpaceContentBlockComponent);
SpaceContentBlock.displayName = "SpaceContentBlock";

export default SpaceContentBlock;
