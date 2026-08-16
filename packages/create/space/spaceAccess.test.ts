import { afterEach, describe, expect, it } from "bun:test";
import { SERVERS } from "database/config";
import { selectSpaceRemoteAuth } from "./spaceAccess";

const previousDesktopEnv = process.env.NOLO_DESKTOP;

afterEach(() => {
  if (previousDesktopEnv === undefined) {
    delete process.env.NOLO_DESKTOP;
  } else {
    process.env.NOLO_DESKTOP = previousDesktopEnv;
  }
});

describe("spaceAccess", () => {
  it("keeps configured local servers for web and dev membership reads", () => {
    delete process.env.NOLO_DESKTOP;

    const auth = selectSpaceRemoteAuth({
      settings: {
        currentServer: "http://127.0.0.1:3233",
        syncServers: [
          "http://localhost:38123/",
          "http://nolotus.local:3233",
          SERVERS.US,
        ],
      },
    });

    expect(auth.servers).toEqual([
      "http://127.0.0.1:3233",
      "http://localhost:38123",
      "http://nolotus.local:3233",
      SERVERS.US,
      SERVERS.MAIN,
    ]);
  });

  it("routes desktop membership reads away from the local embedded server", () => {
    process.env.NOLO_DESKTOP = "1";

    const auth = selectSpaceRemoteAuth({
      auth: {
        currentToken: "token",
        currentUser: { userId: "user-1" },
      },
      settings: {
        currentServer: "http://127.0.0.1:3233",
        syncServers: [
          "http://localhost:38123",
          SERVERS.US,
          `${SERVERS.US}/`,
        ],
      },
    });

    expect(auth.servers).toEqual([
      "http://127.0.0.1:3233",
      "http://localhost:38123",
      SERVERS.US,
      SERVERS.MAIN,
    ]);
  });

  it("falls back to all cluster servers when desktop settings only contain local servers", () => {
    process.env.NOLO_DESKTOP = "1";

    const auth = selectSpaceRemoteAuth({
      settings: {
        currentServer: "http://127.0.0.1:3233",
        syncServers: ["http://localhost:38123"],
      },
    });

    expect(auth.servers).toEqual([
      "http://127.0.0.1:3233",
      "http://localhost:38123",
      SERVERS.MAIN,
      SERVERS.US,
    ]);
  });

  it("preserves explicit remote current server order on desktop", () => {
    process.env.NOLO_DESKTOP = "1";

    const auth = selectSpaceRemoteAuth({
      settings: {
        currentServer: SERVERS.US,
        syncServers: [SERVERS.MAIN],
      },
    });

    expect(auth.servers).toEqual([SERVERS.US, SERVERS.MAIN]);
  });
});
