// 文件: render/table/RowContextMenu.tsx
//
// 表格行右键菜单：fixed 定位在鼠标坐标（防视口右/下溢出），
// 定位与关闭模式与 SelectCellEditor 同款：
// Esc / 外部 mousedown（capture）/ 外部滚动（capture，忽略自身）/ resize 关闭。
// role="menu"，↑/↓ + Enter 键盘选择；菜单项选中后由调用方负责关闭。

import React, { useMemo } from "react";
import type { IconType } from "react-icons";
import { LuArrowDown, LuArrowUp, LuTrash2 } from "react-icons/lu";
import { computePopupPosition } from "./popupUtils";
import { useActiveItemNavigation, usePopupDismiss } from "./usePopupBehavior";

export type RowContextMenuProps = {
    /** 鼠标坐标（clientX/clientY），菜单左上角锚点 */
    x: number;
    y: number;
    onInsertAbove: () => void;
    onInsertBelow: () => void;
    onDelete: () => void;
    onClose: () => void;
};

type ContextMenuItem = {
    key: string;
    label: string;
    icon: IconType;
    danger?: boolean;
    action: () => void;
};

const MENU_WIDTH = 180;
const ITEM_HEIGHT = 28;
const SEPARATOR_HEIGHT = 9;
const MENU_VERTICAL_PADDING = 8;

const RowContextMenu: React.FC<RowContextMenuProps> = ({
    x,
    y,
    onInsertAbove,
    onInsertBelow,
    onDelete,
    onClose,
}) => {
    const items: ContextMenuItem[] = useMemo(
        () => [
            {
                key: "insertAbove",
                label: "在上方插入一行",
                icon: LuArrowUp,
                action: onInsertAbove,
            },
            {
                key: "insertBelow",
                label: "在下方插入一行",
                icon: LuArrowDown,
                action: onInsertBelow,
            },
            {
                key: "delete",
                label: "删除行",
                icon: LuTrash2,
                danger: true,
                action: onDelete,
            },
        ],
        [onDelete, onInsertAbove, onInsertBelow]
    );

    const { activeIndex, setActiveIndex, itemId, handleKeyDown, containerRef } =
        useActiveItemNavigation({
            itemCount: items.length,
            initialIndex: 0,
            onSelect: (index) => items[index]?.action(),
            onClose,
            enableSpace: true,
            itemIdInfix: "item",
        });

    usePopupDismiss(containerRef, onClose);

    const estimatedMenuHeight =
        items.length * ITEM_HEIGHT + SEPARATOR_HEIGHT + MENU_VERTICAL_PADDING;
    const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
    const viewportHeight =
        typeof window === "undefined" ? 768 : window.innerHeight;
    const { top, left } = computePopupPosition({
        anchor: { top: y, left: x, width: 0, height: 0 },
        popup: { width: MENU_WIDTH, height: estimatedMenuHeight },
        viewport: { width: viewportWidth, height: viewportHeight },
        mode: "point",
    });

    return (
        <div
            ref={containerRef}
            role="menu"
            aria-label="行操作"
            aria-activedescendant={itemId(activeIndex)}
            tabIndex={-1}
            className="table-page__row-context-menu"
            style={{ top, left }}
            onKeyDown={handleKeyDown}
        >
            {items.map((item, index) => {
                const Icon = item.icon;
                return (
                    <React.Fragment key={item.key}>
                        {item.danger && (
                            <div
                                role="separator"
                                className="table-page__row-context-menu-separator"
                            />
                        )}
                        <button
                            id={itemId(index)}
                            type="button"
                            role="menuitem"
                            className={
                                "table-page__row-context-menu-item" +
                                (item.danger
                                    ? " table-page__row-context-menu-item--danger"
                                    : "") +
                                (index === activeIndex
                                    ? " table-page__row-context-menu-item--active"
                                    : "")
                            }
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => item.action()}
                        >
                            <Icon size={14} aria-hidden="true" />
                            <span>{item.label}</span>
                        </button>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default RowContextMenu;
