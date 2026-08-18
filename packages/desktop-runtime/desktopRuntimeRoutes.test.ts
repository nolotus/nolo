import { describe, expect, it } from "bun:test";

import { desktopRuntimeRoutes } from "./desktopRuntimeRoutes";

describe("desktopRuntimeRoutes", () => {
  it("contains desktop bridge routes", () => {
    expect(Object.keys(desktopRuntimeRoutes)).toEqual([
      "/api/desktop-updater",
      "/api/desktop/clipboard",
      "/api/desktop/credentials",
      "/api/desktop/pick-folder",
      "/api/desktop/provider-runtime",
      "/api/desktop/agent-runtime/status",
      "/api/desktop/chrome-connector/status",
      "/api/desktop/chrome-connector/install-native-host",
      "/api/desktop/chrome-connector/smoke-test",
      "/api/desktop/auth/session",
      "/api/desktop/oauth/:provider/status",
      "/api/desktop/oauth/:provider/start",
      "/api/desktop/oauth/:provider",
      "/api/desktop/agent-runtime/turn",
      "/api/desktop/local-connector/start",
    ]);
    expect(desktopRuntimeRoutes["/api/desktop-updater"]).toBeDefined();
    expect(desktopRuntimeRoutes["/api/desktop/clipboard"]).toBeDefined();
    expect(desktopRuntimeRoutes["/api/desktop/credentials"]).toBeDefined();
    expect(desktopRuntimeRoutes["/api/desktop/pick-folder"]).toBeDefined();
    expect(desktopRuntimeRoutes["/api/desktop/provider-runtime"]).toBeDefined();
    expect(desktopRuntimeRoutes["/api/desktop/agent-runtime/status"]).toBeDefined();
    expect(desktopRuntimeRoutes["/api/desktop/chrome-connector/status"]).toBeDefined();
    expect(
      desktopRuntimeRoutes["/api/desktop/chrome-connector/install-native-host"],
    ).toBeDefined();
    expect(
      desktopRuntimeRoutes["/api/desktop/chrome-connector/smoke-test"],
    ).toBeDefined();
    expect(desktopRuntimeRoutes["/api/desktop/auth/session"]).toBeDefined();
    expect(desktopRuntimeRoutes["/api/desktop/agent-runtime/turn"]).toBeDefined();
    expect(desktopRuntimeRoutes["/api/desktop/local-connector/start"]).toBeDefined();
  });

  it("uses normalized CORS OPTIONS for desktop runtime routes", () => {
    const updaterResponse = desktopRuntimeRoutes["/api/desktop-updater"].OPTIONS();
    const statusResponse =
      desktopRuntimeRoutes["/api/desktop/agent-runtime/status"].OPTIONS();
    const credentialsResponse =
      desktopRuntimeRoutes["/api/desktop/credentials"].OPTIONS();
    const authSessionResponse =
      desktopRuntimeRoutes["/api/desktop/auth/session"].OPTIONS();
    const turnResponse =
      desktopRuntimeRoutes["/api/desktop/agent-runtime/turn"].OPTIONS();

    expect(updaterResponse.status).toBe(204);
    expect(updaterResponse.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS",
    );
    expect(updaterResponse.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Authorization",
    );
    expect(updaterResponse.headers.get("Access-Control-Allow-Origin")).toBe("*");

    expect(statusResponse.status).toBe(204);
    expect(statusResponse.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, OPTIONS",
    );
    expect(statusResponse.headers.get("Access-Control-Allow-Origin")).toBe("*");

    // Credential bridge: no wildcard CORS (same-origin Desktop only).
    expect(credentialsResponse.status).toBe(204);
    expect(credentialsResponse.headers.get("Access-Control-Allow-Methods")).toBe(
      "POST, OPTIONS",
    );
    expect(
      credentialsResponse.headers.get("Access-Control-Allow-Origin"),
    ).toBeNull();

    // Auth session bootstrap returns profile tokens — same CORS posture as credentials.
    expect(authSessionResponse.status).toBe(204);
    expect(authSessionResponse.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, OPTIONS",
    );
    expect(
      authSessionResponse.headers.get("Access-Control-Allow-Origin"),
    ).toBeNull();

    // Runtime turn may carry credentialRef snapshots — same CORS posture as credentials.
    expect(turnResponse.status).toBe(204);
    expect(turnResponse.headers.get("Access-Control-Allow-Methods")).toBe(
      "POST, OPTIONS",
    );
    expect(turnResponse.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
