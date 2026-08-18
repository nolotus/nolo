import { Editor, Element as SlateElement, Node, Transforms } from "slate";
import { isCustomElement, type Element } from "../types";

const HEADING_TYPES = new Set([
  "heading-one",
  "heading-two",
  "heading-three",
  "heading-four",
  "heading-five",
  "heading-six",
  "quote",
  "thematic-break",
]);

const isList = (node: unknown): node is Element =>
  isCustomElement(node) && node.type === "list";

const isListItem = (node: unknown): node is Element =>
  isCustomElement(node) && node.type === "list-item";

export const withBlockStructure = (editor: Editor) => {
  const { normalizeNode } = editor;

  editor.normalizeNode = ([node, path]) => {
    if (isList(node)) {
      // Keep list children structurally predictable even when pasted/AI-generated content is messy.
      for (const [child, childPath] of Node.children(editor, path)) {
        if (!isListItem(child)) {
          Transforms.wrapNodes(
            editor,
            { type: "list-item", children: [] } as Element,
            { at: childPath }
          );
          return;
        }
      }
    }

    if (isListItem(node)) {
      // We deliberately keep list storage flat, but the editable content of each item
      // should still behave like body text instead of headings/dividers.
      for (const [child, childPath] of Node.children(editor, path)) {
        if (isCustomElement(child) && HEADING_TYPES.has(child.type as string)) {
          Transforms.setNodes(editor, { type: "paragraph" } as Partial<Element>, { at: childPath });
          return;
        }
      }
    }

    normalizeNode([node, path]);
  };

  return editor;
};
