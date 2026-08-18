const HOME_TAB_IDS = [
  "myContent",
  "myFav",
  "communityAI",
  "shareCommunity",
  "usage",
] as const;

export type HomeTabId = (typeof HOME_TAB_IDS)[number];

const isHomeTabId = (value: string): value is HomeTabId =>
  HOME_TAB_IDS.includes(value as HomeTabId);

export function normalizeHomeTabId(value: unknown): HomeTabId | undefined {
  return typeof value === "string" && isHomeTabId(value) ? value : undefined;
}
