import React, { useEffect, useRef, useState } from "react";
import { LuTriangleAlert, LuImageOff } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import {
  PREVIEW_DESIGN_HEIGHT,
  PREVIEW_DESIGN_WIDTH,
  computePreviewScale,
  resolvePreviewState,
} from "./appPreview";
import "./AppPreviewFrame.css";

/**
 * 缩略图预览的 sandbox 策略。
 *
 * 这里刻意 **不** 给 allow-same-origin：应用可能与平台同源（同一台 server 同时
 * 托管控制台与 /apps/<id>/ 运行时），allow-scripts + allow-same-origin 等价于
 * 「帧内脚本可以摘掉自己的 sandbox 属性」，等于没有 sandbox。代价是帧内页面
 * 处于不透明源（opaque origin）：拿不到本站 cookie / localStorage，模块化
 * 脚本与 fetch 还要过 CORS——真机上部分应用会因此渲染不出来，此时卡片会显示
 * 显式的失败态，而不是假装有预览。
 *
 * 允许的只有脚本执行：不放开表单提交、不放开顶层跳转、不放开弹窗，避免缩略图
 * 在用户还没点开时就产生写操作或把整个页面导航走。
 */
export const APP_PREVIEW_SANDBOX = "allow-scripts";

/** 没有 load 事件时，多久算「加载失败」而不是「还在加载」。 */
const DEFAULT_PREVIEW_TIMEOUT_MS = 12000;

interface AppPreviewFrameProps {
  /** 真实运行时地址（resolvePreferredAppRuntimeUrl 的结果）；空串表示没有可预览地址。 */
  url?: string;
  /** iframe 的可访问名。 */
  title: string;
  timeoutMs?: number;
}

/**
 * 真实应用预览（缩略图）。
 *
 * 契约：
 *  - 不抢焦点、不接管点击：iframe pointer-events: none + tabIndex -1 + aria-hidden，
 *    点击落在卡片上（整张作品可打开）。
 *  - 不提前执行业务副作用：只有卡片接近视口（IntersectionObserver）才挂 iframe。
 *  - 诚实处理失败：没有地址 / 超时未收到 load 事件，都显示显式的失败或不可用态；
 *    load 事件只当作「文档取回」，不当作「内容渲染正确」的证据。
 */
const AppPreviewFrame: React.FC<AppPreviewFrameProps> = ({
  url,
  title,
  timeoutMs = DEFAULT_PREVIEW_TIMEOUT_MS,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activated, setActivated] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [scale, setScale] = useState(0);
  const [offset, setOffset] = useState(0);

  const hasUrl = typeof url === "string" && url.trim().length > 0;

  // 1) 懒加载：接近视口才挂真实 iframe，避免一进页面就把所有应用跑起来。
  useEffect(() => {
    if (!hasUrl || activated) return;
    const node = containerRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setActivated(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActivated(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasUrl, activated]);

  // 2) 换地址时重置加载状态，避免把上一个应用的 load 事件算到新地址上。
  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
  }, [url]);

  // 3) 超时即失败：没有 load 事件不是「加载中」，而是明确的失败态。
  useEffect(() => {
    if (!activated || loaded || timedOut) return;
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [activated, loaded, timedOut, timeoutMs]);

  // 4) 量出卡片盒子，按比例把「桌面宽度的真实应用」缩放进卡片。
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      const nextScale = computePreviewScale({
        containerWidth: rect.width,
        containerHeight: rect.height,
      });
      setScale(nextScale);
      // 缩放后按设计宽度居中：左右留白对称，不裁切、不露半张画布。
      setOffset(
        Math.max(0, (rect.width - PREVIEW_DESIGN_WIDTH * nextScale) / 2),
      );
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const state = resolvePreviewState({ hasUrl, activated, loaded, timedOut });
  const canRenderFrame = activated && hasUrl && scale > 0;

  return (
    <div className="AppPreviewFrame" ref={containerRef} data-state={state}>
      {state === "unavailable" ? (
        <div className="AppPreviewFrame__notice">
          <LuImageOff size={18} aria-hidden="true" />
          <span className="AppPreviewFrame__notice-text">
            {t("appPreview_unavailable", "暂无预览")}
          </span>
        </div>
      ) : null}

      {state === "idle" || state === "loading" ? (
        <div className="AppPreviewFrame__skeleton" aria-hidden="true" />
      ) : null}

      {state === "failed" ? (
        <div className="AppPreviewFrame__notice AppPreviewFrame__notice--error">
          <LuTriangleAlert size={18} aria-hidden="true" />
          <span className="AppPreviewFrame__notice-text">
            {t("appPreview_failed", "预览加载失败")}
          </span>
        </div>
      ) : null}

      {canRenderFrame ? (
        <iframe
          className="AppPreviewFrame__frame"
          title={title}
          src={url}
          sandbox={APP_PREVIEW_SANDBOX}
          referrerPolicy="no-referrer"
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          onLoad={() => setLoaded(true)}
          style={{
            width: `${PREVIEW_DESIGN_WIDTH}px`,
            height: `${PREVIEW_DESIGN_HEIGHT}px`,
            transform: `translateX(${offset}px) scale(${scale})`,
          }}
        />
      ) : null}
    </div>
  );
};

export default AppPreviewFrame;
