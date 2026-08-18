import { useMemo } from "react";
import { useAppSelector } from "app/store";
import { selectRemoteServer } from "app/settings/settingSlice";
import { useUserId } from "identity";
import { useUserData } from "database/hooks/useUserData";
import {
  buildMyContentItemsFromUserData,
  MY_CONTENT_USER_DATA_TYPES,
  type MyContentListItem,
} from "app/utils/myContentItems";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";

export function useTrashedContentItems(): {
  items: MyContentListItem[];
  loading: boolean;
} {
  const currentServer = useAppSelector(selectRemoteServer);
  const userId = useUserId() ?? "";
  const hasUser = userId.trim().length > 0;
  const memberSpaces = useAllMemberSpaces();

  const { data: records, loading } = useUserData(
    MY_CONTENT_USER_DATA_TYPES,
    userId,
    500,
    {
      trashOnly: true,
      partialDataStrategy: "hydrated-cache",
      remoteSummary: true,
    }
  );

  const spaceNameById = useMemo(
    () =>
      new Map(
        memberSpaces.map((space) => [
          space.spaceId,
          space.spaceName || space.spaceId,
        ] as const)
      ),
    [memberSpaces]
  );

  const items = useMemo(
    () =>
      buildMyContentItemsFromUserData(
        records,
        currentServer,
        spaceNameById,
        "我的应用",
        "我的内容"
      ),
    [records, currentServer, spaceNameById]
  );

  return {
    items,
    loading: hasUser && loading,
  };
}