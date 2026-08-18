// packages/ai/tools/toolVisibility.ts
var HIDDEN_TOOL_IDS = /* @__PURE__ */ new Set(["readPage"]);
var isToolVisibleInUi = (toolId) => typeof toolId === "string" && toolId.trim().length > 0 && !HIDDEN_TOOL_IDS.has(toolId);

export {
  isToolVisibleInUi
};
