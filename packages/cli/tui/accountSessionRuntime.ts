import {
  composeAccountSessionRuntime,
  createAccountSessionCore,
} from "../../auth/session";
import type { TokenManager } from "../../auth/types";
import {
  getDefaultProfileConfigPath,
  getProfileTokens,
  loadProfileConfig,
  saveProfileTokens,
} from "../client/profileConfig";

/**
 * The TUI's account-session adapter. Provider credentials remain outside this
 * runtime; only the nolo account bearer is stored here.
 */
export function createTuiAccountSessionRuntime(env: NodeJS.ProcessEnv) {
  const configPath = getDefaultProfileConfigPath();
  const config = loadProfileConfig(configPath);
  let tokens = getProfileTokens(config);
  const ambientToken = env.AUTH_TOKEN?.trim();
  if (ambientToken) {
    tokens = [ambientToken, ...tokens.filter((token) => token !== ambientToken)];
  }
  const hasPersistedProfile = getProfileTokens(config).length > 0;

  const persistTokens = () => {
    if (!ambientToken) saveProfileTokens(tokens, configPath);
  };

  const tokenManager: TokenManager = {
    async initTokens() {
      return [...tokens];
    },
    async getTokens() {
      return [...tokens];
    },
    async storeToken(token) {
      tokens = [token, ...tokens.filter((candidate) => candidate !== token)];
      persistTokens();
    },
    async removeToken(token) {
      tokens = tokens.filter((candidate) => candidate !== token);
      persistTokens();
    },
  };

  const runtime = composeAccountSessionRuntime({
    core: createAccountSessionCore(),
    tokenManager,
    // TUI Phase 4 does not add a login form. The service still owns the
    // persisted session lifecycle; network authentication is wired by a future
    // command when that UI exists.
    authenticate: async () => {
      throw new Error("tui_sign_in_unavailable");
    },
    resetRuntime: async () => {},
  });

  return {
    ...runtime,
    async initialize() {
      if (!runtime.service) throw new Error("tui_session_service_unavailable");
      const result = await runtime.service.initialize();
      if (config && hasPersistedProfile && !ambientToken) {
        try {
          saveProfileTokens(result.tokens, configPath);
        } catch {
          // A valid in-memory session must not fail to start because the
          // optional profile persistence is unavailable.
        }
      }
      const activeToken = runtime.core.getSnapshot().activeToken;
      if (activeToken) env.AUTH_TOKEN = activeToken;
      else delete env.AUTH_TOKEN;
      return result;
    },
  };
}
