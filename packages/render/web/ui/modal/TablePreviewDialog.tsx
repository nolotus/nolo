// packages/render/web/ui/modal/TablePreviewDialog.tsx

import "./previewShared.css"
import "./TablePreviewDialog.css"
import React from "react";
import { Dialog } from "./Dialog";
import { useTranslation } from "react-i18next";
import { LuTable, LuLoaderCircle } from "react-icons/lu";
import { SEPARATOR } from "database/keys";
import { useTable } from "render/table/useTable";
import { BaseTable, BaseTableRow, BaseTableCell } from "render/web/elements/BaseTable";

interface TablePreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    tableKey: string; // The meta key: meta-{tenantId}-{tableId}
    tableName: string;
}

const TablePreviewDialog: React.FC<TablePreviewDialogProps> = ({
    isOpen,
    onClose,
    tableKey,
    tableName,
}) => {
    const { t } = useTranslation("chat");

    // 1. 使用 useTable hook 解析与加载
    const {
        tenantId,
        tableId,
        valid,
        tableMeta,
        isLoading,
        error,
        rows,
    } = useTable(tableKey, { enabled: isOpen });

    const columns = tableMeta?.columns ?? [];

    const renderTitle = () => (
        <div className="dialog-title-wrapper">
            <LuTable size={16} className="title-icon" aria-hidden="true" />
            <span className="title-text" title={tableName}>
                {tableName || tableMeta?.displayName || "Table Preview"}
            </span>
        </div>
    );

    return (
        <>
            <Dialog
                isOpen={isOpen}
                onClose={onClose}
                title={renderTitle()}
                size="xlarge"
                className="table-preview-modal"
            >
                {isOpen && (
                    <div className="preview-body-content">
                        {isLoading && !tableMeta ? (
                            <div className="loading-state">
                                <LuLoaderCircle className="spin" size={24} aria-hidden="true" />
                                <p>{t("loadingContent")}</p>
                            </div>
                        ) : !valid ? (
                            <div className="error-state"> Invalid Table Key </div>
                        ) : (
                            <div className="table-container">
                                <BaseTable>
                                    <thead>
                                        <BaseTableRow>
                                            {columns.map((col) => (
                                                <th key={col.id} style={{ width: col.width || 120 }}>
                                                    <div className="table-header-cell">
                                                        {col.label || col.name}
                                                    </div>
                                                </th>
                                            ))}
                                        </BaseTableRow>
                                    </thead>
                                    <tbody>
                                        {rows.map((row: any) => (
                                            <BaseTableRow key={row.dbKey}>
                                                {columns.map((col) => (
                                                    <BaseTableCell key={col.id}>
                                                        <div className="table-data-cell">
                                                            {row[col.name] !== undefined ? String(row[col.name]) : ""}
                                                        </div>
                                                    </BaseTableCell>
                                                ))}
                                            </BaseTableRow>
                                        ))}
                                        {rows.length === 0 && (
                                            <BaseTableRow>
                                                <BaseTableCell colSpan={columns.length}>
                                                    <div className="empty-rows-message">No data rows found.</div>
                                                </BaseTableCell>
                                            </BaseTableRow>
                                        )}
                                    </tbody>
                                </BaseTable>
                            </div>
                        )}
                    </div>
                )}
            </Dialog>
        </>
    );
};

export default TablePreviewDialog;
