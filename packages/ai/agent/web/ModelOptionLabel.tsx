// 路径: ai/agent/web/ModelOptionLabel.tsx
// 模型下拉选项的统一展示：名称 +（可选）视觉能力图标。
// 用于平台 / 自定义 API / 订阅等所有模型选择下拉，避免各处重复实现导致漂移。
// 与 AllModelsSelector 的视觉图标语义一致（LuImage = 支持视觉理解）。
import React from "react";
import { LuImage } from "react-icons/lu";

const STYLE_ID = "nolo-model-option-label-style";
const css = `
.model-option-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}
.model-option-label__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.model-option-label__vision {
  flex-shrink: 0;
  color: var(--textSecondary);
  opacity: 0.7;
}
[data-highlighted] .model-option-label__vision,
[data-selected] .model-option-label__vision {
  color: var(--primary);
  opacity: 1;
}
`;

/** 全局只注入一次样式（幂等；SSR / 无 document 环境直接跳过）。 */
function ensureStyle(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

export type ModelOptionLabelProps = {
  label: string;
  hasVision?: boolean;
};

export const ModelOptionLabel: React.FC<ModelOptionLabelProps> = ({
  label,
  hasVision,
}) => {
  ensureStyle();
  return (
    <span className="model-option-label">
      <span className="model-option-label__text">{label}</span>
      {hasVision ? (
        <LuImage
          size={14}
          className="model-option-label__vision"
          title="Vision Supported"
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
};

export default ModelOptionLabel;
