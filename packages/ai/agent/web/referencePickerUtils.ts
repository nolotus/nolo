import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

export interface ReferencePickerSpaceItem {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface ReferencePickerContentItem {
  dbKey: string;
  title: string;
  spaceId: string;
  spaceName: string;
  contentType?: string;
  skillSummary?: {
    isSkill: true;
    skillId?: string;
    name?: string;
    description?: string;
    toolNames?: string[];
    triggerMode?: "explicit" | "required" | "recommended";
  } | null;
}

export const ALL_SPACES_ID = "__all_spaces__";

export const buildReferencePickerSpaceItems = ({
  currentSpace,
  allMemberSpaces,
  allSpacesLabel,
}: {
  currentSpace?: { id: string; name: string } | null;
  allMemberSpaces: ReadonlyArray<{ spaceId: string; spaceName: string }>;
  allSpacesLabel: string;
}) => {
  const items: ReferencePickerSpaceItem[] = [
    {
      id: ALL_SPACES_ID,
      name: allSpacesLabel,
      isCurrent: false,
    },
  ];
  const nameMap = new Map<string, string>();

  if (currentSpace) {
    items.push({
      id: currentSpace.id,
      name: currentSpace.name,
      isCurrent: true,
    });
    nameMap.set(currentSpace.id, currentSpace.name);
  }

  const others = allMemberSpaces
    .filter((space) => space.spaceId !== currentSpace?.id)
    .sort((a, b) => a.spaceName.localeCompare(b.spaceName))
    .map((space) => {
      nameMap.set(space.spaceId, space.spaceName);
      return {
        id: space.spaceId,
        name: space.spaceName,
        isCurrent: false,
      };
    });

  items.push(...others);

  return { items, nameMap };
};

export const buildReferencePickerContents = ({
  contentsObj,
  spaceId,
  spaceName,
  unnamedLabel,
}: {
  contentsObj: Record<string, any>;
  spaceId: string;
  spaceName: string;
  unnamedLabel: string;
}): ReferencePickerContentItem[] =>
  Object.entries(contentsObj).flatMap(([dbKey, value]: [string, any]) => {
    if (dbKey.startsWith("dialog-") || !value) return [];
    return [
      {
        dbKey,
        title: value?.title || unnamedLabel,
        spaceId,
        spaceName,
        contentType: value?.type,
        skillSummary: value?.skillSummary ?? null,
      },
    ];
  });

export const filterReferencePickerContents = ({
  spacesData,
  activeSpaceId,
  searchQuery,
  pickerMode,
  skillCandidateMap,
}: {
  spacesData: Map<string, ReferencePickerContentItem[]>;
  activeSpaceId: string;
  searchQuery: string;
  pickerMode: "skill" | "knowledge" | "instruction";
  skillCandidateMap: Map<string, boolean>;
}) => {
  const trimmedQuery = asTrimmedLowercaseString(searchQuery);
  const scopedContents =
    activeSpaceId === ALL_SPACES_ID
      ? Array.from(spacesData.values()).flat()
      : spacesData.get(activeSpaceId) || [];

  const searchedContents = trimmedQuery
    ? scopedContents.filter((item) => {
        const title = item.title.toLowerCase();
        const key = item.dbKey.toLowerCase();
        const space = item.spaceName.toLowerCase();
        return (
          title.includes(trimmedQuery) ||
          key.includes(trimmedQuery) ||
          space.includes(trimmedQuery)
        );
      })
    : scopedContents;

  if (pickerMode !== "skill") {
    return searchedContents;
  }

  return searchedContents.filter(
    (item) =>
      item.contentType === "page" &&
      (item.skillSummary?.isSkill || skillCandidateMap.get(item.dbKey))
  );
};

export const collectPendingSkillCandidates = ({
  contents,
  skillCandidateMap,
}: {
  contents: ReferencePickerContentItem[];
  skillCandidateMap: Map<string, boolean>;
}) =>
  contents.filter(
    (item) =>
      item.contentType === "page" &&
      !item.skillSummary?.isSkill &&
      !skillCandidateMap.has(item.dbKey)
  );
