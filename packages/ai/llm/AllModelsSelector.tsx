// src/components/AllModelsSelector.tsx

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Combobox from "render/web/ui/Combobox";
import { LuImage, LuCheck } from "react-icons/lu";
import { ALL_MODELS, type ModelWithProvider } from "./models";

interface AllModelsSelectorProps {
  value: string | null;
  onChange: (item: ModelWithProvider | null) => void;
  label?: string;
  helperText?: string;
  error?: boolean;
  size?: "small" | "medium" | "large";
  disabled?: boolean;
}

const styles = `
  /* 仅保留列表项内部的内容布局样式 */
  .model-selector__content {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    /* 移除所有 padding 和背景色，由 Combobox 统一管理 */
  }

  .model-selector__details {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .model-selector__name {
    font-size: 0.875rem;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .model-selector__vision-icon {
    color: var(--textSecondary); 
    flex-shrink: 0;
    opacity: 0.6;
  }
  
  /* 当父级 item 被选中或高亮时，调整内部图标颜色 */
  [data-highlighted] .model-selector__vision-icon,
  [data-selected] .model-selector__vision-icon {
    color: var(--primary);
    opacity: 1;
  }

  .model-selector__check-icon {
    color: var(--primary);
    flex-shrink: 0;
    margin-left: auto;
  }
`;

const AllModelsSelector: React.FC<AllModelsSelectorProps> = ({
  value,
  onChange,
  label,
  helperText,
  error = false,
  size = "medium",
  disabled = false,
}) => {
  const { t } = useTranslation("ai");

  /**
   * 同一模型（name）可能同时注册在平台托管（nolo）与直连通道
   * （deepinfra/xai/moonshot）下（如 Claude Sonnet 5 / Grok 4.6 / Kimi K3，
   * 上游同源）。选择器只展示一条，保留首个条目——ALL_MODELS 聚合顺序
   * nolo 在前，因此平台托管优先，避免「Claude 重复」的视觉噪音。
   * 价格页 / 路由等数据层仍使用完整 ALL_MODELS，不受影响。
   */
  const dedupedModels = useMemo(() => {
    const seen = new Set<string>();
    return ALL_MODELS.filter((model) => {
      if (seen.has(model.name)) return false;
      seen.add(model.name);
      return true;
    });
  }, []);

  const selectedItem =
    ALL_MODELS.find((model) => model.name === value) ??
    null;

  return (
    <>
      <style>{styles}</style>

      <Combobox
        items={dedupedModels}
        selectedItem={selectedItem}
        onChange={onChange}
        // 用 displayName 做展示字段，value 仍然使用 name
        labelField="displayName"
        valueField="name"
        placeholder={t("form.selectModel")}
        label={label}
        helperText={helperText}
        error={error}
        size={size}
        disabled={disabled}
        searchable
        clearable
        renderOptionContent={(item, isHighlighted, isSelected) => (
          <div className="model-selector__content">
            <div className="model-selector__details">
              <span className="model-selector__name">
                {item.displayName ?? item.name}
              </span>

              {item.hasVision && (
                <LuImage
                  size={14}
                  className="model-selector__vision-icon"
                  title="Vision Supported"
                  aria-hidden="true"
                />
              )}
            </div>

            {isSelected && (
              <LuCheck size={16} className="model-selector__check-icon" aria-hidden="true" />
            )}
          </div>
        )}
      />
    </>
  );
};

export default AllModelsSelector;
