// create/space/applyFetchSpaceFulfilled.ts
// Wave E: 原 spaceSlice 里 fetchSpace 的 fulfilled case reducer 副作用。
// 独立成模块（而非放在 spaceThunks.ts）以避免 changeSpaceAction -> spaceThunks
// -> changeSpaceAction 的循环依赖：spaceThunks 已经 import changeSpaceAction。
import { setCurrentSpaceBoth, getCurrentSpaceIdRaw } from "./spaceCurrentStore";
import { setSpaceInitialized } from "./spaceMembershipStore";

export function applyFetchSpaceFulfilled(payload: {
  spaceId: string;
  spaceData: any;
}): void {
  const { spaceId, spaceData } = payload;
  const currentSpaceId = getCurrentSpaceIdRaw();
  if (!currentSpaceId || currentSpaceId === spaceId) {
    setCurrentSpaceBoth(spaceId, spaceData);
    setSpaceInitialized();
  }
}
