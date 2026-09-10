// app/pages/AppEditorWorkbench.tsx — AppEditor chat mode 的 WorkbenchSplit adapter。
// Hero 全宽在 Workbench 外（由 AppEditorPage 负责）；这里只负责 App Surface
// (primary) ⇆ App Assistant (secondary) 的水平分栏与 global preference 读写。
// 两个槽位常驻，placement 交换只切 grid track，iframe 与 assistant 均不 remount。
import React, { useCallback } from "react";
import WorkbenchSplit from "render/layout/WorkbenchSplit";
import {
  setWorkbenchPlacement,
  setWorkbenchSecondaryFraction,
  useWorkbenchPreference,
} from "app/layout/workbenchLayoutPreference";

/** chat mode App Surface 最小宽度（px）：拖动下限，非照抄 LocalPreview。 */
export const APP_SURFACE_MIN_SIZE = 360;
/** chat mode App Assistant 最小宽度（px）：拖动下限，非照抄 LocalPreview。 */
export const APP_ASSISTANT_MIN_SIZE = 320;

interface AppEditorWorkbenchProps {
  /** 常驻 App Surface（chat mode 时含 toolbar+iframe；code mode 为 null）。 */
  primary: React.ReactNode;
  /** App Assistant 面板；chat mode 固定 open。 */
  secondary: React.ReactNode;
}

const AppEditorWorkbench: React.FC<AppEditorWorkbenchProps> = ({ primary, secondary }) => {
  const preference = useWorkbenchPreference();

  const handleFractionChange = useCallback((fraction: number) => {
    setWorkbenchSecondaryFraction(fraction);
  }, []);

  const handleSwap = useCallback(() => {
    setWorkbenchPlacement(
      preference.placement === "primary-start" ? "primary-end" : "primary-start"
    );
  }, [preference.placement]);

  return (
    <div className="AppEditorPage__workbench">
      <WorkbenchSplit
        primary={<div className="AppEditorPage__workbenchPrimary">{primary}</div>}
        secondary={<div className="AppEditorPage__workbenchSecondary">{secondary}</div>}
        secondaryOpen
        placement={preference.placement}
        secondaryFraction={preference.secondaryFraction}
        primaryMinSize={APP_SURFACE_MIN_SIZE}
        secondaryMinSize={APP_ASSISTANT_MIN_SIZE}
        onSecondaryFractionChange={handleFractionChange}
      />
      <button
        type="button"
        className={`AppEditorPage__workbenchSwap ${
          preference.placement === "primary-end"
            ? "AppEditorPage__workbenchSwap--secondary-start"
            : "AppEditorPage__workbenchSwap--secondary-end"
        }`}
        onClick={handleSwap}
        title="交换预览与助手位置"
        aria-label="交换预览与助手位置"
      >
        ⇄
      </button>
    </div>
  );
};

export default AppEditorWorkbench;
