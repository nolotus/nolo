import { describe, expect, it } from "bun:test";

import { getMyRoutePathForTab, getMyRouteSection } from "./mySections";

describe("mySections", () => {
  it("maps attachment subtype tabs to dedicated routes", () => {
    expect(getMyRoutePathForTab("document")).toBe("/attachments/documents");
    expect(getMyRoutePathForTab("video")).toBe("/videos");
    expect(getMyRoutePathForTab("audio")).toBe("/audios");
  });

  it("returns the expected section metadata for attachment subtype pages", () => {
    expect(getMyRouteSection("document").defaultTitle).toBe("我的文档附件");
    expect(getMyRouteSection("video").defaultTitle).toBe("我的视频");
    expect(getMyRouteSection("audio").defaultTitle).toBe("我的音频");
  });
});
