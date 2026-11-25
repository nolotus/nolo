// create/space/epub/epubKeyboard.ts
//
// 阅读器键盘翻章的纯判定（便于单测，不依赖 React / DOM）。

/** 输入框 / 下拉 / 可编辑区聚焦时不劫持方向键。 */
export const isEditableTarget = (target: EventTarget | null): boolean => {
  const el = target as {
    tagName?: unknown;
    isContentEditable?: unknown;
    closest?: (selector: string) => unknown;
  } | null;
  if (!el || typeof el.tagName !== "string") return false;
  if (el.isContentEditable === true) return true;
  if (
    typeof el.closest === "function" &&
    el.closest('[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]')
  ) {
    return true;
  }
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName.toUpperCase());
};

/** 键盘翻章：限定在阅读器根容器作用域内，返回目标章节下标；不应处理时返回 null。 */
export const resolveChapterKeyTarget = (
  event: {
    key: string;
    target: EventTarget | null;
    currentTarget?: EventTarget | null;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    defaultPrevented?: boolean;
  },
  index: number,
  total: number
): number | null => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  const container = event.currentTarget as { contains?: (node: unknown) => boolean } | null | undefined;
  if (container && typeof container.contains === "function" && event.target && !container.contains(event.target)) {
    return null;
  }
  if (isEditableTarget(event.target)) return null;
  if (event.key === "ArrowLeft") return index > 0 ? index - 1 : null;
  if (event.key === "ArrowRight") return index < total - 1 ? index + 1 : null;
  return null;
};
