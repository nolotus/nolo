// 文件: render/web/elements/BaseTable.tsx
import "../elements.css";
import React from "react";

interface BaseTableColumn {
  width?: number | string;
  /** Stable React key when provided by caller */
  key?: React.Key;
  id?: string | number;
  title?: string;
}

interface BaseTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  columns?: BaseTableColumn[];
  containerStyle?: React.CSSProperties;
  /**
   * 容器内、table 之前渲染的控制栏区域
   *（比如导出按钮、筛选、工具栏等）
   */
  headerControls?: React.ReactNode;
}

export const BaseTable: React.FC<BaseTableProps> = ({
  columns = [],
  className = "",
  containerStyle,
  headerControls,
  style,
  children,
  ...tableProps
}) => {
  const hasCustomWidth = columns.some(
    (col) => col.width !== undefined && col.width !== null
  );
  const childArray = React.Children.toArray(children);
  const hasExplicitTableSections = childArray.some((child) => {
    if (!React.isValidElement(child) || typeof child.type !== "string") return false;
    return child.type === "thead" || child.type === "tbody" || child.type === "tfoot";
  });
  const tableChildren = hasExplicitTableSections ? children : <tbody>{children}</tbody>;

  return (
    <>
      

      <div className="table-container" style={containerStyle}>
        {headerControls}
        <table
          className={["data-table", className].filter(Boolean).join(" ")}
          style={style}
          {...tableProps}
        >
          {hasCustomWidth && (
            <colgroup>
              {columns.map((col, index) => (
                <col
                  key={
                    col.key ??
                    col.id ??
                    col.title ??
                    `col-${index}-${String(col.width ?? "").slice(0, 24)}`
                  }
                  style={
                    col.width != null
                      ? {
                        width:
                          typeof col.width === "number"
                            ? `${col.width}px`
                            : col.width,
                      }
                      : undefined
                  }
                />
              ))}
            </colgroup>
          )}
          {tableChildren}
        </table>
      </div>
    </>
  );
};

export const BaseTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(function BaseTableRow({ children, ...rowProps }, ref) {
  const { className, ...rest } = rowProps;
  const mergedClassName = ["table-row", className].filter(Boolean).join(" ");

  return (
    <tr ref={ref} className={mergedClassName} {...rest}>
      {children}
    </tr>
  );
});
BaseTableRow.displayName = "BaseTableRow";

type BaseTableCellProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  header?: boolean;
};

export const BaseTableCell: React.FC<BaseTableCellProps> = ({
  header,
  children,
  className,
  ...cellProps
}) => {
  const Component = header ? "th" : "td";

  const mergedClassName = [
    "table-cell",
    header ? "table-header" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={mergedClassName} {...cellProps}>
      {children}
    </Component>
  );
};
