// packages/app/hooks/useSmoothTextareaHeight.ts
// 输入框高度「CSS 自量 + wrapper 动画」组合：
// 1. textarea 用 `field-sizing: content` 自己量出内容高度，不再由 JS 写内联 px；
// 2. ResizeObserver 把量到的高度同步成 wrapper 的显式 `height`；
// 3. wrapper 上挂 `transition: height`——两端都是确定长度才插值得动，所以动画
//    只能留在 wrapper 上（textarea 自己的高度是 intrinsic 的，transition 无效）。
//
// 不支持 `field-sizing` 的浏览器退回旧的 px 高度写法（scrollHeight），wrapper
// 动画照旧生效；两条路径都由同一个 ResizeObserver 驱动 wrapper。
import { useCallback, useEffect, useRef } from "react";

const FIELD_SIZING_SUPPORTED =
  typeof CSS !== "undefined" && typeof CSS.supports === "function"
    ? CSS.supports("field-sizing", "content")
    : false;

export interface UseSmoothTextareaHeightParams {
  /** 文本变化回调；给了就由返回的 handleChange 转发（行为等同普通 onChange）。 */
  onTextChange?: (value: string) => void;
  /** 受控值：用于程序化改写文本（粘贴、回填、清空）后重算降级路径的高度。 */
  value?: string;
  /** 外部已有的 textarea ref；不传则用 hook 内部的。 */
  ref?: React.RefObject<HTMLTextAreaElement | null>;
}

export function useSmoothTextareaHeight({
  onTextChange,
  value,
  ref,
}: UseSmoothTextareaHeightParams = {}) {
  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = ref ?? localTextareaRef;
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const syncWrapHeight = useCallback(() => {
    const area = textareaRef.current;
    const wrap = wrapRef.current;
    if (!area || !wrap) return;
    const height = area.getBoundingClientRect().height;
    // 隐藏 / 未布局时高度为 0：不写死，保留 CSS 的自动高度。
    if (height <= 0) return;
    wrap.style.height = `${height}px`;
  }, [textareaRef]);

  // 降级路径：浏览器没有 field-sizing 时，textarea 的高度仍需 JS 量 scrollHeight。
  const sizeByScrollHeight = useCallback((area: HTMLTextAreaElement | null) => {
    if (FIELD_SIZING_SUPPORTED || !area) return;
    const maxHeight = Number.parseFloat(
      window.getComputedStyle(area).maxHeight
    );
    area.style.height = "auto";
    const contentHeight = area.scrollHeight;
    area.style.height = `${
      Number.isFinite(maxHeight) ? Math.min(contentHeight, maxHeight) : contentHeight
    }px`;
  }, []);

  useEffect(() => {
    const area = textareaRef.current;
    const wrap = wrapRef.current;
    if (!area || !wrap) return;
    syncWrapHeight();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => syncWrapHeight());
    observer.observe(area);
    return () => observer.disconnect();
  }, [syncWrapHeight, textareaRef]);

  useEffect(() => {
    sizeByScrollHeight(textareaRef.current);
  }, [sizeByScrollHeight, textareaRef, value]);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> =
    useCallback(
      (event) => {
        onTextChange?.(event.target.value);
        sizeByScrollHeight(event.currentTarget);
      },
      [onTextChange, sizeByScrollHeight]
    );

  return { wrapRef, textareaRef, handleChange };
}
