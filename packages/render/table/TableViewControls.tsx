// packages/render/table/TableViewControls.tsx
// 视图切换、看板分组配置、多选筛选与新列添加统一工具栏组件。

import React, { useMemo, useState } from "react";
import { Button as AriaButton, Dialog, DialogTrigger } from "react-aria-components";
import Button from "render/web/ui/Button";
import Checkbox from "render/web/form/Checkbox";
import { Popover } from "render/web/ui/Popover";
import { Select, SelectItem } from "render/web/ui/Select";
import {
    LuCheck,
    LuChevronDown,
    LuColumns3,
    LuFilter,
    LuLayoutDashboard,
    LuPlus,
    LuSlidersHorizontal,
    LuTable,
    LuX,
} from "react-icons/lu";
import type { TableViewChoice } from "./useKanbanBoard";
import type { TableColumn } from "./types";
import { getColumnFilterOptions } from "./tableView";
import { isImeComposingKeyEvent } from "./keyboardUtils";

export interface TableViewControlsProps {
    statusFilterColumn: any;
    selectedStatusFilter?: string;
    setSelectedStatusFilter?: (val: string) => void;
    selectedStatusFilters?: string[];
    setSelectedStatusFilters?: (vals: string[]) => void;
    statusSelectOptions: string[];
    ownerFilterColumn: any;
    selectedOwnerFilter?: string;
    setSelectedOwnerFilter?: (val: string) => void;
    selectedOwnerFilters?: string[];
    setSelectedOwnerFilters?: (vals: string[]) => void;
    ownerSelectOptions: string[];
    activeViewChoice: TableViewChoice;
    setSelectedViewChoice: (choice: TableViewChoice) => void;
    canUseKanbanView: boolean;
    filteredCount: number;
    totalCount: number;
    columns?: TableColumn[];
    rows?: any[];
    kanbanGroupCandidates?: TableColumn[];
    selectedGroupColumnName?: string;
    setSelectedGroupColumnName?: (val: string) => void;
    customFilters?: Record<string, string[]>;
    setCustomFilters?: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
    allDetailColumns?: TableColumn[];
    visibleCardColumnNames?: string[] | null;
    setVisibleCardColumnNames?: (names: string[] | null) => void;
    newColumnName?: string;
    setNewColumnName?: (val: string) => void;
    onAddColumn?: () => void;
}

function ChoicePopover({
    title,
    label,
    children,
    active = false,
}: {
    title: string;
    label: React.ReactNode;
    children: (close: () => void) => React.ReactNode;
    active?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="table-page__filter-chip-wrapper">
            <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
                <Button
                    as={AriaButton}
                    variant="ghost"
                    size="small"
                    className={`table-page__filter-chip${active ? " is-active" : ""}`}
                    aria-label={title}
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                >
                    {label}
                    <LuChevronDown size={14} className="table-page__filter-chip-arrow" />
                </Button>
                <Popover
                    placement="bottom start"
                    hideArrow
                    className="table-page__filter-popover"
                >
                    <Dialog aria-label={title}>
                        <div className="table-page__filter-popover-header">
                            <span>{title}</span>
                            <Button
                                variant="ghost"
                                size="small"
                                aria-label={`关闭${title}`}
                                onClick={() => setIsOpen(false)}
                            >
                                <LuX size={14} />
                            </Button>
                        </div>
                        {children(() => setIsOpen(false))}
                    </Dialog>
                </Popover>
            </DialogTrigger>
        </div>
    );
}

function MultiSelect({
    title,
    label,
    options,
    selected,
    onChange,
    onReset,
    resetLabel = "重置选择",
}: {
    title: string;
    label: React.ReactNode;
    options: Array<{ value: string; label: string }>;
    selected: string[];
    onChange: (values: string[]) => void;
    onReset: () => void;
    resetLabel?: string;
}) {
    return (
        <ChoicePopover title={title} label={label} active={selected.length > 0}>
            {() => (
                <>
                    <div className="table-page__filter-popover-options">
                        {options.length === 0 && (
                            <div className="table-page__filter-popover-empty">暂无选项</div>
                        )}
                        {options.map((option) => (
                            <Checkbox
                                key={option.value}
                                label={option.label}
                                checked={selected.includes(option.value)}
                                onChange={(event) =>
                                    onChange(
                                        event.target.checked
                                            ? [...selected, option.value]
                                            : selected.filter((value) => value !== option.value)
                                    )
                                }
                            />
                        ))}
                    </div>
                    <div className="table-page__filter-popover-footer">
                        <Button variant="ghost" size="small" onClick={onReset}>
                            {resetLabel}
                        </Button>
                    </div>
                </>
            )}
        </ChoicePopover>
    );
}

const summary = (values: string[], prefix: string, fallback: string = prefix) => {
    if (values.length === 0) return fallback;
    if (values.length === 1) return `${prefix}: ${values[0]}`;
    return `${prefix}: ${values[0]} (+${values.length - 1})`;
};

const choices = (values: string[]) =>
    values.map((value) => ({ value, label: value || "（空）" }));

export const TableViewControls: React.FC<TableViewControlsProps> = ({
    statusFilterColumn,
    selectedStatusFilter = "",
    setSelectedStatusFilter,
    selectedStatusFilters = selectedStatusFilter ? [selectedStatusFilter] : [],
    setSelectedStatusFilters,
    statusSelectOptions,
    ownerFilterColumn,
    selectedOwnerFilter = "",
    setSelectedOwnerFilter,
    selectedOwnerFilters = selectedOwnerFilter ? [selectedOwnerFilter] : [],
    setSelectedOwnerFilters,
    ownerSelectOptions,
    activeViewChoice,
    setSelectedViewChoice,
    canUseKanbanView,
    filteredCount,
    totalCount,
    columns = [],
    rows = [],
    kanbanGroupCandidates = [],
    selectedGroupColumnName,
    setSelectedGroupColumnName,
    customFilters = {},
    setCustomFilters,
    allDetailColumns = [],
    visibleCardColumnNames = null,
    setVisibleCardColumnNames,
    newColumnName = "",
    setNewColumnName,
    onAddColumn,
}) => {
    const availableFilterColumns = useMemo(
        () =>
            columns.filter(
                (col) =>
                    !col.isPrimary &&
                    col.id !== statusFilterColumn?.id &&
                    col.id !== ownerFilterColumn?.id &&
                    !Object.prototype.hasOwnProperty.call(customFilters, col.id)
            ),
        [columns, statusFilterColumn, ownerFilterColumn, customFilters]
    );

    const changeStatus = (values: string[]) =>
        setSelectedStatusFilters
            ? setSelectedStatusFilters(values)
            : setSelectedStatusFilter?.(values[0] ?? "");

    const changeOwner = (values: string[]) =>
        setSelectedOwnerFilters
            ? setSelectedOwnerFilters(values)
            : setSelectedOwnerFilter?.(values[0] ?? "");

    const hasActiveFilters =
        selectedStatusFilters.length > 0 ||
        selectedOwnerFilters.length > 0 ||
        Object.values(customFilters).some((vals) => vals.length > 0);

    return (
        <div className="table-page__view-controls" aria-label="表格筛选与视图">
            <div className="table-page__toolbar-left">
                {/* 1. 一级视图切换：表格 | 看板 位于最左侧 */}
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

                <div className="table-page__toolbar-divider" aria-hidden="true" />

                {/* 2. 看板专属配置（当处于看板视图时紧贴视图切换）：分组依据 + 显示字段 */}
                {activeViewChoice === "kanban" && (
                    <>
                        {kanbanGroupCandidates.length > 0 && (
                            <div className="table-page__kanban-group-selector">
                                <LuColumns3 size={14} className="table-page__kanban-group-icon" />
                                <span className="table-page__kanban-group-label">分组:</span>
                                <Select
                                    selectedKey={
                                        selectedGroupColumnName || kanbanGroupCandidates[0]?.name
                                    }
                                    onSelectionChange={(key) =>
                                        setSelectedGroupColumnName?.(String(key ?? ""))
                                    }
                                >
                                    {kanbanGroupCandidates.map((col) => (
                                        <SelectItem
                                            key={col.name}
                                            id={col.name}
                                            textValue={col.label || col.name}
                                        >
                                            {col.label || col.name}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>
                        )}
                        {allDetailColumns.length > 0 && (
                            <MultiSelect
                                title="卡片显示字段"
                                label={
                                    <>
                                        <LuSlidersHorizontal size={13} />
                                        <span>显示字段</span>
                                        {visibleCardColumnNames !== null && (
                                            <span className="table-page__kanban-fields-count">
                                                ({visibleCardColumnNames.length}/
                                                {allDetailColumns.length})
                                            </span>
                                        )}
                                    </>
                                }
                                options={allDetailColumns.map((col) => ({
                                    value: col.name,
                                    label: col.label || col.name,
                                }))}
                                selected={
                                    visibleCardColumnNames ?? allDetailColumns.map((col) => col.name)
                                }
                                onChange={(values) => setVisibleCardColumnNames?.(values)}
                                onReset={() => setVisibleCardColumnNames?.(null)}
                                resetLabel="恢复全部显示"
                            />
                        )}
                        <div className="table-page__toolbar-divider" aria-hidden="true" />
                    </>
                )}

                {/* 3. 统一筛选组（紧凑并列展开，不再东一块西一块） */}
                <div className="table-page__filters">
                    {statusFilterColumn && (
                        <MultiSelect
                            title="状态筛选（可多选）"
                            label={summary(selectedStatusFilters, "状态", "状态")}
                            options={choices(statusSelectOptions)}
                            selected={selectedStatusFilters}
                            onChange={changeStatus}
                            onReset={() => changeStatus([])}
                            resetLabel="重置为全部状态"
                        />
                    )}
                    {ownerFilterColumn && (
                        <MultiSelect
                            title="负责人筛选（可多选）"
                            label={summary(selectedOwnerFilters, "负责人", "负责人")}
                            options={choices(ownerSelectOptions)}
                            selected={selectedOwnerFilters}
                            onChange={changeOwner}
                            onReset={() => changeOwner([])}
                            resetLabel="重置为全部负责人"
                        />
                    )}
                    {Object.entries(customFilters).map(([columnId, selected]) => {
                        const col = columns.find((column) => column.id === columnId);
                        if (!col) return null;
                        const label = col.label || col.name;
                        const change = (values: string[]) =>
                            setCustomFilters?.((previous) => ({
                                ...previous,
                                [columnId]: values,
                            }));
                        return (
                            <div key={columnId} className="table-page__filter-chip-wrapper">
                                <MultiSelect
                                    title={`筛选 ${label}`}
                                    label={summary(selected, label, label)}
                                    options={choices(getColumnFilterOptions(col, rows))}
                                    selected={selected}
                                    onChange={change}
                                    onReset={() => change([])}
                                />
                                <Button
                                    variant="ghost"
                                    size="small"
                                    className="table-page__filter-chip-remove"
                                    aria-label={`移除${label}筛选`}
                                    onClick={() =>
                                        setCustomFilters?.((previous) =>
                                            Object.fromEntries(
                                                Object.entries(previous).filter(
                                                    ([id]) => id !== columnId
                                                )
                                            )
                                        )
                                    }
                                >
                                    <LuX size={12} />
                                </Button>
                            </div>
                        );
                    })}
                    {availableFilterColumns.length > 0 && (
                        <ChoicePopover
                            title="添加列筛选"
                            label={
                                <>
                                    <LuPlus size={13} />
                                    <span>筛选</span>
                                </>
                            }
                        >
                            {(close) => (
                                <div className="table-page__filter-popover-options">
                                    {availableFilterColumns.map((col) => (
                                        <Button
                                            key={col.id}
                                            variant="ghost"
                                            size="small"
                                            className="table-page__add-filter-menu-item"
                                            onClick={() => {
                                                setCustomFilters?.((previous) => ({
                                                    ...previous,
                                                    [col.id]: [],
                                                }));
                                                close();
                                            }}
                                        >
                                            <LuFilter size={13} />
                                            <span>{col.label || col.name}</span>
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </ChoicePopover>
                    )}
                    {/* 表格视图下的添加新列按钮 */}
                    {activeViewChoice === "grid" && onAddColumn && (
                        <ChoicePopover
                            title="添加新列"
                            label={
                                <>
                                    <LuPlus size={13} />
                                    <span>列</span>
                                </>
                            }
                        >
                            {(close) => (
                                <div className="table-page__add-column-popover">
                                    <div className="table-page__add-column-popover-title">新列名称</div>
                                    <div className="table-page__add-column-input-row">
                                        <input
                                            type="text"
                                            autoFocus
                                            className="table-page__add-column-input"
                                            placeholder="输入列名称..."
                                            value={newColumnName}
                                            onChange={(e) => setNewColumnName?.(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (!isImeComposingKeyEvent(e) && e.key === "Enter") {
                                                    if (newColumnName.trim()) {
                                                        onAddColumn();
                                                        close();
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="primary"
                                            size="small"
                                            onClick={() => {
                                                if (newColumnName.trim()) {
                                                    onAddColumn();
                                                    close();
                                                }
                                            }}
                                            disabled={!newColumnName.trim()}
                                            title="确认添加"
                                        >
                                            添加
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </ChoicePopover>
                    )}
                </div>
            </div>

            {/* 右侧：等高对齐的行数统计胶囊 */}
            <div className="table-page__toolbar-right">
                <div className="table-page__filter-summary" aria-live="polite">
                    <span>
                        {hasActiveFilters
                            ? `已筛选 ${filteredCount} / ${totalCount} 行`
                            : `共 ${totalCount} 行`}
                    </span>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            className="table-page__filter-clear-all"
                            onClick={() => {
                                setSelectedStatusFilters?.([]);
                                setSelectedOwnerFilters?.([]);
                                setCustomFilters?.({});
                            }}
                            title="清空全部筛选"
                        >
                            清空
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
export default TableViewControls;
