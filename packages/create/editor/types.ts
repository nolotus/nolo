import { Element as SlateElement } from "slate";

// 基础元素类型常量
export const ParagraphType = "paragraph";
export const CodeBlockType = "code-block";
export const CodeLineType = "code-line";
const QuoteType = "quote";
const ThematicBreakType = "thematic-break";

// 列表相关类型
const ListType = "list";
const ListItemType = "list-item";

// 表格相关类型
const TableType = "table";
const TableRowType = "table-row";
const TableCellType = "table-cell";

// 格式化文本类型
type FormattedText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

// 标题类型枚举
export enum HeadingType {
  H1 = "heading-one",
  H2 = "heading-two",
  H3 = "heading-three",
  H4 = "heading-four",
  H5 = "heading-five",
  H6 = "heading-six",
}

// 链接元素类型
export type LinkElement = {
  type: "link";
  url: string;
  children: FormattedText[];
};

// 文本块元素类型
type TextBlockElement = {
  type:
  | HeadingType
  | typeof ParagraphType
  | typeof QuoteType
  | typeof ThematicBreakType;
  align?: "left" | "center" | "right" | "justify";
  isNested?: boolean;
  cite?: string; // 用于引用块
  children: FormattedText[];
};

// 列表元素类型
type ListElement = {
  type: typeof ListType;
  ordered?: boolean;
  children: ListItemElement[];
};

export type ListItemElement = {
  type: typeof ListItemType;
  checked?: boolean; // 用于任务列表
  indent?: number; // 扁平存储下的列表层级，便于后续按节点拆分/索引
  children: (FormattedText | TextBlockElement)[];
};

// 表格元素类型
export type TableElement = {
  type: typeof TableType;
  columns?: { width?: number }[];
  children: TableRowElement[];
};

type TableRowElement = {
  type: typeof TableRowType;
  children: TableCellElement[];
};

type TableCellElement = {
  type: typeof TableCellType;
  header?: boolean;
  children: FormattedText[];
};

// 代码块元素类型
export type CodeBlockElement = {
  type: typeof CodeBlockType;
  language?: string;
  preview?: string;
  children: CodeLineElement[];
};

export type CodeLineElement = {
  type: typeof CodeLineType;
  children: FormattedText[];
};

// Mention element type
type MentionElement = {
  type: "mention";
  resourceType: "tool" | "page" | "agent" | "space";
  resourceId: string;
  label: string;
  children: FormattedText[];
};

// 统一的元素类型联合
export type Element =
  | TextBlockElement
  | ListElement
  | ListItemElement
  | TableElement
  | TableRowElement
  | TableCellElement
  | CodeBlockElement
  | CodeLineElement
  | LinkElement
  | MentionElement;

export const isCustomElement = (node: unknown): node is Element =>
  SlateElement.isElement(node) && "type" in node;
