// 文件路径: chat/messages/web/ApplyLineEditsPreviewViewer.tsx

import React, { useMemo } from "react";
import { LuTriangle } from "react-icons/lu";
import NoloEditor from "create/editor/Editor";
import { ToolProps, guessLanguageFromPath } from "./ToolMessageTypes";
import { messagesStyles as styles } from "./messagesStyles";
import { withLiteralClass } from "./toolMessageShared";
import { toolMessageContentStyles as cs } from "./toolMessageContentStyles";
import "./messagesStylexEscapeHatch.css";

/* --- 行级编辑：预览态（previewOnly） --- */

const ApplyLineEditsPreviewViewer: React.FC<ToolProps> = ({
  rawData,
  isError,
  t,
}) => {
  const filePath = rawData?.filePath ?? "Unknown";
  const language = useMemo(() => guessLanguageFromPath(filePath), [filePath]);

  if (isError || !rawData) return null;
  if (!rawData.previewOnly || !Array.isArray(rawData.edits)) return null;

  return (
    <div {...withLiteralClass("t-content-block ale-preview-block", cs.contentBlock, cs.alePreview)}>
      <div  {...withLiteralClass("t-block-header", contentStyles.blockHeader)}>
        <div  {...withLiteralClass("t-badge warning", cs.badge, cs.badgeWarning)}>
          <LuTriangle size={14} aria-hidden="true" />
        </div>
        <div className="u-flex-col u-flex-1 u-min-w-0">
          <span className="u-font-mono u-text-xs u-dim">{filePath}</span>
        </div>
      </div>

      <div {...withLiteralClass("ale-items-container", cs.aleItems)}>
        {rawData.edits.map((edit: any, idx: number) => {
          let label = "";
          if (edit.type === "replaceRange") {
            label = t(
              "ale.preview.replace",
              `替换第 ${edit.startLine}-${edit.endLine} 行`
            );
          } else if (edit.type === "insertBefore") {
            label = t(
              "ale.preview.insertBefore",
              `在第 ${edit.line} 行之前插入`
            );
          } else if (edit.type === "insertAfter") {
            label = t(
              "ale.preview.insertAfter",
              `在第 ${edit.line} 行之后插入`
            );
          } else if (edit.type === "deleteRange") {
            label = t(
              "ale.preview.deleteRange",
              `删除第 ${edit.startLine}-${edit.endLine} 行`
            );
          } else {
            label = `${edit.type || "unknown"}`;
          }

          const isInsertOrReplace =
            edit.type === "replaceRange" ||
            edit.type === "insertBefore" ||
            edit.type === "insertAfter";

          const text: string = isInsertOrReplace
            ? edit.replacement ?? edit.content ?? ""
            : "";

          const slateValue = [
            {
              type: "code-block",
              language,
              children: [{ text }],
            },
          ] as any;

          const editKey = [
            edit.type || "edit",
            edit.startLine ?? edit.line ?? "",
            edit.endLine ?? "",
            idx,
          ].join("-");

          return (
            <div key={editKey} {...withLiteralClass("ale-edit-block", cs.aleBlock)}>
              <div {...withLiteralClass("ale-edit-header", cs.aleHeader)}>
                <span {...withLiteralClass(`ale-badge ale-badge--${edit.type}`, cs.aleBadge, edit.type === "replaceRange" && cs.aleBadgeReplace, (edit.type === "insertBefore" || edit.type === "insertAfter") && cs.aleBadgeInsert, edit.type === "deleteRange" && cs.aleBadgeDelete)}>
                  {edit.type}
                </span>
                <span {...withLiteralClass("ale-lines u-text-xs u-font-mono", cs.aleLines)}>
                  {label}
                </span>
              </div>

              {isInsertOrReplace && text && (
                <div {...withLiteralClass("ale-code-full", cs.aleCode)}>
                  <NoloEditor initialValue={slateValue} readOnly />
                </div>
              )}

              {edit.type === "deleteRange" && (
                <div {...withLiteralClass("ale-delete-hint u-text-xs", cs.aleHint)}>
                  {t(
                    "ale.preview.deleteHint",
                    "此操作将删除上述行区间的原有内容（预览阶段无法展示原内容，执行后会提供完整 diff）。"
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApplyLineEditsPreviewViewer;
