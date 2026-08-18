import { loadMemoryCandidatesFromDb } from "./query";
import { createMemoryItem, writeMemoryItemWithIndexesToDb } from "./store";
import { EXPLICIT_REMEMBER_PREFIXES } from "./constants";
import type { MemoryItem, MemoryOwnerRef, MemorySubjectType } from "./types";

const normalizeExplicitRememberContent = (text: string): string => {
  let normalized = text.trim();
  for (const prefix of EXPLICIT_REMEMBER_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trim();
      break;
    }
  }

  normalized = normalized
    .replace(/^[，,。.\s:：]+/, "")
    .replace(/[。！？!?]+$/g, "")
    .trim();

  return normalized;
};

const buildSemanticPatternKey = (normalizedContent: string): string =>
  `semantic-explicit:${normalizedContent.toLowerCase()}`;

const shouldKeepAsSemanticCandidate = (normalizedContent: string): boolean =>
  normalizedContent.length >= 6;

const findMatchingExplicitEpisodes = (
  items: MemoryItem[],
  normalizedContent: string,
  subjectId: string
): MemoryItem[] =>
  items.filter((item) => {
    if (item.kind !== "episodic") return false;
    if (item.patternKey !== "explicit-remember") return false;
    if (item.subjectId !== subjectId) return false;
    return normalizeExplicitRememberContent(item.content) === normalizedContent;
  });

export const maybeConsolidateExplicitRemember = async (input: {
  db?: any;
  owner: MemoryOwnerRef;
  subjectType: MemorySubjectType;
  subjectId: string;
  visibility: "private" | "shared" | "public";
  content: string;
}): Promise<void> => {
  const normalizedContent = normalizeExplicitRememberContent(input.content);
  if (!shouldKeepAsSemanticCandidate(normalizedContent)) return;

  const getDefaultDb = async () => (await import("database-engine/db")).default;
  const db = input.db ?? await getDefaultDb();
  const items = await loadMemoryCandidatesFromDb(db, {
    owners: [input.owner],
    subjects: [{ subjectType: input.subjectType, subjectId: input.subjectId }],
    kinds: ["episodic", "semantic"],
    ownerLimit: 50,
  });

  const matchingEpisodes = findMatchingExplicitEpisodes(
    items,
    normalizedContent,
    input.subjectId
  );
  if (matchingEpisodes.length < 2) return;

  const semanticPatternKey = buildSemanticPatternKey(normalizedContent);
  const existingSemantic = items.find(
    (item) =>
      item.kind === "semantic" &&
      item.subjectId === input.subjectId &&
      item.patternKey === semanticPatternKey
  );
  if (existingSemantic) return;

  const semantic = createMemoryItem({
    ownerType: input.owner.ownerType,
    ownerId: input.owner.ownerId,
    visibility: input.visibility,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    kind: "semantic",
    content: normalizedContent,
    importance: 0.92,
    confidence: 0.72,
    tags: ["explicit-memory", "consolidated"],
    patternKey: semanticPatternKey,
    sourceDialogId: matchingEpisodes[matchingEpisodes.length - 1]?.sourceDialogId,
  });

  await writeMemoryItemWithIndexesToDb(db, semantic);
};

export const __test__ = {
  normalizeExplicitRememberContent,
  buildSemanticPatternKey,
};
