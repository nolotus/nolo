// packages/render/table/TableViewControls.tsx
// 状态/负责人筛选与表格/看板视图切换组件。

import React from "react";
import { Select, SelectItem } from "render/web/ui/Select";
import { LuLayoutDashboard, LuTable } from "react-icons/lu";
import type { TableViewChoice } from "./useKanbanBoard";

export interface TableViewControlsProps {
    statusFilterColumn: any;
    selectedStatusFilter: string;
    setSelectedStatusFilter: (val: string) => void;
    statusSelectOptions: string[];
    ownerFilterColumn: any;
    selectedOwnerFilter: string;
    setSelectedOwnerFilter: (val: string) => void;
    ownerSelectOptions: string[];
    activeViewChoice: TableViewChoice;
    setSelectedViewChoice: (choice: TableViewChoice) => void;
    canUseKanbanView: boolean;
    filteredCount: number;
    totalCount: number;
}

export const TableViewControls: React.FC<TableViewControlsProps> = ({
    statusFilterColumn,
    selectedStatusFilter,
    setSelectedStatusFilter,
    statusSelectOptions,
    ownerFilterColumn,
    selectedOwnerFilter,
    setSelectedOwnerFilter,
    ownerSelectOptions,
    activeViewChoice,
    setSelectedViewChoice,
    canUseKanbanView,
    filteredCount,
    totalCount,
}) => {
    return (
        <div className="table-page__view-controls" aria-label="表格筛选与视图">
            <div className="table-page__filters">
                {statusFilterColumn && (
                    <label className="table-page__filter">
                        <span>状态</span>
                        <Select
                            selectedKey={selectedStatusFilter}
                            onSelectionChange={(key) =>
                                setSelectedStatusFilter(String(key ?? ""))
                            }
                        >
                            <SelectItem id="" textValue="全部状态">
                                全部状态
                            </SelectItem>
                            {statusSelectOptions.map((option) => (
                                <SelectItem key={option} id={option} textValue={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </Select>
                    </label>
                )}
                {ownerFilterColumn && (
                    <label className="table-page__filter">
                        <span>负责人</span>
                        <Select
                            selectedKey={selectedOwnerFilter}
                            onSelectionChange={(key) =>
                                setSelectedOwnerFilter(String(key ?? ""))
                            }
                        >
                            <SelectItem id="" textValue="全部负责人">
                                全部负责人
                            </SelectItem>
                            {ownerSelectOptions.map((option) => (
                                <SelectItem key={option} id={option} textValue={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </Select>
                    </label>
                )}
            </div>

            <div className="table-page__filter-summary" aria-live="polite">
                显示 {filteredCount} / {totalCount} 行
            </div>

            <div className="table-page__view-switch" role="group" aria-label="视图切换">
                <button
                    type="button"
                    className={
                        "table-page__view-switch-btn" +
                        (activeViewChoice === "grid" ? " table-page__view-switch-btn--active" : "")
                    }
                    onClick={() => setSelectedViewChoice("grid")}
                    aria-pressed={activeViewChoice === "grid"}
                >
                    <LuTable size={15} aria-hidden="true" />
                    <span>表格</span>
                </button>
                <button
                    type="button"
                    className={
                        "table-page__view-switch-btn" +
                        (activeViewChoice === "kanban" ? " table-page__view-switch-btn--active" : "")
                    }
                    onClick={() => setSelectedViewChoice("kanban")}
                    disabled={!canUseKanbanView}
                    aria-pressed={activeViewChoice === "kanban"}
                >
                    <LuLayoutDashboard size={15} aria-hidden="true" />
                    <span>看板</span>
                </button>
            </div>
        </div>
    );
};
