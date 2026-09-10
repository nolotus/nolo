// app/pages/browser-workbench/BrowserFixturePage.tsx
// Browser spike 的 iframe fixture：顶层 dev-only 路由（不套 MainLayout shell）。
// 提供可交互状态（input / 计数按钮 / 长滚动区 / runtime marker），
// 用于人工与 Playwright 验证 iframe runtime 状态在布局切换后是否保留。
import React, { useEffect, useState } from "react";

const PROBE_TOKEN = "browser-fixture-token";

declare global {
  interface Window {
    __noloBrowserProbe?: { token: string; counter: number };
    __loadMarker?: number;
  }
}

export default function BrowserFixturePage() {
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    window.__loadMarker = (window.__loadMarker ?? 0) + 1;
    window.__noloBrowserProbe = { token: PROBE_TOKEN, counter: 42 };
  }, []);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 16,
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 18, margin: "0 0 12px" }}>Browser Fixture</h1>
      <p style={{ margin: "0 0 12px" }}>
        <input
          id="fixture-input"
          placeholder="在这里输入，切换布局后不应丢失"
          style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
        />
      </p>
      <p style={{ margin: "0 0 12px" }}>
        <button id="fixture-button" onClick={() => setClicks((c) => c + 1)}>
          点击计数
        </button>{" "}
        <span id="fixture-counter">{clicks}</span>
      </p>
      {Array.from({ length: 40 }, (_, i) => (
        <p key={i} style={{ margin: "0 0 8px", color: "#666" }}>
          滚动填充行 {i + 1} —— 滚动页面后切换布局，滚动位置应尽量保留。
        </p>
      ))}
    </div>
  );
}
