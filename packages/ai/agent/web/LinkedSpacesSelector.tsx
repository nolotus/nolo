// ai/agent/web/LinkedSpacesSelector.tsx

/**
 * Linked Spaces Selector
 * 
 * 允许用户选择多个 Space 作为 Agent 的关联上下文来源。
 * Agent 可以访问这些 Space 的目录结构作为粗略上下文。
 */

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { LuPlus, LuX, LuFolder } from "react-icons/lu";
import Button from "render/web/ui/Button";
import Combobox from "render/web/ui/Combobox"; // Reuse existing Combobox
import { selectAllMemberSpaces } from "create/space/spaceSlice";

interface LinkedSpacesSelectorProps {
    value: string[];
    onChange: (value: string[]) => void;
}

interface SpaceOption {
    id: string;
    name: string;
}

const styles = `
  .linked-spaces {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .linked-spaces__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .linked-spaces__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--background);
    border: none;
    border-radius: var(--radius-sm);
    transition: all 0.24s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  }

  .linked-spaces__item:hover {
    background: var(--backgroundHover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  .linked-spaces__item-icon {
    color: var(--primary);
    flex-shrink: 0;
    opacity: 0.9;
    display: flex;
    align-items: center;
  }
  
  .linked-spaces__item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .linked-spaces__item-name {
    font-size: var(--fontSize-base);
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .linked-spaces__item-remove {
    width: 28px;
    height: var(--control-sm);
    border: none;
    background: transparent;
    color: var(--textQuaternary);
    cursor: pointer;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  
  .linked-spaces__item-remove:hover {
    background: var(--dangerBackground, rgba(239, 68, 68, 0.1));
    color: var(--danger, #ef4444);
    transform: scale(1.05);
  }

  .linked-spaces__item-remove:active {
    transform: scale(0.95);
  }
  
  .linked-spaces__empty {
    text-align: center;
    padding: 24px;
    color: var(--textTertiary);
    font-size: var(--fontSize-base);
    background: var(--backgroundTertiary, color-mix(in srgb, var(--background) 95%, black 2%));
    border-radius: var(--radius-sm);
    border: none;
    transition: all 0.3s ease;
  }
  
  .linked-spaces__add-section {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 4px;
  }
  
  .linked-spaces__combobox-wrapper {
    flex: 1;
    min-width: 0; 
  }

  /* Dark mode overrides */
  [data-theme="dark"] .linked-spaces__item {
    background: color-mix(in srgb, var(--background) 95%, white 3%);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  [data-theme="dark"] .linked-spaces__item:hover {
    background: color-mix(in srgb, var(--background) 92%, white 5%);
  }

  [data-theme="dark"] .linked-spaces__empty {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const LinkedSpacesSelector: React.FC<LinkedSpacesSelectorProps> = ({
    value = [],
    onChange,
}) => {
    const { t } = useTranslation("ai");
    const [selectedSpace, setSelectedSpace] = useState<SpaceOption | null>(null);

    // Get all spaces
    const memberSpaces = useSelector(selectAllMemberSpaces) as Array<{ spaceId: string; spaceName?: string }>;

    // Convert to SpaceOption
    const availableSpaces: SpaceOption[] = useMemo(() =>
        memberSpaces.map(ms => ({
            id: ms.spaceId,
            name: ms.spaceName || ms.spaceId,
        })).sort((a, b) => a.name.localeCompare(b.name)),
        [memberSpaces]);

    // Filter out already selected spaces
    const unselectedSpaces = useMemo(() =>
        availableSpaces.filter(space => !value.includes(space.id)),
        [availableSpaces, value]);

    const handleAdd = () => {
        if (selectedSpace && !value.includes(selectedSpace.id)) {
            onChange([...value, selectedSpace.id]);
            setSelectedSpace(null);
        }
    };

    const handleRemove = (spaceId: string) => {
        onChange(value.filter((id) => id !== spaceId));
    };

    const getSpaceInfo = (spaceId: string): SpaceOption | undefined => {
        return availableSpaces.find((s) => s.id === spaceId);
    };

    return (
        <>
            <style>{styles}</style>
            <div className="linked-spaces">
                {/* List of selected spaces */}
                {value.length > 0 && (
                    <div className="linked-spaces__list">
                        {value.map((spaceId) => {
                            const space = getSpaceInfo(spaceId);
                            return (
                                <div key={spaceId} className="linked-spaces__item">
                                    <LuFolder size={16} className="linked-spaces__item-icon" aria-hidden="true" />
                                    <div className="linked-spaces__item-info">
                                        <div className="linked-spaces__item-name">
                                            {space?.name || spaceId}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="linked-spaces__item-remove"
                                        onClick={() => handleRemove(spaceId)}
                                        title={t("references.remove", "Remove")}
                                        aria-label={t("references.remove", "Remove")}
                                    >
                                        <LuX size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty State / Add Section */}
                {value.length === 0 && (
                    <div className="linked-spaces__empty">
                        {t("references.noLinkedSpaces", "No linked spaces yet.")}
                    </div>
                )}

                {/* Combobox for adding new spaces */}
                {unselectedSpaces.length > 0 ? (
                    <div className="linked-spaces__add-section">
                        <div className="linked-spaces__combobox-wrapper">
                            <Combobox<SpaceOption>
                                items={unselectedSpaces}
                                selectedItem={selectedSpace}
                                onChange={setSelectedSpace}
                                labelField="name"
                                valueField="id"
                                placeholder={t("references.selectSpacePlaceholder", "Select a space to link...")}
                                searchable
                                size="small"
                                variant="filled"
                                clearable
                            />
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            icon={<LuPlus />}
                            onClick={handleAdd}
                            disabled={!selectedSpace}
                        >
                            {t("references.add", "Add")}
                        </Button>
                    </div>
                ) : availableSpaces.length === 0 ? (
                    <div className="linked-spaces__empty">
                        {t("references.noAvailableSpaces", "No available spaces.")}
                    </div>
                ) : null}
            </div>
        </>
    );
};

export default LinkedSpacesSelector;
