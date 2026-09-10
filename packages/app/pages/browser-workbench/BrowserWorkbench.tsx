// app/pages/browser-workbench/BrowserWorkbench.tsx
// 浏览器工作台的薄 adapter：组合 BrowserSurface (primary) 与 Assistant (secondary)，
// 连接 WorkbenchSplit 与全局分栏偏好 (workbenchLayoutPreference)。
import React, { useCallback } from "react";
import WorkbenchSplit, {
  type WorkbenchActiveSurface,
  type WorkbenchPlacement,
} from "render/layout/WorkbenchSplit";
import {
  setWorkbenchPlacement,
  setWorkbenchSecondaryFraction,
  useWorkbenchPreference,
} from "app/layout/workbenchLayoutPreference";
import BrowserSurface from "./BrowserSurface";
import "./BrowserWorkbench.css";

/** 网页工作面最小宽度（px） */
export const BROWSER_SURFACE_MIN_SIZE = 360;
/** 浏览器助手最小宽度（px） */
export const BROWSER_ASSISTANT_MIN_SIZE = 320;

export interface BrowserWorkbenchProps {
  /** 主工作面（默认渲染 BrowserSurface） */
  primary?: React.ReactNode;
  /** 第二工作面（默认渲染默认浏览器助手） */
  secondary?: React.ReactNode;
  /** 第二工作面是否开启（默认 true） */
  secondaryOpen?: boolean;
  /** 当前选中的 active surface（narrow 模式） */
  activeSurface?: WorkbenchActiveSurface;
  /** active surface 改变回调 */
  onActiveSurfaceChange?: (surface: WorkbenchActiveSurface) => void;
  /** 默认 URL */
  src?: string;
}

const DefaultAssistant: React.FC = () => (
  <div className="BrowserWorkbench__assistant" data-testid="browser-assistant">
    <div className="BrowserWorkbench__assistantHeader">
      <h3>浏览器助手</h3>
    </div>
    <div className="BrowserWorkbench__assistantBody">
      <p>在此与 AI 助手协同操作网页内容与分析。</p>
    </div>
  </div>
);

export const BrowserWorkbench: React.FC<BrowserWorkbenchProps> = ({
  primary,
  secondary,
  secondaryOpen = true,
  activeSurface,
  onActiveSurfaceChange,
  src,
}) => {
  const preference = useWorkbenchPreference();

  const handleFractionChange = useCallback((fraction: number) => {
    setWorkbenchSecondaryFraction(fraction);
  }, []);

  const handleSwap = useCallback(() => {
    setWorkbenchPlacement(
      preference.placement === "primary-end" ? "primary-start" : "primary-end"
    );
  }, [preference.placement]);

  return (
    <div className="BrowserWorkbench">
      <WorkbenchSplit
        primary={
          <div className="BrowserWorkbench__primary">
            {primary ?? <BrowserSurface src={src} />}
          </div>
        }
        secondary={
          <div className="BrowserWorkbench__secondary">
            {secondary ?? <DefaultAssistant />}
          </div>
        }
        secondaryOpen={secondaryOpen}
        placement={preference.placement}
        secondaryFraction={preference.secondaryFraction}
        primaryMinSize={BROWSER_SURFACE_MIN_SIZE}
        secondaryMinSize={BROWSER_ASSISTANT_MIN_SIZE}
        onSecondaryFractionChange={handleFractionChange}
        primaryLabel="网页浏览"
        secondaryLabel="浏览器助手"
        activeSurface={activeSurface}
        onActiveSurfaceChange={onActiveSurfaceChange}
      />
      {secondaryOpen ? (
        <button
          type="button"
          className={`BrowserWorkbench__swap ${
            preference.placement === "primary-end"
              ? "BrowserWorkbench__swap--secondary-start"
              : "BrowserWorkbench__swap--secondary-end"
          }`}
          onClick={handleSwap}
          title="交换网页与助手位置"
          aria-label="交换网页与助手位置"
        >
          ⇄
        </button>
      ) : null}
    </div>
  );
};

export default BrowserWorkbench;
