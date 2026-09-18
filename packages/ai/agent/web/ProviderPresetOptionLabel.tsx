// 路径: ai/agent/web/ProviderPresetOptionLabel.tsx
// Provider 模板下拉选项的统一展示：品牌 logo + 文本。
// Logo 解析复用 agent 头像的 modelAvatar 机制（provider key → @lobehub/icons），
// 解析不到时优雅退化为纯文本（不留空位、不抛错），因此新增 preset 无需改组件。
import React from "react";
import { useAgentModelAvatarComponent } from "./useAgentModelAvatarComponent";

const STYLE_ID = "nolo-provider-preset-option-label-style";
const css = `
.provider-preset-option-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.provider-preset-option-label__logo {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}
.provider-preset-option-label__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

export type ProviderPresetOptionLabelProps = {
  label: string;
  /**
   * Registry provider key（如 openai / deepseek / moonshot）。缺失或无法
   * 解析出品牌图标时只渲染文本。
   */
  provider?: string | null;
  /** Logo 直径（px）。 */
  logoSize?: number;
};

export const ProviderPresetOptionLabel: React.FC<
  ProviderPresetOptionLabelProps
> = ({ label, provider, logoSize = 16 }) => {
  ensureStyle();
  // 注意：hook 必须在任何条件 return 之前调用；provider 为空时解析返回 null。
  const Logo = useAgentModelAvatarComponent({
    provider: provider ?? undefined,
  });

  return (
    <span className="provider-preset-option-label">
      {Logo ? (
        <span className="provider-preset-option-label__logo" aria-hidden="true">
          <Logo size={logoSize} />
        </span>
      ) : null}
      <span className="provider-preset-option-label__text">{label}</span>
    </span>
  );
};

export default ProviderPresetOptionLabel;
