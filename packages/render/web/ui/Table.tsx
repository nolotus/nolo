// render/web/ui/Table.tsx
import "../ui.css";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Path, Node as SlateNode } from "slate";
import { ColumnResizer } from "create/editor/ColumnResizer";
import {
  SlateTable,
  SlateTableCell as SlateTableCellType,
} from "create/editor/transforms/fromMarkdown/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "app/routing";
import { toast } from "app/utils/toast";
import { LuDownload, LuFileText, LuTable, LuTable2 } from "react-icons/lu";
import { useAppDispatch } from "app/store";
import { SEPARATOR } from "database/keys";
import { createTable, addRow } from "render/table/tableSlice";
import { BaseTable, BaseTableRow, BaseTableCell } from "../elements/BaseTable";

// --- 1. 通用 Props 定义 ---

interface TableBaseProps {
  attributes?: any;
  children: React.ReactNode;
  style?: React.CSSProperties;
  isStreaming?: boolean;
}

// --- 2. 导出功能辅助函数 ---

interface ExtractedTableData {
  headers: string[];
  rows: string[][];
}

type SlateTableRowLike = {
  children?: any[];
};

const isSlateTableRowLike = (row: unknown): row is SlateTableRowLike =>
  Boolean(
    row &&
    typeof row === "object" &&
    Array.isArray((row as SlateTableRowLike).children)
  );

const extractTableData = (
  tableElement: SlateTable | undefined,
  getDefaultHeaderLabel: (index: number) => string
): ExtractedTableData | null => {
  if (!tableElement?.children?.length) return null;

  const tableRows = (tableElement.children as unknown[])
    .filter(isSlateTableRowLike)
    .filter((row) => (row.children?.length ?? 0) > 0);

  if (tableRows.length === 0) return null;

  const columnCount = Math.max(
    ...tableRows.map((row) => row.children?.length ?? 0)
  );
  if (columnCount <= 0) return null;

  const matrix = tableRows.map((row) => {
    const rowTexts = (row.children ?? []).map((cell: any) =>
      SlateNode.string(cell).trim()
    );
    return Array.from(
      { length: columnCount },
      (_, index) => rowTexts[index] || ""
    );
  });

  const hasHeaderRow = (tableRows[0].children ?? []).every((cell: any) =>
    Boolean(cell.header)
  );
  const headers = (
    hasHeaderRow ? matrix[0] : Array.from({ length: columnCount }, () => "")
  ).map((header, index) => header || getDefaultHeaderLabel(index + 1));
  const rows = hasHeaderRow ? matrix.slice(1) : matrix;

  return { headers, rows };
};

const convertToCSV = (headers: string[], rows: string[][]) => {
  const escapeCSV = (str: string) => {
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvHeaders = headers.map(escapeCSV).join(",");
  const csvRows = rows.map((row) =>
    row.map((cell) => escapeCSV(cell || "")).join(",")
  );
  // Use CRLF for better spreadsheet compatibility (especially Excel on Windows).
  return [csvHeaders, ...csvRows].join("\r\n");
};

const mapRowsToObjects = (headers: string[], rows: string[][]) =>
  rows.map((row) =>
    headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = row[index] || "";
      return acc;
    }, {})
  );

const convertToJSON = (headers: string[], rows: string[][]) => {
  const jsonData = mapRowsToObjects(headers, rows);
  return JSON.stringify(jsonData, null, 2);
};

const parseMetaKey = (dbKey: string): { tenantId: string; tableId: string } => {
  const parts = dbKey.split(SEPARATOR);
  if (parts[0] !== "meta" || parts.length < 3) {
    throw new Error(`Invalid table key: ${dbKey}`);
  }

  return {
    tenantId: parts[1],
    tableId: parts.slice(2).join(SEPARATOR),
  };
};

// --- 3. Table 主组件 ---

interface TableProps extends TableBaseProps {
  element?: SlateTable;
  path?: Path;
}

export const Table: React.FC<TableProps> = ({
  attributes,
  children,
  element,
  style,
  isStreaming = false,
}) => {
  const { t } = useTranslation("chat");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { columns = [] } = element || {};
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const tableData = useMemo(
    () =>
      extractTableData(element, (index) =>
        t("table.defaultColumnLabel", {
          index,
          defaultValue: `Column ${index}`,
        })
      ),
    [element, t]
  );
  const hasExportableData = Boolean(tableData);
  const canShowHeaderControls = hasExportableData && !isStreaming;

  useEffect(() => {
    if (isStreaming && showExportMenu) {
      setShowExportMenu(false);
    }
  }, [isStreaming, showExportMenu]);

  const handleExport = useCallback(
    async (format: string) => {
      if (!tableData) return;
      const { headers, rows } = tableData;
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const baseFileName = `table-export-${timestamp}`;

      if (format === "csv") {
        const csvData = convertToCSV(headers, rows);
        // Prefix UTF-8 BOM so Excel can detect UTF-8 and avoid garbled CJK text.
        const blob = new Blob(["\uFEFF", csvData], {
          type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseFileName}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === "json") {
        const jsonData = convertToJSON(headers, rows);
        const blob = new Blob([jsonData], {
          type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseFileName}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const jsonData = mapRowsToObjects(headers, rows);
        const ws = XLSX.utils.json_to_sheet(jsonData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${baseFileName}.xlsx`);
      }
      setShowExportMenu(false);
    },
    [tableData]
  );

  const handleConvertToDataTable = useCallback(async () => {
    if (!tableData || isStreaming || isConverting) return;

    setIsConverting(true);
    setShowExportMenu(false);

    try {
      const tableColumns = tableData.headers.map((header, index) => ({
        name: `col_${index + 1}`,
        label: header,
        type: "text" as const,
      }));

      const dbKey = await dispatch(
        createTable({
          title: t("table.convertedTitle", {
            defaultValue: "Converted Table",
          }),
          columns: tableColumns,
          withDefaultRows: false,
        })
      ).unwrap();

      const { tenantId, tableId } = parseMetaKey(dbKey);

      await Promise.all(
        tableData.rows.map((row) =>
          dispatch(
            addRow({
              tenantId,
              tableId,
              values: tableColumns.reduce<Record<string, string>>(
                (acc, column, index) => {
                  acc[column.name] = row[index] || "";
                  return acc;
                },
                {}
              ),
            })
          ).unwrap()
        )
      );

      toast.success(
        t("table.convertSuccess", {
          defaultValue: "Converted to table successfully",
        })
      );
      navigate(`/${dbKey}?edit=true`);
    } catch (error) {
      console.error("Failed to convert markdown table:", error);
      toast.error(
        t("table.convertFailed", {
          defaultValue: "Failed to convert table",
        })
      );
    } finally {
      setIsConverting(false);
    }
  }, [dispatch, isConverting, isStreaming, navigate, t, tableData]);

  // 只负责导出相关的样式，基础表格样式已在 BaseTable 中
  return (
    <>

      <BaseTable
        columns={columns}
        style={style}
        headerControls={
          canShowHeaderControls && (
            <div
              className={`table-header-controls ${
                showExportMenu ? "is-active" : ""
              }`}
            >
              <button
                type="button"
                className="table-action-button"
                onClick={() => void handleConvertToDataTable()}
                disabled={isConverting}
              >
                <LuTable2 size={14} aria-hidden="true" />
                {isConverting
                  ? t("table.converting", { defaultValue: "Converting..." })
                  : t("table.convertToDataTable", {
                    defaultValue: "Convert to data table",
                  })}
              </button>

              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="table-action-button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <LuDownload size={14} aria-hidden="true" />
                  {t("table.export", { defaultValue: "Export" })}
                </button>

                {showExportMenu && (
                  <div className="export-menu">
                    <button
                      type="button"
                      className="export-option"
                      onClick={() => void handleExport("csv")}
                    >
                      <LuFileText size={14} aria-hidden="true" /> CSV
                    </button>
                    <button
                      type="button"
                      className="export-option"
                      onClick={() => void handleExport("json")}
                    >
                      <LuFileText size={14} aria-hidden="true" /> JSON
                    </button>
                    <button
                      type="button"
                      className="export-option"
                      onClick={() => void handleExport("xlsx")}
                    >
                      <LuTable size={14} aria-hidden="true" /> XLSX
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        }
        {...attributes}
      >
        {children}
      </BaseTable>

      {/* 点击空白关闭导出菜单 */}
      {showExportMenu && canShowHeaderControls && (
        <button
          type="button"
          aria-label={t("table.closeExportMenu", { defaultValue: "关闭导出菜单" })}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 5,
            margin: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "default",
          }}
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </>
  );
};

// --- 4. TableRow 组件 ---

export const TableRow: React.FC<TableBaseProps> = ({
  attributes,
  children,
  style,
}) => {
  const { style: attrStyle, ...restAttrs } = attributes || {};
  const mergedStyle = { ...(attrStyle || {}), ...(style || {}) };

  return (
    <BaseTableRow style={mergedStyle} {...restAttrs}>
      {children}
    </BaseTableRow>
  );
};

// --- 5. TableCell 组件 ---

interface TableCellProps extends TableBaseProps {
  element: SlateTableCellType;
  path: Path;
  isFirstRow: boolean;
}

export const TableCell: React.FC<TableCellProps> = ({
  attributes,
  children,
  element,
  path,
  isFirstRow,
  style,
}) => {
  const isHeader = Boolean(element.header);

  const isPathInvalid = !path || !Array.isArray(path) || path.length < 2;
  const columnIndex = isPathInvalid ? 0 : (path[path.length - 1] as number);
  const tablePath = isPathInvalid ? [] : path.slice(0, -2);

  const { style: attrStyle, ...restAttrs } = attributes || {};
  const mergedStyle = { ...(attrStyle || {}), ...(style || {}) };

  return (
    <BaseTableCell header={isHeader} style={mergedStyle} {...restAttrs}>
      {children}
      {isFirstRow && !isPathInvalid && (
        <ColumnResizer columnIndex={columnIndex} tablePath={tablePath} />
      )}
    </BaseTableCell>
  );
};
