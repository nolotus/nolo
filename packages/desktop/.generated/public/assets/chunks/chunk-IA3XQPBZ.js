import {
  authRoutes
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  __publicField
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/auth/client/fetchAcrossServers.ts
var FetchAcrossServersError = class extends Error {
  constructor(actionName, results) {
    super(`Failed to ${actionName} on all configured servers`);
    __publicField(this, "results");
    this.name = "FetchAcrossServersError";
    this.results = results;
  }
};
var fetchAcrossServers = async ({
  servers,
  requestBuilder,
  actionName
}) => {
  if (!servers.length) {
    throw new Error(`No configured servers available for ${actionName}`);
  }
  const results = await Promise.all(
    servers.map(async (server, index) => {
      const required = index === 0;
      try {
        const response = await requestBuilder(server);
        return {
          server,
          ok: response.ok,
          status: response.status,
          required
        };
      } catch (err) {
        return {
          server,
          ok: false,
          status: null,
          required
        };
      }
    })
  );
  const primaryResult = results[0];
  if (!primaryResult.ok) {
    throw new FetchAcrossServersError(actionName, results);
  }
  return results;
};

// packages/auth/client/deleteUserRequest.ts
var deleteUserRequest = async (currentServer, token, userId) => {
  const path = authRoutes.users.delete.createPath({ userId });
  return fetch(`${currentServer}${path}`, {
    method: authRoutes.users.delete.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
};
var deleteUserAcrossServers = async ({
  servers,
  token,
  userId
}) => {
  return fetchAcrossServers({
    servers,
    actionName: "delete user",
    requestBuilder: (server) => deleteUserRequest(server, token, userId)
  });
};

export {
  fetchAcrossServers,
  deleteUserAcrossServers
};
