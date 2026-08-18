import type {
  MemoryItem,
  MemoryKind,
  MemoryOwnerRef,
  MemorySubjectRef,
} from "./types";
import {
  buildDefaultSubjects,
  chooseMemoryOwners,
  loadMemoryCandidatesFromDb,
  loadOwnerItemsFromDb,
  loadSubjectKindItemsFromDb,
} from "./queryShared";

export {
  buildDefaultSubjects,
  chooseMemoryOwners,
  loadMemoryCandidatesFromDb,
  loadOwnerItemsFromDb,
  loadSubjectKindItemsFromDb,
};

export const loadOwnerItems = async (
  owner: MemoryOwnerRef,
  limit: number
): Promise<MemoryItem[]> => {
  const getDefaultDb = async () => (await import("database-engine/db")).default;
  return loadOwnerItemsFromDb(await getDefaultDb(), owner, limit);
};

export const loadMemoryCandidates = async (input: {
  owners: MemoryOwnerRef[];
  subjects: MemorySubjectRef[];
  kinds?: MemoryKind[];
  ownerLimit?: number;
  ownerFallback?: "never" | "onSubjectMiss" | "always";
}): Promise<MemoryItem[]> => {
  const getDefaultDb = async () => (await import("database-engine/db")).default;
  return loadMemoryCandidatesFromDb(await getDefaultDb(), input);
};
