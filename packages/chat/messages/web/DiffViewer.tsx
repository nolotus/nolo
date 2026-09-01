
import React, { useMemo } from "react";
import { LuFileDiff } from "react-icons/lu";
import { withLiteralClass } from "./toolMessageShared";
import { toolMessageContentStyles as cs } from "./toolMessageContentStyles";
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
      <div {...withLiteralClass("diff-viewer diff-viewer--empty", cs.diffViewer, cs.diffEmpty)}>
        <LuFileDiff size={15} aria-hidden="true" />
        <span>No diff available</span>
      </div>
    );
  }

  return (
    <div {...withLiteralClass("diff-viewer", cs.diffViewer)} role="region" aria-label={`Diff for ${filePath}`}>
      <div {...withLiteralClass("diff-viewer__summary", cs.diffSummary)}>
        <span {...withLiteralClass("diff-viewer__summary-file", cs.diffFile)}>{filePath}</span>
        <span {...withLiteralClass("diff-viewer__stat diff-viewer__stat--add", cs.diffStat, cs.diffAdd)}>
          +{summary.added}
        </span>
        <span {...withLiteralClass("diff-viewer__stat diff-viewer__stat--remove", cs.diffStat, cs.diffRemove)}>
          -{summary.removed}
        </span>
      </div>

      <div {...withLiteralClass("diff-viewer__body", cs.diffBody)}>
        {rows.map((row) => (
          <div
            key={row.id}
            {...withLiteralClass(`diff-viewer__row diff-viewer__row--${row.kind}`, cs.diffRow, row.kind === "added" && cs.diffAdded, row.kind === "removed" && cs.diffRemoved)}
          >
            <span {...withLiteralClass("diff-viewer__line diff-viewer__line--old", cs.diffLine)}>
              {row.oldLine ?? ""}
            </span>
            <span {...withLiteralClass("diff-viewer__line diff-viewer__line--new", cs.diffLine)}>
              {row.newLine ?? ""}
            </span>
            <span {...withLiteralClass("diff-viewer__marker", cs.diffLine, cs.diffMarker, row.kind === "added" && cs.diffMarkerAdded, row.kind === "removed" && cs.diffMarkerRemoved)}>
              {row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " "}
            </span>
            <code {...withLiteralClass("diff-viewer__code", cs.diffCode)}>{row.content || " "}</code>
          </div>
        ))}
      </div>
    </div>
  );
};
