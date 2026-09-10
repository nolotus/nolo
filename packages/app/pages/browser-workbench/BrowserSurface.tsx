import React, { useState, useCallback } from "react";
import "./BrowserSurface.css";

export interface BrowserSurfaceProps {
  /** 初始 URL 或指定目标页面 */
  src?: string;
  /** 浏览器窗口标题 */
  title?: string;
  /** 地址栏变化回调 */
  onUrlChange?: (url: string) => void;
  /** 允许外部 ref 访问 iframe */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export const BrowserSurface: React.FC<BrowserSurfaceProps> = ({
  src = "/dev/browser-fixture",
  title = "Browser Surface",
  onUrlChange,
  iframeRef,
}) => {
  const [currentUrl, setCurrentUrl] = useState(src);
  const [addressInput, setAddressInput] = useState(src);

  const handleAddressSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setCurrentUrl(addressInput);
      onUrlChange?.(addressInput);
    },
    [addressInput, onUrlChange]
  );

  const handleReload = useCallback(() => {
    // 重新触发 src 刷新或通过 ref reload
    if (iframeRef?.current) {
      try {
        iframeRef.current.contentWindow?.location.reload();
      } catch {
        setCurrentUrl((prev) => `${prev.split("#")[0]}#${Date.now()}`);
      }
    } else {
      setCurrentUrl((prev) => `${prev.split("#")[0]}#${Date.now()}`);
    }
  }, [iframeRef]);

  return (
    <div className="BrowserSurface" data-testid="browser-surface">
      <div className="BrowserSurface__toolbar">
        <button
          type="button"
          className="BrowserSurface__nav-btn"
          title="后退"
          aria-label="后退"
          disabled
        >
          ←
        </button>
        <button
          type="button"
          className="BrowserSurface__nav-btn"
          title="前进"
          aria-label="前进"
          disabled
        >
          →
        </button>
        <button
          type="button"
          className="BrowserSurface__nav-btn"
          title="刷新"
          aria-label="刷新"
          onClick={handleReload}
        >
          ↻
        </button>
        <form className="BrowserSurface__address-form" onSubmit={handleAddressSubmit}>
          <input
            type="text"
            className="BrowserSurface__address-bar"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="输入网址..."
            aria-label="地址栏"
          />
        </form>
      </div>
      <div className="BrowserSurface__viewport">
        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="BrowserSurface__iframe"
          title={title}
          data-testid="browser-iframe"
        />
      </div>
    </div>
  );
};

export default BrowserSurface;
