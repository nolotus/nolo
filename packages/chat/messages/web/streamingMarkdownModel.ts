import { markdownToSlate } from "create/editor/transforms/markdownToSlate";

type StreamingMarkdownModel =
  | { kind: "plain-text"; content: string }
  | { kind: "structured"; nodes: any[] };

function isPlainTextLeaf(node: any): boolean {
  return (
    typeof node?.text === "string" &&
    Object.keys(node).every((key) => key === "text")
  );
}

function isPlainTextParagraph(node: any): boolean {
  return (
    node?.type === "paragraph" &&
    Array.isArray(node.children) &&
    node.children.every(isPlainTextLeaf)
  );
}

export function buildStreamingMarkdownModel(content: string): StreamingMarkdownModel {
  if (!content) {
    return { kind: "plain-text", content };
  }

  try {
    const nodes = markdownToSlate(content) || [];
    if (nodes.length === 1 && isPlainTextParagraph(nodes[0])) {
      return { kind: "plain-text", content };
    }

    if (nodes.length > 0) {
      return { kind: "structured", nodes };
    }
  } catch {
    // Fall through to plain-text rendering when markdown parsing fails.
  }

  return { kind: "plain-text", content };
}
