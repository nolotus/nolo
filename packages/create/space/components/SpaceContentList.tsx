import "./SpaceContentList.css";
import React, { memo, useCallback, useState } from "react";
import { SpaceContent, Agent } from "app/types";
import SpaceContentBlock from "./SpaceContentBlock";
import AgentCard from "ai/agent/web/AgentCard";
import EmptyState from "./EmptyState";
import {
  LuAudioLines,
  LuFile,
  LuCheck,
  LuEye,
  LuTrash2,
  LuMessageSquare,
  LuFileText,
  LuExternalLink,
  LuLayoutGrid,
  LuVideo,
  LuCalendarClock,
  LuImage,
  LuGrid2X2,
} from "react-icons/lu";
import Button from "render/web/ui/Button";
import { useTranslation } from "react-i18next";
import type { SidebarVisibleType } from "create/space/sidebarVisibleTypes";
import { useAppSelector } from "app/store";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import { cardViewTransitionStyles } from "app/viewTransitions";
import { stageFilesForDialog } from "chat/web/stagedDialogFiles";
import {
  buildSpaceContentImageUrl,
  isSpaceContentImage,
} from "./spaceContentMedia";

interface SpaceContentListProps {
  items: SpaceContent[];
  viewMode: "grid" | "list";
  isSelectionMode: boolean;
  selectedKeys: Set<string>;
  onSelectItem: (key: string, e?: React.MouseEvent) => void;
  onPreview: (item: SpaceContent) => void;
  onOpen: (item: SpaceContent) => void;
  onDelete: (item: SpaceContent) => void;
  onDownload?: (item: SpaceContent) => void;
  agentsMap: Map<string, Agent>;
  loading?: boolean;
  activeTab: string;
  onUploadClick?: () => void;
  searchQuery?: string;
  selectedTypes?: readonly SidebarVisibleType[];
}

const SpaceContentListComponent: React.FC<SpaceContentListProps> = ({
  items,
  viewMode,
  isSelectionMode,
  selectedKeys,
  onSelectItem,
  onPreview,
  onOpen,
  onDelete,
  onDownload,
  agentsMap,
  loading,
  activeTab,
  onUploadClick,
  searchQuery,
  selectedTypes,
}) => {
  const { t } = useTranslation("space");
  const currentServer = useAppSelector(selectRuntimeCurrentServer);
  // Dialog key whose row/card is the current file-drop hover target.
  const [fileDropDialogKey, setFileDropDialogKey] = useState<string | null>(
    null
  );

  // Dialog entries accept file drops: files are staged for that dialog's
  // composer and the dialog opens. stopPropagation keeps the space-level
  // FileDropZone (which uploads to the space) out of this gesture.
  const dialogFileDropProps = useCallback(
    (item: SpaceContent): React.HTMLAttributes<HTMLDivElement> & { "data-file-drop-target"?: string } => {
      const type = item.type?.toLowerCase();
      const isDialog =
        type === "dialog" || item.contentKey.startsWith("dialog-");
      if (!isDialog || isSelectionMode) return {};
      return {
        "data-file-drop-target": "dialog",
        onDragOver: (event) => {
          if (!Array.from(event.dataTransfer.types).includes("Files")) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "copy";
          setFileDropDialogKey(item.contentKey);
        },
        onDragLeave: (event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) {
            return;
          }
          setFileDropDialogKey((current) =>
            current === item.contentKey ? null : current
          );
        },
        onDrop: (event) => {
          event.preventDefault();
          event.stopPropagation();
          setFileDropDialogKey(null);
          const files = Array.from(event.dataTransfer.files ?? []);
          if (!files.length) return;
          stageFilesForDialog(item.contentKey, files);
          onOpen(item);
        },
      };
    },
    [isSelectionMode, onOpen]
  );

  if (items.length === 0) {
    if (loading) return null;
    const isSearchEmpty = !!searchQuery?.trim();
    // Single-type empty copy for any tab (home primary or attachment sub-chip)
    const singleType =
      !isSearchEmpty && selectedTypes && selectedTypes.length === 1
        ? selectedTypes[0]
        : null;

    const emptyTitle = isSearchEmpty
      ? t("search_no_results")
      : singleType === "image"
        ? t("no_images_in_space", "该空间下暂无图片")
        : singleType === "document"
          ? t("no_documents_in_space", "该空间下暂无文档附件")
          : singleType === "video"
            ? t("no_videos_in_space", "该空间下暂无视频")
            : singleType === "audio"
              ? t("no_audios_in_space", "该空间下暂无音频")
              : singleType === "table"
                ? t("no_tables_in_space", "该空间下暂无表格")
                : singleType === "file"
                  ? t("no_files_in_space", "该空间下暂无其他附件")
                  : activeTab === "files"
                    ? t("no_attachments_in_space", "该空间下还没有任何附件或媒体文件")
                    : activeTab === "scheduled"
                      ? t("no_scheduled_in_space", "该空间下暂无定时任务")
                      : t("emptyTitle");

    const emptyDescription = isSearchEmpty
      ? t("no_category_content")
      : singleType === "image"
        ? t("no_images_desc", "你可以上传图片，或者在 AI 对话中生成图片并保存到这里。")
        : singleType === "document"
          ? t("no_documents_desc", "你可以上传 PDF、Markdown、Word 等文件附件，方便在对话中引用和分析。")
          : singleType === "video"
            ? t("no_videos_desc", "你可以上传各类视频文件，方便在对话中作为上下文引用。")
            : singleType === "audio"
              ? t("no_audios_desc", "你可以上传录音或音轨，方便 AI 提取文字或进行音频处理。")
              : singleType === "table"
                ? t("no_tables_desc", "用结构化视图整理和分析你的数据，支持直接在表格内进行 AI 处理。")
                : singleType === "file"
                  ? t("no_files_desc", "这里展示未归类到图片、文档、音视频中的其他格式文件。")
                  : activeTab === "files"
                    ? t("no_attachments_desc", "你可以上传图片、文档、视频或音频等各类文件，方便在对话中引用。")
                    : activeTab === "scheduled"
                      ? t("no_scheduled_desc", "这里展示空间内的定时自动化任务与定时运行状态。你可以通过下发指令或配置工作流，让 AI 按设定时间自动运行并在此处交付成果。")
                      : activeTab === "all"
                        ? t("no_content_desc")
                        : t("no_category_content");

    const showUploadCta =
      !isSearchEmpty && (activeTab === "all" || activeTab === "files");
    const emptyIcon =
      activeTab === "scheduled"
        ? <LuCalendarClock size={48} aria-hidden="true" />
        : singleType === "image"
          ? <LuImage size={48} aria-hidden="true" />
          : singleType === "document"
            ? <LuFileText size={48} aria-hidden="true" />
            : singleType === "video"
              ? <LuVideo size={48} aria-hidden="true" />
              : singleType === "audio"
                ? <LuAudioLines size={48} aria-hidden="true" />
                : singleType === "table"
                  ? <LuGrid2X2 size={48} aria-hidden="true" />
                  : <LuFile size={48} aria-hidden="true" />;

    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionText={showUploadCta ? t("uploadFile") : undefined}
        onAction={showUploadCta ? onUploadClick : undefined}
      />
    );
  }

  return (
    <div className={`content-display ${viewMode}`}>
      {items.map((item) => {
        if (!item) return null;
        const isSelected = selectedKeys.has(item.contentKey);
        const type = item.type?.toLowerCase();
        const key = item.contentKey;
        const isAgent =
          type === "agent" || key.startsWith("agent-");
        const isPage = type === "page" || key.startsWith("page-");
        const isApp = type === "app" || key.startsWith("app-");
        const showPreviewButton = !isApp;
        const showOpenButton = isPage || isApp;
        const showDeleteButton = true;

        if (viewMode === "grid") {
          if (isAgent) {
            const agentData = agentsMap.get(item.contentKey);
            if (agentData) {
              return (
                <div
                  key={item.contentKey}
                  className={`agent-block-wrapper ${isSelected ? "selected" : ""}`}
                  onClickCapture={(e) => {
                    if (isSelectionMode) {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectItem(item.contentKey);
                    }
                  }}
                >
                  <div className="agent-block-inner">
                    <AgentCard item={agentData} />
                  </div>
                  <button
                    type="button"
                    className="selection-overlay"
                    onClick={(e) => { e.stopPropagation(); onSelectItem(item.contentKey); }}
                    aria-label={isSelected ? "deselect" : "select"}
                    aria-pressed={isSelected}
                    style={{
                      margin: 0,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <div className={`selection-checkbox ${isSelected ? "is-checked" : ""}`}>
                      {isSelected && <LuCheck size={12} aria-hidden="true" />}
                    </div>
                  </button>
                </div>
              );
            }
          }

          return (
            <SpaceContentBlock
              key={item.contentKey}
              item={item}
              onPreview={onPreview}
              onOpen={onOpen}
              onDelete={onDelete}
              onDownload={onDownload}
              isSelectionMode={isSelectionMode}
              isSelected={isSelected}
              onSelect={onSelectItem}
              fileDropProps={dialogFileDropProps(item)}
              isFileDropTarget={fileDropDialogKey === item.contentKey}
            />
          );
        }

        // List View
        const isImage = isSpaceContentImage(item);
        const imageUrl = buildSpaceContentImageUrl(currentServer, item);
        // Same name rule as SpaceContentBlock / AgentBlock / AgentPage:
        // card-icon|title-${contentKey}. Skip in selection mode so bulk
        // select does not reserve shared-element names.
        const listVt = cardViewTransitionStyles(item.contentKey, {
          enabled: !isSelectionMode,
        });

        return (
          <div
            key={item.contentKey}
            className={`content-list-item ${isSelected ? "selected" : ""} ${isSelectionMode ? "selection-mode" : ""}${fileDropDialogKey === item.contentKey ? " file-drop-active" : ""}`}
            onClick={() =>
              isSelectionMode ? onSelectItem(item.contentKey) : onOpen(item)
            }
            {...dialogFileDropProps(item)}
          >
            <div className="item-left">
              <button
                type="button"
                className="item-icon-zone"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem(item.contentKey);
                }}
                style={{
                  ...listVt.icon,
                  margin: 0,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  appearance: "none",
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
                }}
                aria-label={isSelected ? "deselect" : "select"}
                aria-pressed={isSelected}
              >
                <div className="item-icon">
                  {isImage ? (
                    <img
                      src={imageUrl || ""}
                      alt={item.title}
                      className="item-icon__img"
                      loading="lazy"
                    />
                  ) : (() => {
                    const t = item.type?.toLowerCase();
                    const k = item.contentKey;
                    if (t === "task" || k.startsWith("task-")) return <LuCalendarClock style={{ color: "#7c3aed" }} aria-hidden="true" />;
                    if (t === "dialog" || k.startsWith("dialog-")) return <LuMessageSquare style={{ color: "#8b5cf6" }} aria-hidden="true" />;
                    if (t === "page" || k.startsWith("page-")) return <LuFileText style={{ color: "#3b82f6" }} aria-hidden="true" />;
                    if (t === "app" || k.startsWith("app-")) return <LuLayoutGrid style={{ color: "#0f766e" }} aria-hidden="true" />;
                    if (t === "file" && item.fileCategory === "document") return <LuFileText style={{ color: "#2563eb" }} aria-hidden="true" />;
                    if (t === "file" && item.fileCategory === "video") return <LuVideo style={{ color: "#dc2626" }} aria-hidden="true" />;
                    if (t === "file" && item.fileCategory === "audio") return <LuAudioLines style={{ color: "#0f766e" }} aria-hidden="true" />;
                    return <LuFile aria-hidden="true" />;
                  })()}
                </div>
                <div className={`item-checkbox-overlay ${isSelected ? "is-checked" : ""}`}>
                  {isSelected && <LuCheck size={12} aria-hidden="true" />}
                </div>
              </button>
              <div className="item-info">
                <span
                  className="item-title"
                  title={item.title}
                  style={listVt.title}
                >
                  {item.title}
                </span>
                <span className="item-meta">
                  {new Date(item.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {!isSelectionMode && (
              <div className="item-actions">
                {showPreviewButton && (
                  <Button
                    variant="ghost"
                    size="small"
                    icon={<LuEye size={14} aria-hidden="true" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(item);
                    }}
                    title={t("preview")}
                  />
                )}
                {showOpenButton && (
                  <Button
                    variant="ghost"
                    size="small"
                    icon={<LuExternalLink size={14} aria-hidden="true" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(item);
                    }}
                    title={t("open")}
                  />
                )}
                {showDeleteButton && (
                  <Button
                    variant="ghost"
                    className="btn-danger-ghost"
                    size="small"
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
      })}

      
    </div>
  );
};

const SpaceContentList = memo(SpaceContentListComponent);
SpaceContentList.displayName = "SpaceContentList";

export default SpaceContentList;
