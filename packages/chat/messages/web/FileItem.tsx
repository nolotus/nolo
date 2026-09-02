// chat/web/shared/FileItem.tsx
import * as stylex from "@stylexjs/stylex";
import React, { memo } from "react";
import { LuFileSpreadsheet, LuFileText } from "react-icons/lu";
import { LuMessageSquare } from "react-icons/lu";
import { fileItemStyles as styles } from "./fileItemStyles";
import { withLiteralClass } from "./toolMessageShared";
import "./messagesStylexEscapeHatch.css";

const FILE_TYPE_CONFIG = {
  excel: { icon: LuFileSpreadsheet, color: "#1D6F42", ext: "Excel" },
  docx: { icon: LuFileText, color: "#2B579A", ext: "Word" },
  pdf: { icon: LuFileText, color: "#DC3545", ext: "PDF" },
  txt: { icon: LuFileText, color: "#6c757d", ext: "文本" },
  page: { icon: LuFileText, color: "#FF9500", ext: "Page" },
  dialog: { icon: LuMessageSquare, color: "#7C3AED", ext: "Chat" },
  table: { icon: LuFileSpreadsheet, color: "#1D6F42", ext: "Table" },
  ocr_text: { icon: LuFileText, color: "#00BFFF", ext: "OCR" },
};

interface FileItemProps {
  file: any;
  variant?: "message" | "attachment";
  onPreview?: (file: any) => void;
  isProcessing?: boolean;
  error?: string;
  isMobile?: boolean;
}

export const FileItem = memo(
  ({
    file,
    variant = "message",
    onPreview,
    isProcessing = false,
    error,
    isMobile = false,
  }: FileItemProps) => {
    const config = (FILE_TYPE_CONFIG as any)[file?.type];
    if (!config) return null;

    const IconComponent = config.icon;
    const isAttachment = variant === "attachment";
    const disabled = isProcessing || !!error;

    const truncate = (name: string, max = 12) => {
      if (!isAttachment || !name) return name || "未知文件";
      if (name.length <= max) return name;
      const dot = name.lastIndexOf(".");
      const ext = dot > -1 ? name.slice(dot + 1) : "";
      const base = dot > -1 ? name.slice(0, dot) : name;
      const keep = Math.max(1, max - ext.length - 4);
      return `${base.slice(0, keep)}...${ext}`;
    };

    const formatSize = (bytes?: number) => {
      if (!bytes) return "";
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
      return `${(bytes / 1048576).toFixed(1)}MB`;
    };

    const displayName = truncate(file?.name);

    return (
      <>
        <div
          data-hook={[
            "messages-esc-file-item",
            variant === "message" ? "messages-esc-file-item-message" : "messages-esc-file-item-attachment",
            isProcessing ? "messages-esc-file-item-processing" : "",
            error ? "messages-esc-file-item-error" : "",
          ].filter(Boolean).join(" ")}
          {...withLiteralClass(
            [
              "file-item",
              variant,
              isMobile ? "mobile" : "",
              isProcessing ? "processing" : "",
              error ? "error" : "",
            ].join(" "),
            styles.item,
            variant === "message" && styles.message,
            variant === "attachment" && styles.attachment,
            variant === "attachment" && isMobile && styles.attachmentMobile,
            isProcessing && styles.processing,
            Boolean(error) && styles.error
          )}
          style={{
            "--file-color": config.color,
            cursor: (!disabled && onPreview) ? "pointer" : "default"
          } as React.CSSProperties}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-busy={isProcessing || undefined}
          aria-disabled={disabled || undefined}
          title={error || undefined}
          onClick={() => !disabled && onPreview?.(file)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled) {
              e.preventDefault();
              onPreview?.(file);
            }
          }}
        >
          <div
            data-hook="messages-esc-file-icon-wrapper"
            {...withLiteralClass(
              "file-icon-wrapper",
              styles.iconWrapper,
              variant === "message" && styles.iconWrapperMessage,
              variant === "attachment" && styles.iconWrapperAttachment
            )}
            aria-hidden="true"
          >
            <IconComponent
              size={isAttachment ? 14 : 16}
              data-hook="messages-esc-file-icon"
              {...withLiteralClass("file-icon", styles.icon)}
            />
          </div>

          {isAttachment ? (
            <div className="file-info">
              <span
                {...withLiteralClass("file-name", styles.name, styles.nameAttachment)}
              >
                {displayName}
              </span>
              <div className="file-meta">
                <span {...withLiteralClass("file-ext", styles.ext)}>{config.ext}</span>
                {file?.size ? (
                  <span className="file-size">{formatSize(file.size)}</span>
                ) : null}
              </div>
            </div>
          ) : (
            <span
              {...withLiteralClass("file-name", styles.name, styles.nameMessage)}
            >
              {file?.name || "未知文件"}
            </span>
          )}

          {isAttachment && isProcessing && (
            <div className="processing-indicator">
              <div {...stylex.props(styles.spinner)} />
            </div>
          )}

          {isAttachment && error && (
            <div {...stylex.props(styles.errorIndicator)}>
              ⚠️
            </div>
          )}
        </div>
      </>
    );
  }
);

export default FileItem;
