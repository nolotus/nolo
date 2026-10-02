export interface SavedMemoryItem {
  content: string;
  sourceKind: "explicit-user-directive" | "agent-tool" | "inferred-understanding";
  visibility?: "private" | "shared" | "public";
  kind?: string;
  id?: string;
  dbKey?: string;
}

export const isSavedMemorySourceKind = (
  value: unknown,
): value is SavedMemoryItem["sourceKind"] =>
  value === "explicit-user-directive" ||
  value === "agent-tool" ||
  value === "inferred-understanding" ||
  value === "dialog-learning";

export function getSavedMemories(dialogConfig: any): SavedMemoryItem[] {
  if (!dialogConfig) return [];
  const list: any[] = [];

  const collect = (arr: any, fromSavedMemories = false) => {
    if (Array.isArray(arr)) {
      if (fromSavedMemories) {
        list.push(...arr.map((item) => {
          if (item && typeof item === "object") {
            return { ...item, type: item.type || "memory.saved" };
          }
          return item;
        }));
      } else {
        list.push(...arr);
      }
    }
  };

  collect(dialogConfig.memoryEvents);
  collect(dialogConfig.artifacts);
  collect(dialogConfig.savedMemories, true);

  const checkpoint = dialogConfig.runtimeCheckpoint;
  if (checkpoint && typeof checkpoint === "object") {
    collect(checkpoint.memoryEvents);
    collect(checkpoint.artifacts);
    collect(checkpoint.savedMemories, true);
  }

  const result: SavedMemoryItem[] = [];
  const seenContent = new Set<string>();

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    if (item.type !== "memory.saved") continue;
    if (typeof item.content !== "string") continue;

    const content = item.content.trim();
    if (!content) continue;

    const sourceKind = item.sourceKind;
    if (typeof sourceKind !== "string") continue;
    const lowerSourceKind = sourceKind.toLowerCase();

    if (
      lowerSourceKind.includes("inferred") ||
      lowerSourceKind.includes("understanding") ||
      lowerSourceKind === "inferred-understanding"
    ) {
      continue;
    }

    if (
      lowerSourceKind !== "explicit-user-directive" &&
      lowerSourceKind !== "agent-tool"
    ) {
      continue;
    }

    const normalized = content.toLowerCase().replace(/[\s\p{P}]/gu, "");
    if (!seenContent.has(normalized)) {
      seenContent.add(normalized);
      result.push({
        content,
        sourceKind: lowerSourceKind as SavedMemoryItem["sourceKind"],
        visibility: item.visibility || "private",
        ...(typeof item.kind === "string" && item.kind ? { kind: item.kind } : {}),
        ...(typeof item.id === "string" && item.id ? { id: item.id } : {}),
        ...(typeof item.dbKey === "string" && item.dbKey
          ? { dbKey: item.dbKey }
          : {}),
      });
    }
  }

  return result;
}
