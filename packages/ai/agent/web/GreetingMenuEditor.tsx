// 路径: ai/agent/web/GreetingMenuEditor.tsx

import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { Input } from "render/web/form/Input";
import * as stylex from "@stylexjs/stylex";
import { greetingMenuStyles as styles } from "./greetingMenuStyles";

export type GreetingMenuItem = {
    id: string;
    label: string;
    userMessage?: string;
};

interface GreetingMenuEditorProps {
    items: GreetingMenuItem[];
    onChange: (next: GreetingMenuItem[]) => void;
}

/**
 * Greeting 菜单编辑器
 * - items: 当前菜单项数组
 * - onChange: 更新菜单项数组
 */
const GreetingMenuEditor: React.FC<GreetingMenuEditorProps> = ({
    items,
    onChange,
}) => {
    const { t } = useTranslation("ai");

    const handleAdd = useCallback(() => {
        const id = nanoid();
        const next: GreetingMenuItem[] = [
            ...items,
            {
                id,
                label: "",
                userMessage: "",
            },
        ];
        onChange(next);
    }, [items, onChange]);

    const handleRemove = useCallback(
        (id: string) => {
            const next = items.filter((item) => item.id !== id);
            onChange(next);
        },
        [items, onChange]
    );

    const handleChangeItem = useCallback(
        (id: string, patch: Partial<GreetingMenuItem>) => {
            const next = items.map((item) =>
                item.id === id ? { ...item, ...patch } : item
            );
            onChange(next);
        },
        [items, onChange]
    );

    return (
        <div {...stylex.props(styles.menu)}>

            <div {...stylex.props(styles.header)}>
                <div {...stylex.props(styles.title)}>
                    {t("form.greetingMenuTitle", "问候菜单（可选）")}
                </div>
                <div {...stylex.props(styles.desc)}>
                    {t(
                        "form.greetingMenuDesc",
                        "你可以为这个 Agent 配置若干快捷入口，用户在进入对话时会看到这些按钮。"
                    )}
                </div>
            </div>

            {items.length > 0 && (
                <div {...stylex.props(styles.list)}>
                    {items.map((item) => (
                        <div key={item.id} {...stylex.props(styles.item)}>
                            <div {...stylex.props(styles.row)}>
                                <div {...stylex.props(styles.col)}>
                                    <span {...stylex.props(styles.fieldLabel)}>
                                        {t("form.greetingMenuItemLabel", "按钮文案")}
                                    </span>
                                    <Input
                                        size="sm"
                                        value={item.label}
                                        onChange={(e) =>
                                            handleChangeItem(item.id, { label: e.target.value })
                                        }
                                        placeholder={t(
                                            "form.greetingMenuItemLabelPlaceholder",
                                            "例如：生成一份周报"
                                        )}
                                    />
                                </div>

                                <div {...stylex.props(styles.col)}>
                                    <span {...stylex.props(styles.fieldLabel)}>
                                        {t("form.greetingMenuItemUserMessage", "等价用户请求")}
                                        <span {...stylex.props(styles.optional)}>
                                            {t("form.optional", "（可选）")}
                                        </span>
                                    </span>
                                    <Input
                                        size="sm"

                                        value={item.userMessage ?? ""}
                                        onChange={(e) =>
                                            handleChangeItem(item.id, {
                                                userMessage: e.target.value,
                                            })
                                        }
                                        placeholder={t(
                                            "form.greetingMenuItemUserMessagePlaceholder",
                                            "例如：请帮我生成一份本周的工作周报，总结进展和下周计划"
                                        )}
                                    />
                                </div>

                                <button
                                    type="button"
                                    {...stylex.props(styles.remove)}
                                    onClick={() => handleRemove(item.id)}
                                    aria-label={t("form.greetingMenuRemove", "删除菜单项")}
                                >
                                    <LuTrash2 size={16} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button
                type="button"
                {...stylex.props(styles.add)}
                onClick={handleAdd}
            >
                <LuPlus size={16} aria-hidden="true" />
                <span>
                    {items.length === 0
                        ? t("form.greetingMenuAddFirst", "添加一个菜单项")
                        : t("form.greetingMenuAddMore", "再添加一个菜单项")}
                </span>
            </button>
        </div>
    );
};


export default GreetingMenuEditor;
