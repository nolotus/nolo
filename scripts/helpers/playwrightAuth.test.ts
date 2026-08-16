import { describe, expect, test } from "bun:test";

import { buildPersistedPlaywrightAuthState } from "./playwrightAuth";

describe("playwrightAuth", () => {
  test("builds the persisted auth state consumed after production rehydration", () => {
    const user = { userId: "user-1", username: "demo" };

    expect(buildPersistedPlaywrightAuthState("token-1", user)).toEqual({
      currentUser: JSON.stringify(user),
      users: JSON.stringify([user]),
      isLoggedIn: JSON.stringify(true),
      currentToken: JSON.stringify("token-1"),
      isLoading: JSON.stringify(false),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    });
  });
});
