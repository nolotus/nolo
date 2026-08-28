import React, { useEffect, useRef } from "react";
import { useSlate } from "slate-react";
import { Range } from "slate";
import { ReactEditor } from "slate-react";
import { createPortal } from "react-dom";
import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    size,
} from "@floating-ui/react";
import { useAppSelector } from "app/store";
import { selectTheme } from "app/settings/settingSlice";
import { LuFile, LuBot, LuWrench, LuLayoutGrid } from "react-icons/lu"; // Changed LuLayout to LuLayoutGrid
import { Portal } from "./components";

export interface MentionOption {
    id: string; // resourceId
    label: string;
    type: "tool" | "page" | "agent" | "space";
    description?: string;
}

interface MentionListProps {
    target: Range | null;
    options: MentionOption[];
    selectedIndex: number;
    onSelect: (option: MentionOption) => void;
    category: "all" | "page" | "agent" | "tool" | "space";
    onCategoryChange: (category: "all" | "page" | "agent" | "tool" | "space") => void;
}

export const MentionList: React.FC<MentionListProps> = ({
    target,
    options,
    selectedIndex,
    onSelect,
    category,
    onCategoryChange,
}) => {
    const theme = useAppSelector(selectTheme);
    const editor = useSlate();
    const listRef = useRef<HTMLDivElement>(null);

    const { x, y, strategy, refs, update } = useFloating({
        placement: "bottom-start",
        whileElementsMounted: autoUpdate,
        middleware: [
            offset(5),
            flip(),
            shift({ padding: 5 }),
            size({
                apply({ availableHeight, elements }) {
                    Object.assign(elements.floating.style, {
                        maxHeight: `${Math.min(availableHeight, 300)}px`,
                    });
                },
            }),
        ],
    });

    useEffect(() => {
        if (target) {
            const domRange = ReactEditor.toDOMRange(editor as ReactEditor, target);
            const rect = domRange.getBoundingClientRect();
            refs.setReference({
                getBoundingClientRect: () => rect,
            });
            update(); // Force update
        }
    }, [target, editor, refs, update]);

    // Scroll verify
    useEffect(() => {
        if (listRef.current) {
            const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedEl && selectedEl.scrollIntoView) {
                selectedEl.scrollIntoView({ block: "nearest" });
            }
        }
    }, [selectedIndex]);

    if (!target) {
        return null;
    }

    const renderIcon = (type: string) => {
        switch (type) {
            case "page":
                return <LuFile size={14} aria-hidden="true" />;
            case "space":
                return <LuLayoutGrid size={14} aria-hidden="true" />;
            case "agent":
                return <LuBot size={14} aria-hidden="true" />;
            case "tool":
                return <LuWrench size={14} aria-hidden="true" />;
            default:
                return <LuFile size={14} aria-hidden="true" />;
        }
    };

    const categories = [
        { id: "all", label: "All" },
        { id: "space", label: "Spaces" },
        { id: "page", label: "Pages" },
        { id: "agent", label: "Agents" },
        { id: "tool", label: "Tools" },
    ];

    return createPortal(
        <div
            ref={refs.setFloating}
            style={{
                position: strategy,
                top: y ?? 0,
                left: x ?? 0,
                zIndex: 10000,
                backgroundColor: theme.backgroundSecondary,
                borderRadius: "var(--radius-md)",
                boxShadow: `0 4px 12px ${theme.shadowMedium}`,
                display: "flex",
                flexDirection: "column",
                width: "280px",
                border: `1px solid ${theme.border}`,
                overflow: "hidden",
            }}
            data-test-id="mention-list"
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
        >
            {/* Category Tabs */}
            <div style={{
                display: "flex",
                borderBottom: `1px solid ${theme.border}`,
                backgroundColor: theme.backgroundTertiary,
                padding: "4px 4px 0 4px",
                gap: "4px"
            }}>
                {categories.map(cat => (
                    <button
                        type="button"
                        key={cat.id}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCategoryChange && onCategoryChange(cat.id as any);
                        }}
                        aria-pressed={category === cat.id}
                        style={{
                            margin: 0,
                            padding: "6px 12px",
                            fontSize: "var(--fontSize-sm)",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            borderTopLeftRadius: "var(--radius-md)",
                            borderTopRightRadius: "var(--radius-md)",
                            backgroundColor: category === cat.id ? theme.backgroundSecondary : "transparent",
                            color: category === cat.id ? theme.text : theme.textSecondary,
                            fontWeight: category === cat.id ? 600 : 400,
                            border: "none",
                            borderBottom: category === cat.id ? `2px solid ${theme.primary}` : "2px solid transparent",
                            transition: "all 0.1s ease",
                            appearance: "none",
                        }}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            <div
                ref={listRef}
                style={{
                    overflowY: "auto",
                    maxHeight: "260px",
                    padding: "4px"
                }}
            >
                {options.length === 0 ? (
                    <div style={{ padding: "12px", color: theme.textTertiary, fontSize: "var(--fontSize-sm)", textAlign: "center" }}>
                        No results found
                    </div>
                ) : (
                    options.map((option, index) => (
                        <button
                            type="button"
                            key={`${option.type}-${option.id}`}
                            onClick={() => onSelect(option)}
                            style={{
                                width: "100%",
                                margin: 0,
                                padding: "8px 12px",
                                cursor: "pointer",
                                borderRadius: "var(--radius-md)",
                                border: "none",
                                backgroundColor:
                                    index === selectedIndex ? theme.backgroundTertiary : "transparent",
                                color: index === selectedIndex ? theme.text : theme.textSecondary,
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                transition: "background-color 0.1s ease",
                                font: "inherit",
                                textAlign: "left",
                                appearance: "none",
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center", color: theme.textTertiary }}>
                                {renderIcon(option.type)}
                            </span>
                            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
                                <span style={{ fontSize: "var(--fontSize-base)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{option.label}</span>
                                {option.description && (
                                    <span style={{ fontSize: "var(--fontSize-sm)", color: theme.textTertiary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {option.description}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>,
        document.body
    );
};
