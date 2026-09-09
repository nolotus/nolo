import type { RootState } from "app/store";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { selectIdentityUser } from "identity/selectors";
import { getAllServers } from "database/actions/common";
import type { UserAuthorityRegistry } from "database/authority/userAuthorityRegistry";

export type RuntimeServerContext = {
  currentToken?: string;
  currentUserId?: string;
  currentServer?: string;
  syncServers: string[];
  remoteServers: string[];
  userAuthorityRegistry?: UserAuthorityRegistry;
};

export const getRuntimeServerContext = (
  state: RootState,
  preferredServerOrigin?: string | null
): RuntimeServerContext => {
  const {
    currentToken,
    currentUserId,
    currentServer,
    syncServers = [],
  } = selectRuntimeSnapshot(state);

  return {
    currentToken,
    currentUserId,
    currentServer,
    syncServers,
    userAuthorityRegistry: resolveRuntimeUserAuthorityRegistry(state),
    remoteServers: getAllServers(
      currentServer,
      syncServers,
      preferredServerOrigin
    ),
  };
};

const resolveRuntimeUserAuthorityRegistry = (
  state: RootState
): UserAuthorityRegistry | undefined => {
  const settingsRegistry = (state.settings as any)?.userAuthorityRegistry;
  if (settingsRegistry && typeof settingsRegistry === "object") {
    return settingsRegistry as UserAuthorityRegistry;
  }

  const userRegistry = (selectIdentityUser(state) as {
    authorityRegistry?: unknown;
  } | null)?.authorityRegistry;
  if (userRegistry && typeof userRegistry === "object") {
    return userRegistry as UserAuthorityRegistry;
  }

  return undefined;
};
