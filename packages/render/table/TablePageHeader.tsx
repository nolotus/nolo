// packages/render/table/TablePageHeader.tsx
// 表头组件：居中标题与图标编辑、表格/看板视图切换胶囊、表格模式下的新列输入。

import React from "react";
import Button from "render/web/ui/Button";
import { isImeComposingKeyEvent } from "./keyboardUtils";
import InlineEditInput from "render/web/ui/InlineEditInput";
import ContentIcon from "render/contentIcon/ContentIcon";
import ContentIconPicker from "render/contentIcon/ContentIconPicker";
import type { ContentIcon as ContentIconValue } from "render/contentIcon/types";
import { LuCheck, LuLayoutDashboard, LuTable } from "react-icons/lu";
import type { TableViewChoice } from "./useKanbanBoard";

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
    handleAddColumn: () => void;
    handleUpdateTitle: (title: string) => void;
    handleUpdateIcon: (icon: ContentIconValue | null) => void;
    activeViewChoice?: TableViewChoice;
    setSelectedViewChoice?: (choice: TableViewChoice) => void;
    canUseKanbanView?: boolean;
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
    handleAddColumn,
    handleUpdateTitle,
    handleUpdateIcon,
    activeViewChoice = "grid",
    setSelectedViewChoice,
    canUseKanbanView = true,
}) => {
    return (
        <div className="table-page__header">
            {/* 左侧：表格视图下的新列输入（看板视图下干净隐藏） */}
            <div className="table-page__header-left">
                {activeViewChoice === "grid" && (
                    <div className="table-page__input-group" title="添加新列">
                        <input
                            type="text"
                            className="table-page__input"
                            placeholder="新列名称..."
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            onKeyDown={(e) =>
                                !isImeComposingKeyEvent(e) &&
                                e.key === "Enter" &&
                                handleAddColumn()
                            }
                        />
                        <Button
                            variant="ghost"
                            size="small"
                            onClick={handleAddColumn}
                            title="确认添加列"
                            aria-label="确认添加列"
                            style={{ padding: "0 6px", height: "22px", marginRight: "2px" }}
                        >
                            <LuCheck size={13} aria-hidden="true" />
                        </Button>
                    </div>
                )}
            </div>

            {/* 中间：居中展示的表图标与精致大标题 */}
            <div className="table-page__title table-page__title--center">
                <div className="table-page__icon-anchor">
                    <button
                        type="button"
                        className="content-icon-button table-page__icon-button"
                        onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                        title="修改表图标"
                        aria-label="修改表图标"
                    >
                        <ContentIcon icon={tableMeta?.icon} fallback={LuTable} size={26} />
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
                            if (isImeComposingKeyEvent(e)) return;
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
                        title="点击重命名表格"
                    >
                        {tableMeta.displayName ?? tableMeta.tableId}
                    </button>
                )}
            </div>

            {/* 右侧：视图切换胶囊（表格 | 看板） */}
            <div className="table-page__header-right">
                {setSelectedViewChoice && (
                    <div className="table-page__view-switch" role="group" aria-label="视图切换">
                        <Button
                            variant="ghost"
                            size="small"
                            className={`table-page__view-switch-btn${activeViewChoice === "grid" ? " table-page__view-switch-btn--active" : ""}`}
                            aria-pressed={activeViewChoice === "grid"}
                            onClick={() => setSelectedViewChoice("grid")}
                        >
                            <LuTable size={14} />
                            <span>表格</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="small"
                            className={`table-page__view-switch-btn${activeViewChoice === "kanban" ? " table-page__view-switch-btn--active" : ""}`}
                            disabled={!canUseKanbanView}
                            aria-pressed={activeViewChoice === "kanban"}
                            onClick={() => setSelectedViewChoice("kanban")}
                        >
                            <LuLayoutDashboard size={14} />
                            <span>看板</span>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
