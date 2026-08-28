import { describe, expect, test } from "bun:test";

import {
  buildPreviewAuthPageHtml,
  buildPreviewAuthUrl,
  buildPersistedAuthState,
  normalizePreviewBaseUrl,
} from "./previewAuth";

describe("preview auth helper", () => {
  test("normalizes preview base URLs without losing the host", () => {
    expect(normalizePreviewBaseUrl("http://127.0.0.1:38324/")).toBe(
      "http://127.0.0.1:38324"
    );
  });

  test("builds the persisted auth state shape consumed by the web app", () => {
    const user = { userId: "user-1", username: "demo", locale: "zh-CN" };

    expect(buildPersistedAuthState("token-1", user)).toEqual({
      currentUser: JSON.stringify(user),
      users: JSON.stringify([user]),
      isLoggedIn: JSON.stringify(true),
      currentToken: JSON.stringify("token-1"),
      isLoading: JSON.stringify(false),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    });
  });

  test("builds a same-origin bootstrap URL with encoded auth payload", () => {
    const url = buildPreviewAuthUrl({
      baseUrl: "http://127.0.0.1:38324/",
      pagePath: "/public/__nolo-preview-auth.html",
      redirectPath: "/space/demo",
      token: "token-1",
      user: { userId: "user-1", username: "demo" },
    });

    expect(url.startsWith("http://127.0.0.1:38324/public/__nolo-preview-auth.html#payload=")).toBe(
      true
    );
    const payload = new URL(url).hash.replace(/^#payload=/, "");
    const decoded = JSON.parse(Buffer.from(decodeURIComponent(payload), "base64url").toString("utf8"));
    expect(decoded.redirectPath).toBe("/space/demo");
    expect(decoded.user.userId).toBe("user-1");
  });

  test("bootstrap page writes localStorage and redirects from hash payload", () => {
    const html = buildPreviewAuthPageHtml();

    expect(html).toContain('localStorage.setItem("tokens"');
    expect(html).toContain('localStorage.setItem("persist:auth"');
    expect(html).toContain("location.replace(payload.redirectPath || '/')");
  });
});
