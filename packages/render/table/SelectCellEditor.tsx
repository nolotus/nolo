// 文件: render/table/SelectCellEditor.tsx
//
// select 列单元格的轻量选项弹层（替代 textarea 自由编辑）：
// - fixed 定位锚定单元格 getBoundingClientRect，避免 grid 滚动容器 overflow 裁剪；
// - ↑/↓ + Enter 键盘选择，Esc / 点击外部 / 滚动 / resize 时关闭；
// - 列表底部固定「+ 新建选项」（可选，回写列 meta 由调用方负责）与「清除」项（写入 ""）。
//
// 不复用 render/web/ui/Select：react-aria 的 Popover 依赖 trigger 锚定，
// 这里需要直接锚定到单元格 rect 且无可见 trigger，自绘更轻。

import React, { useCallback, useEffect, useRef, useState } from "react";
import { LuCheck, LuPlus } from "react-icons/lu";
import { computePopupPosition } from "./popupUtils";
import { useActiveItemNavigation, usePopupDismiss } from "./usePopupBehavior";

export type SelectCellEditorAnchor = {
    top: number;
    left: number;
    width: number;
    height: number;
};

export type SelectCellEditorProps = {
    anchor: SelectCellEditorAnchor;
    options: string[];
    currentValue: string;
    /** value 为 "" 表示清除。选中后由调用方负责关闭。 */
    onSelect: (value: string) => void;
    /** 「+ 新建选项」提交回调（值为已 trim 的非空字符串）；新建后由调用方负责关闭。 */
    onCreateOption?: (value: string) => void;
    onClose: () => void;
};

const OPTION_HEIGHT = 32;
const LIST_VERTICAL_PADDING = 8;
const MAX_LIST_HEIGHT = 260;
const MIN_LIST_WIDTH = 160;

const SelectCellEditor: React.FC<SelectCellEditorProps> = ({
    anchor,
    options,
    currentValue,
    onSelect,
    onCreateOption,
    onClose,
}) => {
    const createInputRef = useRef<HTMLInputElement | null>(null);

    // 选项 + 底部固定「+ 新建选项」（传入 onCreateOption 时）+「清除」项，
    // 键盘导航统一在 items 索引空间内进行：options… → 新建选项 → 清除。
    const itemCount = options.length + (onCreateOption ? 2 : 1);
    const createIndex = onCreateOption ? options.length : -1;
    const clearIndex = options.length + (onCreateOption ? 1 : 0);

    // 「+ 新建选项」的内联输入态：false 为按钮态，true 为 input 态。
    const [creating, setCreating] = useState(false);
    const [createValue, setCreateValue] = useState("");

    const selectIndex = useCallback(
        (index: number) => {
            // 「+ 新建选项」项不直接产出值，先切到内联 input 态。
            if (index === createIndex) {
                setCreating(true);
                return;
            }
            onSelect(index === clearIndex ? "" : (options[index] ?? ""));
        },
        [clearIndex, createIndex, onSelect, options]
    );

    const { activeIndex, setActiveIndex, itemId, handleKeyDown, containerRef } =
        useActiveItemNavigation({
            itemCount,
            initialIndex: () => {
                const current = options.indexOf(currentValue);
                return current >= 0 ? current : 0;
            },
            onSelect: selectIndex,
            onClose,
            itemIdInfix: "opt",
        });

    usePopupDismiss(containerRef, onClose, {
        shouldIgnoreEscape: () => creating,
    });

    // 进入新建输入态后聚焦 input（按钮态不抢容器焦点）。
    useEffect(() => {
        if (creating) {
            createInputRef.current?.focus();
        }
    }, [creating]);

    // 视口定位计算。
    const estimatedHeight = Math.min(
        MAX_LIST_HEIGHT,
        itemCount * OPTION_HEIGHT + LIST_VERTICAL_PADDING
    );
    const width = Math.max(anchor.width, MIN_LIST_WIDTH);
    const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
    const viewportHeight =
        typeof window === "undefined" ? 768 : window.innerHeight;
    const { top, left } = computePopupPosition({
        anchor,
        popup: { width, height: estimatedHeight },
        viewport: { width: viewportWidth, height: viewportHeight },
        mode: "below",
    });

    // 新建选项 input：Enter 提交（空值不提交，退回按钮态）、Esc 退回按钮态、Tab 关闭弹层。
    const handleCreateKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {
        // 阻止冒泡到容器 listbox 的键盘导航（Enter 会被当成选中当前项）。
        event.stopPropagation();
        if (event.key === "Enter") {
            event.preventDefault();
            const value = createValue.trim();
            setCreating(false);
            setCreateValue("");
            if (value) {
                onCreateOption?.(value);
            } else {
                // 空值不提交：焦点还给容器，继续键盘导航。
                containerRef.current?.focus();
            }
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            setCreating(false);
            setCreateValue("");
            containerRef.current?.focus();
        }
        if (event.key === "Tab") {
            // 不做焦点循环：Tab 直接关闭弹层，避免浏览器默认焦点跳转到弹层外。
            event.preventDefault();
            onClose();
        }
    };

    return (
        <div
            ref={containerRef}
            role="listbox"
            aria-label="选择选项"
            aria-activedescendant={itemId(activeIndex)}
            tabIndex={-1}
            className="table-page__select-editor"
            style={{ top, left, width, maxHeight: MAX_LIST_HEIGHT }}
            onKeyDown={(event) => {
                if (creating) return;
                handleKeyDown(event);
            }}
        >
            {options.map((option, index) => (
                <button
                    key={option}
                    id={itemId(index)}
                    type="button"
                    role="option"
                    aria-selected={option === currentValue}
                    className={
                        "table-page__select-editor-option" +
                        (index === activeIndex
                            ? " table-page__select-editor-option--active"
                            : "")
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectIndex(index)}
                >
                    <span className="table-page__select-editor-option-text">{option}</span>
                    {option === currentValue && (
                        <LuCheck size={14} aria-hidden="true" />
                    )}
                </button>
            ))}
            {onCreateOption &&
                (creating ? (
                    <div
                        id={itemId(createIndex)}
                        className="table-page__select-editor-create"
                    >
                        <input
                            ref={createInputRef}
                            type="text"
                            className="table-page__select-editor-create-input"
                            placeholder="新选项名称"
                            value={createValue}
                            onChange={(event) => setCreateValue(event.target.value)}
                            onKeyDown={handleCreateKeyDown}
                        />
                    </div>
                ) : (
                    <button
                        id={itemId(createIndex)}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className={
                            "table-page__select-editor-option" +
                            " table-page__select-editor-option--create" +
                            (activeIndex === createIndex
                                ? " table-page__select-editor-option--active"
                                : "")
                        }
                        onMouseEnter={() => setActiveIndex(createIndex)}
                        onClick={() => selectIndex(createIndex)}
                    >
                        <LuPlus size={14} aria-hidden="true" />
                        <span className="table-page__select-editor-option-text">
                            新建选项
                        </span>
                    </button>
                ))}
            <button
                id={itemId(clearIndex)}
                type="button"
                role="option"
                aria-selected={currentValue === ""}
                className={
                    "table-page__select-editor-option" +
                    " table-page__select-editor-option--clear" +
                    (activeIndex === clearIndex
                        ? " table-page__select-editor-option--active"
                        : "")
                }
                onMouseEnter={() => setActiveIndex(clearIndex)}
                onClick={() => selectIndex(clearIndex)}
            >
                <span className="table-page__select-editor-option-text">清除</span>
                {currentValue === "" && <LuCheck size={14} aria-hidden="true" />}
            </button>
        </div>
    );
};

export default SelectCellEditor;
