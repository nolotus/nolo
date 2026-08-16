// 文件：create/editor/ElementWrapper.tsx

import React, { Suspense, lazy, useCallback } from "react";
import { useSlateStatic, ReactEditor } from "slate-react";
import { CodeBlockType, CodeLineType } from "./types";
import { Table, TableRow, TableCell } from "render/web/ui/Table";
import { ImageElement } from "render/web/elements/ImageElement";
import { List, ListItem } from "render/web/elements/List";
import {
  SafeLink,
  TextBlockRenderer,
} from "render/web/elements/TextBlockRenderer";

const TEXT_BLOCK_TYPES = [
  "paragraph",
  "heading-one",
  "heading-two",
  "heading-three",
  "heading-four",
  "heading-five",
  "heading-six",
  "quote",
  "thematic-break",
];

const LazyCodeBlock = lazy(() => import("render/web/elements/CodeBlock"));

interface ElementWrapperProps {
  attributes: any;
  children: any;
  element: any;
  isStreaming?: boolean;
  highlightEnabled?: boolean;
  readOnly?: boolean;
}

export const ElementWrapper: React.FC<ElementWrapperProps> = (props) => {
  const { attributes, children, element, isStreaming = false, readOnly } = props;
  const editor = useSlateStatic();

  // 编辑模式下拦截链接的纯左键点击：避免触发跳转/新标签，保留编辑上下文。
  // 修饰键（Cmd/Ctrl/Shift/Alt）与中键点击仍走浏览器默认行为（打开新标签）。
  // 注意：不要 stopPropagation，否则点击不会冒泡到 Slate 的 onClick，光标无法落位。
  const handleLinkClick = useCallback((event: React.MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }
    event.preventDefault();
  }, []);

  const linkOnClick = readOnly ? undefined : handleLinkClick;

  const getStyle = (style: React.CSSProperties = {}) => ({
    ...(element.align ? { textAlign: element.align } : {}),
    ...style,
  });

  if (TEXT_BLOCK_TYPES.includes(element.type)) {
    return (
      <TextBlockRenderer attributes={attributes} element={element}>
        {children}
      </TextBlockRenderer>
    );
  }

  if (element.type === CodeBlockType) {
    return (
      <Suspense fallback={<pre className="code-loading">代码块加载中...</pre>}>
        <LazyCodeBlock
          attributes={attributes}
          element={element}
          isStreaming={isStreaming}
        >
          {children}
        </LazyCodeBlock>
      </Suspense>
    );
  }

  if (element.type === CodeLineType) {
    return (
      <div {...attributes} style={getStyle()}>
        {children}
      </div>
    );
  }

  switch (element.type) {
    case "code-inline":
      return (
        <code
          {...attributes}
          style={getStyle({
            background: "var(--backgroundSecondary)",
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
          })}
        >
          {children}
        </code>
      );

    case "link":
      return (
        <SafeLink
          href={element.url}
          onClick={linkOnClick}
          {...attributes}
          style={getStyle({
            color: "var(--primary)",
            textDecoration: "underline",
            textDecorationColor: "var(--primary)",
            textUnderlineOffset: "1px",
          })}
        >
          {children}
        </SafeLink>
      );

    case "image":
      return (
        <ImageElement
          {...props}
          readOnly={readOnly}
          style={getStyle({ margin: "var(--space-4) 0" })}
        />
      );

    case "list":
      return (
        <List attributes={attributes} element={element}>
          {children}
        </List>
      );

    case "list-item":
      return (
        <ListItem
          attributes={attributes}
          element={element}
          readOnly={readOnly}
        >
          {children}
        </ListItem>
      );

    case "table": {
      const tablePath = ReactEditor.findPath(editor as ReactEditor, element);
      return (
        <Table
          {...props}
          path={tablePath}
          style={getStyle({ margin: "var(--space-4) 0" })}
        >
          {children}
        </Table>
      );
    }

    case "table-row":
      return (
        <TableRow attributes={attributes} style={getStyle()}>
          {children}
        </TableRow>
      );

    case "table-cell": {
      const cellPath = ReactEditor.findPath(editor as ReactEditor, element);
      const isFirstRow = cellPath[cellPath.length - 2] === 0;
      return (
        <TableCell
          {...props}
          path={cellPath}
          isFirstRow={isFirstRow}
          style={getStyle({
            padding: "var(--space-2) var(--space-3)",
            lineHeight: "var(--leading-normal)",
          })}
        >
          {children}
        </TableCell>
      );
    }

    case "html-inline":
      return (
        <span
          {...attributes}
          style={getStyle()}
          dangerouslySetInnerHTML={{ __html: element.html }}
        />
      );

    case "mention":
      return (
        <span
          {...attributes}
          contentEditable={false}
          style={getStyle({
            padding: "0 4px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--backgroundTertiary)",
            color: "var(--primary)",
            fontWeight: 500,
            userSelect: "none",
            margin: "0 2px",
            border: "1px solid var(--border)",
            fontSize: "0.9em",
            verticalAlign: "baseline",
            display: "inline-flex",
            alignItems: "center",
          })}
        >
          @{element.label}
          {children}
        </span>
      );

    case "html-block":
      return (
        <div
          {...attributes}
          style={getStyle({ margin: "var(--space-3) 0" })}
          dangerouslySetInnerHTML={{ __html: element.html }}
        />
      );

    default: {
      const Tag = editor.isInline(element) ? "span" : "div";
      return (
        <Tag
          {...attributes}
          style={getStyle({
            ...(editor.isInline(element) ? {} : { margin: "var(--space-2) 0" }),
          })}
        >
          {children}
        </Tag>
      );
    }
  }
};
