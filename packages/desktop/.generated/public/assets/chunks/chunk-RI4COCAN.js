import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";

// packages/create/editor/transforms/slateToSimplifiedMarkdown.ts
function renderTextNode(node) {
  if (!node || typeof node.text !== "string") return "";
  let text = node.text;
  if (!text) return "";
  if (node.bold) text = `**${text}**`;
  if (node.italic) text = `*${text}*`;
  if (node.strikethrough) text = `~~${text}~~`;
  return text;
}
function renderPlainText(node, options = {}) {
  if (!node) return "";
  if (typeof node.text === "string") return renderTextNode(node);
  if (!Array.isArray(node.children)) return "";
  return node.children.map((child) => renderPlainText(child, options)).join("");
}
function renderTable(node, listDepth, options) {
  const rows = Array.isArray(node.children) ? node.children : [];
  if (rows.length === 0) return "";
  const alignments = Array.isArray(node.columns) ? node.columns.map((column) => column?.align || "left") : [];
  const renderedRows = rows.map(
    (row) => (Array.isArray(row?.children) ? row.children : []).map((cell) => {
      const content = renderPlainText(cell, options).replace(/\n+/g, " ").trim();
      return content || " ";
    })
  );
  const header = renderedRows[0] || [];
  const divider = header.map((_, index) => {
    const align = alignments[index];
    if (align === "center") return ":---:";
    if (align === "right") return "---:";
    return "---";
  });
  const body = renderedRows.slice(1);
  const allRows = [header, divider, ...body].map((cells) => `| ${cells.join(" | ")} |`).join("\n");
  return `${allRows}

`;
}
function renderListItem(node, listDepth, ordered, start, index, options = {}) {
  const indentation = "  ".repeat(listDepth);
  const marker = node.checked === true ? "- [x]" : node.checked === false ? "- [ ]" : ordered ? `${start + index}.` : "-";
  const segments = Array.isArray(node.children) ? node.children : [];
  const renderedSegments = segments.flatMap((child) => {
    const rendered = renderNode(child, listDepth + 1, options).trimEnd();
    return rendered ? [rendered] : [];
  });
  if (renderedSegments.length === 0) {
    return `${indentation}${marker}
`;
  }
  const [first, ...rest] = renderedSegments;
  const lines = first.split("\n");
  const firstLine = lines.shift() || "";
  const restFirst = lines.map((line) => `${indentation}  ${line}`).join("\n");
  const restBlocks = rest.map((block) => `${indentation}  ${block}`).join("\n");
  return [
    `${indentation}${marker} ${firstLine}`,
    restFirst,
    restBlocks
  ].filter(Boolean).join("\n") + "\n";
}
function renderNode(node, listDepth = 0, options = {}) {
  if (!node) return "";
  const indentation = "  ".repeat(listDepth);
  switch (node.type) {
    case "heading-one":
      return `# ${node.children.map((n) => renderNode(n, listDepth, options)).join("")}

`;
    case "heading-two":
      return `## ${node.children.map((n) => renderNode(n, listDepth, options)).join("")}

`;
    case "heading-three":
      return `### ${node.children.map((n) => renderNode(n, listDepth, options)).join("")}

`;
    case "heading-four":
      return `#### ${node.children.map((n) => renderNode(n, listDepth, options)).join("")}

`;
    case "heading-five":
      return `##### ${node.children.map((n) => renderNode(n, listDepth, options)).join("")}

`;
    case "heading-six":
      return `###### ${node.children.map((n) => renderNode(n, listDepth, options)).join("")}

`;
    case "paragraph":
      return `${node.children.map((n) => renderNode(n, listDepth, options)).join("")}

`;
    case "list":
      return node.children.map(
        (item, index) => renderListItem(item, listDepth, !!node.ordered, node.start || 1, index, options)
      ).join("");
    case "list-item":
      return renderListItem(node, listDepth, false, 1, 0, options);
    case "quote":
      const content = node.children.map((n) => renderNode(n, listDepth, options)).join("").trim();
      return `> ${content.replace(/\n/g, "\n> ")}

`;
    case "code-block":
      const code = node.children.map(
        (line) => (line.children || []).map((text) => text.text).join("")
      ).join("\n");
      return "```" + (node.language || "") + "\n" + code + "\n```\n\n";
    case "link":
      const linkText = node.children.map((n) => renderNode(n, listDepth, options)).join("");
      return `[${linkText}](${node.url})`;
    case "table":
      return renderTable(node, listDepth, options);
    case "code-inline":
      return `\`${node.children.map((n) => renderNode(n, listDepth, options)).join("")}\``;
    case "mention": {
      if (options.mentionResolver) {
        return options.mentionResolver(node);
      }
      const label = node.label || node.resourceId || "mention";
      const resourceType = node.resourceType || "unknown";
      const resourceId = node.resourceId || "unknown";
      return `@[${resourceType}:${resourceId}|${label}]`;
    }
    case "image": {
      const alt = node.alt || "";
      const title = node.title ? ` "${node.title}"` : "";
      return `![${alt}](${node.url || ""}${title})`;
    }
    case "html-inline":
      return typeof node.html === "string" ? node.html : "";
    case "html-block":
      return typeof node.html === "string" ? `${node.html}

` : "";
    case "thematic-break":
      return "---\n\n";
    default:
      return renderTextNode(node) || (node.children ? node.children.map((child) => renderNode(child, listDepth, options)).join("") : "");
  }
}
function slateToSimplifiedMarkdown(nodes, options = {}) {
  if (!nodes || nodes.length === 0) {
    return "";
  }
  return nodes.map((node) => renderNode(node, 0, options)).join("").trim() + "\n";
}

// packages/ai/tools/readDocTool.ts
var readDocFunctionSchema = {
  name: "readDoc",
  description: [
    "\u8BFB\u53D6\u6307\u5B9A\u9875\u9762\u7684\u5185\u5BB9\uFF0C\u5E76\u5C06\u7ED3\u6784\u5316\u7684\u6570\u636E\u8F6C\u6362\u4E3A Markdown \u683C\u5F0F\u8FD4\u56DE\u3002",
    "\u5982\u679C\u4F60\u62FF\u5230\u4E86\u9875\u9762\u7684 dbKey\uFF08\u5982 page-xxx\uFF09\uFF0C\u8BF7\u4F7F\u7528\u6B64\u5DE5\u5177\u67E5\u770B\u9875\u9762\u5185\u5BB9\u3002"
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "\u9875\u9762/\u6587\u6863\u7684\u6570\u636E\u5E93\u952E\uFF08dbKey\uFF09\uFF0C\u4F8B\u5982 page-xxx\u3002"
      }
    },
    required: ["id"]
  }
};
var readPageFunctionSchema = {
  ...readDocFunctionSchema,
  name: "readPage"
};
var buildReadDocResult = (pageData) => {
  const markdownContent = slateToSimplifiedMarkdown(pageData.slateData || []);
  const rawData = {
    success: true,
    id: pageData.dbKey,
    title: pageData.title,
    content: markdownContent,
    metadata: {
      spaceId: pageData.spaceId,
      created: pageData.created
    }
  };
  const displayData = `\u5DF2\u6210\u529F\u8BFB\u53D6\u9875\u9762\u300A${pageData.title}\u300B\u3002

\u5185\u5BB9\u5982\u4E0B\uFF1A

${markdownContent}`;
  return { rawData, displayData };
};
async function readDocFunc(args, thunkApi) {
  const id = args.id ?? args.doc ?? args.docKey ?? args.pageKey ?? args.key;
  if (!id || !id.toLowerCase().startsWith("page-")) {
    throw new Error(`\u65E0\u6548\u7684\u9875\u9762 ID: ${id}\u3002\u9875\u9762 ID \u901A\u5E38\u4EE5 "page-" \u5F00\u5934\u3002`);
  }
  try {
    const { readAction } = await import("/public/assets/chunks/read-BTIYWAYT.js");
    const pageData = await readAction({ dbKey: id }, thunkApi);
    if (!pageData) {
      throw new Error(`\u672A\u627E\u5230 ID \u4E3A ${id} \u7684\u9875\u9762\u3002`);
    }
    return buildReadDocResult(pageData);
  } catch (error) {
    throw new Error(`\u8BFB\u53D6\u9875\u9762\u65F6\u51FA\u9519: ${toErrorMessage(error)}`);
  }
}
var readPageFunc = readDocFunc;

export {
  slateToSimplifiedMarkdown,
  readDocFunctionSchema,
  readPageFunctionSchema,
  buildReadDocResult,
  readDocFunc,
  readPageFunc
};
