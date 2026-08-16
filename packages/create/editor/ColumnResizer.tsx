import React, { useCallback, useRef } from "react";
import { useSlateStatic, ReactEditor } from "slate-react";
import { Editor, Path } from "slate";
import { setColumnWidth } from "./tableCommands";
import { useDragResize } from "app/hooks/useDragResize";

interface ColumnResizerProps {
  columnIndex: number;
  tablePath: Path;
}

export const ColumnResizer: React.FC<ColumnResizerProps> = ({
  columnIndex,
  tablePath,
}) => {
  const editor = useSlateStatic();
  const handleRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const { handlePointerDown } = useDragResize({
    cursor: "col-resize",
    onMove: (clientX) => {
      const delta = clientX - startX.current;
      const newWidth = startWidth.current + delta;
      setColumnWidth(editor as ReactEditor, tablePath, columnIndex, newWidth);
    },
    onStop: () => {
      // 宽度已在 onMove 中实时更新，stop 时无需额外操作
    },
  });

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const tableNodeEntry = Editor.node(editor, tablePath);
      if (!tableNodeEntry) return;

      const tableElement = ReactEditor.toDOMNode(editor as ReactEditor, tableNodeEntry[0]);
      const cellElement = tableElement.querySelector(
        `tr > *:nth-child(${columnIndex + 1})`
      );

      if (!cellElement) {
        console.error("[Resizer] 找不到单元格的DOM元素");
        return;
      }

      startX.current = event.clientX;
      startWidth.current = cellElement.getBoundingClientRect().width;

      // 激活通用 hook（setPointerCapture + userSelect + cursor）
      handlePointerDown(event);
    },
    [editor, tablePath, columnIndex, handlePointerDown]
  );

  return (
    <div
      ref={handleRef}
      onPointerDown={onPointerDown}
      className="column-resizer-handle"
      style={{
        position: "absolute",
        top: 0,
        right: -2,
        width: "4px",
        height: "100%",
        cursor: "col-resize",
        zIndex: 10,
      }}
    />
  );
};
