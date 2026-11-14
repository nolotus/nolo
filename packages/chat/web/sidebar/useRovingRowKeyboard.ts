import React, { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_SIDEBAR_ROW_SELECTOR = '[data-sidebar-row="true"]';

export interface UseRovingRowKeyboardOptions {
  /**
   * Selector for locating row elements inside the container.
   * Defaults to `[data-sidebar-row="true"]`.
   */
  rowSelector?: string;
  /**
   * Default focused key when no row has received focus yet.
   */
  defaultFocusedKey?: string | null;
  /**
   * Action when Enter is pressed on the focused row.
   * If omitted, falls back to clicking the primary <a> link inside the row.
   */
  onActivateRow?: (key: string, element: HTMLElement) => void;
  /**
   * Predicate checking if the row can be deleted.
   */
  canDeleteRow?: (key: string) => boolean;
  /**
   * Callback when Delete or Backspace is pressed on a deletable row.
   */
  onDeleteRow?: (key: string) => void | boolean | Promise<void | boolean>;
}

export function getVisibleRows(
  container: HTMLElement,
  selector: string = DEFAULT_SIDEBAR_ROW_SELECTOR
): HTMLElement[] {
  const rows = Array.from(container.querySelectorAll<HTMLElement>(selector));
  return rows.filter((el) => {
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
    if (el.style.display === "none" || el.style.visibility === "hidden") return false;
    return true;
  });
}

export function useRovingRowKeyboard({
  rowSelector = DEFAULT_SIDEBAR_ROW_SELECTOR,
  defaultFocusedKey = null,
  onActivateRow,
  canDeleteRow,
  onDeleteRow,
}: UseRovingRowKeyboardOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const deletingKeysRef = useRef<Set<string>>(new Set());
  const activeCleanupsRef = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    return () => {
      activeCleanupsRef.current.forEach((cleanup) => cleanup());
      activeCleanupsRef.current.clear();
    };
  }, []);

  const effectiveFocusedKey = focusedKey ?? defaultFocusedKey;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      // 1. 行内正在编辑（例如 input / textarea / contenteditable）时，
      // 所有按键均属于文本编辑，不得拦截。
      const target = event.target as HTMLElement | null;
      const isEditing = Boolean(
        target?.isContentEditable ||
          target?.closest?.(
            'input, textarea, [contenteditable="true"], [contenteditable=""]'
          )
      );
      if (isEditing) return;

      const container = containerRef.current;
      if (!container) return;

      const visibleRows = getVisibleRows(container, rowSelector);
      if (visibleRows.length === 0) return;

      const currentFocusedEl = target?.closest<HTMLElement>(rowSelector) ?? null;
      const currentIndex = currentFocusedEl ? visibleRows.indexOf(currentFocusedEl) : -1;

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex =
            currentIndex >= 0
              ? Math.min(currentIndex + 1, visibleRows.length - 1)
              : 0;
          const nextEl = visibleRows[nextIndex];
          if (nextEl) {
            const nextKey = nextEl.getAttribute("data-content-key");
            if (nextKey) setFocusedKey(nextKey);
            nextEl.focus();
          }
          break;
        }

        case "ArrowUp": {
          event.preventDefault();
          const prevIndex =
            currentIndex >= 0
              ? Math.max(currentIndex - 1, 0)
              : visibleRows.length - 1;
          const prevEl = visibleRows[prevIndex];
          if (prevEl) {
            const prevKey = prevEl.getAttribute("data-content-key");
            if (prevKey) setFocusedKey(prevKey);
            prevEl.focus();
          }
          break;
        }

        case "Home": {
          event.preventDefault();
          const firstEl = visibleRows[0];
          if (firstEl) {
            const firstKey = firstEl.getAttribute("data-content-key");
            if (firstKey) setFocusedKey(firstKey);
            firstEl.focus();
          }
          break;
        }

        case "End": {
          event.preventDefault();
          const lastEl = visibleRows[visibleRows.length - 1];
          if (lastEl) {
            const lastKey = lastEl.getAttribute("data-content-key");
            if (lastKey) setFocusedKey(lastKey);
            lastEl.focus();
          }
          break;
        }

        case "Enter": {
          if (!currentFocusedEl) break;
          const key = currentFocusedEl.getAttribute("data-content-key");
          if (!key) break;
          event.preventDefault();
          if (onActivateRow) {
            onActivateRow(key, currentFocusedEl);
          } else {
            // 与鼠标点击该行同一动作：触发行内主链接
            const link = currentFocusedEl.querySelector<HTMLElement>("a[href], a");
            if (link) {
              link.click();
            }
          }
          break;
        }

        case "Delete":
        case "Backspace": {
          if (!currentFocusedEl) break;
          const key = currentFocusedEl.getAttribute("data-content-key");
          if (!key) break;

          // 权限门判据校验
          if (canDeleteRow && !canDeleteRow(key)) {
            return;
          }

          // 防重复触发正在删除的同一行
          if (deletingKeysRef.current.has(key)) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const nextEl = visibleRows[currentIndex + 1] ?? null;
          const prevEl = visibleRows[currentIndex - 1] ?? null;
          const targetKey = nextEl?.getAttribute("data-content-key") ?? null;
          const fallbackKey = prevEl?.getAttribute("data-content-key") ?? null;

          deletingKeysRef.current.add(key);

          void (async () => {
            let success = true;
            try {
              const res = await onDeleteRow?.(key);
              if (res === false) {
                success = false;
              }
            } catch {
              success = false;
            } finally {
              deletingKeysRef.current.delete(key);
            }

            if (!success) return;

            const performHandoff = () => {
              const currentContainer = containerRef.current;
              if (!currentContainer) return;

              const currentVisible = getVisibleRows(currentContainer, rowSelector);
              let targetNode: HTMLElement | null = null;

              if (targetKey) {
                targetNode =
                  currentVisible.find(
                    (el) => el.getAttribute("data-content-key") === targetKey
                  ) ?? null;
              }
              if (!targetNode && fallbackKey) {
                targetNode =
                  currentVisible.find(
                    (el) => el.getAttribute("data-content-key") === fallbackKey
                  ) ?? null;
              }
              if (!targetNode && currentVisible.length > 0) {
                targetNode = currentVisible[0];
              }

              if (targetNode) {
                const newKey = targetNode.getAttribute("data-content-key");
                if (newKey) {
                  setFocusedKey(newKey);
                }
                targetNode.focus();
              } else {
                setFocusedKey(null);
                if (!currentContainer.hasAttribute("tabindex")) {
                  currentContainer.setAttribute("tabindex", "-1");
                }
                currentContainer.focus();
              }
            };

            const isRemoved =
              !currentFocusedEl.isConnected || !container.contains(currentFocusedEl);
            if (isRemoved) {
              performHandoff();
              return;
            }

            let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
            let cleanup: (() => void) | null = null;

            const observer = new MutationObserver(() => {
              const removedNow =
                !currentFocusedEl.isConnected || !container.contains(currentFocusedEl);
              if (removedNow) {
                if (cleanup) cleanup();
                performHandoff();
              }
            });

            cleanup = () => {
              observer.disconnect();
              if (fallbackTimer !== null) clearTimeout(fallbackTimer);
              if (cleanup) activeCleanupsRef.current.delete(cleanup);
            };
            activeCleanupsRef.current.add(cleanup);

            observer.observe(container, { childList: true, subtree: true });

            fallbackTimer = setTimeout(() => {
              if (cleanup) cleanup();
              performHandoff();
            }, 1000);
          })();
          break;
        }
      }
    },
    [rowSelector, onActivateRow, canDeleteRow, onDeleteRow]
  );

  const getRowProps = useCallback(
    (key: string) => {
      const isFocused = effectiveFocusedKey === key;
      return {
        "data-sidebar-row": "true" as const,
        "data-content-key": key,
        tabIndex: isFocused ? 0 : -1,
        onFocus: () => {
          setFocusedKey(key);
        },
      };
    },
    [effectiveFocusedKey]
  );

  return {
    containerRef,
    containerProps: {
      tabIndex: -1,
      onKeyDown: handleKeyDown,
    },
    focusedKey: effectiveFocusedKey,
    setFocusedKey,
    getRowProps,
  };
}
