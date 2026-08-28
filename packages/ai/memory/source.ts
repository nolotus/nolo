import type { MemoryItem, MemorySourceKind } from "./types";

/**
 * Derive the source kind of a memory item from its metadata.
 * Backfill-friendly: works for old records without explicit sourceKind.
 */
export const getMemorySourceKind = (
  item: Pick<MemoryItem, "patternKey" | "tags" | "sourceKind">
): MemorySourceKind => {
  if (item.sourceKind) return item.sourceKind;
  if (item.patternKey === "explicit-remember") return "explicit-user-directive";
  if (
    item.patternKey === "agent-remember" ||
    item.patternKey === "procedural-runbook"
  )
    return "agent-tool";
  if (item.patternKey?.startsWith("dialog-learning:"))
    return "dialog-learning";
  if (item.tags?.includes("understanding-memory"))
    return "inferred-understanding";
  return "agent-tool";
};
