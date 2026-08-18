import { describe, expect, it } from "bun:test";
import { matchRoutes, type RouteObject } from "./matchRoutes";

const routes: RouteObject[] = [
  {
    path: "/",
    element: "root",
    children: [
      { index: true, element: "home" },
      { path: "login", element: "login" },
      { path: "share/:token", element: "share" },
      { path: ":pageKey", element: "page-loader" },
      { path: "pricing", element: "pricing" },
      {
        path: "space/:spaceId",
        element: "space",
        children: [
          { index: true, element: "space-home" },
          { path: ":dialogId", element: "dialog" },
        ],
      },
      { path: "*", element: "fallback" },
    ],
  },
];

describe("matchRoutes", () => {
  it("matches index routes", () => {
    const match = matchRoutes(routes, "/");
    expect(match?.map((item) => item.route.element)).toEqual(["root", "home"]);
  });

  it("extracts params across nested routes", () => {
    const match = matchRoutes(routes, "/space/space-1/dialog-2");
    expect(match?.at(-1)?.params).toEqual({ spaceId: "space-1", dialogId: "dialog-2" });
  });

  it("matches dynamic segments", () => {
    const match = matchRoutes(routes, "/share/token-1");
    expect(match?.at(-1)?.params).toEqual({ token: "token-1" });
  });

  it("ranks static routes ahead of earlier dynamic siblings", () => {
    const match = matchRoutes(routes, "/pricing");
    expect(match?.map((item) => item.route.element)).toEqual(["root", "pricing"]);
  });

  it("uses wildcard fallback", () => {
    const match = matchRoutes([
      {
        path: "/",
        element: "root",
        children: [
          { path: "login", element: "login" },
          { path: "*", element: "fallback" },
        ],
      },
    ], "/missing");
    expect(match?.at(-1)?.route.element).toBe("fallback");
  });

  it("captures params and pathname base for child wildcard fallbacks", () => {
    const match = matchRoutes([
      {
        path: "/",
        element: "root",
        children: [{ path: "*", element: "fallback" }],
      },
    ], "/missing/deep");
    expect(match?.at(-1)?.params["*"]).toBe("missing/deep");
    expect(match?.at(-1)?.pathnameBase).toBe("/missing/deep");
  });

  it("captures wildcard params and pathname base", () => {
    const match = matchRoutes([{ path: "/setting/*", element: "legacy-settings" }], "/setting/security/profile");
    expect(match?.at(-1)?.params["*"]).toBe("security/profile");
    expect(match?.at(-1)?.pathnameBase).toBe("/setting/security/profile");
  });

  it("decodes dynamic and wildcard params", () => {
    const match = matchRoutes(
      [{ path: "/profile/:userId/*", element: "profile" }],
      "/profile/user%20one/files/%E6%B5%8B%E8%AF%95",
    );
    expect(match?.at(-1)?.params.userId).toBe("user one");
    expect(match?.at(-1)?.params["*"]).toBe("files/测试");
  });
});
