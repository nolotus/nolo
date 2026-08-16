// packages/chat/web/BrowseContextIndicator.tsx
// 输入框上方的浏览上下文指示器：桌面端浏览器窗口开着时显示当前页面信息。

import { memo, useEffect, useState } from "react";
import { LuGlobe } from "react-icons/lu";

type BrowseContextInfo = {
  url: string;
  title: string;
} | null;

const isDesktopContext = (): boolean => {
  if (typeof window === "undefined" || typeof location === "undefined") return false;
  const host = location.hostname;
  return host === "127.0.0.1" || host === "localhost";
};

const useBrowseContext = (): BrowseContextInfo => {
  const [info, setInfo] = useState<BrowseContextInfo>(null);

  useEffect(() => {
    if (!isDesktopContext()) return;
    let cancelled = false;

    const check = async () => {
      try {
        if (typeof fetch !== "function") return;
        const response = await fetch("/api/desktop/browse-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "" }),
          signal: AbortSignal.timeout(2000),
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          context: { url: string; title: string } | null;
        };
        if (cancelled) return;
        setInfo(payload.context);
      } catch {
        // 静默失败：非桌面或浏览器窗口未开
      }
    };

    void check();
    // 每 3 秒轮询一次，保持指示器与当前页面同步
    const timer = setInterval(check, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return info;
};

export const BrowseContextIndicator = memo(function BrowseContextIndicator() {
  const info = useBrowseContext();
  if (!info || !info.url) return null;

  // 提取域名用于显示
  let host = info.url;
  try {
    host = new URL(info.url).hostname;
  } catch {
    // keep raw
  }

  return (
    <div
      className="browse-context-indicator"
      title={info.url}
      role="status"
      aria-label={`正在浏览：${info.title}`}
    >
      <LuGlobe size={13} className="browse-context-indicator__icon" />
      <span className="browse-context-indicator__host">{host}</span>
      {info.title ? (
        <span className="browse-context-indicator__title">{info.title}</span>
      ) : null}
    </div>
  );
});