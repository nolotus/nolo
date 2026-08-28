export const HIDDEN_TOOL_IDS = new Set(["readPage"]);

export const isToolVisibleInUi = (toolId: string): boolean =>
  typeof toolId === "string" && toolId.trim().length > 0 && !HIDDEN_TOOL_IDS.has(toolId);
