// editor/plugins/withChineseTypography.ts
import { Editor, Element as SlateElement, NodeEntry, Text, Transforms } from "slate";
import { normalizeChineseTypography } from "./normalizeChineseTypography";

type AnyEditor = Editor & {
  // 如果你有自定义的 editor 类型，可以在这扩展
};


const isTypographyDisabled = (editor: Editor, entry: NodeEntry): boolean => {
  const [, path] = entry;

  // 避免在 code block / inline code / 链接等节点里改文本
  const block = Editor.above(editor, {
    at: path,
    match: (n) =>
      SlateElement.isElement(n) &&
      [
        "code-block",
        "code-line",
        "code-inline", // 这里原来是 "inline-code"，建议改成和实际类型一致
        "link",
      ].includes((n as any).type),
  });

  return Boolean(block);
};

export const withChineseTypography = <T extends AnyEditor>(editor: T): T => {
  const { normalizeNode } = editor;

  editor.normalizeNode = (entry: NodeEntry) => {
    const [node, path] = entry;

    // 只处理纯文本节点
    if (Text.isText(node)) {
      if (isTypographyDisabled(editor, entry)) {
        return normalizeNode(entry);
      }

      const original = node.text;
      const normalized = normalizeChineseTypography(original);

      if (normalized !== original) {
        // 替换当前 text 节点的内容
        Transforms.setNodes(
          editor,
          { text: normalized },
          { at: path }
        );
        // 重要：修改之后提前返回，避免无限 normalize 循环
        return;
      }
    }

    // 默认行为
    normalizeNode(entry);
  };

  return editor;
};