import { describe, expect, it } from "bun:test";

import { resolveSpaceLocalAgentsSyncActionVisibility } from "./spaceLocalAgentsSyncActionVisibility";
import {
  formatUnsupportedTypeCountLines,
  formatUnsupportedTypeCounts,
} from "./formatSpaceLocalAgentsUnsupported";

describe("resolveSpaceLocalAgentsSyncActionVisibility", () => {
  it("hides when logged out", () => {
    expect(
      resolveSpaceLocalAgentsSyncActionVisibility({
        accountUserId: null,
        isLoggedIn: false,
        spaceOwnerId: "userA",
      })
    ).toEqual({ kind: "hidden" });
  });

  it("hides for the device-local sentinel account", () => {
    expect(
      resolveSpaceLocalAgentsSyncActionVisibility({
        accountUserId: "local",
        isLoggedIn: true,
        spaceOwnerId: "local",
      })
    ).toEqual({ kind: "hidden" });
  });

  it("hides for non-owner members", () => {
    expect(
      resolveSpaceLocalAgentsSyncActionVisibility({
        accountUserId: "userA",
        isLoggedIn: true,
        spaceOwnerId: "userB",
      })
    ).toEqual({ kind: "hidden" });
  });

  it("hides when space owner is missing", () => {
    expect(
      resolveSpaceLocalAgentsSyncActionVisibility({
        accountUserId: "userA",
        isLoggedIn: true,
        spaceOwnerId: null,
      })
    ).toEqual({ kind: "hidden" });
  });

  it("shows sync for active non-local account that owns the Space", () => {
    expect(
      resolveSpaceLocalAgentsSyncActionVisibility({
        accountUserId: "userA",
        isLoggedIn: true,
        spaceOwnerId: "userA",
      })
    ).toEqual({ kind: "sync" });
  });
});

describe("formatUnsupportedTypeCounts", () => {
  it("sorts type/count pairs and drops zeros", () => {
    expect(
      formatUnsupportedTypeCounts({
        page: 2,
        dialog: 1,
        unknown: 0,
        file: 3,
      })
    ).toEqual([
      { type: "dialog", count: 1 },
      { type: "file", count: 3 },
      { type: "page", count: 2 },
    ]);
  });

  it("formats plain type: count lines with optional labels", () => {
    expect(
      formatUnsupportedTypeCountLines(
        { dialog: 2, page: 1 },
        (type) => (type === "dialog" ? "对话" : type)
      )
    ).toEqual(["对话: 2", "page: 1"]);
  });
});
