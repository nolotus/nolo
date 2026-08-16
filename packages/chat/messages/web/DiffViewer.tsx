import React, { useMemo } from "react";
import { LuFileDiff } from "react-icons/lu";
import {
  buildDiffRows,
  summarizeDiffRows,
  type DiffPart,
} from "./diffViewerModel";

type DiffViewerProps = {
  parts: DiffPart[];
  filePath: string;
};

export const DiffViewer: React.FC<DiffViewerProps> = ({ parts, filePath }) => {
  const rows = useMemo(() => buildDiffRows(parts), [parts]);
  const summary = useMemo(() => summarizeDiffRows(rows), [rows]);

  if (rows.length === 0) {
    return (
      <div className="diff-viewer diff-viewer--empty">
        <LuFileDiff size={15} aria-hidden="true" />
        <span>No diff available</span>
      </div>
    );
  }

  return (
    <div className="diff-viewer" role="region" aria-label={`Diff for ${filePath}`}>
      <div className="diff-viewer__summary">
        <span className="diff-viewer__summary-file">{filePath}</span>
        <span className="diff-viewer__stat diff-viewer__stat--add">
          +{summary.added}
        </span>
        <span className="diff-viewer__stat diff-viewer__stat--remove">
          -{summary.removed}
        </span>
      </div>

      <div className="diff-viewer__body">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`diff-viewer__row diff-viewer__row--${row.kind}`}
          >
            <span className="diff-viewer__line diff-viewer__line--old">
              {row.oldLine ?? ""}
            </span>
            <span className="diff-viewer__line diff-viewer__line--new">
              {row.newLine ?? ""}
            </span>
            <span className="diff-viewer__marker">
              {row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " "}
            </span>
            <code className="diff-viewer__code">{row.content || " "}</code>
          </div>
        ))}
      </div>
    </div>
  );
};
