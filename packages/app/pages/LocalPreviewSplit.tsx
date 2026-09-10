// app/pages/LocalPreviewSplit.tsx — WorkbenchSplit 的对话页 adapter。
// 只负责准备 Chat / LocalPreviewPanel 两个 surface 和偏好读写，布局交给
// WorkbenchSplit；预览开关切换的是 secondaryOpen，不是 React 树结构。
import React, { Suspense, lazy, useCallback } from "react";

import {
  setWorkbenchPlacement,
  setWorkbenchSecondaryFraction,
  useWorkbenchPreference,
} from "app/layout/workbenchLayoutPreference";
import { useLocalPreviewOpen } from "app/appInspector/appInspectorStore";
import "./LocalPreviewSplit.css";

const LocalPreviewPanel = lazy(() => import("./LocalPreviewPanel"));
const WorkbenchSplit = lazy(() => import("render/layout/WorkbenchSplit"));

const CHAT_MIN_SIZE = 360;
const PREVIEW_MIN_SIZE = 320;

/**
 * 打开本地预览时，预览与对话分栏共享水平空间。
 *
 * WorkbenchSplit 的两个槽位常驻，placement 交换只切 grid track，不改变
 * Dialog child 的 React 位置，对话不会 remount——滚动位置和输入框草稿都保留。
 */
export default function LocalPreviewSplit({ children }: { children: React.ReactNode }) {
  const previewOpen = useLocalPreviewOpen();
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
    <div
      className={`LocalPreviewSplit${previewOpen ? " LocalPreviewSplit--open LocalPreviewSplit--chat-narrow" : ""}`}
    >
      <WorkbenchSplit
        primary={<div className="LocalPreviewSplit__dialog">{children}</div>}
        secondary={
          <div className="LocalPreviewSplit__preview">
            {previewOpen ? (
              <Suspense fallback={null}>
                <LocalPreviewPanel />
              </Suspense>
            ) : null}
          </div>
        }
        secondaryOpen={previewOpen}
        placement={preference.placement}
        secondaryFraction={preference.secondaryFraction}
        primaryMinSize={CHAT_MIN_SIZE}
        secondaryMinSize={PREVIEW_MIN_SIZE}
        onSecondaryFractionChange={handleFractionChange}
      />
      <button
        type="button"
        className="LocalPreviewSplit__swap"
        onClick={handleSwap}
        title="交换预览与对话位置"
        aria-label="交换预览与对话位置"
      >
        ⇄
      </button>
    </div>
  );
}