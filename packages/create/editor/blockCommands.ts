import { Editor, Element as SlateElement, Node, Path, Transforms } from "slate";
import { isCustomElement, type Element } from "./types";

const LIST_TYPE = "list";

export type ListVariant = "ordered" | "unordered" | "task" | null;

const isListItem = (node: unknown): node is Element =>
  isCustomElement(node) && node.type === "list-item";

export const isBlockActive = (
  editor: Editor,
  format: string,
  blockType: "type" | "align" = "type"
) => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        isCustomElement(n) && (n as Element)[blockType as keyof Element] === format,
    })
  );

  return !!match;
};

export const getActiveListVariant = (editor: Editor): ListVariant => {
  const { selection } = editor;
  if (!selection) return null;

  const [listItemEntry] = Editor.nodes(editor, {
    at: Editor.unhangRange(editor, selection),
    match: (n) => !Editor.isEditor(n) && isListItem(n),
  });

  if (!listItemEntry) return null;

  const [listItemNode, listItemPath] = listItemEntry;
  if ((listItemNode as any).checked !== undefined) {
    return "task";
  }

  const parentNode = Node.get(editor, Path.parent(listItemPath));
  if (!isCustomElement(parentNode) || parentNode.type !== LIST_TYPE) {
    return null;
  }

  return parentNode.ordered ? "ordered" : "unordered";
};

const unwrapFromList = (editor: Editor) => {
  Transforms.unwrapNodes(editor, {
    match: (n) => isCustomElement(n) && n.type === LIST_TYPE,
    split: true,
  });
};

// Toolbar and markdown shortcuts share these commands so list switching stays consistent
// regardless of whether the user clicks a button or types a shortcut.
export const setBlockType = (editor: Editor, type: string) => {
  unwrapFromList(editor);
  Transforms.unsetNodes(editor, "checked", {
    match: (n) => isListItem(n),
  });
  Transforms.setNodes(editor, { type } as Partial<Element>);
};

const applyListVariant = (
  editor: Editor,
  variant: Exclude<ListVariant, null>
) => {
  const currentVariant = getActiveListVariant(editor);
  const isSameVariant = currentVariant === variant;

  unwrapFromList(editor);

  if (isSameVariant) {
    Transforms.unsetNodes(editor, "checked", {
      match: (n) => isListItem(n),
    });
    Transforms.setNodes(editor, { type: "paragraph" } as Partial<Element>);
    return;
  }

  Transforms.setNodes(editor, { type: "list-item" } as Partial<Element>);

  if (variant === "task") {
    Transforms.setNodes(editor, { checked: false } as Partial<Element>, {
      match: (n) => isListItem(n),
    });
  } else {
    Transforms.unsetNodes(editor, "checked", {
      match: (n) => isListItem(n),
    });
  }

  Transforms.wrapNodes(editor, {
    type: LIST_TYPE,
    ordered: variant === "ordered",
    children: [],
  } as Element);
};

export const toggleOrderedList = (editor: Editor) =>
  applyListVariant(editor, "ordered");

export const toggleBulletedList = (editor: Editor) =>
  applyListVariant(editor, "unordered");

export const toggleTaskList = (editor: Editor) =>
  applyListVariant(editor, "task");
