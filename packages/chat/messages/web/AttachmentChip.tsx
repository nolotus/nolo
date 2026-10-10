import * as stylex from "@stylexjs/stylex";
import React, { memo } from "react";
import { LuPaperclip } from "react-icons/lu";
import { Link } from "app/routing";
import { getCompactFileMetaLabel } from "app/utils/fileUtils";
import { describeAttachmentCard, resolveAttachmentCardHref } from "../attachmentCardModel";
import { fileItemStyles as fileStyles } from "./fileItemStyles";
import { attachmentChipStyles as chipStyles } from "./attachmentChipStyles";
import { withLiteralClass } from "./toolMessageShared";
import "./messagesStylexEscapeHatch.css";

/**
 * Web 消息里的附件卡（新 `attachment` part + 旧 `media_job` part）。
 *
 * 读取侧先于写入侧部署：即使 writer 门（`../attachmentWriteRollout.ts`）仍关闭，
 * 任何自称附件的 part 也必须在气泡里可见 —— 旧的「无 pageKey → return null」
 * 会让附件静默消失，是本块要修掉的断层。
 *
 * 口径：
 * - 展示名 / 格式 / 大小；格式与大小走 `getCompactFileMetaLabel`（与 SpaceContentBlock 等同源）；
 * - `describeAttachmentCard` 判「未知版本 / 坏数据 / 本机件 / 无法读取」→ 明显不可用，不静默；
 * - 旧 `media_job` 有任务 id 才给 `/media-jobs/<id>` 链接，没有就只展示，**不造假链接**；
 * - **绝不渲染 fileKey / 本地路径 / machineId**（文案由纯模型产出，另见其测试）。
 * - 本块不实现下载/预览动作（后续阶段）。
 */
export interface AttachmentChipProps {
  /** 消息里的 `attachment`（新契约）或旧 `media_job` part。 */
  part: unknown;
  isMobile?: boolean;
}

const partField = (part: unknown, key: string): unknown =>
  typeof part === "object" && part !== null
    ? (part as Record<string, unknown>)[key]
    : undefined;

export const AttachmentChip = memo(
  ({ part, isMobile = false }: AttachmentChipProps) => {
    const card = describeAttachmentCard(part);
    const metaLabel =
      getCompactFileMetaLabel({
        fileName: partField(part, "name"),
        mimeType: partField(part, "mimeType"),
        fileSize: partField(part, "size"),
      }) ?? card.meta;
    const href = resolveAttachmentCardHref(part);
    const unavailable =
      card.state === "unavailable" || card.state === "needs-upgrade";

    const chipClassProps = withLiteralClass(
      [
        "attachment-chip",
        isMobile ? "mobile" : "",
        unavailable ? "error" : "",
      ]
        .filter(Boolean)
        .join(" "),
      fileStyles.item,
      fileStyles.attachment,
      isMobile && fileStyles.attachmentMobile,
      unavailable && chipStyles.unavailable
    );

    const chip = (
      <div
        data-hook={[
          "messages-esc-file-item",
          "messages-esc-file-item-attachment",
          "messages-esc-attachment-chip",
          unavailable ? "messages-esc-file-item-error" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        {...chipClassProps}
        style={
          {
            ...(chipClassProps.style ?? {}),
            "--file-color": unavailable ? "var(--error)" : "var(--textSecondary)",
            cursor: href ? "pointer" : "default",
          } as React.CSSProperties
        }
        title={card.name}
      >
        <div
          data-hook="messages-esc-file-icon-wrapper"
          {...withLiteralClass(
            "file-icon-wrapper",
            fileStyles.iconWrapper,
            fileStyles.iconWrapperAttachment
          )}
          aria-hidden="true"
        >
          <LuPaperclip
            size={14}
            data-hook="messages-esc-file-icon"
            {...withLiteralClass("file-icon", fileStyles.icon)}
          />
        </div>

        <div {...stylex.props(chipStyles.info)}>
          <span
            {...withLiteralClass(
              "file-name",
              fileStyles.name,
              fileStyles.nameAttachment
            )}
          >
            {card.name}
          </span>
          <div {...withLiteralClass("file-meta", chipStyles.metaRow)}>
            <span {...withLiteralClass("file-ext", fileStyles.ext)} data-testid="attachment-chip-meta">
              {metaLabel}
            </span>
          </div>
          {card.hint ? (
            <span
              {...withLiteralClass("attachment-chip__hint", chipStyles.hint)}
              data-testid="attachment-chip-hint"
            >
              {card.hint}
            </span>
          ) : null}
        </div>

        {unavailable ? (
          <div {...stylex.props(fileStyles.errorIndicator)}>⚠️</div>
        ) : null}
      </div>
    );

    // 旧 media_job 无 jobId：只展示，不创建假链接。
    if (!href) return chip;

    return (
      <Link
        to={href}
        data-hook="messages-esc-attachment-chip-link"
        data-testid="attachment-chip-job-link"
        title={card.name}
        className="attachment-chip-link"
        style={{ display: "inline-flex", textDecoration: "none", color: "inherit" }}
      >
        {chip}
      </Link>
    );
  }
);

AttachmentChip.displayName = "AttachmentChip";

export default AttachmentChip;
