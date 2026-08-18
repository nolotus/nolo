import { describe, expect, it } from "bun:test";
import {
  buildAppChatEditorPath,
  buildAppCodeEditorPath,
  buildAppDetailPath,
  buildAppEditorPath,
  readAppServerOrigin,
} from "./appEditor";

describe("appEditor route helpers", () => {
  it("adds server origin to app detail and editor routes", () => {
    expect(buildAppDetailPath("app-user-demo", undefined, "https://us.nolo.chat/")).toBe(
      "/app-user-demo?server=https%3A%2F%2Fus.nolo.chat"
    );
    expect(buildAppEditorPath("app-user-demo", undefined, "https://us.nolo.chat/")).toBe(
      "/app-user-demo?edit=true&server=https%3A%2F%2Fus.nolo.chat"
    );
    expect(buildAppChatEditorPath("app-user-demo", undefined, "https://us.nolo.chat/")).toBe(
      "/app-user-demo?edit=true&mode=chat&server=https%3A%2F%2Fus.nolo.chat"
    );
    expect(buildAppCodeEditorPath("app-user-demo", undefined, "https://us.nolo.chat/")).toBe(
      "/app-user-demo?edit=true&mode=code&server=https%3A%2F%2Fus.nolo.chat"
    );
  });

  it("reads normalized server origin from search", () => {
    expect(readAppServerOrigin("?edit=true&server=https%3A%2F%2Fus.nolo.chat%2F")).toBe(
      "https://us.nolo.chat"
    );
    expect(readAppServerOrigin(new URLSearchParams("sidebar=files"))).toBeUndefined();
  });
});
