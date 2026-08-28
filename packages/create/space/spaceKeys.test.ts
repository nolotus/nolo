import { describe, expect, it } from "bun:test";

import { createSpaceKey, normalizeSpaceId } from "./spaceKeys";

describe("space key normalization", () => {
  it("normalizes prefixed space ids consistently", () => {
    expect(normalizeSpaceId("space-demo")).toBe("demo");
    expect(normalizeSpaceId("demo")).toBe("demo");
    expect(createSpaceKey.space("demo")).toBe("space-demo");
    expect(createSpaceKey.space("space-demo")).toBe("space-demo");
  });

  it("keeps reserved space-setting helpers available without affecting normalization", () => {
    expect(createSpaceKey.setting("user-1", "demo")).toBe(
      "space-setting-user-1-demo"
    );
    expect(createSpaceKey.setting("user-1", "space-demo")).toBe(
      "space-setting-user-1-demo"
    );
    expect(createSpaceKey.settingRange("user-1")).toEqual({
      start: "space-setting-user-1-",
      end: "space-setting-user-1-\uffff",
    });
  });

  it("extracts space id from 4-segment member key (space-member-{userId}-{spaceId})", () => {
    expect(createSpaceKey.spaceIdFromMember("space-member-0e95801d90-01KVR0HHSTJ8JBQDEA2WT8EJVF")).toBe(
      "01KVR0HHSTJ8JBQDEA2WT8EJVF"
    );
    expect(createSpaceKey.spaceFromMember("space-member-0e95801d90-01KVR0HHSTJ8JBQDEA2WT8EJVF")).toBe(
      "space-01KVR0HHSTJ8JBQDEA2WT8EJVF"
    );
  });

  it("returns empty for malformed member keys", () => {
    expect(createSpaceKey.spaceIdFromMember("space-member-01KVR0HHSTJ8JBQDEA2WT8EJVF")).toBe("");
    expect(createSpaceKey.spaceFromMember("space-member-01KVR0HHSTJ8JBQDEA2WT8EJVF")).toBe("");
  });
});
