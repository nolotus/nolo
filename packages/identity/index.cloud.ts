export {
  useIdentity,
  useUserId,
  useToken,
  useIsLoggedIn,
  useCurrentUser,
} from "./useIdentity";
export type { IdentitySnapshot, IdentityUser, User } from "./types";
export {
  selectIdentityIsLoggedIn,
  selectIdentityToken,
  selectIdentityUser,
  selectIdentityUserBalance,
  selectIdentityUserId,
} from "identity/selectors";
export { useCouldEdit } from "./useCouldEdit";

// edition 标志：公开集（local edition）为 false，私有 checkout（cloud edition）为 true。
// 消费方据此决定是否加载云端专属功能（life 包的用量统计/用户管理/邀请奖励等）。
export const isCloudEdition = true;
