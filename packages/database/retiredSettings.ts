/** Confirmed account settings retirement. Never applies to arbitrary suffix-matching records. */
export const RETIRED_SETTINGS_FIELDS = [
  "userTonePreset",
  "knowledgeCaptureLevel",
  "spaceContextLevel",
  "enableReadCurrentSpace",
  "globalPrompt",
  "preferredAnimationSet",
  "createMenuOpenCount",
] as const;

const retired = new Set<string>(RETIRED_SETTINGS_FIELDS);

/** Also drops legacy dot/bracket mutations rooted at a retired top-level field. */
export function stripRetiredSettingsFields<T>(record: T): T {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  return Object.fromEntries(Object.entries(record).filter(([key]) => {
    const root = key.match(/^(?:([^.[\]]+)|\[(?:"([^"]+)"|'([^']+)'|([^\]]+))\])/);
    return !root || !retired.has(root[1] ?? root[2] ?? root[3] ?? root[4]);
  })) as T;
}
