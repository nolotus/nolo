// packages/chat/web/ComposerDrawer.tsx
// Secondary context drawer for ChatComposer (attachments, browse context, image config, usage).

import React, { memo, useId } from "react";
import { useTranslation } from "react-i18next";
import { LuChevronDown, LuGlobe, LuImage, LuPaperclip } from "react-icons/lu";
import * as stylex from "@stylexjs/stylex";
import { composerDrawerStyles } from "./composerDrawerStyles";
import { withLiteralClass } from "./withLiteralClass";

export type ComposerDrawerProps = {
  attachmentCount?: number;
  processingAttachmentCount?: number;
  hasBrowseContext?: boolean;
  browseHost?: string;
  imageConfigSummary?: string;
  usagePercent?: number;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
};

export const ComposerDrawer = memo(function ComposerDrawer({
  attachmentCount = 0,
  processingAttachmentCount = 0,
  hasBrowseContext = false,
  browseHost,
  imageConfigSummary,
  usagePercent,
  expanded = true,
  onToggle,
  children,
}: ComposerDrawerProps) {
  const { t } = useTranslation("chat");
  const contentId = useId();

  const hasSecondaryContext =
    attachmentCount > 0 ||
    hasBrowseContext ||
    Boolean(imageConfigSummary);

  // 当没有任何次级上下文时，保持 Composer 干净，不渲染空的 Drawer 栏
  if (!hasSecondaryContext) {
    return null;
  }

  const summaryParts: string[] = [];
  if (attachmentCount > 0) {
    summaryParts.push(
      `${attachmentCount} ${t("attachmentsLabel", "附件")}${
        processingAttachmentCount > 0
          ? ` (${processingAttachmentCount} ${t("processingLabel", "处理中")})`
          : ""
      }`
    );
  }
  if (hasBrowseContext) {
    summaryParts.push(`${t("webContext", "网页")} ${browseHost || "Web"}`);
  }
  if (imageConfigSummary) {
    summaryParts.push(`${t("imageConfig", "生图")} ${imageConfigSummary}`);
  }
  if (typeof usagePercent === "number" && usagePercent > 0) {
    summaryParts.push(`${t("usage", "用量")} ${usagePercent}%`);
  }

  const actionText = expanded
    ? t("collapseComposerDrawer", "收起上下文与附件")
    : t("expandComposerDrawer", "展开上下文与附件");

  const toggleAriaLabel =
    summaryParts.length > 0 ? `${actionText} · ${summaryParts.join(" · ")}` : actionText;

  return (
    <div {...withLiteralClass("composer-drawer", composerDrawerStyles.root)}>
      <button
        type="button"
        {...withLiteralClass("composer-drawer__toggle-bar", composerDrawerStyles.toggleBar)}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={toggleAriaLabel}
        title={toggleAriaLabel}
      >
        <div {...stylex.props(composerDrawerStyles.summaryLeft)}>
          {attachmentCount > 0 && (
            <span
              {...withLiteralClass("composer-drawer__badge", composerDrawerStyles.badge)}
            >
              <LuPaperclip
                size={12}
                aria-hidden="true"
                {...stylex.props(composerDrawerStyles.badgeIcon)}
              />
              <span>
                {attachmentCount}
                {processingAttachmentCount > 0 ? (
                  <>
                    {" · "}
                    <span aria-hidden="true">⏳</span>
                    {" "}
                    {processingAttachmentCount}
                  </>
                ) : null}
              </span>
            </span>
          )}

          {hasBrowseContext && (
            <span
              {...withLiteralClass("composer-drawer__badge", composerDrawerStyles.badge)}
            >
              <LuGlobe
                size={12}
                aria-hidden="true"
                {...stylex.props(composerDrawerStyles.badgeIcon)}
              />
              <span>{browseHost || "Web"}</span>
            </span>
          )}

          {imageConfigSummary && (
            <span
              {...withLiteralClass("composer-drawer__badge", composerDrawerStyles.badge)}
            >
              <LuImage
                size={12}
                aria-hidden="true"
                {...stylex.props(composerDrawerStyles.badgeIcon)}
              />
              <span>{imageConfigSummary}</span>
            </span>
          )}
        </div>

        <div {...stylex.props(composerDrawerStyles.summaryRight)}>
          {typeof usagePercent === "number" && usagePercent > 0 && (
            <div
              {...withLiteralClass(
                "composer-drawer__mini-progress",
                composerDrawerStyles.miniProgressWrap
              )}
              role="progressbar"
              aria-label={t("contextUsagePercent", "上下文用量 {{percent}}%", {
                percent: usagePercent,
              })}
              aria-valuenow={usagePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              title={t("contextUsagePercent", "上下文用量 {{percent}}%", {
                percent: usagePercent,
              })}
            >
              <div {...stylex.props(composerDrawerStyles.miniProgressTrack)}>
                <div
                  {...stylex.props(composerDrawerStyles.miniProgressFill)}
                  style={{ width: `${Math.min(100, Math.max(0, usagePercent))}%` }}
                />
              </div>
              <span {...stylex.props(composerDrawerStyles.miniProgressText)}>
                {usagePercent}%
              </span>
            </div>
          )}

          <span
            {...stylex.props(
              composerDrawerStyles.chevron,
              expanded && composerDrawerStyles.chevronExpanded
            )}
          >
            <LuChevronDown size={14} aria-hidden="true" />
          </span>
        </div>
      </button>

      {expanded && (
        <div
          id={contentId}
          role="region"
          aria-label={t("composerDrawerRegion", "附加选项与文件预览")}
          {...withLiteralClass("composer-drawer__content", composerDrawerStyles.content)}
        >
          {children}
        </div>
      )}
    </div>
  );
});
export default ComposerDrawer;
