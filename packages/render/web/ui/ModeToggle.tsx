import "../ui.css";
import type React from "react";
import { LuEye, LuPencil } from "react-icons/lu";

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
  return (
    <>
      <div
        className={`mode-toggle ${disabled ? "mode-toggle--disabled" : ""}`}
        role="group"
        aria-label="模式切换"
      >
        {/* 滑块背景轨道 */}
        <div
          className={`mode-toggle__slider ${isEdit ? "mode-toggle__slider--edit" : ""}`}
        />

        {/* 阅读模式按钮 */}
        <button
          className={`mode-toggle__button ${!isEdit ? "mode-toggle__button--active" : ""}`}
          onClick={() => onChange(false)}
          disabled={disabled}
          type="button"
          aria-label="阅读模式"
          title="阅读模式"
        >
          <LuEye className="mode-toggle__icon" aria-hidden="true" />
        </button>

        {/* 编辑模式按钮 */}
        <button
          className={`mode-toggle__button ${isEdit ? "mode-toggle__button--active" : ""}`}
          onClick={() => onChange(true)}
          disabled={disabled}
          type="button"
          aria-label="编辑模式"
          title="编辑模式"
        >
          <LuPencil className="mode-toggle__icon" aria-hidden="true" />
        </button>
      </div>
    </>
  );
};

export default ModeToggle;
