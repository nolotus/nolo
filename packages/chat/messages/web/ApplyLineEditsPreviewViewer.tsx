// 文件路径: chat/messages/web/ApplyLineEditsPreviewViewer.tsx

import "./messages.css";
import React, { useMemo } from "react";
import { LuTriangle } from "react-icons/lu";
import NoloEditor from "create/editor/Editor";
import { ToolProps, guessLanguageFromPath } from "./ToolMessageTypes";

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
    <div className="t-content-block ale-preview-block">
      <div className="t-block-header">
        <div className="t-badge warning">
          <LuTriangle size={14} aria-hidden="true" />
        </div>
        <div className="u-flex-col u-flex-1 u-min-w-0">
          <span className="u-font-mono u-text-xs u-dim">{filePath}</span>
        </div>
      </div>

      <div className="ale-items-container">
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
            <div key={editKey} className="ale-edit-block">
              <div className="ale-edit-header">
                <span className={`ale-badge ale-badge--${edit.type}`}>
                  {edit.type}
                </span>
                <span className="ale-lines u-text-xs u-font-mono">
                  {label}
                </span>
              </div>

              {isInsertOrReplace && text && (
                <div className="ale-code-full">
                  <NoloEditor initialValue={slateValue} readOnly />
                </div>
              )}

              {edit.type === "deleteRange" && (
                <div className="ale-delete-hint u-text-xs">
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