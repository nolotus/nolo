import {
  Node
} from "/public/assets/chunks/chunk-GIMH23VB.js";

// packages/create/editor/utils/slateUtils.ts
var createEmptyParagraph = () => ({
  type: "paragraph",
  children: [{ text: "" }]
});
var ensureEditorContent = (slateData) => Array.isArray(slateData) && slateData.length > 0 ? slateData : [createEmptyParagraph()];
var deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const isArrayA = Array.isArray(a);
  const isArrayB = Array.isArray(b);
  if (isArrayA || isArrayB) {
    if (!isArrayA || !isArrayB) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
};
var compareSlateContent = (newContent, oldContent) => {
  if (newContent === oldContent) return false;
  if (!newContent || !oldContent) return true;
  if (newContent.length !== oldContent.length) return true;
  return !deepEqual(newContent, oldContent);
};
var extractTitleFromSlate = (slateData) => {
  if (!Array.isArray(slateData) || slateData.length === 0) return "\u65B0\u9875\u9762";
  const titleNode = slateData.find((node) => node.type === "heading-one");
  if (titleNode) {
    const text = Node.string(titleNode).trim();
    if (text) {
      return text;
    }
  }
  for (const node of slateData) {
    const text = Node.string(node).trim();
    if (text) {
      return text.length > 30 ? `${text.substring(0, 30)}...` : text;
    }
  }
  return "\u65B0\u9875\u9762";
};
var splitSlateTitleAndBody = (slateData, explicitTitle) => {
  const content = ensureEditorContent(slateData);
  const firstNode = content[0];
  const hasExplicitTitle = explicitTitle !== void 0 && explicitTitle !== null;
  const normalizedExplicitTitle = hasExplicitTitle ? explicitTitle.trim() : null;
  const firstNonEmptyText = content.map((node) => Node.string(node).trim()).find(Boolean);
  if (firstNode?.type === "heading-one") {
    const firstText = Node.string(firstNode).trim();
    const shouldTreatAsTitle = !!firstText && (normalizedExplicitTitle == null || normalizedExplicitTitle === firstText);
    if (shouldTreatAsTitle) {
      const body = content.slice(1);
      return {
        title: firstText,
        body: ensureEditorContent(body)
      };
    }
  }
  return {
    title: normalizedExplicitTitle ?? (firstNonEmptyText || ""),
    body: content
  };
};
var extractMentionsFromSlate = (slateData) => {
  const tools = /* @__PURE__ */ new Set();
  const traverse = (nodes) => {
    for (const node of nodes) {
      if (node.type === "mention" && node.resourceId) {
        if (node.resourceType === "tool") {
          tools.add(node.resourceId);
        }
      }
      if (node.children && Array.isArray(node.children)) {
        traverse(node.children);
      }
    }
  };
  if (Array.isArray(slateData)) {
    traverse(slateData);
  }
  return Array.from(tools);
};
var extractCategorizedMentions = (slateData) => {
  const result = {
    tools: [],
    pages: [],
    agents: [],
    spaces: []
  };
  const traverse = (nodes) => {
    for (const node of nodes) {
      if (node.type === "mention" && node.resourceId && node.resourceType) {
        switch (node.resourceType) {
          case "tool":
            result.tools.push(node.resourceId);
            break;
          case "page":
            result.pages.push(node.resourceId);
            break;
          case "agent":
            result.agents.push(node.resourceId);
            break;
          case "space":
            result.spaces.push(node.resourceId);
            break;
        }
      }
      if (node.children && Array.isArray(node.children)) {
        traverse(node.children);
      }
    }
  };
  if (Array.isArray(slateData)) {
    traverse(slateData);
  }
  result.tools = [...new Set(result.tools)];
  result.pages = [...new Set(result.pages)];
  result.agents = [...new Set(result.agents)];
  result.spaces = [...new Set(result.spaces)];
  return result;
};

export {
  createEmptyParagraph,
  ensureEditorContent,
  compareSlateContent,
  extractTitleFromSlate,
  splitSlateTitleAndBody,
  extractMentionsFromSlate,
  extractCategorizedMentions
};
