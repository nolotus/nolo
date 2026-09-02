// render/web/ui/ModeToggle.tsx
import * as stylex from "@stylexjs/stylex";
import type React from "react";
import { LuEye, LuPencil } from "react-icons/lu";

import { modeToggleStyles } from "./modeToggle.styles";

interface ModeToggleProps {
  isEdit: boolean;
  onChange: (isEdit: boolean) => void;
  disabled?: boolean;
}

const ModeToggle: React.FC<ModeToggleProps> = ({
  isEdit,
  onChange,
  disabled = false,
}) => {
  const iconClass = stylex.props(modeToggleStyles.icon).className;

  return (
    <div
      {...stylex.props(
        modeToggleStyles.toggle,
        disabled && modeToggleStyles.disabled,
      )}
      role="group"
      aria-label="模式切换"
    >
      {/* 滑块背景轨道（语义类名保留给 theme-ui.css 的 dark 覆盖） */}
      <div
        className={`mode-toggle__slider ${stylex.props(modeToggleStyles.slider, isEdit && modeToggleStyles.sliderEdit).className ?? ""}`}
      />

      {/* 阅读模式按钮 */}
      <button
        {...stylex.props(
          modeToggleStyles.button,
          !isEdit && modeToggleStyles.buttonActive,
          !isEdit && !disabled && modeToggleStyles.buttonHover,
        )}
        onClick={() => onChange(false)}
        disabled={disabled}
        type="button"
        aria-label="阅读模式"
        title="阅读模式"
      >
        <LuEye className={iconClass} aria-hidden="true" />
      </button>

      {/* 编辑模式按钮 */}
      <button
        {...stylex.props(
          modeToggleStyles.button,
          isEdit && modeToggleStyles.buttonActive,
          isEdit && !disabled && modeToggleStyles.buttonHover,
        )}
        onClick={() => onChange(true)}
        disabled={disabled}
        type="button"
        aria-label="编辑模式"
        title="编辑模式"
      >
        <LuPencil className={iconClass} aria-hidden="true" />
      </button>
    </div>
  );
};

export default ModeToggle;
