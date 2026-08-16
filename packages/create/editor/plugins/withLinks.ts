// create/editor/withLinks.ts
import { Editor, Element as SlateElement, Range, Transforms } from "slate";
import { isCustomElement } from "../types";

export const withLinks = (editor: Editor) => {
  const { isInline } = editor;

  // 扩展现有的 isInline 方法，而不是覆盖它
  editor.isInline = (element) => {
    return isCustomElement(element) && element.type === "link" ? true : isInline(element);
  };

  return editor;
};
