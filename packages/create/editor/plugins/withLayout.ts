// 文件路径: create/editor/plugins/withLayout.ts

import { Transforms, Element as SlateElement, Editor } from "slate";
import { isCustomElement, type Element } from "../types";

export const withLayout = (editor: Editor) => {
  const { normalizeNode } = editor;

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // 只在根节点应用布局规则
    if (Editor.isEditor(node) && path.length === 0) {
      const children = node.children;

      // body-only 编辑器至少保留一个段落，标题已移到外层输入框
      if (children.length === 0) {
        const paragraph: SlateElement = {
          type: "paragraph",
          children: [{ text: "" }],
        } as SlateElement;
        Transforms.insertNodes(editor, paragraph, { at: [0] });
        return;
      }
    }

    return normalizeNode(entry);
  };

  return editor;
};
