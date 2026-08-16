import { useSelector } from "react-redux";
import type { IdentitySnapshot, IdentityUser, User } from "./types";
import {
  selectIdentityIsInitialized,
  selectIdentityIsLoggedIn,
  selectIdentityToken,
  selectIdentityUser,
  selectIdentityUserId,
} from "identity/selectors";
import { useHasMounted } from "app/hooks/useHasMounted";

export type { IdentitySnapshot, IdentityUser, User };

/**
 * 返回 SSR 安全的 selector 值：mount 前用 ssrFallback，mount 后用真实值。
 *
 * React #423：SSR 和首帧 client render 看到的 auth state 必须一致，
 * 否则 hydration mismatch。localStorage 里的 bootstrapped auth state
 * 只在 mount 后生效。useIsLoggedIn / useCurrentUser 共用这个守卫，
 * 避免各自重复写 hasMounted 三元。
 */
function useMountedValue<T>(value: T, ssrFallback: T): T {
  const hasMounted = useHasMounted();
  return hasMounted ? value : ssrFallback;
}

// React entry
export const useIdentity = (): IdentitySnapshot => {
  const userId = useSelector(selectIdentityUserId);
  const token = useSelector(selectIdentityToken);
  const isLoggedIn = useSelector(selectIdentityIsLoggedIn);
  const isInitialized = useSelector(selectIdentityIsInitialized);
  const currentUser = useSelector(selectIdentityUser);
  const hasMounted = useHasMounted();
  return {
    userId,
    token: hasMounted ? token : null,
    isLoggedIn: hasMounted ? isLoggedIn : false,
    isInitialized: hasMounted ? isInitialized : false,
    currentUser: hasMounted ? currentUser : null,
  };
};

export const useUserId = (): string | undefined => useSelector(selectIdentityUserId);
export const useToken = (): string | null | undefined => useSelector(selectIdentityToken);
export const useIsLoggedIn = (): boolean =>
  useMountedValue(useSelector(selectIdentityIsLoggedIn), false);
export const useCurrentUser = (): IdentityUser | null =>
  useMountedValue(useSelector(selectIdentityUser), null);
