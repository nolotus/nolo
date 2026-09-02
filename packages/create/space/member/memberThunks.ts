// create/space/member/memberThunks.ts
// Wave E: 从 slice 工厂改为模块顶层 createAsyncThunk 直出，typePrefix 保持不变。
import { createAsyncThunk } from "@reduxjs/toolkit";
// Wave D: currentSpaceId/currentSpace 已剥至 module store。
import {
  getCurrentSpaceIdRaw,
  updateCurrentSpaceIfMatch,
} from "../spaceCurrentStore";
import { fetchUserSpaceMembershipsAction } from "./fetchUserSpaceMembershipsAction";
import { addMemberAction } from "./addMemberAction";
import { removeMemberAction } from "./removeMemberAction";
import { isSpaceMembershipRemoteUnavailableError } from "./isSpaceMembershipRemoteUnavailableError";
// Wave C: memberSpaces/loading/membershipStatus 已剥至 module store。
import {
  setMemberSpaces,
  setMembershipLoading,
  setMembershipRejected,
} from "../spaceMembershipStore";

export const fetchUserSpaceMemberships = createAsyncThunk(
  "space/fetchUserSpaceMemberships",
  async (arg: any, thunkAPI: any) => {
    // pending 副作用：同步执行，保持原 pending reducer 的即时性。
    // Wave C: loading/membershipStatus 已剥至 module store。
    setMembershipLoading();
    try {
      const payload = await fetchUserSpaceMembershipsAction(arg, thunkAPI);
      // Wave C: memberSpaces/loading/membershipStatus/initialized 已剥至 module store。
      setMemberSpaces(payload);
      return payload;
    } catch (error) {
      // Wave C: error/membershipStatus 已剥至 module store。
      setMembershipRejected(
        (error as { message?: string } | undefined)?.message || "Failed to fetch space memberships",
        isSpaceMembershipRemoteUnavailableError(error)
      );
      throw error;
    }
  }
);

export const addMember = createAsyncThunk(
  "space/addMember",
  async (arg: any, thunkAPI: any) => {
    const payload = await addMemberAction(arg, thunkAPI);
    if (getCurrentSpaceIdRaw() === payload.spaceId) {
      updateCurrentSpaceIfMatch(payload.spaceId, payload.updatedSpaceData);
    }
    return payload;
  }
);

export const removeMember = createAsyncThunk(
  "space/removeMember",
  async (arg: any, thunkAPI: any) => {
    const payload = await removeMemberAction(arg, thunkAPI);
    if (getCurrentSpaceIdRaw() === payload.spaceId) {
      updateCurrentSpaceIfMatch(payload.spaceId, payload.updatedSpaceData);
    }
    return payload;
  }
);
