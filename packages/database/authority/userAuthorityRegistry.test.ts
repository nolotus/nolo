import { describe, expect, it } from "bun:test";

import {
  resolveUserAuthorityServer,
  type UserAuthorityRegistry,
} from "./userAuthorityRegistry";

describe("user authority registry", () => {
  it("resolves an owner authority server from compact string entries", () => {
    const registry: UserAuthorityRegistry = {
      "user-1": "https://self.example.com/",
    };

    expect(
      resolveUserAuthorityServer({
        ownerUserId: "user-1",
        registry,
      })
    ).toBe("https://self.example.com");
  });

  it("resolves an owner authority server from structured entries", () => {
    const registry: UserAuthorityRegistry = {
      "user-1": {
        authorityServer: "https://home.example.com/",
        servers: ["https://replica.example.com"],
      },
    };

    expect(
      resolveUserAuthorityServer({
        ownerUserId: "user-1",
        registry,
      })
    ).toBe("https://home.example.com");
  });

  it("ignores invalid server origins instead of creating a hidden authority", () => {
    const registry: UserAuthorityRegistry = {
      "user-1": "localhost:38123",
    };

    expect(
      resolveUserAuthorityServer({
        ownerUserId: "user-1",
        registry,
      })
    ).toBeNull();
  });
});
