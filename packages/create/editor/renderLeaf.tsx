// 文件：create/editor/renderLeaf.tsx

import React from "react";
import type { CSSProperties, ReactNode } from "react";

interface TextLeafProps {
  attributes: any;
  children: React.ReactNode;
  leaf: LeafMarkState;
}

type LeafMarkState = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  highlight?: boolean;
  code?: boolean; // 内联代码 mark（非 Prism token）
  token?: boolean; // Prism: 语法高亮 token 标记
  types?: string[]; // 预留：如果以后想直接挂 types
  prismType?: string; // 预留：自定义字段名
  type?: string; // 预留：兼容其它实现
  [key: string]: any; // 其余 Prism 类型布尔 mark（keyword/string 等）
};

type LeafMark =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "subscript"
  | "superscript"
  | "highlight";

/**
 * 各种 mark 的样式常量
 * 便于统一维护，也方便以后迁移到 CSS 类
 */
const LEAF_MARK_STYLES: { [K in LeafMark]: CSSProperties } = {
  bold: {
    fontWeight: 600,
    color: "var(--text)",
  },
  italic: {
    fontStyle: "italic",
    color: "var(--textSecondary)",
  },
  underline: {
    textDecorationThickness: "0.1em",
    textUnderlineOffset: "0.2em",
    textDecorationColor: "var(--primary)",
    color: "var(--text)",
  },
  strikethrough: {
    textDecorationThickness: "0.1em",
    textDecorationColor: "var(--textTertiary)",
    opacity: 0.65,
    color: "var(--textTertiary)",
  },
  subscript: {
    fontSize: "0.75em",
    color: "var(--textSecondary)",
  },
  superscript: {
    fontSize: "0.75em",
    color: "var(--textSecondary)",
  },
  highlight: {
    backgroundColor: "var(--primaryLight)",
    color: "var(--text)",
    padding: "var(--space-0) var(--space-1)",
    borderRadius: "var(--space-1)",
    boxShadow: "0 0 0 1px var(--primary)",
  },
};

/** 内联代码样式常量（不依赖外部 CSS 加载顺序） */
const INLINE_CODE_STYLE: CSSProperties = {
  backgroundColor: "var(--backgroundSecondary)",
  color: "var(--primary)",
  padding: "var(--space-1) var(--space-2)",
  borderRadius: "var(--space-1)",
  fontFamily:
    'var(--font-mono, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
  fontSize: "0.85em",
  border: "1px solid var(--border)",
  wordBreak: "break-word",
  lineHeight: "var(--leading-tight)",
  fontWeight: 500,
};

/** mark 的应用顺序 */
const MARK_APPLY_ORDER: LeafMark[] = [
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "subscript",
  "superscript",
  "highlight",
];

/** Prism 相关但不代表 token 类型的字段 key 列表 */
const PRISM_META_KEYS = new Set<string>([
  "text",
  "token",
  "types",
  "type",
  "prismType",
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "subscript",
  "superscript",
  "highlight",
  "code",
]);

/**
 * 根据 mark 类型，用对应标签包裹节点
 */
const wrapWithMark = (mark: LeafMark, node: ReactNode): ReactNode => {
  const style = LEAF_MARK_STYLES[mark];

  switch (mark) {
    case "bold":
      return <strong style={style}>{node}</strong>;
    case "italic":
      return <em style={style}>{node}</em>;
    case "underline":
      return <u style={style}>{node}</u>;
    case "strikethrough":
      return <del style={style}>{node}</del>;
    case "subscript":
      return <sub style={style}>{node}</sub>;
    case "superscript":
      return <sup style={style}>{node}</sup>;
    case "highlight":
      return <mark style={style}>{node}</mark>;
    default:
      return node;
  }
};

/**
 * 解析 Prism token 的 className
 *
 * 你的 `syntaxHighlighting` 实现里，是这样挂 mark 的：
 *   range = { ..., token: true, keyword: true, string: true, ... }
 *
 * 所以这里需要从 leaf 上所有布尔 mark 中剥离出 token 类型，
 * 生成类似 "token keyword string" 这样的 className。
 */
const getPrismClassName = (leaf: LeafMarkState): string | undefined => {
  if (!leaf.token) return undefined;

  // 1) 先从 leaf 自己的 types / type / prismType 拿（如果以后你改成挂数组，也能兼容）
  const explicitTypesFromArray = Array.isArray(leaf.types)
    ? leaf.types
    : [];
  const explicitSingleType =
    typeof leaf.prismType === "string"
      ? [leaf.prismType]
      : typeof leaf.type === "string"
      ? [leaf.type]
      : [];

  const explicitTypes = [...explicitTypesFromArray, ...explicitSingleType].flatMap(
    (t) => (t ? [String(t)] : []),
  );

  // 2) 再从布尔 mark 里找出 token 类型（keyword、string、comment 等）
  const booleanTypes = Object.keys(leaf).filter(
    (key) =>
      !PRISM_META_KEYS.has(key) &&
      leaf[key] === true // 只要布尔 true 的标记
  );

  const allTypes = [
    ...explicitTypes,
    ...booleanTypes.filter((t) => !explicitTypes.includes(t)),
  ];

  if (allTypes.length === 0) {
    return "token";
  }

  return ["token", ...allTypes].join(" ");
};

const TextLeaf: React.FC<TextLeafProps> = ({ attributes, children, leaf }) => {
  const { code, token, ...rest } = leaf;

  // ✅ 只在「不是 Prism token」时，对 code mark 使用内联代码样式
  // 避免把 Prism 的 token 叶子也包成 <code>，破坏高亮结构
  if (code && !token) {
    const baseClassName: string | undefined = attributes?.className;
    const mergedClassName =
      [baseClassName, "inline-code"].filter(Boolean).join(" ") || undefined;

    return (
      <code
        {...attributes}
        className={mergedClassName}
        style={INLINE_CODE_STYLE}
      >
        {children}
      </code>
    );
  }

  // 依次应用粗体/斜体/下划线/删除线/上下标/高亮
  const contentWithMarks = MARK_APPLY_ORDER.reduce<ReactNode>(
    (node, mark) => (rest[mark] ? wrapWithMark(mark, node) : node),
    children
  );

  // Prism token class（如果有）
  const prismClassName = getPrismClassName(leaf);
  const baseSpanClassName: string | undefined = attributes?.className;
  const mergedSpanClassName =
    [baseSpanClassName, prismClassName].filter(Boolean).join(" ") || undefined;

  return (
    <span {...attributes} className={mergedSpanClassName}>
      {contentWithMarks}
    </span>
  );
};

// 不使用 React.memo，保证渲染一致性
export const renderLeaf = (props: TextLeafProps) => <TextLeaf {...props} />;