// packages/render/table/TablePageHeader.tsx
// 表头组件：图标/标题重命名 + 工具栏（「新增行」按钮、新列 input-group）。

import React from "react";
import Button from "render/web/ui/Button";
import InlineEditInput from "render/web/ui/InlineEditInput";
import ContentIcon from "render/contentIcon/ContentIcon";
import ContentIconPicker from "render/contentIcon/ContentIconPicker";
import type { ContentIcon as ContentIconValue } from "render/contentIcon/types";
import { LuCheck, LuPlus, LuTable } from "react-icons/lu";

export interface TablePageHeaderProps {
    tableMeta: any;
    isRenamingTable: boolean;
    setIsRenamingTable: (val: boolean) => void;
    tableTitleInput: string;
    setTableTitleInput: (val: string) => void;
    tableTitleInputRef: React.RefObject<HTMLInputElement | null>;
    isIconPickerOpen: boolean;
    setIsIconPickerOpen: (val: boolean) => void;
    newColumnName: string;
    setNewColumnName: (val: string) => void;
    handleAddRowTop: () => void;
    handleAddColumn: () => void;
    handleUpdateTitle: (title: string) => void;
    handleUpdateIcon: (icon: ContentIconValue | null) => void;
}

export const TablePageHeader: React.FC<TablePageHeaderProps> = ({
    tableMeta,
    isRenamingTable,
    setIsRenamingTable,
    tableTitleInput,
    setTableTitleInput,
    tableTitleInputRef,
    isIconPickerOpen,
    setIsIconPickerOpen,
    newColumnName,
    setNewColumnName,
    handleAddRowTop,
    handleAddColumn,
    handleUpdateTitle,
    handleUpdateIcon,
}) => {
    return (
        <div className="table-page__header">
            <div className="table-page__title">
                <div className="table-page__icon-anchor">
                    <button
                        type="button"
                        className="content-icon-button table-page__icon-button"
                        onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                        title="修改表图标"
                        aria-label="修改表图标"
                    >
                        <ContentIcon icon={tableMeta?.icon} fallback={LuTable} size={28} />
                    </button>
                    {isIconPickerOpen && (
                        <ContentIconPicker
                            open={isIconPickerOpen}
                            onSelect={(icon: ContentIconValue | null) => {
                                handleUpdateIcon(icon);
                                setIsIconPickerOpen(false);
                            }}
                            onClose={() => setIsIconPickerOpen(false)}
                        />
                    )}
                </div>

                {isRenamingTable ? (
                    <InlineEditInput
                        inputRef={tableTitleInputRef}
                        className="table-page__title-input"
                        value={tableTitleInput}
                        onChange={(e) => setTableTitleInput(e.target.value)}
                        onBlur={() => handleUpdateTitle(tableTitleInput)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleUpdateTitle(tableTitleInput);
                            } else if (e.key === "Escape") {
                                setIsRenamingTable(false);
                            }
                        }}
                    />
                ) : (
                    <button
                        type="button"
                        className="table-page__title-text"
                        onClick={() => {
                            setIsRenamingTable(true);
                            setTableTitleInput(
                                tableMeta.displayName ?? tableMeta.tableId
                            );
                        }}
                    >
                        {tableMeta.displayName ?? tableMeta.tableId}
                    </button>
                )}
            </div>

            <div className="table-page__toolbar">
                <Button
                    variant="ghost"
                    size="small"
                    onClick={handleAddRowTop}
                    title="新增行"
                    aria-label="新增行"
                    style={{
                        padding: "0 8px",
                        height: "24px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                    }}
                >
                    <LuPlus size={14} aria-hidden="true" />
                    <span>新增行</span>
                </Button>
                <div className="table-page__input-group">
                    <input
                        type="text"
                        className="table-page__input"
                        placeholder="新列名称..."
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                    />
                    <Button
                        variant="ghost"
                        size="small"
                        onClick={handleAddColumn}
                        title="确认添加"
                        aria-label="确认添加"
                        style={{ padding: "0 8px", height: "24px", marginRight: "4px" }}
                    >
                        <LuCheck size={14} aria-hidden="true" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
