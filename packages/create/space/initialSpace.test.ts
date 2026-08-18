import { describe, expect, test } from "bun:test";

import { buildInitialSpaceRecords, deriveInitialSpaceId } from "./initialSpace";
import { createSpaceKey } from "./spaceKeys";

describe("initialSpace helpers", () => {
  test("deriveInitialSpaceId is deterministic and hyphen-free", () => {
    expect(deriveInitialSpaceId("abcdef1234")).toBe("initabcdef1234");
    expect(deriveInitialSpaceId("abcdef1234")).not.toContain("-");
  });

  test("buildInitialSpaceRecords uses the existing space key layout", () => {
    const records = buildInitialSpaceRecords({
      userId: "abcdef1234",
      name: "Default Space",
      now: 1700000000000,
    });

    expect(records.spaceId).toBe("initabcdef1234");
    expect(records.spaceKey).toBe(createSpaceKey.space("initabcdef1234"));
    expect(records.spaceMemberKey).toBe(
      createSpaceKey.member("abcdef1234", "initabcdef1234")
    );
    expect(records.spaceData.bootstrapSource).toBe("signup-v1");
    expect(records.spaceMemberData.spaceId).toBe("initabcdef1234");
  });
});
