import {
  useIdentity
} from "/public/assets/chunks/chunk-4C6PJRJA.js";

// packages/auth/hooks/useAuth.ts
var useAuth = () => {
  const { currentUser, isLoggedIn, isInitialized } = useIdentity();
  return { user: currentUser, isLoggedIn, isInitialized };
};

export {
  useAuth
};
