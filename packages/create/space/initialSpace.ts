import { MemberRole, SpaceVisibility, type SpaceData, type SpaceMemberWithSpaceInfo } from "app/types";
import { DataType } from "create/types";

import { createSpaceKey } from "./spaceKeys";

const INITIAL_SPACE_ID_PREFIX = "init";

export const deriveInitialSpaceId = (userId: string): string => {
  if (!userId) {
    throw new Error("userId is required");
  }

  if (userId.includes("-")) {
    throw new Error("initial space ids require hyphen-free user ids");
  }

  return `${INITIAL_SPACE_ID_PREFIX}${userId}`;
};

export const buildInitialSpaceRecords = ({
  userId,
  name,
  now = Date.now(),
}: {
  userId: string;
  name: string;
  now?: number;
}): {
  spaceId: string;
  spaceKey: string;
  spaceData: SpaceData & { type: DataType.SPACE; bootstrapSource: "signup-v1" };
  spaceMemberKey: string;
  spaceMemberData: SpaceMemberWithSpaceInfo & {
    dbKey: string;
    type: DataType.SPACE;
    userId: string;
    createdAt: string;
    updatedAt: string;
  };
} => {
  const spaceId = deriveInitialSpaceId(userId);
  const nowISO = new Date(now).toISOString();
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceMemberKey = createSpaceKey.member(userId, spaceId);

  return {
    spaceId,
    spaceKey,
    spaceData: {
      id: spaceId,
      name,
      description: "",
      ownerId: userId,
      visibility: SpaceVisibility.PRIVATE,
      members: [userId],
      categories: {},
      contents: {},
      createdAt: now,
      updatedAt: now,
      type: DataType.SPACE,
      bootstrapSource: "signup-v1",
    },
    spaceMemberKey,
    spaceMemberData: {
      dbKey: spaceMemberKey,
      type: DataType.SPACE,
      userId,
      role: MemberRole.OWNER,
      joinedAt: now,
      spaceId,
      spaceName: name,
      ownerId: userId,
      visibility: SpaceVisibility.PRIVATE,
      createdAt: nowISO,
      updatedAt: nowISO,
    },
  };
};
