import {
  useHasMounted
} from "/public/assets/chunks/chunk-OOUNP25R.js";
import {
  useSelector
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  isSystemAdmin,
  selectIdentityIsInitialized,
  selectIdentityIsLoggedIn,
  selectIdentityToken,
  selectIdentityUser,
  selectIdentityUserId
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  extractUserId
} from "/public/assets/chunks/chunk-JOOBQBMM.js";

// packages/identity/useIdentity.ts
var useIdentity = () => {
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
    currentUser: hasMounted ? currentUser : null
  };
};
var useUserId = () => useSelector(selectIdentityUserId);
var useToken = () => useSelector(selectIdentityToken);
var useIsLoggedIn = () => {
  const isLoggedIn = useSelector(selectIdentityIsLoggedIn);
  const hasMounted = useHasMounted();
  return hasMounted ? isLoggedIn : false;
};
var useCurrentUser = () => useSelector(selectIdentityUser);

// packages/identity/useCouldEdit.tsx
var useCouldEdit = (dbKey) => {
  const currentUserId = useUserId();
  if (!dbKey) return false;
  const dataUserId = extractUserId(dbKey);
  if (isSystemAdmin(currentUserId)) return true;
  if (!dataUserId || !currentUserId) return false;
  return dataUserId === currentUserId;
};

export {
  useIdentity,
  useUserId,
  useToken,
  useIsLoggedIn,
  useCurrentUser,
  useCouldEdit
};
