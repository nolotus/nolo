import React, { useCallback } from "react";
import {
  Editor,
  Element as SlateElement,
  Node as SlateNode,
  Path,
  Transforms,
  Range,
} from "slate";
import { ReactEditor } from "slate-react";
import { toggleMark } from "./mark"; // 确保文件名是 marks.ts
import { isCustomElement, type Element, type ListItemElement } from "./types";

// 1. 从我们的命令文件中导入所有需要的函数
import {
  isSelectionInTable,
  moveToNextCell,
  moveToPreviousCell,
  moveToUpperCell,
  moveToLowerCell,
  moveToLeftCell,
  moveToRightCell,
} from "./tableCommands";

const HOTKEYS = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+u": "underline",
};

const HEADING_TYPES = new Set([
  "heading-one",
  "heading-two",
  "heading-three",
  "heading-four",
  "heading-five",
  "heading-six",
]);

// 假设您的 isHotkey 函数已正确实现
const isHotkey = (hotkey: string, event: React.KeyboardEvent): boolean => {
  // 这是一个更健壮的实现
  const hotkeyParts = hotkey.split("+");
  const key = hotkeyParts.pop();
  const isMod = hotkeyParts.includes("mod") && (event.metaKey || event.ctrlKey);
  const isShift = hotkeyParts.includes("shift") && event.shiftKey;

  // 简化的示例，仅支持 mod
  return isMod && event.key.toLowerCase() === key;
};

export const useOnKeyDown = (editor: Editor) => {
  return useCallback(
    (e: React.KeyboardEvent) => {
      const tableEditor = editor as ReactEditor;
      // Keep list storage flat and only adjust an indent attribute.
      // The renderer reconstructs nested <ol>/<ul> DOM from these levels.
      if (e.key === "Tab" && !isSelectionInTable(tableEditor)) {
        const { selection } = editor;
        if (selection) {
          const listItemEntry = Editor.above(editor, {
            at: selection,
            match: (n) => isCustomElement(n) && n.type === "list-item",
          }) as [ListItemElement, Path] | undefined;

          let didHandle = false;
          if (listItemEntry) {
            const [listItemNode, listItemPath] = listItemEntry;
            const currentIndent = Math.max(0, Number(listItemNode.indent || 0));

            if (e.shiftKey) {
              // Shift+Tab decreases the visual nesting level but keeps the item flat in storage.
              const nextIndent = Math.max(0, currentIndent - 1);
              if (nextIndent !== currentIndent) {
                Transforms.setNodes(
                  editor,
                  { indent: nextIndent || undefined } as Partial<ListItemElement>,
                  { at: listItemPath }
                );
              }
              didHandle = true;
            } else {
              const index = listItemPath[listItemPath.length - 1];
              if (index > 0) {
                const previousSibling = SlateNode.get(
                  editor,
                  Path.previous(listItemPath)
                ) as any;
                const previousIndent = Math.max(
                  0,
                  Number(previousSibling?.indent || 0)
                );
                // Match common editors: an item can indent at most one level deeper than its previous sibling.
                const nextIndent = Math.min(currentIndent + 1, previousIndent + 1);
                if (nextIndent !== currentIndent) {
                  Transforms.setNodes(
                    editor,
                    { indent: nextIndent } as Partial<ListItemElement>,
                    { at: listItemPath }
                  );
                }
                didHandle = true;
              }
            }
          }

          if (didHandle) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      if (e.key === "Enter") {
        const { selection } = editor;

        if (selection && Range.isCollapsed(selection)) {
          const blockEntry = Editor.above(editor, {
            at: selection,
            match: (n) => isCustomElement(n) && Editor.isBlock(editor, n as Element),
          });

          if (blockEntry) {
            const [blockNode, blockPath] = blockEntry;
            if (
              isCustomElement(blockNode) &&
              HEADING_TYPES.has(blockNode.type as string) &&
              Editor.isEnd(editor, selection.anchor, blockPath)
            ) {
              e.preventDefault();
              const nextPath = Path.next(blockPath);
              Transforms.insertNodes(
                editor,
                { type: "paragraph", children: [{ text: "" }] } as Element,
                { at: nextPath }
              );
              Transforms.select(editor, Editor.start(editor, nextPath));
              return;
            }
          }

          const listItemEntry = Editor.above(editor, {
            at: selection,
            match: (n) => isCustomElement(n) && n.type === "list-item",
          }) as [ListItemElement, Path] | undefined;

          if (listItemEntry) {
            e.preventDefault();

            const [listItemNode, listItemPath] = listItemEntry;
            const isTaskItem = listItemNode.checked !== undefined;
            const isEmptyItem = SlateNode.string(listItemNode).trim() === "";

            if (isEmptyItem) {
              // Empty list item exits the list, which matches mainstream document editors.
              Transforms.setNodes(
                editor,
                { type: "paragraph" } as Partial<Element>,
                { at: listItemPath }
              );
              Transforms.unsetNodes(editor, "checked", { at: listItemPath });
              Transforms.unwrapNodes(editor, {
                at: listItemPath,
                match: (n) => isCustomElement(n) && n.type === "list",
                split: true,
              });
              return;
            }

            const nextItem: ListItemElement = {
              type: "list-item",
              ...(isTaskItem ? { checked: false } : {}),
              indent: listItemNode.indent,
              children: [{ text: "" }],
            };

            const insertPath = Path.next(listItemPath);
            Transforms.insertNodes(editor, nextItem as Element, { at: insertPath });
            Transforms.select(editor, Editor.start(editor, insertPath));
            return;
          }
        }
      }

      // --- 表格导航逻辑优先处理 ---
      if (isSelectionInTable(tableEditor)) {
        // --- Tab 键导航 ---
        if (e.key === "Tab") {
          e.preventDefault();
          e.shiftKey ? moveToPreviousCell(tableEditor) : moveToNextCell(tableEditor);
          return;
        }

        // --- 2. 方向键导航 ---
        const { selection } = editor;
        // 只在光标折叠（没有选中文本）时触发
        if (selection && Range.isCollapsed(selection)) {
          const cellEntry = Array.from(
            Editor.nodes(editor, {
              match: (n) => isCustomElement(n) && n.type === "table-cell",
              at: selection,
            })
          )[0] as [Element, Path] | undefined;

          if (cellEntry) {
            const [, cellPath] = cellEntry;
            const atStart = Editor.isStart(editor, selection.anchor, cellPath);
            const atEnd = Editor.isEnd(editor, selection.anchor, cellPath);

            switch (e.key) {
              case "ArrowUp":
                if (atStart) {
                  e.preventDefault();
                  moveToUpperCell(tableEditor);
                }
                return;
              case "ArrowDown":
                if (atEnd) {
                  e.preventDefault();
                  moveToLowerCell(tableEditor);
                }
                return;
              case "ArrowLeft":
                if (atStart) {
                  e.preventDefault();
                  moveToLeftCell(tableEditor);
                }
                return;
              case "ArrowRight":
                if (atEnd) {
                  e.preventDefault();
                  moveToRightCell(tableEditor);
                }
                return;
            }
          }
        }
      }
      // --- 表格逻辑结束 ---

      // 格式化快捷键逻辑
      for (const hotkey in HOTKEYS) {
        if (isHotkey(hotkey, e)) {
          e.preventDefault();
          toggleMark(editor, (HOTKEYS as Record<string, string>)[hotkey]);
          return; // 添加 return 避免冲突
        }
      }

      // 注意：Tab 键的插入空格逻辑已被表格内的 Tab 逻辑覆盖
      // 如果需要在非表格环境下插入Tab，这里的逻辑是正确的
      if (e.key === "Tab" && !isSelectionInTable(tableEditor)) {
        e.preventDefault();
        const codeBlockEntry = Editor.above(editor, {
          match: (n) => isCustomElement(n) && n.type === "code-block",
        });

        if (codeBlockEntry) {
          Editor.insertText(editor, "  ");
        }
      }
    },
    [editor]
  );
};
