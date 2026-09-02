// 文件: render/table/usePopupBehavior.ts
//
// 表格弹层（SelectCellEditor / RowContextMenu）共享的 React 行为 hook：
// - usePopupDismiss：Esc（capture）/ 外部 mousedown（capture）/
//   外部滚动（capture，忽略自身）/ resize 时关闭；
// - useActiveItemNavigation：aria-activedescendant 模式的键盘导航
//   （容器持焦、↑/↓ 循环、Enter 触发、Esc/Tab 关闭、高亮项滚入可视区）。

import React, { useEffect, useId, useRef, useState } from "react";
import { isImeComposingKeyEvent } from "./keyboardUtils";

export type UsePopupDismissOptions = {
  /** 返回 true 时忽略本次 Esc（如内联输入态的 Esc 由输入框自行处理）。 */
  shouldIgnoreEscape?: (event: KeyboardEvent) => boolean;
};

export const usePopupDismiss = (
  popupRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  options?: UsePopupDismissOptions
) => {
  // 透传最新 shouldIgnoreEscape：用 ref 读取，不进入关闭 effect 的依赖，
  // 避免调用方传内联函数时监听反复重挂。
  const shouldIgnoreEscapeRef = useRef(options?.shouldIgnoreEscape);
  useEffect(() => {
    shouldIgnoreEscapeRef.current = options?.shouldIgnoreEscape;
  });

  // Esc / 点击外部 / 任意滚动（capture 覆盖 grid 滚动容器）/ resize 时关闭。
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      // target 理论上总是 Node；window 等非 Node 场景显式视为外部交互，直接关闭。
      if (!(event.target instanceof Node)) {
        onClose();
        return;
      }
      const popup = popupRef.current;
      if (popup && popup.contains(event.target)) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (shouldIgnoreEscapeRef.current?.(event)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    // 忽略弹层自身 overflow 滚动产生的 scroll 事件（捕获阶段会连它一起收到），
    // 否则选项较多时一滚动列表就误关；外部/grid 容器滚动与 resize 仍关闭。
    const handleScrollOrResize = (event: Event) => {
      // resize 事件 target 是 window（非 Node）等场景显式关闭。
      if (!(event.target instanceof Node)) {
        onClose();
        return;
      }
      if (event.type === "scroll" && popupRef.current?.contains(event.target)) {
        return;
      }
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [onClose]);
};

export type UseActiveItemNavigationArgs = {
  /** 可导航项总数（分隔线等非可操作项不占位）。 */
  itemCount: number;
  /** 初始高亮下标（可传惰性函数，语义同 useState 初始化）。 */
  initialIndex: number | (() => number);
  /** Enter（及 enableSpace 时的 Space）触发当前高亮项。 */
  onSelect: (index: number) => void;
  onClose: () => void;
  /** Space 与 Enter 等效触发当前高亮项（菜单语义；listbox 不开启）。 */
  enableSpace?: boolean;
  /** aria-activedescendant 的 id 中缀，默认 "item"。 */
  itemIdInfix?: string;
};

export const useActiveItemNavigation = ({
  itemCount,
  initialIndex,
  onSelect,
  onClose,
  enableSpace = false,
  itemIdInfix = "item",
}: UseActiveItemNavigationArgs) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // aria-activedescendant 需要的稳定 id（容器持有焦点，不移动 DOM focus）；
  // useId 前缀避免多实例并存时 id 冲突。
  const instanceId = useId();
  const itemId = (index: number) => `${instanceId}-${itemIdInfix}-${index}`;

  // 挂载后聚焦容器以接收键盘事件。
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // 键盘高亮项滚入可视区：长列表滚轮/键盘导航都能始终看到高亮项。
  useEffect(() => {
    document
      .getElementById(itemId(activeIndex))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // IME 组合中（如中文输入法选字确认）：Enter/Space 会被输入法消费，
    // 不代表「选中高亮项」；方向键同理只服务于候选词，不做列表导航。
    if (isImeComposingKeyEvent(event)) {
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      // itemCount=0 时取模得 NaN 并泄漏给 activeIndex/aria-activedescendant；
      // 空列表无项可导航，直接忽略方向键。
      if (itemCount <= 0) return;
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((prev) => (prev + delta + itemCount) % itemCount);
      return;
    }
    if (event.key === "Enter" || (enableSpace && event.key === " ")) {
      // enableSpace 时 Space 与 Enter 等效：触发当前高亮项。
      if (itemCount <= 0) return;
      event.preventDefault();
      onSelect(activeIndex);
      return;
    }
    if (event.key === "Escape") {
      // 容器自身显式关闭（全局 document keydown capture 兜底仍保留）。
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "Tab") {
      // 弹层内不做焦点循环，Tab 直接关闭，避免焦点逃逸到表格后方。
      event.preventDefault();
      onClose();
    }
  };

  return { activeIndex, setActiveIndex, itemId, handleKeyDown, containerRef };
};
