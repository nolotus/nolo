import { describe, expect, it } from "bun:test";
import { buildAppRuntimeUrl, resolvePreferredAppRuntimeUrl } from "./appRuntimeUrl";

describe("appRuntimeUrl", () => {
  it("builds same-origin platform urls from app ids", () => {
    expect(buildAppRuntimeUrl("app-1", "http://localhost:3000/")).toBe(
      "http://localhost:3000/apps/app-1/"
    );
  });

  it("prefers custom domains over platform runtime urls", () => {
    expect(
      resolvePreferredAppRuntimeUrl({
        appId: "app-1",
        customUrl: "https://demo.example.com/",
        url: "https://us.nolo.chat/apps/app-1/",
        currentOrigin: "http://localhost:3000",
      })
    ).toBe("https://demo.example.com/");
  });

  it("prefers current-origin platform urls over remote urls when no custom domain exists", () => {
    expect(
      resolvePreferredAppRuntimeUrl({
        appId: "app-1",
        url: "https://us.nolo.chat/apps/app-1/",
        currentOrigin: "http://localhost:3000",
      })
    ).toBe("http://localhost:3000/apps/app-1/");
  });

  it("treats duplicated platform customUrl as non-custom and stays current-origin first", () => {
    expect(
      resolvePreferredAppRuntimeUrl({
        appId: "app-1",
        customUrl: "https://us.nolo.chat/apps/app-1/",
        url: "https://us.nolo.chat/apps/app-1/",
        currentOrigin: "http://localhost:3000",
      })
    ).toBe("http://localhost:3000/apps/app-1/");
  });
});
