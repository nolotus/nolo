import { describe, expect, it } from "bun:test";
import { DataType } from "create/types";
import { toOwnedAppSummary } from "./fetchOwnedApps";

describe("toOwnedAppSummary", () => {
  it("builds app url from cached origin and preserves custom fields", () => {
    const summary = toOwnedAppSummary(
      {
        dbKey: "app-u1-demo",
        type: DataType.APP,
        userId: "u1",
        appId: "demo",
        appKey: "app-u1-demo",
        name: "Demo",
        customUrl: "https://demo.example.com",
        visibility: "public",
        deployMode: "platform",
        icon: { kind: "emoji", value: "🚀" },
        spaceId: null,
        updatedAt: 1710000000000,
        createdAt: 1710000000000,
        serverOrigin: "https://us.nolo.chat",
      },
      "https://nolo.chat"
    );

    expect(summary.url).toBe("https://us.nolo.chat/apps/demo/");
    expect(summary.customUrl).toBe("https://demo.example.com");
    expect(summary.visibility).toBe("public");
    expect(summary.icon).toEqual({ kind: "emoji", value: "🚀" });
    expect(summary.serverOrigin).toBe("https://us.nolo.chat");
    expect(summary.modifiedOn).toBe(new Date(1710000000000).toISOString());
  });
});
