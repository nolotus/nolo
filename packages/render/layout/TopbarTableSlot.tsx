// Topbar table title/icon editor. Draft state belongs to one table identity.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch } from "app/store";
import { LuTable } from "react-icons/lu";
import ContentIcon from "render/contentIcon/ContentIcon";
import ContentIconPicker from "render/contentIcon/ContentIconPicker";
import type { ContentIcon as ContentIconValue } from "render/contentIcon/types";
import InlineEditInput from "render/web/ui/InlineEditInput";
import { isImeComposingKeyEvent } from "render/table/keyboardUtils";
import { renameTable, updateTableIcon } from "render/table/tableStore";
import { updateContentTitle } from "create/space/content/contentThunks";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
import type { TableMeta } from "render/table/types";

interface TopbarTableSlotProps {
    tableMeta: TableMeta;
    canEdit?: boolean;
}

const TableSlotEditor: React.FC<TopbarTableSlotProps> = ({ tableMeta, canEdit = true }) => {
    const dispatch = useAppDispatch();
    const currentSpaceId = useCurrentSpaceId();
    const [isRenaming, setIsRenaming] = useState(false);
    const [titleInput, setTitleInput] = useState(tableMeta.displayName || tableMeta.tableId || "");
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const savingTitle = useRef(false);
    const cancelled = useRef(false);

    useEffect(() => {
        if (isRenaming) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isRenaming]);

    const displayName = tableMeta.displayName || tableMeta.tableId || "未命名表格";
    const handleUpdateTitle = useCallback(async () => {
        if (!canEdit || cancelled.current || savingTitle.current) return;
        const trimmed = titleInput.trim();
        if (!trimmed || trimmed === tableMeta.displayName) {
            setIsRenaming(false);
            return;
        }
        savingTitle.current = true;
        setSaveError(null);
        try {
            // Domain commands return a Promise of an unwrap-capable result, not an RTK dispatch promise.
            const result = await dispatch(renameTable({
                tenantId: tableMeta.tenantId,
                tableId: tableMeta.tableId,
                newName: trimmed,
            }));
            await result.unwrap();
            if (currentSpaceId) {
                void dispatch(updateContentTitle({
                    spaceId: currentSpaceId,
                    contentKey: tableMeta.dbKey,
                    title: trimmed,
                }));
            }
            setIsRenaming(false);
        } catch (err) {
            console.error("更新表格标题失败:", err);
            setSaveError("保存表格标题失败，请重试");
        } finally {
            savingTitle.current = false;
        }
    }, [canEdit, currentSpaceId, dispatch, tableMeta, titleInput]);

    const handleUpdateIcon = useCallback(async (icon: ContentIconValue | null) => {
        if (!canEdit) return;
        setSaveError(null);
        try {
            const result = await dispatch(updateTableIcon({
                tenantId: tableMeta.tenantId,
                tableId: tableMeta.tableId,
                icon,
            }));
            await result.unwrap();
        } catch (err) {
            console.error("更新表格图标失败:", err);
            setSaveError("保存表格图标失败，请重试");
        }
    }, [canEdit, dispatch, tableMeta.tenantId, tableMeta.tableId]);

    const startRenaming = () => {
        if (!canEdit) return;
        cancelled.current = false;
        setSaveError(null);
        setTitleInput(tableMeta.displayName || tableMeta.tableId || "");
        setIsRenaming(true);
    };

    return (
        <div className="topbar__table-slot" aria-label={`表格: ${displayName}`}>
            <div className="topbar__table-icon-anchor">
                <button type="button" className="content-icon-button topbar__table-icon-btn"
                    onClick={() => canEdit && setIsIconPickerOpen(!isIconPickerOpen)}
                    disabled={!canEdit} title={canEdit ? "更换图标" : undefined} aria-label="更换表格图标">
                    <ContentIcon icon={tableMeta.icon} fallback={LuTable} size={18} />
                </button>
                {isIconPickerOpen && canEdit && (
                    <ContentIconPicker open={isIconPickerOpen} onSelect={(icon) => {
                        void handleUpdateIcon(icon);
                        setIsIconPickerOpen(false);
                    }} onClose={() => setIsIconPickerOpen(false)} />
                )}
            </div>
            {isRenaming && canEdit ? (
                <InlineEditInput inputRef={inputRef} className="topbar__table-title-input"
                    value={titleInput} onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={handleUpdateTitle} onKeyDown={(e) => {
                        if (isImeComposingKeyEvent(e)) return;
                        if (e.key === "Enter") {
                            e.preventDefault();
                            void handleUpdateTitle();
                        } else if (e.key === "Escape") {
                            cancelled.current = true;
                            setIsRenaming(false);
                        }
                    }} />
            ) : (
                <button type="button" className="topbar__table-title-text"
                    onClick={startRenaming} onDoubleClick={startRenaming}
                    title={canEdit ? "点击或双击重命名表格" : undefined}>
                    {displayName}
                </button>
            )}
            {saveError && <span role="alert">{saveError}</span>}
        </div>
    );
};

// Reset drafts synchronously on table changes, rather than carrying them into the next table.
export const TopbarTableSlot: React.FC<TopbarTableSlotProps> = (props) => (
    <TableSlotEditor key={`${props.tableMeta.tenantId}:${props.tableMeta.tableId}`} {...props} />
);
export default TopbarTableSlot;
