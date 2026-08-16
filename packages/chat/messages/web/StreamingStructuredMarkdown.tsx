import React, { memo } from "react";
import { List } from "render/web/elements/List";
import {
  SafeLink,
  TextBlockRenderer,
} from "render/web/elements/TextBlockRenderer";

type StreamingStructuredMarkdownProps = {
  nodes: any[];
  renderText: (content: string) => React.ReactNode;
  cursor: React.ReactNode;
};

function isTextNode(node: any): node is { text: string } {
  return typeof node?.text === "string";
}

function getNodeText(node: any): string {
  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }

  if (isTextNode(node)) {
    return node.text;
  }

  if (Array.isArray(node?.children)) {
    const text =
      node.type === "code-line"
        ? `${getNodeText(node.children)}\n`
        : getNodeText(node.children);
    return text;
  }

  return "";
}

function renderTextLeaf(
  node: any,
  key: string,
  renderText: (content: string) => React.ReactNode
): React.ReactNode {
  let content: React.ReactNode = renderText(node.text);

  if (node.code) {
    content = <code className="inline-code">{content}</code>;
  }
  if (node.bold) {
    content = <strong>{content}</strong>;
  }
  if (node.italic) {
    content = <em>{content}</em>;
  }
  if (node.underline) {
    content = <u>{content}</u>;
  }
  if (node.strikethrough) {
    content = <del>{content}</del>;
  }

  return <React.Fragment key={key}>{content}</React.Fragment>;
}

function renderNodes(
  nodes: any[],
  path: string,
  renderText: (content: string) => React.ReactNode
): React.ReactNode[] {
  return nodes.map((node, index) =>
    renderNode(node, `${path}-${index}`, renderText)
  );
}

function renderListItem(
  node: any,
  key: string,
  renderText: (content: string) => React.ReactNode
) {
  const isTaskItem = node.checked !== undefined;
  const isCompleted = node.checked === true;
  const className = [
    "custom-list-item",
    isTaskItem && "task-list-item",
    isCompleted && "task-completed",
  ]
    .filter(Boolean)
    .join(" ");
  const content = renderNodes(node.children || [], key, renderText);

  if (!isTaskItem) {
    return (
      <li key={key} className={className}>
        {content}
      </li>
    );
  }

  return (
    <li key={key} className={className}>
      <input
        type="checkbox"
        checked={isCompleted}
        readOnly
        className="list-checkbox"
        contentEditable={false}
        aria-label={isCompleted ? "Completed task" : "Incomplete task"}
      />
      <div className={`task-content${isCompleted ? " task-completed" : ""}`}>
        {content}
      </div>
    </li>
  );
}

function renderCodeBlock(node: any, key: string) {
  const language = node.language || "plaintext";
  const content = getNodeText(node.children || []).replace(/\n$/, "");
  const languageClass = `language-${language}`;

  return (
    <pre key={key} className={`streaming-markdown-code ${languageClass}`}>
      <code className={languageClass}>{content}</code>
    </pre>
  );
}

function renderTable(
  node: any,
  key: string,
  renderText: (content: string) => React.ReactNode
) {
  const rows = Array.isArray(node.children) ? node.children : [];
  const headerRow = rows[0];
  const hasHeader = Array.isArray(headerRow?.children)
    ? headerRow.children.every((cell: any) => cell?.header)
    : false;
  const bodyRows = hasHeader ? rows.slice(1) : rows;

  return (
    <div key={key} className="table-container streaming-markdown-table">
      <table className="data-table">
        {hasHeader ? (
          <thead>
            <tr>
              {headerRow.children.map((cell: any, index: number) => (
                <th key={`${key}-head-${index}`}>
                  {renderNodes(
                    cell.children || [],
                    `${key}-head-${index}`,
                    renderText
                  )}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {bodyRows.map((row: any, rowIndex: number) => (
            <tr key={`${key}-row-${rowIndex}`}>
              {(row.children || []).map((cell: any, cellIndex: number) => (
                <td key={`${key}-cell-${rowIndex}-${cellIndex}`}>
                  {renderNodes(
                    cell.children || [],
                    `${key}-cell-${rowIndex}-${cellIndex}`,
                    renderText
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderNode(
  node: any,
  key: string,
  renderText: (content: string) => React.ReactNode
): React.ReactNode {
  if (isTextNode(node)) {
    return renderTextLeaf(node, key, renderText);
  }

  switch (node?.type) {
    case "paragraph":
    case "heading-one":
    case "heading-two":
    case "heading-three":
    case "heading-four":
    case "heading-five":
    case "heading-six":
    case "quote":
    case "thematic-break":
      return (
        <TextBlockRenderer key={key} attributes={{}} element={node}>
          {renderNodes(node.children || [], key, renderText)}
        </TextBlockRenderer>
      );

    case "link":
      return (
        <SafeLink key={key} href={node.url} className="streaming-markdown-link">
          {renderNodes(node.children || [], key, renderText)}
        </SafeLink>
      );

    case "code-inline":
      return (
        <code key={key} className="inline-code">
          {renderNodes(node.children || [], key, renderText)}
        </code>
      );

    case "list":
      return (
        <List key={key} attributes={{}} element={node}>
          {(node.children || []).map((child: any, index: number) =>
            renderListItem(child, `${key}-${index}`, renderText)
          )}
        </List>
      );

    case "list-item":
      return renderListItem(node, key, renderText);

    case "code-block":
      return renderCodeBlock(node, key);

    case "table":
      return renderTable(node, key, renderText);

    case "table-row":
    case "table-cell":
    case "code-line":
      return (
        <React.Fragment key={key}>
          {renderNodes(node.children || [], key, renderText)}
        </React.Fragment>
      );

    default:
      return (
        <div key={key}>
          {renderNodes(node.children || [], key, renderText)}
        </div>
      );
  }
}

export const StreamingStructuredMarkdown = memo(
  ({ nodes, renderText, cursor }: StreamingStructuredMarkdownProps) => (
    <div className="streaming-markdown-body ReadOnlyMarkdownContent__body">
      {renderNodes(nodes, "root", renderText)}
      {cursor}
    </div>
  )
);

export default StreamingStructuredMarkdown;
