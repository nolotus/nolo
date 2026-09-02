// render/web/ui/TableCellEdit.tsx
import * as stylex from "@stylexjs/stylex";
import React from "react";

import { tableCellEditStyles } from "./tableCellEdit.styles";

export interface TableCellEditProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const TableCellEdit: React.FC<TableCellEditProps> = (props) => {
  const { inputRef, className, style, ...restProps } = props;

  const mergedClassName = [
    stylex.props(tableCellEditStyles.cell).className,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <textarea
      ref={inputRef}
      className={mergedClassName}
      style={style}
      {...restProps}
    />
  );
};

export default TableCellEdit;
