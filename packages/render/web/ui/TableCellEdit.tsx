import "../ui.css";
import React from "react";

export interface TableCellEditProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const TableCellEdit: React.FC<TableCellEditProps> = (props) => {
  const { inputRef, className, style, ...restProps } = props;

  const mergedClassName = ["table-cell-edit", className]
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
