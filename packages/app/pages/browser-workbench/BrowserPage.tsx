// app/pages/browser-workbench/BrowserPage.tsx
// 浏览器页面：Page owns composition。
// 不污染 MainLayout，只将 BrowserWorkbench 渲染在内容插槽内。
// 顶部为 dev-only 验证工具条：Companion 开关与换边，用于人工验证规格矩阵 F/G/I。
import React from "react";
import { useRightSidebar } from "render/layout/RightSidebarContext";
import {
  setCompanionPlacement,
  useCompanionPlacement,
} from "app/layout/companionPlacementPreference";
import {
  setNavigationPlacement,
  useNavigationPlacement,
} from "app/layout/navigationPlacementPreference";
import BrowserWorkbench from "./BrowserWorkbench";
import "./BrowserWorkbench.css";

const companionProbeContent = (
  <div style={{ padding: 16 }}>
    <h3 style={{ margin: "0 0 8px" }}>Companion 占位</h3>
    <p style={{ margin: 0, color: "#666" }}>
      Browser spike 验证用伴随面板内容。
    </p>
  </div>
);

function DevToolbar() {
  const rightSidebar = useRightSidebar();
  const companionPlacement = useCompanionPlacement();
  const navigationPlacement = useNavigationPlacement();

  return (
    <div className="BrowserPage__devToolbar" data-testid="browser-dev-toolbar">
      <button
        type="button"
        onClick={() =>
          rightSidebar.isOpen
            ? rightSidebar.close()
            : rightSidebar.open(companionProbeContent)
        }
      >
        {rightSidebar.isOpen ? "关闭 Companion" : "打开 Companion"}
      </button>
      <button
        type="button"
        onClick={() =>
          setCompanionPlacement(companionPlacement === "start" ? "end" : "start")
        }
      >
        Companion 换边（当前 {companionPlacement === "start" ? "左" : "右"}）
      </button>
      <button
        type="button"
        onClick={() =>
          setNavigationPlacement(
            navigationPlacement === "start" ? "end" : "start",
          )
        }
      >
        Navigation 换边（当前 {navigationPlacement === "start" ? "左" : "右"}）
      </button>
    </div>
  );
}

export default function BrowserPage() {
  return (
    <div className="BrowserPage" data-testid="browser-page">
      <DevToolbar />
      <BrowserWorkbench />
    </div>
  );
}
