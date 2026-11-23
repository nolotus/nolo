/**
 * 3D 预览的状态面板：加载中 / 加载失败 / 空场景。
 *
 * 刻意不依赖 three —— 文件页在服务端渲染阶段也走这里，失败态必须在
 * **不拉起 WebGL** 的前提下就能显示（否则用户看到的是空白画布）。
 */
import React from "react";
import { LuInfo, LuRotateCw } from "react-icons/lu";
import "./glbViewer.css";

export type GlbStatusKind = "loading" | "error" | "empty";

export interface GlbViewerStatusProps {
  kind: GlbStatusKind;
  /** 主文案。 */
  message?: string;
  /** 补充说明（例如排错建议 / 文件名）。 */
  detail?: string;
  /** 机器可读的错误码：只放在 data 属性与 tooltip 里，不占用户注意力。 */
  code?: string;
  /** 有重试动作时传入；没有就只展示，不假装可重试。 */
  onRetry?: () => void;
  retryLabel?: string;
}

const DEFAULT_MESSAGE: Record<GlbStatusKind, string> = {
  loading: "正在加载 3D 模型…",
  error: "3D 模型加载失败。",
  empty: "模型里没有可显示的网格。",
};

export const GlbViewerStatus: React.FC<GlbViewerStatusProps> = ({
  kind,
  message,
  detail,
  code,
  onRetry,
  retryLabel = "重新加载",
}) => (
  <div
    className={`glb-viewer-status glb-viewer-status--${kind}`}
    data-hook={`glb-viewer-status-${kind}`}
    data-state={kind}
    data-error-code={code}
    title={code ? `错误码：${code}` : undefined}
    role={kind === "error" ? "alert" : "status"}
    aria-live={kind === "error" ? "assertive" : "polite"}
    aria-busy={kind === "loading" || undefined}
  >
    {kind === "loading" ? (
      <span className="glb-viewer-status__spinner" aria-hidden="true" />
    ) : (
      <LuInfo size={36} aria-hidden="true" />
    )}
    <p className="glb-viewer-status__message">{message || DEFAULT_MESSAGE[kind]}</p>
    {detail ? <p className="glb-viewer-status__detail">{detail}</p> : null}
    {onRetry ? (
      <button type="button" className="glb-viewer-status__retry" onClick={onRetry}>
        <LuRotateCw size={14} aria-hidden="true" />
        {retryLabel}
      </button>
    ) : null}
  </div>
);

export default GlbViewerStatus;
